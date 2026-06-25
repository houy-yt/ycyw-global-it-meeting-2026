<template>
  <div>
    <!-- ── 进校二维码管理 ── -->
    <div class="mb-8">
      <h3 class="text-lg font-bold text-brand-deep mb-3">
        <font-awesome-icon icon="qrcode" class="mr-1 text-brand-blue" />
        进校二维码管理
      </h3>
      <div class="bg-slate-50 rounded-lg border border-slate-200 p-5">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0">
            <img
              :src="qrcodePreview || '/fksq-qrcode.jpg'"
              alt="当前二维码"
              class="w-32 h-32 rounded-lg border border-slate-200 object-contain bg-white shadow-sm"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm text-slate-600 font-medium block">当前访客申请二维码</label>
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

    <!-- ── 参会须知卡片管理 ── -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold text-brand-deep">
        <font-awesome-icon icon="clipboard-check" class="mr-1 text-brand-blue" />
        参会须知卡片管理
      </h3>
      <div class="flex gap-2">
        <el-button size="small" @click="seedDefaults" :loading="seeding">
          <font-awesome-icon icon="wand-magic-sparkles" class="mr-1" />
          导入默认卡片
        </el-button>
        <el-button type="primary" size="small" @click="openCreate">
          <font-awesome-icon icon="plus" class="mr-1" />
          新增卡片
        </el-button>
      </div>
    </div>

    <el-table ref="tableRef" :data="items" stripe v-loading="loading" row-key="id" empty-text="暂无卡片">
      <el-table-column width="50" align="center">
        <template #header><font-awesome-icon icon="grip-vertical" class="text-slate-300" /></template>
        <template #default><span class="drag-handle cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"><font-awesome-icon icon="grip-vertical" /></span></template>
      </el-table-column>
      <el-table-column label="排序" prop="sortOrder" width="60" align="center" />
      <el-table-column label="Key" prop="key" width="120" />
      <el-table-column label="图标" width="70" align="center">
        <template #default="{ row }">
          <font-awesome-icon :icon="row.icon" :class="row.iconColor" />
        </template>
      </el-table-column>
      <el-table-column label="标题" prop="title" min-width="120" />
      <el-table-column label="列跨度" prop="colSpan" width="80" align="center">
        <template #default="{ row }">{{ row.colSpan === 2 ? '整行' : '半行' }}</template>
      </el-table-column>
      <el-table-column label="可见" width="70" align="center">
        <template #default="{ row }">
          <el-switch v-model="row.visible" size="small" @change="toggleVisible(row)" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- ── 入校指引 ── -->
    <div class="mt-10">
      <h3 class="text-lg font-bold text-brand-deep mb-3">
        <font-awesome-icon icon="signs-post" class="mr-1 text-green-600" />
        入校指引
      </h3>
      <p class="text-xs text-slate-400 mb-3">使用下方富文本编辑器编辑入校指引内容，保存后将展示在前台入校指引页面底部。</p>
      <TinyEditor
        v-model="entryGuideContent"
        :height="400"
        placeholder="请输入入校指引内容..."
        class="mb-3"
      />
      <el-button type="primary" :loading="entryGuideSaving" @click="saveEntryGuide">
        <font-awesome-icon icon="cloud" class="mr-1" />
        保存入校指引
      </el-button>
    </div>

    <!-- Edit/Create Dialog -->
    <el-dialog v-model="dlgVisible" :title="isEdit ? '编辑卡片' : '新增卡片'" width="800px" destroy-on-close align-center class="card-edit-dialog">
      <el-form :model="form" label-width="80px" label-position="top">
        <div class="grid grid-cols-2 gap-4">
          <el-form-item label="Key（唯一标识）">
            <el-input v-model="form.key" :disabled="isEdit" placeholder="e.g. hotel" />
          </el-form-item>
          <el-form-item label="标题">
            <el-input v-model="form.title" placeholder="e.g. 住宿安排" />
          </el-form-item>
          <el-form-item label="图标（FA名）">
            <el-input v-model="form.icon" placeholder="e.g. hotel">
              <template #prefix>
                <font-awesome-icon :icon="form.icon || 'circle-info'" class="text-slate-500" />
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="form.sortOrder" :min="0" />
          </el-form-item>
          <el-form-item label="图标颜色 Class">
            <el-input v-model="form.iconColor" placeholder="text-brand-blue" />
          </el-form-item>
          <el-form-item label="图标背景 Class">
            <el-input v-model="form.iconBg" placeholder="bg-brand-blue/10" />
          </el-form-item>
          <el-form-item label="列跨度">
            <el-radio-group v-model="form.colSpan">
              <el-radio :value="1">半行（1列）</el-radio>
              <el-radio :value="2">整行（2列）</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="可见">
            <el-switch v-model="form.visible" />
          </el-form-item>
        </div>
        <el-form-item label="内容">
          <TinyEditor
            v-model="form.content"
            :height="300"
            placeholder="请输入卡片内容..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlgVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import Sortable from 'sortablejs';
