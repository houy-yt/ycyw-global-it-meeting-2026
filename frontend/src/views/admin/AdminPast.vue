<template>
  <div>
    <div class="flex justify-end mb-3">
      <button class="btn-primary !py-2 !px-4 !text-xs" @click="open()"><font-awesome-icon icon="plus" class="mr-1" /> 新增</button>
    </div>
    <el-table :data="items" border stripe>
      <el-table-column prop="year" label="年份" width="100" />
      <el-table-column prop="title" label="名称" min-width="200" />
      <el-table-column prop="location" label="地点" width="160" />
      <el-table-column prop="dateRange" label="日期" width="160" />
      <el-table-column label="链接" min-width="200">
        <template #default="{ row }">
          <a v-if="row.linkUrl" :href="row.linkUrl" target="_blank" class="text-brand-blue underline truncate">{{ row.linkUrl }}</a>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="open(row)">编辑</el-button>
          <el-button type="danger" size="small" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog" :title="form.id ? '编辑往届' : '新增往届'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="年份"><el-input-number v-model="form.year" :min="2000" :max="2100" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="地点"><el-input v-model="form.location" /></el-form-item>
        <el-form-item label="日期"><el-input v-model="form.dateRange" placeholder="如：7月14-16日" /></el-form-item>
        <el-form-item label="链接"><el-input v-model="form.linkUrl" placeholder="可选" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../../api';

const items = ref([]);
const dialog = ref(false);
const form = reactive({ id: null, year: new Date().getFullYear(), title: '', location: '', dateRange: '', linkUrl: '' });

async function load() {
  const { data } = await api.get('/past-meetings');
  items.value = data;
}
function open(row) {
  if (row) Object.assign(form, row);
  else Object.assign(form, { id: null, year: new Date().getFullYear(), title: '', location: '', dateRange: '', linkUrl: '' });
  dialog.value = true;
}
async function save() {
  try {
    if (form.id) await api.put(`/past-meetings/${form.id}`, form);
    else await api.post('/past-meetings', form);
    ElMessage.success('已保存');
    dialog.value = false;
    load();
  } catch (e) { ElMessage.error(e.response?.data?.message || '保存失败'); }
}
async function del(row) {
  try { await ElMessageBox.confirm('删除？', '警告', { type: 'warning' }); } catch { return; }
  await api.delete(`/past-meetings/${row.id}`);
  load();
}

onMounted(load);
</script>
