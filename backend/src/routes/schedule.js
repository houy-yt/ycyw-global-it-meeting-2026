/**
 * Admin CRUD for schedule:
 *   /api/admin/schedule/days                 GET, POST
 *   /api/admin/schedule/days/:id             PUT, DELETE
 *   /api/admin/schedule/items                POST
 *   /api/admin/schedule/items/:id            PUT, DELETE
 *   /api/admin/schedule/talks                POST
 *   /api/admin/schedule/talks/:id            PUT, DELETE
 *   /api/admin/schedule/talks/:id/resources  POST  (multipart: file OR linkUrl)
 *   /api/admin/schedule/resources/:id        PUT, DELETE
 *
 * Plus a public:
 *   GET /api/talks/:id   (talk + resources)  — used by the public schedule page
 *                                              to lazy-load detail modal.
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const prisma = require('../utils/prisma');
const storage = require('../services/storageService');
const settings = require('../services/settingsService');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

// ──── multer ────
const upload = multer({
  storage: multer.memoryStorage(),
  // file size limit re-checked in handler against DB setting
  limits: { fileSize: 500 * 1024 * 1024 },
});

const RESOURCE_TYPES = ['ppt', 'pdf', 'video', 'audio', 'link', 'image'];

// ─────── Import from static schedule.json ───────
router.post('/import-static', authRequired, adminRequired, async (req, res) => {
  try {
    const { runMigration } = require('../../prisma/migrate-static-to-db');
    const force = req.query.force === '1' || req.body?.force === true;
    const result = await runMigration(prisma, { what: 'schedule', force });
    res.json({ ok: true, result });
  } catch (e) {
    console.error('[schedule import-static]', e);
    res.status(500).json({ message: e.message });
  }
});

// ─────── Import from user-uploaded JSON file ───────
router.post('/import-json', authRequired, adminRequired, async (req, res) => {
  try {
    const { jsonData, force } = req.body || {};
    if (!jsonData || typeof jsonData !== 'object') {
      return res.status(400).json({ message: 'jsonData object required' });
    }

    const data = jsonData;

    // Optionally sync MeetingInfo
    const m = data.meeting || {};
    if (m.name || m.startDate) {
      await prisma.meetingInfo.upsert({
        where: { id: 1 },
        update: {
          name: m.name || 'YCYW 2026 Global IT Meeting',
          tagline: m.tagline || null,
          startDate: m.startDate ? new Date(m.startDate) : new Date(),
          endDate: m.endDate ? new Date(m.endDate) : new Date(),
          location: m.location || '北京',
        },
        create: {
          id: 1,
          name: m.name || 'YCYW 2026 Global IT Meeting',
          tagline: m.tagline || null,
          startDate: m.startDate ? new Date(m.startDate) : new Date(),
          endDate: m.endDate ? new Date(m.endDate) : new Date(),
          location: m.location || '北京',
        },
      });
    }

    // Check existing data
    if (force) {
      await prisma.talkResource.deleteMany();
      await prisma.talk.deleteMany();
      await prisma.scheduleItem.deleteMany();
      await prisma.scheduleDay.deleteMany();
    }

    // Parse time range helper
    function parseTimeRange(s) {
      if (!s) return { startTime: '', endTime: '' };
      const [a, b] = String(s).split(/\s*[-–—]\s*/);
      return { startTime: (a || '').trim(), endTime: (b || '').trim() };
    }
    function detectCategory(title) {
      if (!title) return 'session';
      if (title.includes('午餐')) return 'meal';
      if (title.includes('晚餐')) return 'meal';
      if (title.includes('茶歇')) return 'tea';
      if (title.includes('签到')) return 'checkin';
      if (title.includes('前往')) return 'transit';
      return 'session';
    }

    let dayN = 0;
    for (let d = 0; d < (data.dates || []).length; d++) {
      const day = data.dates[d];
      const dayRow = await prisma.scheduleDay.create({
        data: {
          date: new Date(day.date),
          dayLabel: day.dayLabel || day.date,
          sortOrder: d,
        },
      });
      dayN++;

      for (let i = 0; i < (day.items || []).length; i++) {
        const it = day.items[i];
        const { startTime, endTime } = parseTimeRange(it.time);
        const category = detectCategory(it.title);
        const itemRow = await prisma.scheduleItem.create({
          data: {
            dayId: dayRow.id,
            startTime,
            endTime,
            sortOrder: i,
            sectionTitle: it.title || null,
            category,
            description: null,
          },
        });

        const talks = it.talks || [];
        for (let t = 0; t < talks.length; t++) {
          const tk = talks[t];
          if (!tk.title && !tk.speaker) continue;
          await prisma.talk.create({
            data: {
              itemId: itemRow.id,
              title: tk.title || '议程待定',
              speaker: tk.speaker || null,
              abstract: null,
              sortOrder: t,
            },
          });
        }
      }
    }

    res.json({ ok: true, schedule: dayN });
  } catch (e) {
    console.error('[schedule import-json]', e);
    res.status(500).json({ message: e.message });
  }
});

