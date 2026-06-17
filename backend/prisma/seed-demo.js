/**
 * Demo data seeder for Reflections & Gallery pages.
 *
 * Inserts ~10 sample reflections with comments and likes,
 * and ~16 gallery items with placeholder images of various dimensions.
 * All demo records have titles prefixed with [DEMO] for easy cleanup.
 *
 * Run standalone:  node prisma/seed-demo.js
 * Or via npm:      npm run db:seed-demo
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEMO_PREFIX = '[DEMO] ';

/** Sample reflections -------------------------------------------------- */
const REFLECTIONS = [
  {
    title: 'AI Coding 实践心得',
    content:
      '这次会议中关于 AI 辅助编程的分享让我大开眼界。用 Cursor / Copilot 写代码的效率提升非常明显，但更重要的是学会了如何写好 Prompt、如何做 Code Review。\n\n回去后打算在团队内部做一次 AI Coding Workshop，把这些经验传递给更多同事。',
  },
  {
    title: 'Veeam 部署方案太实用了',
    content:
      '之前一直在纠结备份方案的选型，这次听了 Veeam 安装部署的实战分享，终于有了清晰的落地路径。特别是增量备份 + 异地容灾的组合方案，既省空间又安全。\n\n已经把部署文档整理好了，准备下周就开始试点。',
  },
  {
    title: '参观 ClassIN 的启发',
    content:
      'ClassIN 的技术架构和产品设计给了我很多启发。特别是他们在音视频传输方面的优化策略，低延迟 + 高并发的方案值得我们借鉴。\n\n另外他们的办公环境也很棒，开放式工位 + 安静区域的结合很合理。',
  },
  {
    title: 'Dify Agent 的无限可能',
    content:
      '低代码搭建 AI Agent 的 demo 真的让人兴奋！用 Dify 可以快速构建校园问答机器人、IT 工单助手等场景。\n\n我已经在本地跑通了一个 FAQ Bot 的原型，接下来计划接入学校的知识库做内部测试。',
  },
  {
    title: '跨校区 IT 协作的思考',
    content:
      '和各校区的同事交流后发现，很多问题其实大家都在重复踩坑。如果能建立一个共享的技术知识库和定期的线上技术沙龙，应该能大幅减少重复劳动。\n\n建议明年可以搞一个"IT 技术共享平台"，让各校区的最佳实践能够流转起来。',
  },
  {
    title: 'AI 合规与数据安全不容忽视',
    content:
      '在享受 AI 带来便利的同时，合规和数据安全是我们必须重视的底线。会上关于教育行业 AI 使用边界的讨论非常及时。\n\n尤其是学生数据的使用规范、模型训练数据的脱敏处理，这些都需要建立明确的制度。',
  },
  {
    title: 'Mosyle Manager 部署经验分享',
    content:
      '我们学校有 500+ 台 iPad 需要管理，之前一直用手动方式，效率低还容易出错。Mosyle Manager 的零接触部署方案完美解决了这个痛点。\n\n特别是应用分发和设备锁定策略，节省了大量的人力。推荐所有还在手动管理苹果设备的学校尽快上线。',
  },
  {
    title: '图书馆系统的未来方向',
    content:
      '数字化图书馆建设不仅仅是把纸质书搬到线上，更重要的是构建智能化的知识服务体系。会上讨论的 AI 推荐、智能检索等功能很有前景。\n\n期待能和各校区一起推动图书馆系统的统一升级。',
  },
  {
    title: '团队建设活动真赞 🎉',
    content:
      '不得不说这次的团队晚餐和 Team Building 活动安排得太棒了！大家平时都在线上交流，面对面聊天的感觉完全不一样。\n\n很多技术问题在饭桌上三言两语就解决了，这就是线下会议的魅力吧。感谢组织者的用心安排！',
  },
  {
    title: '期待明年再聚 🚀',
    content:
      '三天的会议转瞬即逝，收获满满。从技术分享到团队协作，从 AI 前沿到日常运维，每个议题都干货十足。\n\n最大的感受是：我们不是一个人在战斗，全球各校区的 IT 同仁都是彼此最好的资源。\n\n明年见！💪',
  },
];

