const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authRequired, adminRequired } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const tags = await prisma.presetTag.findMany({ orderBy: { name: 'asc' } });
  res.json(tags);
});

router.post('/', authRequired, adminRequired, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Name required' });
  try {
    const t = await prisma.presetTag.create({ data: { name } });
    res.status(201).json(t);
  } catch {
    res.status(409).json({ message: 'Tag already exists' });
  }
});

router.delete('/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.presetTag.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

module.exports = router;
