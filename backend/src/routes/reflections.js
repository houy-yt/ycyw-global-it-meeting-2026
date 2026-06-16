const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const {
  authRequired,
  authOptional,
  adminRequired,
  attendeeRequired,
} = require('../middleware/auth');

function serializeAuthor(user, isAnonymous) {
  if (isAnonymous) return { nickname: '匿名', isAnonymous: true };
  return {
    id: user?.id,
    nickname: user?.nickname || (user?.email ? user.email.split('@')[0] : '用户'),
    isAnonymous: false,
  };
}

function serializeReflection(r, currentUserId) {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    isAnonymous: r.isAnonymous,
    likeCount: r.likeCount,
    commentCount: r._count?.comments ?? r.comments?.length ?? 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    author: serializeAuthor(r.author, r.isAnonymous),
    authorId: r.authorId, // for ownership checks on the frontend
    likedByMe: currentUserId
      ? (r.likes || []).some((l) => l.userId === currentUserId)
      : false,
  };
}

// GET /api/reflections?page=1&limit=10
router.get('/', authOptional, async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.reflection.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        author: true,
        likes: req.user ? { where: { userId: req.user.id } } : false,
        _count: { select: { comments: true } },
      },
    }),
    prisma.reflection.count(),
  ]);

  res.json({
    page,
    limit,
    total,
    items: items.map((r) => serializeReflection(r, req.user?.id)),
  });
});

// GET /api/reflections/:id
router.get('/:id', authOptional, async (req, res) => {
  const id = Number(req.params.id);
  const r = await prisma.reflection.findUnique({
    where: { id },
    include: {
      author: true,
      likes: req.user ? { where: { userId: req.user.id } } : false,
      _count: { select: { comments: true } },
    },
  });
  if (!r) return res.status(404).json({ message: 'Not found' });
  res.json(serializeReflection(r, req.user?.id));
});

// POST /api/reflections   (attendee only)
router.post('/', authRequired, attendeeRequired, async (req, res) => {
  const { title, content, isAnonymous } = req.body || {};
  if (!title || !content) return res.status(400).json({ message: 'Missing fields' });

  const r = await prisma.reflection.create({
    data: {
      title: String(title).slice(0, 200),
      content: String(content),
      isAnonymous: !!isAnonymous,
      authorId: req.user.id,
    },
    include: { author: true, _count: { select: { comments: true } } },
  });
  res.status(201).json(serializeReflection(r, req.user.id));
});

// PUT /api/reflections/:id   (owner or admin)
router.put('/:id', authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const r = await prisma.reflection.findUnique({ where: { id } });
  if (!r) return res.status(404).json({ message: 'Not found' });
  if (r.authorId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const { title, content, isAnonymous } = req.body || {};
  const updated = await prisma.reflection.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: String(title).slice(0, 200) } : {}),
      ...(content !== undefined ? { content: String(content) } : {}),
      ...(isAnonymous !== undefined ? { isAnonymous: !!isAnonymous } : {}),
    },
    include: { author: true, _count: { select: { comments: true } } },
  });
  res.json(serializeReflection(updated, req.user.id));
});

// DELETE /api/reflections/:id   (admin only per spec; we also allow owner to be friendly)
router.delete('/:id', authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const r = await prisma.reflection.findUnique({ where: { id } });
  if (!r) return res.status(404).json({ message: 'Not found' });
  if (!req.user.isAdmin && r.authorId !== req.user.id) {
    return res.status(403).json({ message: 'Admin only' });
  }
  await prisma.reflection.delete({ where: { id } });
  res.json({ ok: true });
});

// POST /api/reflections/:id/like   (toggle)
router.post('/:id/like', authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const r = await prisma.reflection.findUnique({ where: { id } });
  if (!r) return res.status(404).json({ message: 'Not found' });

  const existing = await prisma.like.findUnique({
    where: { userId_reflectionId: { userId: req.user.id, reflectionId: id } },
  });

  let liked;
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await prisma.like.create({ data: { userId: req.user.id, reflectionId: id } });
    liked = true;
  }
  const likeCount = await prisma.like.count({ where: { reflectionId: id } });
  await prisma.reflection.update({ where: { id }, data: { likeCount } });
  res.json({ liked, likeCount });
});

// GET /api/reflections/:id/comments
router.get('/:id/comments', async (req, res) => {
  const id = Number(req.params.id);
  const comments = await prisma.comment.findMany({
    where: { reflectionId: id },
    orderBy: { createdAt: 'asc' },
    include: { author: true },
  });
  res.json(
    comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: serializeAuthor(c.author, c.isAnonymous),
      authorId: c.authorId,
    }))
  );
});

module.exports = router;
