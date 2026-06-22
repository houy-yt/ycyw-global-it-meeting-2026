const express = require('express');
const multer = require('multer');
const router = express.Router();
const prisma = require('../utils/prisma');
const storage = require('../services/storageService');
const { authRequired, adminRequired } = require('../middleware/auth');

// multer for TinyMCE image uploads (memory storage, 10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('仅支持上传图片文件'));
  },
});

router.use(authRequired, adminRequired);

// ─── TinyMCE image upload ───
// POST /api/admin/upload-image
// Accepts multipart/form-data with field "file"
// Returns { location: '/uploads/xxx.png' } (TinyMCE standard response format)
router.post('/upload-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: '请上传图片文件' });
    const { url } = await storage.upload(req.file);
    // TinyMCE expects { location: '...' } from images_upload_url,
    // but our custom handler reads the full response, so we return both.
    res.json({ location: url, url });
  } catch (e) {
    console.error('[admin/upload-image]', e);
    res.status(500).json({ message: e.message || '图片上传失败' });
  }
});

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