import api from '../../api';
import TinyEditor from '../../components/TinyEditor.vue';

const tableRef = ref(null);
let sortableInstance = null;

function initSortable() {
  if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
  const el = tableRef.value?.$el?.querySelector('.el-table__body-wrapper tbody');
  if (!el) return;
  sortableInstance = Sortable.create(el, {
    handle: '.drag-handle',
    animation: 180,
    ghostClass: 'sortable-ghost',
    onEnd: async ({ oldIndex, newIndex }) => {
      if (oldIndex === newIndex) return;
      const row = items.value.splice(oldIndex, 1)[0];
      items.value.splice(newIndex, 0, row);
      const orders = items.value.map((it, i) => ({ id: it.id, sortOrder: i }));
      items.value.forEach((it, i) => { it.sortOrder = i; });
      try {
        await api.put('/admin/meeting-guide/reorder', { orders });
      } catch {
        ElMessage.error('排序保存失败');
        await loadItems();
      }
    },
  });
}

// ── QR Code management ──
const qrcodePreview = ref('');
const qrcodeFile = ref(null);
const qrcodeUploading = ref(false);

function onQrcodeFileChange(uploadFile) {
  const raw = uploadFile.raw || uploadFile;
  qrcodeFile.value = raw;
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

// ── Guide cards management ──
const items = ref([]);
const loading = ref(false);
const seeding = ref(false);
const dlgVisible = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const editId = ref(null);

const emptyForm = () => ({
  key: '',
  title: '',
  icon: 'circle-info',
  iconColor: 'text-brand-blue',
  iconBg: 'bg-brand-blue/10',
  content: '',
  sortOrder: 0,
  colSpan: 1,
  visible: true,
});
const form = ref(emptyForm());

async function loadItems() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/meeting-guide');
    items.value = data;
    await nextTick();
    initSortable();
  } catch (e) {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  isEdit.value = false;
  editId.value = null;
  form.value = emptyForm();
  dlgVisible.value = true;
}

function openEdit(row) {
  isEdit.value = true;
  editId.value = row.id;
  form.value = { ...row };
  dlgVisible.value = true;
}