/** Sample comments ----------------------------------------------------- */
const COMMENTS_MAP = {
  0: [
    { content: '同感！我也在试用 Cursor，写 Vue 组件效率翻倍了', anon: false },
    { content: '能分享一下你们团队的 Prompt 模板吗？', anon: false },
  ],
  1: [
    { content: '我们已经在用 Veeam 了，稳定性确实很好', anon: false },
  ],
  3: [
    { content: 'Dify 的工作流设计器太好用了，拖拽就能搭', anon: false },
    { content: '请问接入微信的方案成熟吗？', anon: false },
    { content: '我也在研究，有兴趣可以拉个群一起交流', anon: true },
  ],
  4: [
    { content: '支持！知识库 + 技术沙龙的想法很好', anon: false },
  ],
  8: [
    { content: '饭桌上解决技术问题 +1 哈哈哈', anon: false },
    { content: '烤鸭太好吃了 🦆', anon: true },
  ],
  9: [
    { content: '明年见！希望能去一个没去过的城市', anon: false },
    { content: '收获满满，感谢所有分享者！', anon: false },
  ],
};

async function seedDemo() {
  console.log('🎭  Seeding demo reflections...');

  // Check if demo data already exists
  const existing = await prisma.reflection.findFirst({
    where: { title: { startsWith: DEMO_PREFIX } },
  });
  if (existing) {
    console.log('⚠️  Demo data already exists. Run clean-demo.js first if you want to re-seed.');
    return;
  }

  // Get attendee users to use as authors
  const users = await prisma.user.findMany({
    where: { isAttendee: true },
    take: 20,
  });

  if (users.length < 2) {
    console.log('❌  Not enough attendee users. Run seed.js first.');
    return;
  }

  // Insert reflections
  for (let i = 0; i < REFLECTIONS.length; i++) {
    const r = REFLECTIONS[i];
    const author = users[i % users.length];

    const reflection = await prisma.reflection.create({
      data: {
        title: DEMO_PREFIX + r.title,
        content: r.content,
        authorId: author.id,
        isAnonymous: i === 8, // one anonymous post
        likeCount: 0,
      },
    });

    // Add comments
    const comments = COMMENTS_MAP[i] || [];
    for (let j = 0; j < comments.length; j++) {
      const commentAuthor = users[(i + j + 3) % users.length]; // different author
      await prisma.comment.create({
        data: {
          content: comments[j].content,
          reflectionId: reflection.id,
          authorId: commentAuthor.id,
          isAnonymous: comments[j].anon,
        },
      });
    }

    // Add some likes (random subset of users)
    const likeCount = Math.floor(Math.random() * Math.min(6, users.length)) + 1;
    const likers = shuffleArray([...users]).slice(0, likeCount);
    for (const liker of likers) {
      await prisma.like.create({
        data: {
          userId: liker.id,
          reflectionId: reflection.id,
        },
      });
    }

    // Update likeCount
    await prisma.reflection.update({
      where: { id: reflection.id },
      data: { likeCount },
    });
  }

  console.log(`✅  ${REFLECTIONS.length} demo reflections created with comments and likes.`);
}

/** Sample gallery items ------------------------------------------------ */
const GALLERY_ITEMS = [
  { title: '开幕致辞全景',       w: 1600, h: 900,  tags: ['开幕致辞'] },
  { title: '嘉宾签到',           w: 800,  h: 600,  tags: ['开幕致辞', '茶歇花絮'] },
  { title: 'AI Workshop 实况',   w: 1200, h: 800,  tags: ['AI 应用', 'AI Coding'] },
  { title: 'Dify Agent 演示',    w: 800,  h: 800,  tags: ['Dify Agent'] },
  { title: '分组讨论',           w: 600,  h: 800,  tags: ['技术讲座'] },
  { title: 'Veeam 部署实操',     w: 1200, h: 800,  tags: ['Veeam 安装部署'] },
  { title: 'ClassIN 参观合影',   w: 1600, h: 900,  tags: ['参观 ClassIN'] },
  { title: '团队晚餐',           w: 800,  h: 600,  tags: ['团队晚餐'] },
  { title: '北京夜景',           w: 1200, h: 800,  tags: ['茶歇花絮'] },
  { title: 'AI 合规讲座',        w: 800,  h: 600,  tags: ['AI 合规', '技术讲座'] },
  { title: '图书馆系统演示',     w: 600,  h: 800,  tags: ['图书馆系统'] },
  { title: 'Mosyle 移动端管理',  w: 800,  h: 1200, tags: ['Mosyle Manager'] },
  { title: '茶歇交流',           w: 800,  h: 800,  tags: ['茶歇花絮'] },
  { title: '用友答疑环节',       w: 1200, h: 800,  tags: ['用友答疑'] },
  { title: '学校参访留影',       w: 1600, h: 900,  tags: ['学校参访'] },
  { title: '总结大会',           w: 1200, h: 800,  tags: ['总结', 'IT Roadmap'] },
  { title: 'AI 攻防演练',        w: 800,  h: 600,  tags: ['AI 攻防', 'AI 应用'] },
  { title: '后勤联合讲座现场',   w: 1200, h: 800,  tags: ['后勤联合讲座'] },
  { title: '颁奖瞬间',           w: 600,  h: 600,  tags: ['总结'] },
  { title: '合影留念',           w: 1600, h: 900,  tags: ['总结', '茶歇花絮'] },
  // Video items
  { title: 'AI Coding 现场演示',  type: 'video', fileUrl: 'http://mpv.videocc.net/4b964bbdf4/4/4b964bbdf40084eb52861382a60b0d34_2.mp4', tags: ['AI Coding', 'AI 应用'] },
  { title: '团队晚餐花絮',        type: 'video', fileUrl: 'https://osswebsite.ycyw.com/ycis-bj/video/videos/ycis-bj-30th-anniversary-brand-video.mp4', tags: ['团队晚餐', '茶歇花絮'] },
  { title: '学校参访 Vlog',       type: 'video', fileUrl: 'https://object.ycyw.com/media-library/shared/corp-video-for-homepage.mp4', tags: ['学校参访'] },
  // Link item (腾讯视频 iframe 嵌入)
  { title: '2026 IT 大会回顾', type: 'link', videoLink: 'https://v.qq.com/x/page/k33706g6chd.html', tags: ['总结'] },
];

