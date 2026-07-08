/**
 * Meeting Guide CRUD (admin) + public endpoint
 *
 * Public:
 *   GET /api/meeting-guide          — visible items sorted by sortOrder
 *
 * Admin:
 *   GET    /api/admin/meeting-guide
 *   POST   /api/admin/meeting-guide
 *   PUT    /api/admin/meeting-guide/:id
 *   DELETE /api/admin/meeting-guide/:id
 *   POST   /api/admin/meeting-guide/seed-defaults  — insert default cards
 */
const express = require('express');
const prisma = require('../utils/prisma');
const { authRequired, adminRequired } = require('../middleware/auth');

// ─────────── Default cards (fallback & seed) ───────────
const DEFAULT_ITEMS = [
  {
    key: 'hotel',
    icon: 'hotel',
    iconColor: '#0032a0',
    iconBg: 'bg-brand-blue/10',
    title: '住宿安排',
    content: `<p><strong>酒店：</strong>亦庄智选假日酒店</p>
<p><strong>入住时间：</strong>7月12日，14:00 后</p>
<p><strong>退房时间：</strong>退房当日 12:00 前</p>
<p class="info">包含早餐</p>
<div class="warn"><p class="warn-title">费用支付</p><p>离店时烦请先支付酒店费用，开具学校发票，返校后走出差报销流程。如与不同校区同事共用房间的，在离店结账时，请告知酒店工作人员房费需分账结算开票。</p></div>`,
    sortOrder: 0,
    colSpan: 1,
  },
  {
    key: 'transport',
    icon: 'bus',
    iconColor: '#16a34a',
    iconBg: 'bg-green-500/10',
    title: '交通安排',
    content: `<p>7月14日至7月16日，入住酒店的参会者可乘坐北京耀中校车从酒店出发前往会议地点。</p>
<p><strong>发车时间：</strong>上午 8:00 整</p>
<p><strong>上车地点：</strong>酒店大堂外</p>
<p><strong>车牌号：</strong>待定</p>
<p>每日会议结束后，可乘坐校车返回酒店。</p>
<div class="note">7月16日会议结束后，如需直接前往机场或火车站，烦请自行安排交通。</div>`,
    sortOrder: 1,
    colSpan: 1,
  },
  {
    key: 'dining',
    icon: 'utensils',
    iconColor: '#ff8200',
    iconBg: 'bg-brand-orange/10',
    title: '餐饮安排',
    content: `<p>会议期间的午餐将在学校餐厅享用。</p>
<p>酒店住宿含早餐。</p>`,
    sortOrder: 2,
    colSpan: 1,
  },
  {
    key: 'preparation',
    icon: 'clipboard-check',
    iconColor: '#9333ea',
    iconBg: 'bg-purple-500/10',
    title: '准备事项',
    content: `<ul>
<li>请扫二维码填写入校申请，保存好生成的入校码，供进校时使用。</li>
<li>请携带好各校或公司的员工卡，入校时需佩戴。</li>
<li>请携带好手提电脑。</li>
</ul>`,
    sortOrder: 3,
    colSpan: 1,
  },
  {
    key: 'wifi',
    icon: 'wifi',
    iconColor: '#0891b2',
    iconBg: 'bg-cyan-500/10',
    title: 'Wi-Fi 无线网络',
    content: `<p><strong>SSID：</strong><code>YC-Event</code></p>
<p><strong>密码：</strong><em>待现场确认</em></p>`,
    sortOrder: 4,
    colSpan: 2,
  },
];

// ─────────── Public router ───────────
const publicRouter = express.Router();

publicRouter.get('/', async (req, res) => {
  try {
    const items = await prisma.meetingGuideItem.findMany({
      where: { visible: true },
      orderBy: { sortOrder: 'asc' },
    });
    // Fallback to defaults when DB is empty
    if (items.length === 0) {
      return res.json(DEFAULT_ITEMS.map((d, i) => ({ id: i + 1, ...d, visible: true })));
    }
    res.json(items);
  } catch (e) {
    console.error('[meeting-guide] error', e);
    res.status(500).json({ message: 'Failed to load meeting guide' });
  }
});

// ─────────── Admin router ───────────
const adminRouter = express.Router();

adminRouter.get('/', authRequired, adminRequired, async (req, res) => {
  const items = await prisma.meetingGuideItem.findMany({
    orderBy: { sortOrder: 'asc' },
  });
  res.json(items);
});

adminRouter.post('/', authRequired, adminRequired, async (req, res) => {
  const { key, icon, iconColor, iconBg, title, content, sortOrder, colSpan, visible } = req.body || {};
  if (!key || !title) return res.status(400).json({ message: 'key & title required' });
  try {
    const item = await prisma.meetingGuideItem.create({
      data: {
        key: String(key),
        icon: icon || 'circle-info',
        iconColor: iconColor || '#0032a0',
        iconBg: iconBg || 'bg-brand-blue/10',
        title: String(title),
        content: content || '',
        sortOrder: Number(sortOrder) || 0,
        colSpan: Number(colSpan) || 1,
        visible: visible !== false,
      },
    });
    res.status(201).json(item);
  } catch (e) {
    if (String(e.message).includes('Unique constraint')) {
      return res.status(409).json({ message: `Key "${key}" already exists` });
    }
    res.status(500).json({ message: e.message });
  }
});

// Batch reorder (must be before /:id to avoid matching "reorder" as id)
adminRouter.put('/reorder', authRequired, adminRequired, async (req, res) => {
  const { orders } = req.body || {};
  if (!Array.isArray(orders)) return res.status(400).json({ message: 'orders array required' });
  try {
    await Promise.all(
      orders.map(({ id, sortOrder }) =>
        prisma.meetingGuideItem.update({ where: { id: Number(id) }, data: { sortOrder: Number(sortOrder) } })
      )
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

adminRouter.put('/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const { key, icon, iconColor, iconBg, title, content, sortOrder, colSpan, visible } = req.body || {};
  try {
    const item = await prisma.meetingGuideItem.update({
      where: { id },
      data: {
        ...(key !== undefined ? { key: String(key) } : {}),
        ...(icon !== undefined ? { icon } : {}),
        ...(iconColor !== undefined ? { iconColor } : {}),
        ...(iconBg !== undefined ? { iconBg } : {}),
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(content !== undefined ? { content: String(content) } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
        ...(colSpan !== undefined ? { colSpan: Number(colSpan) } : {}),
        ...(visible !== undefined ? { visible: Boolean(visible) } : {}),
      },
    });
    res.json(item);
  } catch (e) {
    console.error('[meeting-guide PUT /:id]', e.message || e);
    if (e.code === 'P2025') return res.status(404).json({ message: 'Not found' });
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

adminRouter.delete('/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.meetingGuideItem.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: 'Not found' });
  }
});

// Seed default cards
adminRouter.post('/seed-defaults', authRequired, adminRequired, async (req, res) => {
  try {
    let created = 0;
    for (const d of DEFAULT_ITEMS) {
      const exists = await prisma.meetingGuideItem.findUnique({ where: { key: d.key } });
      if (!exists) {
        await prisma.meetingGuideItem.create({ data: { ...d, visible: true } });
        created++;
      }
    }
    res.json({ ok: true, created, total: DEFAULT_ITEMS.length });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = { publicRouter, adminRouter };
