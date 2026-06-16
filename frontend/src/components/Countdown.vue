<template>
  <div class="inline-flex flex-col items-center">
    <div
      class="inline-flex items-stretch rounded-xl ring-1 ring-white/20 backdrop-blur-md overflow-hidden"
      aria-label="meeting countdown"
    >
      <template v-for="(b, i) in blocks" :key="b.label">
        <!-- divider between blocks -->
        <div
          v-if="i > 0"
          class="flex items-stretch bg-white/10"
        >
          <div class="w-px bg-white/20 my-4"></div>
        </div>
        <!-- block -->
        <div
          class="flex flex-col items-center justify-center px-6 sm:px-8 py-4 sm:py-5 bg-white/10"
        >
          <div class="text-3xl sm:text-5xl font-extrabold text-white tabular-nums">
            {{ String(b.value).padStart(2, '0') }}
          </div>
          <div class="text-[10px] sm:text-xs mt-1 tracking-widest text-white/70 uppercase">
            {{ b.label }}
          </div>
        </div>
      </template>
    </div>
    <div class="mt-4 text-white/80 text-xs sm:text-sm text-center">
      {{ statusText }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  start: { type: String, required: true }, // YYYY-MM-DD
  end: { type: String, required: true },
});

const now = ref(Date.now());
let timer;
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 1000);
});
onBeforeUnmount(() => clearInterval(timer));

const startTs = computed(() => new Date(props.start + 'T08:00:00+08:00').getTime());
const endTs = computed(() => new Date(props.end + 'T18:00:00+08:00').getTime());

const diff = computed(() => {
  if (now.value < startTs.value) return startTs.value - now.value;
  if (now.value <= endTs.value) return endTs.value - now.value;
  return 0;
});

const blocks = computed(() => {
  const s = Math.max(0, Math.floor(diff.value / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return [
    { label: 'Days', value: days },
    { label: 'Hours', value: hours },
    { label: 'Min', value: minutes },
    { label: 'Sec', value: seconds },
  ];
});

const statusText = computed(() => {
  if (now.value < startTs.value) return '距离会议开幕';
  if (now.value <= endTs.value) return '会议进行中 · 距离闭幕';
  return '会议已结束';
});
</script>
