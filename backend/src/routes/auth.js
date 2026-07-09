/**
 * Auth routes — Dual mode: Mock OIDC + Real OIDC.
 *
 * OIDC_ENABLED=false  → Mock email-only login (development)
 * OIDC_ENABLED=true   → Redirect to external OIDC provider (production)
 *
 * Uses openid-client v6 (ESM-only, functional API).
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const prisma = require('../utils/prisma');
const settingsService = require('../services/settingsService');
const jwt = require('jsonwebtoken');
const { signToken, authRequired } = require('../middleware/auth');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';


const OIDC_ENABLED = process.env.OIDC_ENABLED === 'true';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// In-memory state store for OIDC (simple; use Redis in production cluster)
const stateStore = new Map();

// In-memory store for id_tokens keyed by user ID (used for logout id_token_hint)
const idTokenStore = new Map();

// Lazy-initialized OIDC configuration & module reference (openid-client v6)
let oidcConfig = null;
let oidcLib = null;

/**
 * Lazy-initialize openid-client v6 Configuration via discovery.
 * Returns { config, lib } where lib is the openid-client module.
 */
async function getOidc() {
  if (oidcConfig && oidcLib) return { config: oidcConfig, lib: oidcLib };
  if (!OIDC_ENABLED) return null;

  try {
    // openid-client v6 is ESM-only — use dynamic import() in CommonJS
    oidcLib = await import('openid-client');

    const serverUrl = new URL(process.env.OIDC_AUTHORITY);
    const clientId = process.env.OIDC_CLIENT_ID;
    const clientSecret = process.env.OIDC_CLIENT_SECRET;

    // discovery() fetches .well-known/openid-configuration and builds a Configuration
    oidcConfig = await oidcLib.discovery(
      serverUrl,
      clientId,
      undefined, // no extra client metadata
      oidcLib.ClientSecretPost(clientSecret),
    );

    console.log('[OIDC] Discovery successful for', process.env.OIDC_AUTHORITY);
    return { config: oidcConfig, lib: oidcLib };
  } catch (e) {
    console.error('[OIDC] Failed to discover issuer:', e.message);
    throw e;
  }
}

/* ──────────────────────────────────────────────
 * GET /api/auth/config
 * Returns { oidcEnabled, whitelist } so frontend knows which mode to use
 * and which page paths are accessible without login.
 * ────────────────────────────────────────────── */
router.get('/config', async (_req, res) => {
  let whitelist = [];
  try {
    const raw = await settingsService.get('auth.whitelist', '[]');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      whitelist = parsed.filter((p) => typeof p === 'string');
    }
  } catch (_e) {
    whitelist = [];
  }
  res.json({ oidcEnabled: OIDC_ENABLED, whitelist });
});


/* ──────────────────────────────────────────────
 * POST /api/auth/login  (Mock mode only)
 * Body: { email }
 * Returns: { token, user }
 * ────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    const user = await findOrCreateUser(email);
    const token = signToken(user);
    return res.json({ token, user: sanitize(user) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ──────────────────────────────────────────────
 * GET /api/auth/oidc-login
 * Query: ?redirect=/reflections&action=publish
 * Generates OIDC authorization URL and 302 redirects.
 * ────────────────────────────────────────────── */
router.get('/oidc-login', async (req, res) => {
  if (!OIDC_ENABLED) {
    return res.status(400).json({ message: 'OIDC is not enabled' });
  }

  try {
    const { config, lib } = await getOidc();
    const { redirect, action } = req.query;

    // Generate state with encoded payload
    const stateKey = crypto.randomBytes(16).toString('hex');
    stateStore.set(stateKey, {
      redirect: redirect || '/',
      action: action || null,
      createdAt: Date.now(),
    });

    // Clean up old states (> 10 minutes)
    for (const [key, val] of stateStore) {
      if (Date.now() - val.createdAt > 10 * 60 * 1000) stateStore.delete(key);
    }

    // openid-client v6: buildAuthorizationUrl(config, parameters)
    const authUrl = lib.buildAuthorizationUrl(config, {
      scope: process.env.OIDC_SCOPES || 'openid email profile',
      redirect_uri: process.env.OIDC_REDIRECT_URI,
      state: stateKey,
    });

    return res.redirect(authUrl.href);
  } catch (e) {
    console.error('[OIDC] Error generating auth URL:', e.message);
    return res.status(500).json({ message: 'OIDC configuration error' });
  }
});

