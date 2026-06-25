<template>
  <!-- Desktop: absolute in Hero top-right; Mobile: inline block at Hero bottom -->
  <div class="weather-card-wrapper" v-if="weather || loading">
    <!-- Loading skeleton -->
    <div v-if="loading" class="flex items-center gap-2 px-3 py-2">
      <div class="animate-pulse flex items-center gap-2">
        <div class="h-6 w-6 rounded-full bg-white/20"></div>
        <div class="h-4 w-16 bg-white/20 rounded"></div>
      </div>
    </div>

    <!-- Weather data -->
    <div v-else-if="weather" class="space-y-2.5">
      <!-- Main row: icon + temp + text + details -->
      <div class="flex items-center gap-2.5">
        <!-- Weather icon -->
        <div
          class="h-8 w-8 rounded-sm flex items-center justify-center text-base flex-shrink-0"
          :class="iconBgClass"
        >
          <font-awesome-icon :icon="weather.icon" class="text-white" />
        </div>

        <!-- Temp -->
        <div class="text-xl font-extrabold text-white tabular-nums leading-none">
          {{ weather.temp }}<span class="text-sm text-white/60">°C</span>
        </div>

        <!-- Divider -->
        <div class="h-8 w-px bg-white/20 flex-shrink-0"></div>

        <!-- Location & text -->
        <div class="min-w-0">
          <div class="text-sm font-medium text-white leading-tight">
            {{ weather.location }} · {{ weather.text }}
          </div>
          <div class="text-xs text-white/75 leading-tight mt-0.5 hidden md:block">
            体感 {{ weather.feelsLike }}°C · 湿度 {{ weather.humidity }}% · {{ weather.windDir }} {{ weather.windScale }}级
          </div>
          <!-- Mobile: simpler details -->
          <div class="text-xs text-white/50 leading-tight mt-0.5 md:hidden">
            湿度 {{ weather.humidity }}% · {{ weather.windDir }}风
          </div>
        </div>
      </div>

      <!-- "查看未来15天天气" link -->
      <router-link
        to="/weather"
        class="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white transition pl-0.5 group"
      >
        <font-awesome-icon icon="calendar-days" class="text-[10px] text-white/40 group-hover:text-brand-orange transition" />
        查看未来15天天气
        <font-awesome-icon icon="chevron-right" class="text-[9px] transition-transform group-hover:translate-x-0.5" />
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api';

const weather = ref(null);
const loading = ref(true);
const error = ref(false);

const iconBgClass = computed(() => {
  if (!weather.value) return 'bg-white/20';
  const icon = weather.value.icon;
  if (icon === 'sun') return 'bg-amber-500/80';
  if (icon.includes('rain') || icon.includes('showers')) return 'bg-blue-500/80';
  if (icon.includes('bolt')) return 'bg-purple-600/80';
  if (icon === 'snowflake') return 'bg-cyan-400/80';
  if (icon === 'smog' || icon === 'wind') return 'bg-slate-500/80';
  if (icon === 'cloud-sun') return 'bg-sky-400/80';
  if (icon === 'cloud') return 'bg-slate-400/80';
  return 'bg-white/20';
});

onMounted(async () => {
  try {
    const { data } = await api.get('/weather/now');
    weather.value = data;
  } catch (e) {
    console.error('[WeatherCard] Failed to load weather:', e);
    error.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.weather-card-wrapper {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.75rem;
  padding: 0.625rem 0.875rem;
}

/* Desktop: remove background, border, blur */
@media (min-width: 768px) {
  .weather-card-wrapper {
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border: none;
    border-radius: 0;
    padding: 0.5rem 0;
  }
}
</style>
