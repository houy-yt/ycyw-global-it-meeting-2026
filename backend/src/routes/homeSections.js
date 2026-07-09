/**
 * Home Sections CRUD (admin) + public endpoint
 *
 * Public:
 *   GET /api/home-sections          — visible sections with cards, sorted
 *
 * Admin:
 *   GET    /api/admin/home-sections
 *   POST   /api/admin/home-sections
 *   PUT    /api/admin/home-sections/:id
 *   DELETE /api/admin/home-sections/:id
 *   PUT    /api/admin/home-sections/reorder          — batch reorder sections
 *   POST   /api/admin/home-sections/:id/cards        — add card
 *   PUT    /api/admin/home-sections/cards/:cardId     — update card
 *   DELETE /api/admin/home-sections/cards/:cardId     — delete card
 *   PUT    /api/admin/home-sections/:id/cards/reorder — batch reorder cards
 *   POST   /api/admin/home-sections/seed-defaults     — seed hardcoded data
 */
const express = require('express');
const prisma = require('../utils/prisma');
const { authRequired, adminRequired } = require('../middleware/auth');

// ─────────── Default data (migrated from HomeView.vue hardcoded arrays) ───────────
const DEFAULT_SECTIONS = [
  // ── Intro: 关于会议 (content managed via Meeting Settings, not editable here) ──
  {
    key: 'intro',
    sectionType: 'intro',
    chipLabel: '关于会议',
    title: '关于本次会议',
    description: '',
    sortOrder: -1,
    cards: [],
  },
  {
    key: 'conference-theme',
    chipLabel: 'Conference Theme',
    title: 'Connect · Innovate · Empower',
    description: 'AI 时代的教育 IT 进化 —— 在耀中耀华全球网络中，让技术成为学习的杠杆，让基础设施成为信任的底座，让数据成为决策的语言。',
    sortOrder: 0,
    cards: [
      {
        icon: 'robot',
        iconColor: '#0032a0',
        title: 'AI for Education',
        subtitle: 'Connect Learning',
        content: '把生成式 AI 落地到课堂、教务、家校沟通——让技术服务于"以学生为中心"的教育。',
        sortOrder: 0,
      },
      {
        icon: 'shield-halved',
        iconColor: '#ff0044',
        title: 'Secure & Compliant',
        subtitle: 'Innovate Safely',
        content: '零信任、身份治理、数据保护与隐私合规——为每一份数据守住底线。',
        sortOrder: 1,
      },
      {
        icon: 'globe',
        iconColor: '#ff8200',
        title: 'One Global Network',
        subtitle: 'Empower Together',
        content: '统一身份、统一基础设施、跨校协同——19 所学校如同一所学校。',
        sortOrder: 2,
      },
    ],
  },
  {
    key: 'tracks',
    chipLabel: '议题轨道 · Tracks',
    title: '本届聚焦的六大 IT 议题',
    description: '从课堂的 AI 助手，到机房的零信任；从数据治理，到云原生 —— 一次会议，覆盖你正在解决的所有问题。',
    sortOrder: 1,
    cards: [
      {
        icon: 'wand-magic-sparkles',
        iconColor: '#0032a0',
        title: 'AI Copilot 在教学场景的落地',
        subtitle: '',
        content: '从备课、出题、批改到家长沟通，让 AI 成为每位老师的助手。',
        sortOrder: 0,
      },
      {
        icon: 'lock',
        iconColor: '#001e60',
        title: '网络与终端的零信任架构',
        subtitle: '',
        content: 'Entra / Intune / 条件访问 / Microsegmentation 实战。',
        sortOrder: 1,
      },
      {
        icon: 'chart-bar',
        iconColor: '#ff8200',
        title: '数据治理与隐私合规',
        subtitle: '',
        content: '统一数据底座、跨境合规、学生数据保护机制。',
        sortOrder: 2,
      },
      {
        icon: 'cloud',
        iconColor: '#ff0044',
        title: '基础设施现代化',
        subtitle: '',
        content: '云原生、边缘、SD-WAN、Wi-Fi 6/7、教室智能化升级。',
        sortOrder: 3,
      },
      {
        icon: 'id-card',
        iconColor: '#1f6feb',
        title: '统一身份与单点登录',
        subtitle: '',
        content: 'OIDC / SAML / SCIM 在全球网络中的标准化。',
        sortOrder: 4,
      },
      {
        icon: 'gears',
        iconColor: '#3a8a4d',
        title: 'DevOps & 自动化运维',
        subtitle: '',
        content: 'IaC、监控告警、AIOps 让 IT 团队从重复劳动中解脱。',
        sortOrder: 5,
      },
    ],
  },
  // ── Quick Nav: 快捷入口 ──
  {
    key: 'quick-nav',
    chipLabel: '快捷入口',
    title: '直达你想去的地方',
    description: '',
    sortOrder: 2,
    cards: [
      {
        icon: 'calendar-days',
        iconColor: '#0032a0',
        title: '日程安排',
        subtitle: '/schedule',
        content: '四天行程一目了然',
        sortOrder: 0,
      },
      {
        icon: 'users',
        iconColor: '#001e60',
        title: '参会人员',
        subtitle: '/attendees',
        content: '57+ 同仁，19 所学校',
        sortOrder: 1,
      },
      {
        icon: 'pen-to-square',
        iconColor: '#ff8200',
        title: '会后反思',
        subtitle: '/reflections',
        content: '记录所学所思',
        sortOrder: 2,
      },
      {
        icon: 'camera',
        iconColor: '#ff0044',
        title: '会议剪影',
        subtitle: '/gallery',
        content: '照片 · 视频 · 回忆',
        sortOrder: 3,
      },
    ],
  },
  // ── Tech Stack: 技术栈 ──
  {
    key: 'tech-stack',
    chipLabel: 'Tech & Tools at YCYW',
    title: '我们正在用、即将用的技术',
    description: '从云到端、从生产力到智能，下面是支撑 YCYW 全球 IT 的代表性平台与工具。',
    sortOrder: 3,
    cards: [
      {
        icon: 'building',
        iconColor: '#0032a0',
        title: 'Productivity & Identity',
        subtitle: '日常协作与身份基础',
        content: 'Microsoft 365, Entra ID, Intune, Defender, SharePoint, Teams',
        sortOrder: 0,
      },
      {
        icon: 'screwdriver-wrench',
        iconColor: '#001e60',
        title: 'DevOps & Code',
        subtitle: '工程化与协作',
        content: 'GitHub, Azure DevOps, Bicep, Terraform, GitHub Actions',
        sortOrder: 1,
      },
      {
        icon: 'chart-line',
        iconColor: '#ff8200',
        title: 'Data & Analytics',
        subtitle: '一个学校的数据底座',
        content: 'Power BI, Microsoft Fabric, Synapse, Dataverse, SQL',
        sortOrder: 2,
      },
      {
        icon: 'globe',
        iconColor: '#ff0044',
        title: 'Network & Security',
        subtitle: '稳健的连接与防御',
        content: 'Cisco Meraki, Fortinet, Aruba, Zscaler, CrowdStrike',
        sortOrder: 3,
      },
      {
        icon: 'robot',
        iconColor: '#7c3aed',
        title: 'AI & Education',
        subtitle: '面向未来的教与学',
        content: 'Azure OpenAI, AI Foundry, Copilot, Copilot Studio, Whisper',
        sortOrder: 4,
      },
    ],
  },
  // ── Team Manifesto: 团队宣言 ──
  {
    key: 'team-manifesto',
    sectionType: 'statement',
    chipLabel: '团队宣言',
    title: '我们既是技术的工程师，也是教育的同行者。借助 IT 这把杠杆，让全球每一位耀中耀华师生都能享受到顺畅、安全、智能的数字校园。',
    description: '— YCYW Global IT Team',
    sortOrder: 4,
    cards: [],
  },
  // ── Announcement: 公告 ──
  {
    key: 'announcement',
    sectionType: 'announcement',
    chipLabel: '最新公告',
    title: '公告',
    description: '',
    sortOrder: 5,
    cards: [],
  },
  // ── Stats: 数字一览 (content auto-generated, not editable) ──
  {
    key: 'stats',
    sectionType: 'stats',
    chipLabel: '数字一览',
    title: 'By the Numbers',
    description: '',
    sortOrder: 6,
    cards: [],
  },
];

