import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/schedule', name: 'schedule', component: () => import('../views/ScheduleView.vue') },
  { path: '/venue', name: 'venue', component: () => import('../views/VenueView.vue') },
  { path: '/meeting-guide', name: 'meeting-guide', component: () => import('../views/MeetingGuideView.vue') },
  { path: '/entry-guide', name: 'entry-guide', component: () => import('../views/EntryGuideView.vue') },
  { path: '/attendees', name: 'attendees', component: () => import('../views/AttendeesView.vue') },
  {
    path: '/reflections',
    name: 'reflections',
    component: () => import('../views/ReflectionsView.vue'),
  },
  { path: '/gallery', name: 'gallery', component: () => import('../views/GalleryView.vue') },
  {
    path: '/past-meetings',
    name: 'past-meetings',
    component: () => import('../views/PastMeetingsView.vue'),
  },
  {
    path: '/weather',
    name: 'weather',
    component: () => import('../views/WeatherView.vue'),
  },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
  {
    path: '/auth/callback',
    name: 'oidc-callback',
    component: () => import('../views/OidcCallbackView.vue'),
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAdmin: true },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

// Routes that are always accessible without login (login flow itself)
const PUBLIC_ROUTES = new Set(['login', 'oidc-callback']);

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();

  // Ensure config (oidcEnabled + whitelist) is loaded before evaluating access.
  // Handles direct URL entry / page refresh where App.vue's onMounted hasn't run yet.
  if (!auth.configLoaded) {
    await auth.fetchConfig();
  }

  // Login-flow routes are always allowed
  if (PUBLIC_ROUTES.has(to.name)) {
    return next();
  }

  // Admin routes: must be logged in AND be an admin
  if (to.meta.requiresAdmin) {
    if (!auth.isLoggedIn) {
      if (auth.oidcEnabled) {
        // OIDC mode: redirect to external OIDC via backend
        const params = new URLSearchParams({ redirect: to.fullPath });
        window.location.href = `/api/auth/oidc-login?${params.toString()}`;
        return; // stop navigation
      } else {
        // Mock mode: redirect to login page
        return next({ path: '/login', query: { redirect: to.fullPath } });
      }
    }
    if (!auth.isAdmin) {
      return next('/');
    }
    return next();
  }

  // All other pages require login unless whitelisted (accessible anonymously)
  if (!auth.isLoggedIn && !auth.isWhitelisted(to.path)) {
    if (auth.oidcEnabled) {
      // OIDC mode: redirect to external OIDC via backend
      const params = new URLSearchParams({ redirect: to.fullPath });
      window.location.href = `/api/auth/oidc-login?${params.toString()}`;
      return; // stop navigation
    } else {
      // Mock mode: redirect to login page with return path
      return next({ path: '/login', query: { redirect: to.fullPath } });
    }
  }

  next();
});


export default router;
