/**
 * Public talk detail endpoint (read-only).
 *   GET /api/talks/:id   ->  talk with resources (no admin token required)
 * Used by the public schedule page to lazy-load the detail / resources modal.
 */
const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid id' });
  const t = await prisma.talk.findUnique({
    where: { id },
    include: {
      resources: { orderBy: { sortOrder: 'asc' } },
      item: { include: { day: true } },
    },
  });
  if (!t) return res.status(404).json({ message: 'Not found' });
  res.json({
    id: t.id,
    title: t.title,
    speaker: t.speaker,
    abstract: t.abstract,
    sortOrder: t.sortOrder,
    item: t.item ? {
      id: t.item.id,
      startTime: t.item.startTime,
      endTime: t.item.endTime,
      sectionTitle: t.item.sectionTitle,
      description: t.item.description,
      day: t.item.day ? {
        id: t.item.day.id,
        date: t.item.day.date.toISOString().slice(0, 10),
        dayLabel: t.item.day.dayLabel,
      } : null,
    } : null,
    resources: t.resources.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      fileUrl: r.fileUrl,
      linkUrl: r.linkUrl,
      fileSize: r.fileSize,
      sortOrder: r.sortOrder,
    })),
  });
});

module.exports = router;
