/**
 * Seed script for YCYW 2026 Global IT Meeting.
 *
 * Inserts:
 *  - Users (from data/attendees.json) with isAttendee=true
 *  - Admin users from process.env.ADMIN_EMAILS
 *  - Preset tags
 *  - Past meetings (example: 2024, 2025)
 *  - One active welcome announcement
 *  - Departments (IT / Logistics / HRD / FAD / CMD)
 *  - Default SystemSettings (upload limits, sentiment engine)
 *  - Triggers data migration (schedule + attendees → DB) on first run
 *
 * Run:  npm run db:seed
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

/**
 * Get the email for an attendee record.
 * Uses the real email from attendees.json if available,
 * otherwise falls back to a generated placeholder.
 */
function getEmail(att) {
  if (att.email && att.email.trim()) {
    return att.email.trim().toLowerCase();
  }
  // Fallback for attendees without email in the list
  const en = (att.nameEn || '').trim();
  if (en) {
    const slug = en.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (slug) return `${slug}@ycyw-edu.com`;
  }
  return `user${att.no}@ycyw-edu.com`;
}

function buildNickname(att) {
  // Prefer English name for display in NavBar, comments and lists.
  return att.nameEn || att.nameCn || `User ${att.no}`;
}

async function seedUsersFromAttendeeJson() {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const attendeesPath = path.join(__dirname, '..', 'data', 'attendees.json');
  if (!fs.existsSync(attendeesPath)) {
    console.warn('⚠️  attendees.json not found, skip user import.');
    return;
  }
  const attendees = JSON.parse(fs.readFileSync(attendeesPath, 'utf-8'));

  for (const att of attendees) {
    const email = getEmail(att);
    const nickname = buildNickname(att);
    const isAdmin = adminEmails.includes(email.toLowerCase());

    await prisma.user.upsert({
      where: { email },
      // Always overwrite nickname to keep User.nickname in sync with Attendee.nameEn
      update: { nickname, isAttendee: true, isAdmin: isAdmin || undefined },
      create: {
        email,
        nickname,
        isAttendee: true,
        isAdmin,
      },
    });
  }

  for (const email of adminEmails) {
    await prisma.user.upsert({
      where: { email },
      update: { isAdmin: true },
      create: {
        email,
        nickname: email.split('@')[0],
        isAttendee: false,
        isAdmin: true,
      },
    });
  }
  console.log(`✅ Users: ${attendees.length} attendees + admin emails synced (nickname uses English name).`);
}

/**
 * Sync User.nickname to Attendee.nameEn for any users whose Attendee record
 * exists in the DB (covers historical OIDC-created users whose nickname was
 * filled with Chinese name from OIDC userinfo.name).
 */
async function syncNicknamesFromAttendeeTable() {
  const list = await prisma.attendee.findMany({ where: { isActive: true } });
  let synced = 0;
  for (const att of list) {
    if (!att.email || !att.nameEn) continue;
    const email = att.email.toLowerCase();
    const u = await prisma.user.findUnique({ where: { email } });
    if (u && u.nickname !== att.nameEn) {
      await prisma.user.update({ where: { id: u.id }, data: { nickname: att.nameEn } });
      synced++;
    }
  }
  if (synced > 0) console.log(`✅ Nicknames synced to English for ${synced} existing user(s).`);
}

async function seedDepartments() {
  const list = [
    { code: 'IT',        name: 'IT',        nameCn: 'IT 部门',  color: '#0032a0', sortOrder: 1 },
    { code: 'Logistics', name: 'Logistics', nameCn: '后勤部',   color: '#ff8200', sortOrder: 2 },
    { code: 'HRD',       name: 'HRD',       nameCn: '人事部',   color: '#7c3aed', sortOrder: 3 },
    { code: 'FAD',       name: 'FAD',       nameCn: '财务部',   color: '#3a8a4d', sortOrder: 4 },
    { code: 'CMD',       name: 'CMD',       nameCn: '工程维保', color: '#ff0044', sortOrder: 5 },
  ];
  for (const d of list) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, nameCn: d.nameCn, color: d.color, sortOrder: d.sortOrder },
      create: d,
    });
  }
  console.log(`✅ Departments: ${list.length} synced.`);
}

