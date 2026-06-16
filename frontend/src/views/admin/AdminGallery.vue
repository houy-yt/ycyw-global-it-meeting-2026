<template>
  <div>
    <div class="flex items-center gap-3 mb-4">
      <input
        v-model="q"
        placeholder="按标题/标签/上传者"
        class="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:border-brand-blue"
        @keyup.enter="load"
      />
      <button class="btn-primary !py-2 !px-4 !text-xs" @click="load">搜索</button>
    </div>
    <el-table :data="items" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="180" />
      <el-table-column prop="type" label="类型" width="80" />
      <el-table-column label="标签" min-width="180">
        <template #default="{ row }">
          <span v-for="t in row.tags" :key="t" class="chip mr-1 mb-1">{{ t }}</span>
        </template>
      </el-table-column>
      <el-table-column label="上传者" width="140">
        <template #default="{ row }">{{ row.uploader?.email }}</template>
      </el-table-column>
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ format(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button type="danger" size="small" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';
import api from '../../api';

const items = ref([]);
const q = ref('');

function format(t) { return dayjs(t).format('YYYY-MM-DD HH:mm'); }

async function load() {
  const { data } = await api.get('/admin/gallery', { params: { q: q.value } });
  items.value = data;
}

async function del(row) {
  try { await ElMessageBox.confirm('删除该剪影？', '警告', { type: 'warning' }); } catch { return; }
  await api.delete(`/gallery/${row.id}`);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>
