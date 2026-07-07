/**
 * Admin: Send email notifications to attendees.
 *   GET  /api/admin/notification/recipients   -> attendees grouped by school (with email)
 *   GET  /api/admin/notification/smtp-config  -> sender email configs (password masked)
 *   PUT  /api/admin/notification/smtp-config  -> save sender email configs
 *   POST /api/admin/notification/test-smtp    -> send test email
 *   POST /api/admin/notification/send         -> send notification emails
 *
 * Each sender email config: {email, name, host, port, secure, user, pass, active}
 */
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const prisma = require('../utils/prisma');
const settings = require('../services/settingsService');
const { authRequired, adminRequired } = require('../middleware/auth');

// All routes require admin
router.use(authRequired, adminRequired);

const PASS_MASK = '********';

// ── Helper: load sender emails from DB (raw, with real passwords) ──
async function loadSenderEmails() {
  const raw = await settings.get('smtp.senderEmails', '[]');
  try {
    const list = JSON.parse(raw);
    if (Array.isArray(list)) return list;
  } catch { /* ignore */ }

  // Auto-migrate from legacy single-config format
  const host = await settings.get('smtp.host', '');
  const fromEmail = await settings.get('smtp.fromEmail', '');
  if (host && fromEmail) {
    const migrated = [{
      email: fromEmail,
      name: await settings.get('smtp.fromName', ''),
      host,
      port: await settings.get('smtp.port', '587'),
      secure: await settings.get('smtp.secure', 'tls'),
      user: await settings.get('smtp.user', ''),
      pass: await settings.get('smtp.pass', ''),
      active: true,
    }];
    // Save migrated data
    await settings.set('smtp.senderEmails', JSON.stringify(migrated), 'smtp');
    return migrated;
  }

  return [];
}

// ── GET SMTP config (password masked) ──
router.get('/smtp-config', async (req, res) => {
  const list = await loadSenderEmails();
  // Mask passwords before sending to client
  const masked = list.map(item => ({
    ...item,
    pass: item.pass ? PASS_MASK : '',
  }));
  res.json({ senderEmails: masked });
});

// ── PUT SMTP config ──
router.put('/smtp-config', async (req, res) => {
  try {
    const { senderEmails } = req.body || {};
    if (!Array.isArray(senderEmails)) {
      return res.status(400).json({ message: 'Expected senderEmails array' });
    }

    // Load existing passwords so we can preserve masked ones
    const existing = await loadSenderEmails();
    const existingMap = {};
    for (const e of existing) {
      if (e.email) existingMap[e.email] = e;
    }

    // Resolve masked passwords
    const resolved = senderEmails.map(item => {
      const entry = { ...item };
      if (entry.pass === PASS_MASK) {
        // Keep existing password
        const prev = existingMap[entry.email];
        entry.pass = prev?.pass || '';
      }
      // Ensure active defaults to true
      if (entry.active === undefined) entry.active = true;
      return entry;
    });

    await settings.set('smtp.senderEmails', JSON.stringify(resolved), 'smtp');
    res.json({ ok: true });
  } catch (e) {
    console.error('[smtp-config] save error', e);
    res.status(500).json({ message: e.message });
  }
});

// ── Helper: create transporter from a sender config ──
function createTransporterFromConfig(cfg) {
  const host = cfg.host || '';
  const port = Number(cfg.port) || 587;
  const secureMode = cfg.secure || 'tls';
  const user = cfg.user || '';
  const pass = cfg.pass || '';

  if (!host) throw new Error('SMTP 服务器未配置');

  const opts = {
    host,
    port,
    secure: secureMode === 'ssl',
    auth: user ? { user, pass } : undefined,
  };

  if (secureMode === 'tls') {
    opts.secure = false;
    opts.requireTLS = true;
  } else if (secureMode === 'none') {
    opts.secure = false;
    opts.requireTLS = false;
    opts.tls = { rejectUnauthorized: false };
  }

  return nodemailer.createTransport(opts);
}

