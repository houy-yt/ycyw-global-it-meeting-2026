const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authRequired, adminRequired } = require('../middleware/auth');

// GET /api/announcements/active   public
router.get('/active', async (req, res) => {
  const a = await prisma.announcement.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(a || null);
});

// GET /api/announcements   admin: all
router.get('/', authRequired, adminRequired, async (req, res) => {
  const list = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(list);
});

router.post('/', authRequired, adminRequired, async (req, res) => {
  const { content, isActive } = req.body || {};
  if (!content) return res.status(400).json({ message: 'Content required' });
  const a = await prisma.announcement.create({
    data: { content: String(content), isActive: isActive !== false },
  });
  res.status(201).json(a);
});

router.put('/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const { content, isActive } = req.body || {};
  try {
    const a = await prisma.announcement.update({
      where: { id },
      data: {
        ...(content !== undefined ? { content: String(content) } : {}),
        ...(isActive !== undefined ? { isActive: !!isActive } : {}),
      },
    });
    res.json(a);
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

router.delete('/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.announcement.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

module.exports = router;
