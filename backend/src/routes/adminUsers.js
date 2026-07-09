/**
 * Admin Users management routes — Role-based.
 * Only super admins (emails in ADMIN_EMAILS env) can manage role users.
 *
 * Supported roles: admin | auditor | editor | user (default)
 * Super admin is a runtime concept (determined by ADMIN_EMAILS env).
 */

const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authRequired, superAdminRequired } = require('../middleware/auth');

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Role definitions — single source of truth.
 * Extensible: just add a new entry here to introduce a new role.
 */
const ROLE_DEFINITIONS = [
  { key: 'admin',   label: '管理员', icon: 'user-gear',       color: 'primary',  description: '可访问后台管理页面' },
  { key: 'auditor', label: '审核员', icon: 'clipboard-check', color: 'success',  description: '可审核内容（预留）' },
  { key: 'editor',  label: '编辑',   icon: 'pen-nib',         color: 'warning',  description: '可编辑内容（预留）' },
];

/** Roles that grant backend (isAdmin) access */
const BACKEND_ROLES = new Set(['admin', 'auditor', 'editor']);

// All routes require super admin
router.use(authRequired, superAdminRequired);

/* ──────────────────────────────────────────────
 * GET /api/admin/admins/roles
 * Returns available role definitions for the frontend.
 * ────────────────────────────────────────────── */
router.get('/roles', (_req, res) => {
  res.json(ROLE_DEFINITIONS);
});

/* ──────────────────────────────────────────────
 * GET /api/admin/admins
 * List all users with a non-"user" role (role != 'user')
 * ────────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const { role } = req.query; // optional filter
    let where;
    if (role && role !== 'all') {
      where = { role };
    } else {
      // Show all users with a non-default role OR isAdmin=true (catches super admins)
      where = {
        OR: [
          { role: { not: 'user' } },
          { isAdmin: true },
        ],
      };
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        nickname: true,
        isAdmin: true,
        role: true,
        adminPermissions: true,
        createdAt: true,
      },
    });

    const result = users.map((u) => {
      const isSuperAdmin = ADMIN_EMAILS.includes(u.email.toLowerCase());
      let permissions = null;
      try {
        permissions = u.adminPermissions ? JSON.parse(u.adminPermissions) : [];
      } catch {
        permissions = [];
      }
      return {
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        role: isSuperAdmin ? 'superadmin' : u.role,
        isSuperAdmin,
        adminPermissions: isSuperAdmin ? null : permissions, // null means all
        createdAt: u.createdAt,
      };
    });

    // Also inject super admins from ADMIN_EMAILS who may not be in the DB yet
    // (they'll appear once they log in, so we just show existing ones)

    res.json(result);
  } catch (e) {
    console.error('[adminUsers] GET /', e);
    res.status(500).json({ message: '获取用户列表失败' });
  }
});

/* ──────────────────────────────────────────────
 * POST /api/admin/admins
 * Add a user with a specific role.
 * Body: { email, role, adminPermissions?: string[] }
 * ────────────────────────────────────────────── */
router.post('/', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: '请输入有效的邮箱地址' });
    }

    const role = String(req.body?.role || '').trim();
    const validRoles = ROLE_DEFINITIONS.map((r) => r.key);
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: `无效的角色，可选值：${validRoles.join(', ')}` });
    }

    const permissions = Array.isArray(req.body.adminPermissions)
      ? req.body.adminPermissions.filter((k) => typeof k === 'string')
      : [];

    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      if (user.role !== 'user') {
        return res.status(400).json({ message: `该用户已拥有角色：${user.role}` });
      }
      // Promote existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          role,
          isAdmin: BACKEND_ROLES.has(role),
          adminPermissions: JSON.stringify(permissions),
        },
      });
    } else {
      // Create new user with role
      user = await prisma.user.create({
        data: {
          email,
          nickname: email.split('@')[0],
          role,
          isAdmin: BACKEND_ROLES.has(role),
          adminPermissions: JSON.stringify(permissions),
        },
      });
    }

    const isSuperAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
    res.json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: isSuperAdmin ? 'superadmin' : user.role,
      isSuperAdmin,
      adminPermissions: isSuperAdmin ? null : permissions,
      createdAt: user.createdAt,
    });
  } catch (e) {
    console.error('[adminUsers] POST /', e);
    res.status(500).json({ message: '添加用户角色失败' });
  }
});

/* ──────────────────────────────────────────────
 * PUT /api/admin/admins/:id
 * Update role and/or permissions.
 * Body: { role?: string, adminPermissions?: string[] }
 * ────────────────────────────────────────────── */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: '无效的ID' });

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: '用户不存在' });

    // Cannot edit super admin
    if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return res.status(400).json({ message: '不能修改超级管理员' });
    }

    const data = {};

    // Update role if provided
    if (req.body.role !== undefined) {
      const role = String(req.body.role).trim();
      const validRoles = ROLE_DEFINITIONS.map((r) => r.key);
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: `无效的角色，可选值：${validRoles.join(', ')}` });
      }
      data.role = role;
      data.isAdmin = BACKEND_ROLES.has(role);
    }

    // Update permissions if provided
    if (req.body.adminPermissions !== undefined) {
      const permissions = Array.isArray(req.body.adminPermissions)
        ? req.body.adminPermissions.filter((k) => typeof k === 'string')
        : [];
      data.adminPermissions = JSON.stringify(permissions);
    }

    const updated = await prisma.user.update({ where: { id }, data });

    let permissions = [];
    try {
      permissions = updated.adminPermissions ? JSON.parse(updated.adminPermissions) : [];
    } catch { permissions = []; }

    res.json({
      id: updated.id,
      email: updated.email,
      nickname: updated.nickname,
      role: updated.role,
      isSuperAdmin: false,
      adminPermissions: permissions,
      createdAt: updated.createdAt,
    });
  } catch (e) {
    console.error('[adminUsers] PUT /:id', e);
    res.status(500).json({ message: '更新失败' });
  }
});

/* ──────────────────────────────────────────────
 * DELETE /api/admin/admins/:id
 * Revoke role → set back to "user". Cannot revoke super admins.
 * ────────────────────────────────────────────── */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: '无效的ID' });

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: '用户不存在' });

    // Cannot remove super admin
    if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return res.status(400).json({ message: '不能撤销超级管理员' });
    }

    if (user.role === 'user') {
      return res.status(400).json({ message: '该用户没有特殊角色' });
    }

    await prisma.user.update({
      where: { id },
      data: { role: 'user', isAdmin: false, adminPermissions: null },
    });

    res.json({ message: '已撤销用户角色' });
  } catch (e) {
    console.error('[adminUsers] DELETE /:id', e);
    res.status(500).json({ message: '撤销角色失败' });
  }
});

module.exports = router;
