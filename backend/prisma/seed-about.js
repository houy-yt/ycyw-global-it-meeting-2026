/**
 * Seed script: populate aboutTitle & aboutContent in MeetingInfo (id=1)
 * Run: node prisma/seed-about.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const aboutTitle = '关于本次会议';

const aboutContent = `<h2>三天的 IT 同仁聚会</h2>
<p>YCYW Global IT Meeting 是耀中耀华教育旗下各校 IT 团队一年一度的盛会。围绕 AI 应用、安全合规、教育科技与基础设施，我们一起回顾、思考、并定义未来一年的方向。</p>`;

async function main() {
  const result = await prisma.meetingInfo.update({
    where: { id: 1 },
    data: { aboutTitle, aboutContent },
  });
  console.log('✅ Updated MeetingInfo aboutTitle & aboutContent');
  console.log('   aboutTitle:', result.aboutTitle);
  console.log('   aboutContent length:', result.aboutContent?.length, 'chars');
}

main()
  .catch((e) => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
