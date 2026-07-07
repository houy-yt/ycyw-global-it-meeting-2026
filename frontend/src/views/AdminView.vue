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
              <AdminAnnouncements v-if="tab === 'announce'" />
              <AdminNotification v-if="tab === 'notification'" />
              <AdminSettings v-if="tab === 'settings'" />
              <AdminFaIcons v-if="tab === 'faIcons'" />
            </div>
          </main>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
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
import AdminAnnouncements from './admin/AdminAnnouncements.vue';
import AdminNotification from './admin/AdminNotification.vue';
import AdminSettings from './admin/AdminSettings.vue';
import AdminFaIcons from './admin/AdminFaIcons.vue';

const tab = ref('meeting');
const sidebarOpen = ref(false);

const menuGroups = [
  {
    title: '会议管理',
    items: [
      { key: 'meeting',      label: '会议信息',  icon: 'circle-info' },
      { key: 'schedule',     label: '日程安排',  icon: 'calendar-days' },
      { key: 'meetingGuide', label: '参会须知',  icon: 'clipboard-check' },
      { key: 'notification', label: '发送通知',  icon: 'paper-plane' },
    ],
  },
  {
    title: '人员与组织',
    items: [
      { key: 'attendees',     label: '参会人员',  icon: 'users' },
      { key: 'departments',   label: '部门维护',  icon: 'building' },
      { key: 'organizations', label: '组织维护',  icon: 'globe' },
    ],
  },
  {
    title: '内容管理',
    items: [
      { key: 'reflections', label: '反思管理',  icon: 'comments' },
      { key: 'gallery',     label: '剪影管理',  icon: 'images' },
      { key: 'announce',    label: '公告管理',  icon: 'bullhorn' },
      { key: 'past',        label: '往届会议',  icon: 'clock-rotate-left' },
    ],
  },
  {
    title: '数据与设置',
    items: [
      { key: 'analytics', label: '数据分析',  icon: 'chart-bar' },
      { key: 'settings',  label: '系统设置',  icon: 'gear' },
      { key: 'faIcons',   label: 'FA图标库',  icon: 'icons' },
    ],
  },
];

const allItems = menuGroups.flatMap((g) => g.items);

const currentLabel = computed(() => {
  const item = allItems.find((i) => i.key === tab.value);
  return item ? item.label : '';
});

function selectTab(key) {
  tab.value = key;
  sidebarOpen.value = false;
}
</script>