/* ──────────────────────────────────────────────
 * GET /api/auth/oidc-callback
 * Called by the OIDC provider after user authenticates.
 * Exchanges code for tokens, creates/finds local user,
 * then 302 redirects to frontend callback page.
 * ────────────────────────────────────────────── */
router.get('/oidc-callback', async (req, res) => {
  if (!OIDC_ENABLED) {
    return res.status(400).json({ message: 'OIDC is not enabled' });
  }

  // Handle OIDC provider errors (e.g. user clicked Cancel)
  if (req.query.error) {
    console.log('[OIDC] Auth cancelled or error from provider:', req.query.error, req.query.error_description || '');
    // Clean up state
    const stateParam = req.query.state;
    if (stateParam) stateStore.delete(stateParam);
    // Redirect back to frontend home page
    const frontendOrigin = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')[0].trim()
      : `${req.protocol}://${req.get('host')}`;
    return res.redirect(frontendOrigin + '/');
  }

  try {
    const { config, lib } = await getOidc();

    // Retrieve and validate state
    const stateParam = req.query.state;
    const stateData = stateStore.get(stateParam);
    if (!stateData) {
      return res.status(400).json({ message: 'Invalid or expired state' });
    }
    stateStore.delete(stateParam);

    // Build the full callback URL that the browser was redirected to
    // Use OIDC_REDIRECT_URI origin to ensure correct protocol behind reverse proxy
    const redirectBase = new URL(process.env.OIDC_REDIRECT_URI);
    const currentUrl = new URL(req.originalUrl, redirectBase.origin);

    // openid-client v6: authorizationCodeGrant(config, currentUrl, checks)
    const tokenResponse = await lib.authorizationCodeGrant(config, currentUrl, {
      expectedState: stateParam,
    });

    // Get access token from the response
    const accessToken = tokenResponse.access_token;
    if (!accessToken) {
      return res.status(400).json({ message: 'No access token received from OIDC provider' });
    }

    // openid-client v6: fetchUserInfo(config, accessToken, expectedSubject)
    // Use skipSubjectCheck since we don't have the subject yet
    const userinfo = await lib.fetchUserInfo(
      config,
      accessToken,
      lib.skipSubjectCheck,
    );

    const email = (userinfo.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: 'No email returned from OIDC provider' });
    }

    // Find or create local user
    const user = await findOrCreateUser(email, userinfo.name || userinfo.preferred_username);
    const jwtToken = signToken(user);

    // Pass the id_token to the frontend so it can be stored in localStorage
    // and sent back during logout as id_token_hint (skips IdentityServer
    // confirmation page). This is more reliable than the in-memory idTokenStore
    // which is lost on backend restart.
    const idToken = tokenResponse.id_token;

    // Build frontend callback URL
    const frontendCallback = process.env.OIDC_FRONTEND_CALLBACK || '/auth/callback';
    const frontendOrigin = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')[0].trim()
      : `${req.protocol}://${req.get('host')}`;
    const url = new URL(frontendCallback, frontendOrigin);
    url.searchParams.set('token', jwtToken);
    if (idToken) url.searchParams.set('id_token', idToken);
    if (stateData.redirect) url.searchParams.set('redirect', stateData.redirect);
    if (stateData.action) url.searchParams.set('action', stateData.action);

    return res.redirect(url.toString());
  } catch (e) {
    console.error('[OIDC] Callback error:', e);
    return res.status(500).json({ message: 'OIDC authentication failed' });
  }
});

