<template>
  <div
    class="grid grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto"
    aria-label="meeting countdown"
  >
    <div
      v-for="b in blocks"
      :key="b.label"
      class="rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md py-4 sm:py-6 text-center"
    >
      <div class="text-3xl sm:text-5xl font-extrabold text-white tabular-nums">
        {{ String(b.value).padStart(2, '0') }}
      </div>
      <div class="text-[10px] sm:text-xs mt-1 tracking-widest text-white/70 uppercase">
        {{ b.label }}
      </div>
    </div>
  </div>
  <div class="text-center mt-4 text-white/80 text-xs sm:text-sm">
    {{ statusText }}
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
