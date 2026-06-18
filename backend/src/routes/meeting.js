/**
 * Admin endpoints to manage MeetingInfo (single-row table, id=1).
 *   GET  /api/admin/meeting       (admin)  full record
 *   PUT  /api/admin/meeting       (admin)  upsert name/tagline/startDate/endDate/location
 */
const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authRequired, adminRequired } = require('../middleware/auth');

router.get('/', authRequired, adminRequired, async (req, res) => {
  const m = await prisma.meetingInfo.findUnique({ where: { id: 1 } });
  res.json(m || null);
});

router.put('/', authRequired, adminRequired, async (req, res) => {
  const { name, tagline, startDate, endDate, location } = req.body || {};
  const data = {};
  if (name !== undefined) data.name = String(name);
  if (tagline !== undefined) data.tagline = tagline ? String(tagline) : null;
  if (startDate !== undefined) data.startDate = new Date(startDate);
  if (endDate !== undefined) data.endDate = new Date(endDate);
  if (location !== undefined) data.location = String(location);

  const m = await prisma.meetingInfo.upsert({
    where: { id: 1 },
    update: data,
    create: {
      id: 1,
      name: data.name || 'YCYW Meeting',
      tagline: data.tagline || null,
      startDate: data.startDate || new Date(),
      endDate: data.endDate || new Date(),
      location: data.location || '北京',
    },
  });
  res.json(m);
});

module.exports = router;
