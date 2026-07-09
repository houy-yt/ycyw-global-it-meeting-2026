<template>
  <div>
    <!-- ============ HERO ============ -->
    <section class="hero-bg text-white py-12">
      <div class="container-x flex items-center gap-3">
        <div class="chip-orange bg-white/10 !text-brand-orange ring-1 ring-white/20">管理后台</div>
        <h1 class="text-3xl sm:text-4xl font-extrabold">Admin Console</h1>
      </div>
    </section>

    <!-- ============ SIDEBAR + CONTENT ============ -->
    <section class="section-y">
      <div class="container-x">
        <!-- Mobile: hamburger toggle -->
        <div class="lg:hidden mb-4">
          <button
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white ring-1 ring-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            @click="sidebarOpen = !sidebarOpen"
          >
            <font-awesome-icon icon="bars" />
            {{ currentLabel }}
            <font-awesome-icon :icon="sidebarOpen ? 'chevron-up' : 'chevron-right'" class="text-xs text-slate-400" />
          </button>
        </div>

        <div class="flex gap-6">
          <!-- Sidebar -->
          <aside
            class="flex-shrink-0 w-56"
            :class="{ 'hidden lg:block': !sidebarOpen, 'block': sidebarOpen }"
          >
            <nav class="sticky top-24 space-y-1">
              <div
                v-for="(group, gIdx) in menuGroups"
                :key="group.title"
                :class="gIdx > 0 ? 'mt-3' : ''"
              >
                <div class="flex items-center gap-2 pt-1 pb-2 pl-3">
                  <span class="w-3 h-px bg-slate-300"></span>
                  <span class="text-[11px] font-semibold tracking-wider text-slate-400 whitespace-nowrap">
                    {{ group.title }}
                  </span>
                  <span class="flex-1 h-px bg-slate-200"></span>
                </div>
                <ul class="space-y-0.5">
                  <li v-for="item in group.items" :key="item.key">
                    <button
                      class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                      :class="tab === item.key
                        ? 'bg-brand-blue/10 text-brand-blue font-semibold shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
                      @click="selectTab(item.key)"
                    >
                      <font-awesome-icon
                        :icon="item.icon"
                        class="w-4 text-center"
                        :class="tab === item.key ? 'text-brand-blue' : 'text-slate-400'"
                      />
                      <span>{{ item.label }}</span>
                    </button>
                  </li>
                </ul>
              </div>
            </nav>
          </aside>

          <!-- Content -->
          <main class="flex-1 min-w-0">
            <h2 class="text-xl font-bold text-brand-deep mb-4">{{ currentLabel }}</h2>
            <div class="bg-white rounded-xl ring-1 ring-slate-100 shadow-soft p-6 sm:p-8">
              <AdminMeeting v-if="tab === 'meeting'" />
              <AdminSchedule v-if="tab === 'schedule'" />
              <AdminMeetingGuide v-if="tab === 'meetingGuide'" />
              <AdminAttendees v-if="tab === 'attendees'" />
              <AdminDepartments v-if="tab === 'departments'" />
              <AdminOrganizations v-if="tab === 'organizations'" />
              <AdminReflections v-if="tab === 'reflections'" />
              <AdminAnalytics v-if="tab === 'analytics'" />
              <AdminGallery v-if="tab === 'gallery'" />
              <AdminPast v-if="tab === 'past'" />
              <AdminNotification v-if="tab === 'notification'" />
              <AdminSettings v-if="tab === 'settings'" />
              <AdminPermissions v-if="tab === 'permissions'" />
              <AdminFileManager v-if="tab === 'fileManager'" />
              <AdminHomeSections v-if="tab === 'homeSections'" />
              <AdminAdmins v-if="tab === 'users'" />
              <AdminFaIcons v-if="tab === 'faIcons'" />
            </div>
          </main>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import AdminMeeting from './admin/AdminMeeting.vue';
import AdminSchedule from './admin/AdminSchedule.vue';
import AdminMeetingGuide from './admin/AdminMeetingGuide.vue';
import AdminAttendees from './admin/AdminAttendees.vue';
import AdminDepartments from './admin/AdminDepartments.vue';
import AdminOrganizations from './admin/AdminOrganizations.vue';
import AdminReflections from './admin/AdminReflections.vue';
import AdminAnalytics from './admin/AdminAnalytics.vue';
import AdminGallery from './admin/AdminGallery.vue';
import AdminPast from './admin/AdminPast.vue';
import AdminNotification from './admin/AdminNotification.vue';
import AdminSettings from './admin/AdminSettings.vue';
import AdminPermissions from './admin/AdminPermissions.vue';
import AdminFileManager from './admin/AdminFileManager.vue';
import AdminFaIcons from './admin/AdminFaIcons.vue';
import AdminHomeSections from './admin/AdminHomeSections.vue';
import AdminAdmins from './admin/AdminAdmins.vue';
import { adminMenuGroups } from '../config/adminMenu';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const tab = ref('');
const sidebarOpen = ref(false);

/**
 * Filter menu groups based on the current admin's permissions.
 * - Super admins (adminPermissions === null) see everything.
 * - Regular admins only see items whose key is in their adminPermissions array,
 *   plus any item they have explicit access to.
 * - Items marked `superAdminOnly` are only shown to super admins.
 */
const menuGroups = computed(() => {
  const perms = auth.adminPermissions; // null = super admin (all), or string[]
  const isSuperAdmin = auth.isSuperAdmin;

  return adminMenuGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        // superAdminOnly items only for super admins
        if (item.superAdminOnly && !isSuperAdmin) return false;
        // Super admin sees all
        if (perms === null) return true;
        // Regular admin: check permissions
        return perms.includes(item.key);
      }),
    }))
    .filter((g) => g.items.length > 0);
});

const allItems = computed(() => menuGroups.value.flatMap((g) => g.items));

const currentLabel = computed(() => {
  const item = allItems.value.find((i) => i.key === tab.value);
  return item ? item.label : '';
});

// Auto-select first available tab
watch(
  menuGroups,
  (groups) => {
    const keys = groups.flatMap((g) => g.items.map((i) => i.key));
    if (!tab.value || !keys.includes(tab.value)) {
      tab.value = keys[0] || '';
    }
  },
  { immediate: true },
);

function selectTab(key) {
  tab.value = key;
  sidebarOpen.value = false;
}
</script>
