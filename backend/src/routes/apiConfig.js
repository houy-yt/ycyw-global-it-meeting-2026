/**
 * API Config management routes.
 *
 * Admin endpoints:
 *   GET    /api/admin/api-configs          → list all API configs
 *   POST   /api/admin/api-configs          → create a new API config
 *   PUT    /api/admin/api-configs/:id      → update an API config
 *   DELETE /api/admin/api-configs/:id      → delete an API config
 *
 * Public endpoints:
 *   GET    /api/api-configs/widgets        → list widget-enabled configs (for homepage)
 */
const express = require('express');
const prisma = require('../utils/prisma');
const { authRequired, adminRequired } = require('../middleware/auth');

// ── Sensitive fields that should be masked in API responses ──
const SENSITIVE_KEYS = ['privateKey', 'apiKey', 'secretKey', 'password', 'token', 'secret'];

/**
 * Mask sensitive values in a config JSON object.
 * Shows only the last 4 characters of each sensitive value.
 */
function maskConfig(configStr) {
  try {
    const obj = JSON.parse(configStr || '{}');
    const masked = { ...obj };
    for (const key of Object.keys(masked)) {
      if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        const val = String(masked[key] || '');
        if (val.length > 4) {
          masked[key] = '****' + val.slice(-4);
        } else if (val.length > 0) {
          masked[key] = '****';
        }
      }
    }
    return JSON.stringify(masked);
  } catch {
    return '{}';
  }
}

/**
 * Merge new config with existing config, preserving unchanged sensitive fields.
 * If a sensitive field value starts with '****', keep the original value.
 */
function mergeConfig(newConfigStr, oldConfigStr) {
  try {
    const newObj = JSON.parse(newConfigStr || '{}');
    const oldObj = JSON.parse(oldConfigStr || '{}');
    const merged = { ...newObj };
    for (const key of Object.keys(merged)) {
      if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        if (String(merged[key]).startsWith('****')) {
          // Keep original value
          merged[key] = oldObj[key] || '';
        }
      }
    }
    return JSON.stringify(merged);
  } catch {
    return newConfigStr || '{}';
  }
}

// ══════════════════════════════════════════════════════════
//  Admin Router
// ══════════════════════════════════════════════════════════
const adminRouter = express.Router();
adminRouter.use(authRequired, adminRequired);

// GET all configs
adminRouter.get('/', async (req, res) => {
  try {
    const rows = await prisma.apiConfig.findMany({
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });
    // Mask sensitive fields before returning
    const masked = rows.map(r => ({
      ...r,
      config: maskConfig(r.config),
    }));
    res.json(masked);
  } catch (err) {
    console.error('[ApiConfig] list error:', err);
    res.status(500).json({ message: err.message });
  }
});

// CREATE
adminRouter.post('/', async (req, res) => {
  try {
    const { name, type, provider, config, widgetEnabled, widgetConfig, isActive, sortOrder } = req.body;
    if (!name || !type || !provider) {
      return res.status(400).json({ message: '名称、类型和提供商不能为空' });
    }
    const row = await prisma.apiConfig.create({
      data: {
        name,
        type,
        provider,
        config: config || '{}',
        widgetEnabled: !!widgetEnabled,
        widgetConfig: widgetConfig || '{}',
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
      },
    });
    res.json({ ...row, config: maskConfig(row.config) });
  } catch (err) {
    console.error('[ApiConfig] create error:', err);
    res.status(500).json({ message: err.message });
  }
});

// UPDATE
adminRouter.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.apiConfig.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: '未找到该配置' });

    const { name, type, provider, config, widgetEnabled, widgetConfig, isActive, sortOrder } = req.body;

    // Merge config to preserve unchanged sensitive fields
    const mergedConfig = config ? mergeConfig(config, existing.config) : existing.config;

    const row = await prisma.apiConfig.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        type: type ?? existing.type,
        provider: provider ?? existing.provider,
        config: mergedConfig,
        widgetEnabled: widgetEnabled !== undefined ? !!widgetEnabled : existing.widgetEnabled,
        widgetConfig: widgetConfig ?? existing.widgetConfig,
        isActive: isActive !== undefined ? !!isActive : existing.isActive,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
      },
    });
    res.json({ ...row, config: maskConfig(row.config) });
  } catch (err) {
    console.error('[ApiConfig] update error:', err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE
adminRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.apiConfig.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[ApiConfig] delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ══════════════════════════════════════════════════════════
//  Public Router
// ══════════════════════════════════════════════════════════
const publicRouter = express.Router();

// GET widgets - returns enabled widgets for the homepage
publicRouter.get('/widgets', async (req, res) => {
  try {
    const rows = await prisma.apiConfig.findMany({
      where: { isActive: true, widgetEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        type: true,
        provider: true,
        widgetEnabled: true,
        widgetConfig: true,
        sortOrder: true,
      },
    });
    res.json(rows);
  } catch (err) {
    console.error('[ApiConfig] widgets error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * REVEAL (Admin only)
 * GET /api/admin/api-configs/:id/reveal?confirm=1
 *
 * Returns unmasked config for a single ApiConfig row.
 * This is intentionally separated from list endpoints to reduce accidental secret exposure.
 */
adminRouter.get('/:id/reveal', async (req, res) => {
  try {
    if (String(req.query.confirm || '') !== '1') {
      return res.status(400).json({ message: '需要确认参数 confirm=1 才能查看明文配置' });
    }

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: '参数错误' });

    const row = await prisma.apiConfig.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ message: '未找到该配置' });

    // Audit log (lightweight): who revealed what
    console.log('[ApiConfig] reveal', {
      id: row.id,
      type: row.type,
      provider: row.provider,
      by: req.user?.email || req.user?.name || req.user?.id,
      at: new Date().toISOString(),
    });

    res.json(row);
  } catch (err) {
    console.error('[ApiConfig] reveal error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = { adminRouter, publicRouter };
