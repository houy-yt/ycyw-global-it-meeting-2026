<template>
  <div>
    <!-- ============ HERO ============ -->
    <section class="hero-bg text-white py-14 sm:py-16">
      <div class="container-x">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div class="flex-1 text-center lg:text-left">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 text-xs tracking-widest uppercase">
              <font-awesome-icon icon="cloud-sun" class="mr-1" />
              Weather Forecast
            </div>
            <h1 class="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
              北京天气预报
            </h1>
            <p class="mt-3 text-white/70 text-sm sm:text-base">
              会议地点（北京亦庄）未来天气一览，方便您合理安排出行
            </p>
          </div>
          <div class="flex-shrink-0 flex justify-center lg:justify-end">
            <WeatherCard />
          </div>
        </div>
      </div>
    </section>

    <!-- ============ CURRENT WEATHER ============ -->
    <section class="section-y">
      <div class="container-x">
        <!-- Loading -->
        <div v-if="loading" class="text-center py-20">
          <div class="animate-spin h-8 w-8 border-4 border-brand-blue border-t-transparent rounded-full mx-auto"></div>
          <p class="mt-4 text-slate-500">正在获取天气数据…</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="text-center py-20">
          <font-awesome-icon icon="cloud" class="text-5xl text-slate-300" />
          <p class="mt-4 text-slate-500">{{ errorMsg }}</p>
          <button @click="loadAll" class="mt-4 btn-primary !px-6 !py-2 !text-sm">重新加载</button>
        </div>

        <template v-else>
          <!-- Current weather card -->
          <div v-if="currentWeather" class="card p-6 sm:p-8 max-w-3xl mx-auto">
            <div class="flex flex-col sm:flex-row items-center gap-6">
              <!-- Icon & Temp -->
              <div class="flex items-center gap-4">
                <div
                  class="h-20 w-20 rounded-2xl flex items-center justify-center text-4xl shadow-glow"
                  :class="getIconBgClass(currentWeather.icon)"
                >
                  <font-awesome-icon :icon="currentWeather.icon" class="text-white" />
                </div>
                <div>
                  <div class="text-5xl sm:text-6xl font-extrabold text-brand-deep tabular-nums leading-none">
                    {{ currentWeather.temp }}<span class="text-2xl text-slate-400">°C</span>
                  </div>
                  <div class="mt-1 text-lg font-medium text-brand-blue">{{ currentWeather.text }}</div>
                </div>
              </div>

              <!-- Details grid -->
              <div class="flex-1 w-full">
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-slate-50 rounded-lg p-3 text-center">
                    <div class="text-xs text-slate-500">体感温度</div>
                    <div class="mt-1 text-lg font-bold text-brand-deep">{{ currentWeather.feelsLike }}°C</div>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-3 text-center">
                    <div class="text-xs text-slate-500">相对湿度</div>
                    <div class="mt-1 text-lg font-bold text-brand-deep">
                      <font-awesome-icon icon="droplet" class="text-blue-400 text-sm" />
                      {{ currentWeather.humidity }}%
                    </div>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-3 text-center">
                    <div class="text-xs text-slate-500">风向风力</div>
                    <div class="mt-1 text-lg font-bold text-brand-deep">
                      <font-awesome-icon icon="wind" class="text-slate-400 text-sm" />
                      {{ currentWeather.windDir }} {{ currentWeather.windScale }}级
                    </div>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-3 text-center">
                    <div class="text-xs text-slate-500">能见度</div>
                    <div class="mt-1 text-lg font-bold text-brand-deep">{{ currentWeather.vis }} km</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Update time -->
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>
                <font-awesome-icon icon="location-dot" class="text-brand-orange" />
                {{ currentWeather.location }}
              </span>
              <span>更新于 {{ formatTime(currentWeather.updateTime) }}</span>
            </div>
          </div>

          <!-- ============ FORECAST ============ -->
          <div v-if="forecast && forecast.daily?.length" class="mt-12">
            <div class="text-center mb-8">
              <div class="chip">Daily Forecast</div>
              <h2 class="section-heading mt-3">未来 {{ forecast.days }} 天天气预报</h2>
            </div>

            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="day in forecast.daily"
                :key="day.date"
                class="card p-5 hover:shadow-soft transition-shadow"
                :class="{ 'ring-2 ring-brand-orange/40 bg-brand-orange/5': isToday(day.date) }"
              >
                <!-- Date header -->
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-sm font-semibold text-brand-deep">
                      {{ formatDate(day.date) }}
                    </div>
                    <div class="text-xs text-slate-400">{{ getWeekday(day.date) }}</div>
                  </div>
                  <span
                    v-if="isToday(day.date)"
                    class="text-[10px] uppercase tracking-widest bg-brand-orange text-white px-2 py-0.5 rounded-full font-bold"
                  >今天</span>
                </div>

                <!-- Weather icons & temp -->
                <div class="mt-4 flex items-center justify-between">
                  <!-- Day -->
                  <div class="flex items-center gap-2">
                    <div
                      class="h-10 w-10 rounded-xl flex items-center justify-center text-lg"
                      :class="getIconBgClass(day.iconDay)"
                    >
                      <font-awesome-icon :icon="day.iconDay" class="text-white" />
                    </div>
                    <div class="text-xs text-slate-500">
                      <div class="font-medium text-slate-700">{{ day.textDay }}</div>
                      <div>白天</div>
                    </div>
                  </div>

                  <!-- Temp range -->
                  <div class="text-center">
                    <div class="text-2xl font-extrabold text-brand-deep tabular-nums">
                      <span class="text-brand-red">{{ day.tempMax }}°</span>
                      <span class="text-slate-300 mx-0.5">/</span>
                      <span class="text-brand-blue">{{ day.tempMin }}°</span>
                    </div>
                  </div>

                  <!-- Night -->
                  <div class="flex items-center gap-2">
                    <div class="text-xs text-slate-500 text-right">
                      <div class="font-medium text-slate-700">{{ day.textNight }}</div>
                      <div>夜间</div>
                    </div>
                    <div
                      class="h-10 w-10 rounded-xl flex items-center justify-center text-lg bg-slate-700"
                    >
                      <font-awesome-icon :icon="day.iconNight" class="text-white" />
                    </div>
                  </div>
                </div>

                <!-- Extra info -->
                <div class="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <div class="text-center">
                    <font-awesome-icon icon="wind" class="text-slate-400" />
                    <div class="mt-0.5">{{ day.windDirDay }} {{ day.windScaleDay }}级</div>
                  </div>
                  <div class="text-center">
                    <font-awesome-icon icon="droplet" class="text-blue-400" />
                    <div class="mt-0.5">湿度 {{ day.humidity }}%</div>
                  </div>
                  <div class="text-center" v-if="day.uvIndex">
                    <font-awesome-icon icon="sun" class="text-amber-400" />
                    <div class="mt-0.5">UV {{ day.uvIndex }}</div>
                  </div>
                  <div class="text-center" v-else>
                    <font-awesome-icon icon="sun" class="text-amber-400" />
                    <div class="mt-0.5">{{ day.sunrise }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Update notice -->
            <div class="mt-6 text-center text-xs text-slate-400">
              数据来源：和风天气 · 更新于 {{ formatTime(forecast.updateTime) }}
            </div>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';
import WeatherCard from '../components/WeatherCard.vue';

const currentWeather = ref(null);
const forecast = ref(null);
const loading = ref(true);
const error = ref(false);
const errorMsg = ref('');

function getIconBgClass(icon) {
  if (icon === 'sun') return 'bg-amber-500';
  if (icon?.includes('rain') || icon?.includes('showers')) return 'bg-blue-500';
  if (icon?.includes('bolt')) return 'bg-purple-600';
  if (icon === 'snowflake') return 'bg-cyan-400';
  if (icon === 'smog' || icon === 'wind') return 'bg-slate-500';
  if (icon === 'cloud-sun') return 'bg-sky-400';
  if (icon === 'cloud') return 'bg-slate-400';
  if (icon === 'moon' || icon === 'cloud-moon') return 'bg-indigo-600';
  return 'bg-brand-blue';
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function getWeekday(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[d.getDay()];
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return dateStr === todayStr;
}

async function loadAll() {
  loading.value = true;
  error.value = false;
  errorMsg.value = '';

  try {
    const [nowRes, forecastRes] = await Promise.all([
      api.get('/weather/now'),
      api.get('/weather/forecast?days=15'),
    ]);
    currentWeather.value = nowRes.data;
    forecast.value = forecastRes.data;
  } catch (e) {
    console.error('[WeatherView] Failed to load weather:', e);
    error.value = true;
    errorMsg.value = e.response?.data?.message || '天气数据加载失败，请稍后再试';
  } finally {
    loading.value = false;
  }
}

onMounted(loadAll);
</script>
