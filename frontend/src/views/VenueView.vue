<template>
  <div>
    <!-- hero -->
    <section class="hero-bg text-white py-14 sm:py-16">
      <div class="container-x">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div class="flex-1 text-center lg:text-left">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 text-xs tracking-widest uppercase">
              <font-awesome-icon icon="location-dot" class="mr-1" />
              {{ heroLabel }}
            </div>
            <h1 class="mt-4 text-4xl sm:text-5xl font-extrabold">{{ venueLocation }}</h1>
            <div class="mt-4 flex flex-wrap gap-3 lg:justify-start justify-center">
              <router-link to="/schedule" class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/80 ring-1 ring-white/20 hover:bg-white/20 hover:text-white transition">
                <font-awesome-icon icon="calendar-days" /> 日程安排
              </router-link>
              <router-link to="/meeting-guide" class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/80 ring-1 ring-white/20 hover:bg-white/20 hover:text-white transition">
                <font-awesome-icon icon="circle-info" /> 会议须知
              </router-link>
            </div>
          </div>
          <div class="flex-shrink-0 flex justify-center lg:justify-end">
            <WeatherCard />
          </div>
        </div>
      </div>
    </section>

    <section class="section-y">
      <div class="container-x">
        <!-- venue info card -->
        <div class="bg-white rounded-md shadow-soft p-6 sm:p-8 mb-8">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div class="space-y-4">
              <h2 class="text-2xl font-bold text-brand-deep flex items-center gap-2">
                <font-awesome-icon icon="map-location-dot" class="text-brand-blue" />
                会议地点
              </h2>
              <div class="space-y-2 text-slate-600 text-sm sm:text-base">
                <p>
                  <span class="font-semibold text-slate-700">会场：</span>
                  {{ venueLocation }}
                </p>
                <p>
                  <span class="font-semibold text-slate-700">地址：</span>
                  {{ venueAddress }}
                </p>
              </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
              <a
                :href="navUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-primary !px-6 !py-3 inline-flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <font-awesome-icon icon="location-dot" />
                到这里去
              </a>
              <a
                :href="mapSearchUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-brand-blue bg-brand-blue/10 rounded-full hover:bg-brand-blue/20 transition"
              >
                <font-awesome-icon icon="map" />
                在百度地图中打开
              </a>
            </div>
          </div>
        </div>

        <!-- embedded map -->
        <div class="bg-white rounded-md shadow-soft overflow-hidden border border-slate-200">
          <div class="relative w-full" style="height: 500px">
            <iframe
              :src="mapEmbedUrl"
              class="absolute inset-0 w-full h-full border-0"
              allowfullscreen
              loading="lazy"
              referrerpolicy="no-referrer"
            ></iframe>
          </div>
        </div>

        <!-- tips -->
        <div class="mt-6 text-center text-xs text-slate-400">
          <p>提示：在手机上点击「到这里去」按钮可直接打开百度地图进行导航</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api';
import WeatherCard from '../components/WeatherCard.vue';

const meetingInfo = ref(null);

// Hero text from nav
const heroLabel = ref('会议地点');

const venueLocation = computed(() => meetingInfo.value?.location || '耀华国际教育学校（亦庄校区）');
const venueAddress = computed(() => meetingInfo.value?.address || '北京市大兴区经济技术开发区凉水河二街29号院');

// Baidu Map search URL (for opening in new tab)
const mapSearchUrl = computed(() =>
  `https://map.baidu.com/search/${encodeURIComponent(venueLocation.value)}`
);

// Baidu Map embed URL for iframe
const mapEmbedUrl = computed(() =>
  `https://map.baidu.com/poi/${encodeURIComponent(venueLocation.value)}/@12972201.41,4804985.05,19z?uid=d78a4c8e525ae4cf9ff77921&ugc_type=3&ugc_ver=1&device_ratio=2&compat=1&pcevaname=pc4.1&querytype=detailConInfo&da_src=shareurl`
);

// Baidu Map navigation URL
const navUrl = computed(() =>
  `https://api.map.baidu.com/direction?destination=${encodeURIComponent(venueLocation.value)}&mode=driving&output=html&src=webapp`
);

async function load() {
  try {
    const { data } = await api.get('/meeting');
    if (data) meetingInfo.value = data;
  } catch (e) {
    console.error('[VenueView] failed to load meeting info', e);
  }
}

async function loadHero() {
  try {
    const { data } = await api.get('/nav');
    const link = (data?.links || []).find(l => l.to === '/venue');
    if (link) {
      heroLabel.value = link.label || '会议地点';
    }
  } catch { /* use defaults */ }
}

onMounted(() => {
  load();
  loadHero();
});
</script>