// ── Helper: find sender config by email ──
async function findSenderConfig(email) {
  const list = await loadSenderEmails();
  if (email) {
    const found = list.find(s => s.email === email);
    if (found) return found;
  }
  // Fallback to first active
  const active = list.find(s => s.active !== false);
  return active || list[0] || null;
}

// ── POST test SMTP connection ──
router.post('/test-smtp', async (req, res) => {
  try {
    const { senderEmail, testEmail } = req.body || {};

    if (!testEmail) return res.status(400).json({ message: '请输入测试收件邮箱' });

    const cfg = await findSenderConfig(senderEmail);
    if (!cfg || !cfg.host) {
      return res.status(400).json({ message: '未找到对应的邮箱配置，请先配置 SMTP 信息' });
    }

    const fromEmail = cfg.email || '';
    const fromName = cfg.name || 'IT Meeting';

    const transporter = createTransporterFromConfig(cfg);
    await transporter.verify();

    await transporter.sendMail({
      from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
      to: testEmail,
      subject: 'SMTP 测试邮件 - IT Meeting',
      html: '<p>这是一封测试邮件，说明您的 SMTP 配置正确。</p><p>— IT Meeting 系统</p>',
    });

    res.json({ ok: true, message: `测试邮件已发送到 ${testEmail}` });
  } catch (e) {
    console.error('[test-smtp]', e);
    res.status(500).json({ message: `SMTP 测试失败: ${e.message}` });
  }
});

// ── GET recipients: attendees with email, grouped by school ──
router.get('/recipients', async (req, res) => {
  try {
    const attendees = await prisma.attendee.findMany({
      where: {
        isActive: true,
        email: { not: null },
      },
      orderBy: [{ school: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        nameEn: true,
        nameCn: true,
        email: true,
        school: true,
        department: true,
        title: true,
      },
    });

    const withEmail = attendees.filter(a => a.email && a.email.trim());

    const grouped = {};
    for (const a of withEmail) {
      const school = a.school || '(未分配)';
      if (!grouped[school]) grouped[school] = [];
      grouped[school].push(a);
    }

    const orgs = await prisma.organization.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: { code: true, name: true },
    });
    const orgMap = {};
    for (const o of orgs) orgMap[o.code] = o.name;

    const result = Object.entries(grouped).map(([school, members]) => ({
      school,
      schoolName: orgMap[school] || school,
      members,
    }));

    res.json(result);
  } catch (e) {
    console.error('[notification recipients]', e);
    res.status(500).json({ message: e.message });
  }
});

// ── POST send notification emails ──
router.post('/send', async (req, res) => {
  try {
    const { recipients, subject, body: htmlBody, fromEmail, fromName: customFromName } = req.body || {};

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: '请选择至少一个收件人' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ message: '请输入邮件主题' });
    }
    if (!htmlBody || !htmlBody.trim()) {
      return res.status(400).json({ message: '请输入邮件正文' });
    }

    // Find the SMTP config for the selected sender email
    const cfg = await findSenderConfig(fromEmail);
    if (!cfg || !cfg.host) {
      return res.status(400).json({ message: '发件邮箱未配置 SMTP，请在系统设置中配置' });
    }

    const senderEmail = fromEmail || cfg.email;
    const senderName = customFromName !== undefined ? customFromName : (cfg.name || 'IT Meeting');

    if (!senderEmail) {
      return res.status(400).json({ message: '发件人邮箱未设置' });
    }

    const transporter = createTransporterFromConfig(cfg);
    await transporter.verify();

    const from = senderName
      ? `"${senderName}" <${senderEmail}>`
      : senderEmail;

    const results = { success: 0, failed: 0, errors: [] };

    for (const email of recipients) {
      try {
        await transporter.sendMail({
          from,
          to: email,
          subject: subject.trim(),
          html: htmlBody,
        });
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push({ email, error: e.message });
        console.error(`[notification] Failed to send to ${email}:`, e.message);
      }
    }

    res.json({
      ok: true,
      message: `发送完成：成功 ${results.success} 封，失败 ${results.failed} 封`,
      ...results,
    });
  } catch (e) {
    console.error('[notification send]', e);
    res.status(500).json({ message: `发送失败: ${e.message}` });
  }
});

module.exports = router;
