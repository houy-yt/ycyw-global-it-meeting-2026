<template>
  <div>
    <!-- ── 预设标签管理 ── -->
    <el-divider content-position="left"><b>预设标签管理</b></el-divider>
    <p class="text-xs text-slate-400 mb-3">管理剪影可用的预设标签，用户上传剪影时可快速选择。</p>
    <div class="flex gap-2 mb-3">
      <input v-model="tagName" class="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:border-brand-blue" placeholder="新标签名称" @keyup.enter="addTag" />
      <button class="btn-primary !py-2 !px-4 !text-xs" @click="addTag">+ 添加</button>
    </div>
    <div class="flex flex-wrap gap-2 mb-6">
      <div v-for="t in presetTags" :key="t.id" class="chip !text-sm !py-1.5 !px-3">
        {{ t.name }}
        <button class="ml-2 text-brand-red hover:underline" @click="delTag(t)">×</button>
      </div>
      <div v-if="!presetTags.length" class="text-sm text-slate-400">暂无标签</div>
    </div>

    <!-- ── 剪影列表 ── -->
    <el-divider content-position="left"><b>剪影列表</b></el-divider>
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
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button type="danger" size="small" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Edit Dialog -->
    <el-dialog v-model="editDialog.show" title="编辑剪影" width="560px" align-center>
      <div class="space-y-4">
        <div>
          <label class="text-sm text-slate-600 font-medium">标题</label>
          <input
            v-model="editDialog.title"
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-blue"
          />
        </div>
        <div v-if="editDialog.type === 'link'">
          <label class="text-sm text-slate-600 font-medium">视频链接</label>
          <input
            v-model="editDialog.videoLink"
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-blue"
            placeholder="https://..."
          />
        </div>
        <div v-else>
          <label class="text-sm text-slate-600 font-medium">文件路径 (fileUrl)</label>
          <input
            v-model="editDialog.fileUrl"
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-blue"
            placeholder="/uploads/gallery/..."
          />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">标签 <span class="text-xs text-slate-400">(逗号分隔)</span></label>
          <input
            v-model="editDialog.tagsStr"
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-blue"
            placeholder="标签1, 标签2"
          />
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
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';
import api from '../../api';

// ── Preset tags ──
const presetTags = ref([]);
const tagName = ref('');

async function loadTags() {
  const { data } = await api.get('/preset-tags');
  presetTags.value = data;
}
async function addTag() {
  if (!tagName.value.trim()) return;
  try {
    await api.post('/preset-tags', { name: tagName.value.trim() });
    tagName.value = '';
    loadTags();
  } catch (e) { ElMessage.error(e.response?.data?.message || '失败'); }
}
async function delTag(t) {
  await api.delete(`/preset-tags/${t.id}`);
  loadTags();
}

// ── Gallery items ──
const items = ref([]);
const q = ref('');

const editDialog = reactive({
  show: false,
  saving: false,
  id: null,
  type: 'image',
  title: '',
  fileUrl: '',
  videoLink: '',
  tagsStr: '',
});

function format(t) { return dayjs(t).format('YYYY-MM-DD HH:mm'); }

async function load() {
  const { data } = await api.get('/admin/gallery', { params: { q: q.value } });
  items.value = data;
}

function openEdit(row) {
  editDialog.id = row.id;
  editDialog.type = row.type || 'image';
  editDialog.title = row.title || '';
  editDialog.fileUrl = row.fileUrl || '';
  editDialog.videoLink = row.videoLink || '';
  editDialog.tagsStr = (row.tags || []).join(', ');
  editDialog.show = true;
}

async function saveEdit() {
  if (!editDialog.title) return ElMessage.warning('标题不能为空');
  editDialog.saving = true;
  try {
    const payload = {
      title: editDialog.title,
      tags: editDialog.tagsStr,
    };
    if (editDialog.type === 'link') {
      payload.videoLink = editDialog.videoLink;
    } else {
      payload.fileUrl = editDialog.fileUrl;
    }
    await api.patch(`/gallery/${editDialog.id}`, payload);
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
  try { await ElMessageBox.confirm('删除该剪影？', '警告', { type: 'warning' }); } catch { return; }
  await api.delete(`/gallery/${row.id}`);
  ElMessage.success('已删除');
  load();
}

onMounted(() => {
  load();
  loadTags();
});
</script>