// ─────────── Public router ───────────
const publicRouter = express.Router();

publicRouter.get('/', async (req, res) => {
  try {
    const sections = await prisma.homeSection.findMany({
      where: { visible: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        cards: { orderBy: { sortOrder: 'asc' } },
      },
    });

    // Fallback to defaults when DB is empty
    if (sections.length === 0) {
      return res.json(
        DEFAULT_SECTIONS.map((s, si) => ({
          id: si + 1,
          ...s,
          visible: true,
          cards: s.cards.map((c, ci) => ({ id: ci + 1, sectionId: si + 1, ...c })),
        }))
      );
    }

    res.json(sections);
  } catch (e) {
    console.error('[home-sections] error', e);
    res.status(500).json({ message: 'Failed to load home sections' });
  }
});

// ─────────── Admin router ───────────
const adminRouter = express.Router();

// List all sections (including hidden)
adminRouter.get('/', authRequired, adminRequired, async (req, res) => {
  try {
    const sections = await prisma.homeSection.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        cards: { orderBy: { sortOrder: 'asc' } },
      },
    });
    res.json(sections);
  } catch (e) {
    console.error('[admin home-sections GET]', e);
    res.status(500).json({ message: e.message });
  }
});

// Create section
adminRouter.post('/', authRequired, adminRequired, async (req, res) => {
  const { key, sectionType, chipLabel, title, description, visible, sortOrder, bgColor, borderTop, borderBottom } = req.body || {};
  if (!key) return res.status(400).json({ message: 'key is required' });
  try {
    const section = await prisma.homeSection.create({
      data: {
        key: String(key),
        sectionType: sectionType || 'cards',
        chipLabel: chipLabel || '',
        title: title || '',
        description: description || '',
        visible: visible !== false,
        sortOrder: Number(sortOrder) || 0,
        bgColor: bgColor || '',
        borderTop: borderTop === true,
        borderBottom: borderBottom === true,
      },
    });
    res.status(201).json(section);
  } catch (e) {
    if (String(e.message).includes('Unique constraint')) {
      return res.status(409).json({ message: `Key "${key}" already exists` });
    }
    res.status(500).json({ message: e.message });
  }
});

