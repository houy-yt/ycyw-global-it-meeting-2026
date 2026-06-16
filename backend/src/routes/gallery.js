const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const prisma = require('../utils/prisma');
const storage = require('../services/storageService');
const { authRequired, adminRequired } = require('../middleware/auth');

const MAX_IMAGE = parseInt(process.env.MAX_IMAGE_SIZE, 10) || 10 * 1024 * 1024;
const MAX_VIDEO = parseInt(process.env.MAX_VIDEO_SIZE, 10) || 50 * 1024 * 1024;

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv)$/i;

// multer in-memory (storageService handles persistence)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO },
  fileFilter: (req, file, cb) => {
    if (IMAGE_EXT.test(file.originalname) || VIDEO_EXT.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.map(String);
  } catch (_) {
    // not JSON, fall through to comma-split
  }
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function serialize(g) {
  return {
    id: g.id,
    title: g.title,
    type: g.type,
    fileUrl: g.fileUrl,
    videoLink: g.videoLink,
    tags: safeJsonParse(g.tags, []),
    uploaderId: g.uploaderId,
    uploader: g.uploader
      ? {
          id: g.uploader.id,
          nickname: g.uploader.nickname || g.uploader.email,
        }
      : null,
    createdAt: g.createdAt,
  };
}

function safeJsonParse(s, fallback) {
  try {
    const r = JSON.parse(s);
    return Array.isArray(r) ? r : fallback;
  } catch {
    return fallback;
  }
}

// GET /api/gallery?tag=xxx&date=YYYY-MM-DD&page=1&limit=12
router.get('/', async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
  const skip = (page - 1) * limit;

  const where = {};
  if (req.query.tag) {
    // tags stored as JSON string; SQLite has no JSON ops portable across dialects -> use 'contains'
    where.tags = { contains: JSON.stringify(req.query.tag).slice(1, -1) };
  }
  if (req.query.date) {
    const day = new Date(req.query.date);
    if (!isNaN(day.getTime())) {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      where.createdAt = { gte: day, lt: next };
    }
  }

  const [items, total] = await Promise.all([
    prisma.galleryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { uploader: true },
    }),
    prisma.galleryItem.count({ where }),
  ]);

  res.json({ page, limit, total, items: items.map(serialize) });
});

// POST /api/gallery  (multipart)  -> any logged-in user
router.post('/', authRequired, upload.single('file'), async (req, res) => {
  try {
    const { title, type, videoLink } = req.body;
    const tags = parseTags(req.body.tags);
    const tt = ['image', 'video', 'link'].includes(type) ? type : 'image';

    if (!title) return res.status(400).json({ message: 'Title is required' });

    let fileUrl = '';

    if (tt === 'link') {
      if (!videoLink) return res.status(400).json({ message: 'videoLink is required' });
    } else {
      if (!req.file) return res.status(400).json({ message: 'File is required' });

      // enforce per-type size limit
      if (tt === 'image' && req.file.size > MAX_IMAGE) {
        return res.status(400).json({ message: 'Image too large (>10MB)' });
      }
      if (tt === 'video' && req.file.size > MAX_VIDEO) {
        return res.status(400).json({ message: 'Video too large (>50MB)' });
      }

      const uploaded = await storage.upload(req.file);
      fileUrl = uploaded.url;
    }

    const g = await prisma.galleryItem.create({
      data: {
        title: String(title).slice(0, 200),
        type: tt,
        fileUrl,
        videoLink: tt === 'link' ? String(videoLink).slice(0, 500) : null,
        tags: JSON.stringify(tags),
        uploaderId: req.user.id,
      },
      include: { uploader: true },
    });

    res.status(201).json(serialize(g));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Upload failed' });
  }
});

// DELETE /api/gallery/:id (admin)
router.delete('/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const g = await prisma.galleryItem.findUnique({ where: { id } });
  if (!g) return res.status(404).json({ message: 'Not found' });
  await prisma.galleryItem.delete({ where: { id } });
  res.json({ ok: true });
});

// PATCH /api/gallery/:id  (admin) — edit title/tags
router.patch('/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const g = await prisma.galleryItem.findUnique({ where: { id } });
  if (!g) return res.status(404).json({ message: 'Not found' });

  const data = {};
  if (req.body.title !== undefined) data.title = String(req.body.title).slice(0, 200);
  if (req.body.tags !== undefined) data.tags = JSON.stringify(parseTags(req.body.tags));

  const updated = await prisma.galleryItem.update({
    where: { id },
    data,
    include: { uploader: true },
  });
  res.json(serialize(updated));
});

module.exports = router;
