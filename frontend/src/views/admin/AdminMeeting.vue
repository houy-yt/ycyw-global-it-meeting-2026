<template>
  <div>
    <div class="space-y-4">
      <div>
        <label class="text-sm text-slate-600 font-medium">名称</label>
        <input v-model="form.name" class="form-input" />
      </div>
      <div>
        <label class="text-sm text-slate-600 font-medium">主题（中文）</label>
        <textarea v-model="form.tagline" class="form-input" rows="2" placeholder="例：连接 · 创新 · 未来" />
        <p class="mt-1 text-xs text-slate-400">按 Enter 可控制前台显示的换行位置</p>
      </div>
      <div>
        <label class="text-sm text-slate-600 font-medium">主题（英文） / Theme (EN)</label>
        <textarea v-model="form.taglineEn" class="form-input" rows="2" placeholder="e.g. Connect · Innovate · Empower" />
        <p class="mt-1 text-xs text-slate-400">Press Enter to control line break position on the frontend</p>
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
        <label class="text-sm text-slate-600 font-medium">会议所在地区/学校</label>
        <input v-model="form.region" class="form-input" placeholder="例：北京亦庄" />
      </div>
      <div>
        <label class="text-sm text-slate-600 font-medium">会场</label>
        <input v-model="form.location" class="form-input" placeholder="例：耀华国际教育学校（亦庄校区）" />
      </div>
      <div>
        <label class="text-sm text-slate-600 font-medium">详细地址</label>
        <input v-model="form.address" class="form-input" placeholder="例：北京市大兴区经济技术开发区凉水河二街29号院" />
      </div>
      <div>
        <label class="text-sm text-slate-600 font-medium">主办方</label>
        <input v-model="form.organizer" class="form-input" placeholder="例：YCYW Education" />
      </div>

      <!-- ── 关于 ── -->
      <div class="border-t border-slate-200 pt-4 mt-4">
        <h3 class="text-base font-semibold text-brand-deep mb-3">关于</h3>
        <div>
          <label class="text-sm text-slate-600 font-medium">标题</label>
          <input v-model="form.aboutTitle" class="form-input" placeholder="例：关于本次会议" />
        </div>
        <div class="mt-4">
          <label class="text-sm text-slate-600 font-medium mb-1 block">内容</label>
          <TinyEditor v-model="form.aboutContent" :height="320" :menubar="false" />
        </div>
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
import TinyEditor from '../../components/TinyEditor.vue';

const saving = ref(false);
const form = reactive({
  name: '',
  tagline: '',
  taglineEn: '',
  startDate: '',
  endDate: '',
  region: '',
  location: '',
  address: '',
  organizer: '',
  aboutTitle: '',
  aboutContent: '',
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
    form.region = data.region || '';
    form.location = data.location || '';
    form.address = data.address || '';
    form.organizer = data.organizer || '';
    form.aboutTitle = data.aboutTitle || '';
    form.aboutContent = data.aboutContent || '';
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
