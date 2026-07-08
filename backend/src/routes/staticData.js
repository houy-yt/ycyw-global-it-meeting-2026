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
        taglineEn: meeting.taglineEn || '',
        // keep YYYY-MM-DD shape used by frontend
        startDate: meeting.startDate.toISOString().slice(0, 10),
        endDate: meeting.endDate.toISOString().slice(0, 10),
        location: meeting.location,
      },
      dates: days.map((d) => ({
        id: d.id,
        date: d.date.toISOString().slice(0, 10),
        dayLabel: d.dayLabel,
        notice: d.notice || '',
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
      taglineEn: meeting.taglineEn || '',
      startDate: meeting.startDate.toISOString().slice(0, 10),
      endDate: meeting.endDate.toISOString().slice(0, 10),
      region: meeting.region || '',
      location: meeting.location,
      address: meeting.address || '',
      organizer: meeting.organizer || 'YCYW Education',
      aboutTitle: meeting.aboutTitle || '',
      aboutContent: meeting.aboutContent || '',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/nav — public endpoint for navigation links + meeting info
 * Used by both NavBar and Footer to render dynamic navigation.
 * Returns: { links: [...], meetingInfo: {...} }
 */
router.get('/nav', async (req, res) => {
  try {
    // 1. Get nav links from SystemSetting
    const navSetting = await prisma.systemSetting.findUnique({ where: { key: 'nav.links' } });
    let links = [];
    if (navSetting) {
      try { links = JSON.parse(navSetting.value); } catch { links = []; }
    }
    // If no links configured, return default links
    if (!links || links.length === 0) {
      links = [
        { label: '首页',     to: '/',               showInNav: true,  showInFooter: false, heroTitle: '',                  heroSubtitle: '' },
        { label: '日程安排', to: '/schedule',        showInNav: true,  showInFooter: true,  heroTitle: '日程安排',           heroSubtitle: '' },
        { label: '会议地点', to: '/venue',           showInNav: true,  showInFooter: false, heroTitle: '',                  heroSubtitle: '' },
        { label: '参会须知', to: '/meeting-guide',   showInNav: true,  showInFooter: false, heroTitle: 'Meeting Guide',     heroSubtitle: '参会前请仔细阅读以下信息，做好出行准备' },
        { label: '参会人员', to: '/attendees',       showInNav: true,  showInFooter: true,  heroTitle: 'Meet the Team',     heroSubtitle: '' },
        { label: '会后反思', to: '/reflections',     showInNav: true,  showInFooter: true,  heroTitle: '会后反思',           heroSubtitle: '记录你的收获、想法与建议' },
        { label: '会议剪影', to: '/gallery',         showInNav: true,  showInFooter: true,  heroTitle: 'Gallery',           heroSubtitle: '照片 · 视频 · 第三方链接' },
        { label: '往届会议', to: '/past-meetings',   showInNav: false, showInFooter: true,  heroTitle: 'Past Meetings',     heroSubtitle: '回顾每一届 YCYW Global IT Meeting' },
        { label: '入校指引', to: '/entry-guide',     showInNav: false, showInFooter: false, heroTitle: 'Campus Entry Guide', heroSubtitle: '参会访客入校申请填写指引，请使用微信扫描右侧二维码完成申请' },
      ];
    }

    // 2. Get meeting info
    const meeting = await prisma.meetingInfo.findUnique({ where: { id: 1 } });
    const meetingInfo = meeting ? {
      name: meeting.name,
      tagline: meeting.tagline || '',
      taglineEn: meeting.taglineEn || '',
      startDate: meeting.startDate.toISOString().slice(0, 10),
      endDate: meeting.endDate.toISOString().slice(0, 10),
      location: meeting.location,
      address: meeting.address || '',
      organizer: meeting.organizer || 'YCYW Education',
    } : null;

    // 3. Get site logo URL
    const siteLogoUrl = await settingsService.get('site.logoUrl', '');

    // 4. Get footer settings
    const footerSettingsRaw = await settingsService.get('footer.settings', '');
    let footerSettings = null;
    if (footerSettingsRaw) {
      try { footerSettings = JSON.parse(footerSettingsRaw); } catch { footerSettings = null; }
    }

    res.json({ links, meetingInfo, siteLogoUrl: siteLogoUrl || '', footerSettings });
  } catch (e) {
    console.error('[nav] error', e);
    res.status(500).json({ message: 'Failed to load nav' });
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
    const customContent = await settingsService.get('entryGuide.customContent', '');
    res.json({ qrcodeUrl, customContent });
  } catch (e) {
    console.error('[entry-guide] error', e);
    res.json({ qrcodeUrl: '/fksq-qrcode.jpg', customContent: '' });
  }
});

module.exports = router;
