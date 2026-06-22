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

router.beforeEach((to, from, next) => {
  const auth = useAuthStore();
  if (to.meta.requiresAdmin) {
    if (!auth.isLoggedIn) {
      if (auth.oidcEnabled) {
        // OIDC mode: redirect to external OIDC via backend
        const params = new URLSearchParams({ redirect: to.fullPath });
        window.location.href = `/api/auth/oidc-login?${params.toString()}`;
        return; // stop navigation
      } else {
        // Mock mode: open AuthModal popup
        auth.openLogin(to.fullPath);
        return next('/');
      }
    }
    if (!auth.isAdmin) {
      return next('/');
    }
  }
  next();
});

export default router;
