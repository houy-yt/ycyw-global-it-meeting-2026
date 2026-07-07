<template>
  <footer class="mt-12 bg-brand-deep text-white">
    <div class="container-x py-6 sm:py-10 grid gap-4 sm:gap-8 sm:grid-cols-[1fr_auto_1fr]">
      <!-- Brand -->
      <div>
        <div class="flex items-center gap-2 sm:gap-3" v-if="fs.showLogo || fs.showSiteName">
          <img
            v-if="fs.showLogo"
            :src="siteLogoUrl || '/logo.gif'"
            alt="YCYW"
            class="h-8 sm:h-10 w-auto bg-white rounded p-1"
          />
          <div v-if="fs.showSiteName">
            <div class="text-sm sm:text-base font-semibold">YCYW</div>
            <div class="text-[10px] sm:text-xs text-white/70">{{ meetingInfo?.name || '2026 Global IT Meeting' }}</div>
          </div>
        </div>
        <template v-if="fs.showMeetingName">
          <p class="mt-2 sm:mt-4 text-xs sm:text-sm text-white/70 leading-relaxed" style="white-space: pre-line">
            {{ meetingInfo?.tagline || '连接 · 创新 · 未来。一年一度的 YCYW 全球 IT 同仁聚会。' }}
          </p>
          <p v-if="meetingInfo?.taglineEn" class="mt-1 text-[10px] sm:text-xs text-white/50" style="white-space: pre-line">
            {{ meetingInfo.taglineEn }}
          </p>
        </template>
      </div>

      <!-- Quick Nav - hidden on mobile -->
      <div class="hidden sm:block">
        <div class="text-sm font-semibold mb-3">快速导航</div>
        <ul class="text-sm text-white/80 grid grid-cols-4 gap-x-6 gap-y-2">
          <li v-for="l in footerLinks" :key="l.to">
            <router-link :to="l.to" class="hover:text-brand-orange">{{ l.label }}</router-link>
          </li>
        </ul>
      </div>

      <!-- Contact -->
      <div class="sm:ml-auto" v-if="hasContactContent">
        <div class="text-sm font-semibold mb-3 hidden sm:block">联系</div>
        <ul class="text-[11px] sm:text-sm space-y-1 sm:space-y-2 text-white/80">
          <li v-if="fs.showMeetingTime">{{ fs.meetingTimeLabel }}：{{ formattedDateRange }}</li>
          <li v-if="fs.showMeetingLocation">{{ fs.meetingLocationLabel }}：{{ meetingInfo?.location || '北京' }}</li>
          <li v-if="fs.showOrganizer">{{ fs.organizerLabel }}：{{ meetingInfo?.organizer || 'YCYW Education' }}</li>
          <li v-for="(field, idx) in customFields" :key="'cf-' + idx">{{ field.label }}：{{ field.value }}</li>
        </ul>
      </div>
    </div>
    <div class="border-t border-white/10">
      <div class="container-x py-3 sm:py-4 text-[10px] sm:text-xs text-white/60 flex flex-col items-center text-center sm:flex-row sm:items-stretch sm:text-left sm:justify-between gap-1 sm:gap-2">
        <div>© {{ year }} {{ meetingInfo?.organizer || 'YCYW Education' }}. All rights reserved.</div>
        <div>Powered by Yaotong ( YCYW IT R&D Team )</div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import api from '../api';

const year = new Date().getFullYear();

const meetingInfo = ref(null);
const allLinks = ref([]);
const siteLogoUrl = ref('');

// Footer settings with defaults
const fs = reactive({
  showLogo: true,
  showSiteName: true,
  showMeetingName: false,
  showMeetingTime: true,
  showMeetingLocation: true,
  showOrganizer: true,
  meetingTimeLabel: '会议时间',
  meetingLocationLabel: '会议地点',
  organizerLabel: '主办方',
});

const customFields = ref([]);

// Default fallback links for footer
const defaultFooterLinks = [
  { label: '日程安排', to: '/schedule', heroTitle: '日程安排', heroSubtitle: '' },
  { label: '参会人员', to: '/attendees', heroTitle: 'Meet the Team', heroSubtitle: '' },
  { label: '会后反思', to: '/reflections', heroTitle: '会后反思', heroSubtitle: '记录你的收获、想法与建议' },
  { label: '会议剪影', to: '/gallery', heroTitle: 'Gallery', heroSubtitle: '照片 · 视频 · 第三方链接' },
  { label: '往届会议', to: '/past-meetings', heroTitle: 'Past Meetings', heroSubtitle: '回顾每一届 YCYW Global IT Meeting' },
];

const footerLinks = computed(() => {
  const filtered = allLinks.value.filter(l => l.showInFooter);
  return filtered.length > 0 ? filtered : defaultFooterLinks;
});

// Whether there's any contact content to show
const hasContactContent = computed(() => {
  return fs.showMeetingTime || fs.showMeetingLocation || fs.showOrganizer || customFields.value.length > 0;
});

/**
 * Format startDate / endDate into a human-friendly Chinese date range.
 * e.g. "2026-07-14" + "2026-07-16" → "2026 年 7 月 14 - 16 日"
 */
const formattedDateRange = computed(() => {
  if (!meetingInfo.value?.startDate || !meetingInfo.value?.endDate) {
    return '2026 年 7 月 14 - 16 日';
  }
  const s = new Date(meetingInfo.value.startDate);
  const e = new Date(meetingInfo.value.endDate);
  const sy = s.getFullYear();
  const sm = s.getMonth() + 1;
  const sd = s.getDate();
  const em = e.getMonth() + 1;
  const ed = e.getDate();
  if (sm === em) {
    return `${sy} 年 ${sm} 月 ${sd} - ${ed} 日`;
  }
  return `${sy} 年 ${sm} 月 ${sd} 日 - ${em} 月 ${ed} 日`;
});

async function loadNav() {
  try {
    const { data } = await api.get('/nav');
    if (data?.links?.length) {
      allLinks.value = data.links;
    }
    if (data?.meetingInfo) {
      meetingInfo.value = data.meetingInfo;
    }
    // Site logo
    if (data?.siteLogoUrl) {
      siteLogoUrl.value = data.siteLogoUrl;
    }
    // Footer settings
    if (data?.footerSettings && typeof data.footerSettings === 'object') {
      const fst = data.footerSettings;
      fs.showLogo = fst.showLogo !== false;
      fs.showSiteName = fst.showSiteName !== false;
      fs.showMeetingName = !!fst.showMeetingName;
      fs.showMeetingTime = fst.showMeetingTime !== false;
      fs.showMeetingLocation = fst.showMeetingLocation !== false;
      fs.showOrganizer = fst.showOrganizer !== false;
      fs.meetingTimeLabel = fst.meetingTimeLabel || '会议时间';
      fs.meetingLocationLabel = fst.meetingLocationLabel || '会议地点';
      fs.organizerLabel = fst.organizerLabel || '主办方';
      customFields.value = Array.isArray(fst.customFields) ? fst.customFields.filter(f => f.label && f.value && f.visible !== false) : [];
    }
  } catch (e) {
    console.error('[Footer] failed to load nav', e);
  }
}

onMounted(loadNav);
</script>
