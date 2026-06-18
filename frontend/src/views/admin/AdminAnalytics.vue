<template>
  <div class="space-y-6">
    <!-- ============ Toolbar ============ -->
    <div class="flex flex-wrap items-center gap-3">
      <h3 class="text-base font-semibold text-brand-deep">反思数据分析</h3>
      <div class="flex-1"></div>
      <el-button :loading="scanning" type="primary" plain @click="scan(true)">仅扫描未分析</el-button>
      <el-button :loading="scanning" type="primary" @click="scan(false)">重新分析全部</el-button>
      <el-button :loading="summarizing" type="success" @click="genSummary">AI 总结</el-button>
    </div>

    <!-- ============ KPI cards ============ -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="kpi"><div class="kpi-label">总反思数</div><div class="kpi-value">{{ overview.total ?? '—' }}</div></div>
      <div class="kpi"><div class="kpi-label">总点赞数</div><div class="kpi-value">{{ overview.likes ?? '—' }}</div></div>
      <div class="kpi"><div class="kpi-label">总评论数</div><div class="kpi-value">{{ overview.comments ?? '—' }}</div></div>
      <div class="kpi"><div class="kpi-label">匿名比例</div><div class="kpi-value">{{ anonRatio }}</div></div>
      <div class="kpi"><div class="kpi-label">平均情感分</div><div class="kpi-value" :style="{ color: scoreColor(overview.averageSentimentScore) }">{{ overview.averageSentimentScore ?? '—' }}</div></div>
      <div class="kpi"><div class="kpi-label">平均字数</div><div class="kpi-value">{{ overview.averageWordCount ?? '—' }}</div></div>
      <div class="kpi"><div class="kpi-label">正面 / 中性 / 负面</div>
        <div class="kpi-value text-lg">
          <span class="text-green-600">{{ overview.sentimentDistribution?.positive ?? 0 }}</span> /
          <span class="text-slate-500">{{ overview.sentimentDistribution?.neutral ?? 0 }}</span> /
          <span class="text-red-500">{{ overview.sentimentDistribution?.negative ?? 0 }}</span>
        </div>
      </div>
      <div class="kpi"><div class="kpi-label">未分析</div><div class="kpi-value">{{ overview.sentimentDistribution?.unscored ?? 0 }}</div></div>
    </div>

    <!-- ============ Sentiment distribution ============ -->
    <div class="card p-4">
      <h4 class="text-sm font-semibold text-brand-deep mb-3">情感分布</h4>
      <div class="flex items-center gap-2">
        <div v-for="s in sentimentBars" :key="s.key" class="flex-1">
          <div class="flex justify-between text-xs mb-1">
            <span :style="{ color: s.color }" class="font-medium">{{ s.label }}</span>
            <span class="text-slate-500">{{ s.count }} ({{ s.pct }}%)</span>
          </div>
          <div class="h-3 rounded bg-slate-100 overflow-hidden">
            <div class="h-full" :style="{ width: s.pct + '%', background: s.color }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ Timeline ============ -->
    <div class="card p-4">
      <div class="flex justify-between items-center mb-3">
        <h4 class="text-sm font-semibold text-brand-deep">时间趋势</h4>
        <el-radio-group v-model="bucket" size="small" @change="loadTimeline">
          <el-radio-button label="day">按日</el-radio-button>
          <el-radio-button label="week">按周</el-radio-button>
        </el-radio-group>
      </div>
      <div v-if="timeline.length === 0" class="text-sm text-slate-400 text-center py-6">暂无数据</div>
      <div v-else class="overflow-x-auto">
        <svg :width="Math.max(timeline.length * 40, 600)" height="180" class="block">
          <g v-for="(t, i) in timeline" :key="t.date">
            <g :transform="`translate(${i * 40 + 20}, 0)`">
              <rect :y="160 - barH(t.positive)" :height="barH(t.positive)" width="10" fill="#16a34a" />
              <rect x="11" :y="160 - barH(t.neutral)" :height="barH(t.neutral)" width="10" fill="#94a3b8" />
              <rect x="22" :y="160 - barH(t.negative)" :height="barH(t.negative)" width="10" fill="#ef4444" />
              <text x="16" y="175" class="tl-label">{{ t.date.slice(5) }}</text>
            </g>
          </g>
          <line x1="0" y1="160" :x2="timeline.length * 40 + 20" y2="160" stroke="#e2e8f0" />
        </svg>
      </div>
      <div class="text-xs text-slate-400 mt-2">
        <span class="inline-block w-3 h-3 rounded mr-1" style="background:#16a34a"></span>正面
        <span class="inline-block w-3 h-3 rounded ml-3 mr-1" style="background:#94a3b8"></span>中性
        <span class="inline-block w-3 h-3 rounded ml-3 mr-1" style="background:#ef4444"></span>负面
      </div>
    </div>

    <!-- ============ Keywords cloud ============ -->
    <div class="card p-4">
      <h4 class="text-sm font-semibold text-brand-deep mb-3">关键词 TOP {{ keywords.length }}</h4>
      <div v-if="!keywords.length" class="text-sm text-slate-400 py-4 text-center">暂无数据</div>
      <div v-else class="flex flex-wrap gap-2">
        <span
          v-for="k in keywords"
          :key="k.word"
          class="px-3 py-1 rounded-full text-white font-medium"
          :style="{ fontSize: kwSize(k) + 'px', background: kwColor(k) }"
          :title="`${k.word}：${k.count} 次`"
        >
          {{ k.word }} <span class="opacity-75 text-xs">×{{ k.count }}</span>
        </span>
      </div>
    </div>

    <!-- ============ Top contributors & Top liked ============ -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="card p-4">
        <h4 class="text-sm font-semibold text-brand-deep mb-3">活跃贡献者 TOP10</h4>
        <el-table :data="contributors" size="small" border>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="nickname" label="昵称" />
          <el-table-column prop="count" label="发文" width="70" />
          <el-table-column prop="totalLikes" label="累计赞" width="80" />
          <el-table-column label="情感均分" width="90">
            <template #default="{ row }">
              <span :style="{ color: scoreColor(row.avgScore) }">{{ row.avgScore }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="card p-4">
        <h4 class="text-sm font-semibold text-brand-deep mb-3">高赞反思 TOP5</h4>
        <el-table :data="overview.topLiked || []" size="small" border>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="title" label="标题" min-width="180" />
          <el-table-column prop="author" label="作者" width="100" />
          <el-table-column prop="likeCount" label="赞" width="60" />
          <el-table-column prop="commentCount" label="评" width="60" />
          <el-table-column label="情感" width="80">
            <template #default="{ row }">
              <el-tag :type="sentimentTag(row.sentiment)" size="small">{{ row.sentiment || '—' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- ============ AI Summary ============ -->
    <el-dialog v-model="summaryDialog.show" title="AI 总结" width="720px" align-center>
      <div class="prose max-w-none whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
        {{ summaryDialog.content || '生成中...' }}
      </div>
      <template #footer>
        <el-button @click="summaryDialog.show = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../../api';

const overview = ref({});
const keywords = ref([]);
const timeline = ref([]);
const contributors = ref([]);
const bucket = ref('day');

const scanning = ref(false);
const summarizing = ref(false);
const summaryDialog = reactive({ show: false, content: '' });

const anonRatio = computed(() => {
  if (!overview.value.total) return '—';
  return ((overview.value.anonymous / overview.value.total) * 100).toFixed(1) + '%';
});

const sentimentBars = computed(() => {
  const d = overview.value.sentimentDistribution || {};
  const total = (d.positive || 0) + (d.neutral || 0) + (d.negative || 0) || 1;
  return [
    { key: 'positive', label: '正面', color: '#16a34a', count: d.positive || 0, pct: ((d.positive || 0) * 100 / total).toFixed(1) },
    { key: 'neutral',  label: '中性', color: '#94a3b8', count: d.neutral || 0, pct: ((d.neutral || 0) * 100 / total).toFixed(1) },
    { key: 'negative', label: '负面', color: '#ef4444', count: d.negative || 0, pct: ((d.negative || 0) * 100 / total).toFixed(1) },
  ];
});

function scoreColor(s) {
  if (s == null) return '#64748b';
  if (s >= 0.2) return '#16a34a';
  if (s <= -0.2) return '#ef4444';
  return '#64748b';
}
function sentimentTag(s) {
  return { positive: 'success', negative: 'danger', neutral: 'info' }[s] || 'info';
}

// timeline bar height
function barH(v) {
  const max = Math.max(1, ...timeline.value.map((t) => Math.max(t.positive, t.neutral, t.negative)));
  return Math.max(0, Math.round((v / max) * 140));
}

// keyword cloud
const KW_COLORS = ['#0032a0', '#ff8200', '#ff0044', '#7c3aed', '#0ea5e9', '#3a8a4d'];
function kwSize(k) {
  const max = Math.max(...keywords.value.map((x) => x.count), 1);
  const min = Math.min(...keywords.value.map((x) => x.count), 1);
  if (max === min) return 14;
  return 12 + Math.round(((k.count - min) / (max - min)) * 14);
}
function kwColor(k) {
  let h = 0; for (const c of k.word) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return KW_COLORS[h % KW_COLORS.length];
}

async function load() {
  const [o, k, c] = await Promise.all([
    api.get('/admin/analytics/overview'),
    api.get('/admin/analytics/keywords', { params: { limit: 40 } }),
    api.get('/admin/analytics/contributors', { params: { limit: 10 } }),
  ]);
  overview.value = o.data;
  keywords.value = k.data.keywords || [];
  contributors.value = c.data || [];
  await loadTimeline();
}
async function loadTimeline() {
  const { data } = await api.get('/admin/analytics/timeline', { params: { bucket: bucket.value } });
  timeline.value = data;
}

async function scan(onlyMissing) {
  scanning.value = true;
  try {
    const { data } = await api.post('/admin/analytics/scan', { onlyMissing });
    ElMessage.success(`扫描 ${data.scanned} 条，更新 ${data.updated} 条`);
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '失败');
  } finally { scanning.value = false; }
}

async function genSummary() {
  summarizing.value = true;
  summaryDialog.content = '生成中...';
  summaryDialog.show = true;
  try {
    const { data } = await api.post('/admin/analytics/summary', { limit: 100 });
    summaryDialog.content = data.summary || '(无内容)';
  } catch (e) {
    summaryDialog.content = `生成失败：${e.response?.data?.message || e.message}\n\n提示：请先在【系统设置】中配置 AI 引擎与 API Key。`;
  } finally { summarizing.value = false; }
}

onMounted(load);
</script>

<style scoped>
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; }
.kpi {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
}
.kpi-label { font-size: 12px; color: #64748b; }
.kpi-value { margin-top: 4px; font-size: 22px; font-weight: 700; color: var(--brand-deep); }
.tl-label { font-size: 10px; fill: #64748b; text-anchor: middle; }
</style>