async function seedGalleryDemo() {
  console.log('🎭  Seeding demo gallery items...');

  // Check if gallery demo data already exists
  const existing = await prisma.galleryItem.findFirst({
    where: { title: { startsWith: DEMO_PREFIX } },
  });
  if (existing) {
    console.log('⚠️  Gallery demo data already exists. Run clean-demo.js first if you want to re-seed.');
    return;
  }

  // Get attendee users to use as uploaders
  const users = await prisma.user.findMany({
    where: { isAttendee: true },
    take: 20,
  });

  if (users.length < 2) {
    console.log('❌  Not enough attendee users. Run seed.js first.');
    return;
  }

  // Conference dates: 2026-07-14 ~ 2026-07-16
  const baseDates = [
    new Date('2026-07-14T09:00:00+08:00'),
    new Date('2026-07-14T14:30:00+08:00'),
    new Date('2026-07-14T16:00:00+08:00'),
    new Date('2026-07-15T09:30:00+08:00'),
    new Date('2026-07-15T10:45:00+08:00'),
    new Date('2026-07-15T14:00:00+08:00'),
    new Date('2026-07-15T15:30:00+08:00'),
    new Date('2026-07-15T18:30:00+08:00'),
    new Date('2026-07-15T20:00:00+08:00'),
    new Date('2026-07-16T09:00:00+08:00'),
    new Date('2026-07-16T10:30:00+08:00'),
    new Date('2026-07-16T11:00:00+08:00'),
    new Date('2026-07-16T13:30:00+08:00'),
    new Date('2026-07-16T14:30:00+08:00'),
    new Date('2026-07-16T15:00:00+08:00'),
    new Date('2026-07-16T16:00:00+08:00'),
    new Date('2026-07-16T16:30:00+08:00'),
    new Date('2026-07-16T17:00:00+08:00'),
    new Date('2026-07-16T17:15:00+08:00'),
    new Date('2026-07-16T17:30:00+08:00'),
    // Extra dates for video / link items (appear near the top when sorted desc)
    new Date('2026-07-16T17:45:00+08:00'),
    new Date('2026-07-16T18:00:00+08:00'),
    new Date('2026-07-16T18:15:00+08:00'),
    new Date('2026-07-16T18:30:00+08:00'),
  ];

  for (let i = 0; i < GALLERY_ITEMS.length; i++) {
    const item = GALLERY_ITEMS[i];
    const uploader = users[i % users.length];
    const createdAt = baseDates[i % baseDates.length] || new Date();

    const itemType = item.type || 'image';

    // Determine fileUrl and videoLink based on type
    let fileUrl = '';
    let videoLink = null;

    if (itemType === 'image') {
      // Use picsum.photos for placeholder images with different dimensions
      fileUrl = `https://picsum.photos/seed/demo${i + 1}/${item.w}/${item.h}`;
    } else if (itemType === 'video') {
      fileUrl = item.fileUrl;
    } else if (itemType === 'link') {
      videoLink = item.videoLink;
    }

    await prisma.galleryItem.create({
      data: {
        title: DEMO_PREFIX + item.title,
        type: itemType,
        fileUrl,
        videoLink,
        tags: JSON.stringify(item.tags),
        uploaderId: uploader.id,
        createdAt,
      },
    });
  }

  console.log(`✅  ${GALLERY_ITEMS.length} demo gallery items created.`);
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Allow both standalone execution and import
if (require.main === module) {
  (async () => {
    await seedDemo();
    await seedGalleryDemo();
  })()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedDemo, seedGalleryDemo };
