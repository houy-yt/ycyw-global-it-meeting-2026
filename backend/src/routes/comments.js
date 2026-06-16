const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authRequired } = require('../middleware/auth');

// POST /api/comments  body: { reflectionId, content, isAnonymous }
router.post('/', authRequired, async (req, res) => {
  const { reflectionId, content, isAnonymous } = req.body || {};
  if (!reflectionId || !content) {
    return res.status(400).json({ message: 'Missing fields' });
  }
  const ref = await prisma.reflection.findUnique({ where: { id: Number(reflectionId) } });
  if (!ref) return res.status(404).json({ message: 'Reflection not found' });

  const c = await prisma.comment.create({
    data: {
      content: String(content).slice(0, 2000),
      reflectionId: Number(reflectionId),
      authorId: req.user.id,
      isAnonymous: !!isAnonymous,
    },
    include: { author: true },
  });

  res.status(201).json({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt,
    authorId: c.authorId,
    author: c.isAnonymous
      ? { nickname: '匿名', isAnonymous: true }
      : { id: c.author.id, nickname: c.author.nickname || c.author.email, isAnonymous: false },
  });
});

// DELETE /api/comments/:id (admin or author)
router.delete('/:id', authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const c = await prisma.comment.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ message: 'Not found' });
  if (!req.user.isAdmin && c.authorId !== req.user.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  await prisma.comment.delete({ where: { id } });
  res.json({ ok: true });
});

module.exports = router;