// ─────── Import from Excel/CSV (pre-parsed JSON from frontend) ───────
router.post('/import-excel', authRequired, adminRequired, async (req, res) => {
  try {
    const { rows, clearExisting } = req.body || {};
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ message: 'rows array required' });
    }

    // Optionally clear existing schedule
    if (clearExisting) {
      // Delete in order: TalkResource → Talk → ScheduleItem → ScheduleDay
      await prisma.talkResource.deleteMany({});
      await prisma.talk.deleteMany({});
      await prisma.scheduleItem.deleteMany({});
      await prisma.scheduleDay.deleteMany({});
    }

    // Group rows by date → items (startTime+endTime+sectionTitle) → talks
    const dayMap = new Map(); // date string → { dayLabel, items: Map }
    let sortDay = 0;

    for (const row of rows) {
      const dateStr = String(row.date || '').trim();
      if (!dateStr) continue;

      if (!dayMap.has(dateStr)) {
        sortDay++;
        dayMap.set(dateStr, {
          dayLabel: row.dayLabel || dateStr,
          sortOrder: sortDay,
          items: new Map(),
        });
      }
      const dayEntry = dayMap.get(dateStr);

      const itemKey = `${row.startTime || ''}|${row.endTime || ''}|${row.sectionTitle || ''}`;
      if (!dayEntry.items.has(itemKey)) {
        dayEntry.items.set(itemKey, {
          startTime: String(row.startTime || ''),
          endTime: String(row.endTime || ''),
          sectionTitle: row.sectionTitle || null,
          category: row.category || 'session',
          description: row.description || null,
          sortOrder: dayEntry.items.size,
          talks: [],
        });
      }
      const itemEntry = dayEntry.items.get(itemKey);

      if (row.talkTitle) {
        itemEntry.talks.push({
          title: String(row.talkTitle),
          speaker: row.speaker || null,
          sortOrder: itemEntry.talks.length,
        });
      }
    }

    // Write to DB
    let totalDays = 0, totalItems = 0, totalTalks = 0;

    for (const [dateStr, dayData] of dayMap) {
      const day = await prisma.scheduleDay.create({
        data: {
          date: new Date(dateStr),
          dayLabel: dayData.dayLabel,
          sortOrder: dayData.sortOrder,
        },
      });
      totalDays++;

      for (const [, itemData] of dayData.items) {
        const item = await prisma.scheduleItem.create({
          data: {
            dayId: day.id,
            startTime: itemData.startTime,
            endTime: itemData.endTime,
            sectionTitle: itemData.sectionTitle,
            category: itemData.category,
            description: itemData.description,
            sortOrder: itemData.sortOrder,
          },
        });
        totalItems++;

        for (const t of itemData.talks) {
          await prisma.talk.create({
            data: {
              itemId: item.id,
              title: t.title,
              speaker: t.speaker,
              sortOrder: t.sortOrder,
            },
          });
          totalTalks++;
        }
      }
    }

    res.json({ ok: true, days: totalDays, items: totalItems, talks: totalTalks });
  } catch (e) {
    console.error('[schedule import-excel]', e);
    res.status(500).json({ message: e.message });
  }
});

