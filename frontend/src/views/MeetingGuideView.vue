<template>
  <div>
    <!-- ============ HERO with QR Code ============ -->
    <section class="hero-bg text-white py-14 sm:py-16">
      <div class="container-x">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div class="flex-1 text-center lg:text-left">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 text-xs tracking-widest uppercase">
              <font-awesome-icon icon="circle-info" class="mr-1" />
              {{ heroLabel }}
            </div>
            <h1 class="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">{{ heroTitle }}</h1>
            <p v-if="heroSubtitle" class="mt-3 text-white/70 text-sm sm:text-base lg:whitespace-nowrap">
              {{ heroSubtitle }}
            </p>
            <div class="mt-4 flex flex-wrap gap-3 lg:justify-start justify-center">
              <router-link to="/schedule" class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/80 ring-1 ring-white/20 hover:bg-white/20 hover:text-white transition">
                <font-awesome-icon icon="calendar-days" /> 日程安排
              </router-link>
              <router-link to="/venue" class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/80 ring-1 ring-white/20 hover:bg-white/20 hover:text-white transition">
                <font-awesome-icon icon="location-dot" /> 会议地点
              </router-link>
            </div>
          </div>
          <!-- Right: QR Code + Weather -->
          <div class="flex-shrink-0 flex items-center gap-5 lg:gap-10 justify-center">
            <div class="cursor-pointer" @click="previewQrcode">
              <div class="bg-white rounded-[6px] p-1 shadow-lg">
                <img
                  :src="qrcodeUrl"
                  alt="访客申请二维码"
                  class="w-[100px] h-[100px] rounded-[4px] object-contain bg-white"
                />
              </div>
              <p class="text-white/80 text-xs text-center mt-2">扫码填写进校申请</p>
            </div>
            <div class="hidden lg:block w-px self-stretch bg-white/20"></div>
            <WeatherCard />
          </div>
        </div>
      </div>
    </section>

    <!-- ============ TAB SWITCHER ============ -->
    <section class="section-y">
      <div class="container-x">
        <div class="guide-tabs-bar mb-10">
          <button
            @click="activeTab = 'info'"
            class="guide-tabs-item"
            :class="activeTab === 'info' ? 'guide-tabs-item--active' : ''"
          >
            <font-awesome-icon icon="clipboard-check" />
            <span>参会须知</span>
          </button>
          <button
            @click="activeTab = 'entry'"
            class="guide-tabs-item"
            :class="activeTab === 'entry' ? 'guide-tabs-item--active' : ''"
          >
            <font-awesome-icon icon="signs-post" />
            <span>入校指引</span>
          </button>
        </div>

        <!-- ============ TAB 1: 入校指引 ============ -->
        <div v-show="activeTab === 'entry'">
          <!-- Required fields card -->
          <div class="border border-slate-200 rounded-lg overflow-hidden mb-6">
            <!-- Card header -->
            <div class="px-5 py-3 bg-slate-50 border-b border-slate-200">
              <p class="text-slate-600 text-sm leading-relaxed">
                <font-awesome-icon icon="circle-info" class="text-brand-blue mr-1" />
                访客入校需提前提交申请。表单中大部分字段请根据个人实际情况填写，但以下
                <strong class="text-brand-deep">3 个字段</strong>需要填写固定内容：
              </p>
            </div>
            <!-- 3 fields -->
            <div class="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              <div class="p-5 text-center">
                <div class="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-brand-blue/10 mb-2">
                  <font-awesome-icon icon="building" class="text-brand-blue" />
                </div>
                <div class="text-xs text-slate-400 mb-1">到访部门</div>
                <div class="text-base font-extrabold text-brand-deep">信息技术部 / ITD</div>
              </div>
              <div class="p-5 text-center">
                <div class="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-brand-orange/10 mb-2">
                  <font-awesome-icon icon="file-pen" class="text-brand-orange" />
                </div>
                <div class="text-xs text-slate-400 mb-1">访客事由</div>
                <div class="text-base font-extrabold text-brand-deep">参加 IT 年度会议</div>
              </div>
              <div class="p-5 text-center">
                <div class="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-green-500/10 mb-2">
                  <font-awesome-icon icon="user-check" class="text-green-600" />
                </div>
                <div class="text-xs text-slate-400 mb-1">被访者姓名</div>
                <div class="text-base font-extrabold text-brand-deep">宋磊</div>
              </div>
            </div>
            <!-- Card footer warning -->
            <div class="px-5 py-3 bg-red-50 border-t border-red-100">
              <p class="text-xs text-red-700 flex items-center gap-1.5">
                <font-awesome-icon icon="triangle-exclamation" class="flex-shrink-0" />
                <span>
                  这 3 个字段内容要<strong>严格按固定内容填写</strong>，填写不正确将导致审批不通过
                </span>
              </p>
            </div>
          </div>

          <div
            class="bg-white border border-slate-200 overflow-hidden cursor-pointer group"
            @click="previewImage('/fkzn.jpg', '访客申请表单示例')"
          >
            <div class="relative">
              <img
                src="/fkzn.jpg"
                alt="访客申请表单示例"
                class="w-full object-contain bg-slate-50 transition-transform duration-300 group-hover:scale-[1.01]"
                loading="lazy"
              />
              <div class="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition">
                <font-awesome-icon icon="magnifying-glass-plus" class="mr-1" />
                点击查看大图
              </div>
            </div>
          </div>
          <p class="text-center text-xs text-slate-400 mt-3">
            <font-awesome-icon icon="images" class="mr-1" />
            申请表单示例（点击可放大查看）
          </p>
        </div>

        <!-- ============ TAB 2: 参会须知 ============ -->
        <div v-show="activeTab === 'info'">
          <div v-if="loading" class="text-center text-slate-500 py-10">加载中…</div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="card in guideItems"
              :key="card.id"
              class="card p-5 sm:p-6"
              :class="{ 'md:col-span-2': card.colSpan === 2 }"
            >
              <div class="flex items-center gap-3 mb-4">
                <div class="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0" :class="card.iconBg">
                  <font-awesome-icon :icon="card.icon" class="text-lg" :class="card.iconColor" />
                </div>
                <h3 class="text-lg font-bold text-brand-deep">{{ card.title }}</h3>
              </div>
              <div class="guide-content text-sm text-slate-600 leading-relaxed" v-html="card.content"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Photo Preview Modal -->
    <PhotoPreviewModal
      v-model="previewVisible"
      :src="previewSrc"
      :title="previewTitle"
      type="image"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';