// Batch reorder sections (must be before /:id)
adminRouter.put('/reorder', authRequired, adminRequired, async (req, res) => {
  const { orders } = req.body || {};
  if (!Array.isArray(orders)) return res.status(400).json({ message: 'orders array required' });
  try {
    await Promise.all(
      orders.map(({ id, sortOrder }) =>
        prisma.homeSection.update({ where: { id: Number(id) }, data: { sortOrder: Number(sortOrder) } })
      )
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Seed defaults
adminRouter.post('/seed-defaults', authRequired, adminRequired, async (req, res) => {
  try {
    let created = 0;
    for (const s of DEFAULT_SECTIONS) {
      const exists = await prisma.homeSection.findUnique({ where: { key: s.key } });
      if (!exists) {
        await prisma.homeSection.create({
          data: {
            key: s.key,
            sectionType: s.sectionType || 'cards',
            chipLabel: s.chipLabel,
            title: s.title,
            description: s.description,
            sortOrder: s.sortOrder,
            visible: true,
            cards: {
              create: s.cards.map((c) => ({
                icon: c.icon,
                iconColor: c.iconColor,
                title: c.title,
                subtitle: c.subtitle || '',
                content: c.content,
                sortOrder: c.sortOrder,
              })),
            },
          },
        });
        created++;
      }
    }
    res.json({ ok: true, created, total: DEFAULT_SECTIONS.length });
  } catch (e) {
    console.error('[home-sections seed]', e);
    res.status(500).json({ message: e.message });
  }
});

// Update section
adminRouter.put('/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const { key, sectionType, chipLabel, title, description, visible, sortOrder, bgColor, borderTop, borderBottom } = req.body || {};
  try {
    const section = await prisma.homeSection.update({
      where: { id },
      data: {
        ...(key !== undefined ? { key: String(key) } : {}),
        ...(sectionType !== undefined ? { sectionType: String(sectionType) } : {}),
        ...(chipLabel !== undefined ? { chipLabel: String(chipLabel) } : {}),
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(description !== undefined ? { description: String(description) } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
        ...(visible !== undefined ? { visible: Boolean(visible) } : {}),
        ...(bgColor !== undefined ? { bgColor: String(bgColor) } : {}),
        ...(borderTop !== undefined ? { borderTop: Boolean(borderTop) } : {}),
        ...(borderBottom !== undefined ? { borderBottom: Boolean(borderBottom) } : {}),
      },
    });
    res.json(section);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ message: 'Not found' });
    res.status(500).json({ message: e.message });
  }
});

// Delete section
adminRouter.delete('/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.homeSection.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

// ─── Cards ───

// Add card to section
adminRouter.post('/:id/cards', authRequired, adminRequired, async (req, res) => {
  const sectionId = Number(req.params.id);
  const { icon, iconColor, imageUrl, title, subtitle, content, sortOrder } = req.body || {};
  try {
    const card = await prisma.homeSectionCard.create({
      data: {
        sectionId,
        icon: icon || '',
        iconColor: iconColor || '#0032a0',
        imageUrl: imageUrl || null,
        title: title || '',
        subtitle: subtitle || '',
        content: content || '',
        sortOrder: Number(sortOrder) || 0,
      },
    });
    res.status(201).json(card);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Reorder cards in a section
adminRouter.put('/:id/cards/reorder', authRequired, adminRequired, async (req, res) => {
  const { orders } = req.body || {};
  if (!Array.isArray(orders)) return res.status(400).json({ message: 'orders array required' });
  try {
    await Promise.all(
      orders.map(({ id, sortOrder }) =>
        prisma.homeSectionCard.update({ where: { id: Number(id) }, data: { sortOrder: Number(sortOrder) } })
      )
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Update card
adminRouter.put('/cards/:cardId', authRequired, adminRequired, async (req, res) => {
  const cardId = Number(req.params.cardId);
  const { icon, iconColor, imageUrl, title, subtitle, content, sortOrder } = req.body || {};
  try {
    const card = await prisma.homeSectionCard.update({
      where: { id: cardId },
      data: {
        ...(icon !== undefined ? { icon } : {}),
        ...(iconColor !== undefined ? { iconColor } : {}),
        ...(imageUrl !== undefined ? { imageUrl: imageUrl || null } : {}),
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(subtitle !== undefined ? { subtitle: String(subtitle) } : {}),
        ...(content !== undefined ? { content: String(content) } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
      },
    });
    res.json(card);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ message: 'Not found' });
    res.status(500).json({ message: e.message });
  }
});

// Delete card
adminRouter.delete('/cards/:cardId', authRequired, adminRequired, async (req, res) => {
  const cardId = Number(req.params.cardId);
  try {
    await prisma.homeSectionCard.delete({ where: { id: cardId } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

module.exports = { publicRouter, adminRouter };
