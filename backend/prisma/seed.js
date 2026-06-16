/**
 * Seed script for YCYW 2026 Global IT Meeting.
 *
 * Inserts:
 *  - Users (from data/attendees.json) with isAttendee=true
 *  - Admin users from process.env.ADMIN_EMAILS
 *  - Preset tags
 *  - Past meetings (example: 2024, 2025)
 *  - One active welcome announcement
 *
 * Run:  npm run db:seed
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

/**
 * Build a stable mock email from an attendee record.
 * Rule:
 *   - Has English name -> lowercase + remove spaces  + "@ycyw-edu.com"
 *   - Otherwise        -> "user<no>@ycyw-edu.com"
 */
function buildEmail(att) {
  const en = (att.nameEn || '').trim();
  if (en) {
    const slug = en.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (slug) return `${slug}@ycyw-edu.com`;
  }
  return `user${att.no}@ycyw-edu.com`;
}

function buildNickname(att) {
  if (att.nameEn && att.nameCn) return `${att.nameEn} ${att.nameCn}`;
  return att.nameEn || att.nameCn || `User ${att.no}`;
}

async function main() {
  console.log('🌱  Seeding database...');

  // -------- Admin emails from .env --------
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // -------- 1. Attendees --------
  const attendeesPath = path.join(__dirname, '..', 'data', 'attendees.json');
  const attendees = JSON.parse(fs.readFileSync(attendeesPath, 'utf-8'));

  for (const att of attendees) {
    const email = buildEmail(att);
    const nickname = buildNickname(att);
    const isAdmin = adminEmails.includes(email.toLowerCase());

    await prisma.user.upsert({
      where: { email },
      update: { nickname, isAttendee: true, isAdmin: isAdmin || undefined },
      create: {
        email,
        nickname,
        isAttendee: true,
        isAdmin,
      },
    });
  }

  // Also ensure all ADMIN_EMAILS are present (even if not in attendees list).
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

  console.log(`✅ Users: ${attendees.length} attendees + admin emails synced.`);

  // -------- 2. Preset Tags --------
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

  // -------- 3. Past Meetings --------
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

  // -------- 4. Announcement --------
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
