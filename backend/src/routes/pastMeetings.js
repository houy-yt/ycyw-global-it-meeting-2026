const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authRequired, adminRequired } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const items = await prisma.pastMeeting.findMany({ orderBy: { year: 'desc' } });
  res.json(items);
});

router.post('/', authRequired, adminRequired, async (req, res) => {
  const { year, title, location, dateRange, linkUrl } = req.body || {};
  if (!year || !title || !location || !dateRange) {
    return res.status(400).json({ message: 'Missing fields' });
  }
  try {
    const created = await prisma.pastMeeting.create({
      data: {
        year: Number(year),
        title: String(title),
        location: String(location),
        dateRange: String(dateRange),
        linkUrl: linkUrl || null,
      },
    });
    res.status(201).json(created);
  } catch (e) {
    if (String(e.message).includes('Unique constraint')) {
      return res.status(409).json({ message: 'Year already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const { year, title, location, dateRange, linkUrl } = req.body || {};
  try {
    const updated = await prisma.pastMeeting.update({
      where: { id },
      data: {
        ...(year !== undefined ? { year: Number(year) } : {}),
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(location !== undefined ? { location: String(location) } : {}),
        ...(dateRange !== undefined ? { dateRange: String(dateRange) } : {}),
        ...(linkUrl !== undefined ? { linkUrl: linkUrl || null } : {}),
      },
    });
    res.json(updated);
  } catch (e) {
    res.status(404).json({ message: 'Not found' });
  }
});

router.delete('/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.pastMeeting.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

module.exports = router;
