/**
 * One-time migration script:
 *   data/schedule.json   →  MeetingInfo / ScheduleDay / ScheduleItem / Talk
 *   data/attendees.json  →  Attendee (department defaults to "IT")
 *
 * Safe to run multiple times: uses upsert and skips items that already exist.
 *
 * Two usage modes:
 *   1) CLI:  `node prisma/migrate-static-to-db.js`  (creates its own PrismaClient)
 *   2) require:  `const { runMigration } = require('./migrate-static-to-db');
 *                 await runMigration(existingPrisma);`
 *      — used by seed.js to avoid spawning a sub-process (project path may have spaces).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function parseTimeRange(s) {
  // "8:40 - 9:20"  ->  { startTime: "8:40", endTime: "9:20" }
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

async function migrateMeetingAndSchedule(prisma, opts = {}) {
  const filePath = path.join(DATA_DIR, 'schedule.json');
  if (!fs.existsSync(filePath)) {
    console.warn('⚠️  schedule.json not found, skip.');
    return { meeting: false, schedule: 0 };
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // ---- MeetingInfo (upsert id=1) ----
  const m = data.meeting || {};
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
  console.log('✅ MeetingInfo synced.');

  // ---- Schedule days/items/talks ----
  if (!opts.force) {
    // Skip if any day already exists (assume migrated)
    const dayCount = await prisma.scheduleDay.count();
    if (dayCount > 0) {
      console.log(`ℹ️  ScheduleDay rows already exist (${dayCount}), skip schedule import.`);
      return { meeting: true, schedule: 0 };
    }
  } else {
    // Force mode: wipe and re-import
    await prisma.talkResource.deleteMany();
    await prisma.talk.deleteMany();
    await prisma.scheduleItem.deleteMany();
    await prisma.scheduleDay.deleteMany();
    console.log('🧹 Force mode: existing schedule cleared.');
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
  console.log(`✅ Schedule: ${dayN} days imported.`);
  return { meeting: true, schedule: dayN };
}

async function migrateAttendees(prisma, opts = {}) {
  const filePath = path.join(DATA_DIR, 'attendees.json');
  if (!fs.existsSync(filePath)) {
    console.warn('⚠️  attendees.json not found, skip.');
    return { attendees: 0, organizations: 0 };
  }

  if (!opts.force) {
    const existing = await prisma.attendee.count();
    if (existing > 0) {
      console.log(`ℹ️  Attendee rows already exist (${existing}), skip attendees import.`);
      // Even if attendees exist, still try to sync organizations from JSON
      const orgs = await syncOrganizations(prisma, JSON.parse(fs.readFileSync(filePath, 'utf-8')));
      return { attendees: 0, organizations: orgs };
    }
  } else {
    await prisma.attendee.deleteMany();
    console.log('🧹 Force mode: existing attendees cleared.');
  }

  const list = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let n = 0;
  for (const a of list) {
    await prisma.attendee.create({
      data: {
        no: a.no || null,
        nameEn: a.nameEn || null,
        nameCn: a.nameCn || null,
        email: a.email || null,
        photoUrl: a.photoUrl || null,
        school: a.school || 'Other',
        department: 'IT', // 当前仅 IT 部门数据
        sortOrder: a.no || 0,
      },
    });
    n++;
  }
  console.log(`✅ Attendees: ${n} imported (department=IT).`);

  const orgs = await syncOrganizations(prisma, list);
  return { attendees: n, organizations: orgs };
}

function defaultOrgColor(code) {
  const upper = (code || '').toUpperCase();
  if (upper.includes('YCIS')) return '#ff0044';
  if (upper.includes('YWIES') || upper.includes('YWAD')) return '#ff8200';
  return '#0032a0';
}

async function syncOrganizations(prisma, list) {
  const schools = Array.from(new Set(list.map((a) => a.school).filter(Boolean)));
  for (let i = 0; i < schools.length; i++) {
    const code = schools[i];
    await prisma.organization.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: code,
        category: code === 'CTO' ? 'headquarter' : 'school',
        color: defaultOrgColor(code),
        sortOrder: i,
      },
    });
  }
  console.log(`✅ Organizations: ${schools.length} synced.`);
  return schools.length;
}

/**
 * Public function used by seed.js (and the admin import-static endpoints).
 * Accepts an existing PrismaClient to avoid opening multiple connections.
 *
 * @param {PrismaClient} prisma
 * @param {{ force?: boolean, what?: 'all'|'schedule'|'attendees' }} opts
 */
async function runMigration(prisma, opts = {}) {
  const what = opts.what || 'all';
  const result = { schedule: null, attendees: null };
  if (what === 'all' || what === 'schedule') {
    result.schedule = await migrateMeetingAndSchedule(prisma, opts);
  }
  if (what === 'all' || what === 'attendees') {
    result.attendees = await migrateAttendees(prisma, opts);
  }
  return result;
}

// ---- CLI entry-point ----
async function main() {
  console.log('🚚  Migrating static JSON → DB ...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await runMigration(prisma);
    console.log('🎉  Migration finished.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { runMigration, migrateMeetingAndSchedule, migrateAttendees };
