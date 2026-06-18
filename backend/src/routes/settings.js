/**
 * Admin: read/update key-value system settings.
 *   GET  /api/admin/settings              -> all settings grouped by category
 *   GET  /api/admin/settings/:category    -> settings filtered by category
 *   PUT  /api/admin/settings              -> body: [{key,value,category?}] (bulk upsert)
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const settingsService = require('../services/settingsService');
const storageService = require('../services/storageService');
const prisma = require('../utils/prisma');
const { authRequired, adminRequired } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', authRequired, adminRequired, async (req, res) => {
  const rows = await prisma.systemSetting.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });
  // Group by category for the admin UI
  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push({ key: r.key, value: r.value, updatedAt: r.updatedAt });
  }
  res.json({ list: rows, grouped });
});

router.get('/:category', authRequired, adminRequired, async (req, res) => {
  const rows = await prisma.systemSetting.findMany({
    where: { category: req.params.category },
    orderBy: { key: 'asc' },
  });
  res.json(rows);
});

router.put('/', authRequired, adminRequired, async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body?.items;
  if (!Array.isArray(items)) return res.status(400).json({ message: 'Expected array' });
  await settingsService.setMany(items);
  res.json({ ok: true, updated: items.length });
});

// ── Entry Guide QR Code Upload ──
router.post('/entry-guide-qrcode', authRequired, adminRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: '请上传文件' });

    // Upload via storage service
    const { url } = await storageService.upload(req.file);

    // Save URL to settings
    await settingsService.set('entryGuide.qrcodeUrl', url, 'entryGuide');

    res.json({ ok: true, qrcodeUrl: url });
  } catch (e) {
    console.error('[entry-guide-qrcode] upload error', e);
    res.status(500).json({ message: e.message || '上传失败' });
  }
});

module.exports = router;