async function handleSave() {
  if (!form.value.key || !form.value.title) {
    return ElMessage.warning('Key 和标题为必填');
  }
  saving.value = true;
  try {
    if (isEdit.value) {
      await api.put(`/admin/meeting-guide/${editId.value}`, form.value);
    } else {
      await api.post('/admin/meeting-guide', form.value);
    }
    ElMessage.success('保存成功');
    dlgVisible.value = false;
    await loadItems();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.title}」？`, '提示', { type: 'warning' });
    await api.delete(`/admin/meeting-guide/${row.id}`);
    ElMessage.success('已删除');
    await loadItems();
  } catch {
    // cancelled
  }
}

async function toggleVisible(row) {
  try {
    await api.put(`/admin/meeting-guide/${row.id}`, { visible: row.visible });
  } catch {
    row.visible = !row.visible;
    ElMessage.error('更新失败');
  }
}

async function seedDefaults() {
  seeding.value = true;
  try {
    const { data } = await api.post('/admin/meeting-guide/seed-defaults');
    ElMessage.success(`导入完成：新增 ${data.created} 张卡片`);
    await loadItems();
  } catch (e) {
    ElMessage.error('导入失败');
  } finally {
    seeding.value = false;
  }
}

// ── Entry Guide custom content ──
const entryGuideContent = ref('');
const entryGuideSaving = ref(false);

async function loadEntryGuideContent() {
  try {
    const { data } = await api.get('/admin/settings');
    const list = Array.isArray(data) ? data : (data?.list || []);
    const item = list.find(it => it.key === 'entryGuide.customContent');
    if (item) entryGuideContent.value = item.value || '';
  } catch {
    // ignore
  }
}

async function saveEntryGuide() {
  entryGuideSaving.value = true;
  try {
    await api.put('/admin/settings', {
      items: [{ key: 'entryGuide.customContent', value: entryGuideContent.value }],
    });
    ElMessage.success('入校指引已保存');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    entryGuideSaving.value = false;
  }
}

onMounted(() => {
  loadItems();
  loadQrcodePreview();
  loadEntryGuideContent();
});
</script>

<style scoped>
/* Sortable ghost row highlight */
:deep(.sortable-ghost) {
  background-color: #ecf5ff !important;
  opacity: 0.8;
}

/* ========== Preview styles (same as MeetingGuideView) ========== */
.guide-content :deep(p) { margin-bottom: 0.5rem; }
.guide-content :deep(p:last-child) { margin-bottom: 0; }
.guide-content :deep(strong) { color: #334155; font-weight: 600; }
.guide-content :deep(code) { padding: 0.15rem 0.5rem; background: #f1f5f9; border-radius: 0.25rem; color: #001e60; font-family: ui-monospace, monospace; font-weight: 600; }
.guide-content :deep(em) { color: #94a3b8; font-style: italic; }
.guide-content :deep(ul) { list-style: none; padding: 0; margin: 0; }
.guide-content :deep(li) { margin-bottom: 0.75rem; padding-left: 1.25rem; position: relative; }
.guide-content :deep(li::before) { content: '\f00c'; font-family: 'Font Awesome 6 Free'; font-weight: 900; position: absolute; left: 0; color: #0032a0; font-size: 0.75rem; }
.guide-content :deep(li:last-child) { margin-bottom: 0; }
.guide-content :deep(.info) { display: flex; align-items: center; gap: 0.375rem; color: #0032a0; }
.guide-content :deep(.info::before) { content: '\f05a'; font-family: 'Font Awesome 6 Free'; font-weight: 900; }
.guide-content :deep(.warn) { margin-top: 0.75rem; padding: 0.75rem; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 0.5rem; font-size: 0.75rem; color: #92400e; line-height: 1.6; }
.guide-content :deep(.warn-title) { font-weight: 600; margin-bottom: 0.25rem; }
.guide-content :deep(.warn-title::before) { content: '\f071  '; font-family: 'Font Awesome 6 Free'; font-weight: 900; }
.guide-content :deep(.note) { margin-top: 0.75rem; padding: 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.75rem; color: #64748b; line-height: 1.6; }
.guide-content :deep(.note::before) { content: '\f05a  '; font-family: 'Font Awesome 6 Free'; font-weight: 900; }

/* ========== Card edit dialog: centered + scrollable body ========== */
:global(.card-edit-dialog .el-dialog__body) {
  max-height: 65vh;
  overflow-y: auto;
  padding-top: 12px;
  padding-bottom: 12px;
}
</style>
