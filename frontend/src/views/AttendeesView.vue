<template>
  <div>
    <!-- ============ HERO ============ -->
    <section class="hero-bg text-white py-14 sm:py-16">
      <div class="container-x">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div class="flex-1 text-center lg:text-left">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 text-xs tracking-widest uppercase">
              <font-awesome-icon icon="users" class="mr-1" />
              {{ heroLabel }}
            </div>
            <h1 class="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
              {{ heroTitle }}
            </h1>
            <p class="mt-3 text-white/80 text-sm sm:text-base">
              共 <span class="font-bold text-brand-orange">{{ total }}</span> 位同仁，来自
              <span class="font-bold text-brand-orange">{{ orderedGroups.length }}</span> 所学校 / 部门
            </p>

            <!-- Department Tabs -->
            <div v-if="departments.length > 1" class="mt-4 flex flex-wrap gap-2 lg:justify-start justify-center">
              <button
                v-for="d in departments"
                :key="d.code"
                class="px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition"
                :class="
                  currentDept === d.code
                    ? 'bg-brand-orange text-white shadow-soft'
                    : 'bg-white/10 text-white/80 ring-1 ring-white/20 hover:bg-white/20'
                "
                @click="switchDept(d.code)"
              >
                {{ d.nameCn || d.name }}
                <span class="ml-1 opacity-75">({{ d.count }})</span>
              </button>
            </div>
          </div>
          <div class="flex-shrink-0 flex justify-center lg:justify-end">
            <WeatherCard />
          </div>
        </div>
      </div>
    </section>

    <!-- ============ LOADING / ERROR / EMPTY ============ -->
    <section class="container-x section-y" v-if="loading || loadError || orderedGroups.length === 0">
      <div v-if="loading" class="space-y-4">
        <el-skeleton :rows="4" animated />
        <el-skeleton :rows="4" animated />
      </div>
      <div v-else-if="loadError" class="card p-8 text-center">
        <div class="text-brand-red text-base font-semibold">加载参会人员失败</div>
        <div class="mt-2 text-sm text-slate-500">{{ loadError }}</div>
        <el-button class="mt-4" type="primary" @click="load">重试</el-button>
      </div>
      <div v-else class="card p-10 text-center text-slate-400">
        暂无参会人员数据
      </div>
    </section>

    <!-- ============ MAIN: TIMELINE ============ -->
    <section v-else class="section-y">
      <div class="container-x">
        <div class="timeline">
          <div
            v-for="g in orderedGroups"
            :key="g.school"
            class="timeline-item"
          >
            <!-- LEFT: Title area -->
            <div class="timeline-left">
              <h2
                class="text-sm sm:text-2xl font-extrabold leading-tight"
                :style="{ color: schoolColor(g.school) }"
              >
                {{ g.school }}
              </h2>
              <span v-if="g.school !== 'CTO'" class="text-xs sm:text-sm text-slate-400 mt-1 block">{{ g.people.length }} 人</span>
            </div>

            <!-- CENTER: timeline line + node dot -->
            <div class="timeline-center">
              <div class="timeline-line-full" aria-hidden="true"></div>
              <span
                class="timeline-node"
                :style="{
                  background: schoolColor(g.school),
                  boxShadow: '0 0 0 4px #fafbfc, 0 0 0 6px ' + schoolColor(g.school) + '20'
                }"
                aria-hidden="true"
              >
                <span class="timeline-node-ring" :style="{ borderColor: schoolColor(g.school) }"></span>
              </span>
            </div>

            <!-- RIGHT: Photos grid -->
            <div class="timeline-right">
              <div class="people-grid">
                <div
                  v-for="(p, idx) in g.people"
                  :key="g.school + '-' + idx"
                  class="person-card group"
                  @click="preview(p)"
                >
                  <div
                    class="photo relative overflow-hidden bg-slate-100 ring-1 ring-slate-200/70 group-hover:ring-brand-blue/40 transition shadow-soft"
                  >
                    <img
                      v-if="p.photoUrl && !imgFail[uniqueKey(g.school, idx)]"
                      :src="p.photoUrl"
                      :alt="displayName(p)"
                      loading="lazy"
                      class="w-full h-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      @error="onImgError(g.school, idx)"
                    />
                    <div
                      v-else
                      class="w-full h-full flex items-center justify-center text-white text-3xl font-extrabold tracking-wider"
                      :style="{ background: initialColor(p) }"
                    >
                      {{ initialLetter(p) }}
                    </div>
                    <div
                      class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent opacity-0 group-hover:opacity-100 transition"
                    ></div>
                  </div>
                  <div class="mt-2.5 text-sm font-semibold text-brand-deep truncate text-center">
                    {{ primaryName(p) }}
                  </div>
                  <div
                    v-if="secondaryName(p)"
                    class="text-xs text-slate-500 truncate mt-0.5 text-center"
                  >
                    {{ secondaryName(p) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Photo Preview Modal (shared component) -->
      <PhotoPreviewModal
        v-model="previewModalVisible"
        :src="previewPerson?.photoUrl || ''"
        :title="previewPerson ? primaryName(previewPerson) : ''"
        :subtitle="previewPerson ? secondaryName(previewPerson) : ''"
        type="image"
      />

    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import api from '../api';
import PhotoPreviewModal from '../components/PhotoPreviewModal.vue';
import WeatherCard from '../components/WeatherCard.vue';

// ---------- Hero text from nav ----------
const heroLabel = ref('参会人员');
const heroTitle = ref('Meet the Team');

// ---------- state ----------
const loading = ref(true);
const loadError = ref('');
const total = ref(0);
const groups = ref([]); // [{ school, people: [] }]
const departments = ref([]); // [{ code, name, nameCn, color, count }]
const currentDept = ref('IT');
const imgFail = reactive({}); // { [`${school}__${idx}`]: true }
const previewPerson = ref(null);
const previewModalVisible = computed({
  get: () => !!previewPerson.value,
  set: (v) => { if (!v) previewPerson.value = null; },
});

// ---------- ordering ----------
// Groups are already sorted by backend (Organization.sortOrder).
// orderedGroups simply reflects that order; the color comes from the API too.
const orderedGroups = computed(() => groups.value);

// ---------- visuals ----------
// Color map built from API response (each group carries its org color).
const _groupColorMap = computed(() => {
  const m = {};
  for (const g of groups.value) {
    if (g.color) m[g.school] = g.color;
  }
  return m;
});
function schoolColor(name) {
  return _groupColorMap.value[name] || '#64748b';
}
const AVATAR_PALETTE = ['#0032a0', '#001e60', '#ff8200', '#ff0044', '#1f6feb', '#3a8a4d', '#7c3aed', '#0ea5e9'];
function _hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function initialColor(p) {
  const key = (p.nameEn || p.nameCn || '').trim() || 'x';
  return AVATAR_PALETTE[_hash(key) % AVATAR_PALETTE.length];
}
function initialLetter(p) {
  const name = (p.nameEn || '').trim();
  if (name) return name[0].toUpperCase();
  const cn = (p.nameCn || '').trim();
  if (cn) return cn[0];
  return '·';
}
function uniqueKey(school, idx) {
  return school + '__' + idx;
}

// ---------- display helpers ----------
function displayName(p) {
  return p.nameEn || p.nameCn || '—';
}
function primaryName(p) {
  return p.nameEn || p.nameCn || '—';
}
function secondaryName(p) {
  if (p.nameEn && p.nameCn && p.nameEn !== p.nameCn) return p.nameCn;
  return '';
}

// ---------- events ----------
function onImgError(school, idx) {
  imgFail[uniqueKey(school, idx)] = true;
}
function preview(p) {
  if (p.photoUrl) previewPerson.value = p;
}
function handleKeydown(e) {
  if (e.key === 'Escape' && previewPerson.value) {
    previewPerson.value = null;
  }
}

// ---------- load ----------
async function loadDepartments() {
  try {
    const { data } = await api.get('/attendees/departments');
    departments.value = data || [];
  } catch {
    departments.value = [];
  }
}

function switchDept(code) {
  currentDept.value = code;
  load();
}

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    const { data } = await api.get('/attendees', { params: { department: currentDept.value } });
    // eslint-disable-next-line no-console
    console.log('[attendees] response:', data);

    let normalized = [];
    if (Array.isArray(data)) {
      const map = {};
      for (const a of data) {
        const k = a.school || 'Other';
        if (!map[k]) map[k] = [];
        map[k].push(a);
      }
      normalized = Object.entries(map).map(([school, people]) => ({ school, people }));
    } else if (Array.isArray(data?.groups)) {
      normalized = data.groups.map((g) => ({
        school: g.school || 'Other',
        people: g.people || [],
        color: g.color || null,
        sortOrder: g.sortOrder ?? 999,
      }));
    } else if (Array.isArray(data?.schools)) {
      normalized = data.schools.map((g) => ({
        school: g.name || g.school || 'Other',
        people: g.members || g.people || [],
        color: g.color || null,
        sortOrder: g.sortOrder ?? 999,
      }));
    }

    groups.value = normalized;
    total.value =
      typeof data?.total === 'number'
        ? data.total
        : normalized.reduce((n, g) => n + g.people.length, 0);
  } catch (e) {
    console.error(e);
    loadError.value = e?.response?.data?.message || e.message || '网络错误';
  } finally {
    loading.value = false;
  }
}

