<template>
  <div class="max-w-2xl">
    <h3 class="text-lg font-semibold text-brand-deep mb-4">系统设置</h3>

    <el-divider content-position="left"><b>入校指引 — 二维码管理</b></el-divider>
    <div class="space-y-4">
      <div>
        <label class="text-sm text-slate-600 font-medium block mb-2">当前访客申请二维码</label>
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0">
            <img
              :src="qrcodePreview || '/fksq-qrcode.jpg'"
              alt="当前二维码"
              class="w-32 h-32 rounded-lg border border-slate-200 object-contain bg-white shadow-sm"
            />
          </div>
          <div class="space-y-2">
            <p class="text-xs text-slate-400">支持 JPG / PNG 格式，建议尺寸 500×500 以上，最大 5MB</p>
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept="image/*"
              :on-change="onQrcodeFileChange"
            >
              <el-button size="small" type="primary">
                <font-awesome-icon icon="upload" class="mr-1" />
                选择新二维码
              </el-button>
            </el-upload>
            <div v-if="qrcodeFile" class="text-xs text-slate-500">
              已选择: {{ qrcodeFile.name }}
              <el-button size="small" type="success" :loading="qrcodeUploading" class="ml-2" @click="uploadQrcode">
                确认上传
              </el-button>
              <el-button size="small" @click="cancelQrcode">取消</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

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

// ── QR Code management ──
const qrcodePreview = ref('');
const qrcodeFile = ref(null);
const qrcodeUploading = ref(false);

function onQrcodeFileChange(uploadFile) {
  const raw = uploadFile.raw || uploadFile;
  qrcodeFile.value = raw;
  // Create preview URL
  qrcodePreview.value = URL.createObjectURL(raw);
}

function cancelQrcode() {
  qrcodeFile.value = null;
  qrcodePreview.value = '';
  loadQrcodePreview();
}

async function uploadQrcode() {
  if (!qrcodeFile.value) return;
  qrcodeUploading.value = true;
  try {
    const fd = new FormData();
    fd.append('file', qrcodeFile.value);
    const { data } = await api.post('/admin/settings/entry-guide-qrcode', fd);
    qrcodePreview.value = data.qrcodeUrl;
    qrcodeFile.value = null;
    ElMessage.success('二维码已更新');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '上传失败');
  } finally {
    qrcodeUploading.value = false;
  }
}

async function loadQrcodePreview() {
  try {
    const { data } = await api.get('/entry-guide/settings');
    if (data?.qrcodeUrl) qrcodePreview.value = data.qrcodeUrl;
  } catch {
    // ignore
  }
}

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
  loadQrcodePreview();
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
