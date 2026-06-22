<template>
  <div class="max-w-2xl">
    <h3 class="text-lg font-semibold text-brand-deep mb-4">系统设置</h3>

    <el-divider content-position="left"><b>上传限制（MB）</b></el-divider>
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

async function load() {
  const { data } = await api.get('/admin/settings');
  // backend returns { list: [{key,value,category}], grouped }
  const list = Array.isArray(data) ? data : (data?.list || []);
  for (const it of list) {
    if (it.key in form) {
      if (typeof form[it.key] === 'number') form[it.key] = Number(it.value) || 0;
      else form[it.key] = it.value || '';
    }
  }
}

async function save() {
  saving.value = true;
  try {
    const items = Object.entries(form).map(([key, value]) => ({ key, value }));
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
