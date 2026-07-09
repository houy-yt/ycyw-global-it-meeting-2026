const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

/**
 * Verify JWT and attach `req.user` (full DB record). Required for protected routes.
 */
async function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/**
 * Optional auth: if token is valid, attach req.user; otherwise continue anonymously.
 */
async function authOptional(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token) {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (user) req.user = user;
    }
  } catch (_) {
    // ignore invalid token
  }
  next();
}

function adminRequired(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin only' });
  }
  next();
}

/**
 * Only super admins (emails listed in ADMIN_EMAILS env var) can proceed.
 * Must be used AFTER authRequired.
 */
function superAdminRequired(req, res, next) {
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!req.user || !ADMIN_EMAILS.includes(req.user.email.toLowerCase())) {
    return res.status(403).json({ message: 'Super admin only' });
  }
  next();
}

function attendeeRequired(req, res, next) {
  if (!req.user || !req.user.isAttendee) {
    return res.status(403).json({ message: 'Only attendees can do this action' });
  }
  next();
}

function signToken(user) {
  return jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

module.exports = {
  authRequired,
  authOptional,
  adminRequired,
  superAdminRequired,
  attendeeRequired,
  signToken,
};
