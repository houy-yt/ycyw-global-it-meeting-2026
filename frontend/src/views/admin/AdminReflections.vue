<template>
  <div>
    <div class="flex items-center gap-3 mb-4">
      <input
        v-model="q"
        placeholder="按标题/作者搜索"
        class="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:border-brand-blue"
        @keyup.enter="load"
      />
      <button class="btn-primary !py-2 !px-4 !text-xs" @click="load">搜索</button>
    </div>
    <el-table :data="items" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="180" />
      <el-table-column label="作者" width="160">
        <template #default="{ row }">{{ row.author?.email }}</template>
      </el-table-column>
      <el-table-column label="点赞 / 评论" width="120">
        <template #default="{ row }">{{ row.likeCount }} / {{ row._count?.comments }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="时间" width="170">
        <template #default="{ row }">{{ format(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button type="danger" size="small" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Edit Dialog -->
    <el-dialog v-model="editDialog.show" title="编辑反思" width="560px" align-center>
      <div class="space-y-4">
        <div>
          <label class="text-sm text-slate-600 font-medium">标题</label>
          <input
            v-model="editDialog.title"
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-blue"
          />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">内容</label>
          <textarea
            v-model="editDialog.content"
            rows="8"
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-blue resize-none"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <el-button @click="editDialog.show = false">取消</el-button>
        <el-button type="primary" :loading="editDialog.saving" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import api from '../../api';

const items = ref([]);
const q = ref('');

const editDialog = reactive({
  show: false,
  saving: false,
  id: null,
  title: '',
  content: '',
});

function format(t) {
  return dayjs(t).format('YYYY-MM-DD HH:mm');
}

async function load() {
  const { data } = await api.get('/admin/reflections', { params: { q: q.value } });
  items.value = data;
}

function openEdit(row) {
  editDialog.id = row.id;
  editDialog.title = row.title;
  editDialog.content = row.content || '';
  editDialog.show = true;
}

async function saveEdit() {
  if (!editDialog.title) return ElMessage.warning('标题不能为空');
  editDialog.saving = true;
  try {
    await api.put(`/reflections/${editDialog.id}`, {
      title: editDialog.title,
      content: editDialog.content,
    });
    ElMessage.success('保存成功');
    editDialog.show = false;
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    editDialog.saving = false;
  }
}

async function del(row) {
  try {
    await ElMessageBox.confirm('删除该反思？', '警告', { type: 'warning' });
  } catch { return; }
  await api.delete(`/reflections/${row.id}`);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>
