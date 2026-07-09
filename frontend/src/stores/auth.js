import { defineStore } from 'pinia';
import api from '../api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '',
    idToken: '',
    user: null,
    showLogin: false,
    loginRedirect: null,
    loginAction: null,
    oidcEnabled: false,
    whitelist: [],
    configLoaded: false,
  }),
  getters: {
    isLoggedIn: (s) => !!s.token && !!s.user,
    isAdmin: (s) => !!s.user?.isAdmin,
    isSuperAdmin: (s) => !!s.user?.isSuperAdmin,
    /** User role: 'superadmin' | 'admin' | 'auditor' | 'editor' | 'user' */
    userRole: (s) => s.user?.role || 'user',
    /**
     * Admin permissions array. null = super admin (all access).
     * Array of admin page keys for regular admins.
     */
    adminPermissions: (s) => {
      if (!s.user?.isAdmin) return [];
      if (s.user?.isSuperAdmin) return null; // null = all
      return Array.isArray(s.user?.adminPermissions) ? s.user.adminPermissions : [];
    },
    isAttendee: (s) => !!s.user?.isAttendee,
    /**
     * Whether a given route path is allowed without login (in the whitelist).
     * Returns a function so it can be called with a path argument.
     */
    isWhitelisted: (s) => (path) => {
      if (!path) return false;
      // Normalize: strip trailing slash (except root) and query/hash
      const clean = path.split('?')[0].split('#')[0];
      const norm = clean.length > 1 ? clean.replace(/\/+$/, '') : clean;
      return s.whitelist.some((p) => {
        const pn = p.length > 1 ? p.replace(/\/+$/, '') : p;
        return pn === norm;
      });
    },

    /**
     * Display name for the currently logged-in user.
     * Priority: nickname (which the backend keeps in sync with Attendee.nameEn)
     *           → email prefix → '游客'.
     * If the legacy nickname looks like a CJK string we drop back to the email
     * prefix so the navbar shows e.g. "ying.hou" instead of "侯英".
     */
    displayName: (s) => {
      const nick = s.user?.nickname;
      const emailPrefix = s.user?.email ? s.user.email.split('@')[0] : '';
      if (!s.user) return '游客';
      if (nick && !/[\u4e00-\u9fa5]/.test(nick)) return nick;
      return emailPrefix || nick || '游客';
    },
  },
  actions: {
    hydrate() {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const idToken = localStorage.getItem('id_token');
      if (token && userStr) {
        try {
          this.token = token;
          this.user = JSON.parse(userStr);
          this.idToken = idToken || '';
        } catch (e) {
          this.token = '';
          this.user = null;
          this.idToken = '';
        }
      }
    },

    /** Fetch OIDC mode + page whitelist from backend */
    async fetchConfig() {
      try {
        const { data } = await api.get('/auth/config');
        this.oidcEnabled = !!data.oidcEnabled;
        this.whitelist = Array.isArray(data.whitelist) ? data.whitelist : [];
      } catch (e) {
        // Default to false if backend is unreachable
        this.oidcEnabled = false;
        this.whitelist = [];
      } finally {
        this.configLoaded = true;
      }
    },


    async login(email) {
      const { data } = await api.post('/auth/login', { email });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    },

    /** Set token directly (used by OIDC callback) */
    setToken(token) {
      this.token = token;
      localStorage.setItem('token', token);
    },

    /** Set OIDC id_token (used by OIDC callback for logout id_token_hint) */
    setIdToken(idToken) {
      this.idToken = idToken || '';
      if (idToken) {
        localStorage.setItem('id_token', idToken);
      } else {
        localStorage.removeItem('id_token');
      }
    },

    async fetchMe() {
      if (!this.token) return null;
      try {
        const { data } = await api.get('/auth/me');
        this.user = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
      } catch (e) {
        this.logout();
        return null;
      }
    },

    logout() {
      this.token = '';
      this.idToken = '';
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('id_token');
      localStorage.removeItem('user');
    },

    /** Open the mock login modal (OIDC_ENABLED=false only) */
    openLogin(redirect, action) {
      this.showLogin = true;
      this.loginRedirect = redirect || null;
      this.loginAction = action || null;
    },

    closeLogin() {
      this.showLogin = false;
      this.loginRedirect = null;
      this.loginAction = null;
    },

    /**
     * Require login — dual mode.
     * OIDC mode: redirect to backend /api/auth/oidc-login (full page redirect to external OIDC).
     * Mock mode: open AuthModal popup.
     * @param {import('vue-router').Router|null} router - Vue Router instance (used in mock mode)
     * @param {string} redirect - Path to redirect to after login
     * @param {string} [action] - Optional action to trigger after redirect (e.g. 'publish', 'upload')
     */
    requireLogin(router, redirect, action) {
      if (this.oidcEnabled) {
        // Production: redirect to external OIDC via backend
        const params = new URLSearchParams();
        if (redirect) params.set('redirect', redirect);
        if (action) params.set('action', action);
        window.location.href = `/api/auth/oidc-login?${params.toString()}`;
      } else {
        // Development: open AuthModal popup
        this.openLogin(redirect, action);
      }
    },
  },
});
