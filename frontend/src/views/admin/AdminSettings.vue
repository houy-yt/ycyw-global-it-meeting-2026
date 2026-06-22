<template>
  <div class="max-w-2xl">
    <h3 class="text-lg font-semibold text-brand-deep mb-4">系统设置</h3>

    <!-- ── 导航链接维护 ── -->
    <el-divider content-position="left"><b>导航链接维护</b></el-divider>
    <p class="text-xs text-slate-400 mb-3">管理页头和页尾的导航链接。拖动调整顺序，勾选控制显示位置。</p>

    <div class="space-y-2">
      <div
        v-for="(link, idx) in navLinks"
        :key="idx"
        class="p-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 space-y-2"
      >
        <div class="flex items-center gap-2">
          <div class="flex flex-col gap-0.5">
            <button
              class="text-xs text-slate-400 hover:text-brand-blue disabled:opacity-30"
              :disabled="idx === 0"
              @click="moveLink(idx, -1)"
            >▲</button>
            <button
              class="text-xs text-slate-400 hover:text-brand-blue disabled:opacity-30"
              :disabled="idx === navLinks.length - 1"
              @click="moveLink(idx, 1)"
            >▼</button>
          </div>
          <input
            v-model="link.label"
            class="form-input !py-1.5 !text-sm flex-1"
            placeholder="导航名称（也用于 Hero 标签）"
          />
          <input
            v-model="link.to"
            class="form-input !py-1.5 !text-sm w-36"
            placeholder="路径，如 /schedule"
          />
          <label class="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
            <input type="checkbox" v-model="link.showInNav" class="accent-brand-blue" />
            页头
          </label>
          <label class="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
            <input type="checkbox" v-model="link.showInFooter" class="accent-brand-blue" />
            页尾
          </label>
          <button
            class="text-slate-400 hover:text-brand-red text-sm px-1"
            @click="removeLink(idx)"
            title="删除"
          >✕</button>
        </div>
        <div class="flex items-center gap-2 pl-7">
          <input
            v-model="link.heroTitle"
            class="form-input !py-1 !text-xs flex-1"
            placeholder="Hero 大标题（留空则用导航名称）"
          />
          <input
            v-model="link.heroSubtitle"
            class="form-input !py-1 !text-xs flex-1"
            placeholder="Hero 副标题（可选）"
          />
        </div>
      </div>
    </div>

    <div class="mt-3">
      <el-button size="small" @click="addLink">
        <font-awesome-icon icon="plus" class="mr-1" /> 添加链接
      </el-button>
    </div>

    <!-- ── 上传限制 ── -->
    <el-divider content-position="left" class="mt-6"><b>上传限制（MB）</b></el-divider>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label class="text-sm text-slate-600 font-medium">图片上限 (MB)</label>
        <el-input-number v-model="form['upload.maxImageMB']" :min="1" :max="500" class="w-full" />
      </div>
      <div>
        <label class="text-sm text-slate-600 font-medium">视频上限 (MB)</label>
        <el-input-number v-model="form['upload.maxVideoMB']" :min="1" :max="2000" class="w-full" />
      </div>
      <div>
        <label class="text-sm text-slate-600 font-medium">演讲资料上限 (MB)</label>
        <el-input-number v-model="form['upload.maxResourceMB']" :min="1" :max="2000" class="w-full" />
      </div>
    </div>

    <el-divider content-position="left" class="mt-6"><b>情感分析引擎</b></el-divider>
    <div class="space-y-4">
      <div>
        <label class="text-sm text-slate-600 font-medium">引擎</label>
        <el-select v-model="form['analytics.sentimentEngine']" class="w-full">
          <el-option label="本地词典（默认，免费）" value="local" />
          <el-option label="OpenAI" value="openai" />
          <el-option label="DeepSeek" value="deepseek" />
        </el-select>
      </div>
      <div v-if="form['analytics.sentimentEngine'] !== 'local'">
        <label class="text-sm text-slate-600 font-medium">API Base URL（可选）</label>
        <input v-model="form['analytics.llmBaseUrl']" class="form-input" placeholder="https://api.openai.com/v1 或 https://api.deepseek.com/v1" />
      </div>
      <div v-if="form['analytics.sentimentEngine'] !== 'local'">
        <label class="text-sm text-slate-600 font-medium">模型名称</label>
        <input v-model="form['analytics.llmModel']" class="form-input" placeholder="gpt-4o-mini / deepseek-chat" />
      </div>
      <div v-if="form['analytics.sentimentEngine'] !== 'local'">
        <label class="text-sm text-slate-600 font-medium">API Key</label>
        <el-input v-model="form['analytics.llmApiKey']" type="password" show-password placeholder="sk-..." />
        <p class="text-xs text-slate-400 mt-1">仅用于服务器端调用，不会暴露给前端。</p>
      </div>
    </div>

    <div class="pt-6 flex gap-3">
      <el-button type="primary" :loading="saving" @click="save">保存所有设置</el-button>
      <el-button @click="load">重新加载</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../../api';

