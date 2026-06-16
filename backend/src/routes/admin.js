const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authRequired, adminRequired } = require('../middleware/auth');

router.use(authRequired, adminRequired);

// GET /api/admin/reflections?q=keyword
router.get('/reflections', async (req, res) => {
  const q = (req.query.q || '').trim();
  const where = q
    ? {
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
          { author: { OR: [{ nickname: { contains: q } }, { email: { contains: q } }] } },
        ],
      }
    : {};
  const items = await prisma.reflection.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { author: true, _count: { select: { comments: true } } },
  });
  res.json(
    items.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      isAnonymous: r.isAnonymous,
      likeCount: r.likeCount,
      commentCount: r._count.comments,
      createdAt: r.createdAt,
      author: { id: r.author.id, nickname: r.author.nickname, email: r.author.email },
    }))
  );
});

// GET /api/admin/gallery?tag=&uploader=
router.get('/gallery', async (req, res) => {
  const where = {};
  if (req.query.tag) where.tags = { contains: JSON.stringify(req.query.tag).slice(1, -1) };
  if (req.query.uploader) {
    where.uploader = {
      OR: [
        { nickname: { contains: req.query.uploader } },
        { email: { contains: req.query.uploader } },
      ],
    };
  }
  const items = await prisma.galleryItem.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { uploader: true },
  });
  res.json(
    items.map((g) => ({
      id: g.id,
      title: g.title,
      type: g.type,
      fileUrl: g.fileUrl,
      videoLink: g.videoLink,
      tags: safeParse(g.tags),
      createdAt: g.createdAt,
      uploader: g.uploader && {
        id: g.uploader.id,
        nickname: g.uploader.nickname,
        email: g.uploader.email,
      },
    }))
  );
});

function safeParse(s) {
  try {
    const r = JSON.parse(s);
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}

module.exports = router;