/* ──────────────────────────────────────────────
 * GET /api/auth/me
 * ────────────────────────────────────────────── */
router.get('/me', authRequired, (req, res) => {
  res.json({ user: sanitize(req.user) });
});

/* ──────────────────────────────────────────────
 * GET /api/auth/logout
 * Ends the SSO session with the OIDC provider (if enabled) and
 * redirects the browser back to the frontend home page.
 *
 * OIDC mode : full-page redirect to the IdP end_session endpoint
 *             (post_logout_redirect_uri points back to the frontend
 *             origin so the browser lands on the home page again).
 * Mock mode : simply redirect to the frontend home page. The frontend
 *             router guard will then send the user to /login if the
 *             home page is not in the anonymous whitelist.
 *
 * The local JWT lives only in the browser's localStorage, which the
 * frontend clears before calling this endpoint. There is nothing
 * server-side to invalidate in mock mode.
 * ────────────────────────────────────────────── */
router.get('/logout', async (req, res) => {
  const frontendOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')[0].trim()
    : `${req.protocol}://${req.get('host')}`;
  const postLogoutRedirect = frontendOrigin + '/';

  if (!OIDC_ENABLED) {
    return res.redirect(postLogoutRedirect);
  }

  // The frontend passes the OIDC id_token directly as a query parameter.
  // This is more reliable than the in-memory idTokenStore which is lost
  // on backend restart. Falls back to the legacy JWT-based lookup.
  let idTokenHint = req.query.id_token || null;

  // Legacy fallback: extract userId from JWT token to look up stored id_token
  if (!idTokenHint) {
    const token = req.query.token;
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.userId && idTokenStore.has(payload.userId)) {
          idTokenHint = idTokenStore.get(payload.userId);
          idTokenStore.delete(payload.userId); // one-time use
        }
      } catch (_e) {
        // Token invalid/expired — proceed without id_token_hint
      }
    }
  }

  try {
    const { config, lib } = await getOidc();

    // Build end session URL parameters.
    // When id_token_hint is provided, IdentityServer skips the
    // "Do you really want to logout?" confirmation page and honours
    // post_logout_redirect_uri to redirect back to the home page.
    // client_id helps IdentityServer validate post_logout_redirect_uri
    // even when id_token_hint is unavailable.
    const endSessionParams = {
      post_logout_redirect_uri: postLogoutRedirect,
      client_id: process.env.OIDC_CLIENT_ID,
    };
    if (idTokenHint) {
      endSessionParams.id_token_hint = idTokenHint;
    }

    // openid-client v6 exposes buildEndSessionUrl(config, params)
    if (typeof lib.buildEndSessionUrl === 'function') {
      const endUrl = lib.buildEndSessionUrl(config, endSessionParams);
      return res.redirect(endUrl.href);
    }

    // Fallback: try to read end_session_endpoint from server metadata
    const meta =
      (typeof config.serverMetadata === 'function' && config.serverMetadata()) ||
      config.serverMetadata ||
      {};
    const endSessionEndpoint = meta.end_session_endpoint;
    if (endSessionEndpoint) {
      const url = new URL(endSessionEndpoint);
      url.searchParams.set('post_logout_redirect_uri', postLogoutRedirect);
      if (process.env.OIDC_CLIENT_ID) {
        url.searchParams.set('client_id', process.env.OIDC_CLIENT_ID);
      }
      if (idTokenHint) {
        url.searchParams.set('id_token_hint', idTokenHint);
      }
      return res.redirect(url.href);
    }

    // Provider does not advertise end_session — best effort: just go home.
    return res.redirect(postLogoutRedirect);
  } catch (e) {
    console.error('[OIDC] Logout failed, falling back to home redirect:', e.message);
    return res.redirect(postLogoutRedirect);
  }
});


/* ────────────────── helpers ────────────────── */

/**
 * Load attendee emails from attendees.json.
 * Returns { emails: Set<string>, prefixes: Set<string> } (all lowercase).
 */
