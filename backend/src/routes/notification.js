/**
 * Admin: Send email notifications to attendees.
 *   GET  /api/admin/notification/recipients      -> attendees grouped by school (with email)
 *   GET  /api/admin/notification/smtp-config     -> sender email configs (password masked)
 *   PUT  /api/admin/notification/smtp-config     -> save sender email configs
 *   POST /api/admin/notification/test-smtp       -> send test email
 *   POST /api/admin/notification/send            -> start async send job
 *   GET  /api/admin/notification/send-progress/:jobId -> poll send progress
 *   POST /api/admin/notification/send-cancel/:jobId   -> cancel a running send job
 *   GET  /api/admin/notification/draft           -> get saved draft
 *   PUT  /api/admin/notification/draft           -> save draft
 *   DELETE /api/admin/notification/draft         -> delete draft
 *
 * Each sender email config: {email, name, host, port, secure, user, pass, active}
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const prisma = require('../utils/prisma');
const settings = require('../services/settingsService');
const { authRequired, adminRequired } = require('../middleware/auth');

// Multer for local file uploads (memory storage, 50MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

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

// ══════════════════════════════════════════════════════════════════════════════
// Async Send Jobs — in-memory store
// ══════════════════════════════════════════════════════════════════════════════
const sendJobs = new Map();   // jobId -> { total, success, failed, errors[], cancelled, status, currentEmail }

// Auto-cleanup finished jobs after 10 minutes
function scheduleJobCleanup(jobId) {
  setTimeout(() => { sendJobs.delete(jobId); }, 10 * 60 * 1000);
}

// ── Helper: resolve attachments from URL paths to local file buffers ──
function resolveAttachments(reqAttachments) {
  const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
  const mailAttachments = [];
  if (Array.isArray(reqAttachments) && reqAttachments.length > 0) {
    for (const att of reqAttachments) {
      if (!att || !att.url) continue;
      let relPath = att.url;
      if (relPath.startsWith('/uploads/')) {
        relPath = relPath.slice('/uploads/'.length);
      } else if (relPath.startsWith('uploads/')) {
        relPath = relPath.slice('uploads/'.length);
      }
      const absPath = path.resolve(UPLOADS_DIR, relPath);
      if (!absPath.startsWith(UPLOADS_DIR)) {
        console.warn(`[notification] Attachment path outside uploads: ${absPath}`);
        continue;
      }
      if (!fs.existsSync(absPath)) {
        console.warn(`[notification] Attachment file not found: ${absPath}`);
        continue;
      }
      mailAttachments.push({
        filename: att.name || path.basename(absPath),
        path: absPath,
      });
    }
  }
  return mailAttachments;
}

// ── POST send notification emails (async job) ──
router.post('/send', async (req, res) => {
  try {
    const { recipients, subject, body: htmlBody, fromEmail, fromName: customFromName, attachments: reqAttachments } = req.body || {};

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: '请选择至少一个收件人' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ message: '请输入邮件主题' });
    }
    if (!htmlBody || !htmlBody.trim()) {
      return res.status(400).json({ message: '请输入邮件正文' });
    }

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

    const mailAttachments = resolveAttachments(reqAttachments);

    // Create async job
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job = {
      total: recipients.length,
      success: 0,
      failed: 0,
      errors: [],
      cancelled: false,
      status: 'running',      // running | completed | cancelled
      currentEmail: '',
    };
    sendJobs.set(jobId, job);

    // Return jobId immediately
    res.json({ ok: true, jobId, total: recipients.length });

    // ── Background send loop ──
    (async () => {
      for (const email of recipients) {
        // Check cancellation before each send
        if (job.cancelled) {
          job.status = 'cancelled';
          console.log(`[notification] Job ${jobId} cancelled. Sent ${job.success}, skipped remaining.`);
          scheduleJobCleanup(jobId);
          return;
        }
        job.currentEmail = email;
        try {
          const mailOpts = {
            from,
            to: email,
            subject: subject.trim(),
            html: htmlBody,
          };
          if (mailAttachments.length > 0) {
            mailOpts.attachments = mailAttachments;
          }
          await transporter.sendMail(mailOpts);
          job.success++;
        } catch (e) {
          job.failed++;
          job.errors.push({ email, error: e.message });
          console.error(`[notification] Failed to send to ${email}:`, e.message);
        }
      }
      job.status = 'completed';
      job.currentEmail = '';
      console.log(`[notification] Job ${jobId} completed. Success: ${job.success}, Failed: ${job.failed}`);
      scheduleJobCleanup(jobId);
    })();
  } catch (e) {
    console.error('[notification send]', e);
    res.status(500).json({ message: `发送失败: ${e.message}` });
  }
});

// ── GET send progress ──
router.get('/send-progress/:jobId', (req, res) => {
  const job = sendJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ message: '任务不存在或已过期' });
  }
  res.json({
    total: job.total,
    success: job.success,
    failed: job.failed,
    errors: job.errors,
    status: job.status,
    currentEmail: job.currentEmail,
    message: job.status === 'completed'
      ? `发送完成：成功 ${job.success} 封，失败 ${job.failed} 封`
      : job.status === 'cancelled'
        ? `已取消发送：已成功 ${job.success} 封，失败 ${job.failed} 封，未发送 ${job.total - job.success - job.failed} 封`
        : `正在发送：${job.success + job.failed} / ${job.total}`,
  });
});

// ── POST cancel send job ──
router.post('/send-cancel/:jobId', (req, res) => {
  const job = sendJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ message: '任务不存在或已过期' });
  }
  if (job.status !== 'running') {
    return res.json({ ok: true, message: '任务已结束' });
  }
  job.cancelled = true;
  res.json({ ok: true, message: '已请求取消发送' });
});

// ── POST upload local attachment file ──
// Saves to uploads/<YYYY-MM-DD>/ directory
router.post('/upload-attachment', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的文件' });
    }

    const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

    // Create date-based subdirectory (YYYY-MM-DD)
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dateDir = path.join(UPLOADS_DIR, dateStr);
    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }

    // Generate unique filename: timestamp-random-originalname
    const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const safeOrigName = req.file.originalname.replace(/[\\/:*?"<>|]/g, '_');
    const filename = `${uniquePrefix}-${safeOrigName}`;
    const filePath = path.join(dateDir, filename);

    // Write file to disk
    fs.writeFileSync(filePath, req.file.buffer);

    const url = `/uploads/${dateStr}/${filename}`;
    res.json({
      ok: true,
      name: req.file.originalname,
      url,
    });
  } catch (e) {
    console.error('[upload-attachment]', e);
    res.status(500).json({ message: `上传失败: ${e.message}` });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Draft — single draft stored in SystemSetting (key: notification.draft)
// ══════════════════════════════════════════════════════════════════════════════
const DRAFT_KEY = 'notification.draft';

// ── GET draft ──
router.get('/draft', async (req, res) => {
  try {
    const raw = await settings.get(DRAFT_KEY, '');
    if (!raw) return res.json({ draft: null });
    const draft = JSON.parse(raw);
    res.json({ draft });
  } catch {
    res.json({ draft: null });
  }
});

// ── PUT draft (save / update) ──
router.put('/draft', async (req, res) => {
  try {
    const { fromEmail, fromName, subject, body, selectedPersonIds, manualEmails, attachments } = req.body || {};
    const draft = {
      fromEmail: fromEmail || '',
      fromName: fromName || '',
      subject: subject || '',
      body: body || '',
      selectedPersonIds: Array.isArray(selectedPersonIds) ? selectedPersonIds : [],
      manualEmails: Array.isArray(manualEmails) ? manualEmails : [],
      attachments: Array.isArray(attachments) ? attachments : [],
      savedAt: new Date().toISOString(),
    };
    await settings.set(DRAFT_KEY, JSON.stringify(draft), 'notification');
    res.json({ ok: true, message: '草稿已保存' });
  } catch (e) {
    console.error('[draft save]', e);
    res.status(500).json({ message: `保存草稿失败: ${e.message}` });
  }
});

// ── DELETE draft ──
router.delete('/draft', async (req, res) => {
  try {
    await settings.set(DRAFT_KEY, '', 'notification');
    res.json({ ok: true, message: '草稿已删除' });
  } catch (e) {
    console.error('[draft delete]', e);
    res.status(500).json({ message: `删除草稿失败: ${e.message}` });
  }
});

module.exports = router;