async function seedSystemSettings() {
  const defaults = [
    // ---- Upload limits (MB) ----
    { key: 'upload.maxImageMB',     value: '10',   category: 'upload' },
    { key: 'upload.maxVideoMB',     value: '100',  category: 'upload' },
    { key: 'upload.maxResourceMB',  value: '100',  category: 'upload' },
    // ---- Analytics / Sentiment ----
    { key: 'analytics.sentimentEngine', value: 'local',  category: 'analytics' }, // local | openai | deepseek
    { key: 'analytics.llmApiKey',       value: '',       category: 'analytics' },
    { key: 'analytics.llmBaseUrl',      value: '',       category: 'analytics' },
    { key: 'analytics.llmModel',        value: '',       category: 'analytics' },
  ];
  for (const s of defaults) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {}, // do not overwrite admin edits on re-seed
      create: s,
    });
  }
  console.log(`✅ SystemSettings: ${defaults.length} defaults synced.`);
}

async function seedPresetTags() {
  const tags = [
    '开幕致辞',
    'IT Roadmap',
    'AI 应用',
    'AI Coding',
    'Dify Agent',
    'Veeam 安装部署',
    '参观 ClassIN',
    '团队晚餐',
    '学校参访',
    '技术讲座',
    '后勤联合讲座',
    '图书馆系统',
    'Mosyle Manager',
    'AI 攻防',
    '用友答疑',
    'AI 合规',
    '总结',
    '茶歇花絮',
  ];
  for (const name of tags) {
    await prisma.presetTag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✅ Preset tags: ${tags.length} synced.`);
}

async function seedPastMeetings() {
  const pastMeetings = [
    {
      year: 2024,
      title: 'YCYW 2024 Global IT Meeting',
      location: '上海',
      dateRange: '7月22日 - 24日',
      linkUrl: '',
    },
    {
      year: 2025,
      title: 'YCYW 2025 Global IT Meeting',
      location: '石河子',
      dateRange: '7月8日 - 10日',
      linkUrl: 'https://shihezitour-ltu7pp5b.manus.space/',
    },
  ];
  for (const pm of pastMeetings) {
    await prisma.pastMeeting.upsert({
      where: { year: pm.year },
      update: pm,
      create: pm,
    });
  }
  console.log(`✅ Past meetings: ${pastMeetings.length} synced.`);
}

async function seedAnnouncement() {
  const activeCount = await prisma.announcement.count({ where: { isActive: true } });
  if (activeCount === 0) {
    await prisma.announcement.create({
      data: {
        content:
          '欢迎参加 YCYW 2026 Global IT Meeting！会议将于 7 月 14 日 - 16 日在北京举行，期待与您相见。',
        isActive: true,
      },
    });
    console.log('✅ Default announcement created.');
  }
}

/**
 * Migrate static JSON (data/schedule.json & data/attendees.json) into the DB.
 * Idempotent: skips if MeetingInfo / ScheduleDay / Attendee rows already exist.
 * Uses in-process require() to avoid issues with spaces in the project path.
 */
async function migrateStaticData() {
  try {
    const migrator = require('./migrate-static-to-db');
    if (typeof migrator.runMigration === 'function') {
      await migrator.runMigration(prisma);
    } else {
      console.warn('⚠️  migrate-static-to-db.js does not export runMigration; falling back to no-op.');
    }
  } catch (e) {
    console.warn('⚠️  Static migration failed:', e.message);
  }
}

async function main() {
  console.log('🌱  Seeding database...');

  await seedUsersFromAttendeeJson();
  await seedDepartments();
  await seedSystemSettings();
  await seedPresetTags();
  await seedPastMeetings();
  await seedAnnouncement();
  await migrateStaticData();
  await syncNicknamesFromAttendeeTable();

  console.log('🎉 Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
