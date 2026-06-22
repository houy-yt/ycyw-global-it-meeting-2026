<template>
  <header class="sticky top-0 z-40 nav-glass border-b border-slate-200/60">
    <div class="w-full px-4 sm:px-6 lg:px-10 flex items-center justify-between h-16">
      <router-link to="/" class="flex items-center gap-3 min-w-0">
        <img src="/logo.gif" alt="YCYW" class="h-12 w-auto flex-shrink-0" />
        <div
          class="hidden md:block text-sm sm:text-base font-semibold text-brand-deep whitespace-nowrap tracking-tight"
        >
          YCYW 2026 Global IT Meeting
        </div>
      </router-link>

      <!-- desktop nav -->
      <nav class="hidden md:flex items-center gap-1">
        <router-link
          v-for="l in navLinks"
          :key="l.to"
          :to="l.to"
          class="px-3 py-2 text-sm font-medium text-slate-600 rounded-full hover:bg-brand-blue/5 hover:text-brand-blue transition relative"
          active-class="!text-brand-blue !bg-transparent nav-active-underline"
        >
          {{ l.label }}
        </router-link>
        <router-link
          v-if="auth.isAdmin"
          to="/admin"
          class="px-3 py-2 text-sm font-medium text-brand-red rounded-full hover:bg-brand-red/5 transition"
          active-class="!bg-brand-red/10"
        >
          管理后台
        </router-link>
      </nav>

      <!-- right -->
      <div class="flex items-center gap-2">
        <template v-if="auth.isLoggedIn">
          <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-blue/5">
            <div
              class="h-7 w-7 rounded-full bg-brand-blue text-white text-xs font-bold flex items-center justify-center"
            >
              {{ initial }}
            </div>
            <span class="text-sm text-brand-deep font-medium max-w-[120px] truncate">
              {{ auth.displayName }}
            </span>
          </div>
          <button
            class="text-xs text-slate-500 hover:text-brand-red px-2 py-1 inline-flex items-center gap-1"
            @click="handleLogout"
          >
            <font-awesome-icon icon="right-from-bracket" /> 退出
          </button>
        </template>
        <template v-else>
          <button class="btn-primary !px-4 !py-2 !text-xs" @click="onAdminClick">
            <font-awesome-icon icon="gear" class="mr-1" /> 管理员登录
          </button>
        </template>

        <button class="md:hidden p-2" @click="mobileOpen = !mobileOpen" aria-label="menu">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 text-brand-deep"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              v-if="!mobileOpen"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- mobile menu -->
    <transition name="fade">
      <div v-if="mobileOpen" class="md:hidden border-t border-slate-200 bg-white">
        <nav class="w-full px-4 sm:px-6 py-3 grid gap-1">
          <router-link
            v-for="l in navLinks"
            :key="l.to"
            :to="l.to"
            class="px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-brand-blue/5"
            active-class="text-brand-blue bg-brand-blue/10"
            @click="mobileOpen = false"
          >
            {{ l.label }}
          </router-link>
          <router-link
            v-if="auth.isAdmin"
            to="/admin"
            class="px-3 py-2 rounded-lg text-sm text-brand-red hover:bg-brand-red/5"
            @click="mobileOpen = false"
          >
            管理后台
          </router-link>
        </nav>
      </div>
    </transition>
  </header>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../api';

const auth = useAuthStore();
const router = useRouter();
const mobileOpen = ref(false);

function onAdminClick() {
  if (auth.isAdmin) {
    router.push('/admin');
  } else {
    auth.requireLogin(router, '/admin');
  }
}

function handleLogout() {
  auth.logout();
  router.push('/');
}

// Default fallback links
const defaultLinks = [
  { to: '/', label: '首页', showInNav: true, showInFooter: false, heroTitle: '', heroSubtitle: '' },
  { to: '/schedule', label: '日程安排', showInNav: true, showInFooter: true, heroTitle: '日程安排', heroSubtitle: '' },
  { to: '/venue', label: '会议地点', showInNav: true, showInFooter: false, heroTitle: '', heroSubtitle: '' },
  { to: '/meeting-guide', label: '参会须知', showInNav: true, showInFooter: false, heroTitle: 'Meeting Guide', heroSubtitle: '参会前请仔细阅读以下信息，做好出行准备' },
  { to: '/attendees', label: '参会人员', showInNav: true, showInFooter: true, heroTitle: 'Meet the Team', heroSubtitle: '' },
  { to: '/reflections', label: '会后反思', showInNav: true, showInFooter: true, heroTitle: '会后反思', heroSubtitle: '记录你的收获、想法与建议' },
  { to: '/gallery', label: '会议剪影', showInNav: true, showInFooter: true, heroTitle: 'Gallery', heroSubtitle: '照片 · 视频 · 第三方链接' },
  { to: '/past-meetings', label: '往届会议', showInNav: false, showInFooter: true, heroTitle: 'Past Meetings', heroSubtitle: '回顾每一届 YCYW Global IT Meeting' },
  { to: '/entry-guide', label: '入校指引', showInNav: false, showInFooter: false, heroTitle: 'Campus Entry Guide', heroSubtitle: '参会访客入校申请填写指引，请使用微信扫描右侧二维码完成申请' },
];

const allLinks = ref([...defaultLinks]);

// Only show links where showInNav is true
const navLinks = computed(() => allLinks.value.filter(l => l.showInNav));

async function loadNav() {
  try {
    const { data } = await api.get('/nav');
    if (data?.links?.length) {
      allLinks.value = data.links;
    }
  } catch (e) {
    console.error('[NavBar] failed to load nav', e);
  }
}

onMounted(loadNav);

const initial = computed(() => {
  const n = auth.displayName || '';
  return n.trim().charAt(0).toUpperCase() || 'U';
});
</script>
