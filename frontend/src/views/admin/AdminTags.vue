<template>
  <div>
    <div class="flex gap-2 mb-4">
      <input v-model="name" class="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:border-brand-blue" placeholder="新标签名称" @keyup.enter="add" />
      <button class="btn-primary !py-2 !px-4 !text-xs" @click="add">+ 添加</button>
    </div>
    <div class="flex flex-wrap gap-2">
      <div v-for="t in items" :key="t.id" class="chip !text-sm !py-1.5 !px-3">
        {{ t.name }}
        <button class="ml-2 text-brand-red hover:underline" @click="del(t)">×</button>
      </div>
      <div v-if="!items.length" class="text-sm text-slate-400">暂无标签</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../../api';

const items = ref([]);
const name = ref('');

async function load() {
  const { data } = await api.get('/preset-tags');
  items.value = data;
}
async function add() {
  if (!name.value.trim()) return;
  try {
    await api.post('/preset-tags', { name: name.value.trim() });
    name.value = '';
    load();
  } catch (e) { ElMessage.error(e.response?.data?.message || '失败'); }
}
async function del(t) {
  await api.delete(`/preset-tags/${t.id}`);
  load();
}
onMounted(load);
</script>
