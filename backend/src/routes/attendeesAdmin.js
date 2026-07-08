/**
 * Admin CRUD for Attendees / Organizations / Departments.
 * Mounted at /api/admin.
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const prisma = require('../utils/prisma');
const storage = require('../services/storageService');
const settings = require('../services/settingsService');
const { authRequired, adminRequired } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ────────────── Attendees ──────────────

// Import from data/attendees.json (department defaults to IT)
router.post('/attendees/import-static', authRequired, adminRequired, async (req, res) => {
  try {
    const { runMigration } = require('../../prisma/migrate-static-to-db');
    const force = req.query.force === '1' || req.body?.force === true;
    const result = await runMigration(prisma, { what: 'attendees', force });
    res.json({ ok: true, result });
  } catch (e) {
    console.error('[attendees import-static]', e);
    res.status(500).json({ message: e.message });
  }
});

// Import from user-uploaded JSON file
router.post('/attendees/import-json', authRequired, adminRequired, async (req, res) => {
  try {
    const { jsonData, force } = req.body || {};
    if (!Array.isArray(jsonData) || !jsonData.length) {
      return res.status(400).json({ message: 'jsonData array required' });
    }

    if (force) {
      await prisma.attendee.deleteMany();
    }

    let n = 0;
    for (const a of jsonData) {
      await prisma.attendee.create({
        data: {
          no: a.no !== undefined && a.no !== '' ? Number(a.no) : null,
          nameEn: a.nameEn || null,
          nameCn: a.nameCn || null,
          email: a.email || null,
          photoUrl: a.photoUrl || null,
          school: a.school || 'Other',
          department: a.department || 'IT',
          title: a.title || null,
          phone: a.phone || null,
          bio: a.bio || null,
          isActive: a.isActive !== false,
          sortOrder: a.sortOrder || a.no || 0,
        },
      });
      n++;
    }

    // Sync organizations from imported data
    const schools = Array.from(new Set(jsonData.map((a) => a.school).filter(Boolean)));
    let orgCount = 0;
    for (let i = 0; i < schools.length; i++) {
      const code = schools[i];
      const upper = (code || '').toUpperCase();
      let color = '#0032a0';
      if (upper.includes('YCIS')) color = '#ff0044';
      else if (upper.includes('YWIES') || upper.includes('YWAD')) color = '#ff8200';
      await prisma.organization.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: code,
          category: code === 'CTO' ? 'headquarter' : 'school',
          color,
          sortOrder: i,
        },
      });
      orgCount++;
    }

    res.json({ ok: true, attendees: n, organizations: orgCount });
  } catch (e) {
    console.error('[attendees import-json]', e);
    res.status(500).json({ message: e.message });
  }
});

router.get('/attendees', authRequired, adminRequired, async (req, res) => {
  const { department, school, q } = req.query;
  const where = {};
  if (department) where.department = String(department);
  if (school) where.school = String(school);
  if (q) {
    const s = String(q);
    where.OR = [
      { nameEn: { contains: s } },
      { nameCn: { contains: s } },
      { email: { contains: s } },
    ];
  }
  const items = await prisma.attendee.findMany({
    where,
    orderBy: [{ department: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
  });
  res.json(items);
});

router.post('/attendees', authRequired, adminRequired, async (req, res) => {
  const {
    no, nameEn, nameCn, email, photoUrl, school, department, title,
    phone, bio, isActive, sortOrder,
  } = req.body || {};

  if (!school) return res.status(400).json({ message: 'school required' });

  try {
    const a = await prisma.attendee.create({
      data: {
        no: no !== undefined && no !== '' ? Number(no) : null,
        nameEn: nameEn || null,
        nameCn: nameCn || null,
        email: email || null,
        photoUrl: photoUrl || null,
        school: String(school),
        department: String(department || 'IT'),
        title: title || null,
        phone: phone || null,
        bio: bio || null,
        isActive: isActive !== false,
        sortOrder: Number(sortOrder) || 0,
      },
    });
    res.status(201).json(a);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Batch sort: Attendees (must be before /:id to avoid route conflict)
router.put('/attendees/sort', authRequired, adminRequired, async (req, res) => {
  const list = Array.isArray(req.body) ? req.body : req.body?.items;
  if (!Array.isArray(list)) return res.status(400).json({ message: 'Expected array of {id, sortOrder}' });
  try {
    for (const item of list) {
      await prisma.attendee.update({
        where: { id: Number(item.id) },
        data: { sortOrder: Number(item.sortOrder) },
      });
    }
    res.json({ ok: true, updated: list.length });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/attendees/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const fields = [
    'no','nameEn','nameCn','email','photoUrl','school','department',
    'title','phone','bio','isActive','sortOrder',
  ];
  const data = {};
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      if (f === 'no' || f === 'sortOrder') {
        data[f] = req.body[f] === '' || req.body[f] === null ? null : Number(req.body[f]);
        if (f === 'sortOrder') data[f] = Number(req.body[f]) || 0;
      } else if (f === 'isActive') {
        data[f] = !!req.body[f];
      } else {
        data[f] = req.body[f] === '' ? null : req.body[f];
      }
    }
  }
  try {
    const a = await prisma.attendee.update({ where: { id }, data });
    res.json(a);
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

router.delete('/attendees/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.attendee.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

// Bulk import (CSV-like JSON array)
router.post('/attendees/bulk', authRequired, adminRequired, async (req, res) => {
  const list = Array.isArray(req.body) ? req.body : req.body?.items;
  if (!Array.isArray(list)) return res.status(400).json({ message: 'Expected array' });
  let n = 0;
  for (const a of list) {
    if (!a.school) continue;
    await prisma.attendee.create({
      data: {
        no: a.no !== undefined && a.no !== '' ? Number(a.no) : null,
        nameEn: a.nameEn || null,
        nameCn: a.nameCn || null,
        email: a.email || null,
        photoUrl: a.photoUrl || null,
        school: String(a.school),
        department: String(a.department || 'IT'),
        title: a.title || null,
        phone: a.phone || null,
        bio: a.bio || null,
        isActive: a.isActive !== false,
        sortOrder: Number(a.sortOrder) || 0,
      },
    });
    n++;
  }
  res.json({ imported: n });
});

// Upload attendee photo → saves to uploads/attendees/, returns { url }
router.post(
  '/attendees/upload-photo',
  authRequired,
  adminRequired,
  upload.single('file'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'File required' });
    const limits = await settings.getUploadLimitsBytes();
    if (req.file.size > limits.image) {
      return res.status(400).json({ message: `Image too large (>${limits.imgMB}MB)` });
    }
    try {
      const path = require('path');
      const fs = require('fs');
      const crypto = require('crypto');
      const attendeesDir = path.join(__dirname, '..', '..', 'uploads', 'attendees');
      if (!fs.existsSync(attendeesDir)) {
        fs.mkdirSync(attendeesDir, { recursive: true });
      }
      const ext = path.extname(req.file.originalname) || '';
      const key = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      const target = path.join(attendeesDir, key);
      fs.writeFileSync(target, req.file.buffer);
      res.json({ url: `/uploads/attendees/${key}` });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

// ────────────── Organizations (schools) ──────────────

router.get('/organizations', authRequired, adminRequired, async (req, res) => {
  const items = await prisma.organization.findMany({
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  });
  res.json(items);
});

router.post('/organizations', authRequired, adminRequired, async (req, res) => {
  const { code, name, category, color, sortOrder } = req.body || {};
  if (!code || !name) return res.status(400).json({ message: 'code & name required' });
  try {
    const o = await prisma.organization.create({
      data: {
        code: String(code).trim(),
        name: String(name).trim(),
        category: String(category || 'school'),
        color: color || null,
        sortOrder: Number(sortOrder) || 0,
      },
    });
    res.status(201).json(o);
  } catch (e) {
    if (String(e.message).includes('Unique constraint'))
      return res.status(409).json({ message: 'Code exists' });
    res.status(500).json({ message: e.message });
  }
});

// Batch sort: Organizations (must be before /:id to avoid route conflict)
router.put('/organizations/sort', authRequired, adminRequired, async (req, res) => {
  const list = Array.isArray(req.body) ? req.body : req.body?.items;
  if (!Array.isArray(list)) return res.status(400).json({ message: 'Expected array of {id, sortOrder}' });
  try {
    for (const item of list) {
      await prisma.organization.update({
        where: { id: Number(item.id) },
        data: { sortOrder: Number(item.sortOrder) },
      });
    }
    res.json({ ok: true, updated: list.length });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/organizations/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const { code, name, category, color, sortOrder } = req.body || {};
  try {
    const o = await prisma.organization.update({
      where: { id },
      data: {
        ...(code !== undefined ? { code: String(code).trim() } : {}),
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(category !== undefined ? { category: String(category) } : {}),
        ...(color !== undefined ? { color: color || null } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) || 0 } : {}),
      },
    });
    res.json(o);
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

router.delete('/organizations/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.organization.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

// ────────────── Departments ──────────────

router.get('/departments', authRequired, adminRequired, async (req, res) => {
  const items = await prisma.department.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(items);
});

router.post('/departments', authRequired, adminRequired, async (req, res) => {
  const { code, name, nameCn, color, sortOrder } = req.body || {};
  if (!code || !name) return res.status(400).json({ message: 'code & name required' });
  try {
    const d = await prisma.department.create({
      data: {
        code: String(code).trim(),
        name: String(name).trim(),
        nameCn: nameCn || null,
        color: color || null,
        sortOrder: Number(sortOrder) || 0,
      },
    });
    res.status(201).json(d);
  } catch (e) {
    if (String(e.message).includes('Unique constraint'))
      return res.status(409).json({ message: 'Code exists' });
    res.status(500).json({ message: e.message });
  }
});

router.put('/departments/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const { code, name, nameCn, color, sortOrder } = req.body || {};
  try {
    const d = await prisma.department.update({
      where: { id },
      data: {
        ...(code !== undefined ? { code: String(code).trim() } : {}),
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(nameCn !== undefined ? { nameCn: nameCn || null } : {}),
        ...(color !== undefined ? { color: color || null } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) || 0 } : {}),
      },
    });
    res.json(d);
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

router.delete('/departments/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  // Refuse to delete if there are attendees
  const count = await prisma.attendee.count({ where: { department: (await prisma.department.findUnique({ where: { id } }))?.code || '__none__' } });
  if (count > 0) return res.status(400).json({ message: `还有 ${count} 位人员归属此部门，无法删除` });
  try {
    await prisma.department.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

module.exports = router;
