<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-base font-semibold text-brand-deep">部门维护</h3>
      <el-button type="primary" @click="openAdd">+ 新增部门</el-button>
    </div>
    <el-table :data="items" border stripe size="small">
      <el-table-column prop="code" label="代码" width="120" />
      <el-table-column prop="name" label="英文名" min-width="140" />
      <el-table-column prop="nameCn" label="中文名" min-width="140" />
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

    <el-dialog v-model="dialog.show" :title="dialog.id ? '编辑部门' : '新增部门'" width="460px" align-center>
      <div class="space-y-3">
        <div><label class="text-sm text-slate-600 font-medium">代码 *</label><input v-model="dialog.form.code" class="form-input" placeholder="IT" /></div>
        <div><label class="text-sm text-slate-600 font-medium">英文名 *</label><input v-model="dialog.form.name" class="form-input" /></div>
        <div><label class="text-sm text-slate-600 font-medium">中文名</label><input v-model="dialog.form.nameCn" class="form-input" /></div>
        <div><label class="text-sm text-slate-600 font-medium">颜色</label><input v-model="dialog.form.color" class="form-input" placeholder="#0032a0" /></div>
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
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../../api';

const items = ref([]);
const dialog = reactive({ show: false, id: null, saving: false, form: blank() });

function blank() { return { code: '', name: '', nameCn: '', color: '', sortOrder: 0 }; }

async function load() {
  const { data } = await api.get('/admin/departments');
  items.value = data;
}
function openAdd() { Object.assign(dialog, { show: true, id: null, form: blank() }); }
function openEdit(row) { Object.assign(dialog, { show: true, id: row.id, form: { ...blank(), ...row } }); }

async function save() {
  dialog.saving = true;
  try {
    if (dialog.id) await api.put(`/admin/departments/${dialog.id}`, dialog.form);
    else await api.post('/admin/departments', dialog.form);
    dialog.show = false;
    ElMessage.success('已保存');
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally { dialog.saving = false; }
}
async function del(row) {
  try {
    await ElMessageBox.confirm(`确定删除部门 "${row.name}" 吗？`, '提示', { type: 'warning' });
    await api.delete(`/admin/departments/${row.id}`);
    ElMessage.success('已删除');
    load();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.response?.data?.message || '删除失败');
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