let _attendeeEmailCache = null;
function loadAttendeeEmails() {
  if (_attendeeEmailCache) return _attendeeEmailCache;
  try {
    const filePath = path.join(__dirname, '..', '..', 'data', 'attendees.json');
    const list = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const emails = new Set();
    const prefixes = new Set();
    for (const att of list) {
      const e = (att.email || '').trim().toLowerCase();
      if (e) {
        emails.add(e);
        const prefix = e.split('@')[0];
        if (prefix) prefixes.add(prefix);
      }
    }
    _attendeeEmailCache = { emails, prefixes };
  } catch (err) {
    console.error('[Auth] Failed to load attendees.json for email matching:', err.message);
    _attendeeEmailCache = { emails: new Set(), prefixes: new Set() };
  }
  return _attendeeEmailCache;
}

/**
 * Check if a login email belongs to an attendee.
 * Matches by full email or by email prefix (the part before @).
 */
function isAttendeeEmail(email) {
  const { emails, prefixes } = loadAttendeeEmails();
  const lower = email.toLowerCase();
  if (emails.has(lower)) return true;
  const prefix = lower.split('@')[0];
  return prefix ? prefixes.has(prefix) : false;
}

/**
 * Look up the Attendee row for a given email.
 * Returns { nameEn, nameCn, photoUrl } or null.
 */
async function lookupAttendeeProfile(email) {
  try {
    const att = await prisma.attendee.findFirst({
      where: { email: email.toLowerCase(), isActive: true },
      select: { nameEn: true, nameCn: true, photoUrl: true },
    });
    return att || null;
  } catch (_e) {
    return null;
  }
}

async function findOrCreateUser(email, oidcName) {
  const isAttendee = isAttendeeEmail(email);
  const profile = await lookupAttendeeProfile(email);

  // Display name priority: Attendee.nameEn > Attendee.nameCn > OIDC name > email prefix
  const preferredNickname =
    profile?.nameEn || profile?.nameCn || oidcName || email.split('@')[0];

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const isAdmin = ADMIN_EMAILS.includes(email);
    user = await prisma.user.create({
      data: {
        email,
        nickname: preferredNickname,
        isAttendee,
        isAdmin,
      },
    });
  } else {
    const updates = {};

    // Promote to admin if admin list was updated
    if (ADMIN_EMAILS.includes(email) && !user.isAdmin) {
      updates.isAdmin = true;
    }
    // Promote to attendee if attendee list was updated
    if (isAttendee && !user.isAttendee) {
      updates.isAttendee = true;
    }
    // Force nickname to English name if the attendee record provides one
    // (overrides historical Chinese names from OIDC userinfo.name)
    if (profile?.nameEn && user.nickname !== profile.nameEn) {
      updates.nickname = profile.nameEn;
    } else if (
      !profile &&
      oidcName &&
      user.nickname === user.email.split('@')[0]
    ) {
      // Non-attendee users: only set nickname on first OIDC login
      updates.nickname = oidcName;
    }

    if (Object.keys(updates).length > 0) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: updates,
      });
    }
  }

  return user;
}

function sanitize(u) {
  const isSuperAdmin = ADMIN_EMAILS.includes(u.email.toLowerCase());
  let adminPermissions = null;
  if (u.isAdmin) {
    if (isSuperAdmin) {
      // Super admins have access to all admin pages (null = all)
      adminPermissions = null;
    } else {
      // Parse stored permissions
      try {
        adminPermissions = u.adminPermissions ? JSON.parse(u.adminPermissions) : [];
      } catch {
        adminPermissions = [];
      }
    }
  }
  return {
    id: u.id,
    email: u.email,
    nickname: u.nickname,
    isAttendee: u.isAttendee,
    isAdmin: u.isAdmin,
    isSuperAdmin,
    role: isSuperAdmin ? 'superadmin' : (u.role || 'user'),
    adminPermissions,
  };
}

module.exports = router;
