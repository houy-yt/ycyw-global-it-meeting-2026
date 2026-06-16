<template>
  <div>
    <!-- header -->
    <section class="hero-bg text-white py-16 sm:py-20">
      <div class="container-x text-center">
        <div class="chip-orange bg-white/10 !text-brand-orange ring-1 ring-white/20">三天议程</div>
        <h1 class="mt-4 text-4xl sm:text-5xl font-extrabold">日程安排</h1>
        <p class="mt-3 text-white/70 text-sm sm:text-base">
          {{ meta?.startDate }} - {{ meta?.endDate }} · {{ meta?.location }}
        </p>
      </div>
    </section>

    <section class="section-y">
      <div class="container-x">
        <!-- tabs -->
        <div class="flex flex-wrap justify-center gap-2 mb-8">
          <button
            v-for="(d, i) in dates"
            :key="d.date"
            @click="active = i"
            class="px-5 py-2.5 rounded-full text-sm font-medium transition"
            :class="
              active === i
                ? 'bg-brand-blue text-white shadow-soft'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-blue hover:text-brand-blue'
            "
          >
            {{ d.dayLabel }}
          </button>
        </div>

        <div v-if="dates.length === 0" class="text-center text-slate-500 py-10">加载中…</div>

        <!-- timeline -->
        <div v-for="(d, i) in dates" v-show="active === i" :key="d.date" class="sch-timeline">
          <div
            v-for="(it, idx) in d.items"
            :key="idx"
            class="sch-item"
          >
            <!-- LEFT: time -->
            <div class="sch-left">
              <span class="text-sm sm:text-base font-normal text-slate-500 tabular-nums whitespace-nowrap">{{ it.time }}</span>
            </div>

            <!-- CENTER: dot + line -->
            <div class="sch-center">
              <div class="sch-line" aria-hidden="true"></div>
              <span
                class="sch-dot"
                :style="{
                  background: getIconType(it.title) ? '#94a3b8' : '#ff8200',
                  boxShadow: '0 0 0 3px #fafbfc, 0 0 0 5px ' + (getIconType(it.title) ? 'rgba(148,163,184,0.25)' : 'rgba(255,130,0,0.2)')
                }"
                aria-hidden="true"
              >
                <!-- Icons inside dot -->
                <!-- FA bowl-food (lunch) -->
                <svg v-if="getIconType(it.title) === 'lunch'" class="sch-dot-svg" viewBox="0 0 512 512" fill="white">
                  <path d="M0 192c0-35.3 28.7-64 64-64c.5 0 1.1 0 1.6 0C73 91.5 105.3 64 144 64c15 0 29 4.1 40.9 11.2C198.2 49.6 225.1 32 256 32s57.8 17.6 71.1 43.2C339 68.1 353 64 368 64c38.7 0 71 27.5 78.4 64c.5 0 1.1 0 1.6 0c35.3 0 64 28.7 64 64c0 11.7-3.1 22.6-8.6 32H8.6C3.1 214.6 0 203.7 0 192zm0 91.4C0 268.3 12.3 256 27.4 256H484.6c15.1 0 27.4 12.3 27.4 27.4c0 70.5-44.4 130.7-106.7 154.1L403.5 452c-2 8-9.2 13.5-17.5 13.5H126c-8.3 0-15.5-5.5-17.5-13.5l-1.8-14.5C44.4 414.1 0 353.9 0 283.4z"/>
                </svg>
                <!-- FA bowl-food (dinner) -->
                <svg v-else-if="getIconType(it.title) === 'dinner'" class="sch-dot-svg" viewBox="0 0 512 512" fill="white">
                  <path d="M0 192c0-35.3 28.7-64 64-64c.5 0 1.1 0 1.6 0C73 91.5 105.3 64 144 64c15 0 29 4.1 40.9 11.2C198.2 49.6 225.1 32 256 32s57.8 17.6 71.1 43.2C339 68.1 353 64 368 64c38.7 0 71 27.5 78.4 64c.5 0 1.1 0 1.6 0c35.3 0 64 28.7 64 64c0 11.7-3.1 22.6-8.6 32H8.6C3.1 214.6 0 203.7 0 192zm0 91.4C0 268.3 12.3 256 27.4 256H484.6c15.1 0 27.4 12.3 27.4 27.4c0 70.5-44.4 130.7-106.7 154.1L403.5 452c-2 8-9.2 13.5-17.5 13.5H126c-8.3 0-15.5-5.5-17.5-13.5l-1.8-14.5C44.4 414.1 0 353.9 0 283.4z"/>
                </svg>
                <!-- FA mug-saucer (tea break) -->
                <svg v-else-if="getIconType(it.title) === 'tea'" class="sch-dot-svg" viewBox="0 0 640 512" fill="white">
                  <path d="M96 64c0-17.7 14.3-32 32-32H448h64c70.7 0 128 57.3 128 128s-57.3 128-128 128H480c0 53-43 96-96 96H192c-53 0-96-43-96-96V64zM480 224h32c35.3 0 64-28.7 64-64s-28.7-64-64-64H480V224zM32 416H544c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32z"/>
                </svg>
                <!-- FA clipboard-check (checkin) -->
                <svg v-else-if="getIconType(it.title) === 'checkin'" class="sch-dot-svg" viewBox="0 0 384 512" fill="white">
                  <path d="M336 64h-80c0-35.3-28.7-64-64-64s-64 28.7-64 64H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48zM192 40c13.3 0 24 10.7 24 24s-10.7 24-24 24-24-10.7-24-24 10.7-24 24-24zm121.2 231.8l-143 141.8a15.6 15.6 0 01-21.9 0l-63.6-63.2a15.6 15.6 0 010-22.1l22.1-21.9a15.6 15.6 0 0121.9 0l30.5 30.3 109.9-109c6.1-6.1 16-6.1 22.1 0l21.9 22.1c6.1 6.1 6.1 16 .1 22z"/>
                </svg>
                <!-- FA bus (transit) -->
                <svg v-else-if="getIconType(it.title) === 'transit'" class="sch-dot-svg" viewBox="0 0 512 512" fill="white">
                  <path d="M488 128h-8V80c0-44.8-99.2-80-224-80S32 35.2 32 80v48h-8c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24h8v160c0 17.7 14.3 32 32 32v32c0 17.7 14.3 32 32 32h32c17.7 0 32-14.3 32-32v-32h192v32c0 17.7 14.3 32 32 32h32c17.7 0 32-14.3 32-32v-32c17.7 0 32-14.3 32-32V224h8c13.3 0 24-10.7 24-24v-48c0-13.3-10.7-24-24-24zM160 72h192c4.4 0 8 3.6 8 8s-3.6 8-8 8H160c-4.4 0-8-3.6-8-8s3.6-8 8-8zm-48 328c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm288 0c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm32-120H80V176h352v104z"/>
                </svg>
              </span>
            </div>

            <!-- RIGHT: content -->
            <div class="sch-right">
              <!-- Meals/breaks/checkin/transit: simple text, no card -->
              <template v-if="getIconType(it.title)">
                <div class="flex items-center sch-meal-row">
                  <span class="text-sm sm:text-base font-medium text-slate-500">{{ it.title }}</span>
                </div>
              </template>
              <!-- Normal agenda: card style with talks -->
              <template v-else>
                <div class="card p-4 sm:p-5">
                  <!-- Section title (optional, e.g. "AI 应用分享") -->
                  <div v-if="it.title" class="text-xs font-semibold text-brand-orange uppercase tracking-wider mb-3">{{ it.title }}</div>
                  <!-- Talks list -->
                  <template v-if="it.talks && it.talks.length">
                    <div
                      v-for="(tk, ti) in it.talks"
                      :key="ti"
                      class="sch-talk"
                      :class="{ 'border-t border-slate-100 pt-3 mt-3': ti > 0 }"
                    >
                      <div
                        class="text-base sm:text-lg font-semibold leading-snug"
                        :class="tk.title ? 'text-brand-deep' : 'text-slate-300 italic'"
                      >
                        {{ tk.title || '议程待定' }}
                      </div>
                      <div v-if="tk.speaker" class="mt-1">
                        <span class="text-sm text-slate-500">—— {{ tk.speaker }}</span>
                      </div>
                    </div>
                  </template>
                  <!-- Fallback: no talks, show title only -->
                  <div v-else-if="!it.title" class="text-base sm:text-lg font-semibold leading-snug text-slate-300 italic">议程待定</div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';

