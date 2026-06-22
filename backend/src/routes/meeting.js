/**
 * Admin endpoints to manage MeetingInfo (single-row table, id=1).
 *   GET  /api/admin/meeting       (admin)  full record
 *   PUT  /api/admin/meeting       (admin)  upsert name/tagline/taglineEn/startDate/endDate/location
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
  const { name, tagline, taglineEn, startDate, endDate, region, location, address, organizer } = req.body || {};
  const data = {};
  if (name !== undefined) data.name = String(name);
  if (tagline !== undefined) data.tagline = tagline ? String(tagline) : null;
  if (taglineEn !== undefined) data.taglineEn = taglineEn ? String(taglineEn) : null;
  if (startDate !== undefined) data.startDate = new Date(startDate);
  if (endDate !== undefined) data.endDate = new Date(endDate);
  if (region !== undefined) data.region = String(region);
  if (location !== undefined) data.location = String(location);
  if (address !== undefined) data.address = String(address);
  if (organizer !== undefined) data.organizer = String(organizer);

  const m = await prisma.meetingInfo.upsert({
    where: { id: 1 },
    update: data,
    create: {
      id: 1,
      name: data.name || 'YCYW Meeting',
      tagline: data.tagline || null,
      taglineEn: data.taglineEn || null,
      startDate: data.startDate || new Date(),
      endDate: data.endDate || new Date(),
      region: data.region || '北京亦庄',
      location: data.location || '北京',
      address: data.address || '',
      organizer: data.organizer || 'YCYW Education',
    },
  });
  res.json(m);
});

module.exports = router;
