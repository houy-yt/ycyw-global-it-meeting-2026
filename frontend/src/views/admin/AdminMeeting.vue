<template>
  <div class="max-w-2xl">
    <h3 class="text-lg font-semibold text-brand-deep mb-4">会议基本信息</h3>
    <div class="space-y-4">
      <div>
        <label class="text-sm text-slate-600 font-medium">名称</label>
        <input v-model="form.name" class="form-input" />
      </div>
      <div>
        <label class="text-sm text-slate-600 font-medium">主题（中文）</label>
        <input v-model="form.tagline" class="form-input" placeholder="例：连接 · 创新 · 未来" />
      </div>
      <div>
        <label class="text-sm text-slate-600 font-medium">主题（英文） / Theme (EN)</label>
        <input v-model="form.taglineEn" class="form-input" placeholder="e.g. Connect · Innovate · Empower" />
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="text-sm text-slate-600 font-medium">开始日期</label>
          <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" class="w-full" />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">结束日期</label>
          <el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" class="w-full" />
        </div>
      </div>
      <div>
        <label class="text-sm text-slate-600 font-medium">地点</label>
        <input v-model="form.location" class="form-input" />
      </div>
      <div class="pt-2">
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../../api';

const saving = ref(false);
const form = reactive({
  name: '',
  tagline: '',
  taglineEn: '',
  startDate: '',
  endDate: '',
  location: '',
});

async function load() {
  try {
    const { data } = await api.get('/admin/meeting');
    if (!data) return;
    form.name = data.name || '';
    form.tagline = data.tagline || '';
    form.taglineEn = data.taglineEn || '';
    form.startDate = (data.startDate || '').slice(0, 10);
    form.endDate = (data.endDate || '').slice(0, 10);
    form.location = data.location || '';
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载失败');
  }
}

async function save() {
  saving.value = true;
  try {
    await api.put('/admin/meeting', form);
    ElMessage.success('已保存');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(load);
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