import PhotoPreviewModal from '../components/PhotoPreviewModal.vue';
import WeatherCard from '../components/WeatherCard.vue';

const DEFAULT_QRCODE = '/fksq-qrcode.jpg';
const qrcodeUrl = ref(DEFAULT_QRCODE);
const guideItems = ref([]);
const loading = ref(true);
const activeTab = ref('info');

// Hero text from nav
const heroLabel = ref('参会须知');
const heroTitle = ref('Meeting Guide');
const heroSubtitle = ref('参会前请仔细阅读以下信息，做好出行准备');

const previewVisible = ref(false);
const previewSrc = ref('');
const previewTitle = ref('');

function previewImage(src, title) {
  previewSrc.value = src;
  previewTitle.value = title || '';
  previewVisible.value = true;
}

function previewQrcode() {
  previewImage(qrcodeUrl.value, '访客申请二维码');
}

async function loadData() {
  try {
    const [guideRes, qrRes] = await Promise.all([
      api.get('/meeting-guide'),
      api.get('/entry-guide/settings'),
    ]);
    guideItems.value = guideRes.data || [];
    if (qrRes.data?.qrcodeUrl) qrcodeUrl.value = qrRes.data.qrcodeUrl;
  } catch (e) {
    console.error('[meeting-guide]', e);
  } finally {
    loading.value = false;
  }
}

async function loadHero() {
  try {
    const { data } = await api.get('/nav');
    const link = (data?.links || []).find(l => l.to === '/meeting-guide');
    if (link) {
      heroLabel.value = link.label || '参会须知';
      heroTitle.value = link.heroTitle || link.label || 'Meeting Guide';
      if (link.heroSubtitle) heroSubtitle.value = link.heroSubtitle;
    }
  } catch { /* use defaults */ }
}

onMounted(() => {
  loadData();
  loadHero();
});
</script>

<style scoped>
/* ========== Horizontal Tab Bar ========== */
.guide-tabs-bar {
  display: flex;
  justify-content: center;
  gap: 0;
  border-bottom: 2px solid #e2e8f0;
  position: relative;
}
.guide-tabs-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
}
.guide-tabs-item:hover {
  color: var(--brand-blue, #0032a0);
}
.guide-tabs-item--active {
  color: var(--brand-blue, #0032a0);
  border-bottom-color: var(--brand-blue, #0032a0);
}
.guide-tabs-item--active svg {
  color: var(--brand-blue, #0032a0);
}

/* ========== Guide content HTML styling ========== */
.guide-content :deep(p) {
  margin-bottom: 0.5rem;
}
.guide-content :deep(p:last-child) {
  margin-bottom: 0;
}
.guide-content :deep(strong) {
  color: #334155;
  font-weight: 600;
}
.guide-content :deep(code) {
  padding: 0.15rem 0.5rem;
  background: #f1f5f9;
  border-radius: 0.25rem;
  color: var(--brand-deep, #001e60);
  font-family: ui-monospace, monospace;
  font-weight: 600;
}
.guide-content :deep(em) {
  color: #94a3b8;
  font-style: italic;
}
.guide-content :deep(ul) {
  list-style: none;
  padding: 0;
  margin: 0;
}
.guide-content :deep(li) {
  margin-bottom: 0.75rem;
  padding-left: 1.25rem;
  position: relative;
}
.guide-content :deep(li::before) {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--brand-blue, #0032a0);
  font-weight: 700;
  font-size: 0.75rem;
}
.guide-content :deep(li:last-child) {
  margin-bottom: 0;
}
/* Info text */
.guide-content :deep(.info) {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--brand-blue, #0032a0);
}
.guide-content :deep(.info::before) {
  content: 'ℹ️';
}
/* Warning box */
.guide-content :deep(.warn) {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  color: #92400e;
  line-height: 1.6;
}
.guide-content :deep(.warn-title) {
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.guide-content :deep(.warn-title::before) {
  content: '⚠️ ';
}
/* Note box */
.guide-content :deep(.note) {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.6;
}
.guide-content :deep(.note::before) {
  content: 'ℹ️ ';
}
</style>
