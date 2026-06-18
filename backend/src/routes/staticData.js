/**
 * Public read-only endpoints (backward-compatible JSON shape):
 *
 *   GET /api/schedule    — returns { meeting, dates: [{ date, dayLabel, items: [{time,title,talks,description,id,...}] }] }
 *   GET /api/attendees   — returns { total, groups: [{ school, people }] }    (default IT department)
 *   GET /api/attendees?department=IT|Logistics|...
 *   GET /api/attendees/departments  — list of all departments that currently have at least 1 attendee
 *   GET /api/meeting     — basic meeting info row
 *
 * The data is now backed by the DB (MeetingInfo / ScheduleDay / ScheduleItem / Talk
 * / TalkResource / Attendee / Department / Organization).  When the DB is empty
 * (fresh checkout), the legacy data/*.json files are returned as a fallback so
 * that the public site keeps working until `npm run db:seed` is executed.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const prisma = require('../utils/prisma');

const settingsService = require('../services/settingsService');

const router = express.Router();
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function readJson(name) {
  const p = path.join(DATA_DIR, name);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

function formatTimeRange(startTime, endTime) {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || '';
}

function serializeTalkResource(r) {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    fileUrl: r.fileUrl,
    linkUrl: r.linkUrl,
    fileSize: r.fileSize,
    sortOrder: r.sortOrder,
  };
}

function serializeTalk(t) {
  return {
    id: t.id,
    title: t.title || '',
    speaker: t.speaker || '',
    abstract: t.abstract || '',
    sortOrder: t.sortOrder,
    resources: (t.resources || []).map(serializeTalkResource),
  };
}

function serializeItem(it) {
  return {
    id: it.id,
    time: formatTimeRange(it.startTime, it.endTime),
    startTime: it.startTime,
    endTime: it.endTime,
    title: it.sectionTitle || '',
    category: it.category,
    description: it.description || '',
    talks: (it.talks || []).map(serializeTalk),
    sortOrder: it.sortOrder,
  };
}

// ────────────────────────── Public endpoints ──────────────────────────

router.get('/schedule', async (req, res) => {
  try {
    const meeting = await prisma.meetingInfo.findUnique({ where: { id: 1 } });
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

    if (!meeting || days.length === 0) {
      // Fallback to legacy JSON
      const legacy = readJson('schedule.json');
      if (legacy) return res.json(legacy);
      return res.json({ meeting: null, dates: [] });
    }

    res.json({
      meeting: {
        name: meeting.name,
        tagline: meeting.tagline || '',
        // keep YYYY-MM-DD shape used by frontend
        startDate: meeting.startDate.toISOString().slice(0, 10),
        endDate: meeting.endDate.toISOString().slice(0, 10),
        location: meeting.location,
      },
      dates: days.map((d) => ({
        id: d.id,
        date: d.date.toISOString().slice(0, 10),
        dayLabel: d.dayLabel,
        items: d.items.map(serializeItem),
      })),
    });
  } catch (e) {
    console.error('[schedule] error', e);
    res.status(500).json({ message: 'Failed to load schedule' });
  }
});

router.get('/meeting', async (req, res) => {
  try {
    const meeting = await prisma.meetingInfo.findUnique({ where: { id: 1 } });
    if (!meeting) {
      const legacy = readJson('schedule.json');
      if (legacy?.meeting) return res.json(legacy.meeting);
      return res.json(null);
    }
    res.json({
      id: meeting.id,
      name: meeting.name,
      tagline: meeting.tagline || '',
      startDate: meeting.startDate.toISOString().slice(0, 10),
      endDate: meeting.endDate.toISOString().slice(0, 10),
      location: meeting.location,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/attendees', async (req, res) => {
  try {
    const department = req.query.department ? String(req.query.department) : undefined;

    const list = await prisma.attendee.findMany({
      where: {
        isActive: true,
        ...(department ? { department } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    if (list.length === 0) {
      // Fallback to legacy JSON
      // The static JSON is IT-department data only — return it whenever:
      //   1) no department filter is given, OR
      //   2) the filter is 'IT' (legacy compatibility)
      const dept = (department || 'IT').toString();
      const totalDb = await prisma.attendee.count();
      if (totalDb === 0 && (dept === 'IT' || !department)) {
        const legacy = readJson('attendees.json');
        if (legacy && Array.isArray(legacy) && legacy.length) {
          const groups = {};
          for (const a of legacy) {
            const key = a.school || 'Other';
            if (!groups[key]) groups[key] = [];
            const { email, ...publicData } = a;
            groups[key].push({ ...publicData, department: 'IT' });
          }
          return res.json({
            total: legacy.length,
            department: 'IT',
            groups: Object.entries(groups).map(([school, people]) => ({ school, people })),
          });
        }
      }
      return res.json({ total: 0, department: dept, groups: [] });
    }

    // Fetch organizations for color & sortOrder
    const orgs = await prisma.organization.findMany();
    const orgMap = new Map(orgs.map((o) => [o.code, o]));

    // Group by school
    const groups = {};
    for (const a of list) {
      const key = a.school || 'Other';
      if (!groups[key]) groups[key] = [];
      // strip private fields
      groups[key].push({
        id: a.id,
        no: a.no,
        nameEn: a.nameEn,
        nameCn: a.nameCn,
        photoUrl: a.photoUrl,
        school: a.school,
        title: a.title,
        bio: a.bio,
        department: a.department,
      });
    }

    // Build groups with org color & sortOrder, sorted by org sortOrder
    const groupList = Object.entries(groups).map(([school, people]) => {
      const org = orgMap.get(school);
      return {
        school,
        people,
        color: org?.color || '#64748b',
        sortOrder: org?.sortOrder ?? 999,
      };
    });
    groupList.sort((a, b) => a.sortOrder - b.sortOrder || a.school.localeCompare(b.school));

    res.json({
      total: list.length,
      department: department || null,
      groups: groupList,
    });
  } catch (e) {
    console.error('[attendees] error', e);
    res.status(500).json({ message: 'Failed to load attendees' });
  }
});

/**
 * Distinct departments that have at least 1 attendee, sorted by Department.sortOrder
 * Returns: [{ code, name, nameCn, color, count }]
 */
router.get('/attendees/departments', async (req, res) => {
  try {
    const groups = await prisma.attendee.groupBy({
      by: ['department'],
      where: { isActive: true },
      _count: { _all: true },
    });
    const counts = new Map(groups.map((g) => [g.department, g._count._all]));

    const departments = await prisma.department.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const out = departments
      .map((d) => ({
        code: d.code,
        name: d.name,
        nameCn: d.nameCn,
        color: d.color,
        count: counts.get(d.code) || 0,
      }))
      // Only show departments that actually have people, but always include IT
      .filter((d) => d.count > 0 || d.code === 'IT');

    res.json(out);
  } catch (e) {
    console.error('[departments] error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────── Entry Guide (public) ──────────────────────────

router.get('/entry-guide/settings', async (req, res) => {
  try {
    const qrcodeUrl = await settingsService.get('entryGuide.qrcodeUrl', '/fksq-qrcode.jpg');
    res.json({ qrcodeUrl });
  } catch (e) {
    console.error('[entry-guide] error', e);
    res.json({ qrcodeUrl: '/fksq-qrcode.jpg' });
  }
});

module.exports = router;
