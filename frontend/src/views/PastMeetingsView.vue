<template>
  <div>
    <section class="hero-bg text-white py-16">
      <div class="container-x text-center">
        <div class="chip-orange bg-white/10 !text-brand-orange ring-1 ring-white/20">往届会议</div>
        <h1 class="mt-4 text-4xl sm:text-5xl font-extrabold">Past Meetings</h1>
        <p class="mt-3 text-white/70 text-sm">回顾每一届 YCYW Global IT Meeting</p>
      </div>
    </section>

    <section class="section-y">
      <div class="container-x">
        <div v-if="items.length" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <component
            :is="p.linkUrl ? 'a' : 'div'"
            v-for="p in items"
            :key="p.id"
            :href="p.linkUrl || undefined"
            :target="p.linkUrl ? '_blank' : undefined"
            class="card p-6"
            :class="{ 'cursor-pointer': p.linkUrl }"
          >
            <div class="flex items-center gap-4">
              <div
                class="h-20 w-20 rounded-md flex flex-col items-center justify-center bg-brand-blue/5 text-brand-blue flex-shrink-0"
              >
                <div class="text-2xl font-extrabold">{{ p.year }}</div>
                <div class="text-xs text-slate-400 mt-0.5">{{ formatDateRange(p.dateRange) }}</div>
              </div>
              <div class="min-w-0">
                <div class="text-base font-semibold text-brand-deep truncate">{{ p.title }}</div>
                <div class="mt-1 text-sm text-slate-500">{{ p.location }}</div>
              </div>
            </div>
          </component>
        </div>
        <div v-else class="text-center text-slate-400 py-16">暂无往届数据</div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';

const items = ref([]);

/**
 * Convert dateRange like "7月8日 - 10日" or "7月22日 - 24日" to "7.08-7.10" or "7.22-7.24"
 */
function formatDateRange(raw) {
  if (!raw) return '';
  // Match pattern: X月Y日 - Z日  or  X月Y日 - X月Z日
  const m = raw.match(/(\d+)月(\d+)日\s*[-–—]\s*(?:(\d+)月)?(\d+)日/);
  if (!m) return raw;
  const month = m[1];
  const startDay = m[2].padStart(2, '0');
  const endMonth = m[3] || month;
  const endDay = m[4].padStart(2, '0');
  return `${month}.${startDay}-${endMonth}.${endDay}`;
}

onMounted(async () => {
  const { data } = await api.get('/past-meetings');
  items.value = data;
});
</script>
