<template>
  <div>
    <div class="flex justify-end mb-3">
      <button class="btn-primary !py-2 !px-4 !text-xs" @click="open()"><font-awesome-icon icon="plus" class="mr-1" /> 新增公告</button>
    </div>
    <el-table :data="items" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="content" label="内容" min-width="300" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'">
            {{ row.isActive ? '生效中' : '已禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ format(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small" @click="open(row)">编辑</el-button>
          <el-button :type="row.isActive ? 'warning' : 'success'" size="small" @click="toggle(row)">
            {{ row.isActive ? '禁用' : '启用' }}
          </el-button>
          <el-button type="danger" size="small" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog" :title="form.id ? '编辑公告' : '新增公告'" width="500px">
      <el-form :model="form">
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="生效">
          <el-switch v-model="form.isActive" />
        </el-form-item>
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
import dayjs from 'dayjs';
import api from '../../api';

const items = ref([]);
const dialog = ref(false);
const form = reactive({ id: null, content: '', isActive: true });

function format(t) { return dayjs(t).format('YYYY-MM-DD HH:mm'); }

async function load() {
  const { data } = await api.get('/announcements');
  items.value = data;
}
function open(row) {
  if (row) Object.assign(form, row);
  else Object.assign(form, { id: null, content: '', isActive: true });
  dialog.value = true;
}
async function save() {
  try {
    if (form.id) await api.put(`/announcements/${form.id}`, form);
    else await api.post('/announcements', form);
    ElMessage.success('已保存');
    dialog.value = false;
    load();
  } catch (e) { ElMessage.error(e.response?.data?.message || '保存失败'); }
}
async function toggle(row) {
  await api.put(`/announcements/${row.id}`, { isActive: !row.isActive });
  load();
}
async function del(row) {
  try { await ElMessageBox.confirm('删除？', '警告', { type: 'warning' }); } catch { return; }
  await api.delete(`/announcements/${row.id}`);
  load();
}

onMounted(load);
</script>