async function loadHero() {
  try {
    const { data } = await api.get('/nav');
    const link = (data?.links || []).find(l => l.to === '/attendees');
    if (link) {
      heroLabel.value = link.label || '参会人员';
      heroTitle.value = link.heroTitle || link.label || 'Meet the Team';
    }
  } catch { /* use defaults */ }
}

onMounted(async () => {
  await Promise.all([loadDepartments(), loadHero()]);
  await load();
  window.addEventListener('keydown', handleKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* ========== Timeline ========== */
.timeline {
  position: relative;
}

/* ===== DESKTOP (>=640px): 3-column grid (3:7) ===== */
.timeline-item {
  display: grid;
  grid-template-columns: 3fr 48px 7fr;
  gap: 0;
  align-items: start;
}

/* ===== MOBILE (<640px): 2-column, single-column flow ===== */
@media (max-width: 639px) {
  .timeline-item {
    grid-template-columns: 28px 1fr;
    grid-template-rows: auto auto;
    gap: 0;
    align-items: start;
  }
}

/* ---------- LEFT column: Title ---------- */
.timeline-left {
  text-align: right;
  padding-right: 24px;
  padding-top: 0;
  margin-top: -6px;
  padding-bottom: 48px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
@media (max-width: 639px) {
  .timeline-left {
    grid-column: 2;
    grid-row: 1;
    text-align: left;
    padding-right: 0;
    padding-left: 12px;
    padding-bottom: 8px;
    padding-top: 0;
    margin-top: 0;
    flex-direction: row;
    align-items: baseline;
    gap: 6px;
  }
  .timeline-left span {
    margin-top: 0;
  }
}
.timeline-item:last-child .timeline-left {
  /* no change needed for desktop */
}
@media (min-width: 640px) {
  .timeline-item:last-child .timeline-left {
    padding-bottom: 0;
  }
}

/* ---------- CENTER column: line + dot ---------- */
.timeline-center {
  position: relative;
  display: flex;
  justify-content: center;
  padding-top: 0;
  align-self: stretch;
}
@media (max-width: 639px) {
  .timeline-center {
    grid-column: 1;
    grid-row: 1 / -1; /* span both rows */
    padding-top: 2px;
  }
}

/* Full-height vertical line behind the dot */
.timeline-line-full {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: rgba(0, 50, 160, 0.3);
}
/* Start line from dot center for first item */
.timeline-item:first-child .timeline-line-full {
  top: 6px;
}
@media (min-width: 640px) {
  .timeline-item:first-child .timeline-line-full {
    top: 9px;
  }
}

/* Node dot */
.timeline-node {
  position: relative;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  z-index: 1;
}
@media (min-width: 640px) {
  .timeline-node {
    width: 18px;
    height: 18px;
  }
}

/* Pulse ring around dot */
.timeline-node-ring {
  position: absolute;
  inset: -6px;
  border: 2px solid;
  border-radius: 9999px;
  opacity: 0.35;
  animation: pulse 2.6s ease-out infinite;
}
@media (min-width: 640px) {
  .timeline-node-ring {
    inset: -8px;
  }
}
@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  70% {
    transform: scale(1.4);
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

/* ---------- RIGHT column: Photos ---------- */
.timeline-right {
  padding-left: 24px;
  padding-top: 0;
  padding-bottom: 48px;
}
@media (max-width: 639px) {
  .timeline-right {
    grid-column: 2;
    grid-row: 2;
    padding-left: 12px;
    padding-top: 0;
    padding-bottom: 28px;
  }
}
.timeline-item:last-child .timeline-right {
  padding-bottom: 0;
}

/* ---------- People grid ---------- */
.people-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px 10px;
}
.person-card {
  cursor: pointer;
}
.person-card .photo {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 4px;
}
@media (min-width: 640px) {
  .people-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 20px 16px;
  }
}
@media (min-width: 1024px) {
  .people-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 22px 18px;
  }
  .person-card .photo {
    border-radius: 6px;
  }
}
</style>

