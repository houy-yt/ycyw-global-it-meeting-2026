<template>
  <div>
    <!-- ============ HERO ============ -->
    <section class="relative overflow-hidden hero-banner text-white md:min-h-[90vh] flex items-center">
      <div class="container-x relative py-12 sm:py-20 md:py-28 w-full">
        <div class="max-w-2xl">
          <div
            class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 text-xs tracking-widest text-white/90 uppercase"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-brand-orange"></span>
            YCYW · Education · Global IT
          </div>
          <h1
            class="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight"
          >
            YCYW <span class="text-brand-orange">2026</span><br />
            Global IT Meeting
          </h1>

          <!-- white divider line -->
          <div class="mt-6 w-14 h-[3px] rounded bg-white/50"></div>

          <p class="mt-5 text-lg sm:text-xl text-white/80 tracking-wide">
            Connect <span class="mx-2 text-white/40">|</span> Innovate <span class="mx-2 text-white/40">|</span> Empower
          </p>

          <div class="mt-4 flex items-center gap-2 text-sm sm:text-base text-white/70 flex-wrap">
            <span class="inline-flex items-center gap-1.5">
              <font-awesome-icon icon="calendar-days" class="text-white/50" />
              2026 年 7 月 14 日 – 16 日
            </span>
            <span class="text-white/30">|</span>
            <span class="inline-flex items-center gap-1.5">
              <font-awesome-icon icon="location-dot" class="text-white/50" />
              北京亦庄
            </span>
          </div>

          <div class="mt-8 flex flex-wrap gap-3">
            <router-link to="/schedule" class="btn-orange">查看完整日程 →</router-link>
            <router-link to="/attendees" class="btn-secondary !bg-transparent !text-white !ring-white/40 hover:!ring-white hover:!bg-white/10">参会人员</router-link>
          </div>
        </div>

        <div class="mt-14 max-w-xl">
          <Countdown :start="meta.start" :end="meta.end" />
        </div>
      </div>
    </section>

    <!-- ============ CONFERENCE THEME ============ -->
    <section class="section-y">
      <div class="container-x">
        <div class="text-center max-w-3xl mx-auto">
          <div class="chip-orange">Conference Theme</div>
          <h2 class="section-heading mt-4">
            Connect <span class="text-brand-orange">·</span> Innovate <span class="text-brand-orange">·</span> Empower
          </h2>
          <p class="section-sub mx-auto">
            AI 时代的教育 IT 进化 —— 在耀中耀华全球网络中，让技术成为学习的杠杆，
            让基础设施成为信任的底座，让数据成为决策的语言。
          </p>
        </div>

        <div class="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="p in pillars"
            :key="p.title"
            class="card p-7 relative overflow-hidden"
          >
            <div
              class="absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-10"
              :style="{ background: p.tint }"
            ></div>
            <div
              class="h-12 w-12 rounded-2xl flex items-center justify-center text-2xl text-white shadow-soft"
              :style="{ background: p.tint }"
            >
              <font-awesome-icon :icon="p.icon" />
            </div>
            <div class="mt-5 text-lg font-semibold text-brand-deep">{{ p.title }}</div>
            <div class="mt-1 text-xs uppercase tracking-widest text-slate-400">{{ p.subtitle }}</div>
            <p class="mt-3 text-sm text-slate-600 leading-relaxed">{{ p.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ INTRO ============ -->
    <section class="section-y bg-white border-y border-slate-100">
      <div class="container-x grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <div class="chip">关于本次会议</div>
          <h2 class="section-heading mt-4">三天的 IT 同仁聚会</h2>
          <p class="section-sub">
            YCYW Global IT Meeting 是耀中耀华教育旗下各校 IT 团队一年一度的盛会。
            围绕 AI 应用、安全合规、教育科技与基础设施，我们一起回顾、思考、并定义未来一年的方向。
          </p>
          <div class="mt-6 grid grid-cols-3 gap-4 max-w-md">
            <div class="rounded-md bg-brand-blue/5 p-4 text-center">
              <div class="text-2xl font-extrabold text-brand-blue">57+</div>
              <div class="text-xs text-slate-500 mt-1">参会人员</div>
            </div>
            <div class="rounded-md bg-brand-orange/10 p-4 text-center">
              <div class="text-2xl font-extrabold text-brand-orange">3</div>
              <div class="text-xs text-slate-500 mt-1">天议程</div>
            </div>
            <div class="rounded-md bg-brand-red/10 p-4 text-center">
              <div class="text-2xl font-extrabold text-brand-red">19</div>
              <div class="text-xs text-slate-500 mt-1">所学校/部门</div>
            </div>
          </div>
        </div>

        <div class="relative">
          <div
            class="aspect-[4/3] rounded-md hero-bg shadow-glow ring-1 ring-brand-deep/10 flex items-center justify-center p-10"
          >
            <div class="text-white text-center">
              <div class="text-sm tracking-widest text-white/70 uppercase">Save the date</div>
              <div class="text-5xl sm:text-7xl font-extrabold mt-3 tabular-nums">07.14</div>
              <div class="text-sm text-white/70 mt-2">- 07.16 / 2026 / Beijing</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ TRACKS ============ -->
    <section class="section-y">
      <div class="container-x">
        <div class="text-center max-w-3xl mx-auto">
          <div class="chip">议题轨道 · Tracks</div>
          <h2 class="section-heading mt-4">本届聚焦的六大 IT 议题</h2>
          <p class="section-sub mx-auto">
            从课堂的 AI 助手，到机房的零信任；从数据治理，到云原生 —— 一次会议，覆盖你正在解决的所有问题。
          </p>
        </div>

        <div class="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div
            v-for="t in tracks"
            :key="t.title"
            class="card p-5 flex items-start gap-4 group"
          >
            <div
              class="h-11 w-11 rounded-xl flex-shrink-0 flex items-center justify-center text-xl text-white shadow-soft"
              :style="{ background: t.tint }"
            >
              <font-awesome-icon :icon="t.icon" />
            </div>
            <div class="min-w-0">
              <div class="text-base font-semibold text-brand-deep group-hover:text-brand-blue transition">
                {{ t.title }}
              </div>
              <div class="mt-1 text-sm text-slate-500 leading-relaxed">
                {{ t.desc }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ ANNOUNCEMENT ============ -->
    <section class="container-x">
      <div
        class="rounded-md bg-gradient-to-r from-brand-blue to-brand-deep text-white p-6 sm:p-8 shadow-glow flex flex-col sm:flex-row sm:items-center gap-4"
      >
        <div class="flex items-center gap-3 flex-shrink-0">
          <div class="h-10 w-10 rounded-full bg-brand-orange flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-.75 4a.75.75 0 011.5 0v4.25a.75.75 0 01-1.5 0V6zm.75 7.5a1 1 0 110 2 1 1 0 010-2z" />
            </svg>
          </div>
          <div class="text-xs tracking-widest uppercase text-white/70">最新公告</div>
        </div>
        <div class="text-sm sm:text-base leading-relaxed flex-1">
          {{ announcement?.content || '欢迎参加 YCYW 2026 Global IT Meeting！更多公告将在此处展示。' }}
        </div>
      </div>
    </section>

    <!-- ============ BY THE NUMBERS ============ -->
    <section class="section-y">
      <div class="container-x">
        <div
          class="rounded-md hero-bg text-white p-8 sm:p-12 shadow-glow relative overflow-hidden"
        >
          <div
            class="absolute inset-0 opacity-[0.08]"
            style="background-image: radial-gradient(circle, #fff 1px, transparent 1px); background-size: 24px 24px"
          ></div>

          <div class="relative">
            <div class="text-xs uppercase tracking-widest text-white/70">By the Numbers</div>
            <h2 class="mt-3 text-3xl sm:text-4xl font-extrabold">YCYW Global IT，一览</h2>
            <p class="mt-3 text-white/80 max-w-2xl">
              一个网络，多元文化；一支团队，连接全球。下面是我们日复一日守护的数字。
            </p>

            <div class="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
              <div
                v-for="s in stats"
                :key="s.label"
                ref="statRefs"
                :data-target="s.value"
                :data-suffix="s.suffix || ''"
                class="text-center"
              >
                <div class="text-3xl sm:text-5xl font-extrabold text-brand-orange tabular-nums">
                  <span class="counter">0</span>{{ s.suffix || '' }}
                </div>
                <div class="mt-2 text-xs sm:text-sm text-white/70 uppercase tracking-widest">
                  {{ s.label }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ QUICK NAV ============ -->
    <section class="section-y bg-white border-y border-slate-100">
      <div class="container-x">
        <div class="text-center">
          <div class="chip-orange">快捷入口</div>
          <h2 class="section-heading mt-4">直达你想去的地方</h2>
        </div>
        <div class="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <router-link
            v-for="c in quickLinks"
            :key="c.to"
            :to="c.to"
            class="card p-6 group"
          >
            <div class="flex items-start gap-4">
              <div
                class="h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-xl font-bold"
                :class="c.bg"
              >
                <font-awesome-icon :icon="c.icon" />
              </div>
              <div>
                <div class="text-lg font-semibold text-brand-deep">{{ c.title }}</div>
                <div class="mt-1 text-sm text-slate-500">{{ c.desc }}</div>
              </div>
            </div>
            <div class="mt-4 text-sm text-brand-blue group-hover:text-brand-red transition flex items-center gap-1">
              进入 <font-awesome-icon icon="circle-right" class="text-xs transition-transform group-hover:translate-x-1" />
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- ============ TECH STACK ============ -->
    <section class="section-y">
      <div class="container-x">
        <div class="text-center max-w-3xl mx-auto">
          <div class="chip">Tech & Tools at YCYW</div>
          <h2 class="section-heading mt-4">我们正在用、即将用的技术</h2>
          <p class="section-sub mx-auto">
            从云到端、从生产力到智能，下面是支撑 YCYW 全球 IT 的代表性平台与工具。
          </p>
        </div>

        <div class="mt-10 space-y-6">
          <div
            v-for="cat in techStack"
            :key="cat.title"
            class="card p-6"
          >
            <div class="flex items-center gap-3">
              <div
                class="h-9 w-9 rounded-lg flex items-center justify-center text-white text-base"
                :style="{ background: cat.tint }"
              >
                <font-awesome-icon :icon="cat.icon" />
              </div>
              <div class="text-base font-semibold text-brand-deep">{{ cat.title }}</div>
              <div class="text-xs text-slate-400">· {{ cat.subtitle }}</div>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="item in cat.items"
                :key="item"
                class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:ring-brand-blue/40 hover:text-brand-blue transition"
              >
                {{ item }}
              </span>
            </div>
          </div>
        </div>

        <!-- Quote -->
        <div class="mt-12 rounded-md border border-slate-100 bg-white p-8 sm:p-10 text-center shadow-soft">
          <div class="text-brand-orange text-4xl leading-none">"</div>
          <p class="mt-3 text-base sm:text-lg text-slate-700 max-w-3xl mx-auto leading-relaxed">
            我们既是技术的工程师，也是教育的同行者。借助 IT 这把杠杆，让全球每一位耀中耀华师生都能享受到顺畅、安全、智能的数字校园。
          </p>
          <div class="mt-4 text-xs uppercase tracking-widest text-slate-400">
            — YCYW Global IT Team
          </div>
        </div>
      </div>
    </section>

    <!-- ============ PAST MEETINGS ============ -->
    <section class="section-y bg-white border-y border-slate-100">
      <div class="container-x">
        <div class="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div class="chip">往届回顾</div>
            <h2 class="section-heading mt-4">看看走过的路</h2>
          </div>
          <router-link to="/past-meetings" class="btn-secondary !py-2 !px-5 !text-sm">
            查看全部 →
          </router-link>
        </div>

        <div class="mt-10 grid sm:grid-cols-2 gap-6">
          <component
            :is="p.linkUrl ? 'a' : 'div'"
            v-for="p in pastList.slice(0, 2)"
            :key="p.id"
            :href="p.linkUrl || undefined"
            :target="p.linkUrl ? '_blank' : undefined"
            class="card p-6 flex items-start gap-5"
            :class="{ 'cursor-pointer': p.linkUrl }"
          >
            <div
              class="flex-shrink-0 h-20 w-20 rounded-md flex flex-col items-center justify-center bg-brand-blue/5 text-brand-blue"
            >
              <div class="text-2xl font-extrabold">{{ p.year }}</div>
              <div class="text-xs text-slate-400 mt-0.5">{{ formatDateRange(p.dateRange) }}</div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-base font-semibold text-brand-deep truncate">{{ p.title }}</div>
              <div class="mt-1 text-sm text-slate-500">{{ p.location }}</div>
            </div>
          </component>
          <div
            v-if="pastList.length === 0"
            class="col-span-full text-center text-slate-400 py-10"
          >
            暂无往届会议
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import api from '../api';
import Countdown from '../components/Countdown.vue';

const meta = { start: '2026-07-14', end: '2026-07-16' };

const announcement = ref(null);
const pastList = ref([]);
const statRefs = ref([]);

const quickLinks = [
  { to: '/schedule', title: '日程安排', desc: '三天议程一目了然', bg: 'bg-brand-blue', icon: 'calendar-days' },
  { to: '/attendees', title: '参会人员', desc: '57+ 同仁，19 所学校', bg: 'bg-brand-deep', icon: 'users' },
  { to: '/reflections', title: '会后反思', desc: '记录所学所思', bg: 'bg-brand-orange', icon: 'pen-to-square' },
  { to: '/gallery', title: '会议剪影', desc: '照片 · 视频 · 回忆', bg: 'bg-brand-red', icon: 'camera' },
];

const pillars = [
  {
    icon: 'robot',
    title: 'AI for Education',
    subtitle: 'Connect Learning',
    desc: '把生成式 AI 落地到课堂、教务、家校沟通——让技术服务于"以学生为中心"的教育。',
    tint: '#0032a0',
  },
  {
    icon: 'shield-halved',
    title: 'Secure & Compliant',
    subtitle: 'Innovate Safely',
    desc: '零信任、身份治理、数据保护与隐私合规——为每一份数据守住底线。',
    tint: '#ff0044',
  },
  {
    icon: 'globe',
    title: 'One Global Network',
    subtitle: 'Empower Together',
    desc: '统一身份、统一基础设施、跨校协同——19 所学校如同一所学校。',
    tint: '#ff8200',
  },
];

const tracks = [
  {
    icon: 'wand-magic-sparkles',
    title: 'AI Copilot 在教学场景的落地',
    desc: '从备课、出题、批改到家长沟通，让 AI 成为每位老师的助手。',
    tint: '#0032a0',
  },
  {
    icon: 'lock',
    title: '网络与终端的零信任架构',
    desc: 'Entra / Intune / 条件访问 / Microsegmentation 实战。',
    tint: '#001e60',
  },
  {
    icon: 'chart-bar',
    title: '数据治理与隐私合规',
    desc: '统一数据底座、跨境合规、学生数据保护机制。',
    tint: '#ff8200',
  },
  {
    icon: 'cloud',
    title: '基础设施现代化',
    desc: '云原生、边缘、SD-WAN、Wi-Fi 6/7、教室智能化升级。',
    tint: '#ff0044',
  },
  {
    icon: 'id-card',
    title: '统一身份与单点登录',
    desc: 'OIDC / SAML / SCIM 在全球网络中的标准化。',
    tint: '#1f6feb',
  },
  {
    icon: 'gears',
    title: 'DevOps & 自动化运维',
    desc: 'IaC、监控告警、AIOps 让 IT 团队从重复劳动中解脱。',
    tint: '#3a8a4d',
  },
];

const stats = [
  { value: 19, label: 'Schools / Depts', suffix: '' },
  { value: 57, label: 'IT Professionals', suffix: '+' },
  { value: 35000, label: 'End Users', suffix: '+' },
  { value: 300, label: 'Apps & Systems', suffix: '+' },
  { value: 5, label: 'Global Regions', suffix: '' },
];

const techStack = [
  {
    icon: 'building',
    title: 'Productivity & Identity',
    subtitle: '日常协作与身份基础',
    items: ['Microsoft 365', 'Entra ID', 'Intune', 'Defender', 'SharePoint', 'Teams'],
    tint: '#0032a0',
  },
  {
    icon: 'screwdriver-wrench',
    title: 'DevOps & Code',
    subtitle: '工程化与协作',
    items: ['GitHub', 'Azure DevOps', 'Bicep', 'Terraform', 'GitHub Actions'],
    tint: '#001e60',
  },
  {
    icon: 'chart-line',
    title: 'Data & Analytics',
    subtitle: '一个学校的数据底座',
    items: ['Power BI', 'Microsoft Fabric', 'Synapse', 'Dataverse', 'SQL'],
    tint: '#ff8200',
  },
  {
    icon: 'globe',
    title: 'Network & Security',
    subtitle: '稳健的连接与防御',
    items: ['Cisco Meraki', 'Fortinet', 'Aruba', 'Zscaler', 'CrowdStrike'],
    tint: '#ff0044',
  },
  {
    icon: 'robot',
    title: 'AI & Education',
    subtitle: '面向未来的教与学',
    items: ['Azure OpenAI', 'AI Foundry', 'Copilot', 'Copilot Studio', 'Whisper'],
    tint: '#7c3aed',
  },
];

function formatDateRange(raw) {
  if (!raw) return '';
  const m = raw.match(/(\d+)月(\d+)日\s*[-–—]\s*(?:(\d+)月)?(\d+)日/);
  if (!m) return raw;
  const month = m[1];
  const startDay = m[2].padStart(2, '0');
  const endMonth = m[3] || month;
  const endDay = m[4].padStart(2, '0');
  return `${month}.${startDay}-${endMonth}.${endDay}`;
}

let counterObserver = null;
function animateCounter(el) {
  const target = Number(el.dataset.target || 0);
  const span = el.querySelector('.counter');
  if (!span) return;
  const duration = 1200;
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = Math.round(target * eased);
    span.textContent = v >= 1000 ? v.toLocaleString() : String(v);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function load() {
  try {
    const [a, p] = await Promise.all([
      api.get('/announcements/active'),
      api.get('/past-meetings'),
    ]);
    announcement.value = a.data;
    pastList.value = p.data || [];
  } catch (e) {
    console.error(e);
  }
}

onMounted(async () => {
  await load();
  await nextTick();
  // Setup counter animation
  counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  statRefs.value.forEach((el) => el && counterObserver.observe(el));
});

onBeforeUnmount(() => {
  if (counterObserver) counterObserver.disconnect();
});
</script>