const meta = ref(null);
const dates = ref([]);
const active = ref(0);

function getIconType(title) {
  if (!title) return '';
  if (title.includes('午餐')) return 'lunch';
  if (title.includes('晚餐')) return 'dinner';
  if (title.includes('茶歇')) return 'tea';
  if (title.includes('签到')) return 'checkin';
  if (title.includes('前往')) return 'transit';
  return '';
}

onMounted(async () => {
  const { data } = await api.get('/schedule');
  meta.value = data.meeting;
  dates.value = data.dates || [];
});
</script>

<style scoped>
/* ========== Schedule Timeline ========== */
.sch-timeline {
  position: relative;
}

/* Desktop: 3-column grid (3:5) */
.sch-item {
  display: grid;
  grid-template-columns: 3fr 48px 5fr;
  gap: 0;
  align-items: start;
}

/* Mobile: 2-column, line on left */
@media (max-width: 639px) {
  .sch-item {
    grid-template-columns: 28px 1fr;
    grid-template-rows: auto auto;
  }
}

/* ---------- LEFT: time ---------- */
.sch-left {
  text-align: right;
  padding-right: 24px;
  padding-top: 2px;
  padding-bottom: 0;
}
@media (max-width: 639px) {
  .sch-left {
    grid-column: 2;
    grid-row: 1;
    text-align: left;
    padding: 0 0 2px 12px;
  }
}

/* ---------- CENTER: dot + line ---------- */
.sch-center {
  position: relative;
  display: flex;
  justify-content: center;
  align-self: stretch;
  padding-top: 0;
}
@media (max-width: 639px) {
  .sch-center {
    grid-column: 1;
    grid-row: 1 / -1;
    padding-top: 4px;
  }
}

/* Vertical line */
.sch-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: rgba(0, 50, 160, 0.2);
}
.sch-item:first-child .sch-line {
  top: 8px;
}
@media (max-width: 639px) {
  .sch-item:first-child .sch-line {
    top: 6px;
  }
}

/* Dot — unified size for all items */
.sch-dot {
  position: relative;
  flex-shrink: 0;
  margin-top: 2px;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
@media (max-width: 639px) {
  .sch-dot {
    margin-top: 3px;
    width: 12px;
    height: 12px;
  }
}

/* SVG icon inside dot */
.sch-dot-svg {
  width: 10px;
  height: 10px;
}
@media (max-width: 639px) {
  .sch-dot-svg {
    width: 7px;
    height: 7px;
  }
}

/* ---------- RIGHT: content ---------- */
.sch-right {
  padding-left: 24px;
  padding-bottom: 24px;
}
@media (max-width: 639px) {
  .sch-right {
    grid-column: 2;
    grid-row: 2;
    padding-left: 12px;
    padding-bottom: 18px;
  }
}
.sch-item:last-child .sch-right {
  padding-bottom: 0;
  border-bottom: none;
}
</style>