// ── General settings ──
const saving = ref(false);
const form = reactive({
  'upload.maxImageMB': 10,
  'upload.maxVideoMB': 100,
  'upload.maxResourceMB': 100,
  'analytics.sentimentEngine': 'local',
  'analytics.llmBaseUrl': '',
  'analytics.llmModel': '',
  'analytics.llmApiKey': '',
});

// ── Nav links ──
const defaultNavLinks = [
  { label: '首页',     to: '/',               showInNav: true,  showInFooter: false, heroTitle: '',                  heroSubtitle: '' },
  { label: '日程安排', to: '/schedule',        showInNav: true,  showInFooter: true,  heroTitle: '日程安排',           heroSubtitle: '' },
  { label: '会议地点', to: '/venue',           showInNav: true,  showInFooter: false, heroTitle: '',                  heroSubtitle: '' },
  { label: '参会须知', to: '/meeting-guide',   showInNav: true,  showInFooter: false, heroTitle: 'Meeting Guide',     heroSubtitle: '参会前请仔细阅读以下信息，做好出行准备' },
  { label: '参会人员', to: '/attendees',       showInNav: true,  showInFooter: true,  heroTitle: 'Meet the Team',     heroSubtitle: '' },
  { label: '会后反思', to: '/reflections',     showInNav: true,  showInFooter: true,  heroTitle: '会后反思',           heroSubtitle: '记录你的收获、想法与建议' },
  { label: '会议剪影', to: '/gallery',         showInNav: true,  showInFooter: true,  heroTitle: 'Gallery',           heroSubtitle: '照片 · 视频 · 第三方链接' },
  { label: '往届会议', to: '/past-meetings',   showInNav: false, showInFooter: true,  heroTitle: 'Past Meetings',     heroSubtitle: '回顾每一届 YCYW Global IT Meeting' },
  { label: '入校指引', to: '/entry-guide',     showInNav: false, showInFooter: false, heroTitle: 'Campus Entry Guide', heroSubtitle: '参会访客入校申请填写指引，请使用微信扫描右侧二维码完成申请' },
];

const navLinks = ref([]);

function addLink() {
  navLinks.value.push({ label: '', to: '/', showInNav: true, showInFooter: false, heroTitle: '', heroSubtitle: '' });
}

function removeLink(idx) {
  navLinks.value.splice(idx, 1);
}

function moveLink(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= navLinks.value.length) return;
  const temp = navLinks.value[idx];
  navLinks.value[idx] = navLinks.value[target];
  navLinks.value[target] = temp;
  // Trigger reactivity
  navLinks.value = [...navLinks.value];
}

async function load() {
  const { data } = await api.get('/admin/settings');
  // backend returns { list: [{key,value,category}], grouped }
  const list = Array.isArray(data) ? data : (data?.list || []);
  for (const it of list) {
    if (it.key === 'nav.links') {
      try {
        const parsed = JSON.parse(it.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          navLinks.value = parsed;
        } else {
          navLinks.value = JSON.parse(JSON.stringify(defaultNavLinks));
        }
      } catch {
        navLinks.value = JSON.parse(JSON.stringify(defaultNavLinks));
      }
    } else if (it.key in form) {
      if (typeof form[it.key] === 'number') form[it.key] = Number(it.value) || 0;
      else form[it.key] = it.value || '';
    }
  }
  // If nav.links not found in settings, use defaults
  if (navLinks.value.length === 0) {
    navLinks.value = JSON.parse(JSON.stringify(defaultNavLinks));
  }
}

async function save() {
  saving.value = true;
  try {
    const items = Object.entries(form).map(([key, value]) => ({ key, value }));
    // Add nav links as JSON
    items.push({
      key: 'nav.links',
      value: JSON.stringify(navLinks.value),
      category: 'nav',
    });
    await api.put('/admin/settings', { items });
    ElMessage.success('已保存');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally { saving.value = false; }
}

onMounted(() => {
  load();
});
</script>

<style scoped>
.form-input {
  margin-top: 0.25rem;
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  outline: none;
}
.form-input:focus { border-color: var(--brand-blue); }
</style>
