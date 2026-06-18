<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-base font-semibold text-brand-deep">学校 / 组织维护</h3>
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-400">拖拽 <span class="font-mono">≡</span> 调整排序</span>
        <el-button type="primary" @click="openAdd">+ 新增组织</el-button>
      </div>
    </div>
    <el-table ref="tableRef" :data="items" border stripe size="small" row-key="id">
      <el-table-column width="50" align="center">
        <template #default>
          <span class="drag-handle cursor-move text-slate-400 hover:text-brand-blue text-lg select-none">≡</span>
        </template>
      </el-table-column>
      <el-table-column prop="code" label="代码" width="140" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column prop="category" label="类别" width="120" />
      <el-table-column label="颜色" width="100">
        <template #default="{ row }">
          <span v-if="row.color" class="inline-block w-5 h-5 rounded ring-1 ring-slate-200" :style="{ background: row.color }" />
          <span v-else class="text-slate-400 text-xs">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.show" :title="dialog.id ? '编辑组织' : '新增组织'" width="460px" align-center>
      <div class="space-y-3">
        <div><label class="text-sm text-slate-600 font-medium">代码 *</label><input v-model="dialog.form.code" class="form-input" placeholder="YCIS-BJ" /></div>
        <div><label class="text-sm text-slate-600 font-medium">名称 *</label><input v-model="dialog.form.name" class="form-input" placeholder="耀中国际学校（北京）" /></div>
        <div>
          <label class="text-sm text-slate-600 font-medium">类别</label>
          <el-select v-model="dialog.form.category" class="w-full">
            <el-option label="学校" value="school" />
            <el-option label="总部" value="headquarter" />
            <el-option label="其他" value="other" />
          </el-select>
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">颜色</label>
          <div class="flex items-center gap-2 mt-1">
            <button
              v-for="c in PRESET_COLORS"
              :key="c.value"
              class="w-8 h-8 rounded-lg ring-1 ring-slate-200 transition hover:scale-110 flex items-center justify-center"
              :class="dialog.form.color === c.value ? 'ring-2 ring-brand-blue scale-110' : ''"
              :style="{ background: c.value }"
              :title="c.label"
              @click="dialog.form.color = c.value"
            >
              <span v-if="dialog.form.color === c.value" class="text-white text-xs font-bold">✓</span>
            </button>
            <input v-model="dialog.form.color" class="form-input !mt-0 !w-32" placeholder="#0032a0" />
            <span
              v-if="dialog.form.color"
              class="inline-block w-6 h-6 rounded ring-1 ring-slate-200 flex-shrink-0"
              :style="{ background: dialog.form.color }"
            />
          </div>
        </div>
        <div><label class="text-sm text-slate-600 font-medium">排序</label><input v-model.number="dialog.form.sortOrder" type="number" class="form-input" /></div>
      </div>
      <template #footer>
        <el-button @click="dialog.show = false">取消</el-button>
        <el-button type="primary" :loading="dialog.saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import Sortable from 'sortablejs';
import api from '../../api';

const PRESET_COLORS = [
  { value: '#0032a0', label: '耀华蓝' },
  { value: '#ff0044', label: '耀中红' },
  { value: '#ff8200', label: '耀华橙' },
];

function defaultColorForCode(code) {
  const upper = (code || '').toUpperCase();
  if (upper.includes('YCIS')) return '#ff0044';
  if (upper.includes('YWIES') || upper.includes('YWAD')) return '#ff8200';
  return '#0032a0';
}

const items = ref([]);
const tableRef = ref(null);
const dialog = reactive({ show: false, id: null, saving: false, form: blank() });
function blank() { return { code: '', name: '', category: 'school', color: '#0032a0', sortOrder: 0 }; }

// Auto-suggest color when typing code in add mode
watch(() => dialog.form.code, (newCode) => {
  if (!dialog.id && newCode) {
    dialog.form.color = defaultColorForCode(newCode);
  }
});

async function load() {
  const { data } = await api.get('/admin/organizations');
  items.value = data;
  await nextTick();
  initSortable();
}

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
      const moved = items.value.splice(oldIndex, 1)[0];
      items.value.splice(newIndex, 0, moved);
      // Build sort payload
      const payload = items.value.map((item, idx) => ({ id: item.id, sortOrder: idx }));
      try {
        await api.put('/admin/organizations/sort', payload);
        // Update local sortOrder values
        items.value.forEach((item, idx) => { item.sortOrder = idx; });
        ElMessage.success('排序已保存');
      } catch (e) {
        ElMessage.error('排序保存失败');
        load(); // reload on error
      }
    },
  });
}

function openAdd() {
  const nextSort = items.value.length > 0 ? Math.max(...items.value.map((i) => i.sortOrder)) + 1 : 0;
  Object.assign(dialog, { show: true, id: null, form: { ...blank(), sortOrder: nextSort } });
}
function openEdit(row) { Object.assign(dialog, { show: true, id: row.id, form: { ...blank(), ...row } }); }

async function save() {
  dialog.saving = true;
  try {
    if (dialog.id) await api.put(`/admin/organizations/${dialog.id}`, dialog.form);
    else await api.post('/admin/organizations', dialog.form);
    dialog.show = false;
    ElMessage.success('已保存');
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally { dialog.saving = false; }
}
async function del(row) {
  try {
    await ElMessageBox.confirm(`确定删除 "${row.name}"?`, '提示', { type: 'warning' });
    await api.delete(`/admin/organizations/${row.id}`);
    ElMessage.success('已删除');
    load();
  } catch (e) { if (e !== 'cancel') ElMessage.error(e.response?.data?.message || '失败'); }
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

/* Sortable ghost row highlight */
:deep(.sortable-ghost) {
  background: #e0ecff !important;
  opacity: 0.8;
}
:deep(.sortable-ghost td) {
  background: #e0ecff !important;
}
</style>