function detectResourceType(filename) {
  const ext = (path.extname(filename || '').toLowerCase() || '').slice(1);
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['mp4', 'webm', 'mov', 'm4v', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) return 'audio';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  return 'pdf';
}

// ====================== Days ======================

router.get('/days', authRequired, adminRequired, async (req, res) => {
  const days = await prisma.scheduleDay.findMany({
    orderBy: [{ sortOrder: 'asc' }, { date: 'asc' }],
    include: {
      items: {
        orderBy: [{ sortOrder: 'asc' }, { startTime: 'asc' }],
        include: {
          talks: {
            orderBy: { sortOrder: 'asc' },
            include: { resources: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      },
    },
  });
  res.json(days);
});

router.post('/days', authRequired, adminRequired, async (req, res) => {
  const { date, dayLabel, sortOrder } = req.body || {};
  if (!date || !dayLabel) return res.status(400).json({ message: 'date & dayLabel required' });
  try {
    const d = await prisma.scheduleDay.create({
      data: {
        date: new Date(date),
        dayLabel: String(dayLabel),
        sortOrder: Number(sortOrder) || 0,
      },
    });
    res.status(201).json(d);
  } catch (e) {
    if (String(e.message).includes('Unique constraint')) {
      return res.status(409).json({ message: 'Date already exists' });
    }
    res.status(500).json({ message: e.message });
  }
});

router.put('/days/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const { date, dayLabel, sortOrder, notice } = req.body || {};
  try {
    const d = await prisma.scheduleDay.update({
      where: { id },
      data: {
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(dayLabel !== undefined ? { dayLabel: String(dayLabel) } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
        ...(notice !== undefined ? { notice: notice || null } : {}),
      },
    });
    res.json(d);
  } catch (e) {
    console.error('[schedule PUT /days/:id]', e.message || e);
    if (e.code === 'P2025') return res.status(404).json({ message: 'Not found' });
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

router.delete('/days/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.scheduleDay.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

// ====================== Items ======================

router.post('/items', authRequired, adminRequired, async (req, res) => {
  const { dayId, startTime, endTime, sectionTitle, category, description, sortOrder } = req.body || {};
  if (!dayId) return res.status(400).json({ message: 'dayId required' });
  try {
    const it = await prisma.scheduleItem.create({
      data: {
        dayId: Number(dayId),
        startTime: String(startTime || ''),
        endTime: String(endTime || ''),
        sectionTitle: sectionTitle || null,
        category: String(category || 'session'),
        description: description || null,
        sortOrder: Number(sortOrder) || 0,
      },
    });
    res.status(201).json(it);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/items/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const { dayId, startTime, endTime, sectionTitle, category, description, sortOrder } = req.body || {};
  try {
    const it = await prisma.scheduleItem.update({
      where: { id },
      data: {
        ...(dayId !== undefined ? { dayId: Number(dayId) } : {}),
        ...(startTime !== undefined ? { startTime: String(startTime) } : {}),
        ...(endTime !== undefined ? { endTime: String(endTime) } : {}),
        ...(sectionTitle !== undefined ? { sectionTitle: sectionTitle || null } : {}),
        ...(category !== undefined ? { category: String(category) } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
      },
    });
    res.json(it);
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

router.delete('/items/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.scheduleItem.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

// ====================== Talks ======================

router.post('/talks', authRequired, adminRequired, async (req, res) => {
  const { itemId, title, speaker, abstract, sortOrder } = req.body || {};
  if (!itemId) return res.status(400).json({ message: 'itemId required' });
  try {
    const t = await prisma.talk.create({
      data: {
        itemId: Number(itemId),
        title: String(title || '议程待定'),
        speaker: speaker || null,
        abstract: abstract || null,
        sortOrder: Number(sortOrder) || 0,
      },
    });
    res.status(201).json(t);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/talks/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const { itemId, title, speaker, abstract, sortOrder } = req.body || {};
  try {
    const t = await prisma.talk.update({
      where: { id },
      data: {
        ...(itemId !== undefined ? { itemId: Number(itemId) } : {}),
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(speaker !== undefined ? { speaker: speaker || null } : {}),
        ...(abstract !== undefined ? { abstract: abstract || null } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
      },
    });
    res.json(t);
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

router.delete('/talks/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.talk.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

// ====================== TalkResources ======================

// Standalone upload endpoint (returns {url, size}) used by the admin UI to
// pre-upload a file before creating a resource row.
router.post(
  '/upload-resource',
  authRequired,
  adminRequired,
  upload.single('file'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'File required' });
    const limits = await settings.getUploadLimitsBytes();
    if (req.file.size > limits.resource) {
      return res.status(400).json({ message: `File too large (>${limits.resMB}MB)` });
    }
    try {
      const uploaded = await storage.upload(req.file);
      res.json({
        url: uploaded.url,
        size: req.file.size,
        detectedType: detectResourceType(req.file.originalname),
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

router.post(
  '/talks/:id/resources',
  authRequired,
  adminRequired,
  upload.single('file'),
  async (req, res) => {
    const talkId = Number(req.params.id);
    const talk = await prisma.talk.findUnique({ where: { id: talkId } });
    if (!talk) return res.status(404).json({ message: 'Talk not found' });

    const { type, title, linkUrl, fileUrl: bodyFileUrl } = req.body || {};
    let resourceType = (type && RESOURCE_TYPES.includes(type)) ? type : null;
    let fileUrl = bodyFileUrl || null;
    let fileSize = null;

    try {
      if (req.file) {
        const limits = await settings.getUploadLimitsBytes();
        if (req.file.size > limits.resource) {
          return res.status(400).json({
            message: `File too large (>${limits.resMB}MB)`,
          });
        }
        if (!resourceType) resourceType = detectResourceType(req.file.originalname);
        const uploaded = await storage.upload(req.file);
        fileUrl = uploaded.url;
        fileSize = req.file.size;
      } else if (fileUrl) {
        if (!resourceType) resourceType = detectResourceType(fileUrl);
      } else if (linkUrl) {
        if (!resourceType) resourceType = 'link';
      } else {
        return res.status(400).json({ message: 'Provide a file, fileUrl OR linkUrl' });
      }

      const r = await prisma.talkResource.create({
        data: {
          talkId,
          type: resourceType,
          title: title || (req.file?.originalname || ''),
          fileUrl,
          linkUrl: linkUrl || null,
          fileSize,
          sortOrder: 0,
        },
      });
      res.status(201).json(r);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  }
);

// Both /resources/:id and /talk-resources/:id work (aliases).
router.put(['/resources/:id', '/talk-resources/:id'], authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const { type, title, linkUrl, fileUrl, sortOrder } = req.body || {};
  try {
    const r = await prisma.talkResource.update({
      where: { id },
      data: {
        ...(type !== undefined && RESOURCE_TYPES.includes(type) ? { type } : {}),
        ...(title !== undefined ? { title: title || null } : {}),
        ...(linkUrl !== undefined ? { linkUrl: linkUrl || null } : {}),
        ...(fileUrl !== undefined ? { fileUrl: fileUrl || null } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
      },
    });
    res.json(r);
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

router.delete(['/resources/:id', '/talk-resources/:id'], authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.talkResource.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

module.exports = router;
