<template>
  <div>
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <el-select v-model="filter.department" placeholder="全部部门" clearable size="default" style="width:160px" @change="load">
        <el-option v-for="d in departments" :key="d.code" :label="`${d.nameCn || d.name} (${d.code})`" :value="d.code" />
      </el-select>
      <el-select v-model="filter.school" placeholder="全部学校" clearable filterable size="default" style="width:180px" @change="load">
        <el-option v-for="o in organizations" :key="o.code" :label="o.name" :value="o.code" />
      </el-select>
      <input v-model="filter.q" class="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:border-brand-blue" placeholder="姓名 / 邮箱" @keyup.enter="load" />
      <button class="btn-primary !py-2 !px-4 !text-xs" @click="load">搜索</button>
      <div class="flex-1"></div>
      <el-button :type="items.length === 0 ? 'warning' : 'default'" @click="importStatic">
        📥 从 attendees.json 导入
      </el-button>
      <el-button type="success" @click="excelDialog.show = true">
        📤 导入 Excel/CSV
      </el-button>
      <el-button type="primary" @click="openAdd">+ 新增参会人员</el-button>
    </div>

    <!-- Empty hint -->
    <el-alert
      v-if="items.length === 0 && !filter.department && !filter.school && !filter.q"
      type="info"
      :closable="false"
      class="mb-4"
      title="暂无参会人员"
      description="您可以点击右上角「📥 从 attendees.json 导入」一键导入 backend/data/attendees.json 中的全部 IT 部门人员，或手动「+ 新增参会人员」录入其他部门成员。"
      show-icon
    />

    <el-table ref="tableRef" :data="items" border stripe size="small" max-height="600" row-key="id">
      <el-table-column width="50" align="center">
        <template #header>
          <span class="text-xs text-slate-400" title="拖拽排序">↕</span>
        </template>
        <template #default>
          <span class="drag-handle cursor-move text-slate-400 hover:text-brand-blue text-lg select-none">≡</span>
        </template>
      </el-table-column>
      <el-table-column prop="no" label="#" width="60" />
      <el-table-column label="照片" width="70">
        <template #default="{ row }">
          <img v-if="row.photoUrl" :src="row.photoUrl" class="w-9 h-9 rounded-full object-cover" />
          <div v-else class="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500">N/A</div>
        </template>
      </el-table-column>
      <el-table-column prop="nameEn" label="英文名" min-width="120" />
      <el-table-column prop="nameCn" label="中文名" width="100" />
      <el-table-column label="部门" width="100">
        <template #default="{ row }">
          <el-tag :color="depColor(row.department)" effect="dark" size="small">{{ row.department }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="school" label="学校/组织" min-width="130" />
      <el-table-column prop="title" label="职务" min-width="120" />
      <el-table-column prop="email" label="邮箱" min-width="180" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.isActive" type="success" size="small">在职</el-tag>
          <el-tag v-else type="info" size="small">隐藏</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Excel/CSV import dialog -->
    <el-dialog v-model="excelDialog.show" title="导入 Excel / CSV 文件" width="860px" align-center>
      <div class="space-y-4">
        <div>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept=".xlsx,.xls,.csv"
            :on-change="handleExcelFile"
          >
            <el-button type="primary">选择文件（.xlsx / .xls / .csv）</el-button>
          </el-upload>
          <span v-if="excelDialog.fileName" class="ml-3 text-sm text-slate-500">{{ excelDialog.fileName }}</span>
        </div>

        <el-alert v-if="!excelDialog.rows.length" type="info" :closable="false" show-icon
          title="Excel / CSV 列头说明"
          description="支持列头（不区分大小写）：no / 编号, nameEn / 英文名, nameCn / 中文名, email / 邮箱, school / 学校, department / 部门, title / 职务, phone / 电话, bio / 简介, photoUrl / 照片URL。至少需要 school 列。"
        />

        <div v-if="excelDialog.rows.length">
          <div class="text-sm text-slate-600 mb-2">预览（共 {{ excelDialog.rows.length }} 行，显示前 8 行）</div>
          <el-table :data="excelDialog.rows.slice(0, 8)" border size="small" max-height="300">
            <el-table-column prop="no" label="#" width="50" />
            <el-table-column prop="nameEn" label="英文名" min-width="100" />
            <el-table-column prop="nameCn" label="中文名" width="80" />
            <el-table-column prop="email" label="邮箱" min-width="140" />
            <el-table-column prop="school" label="学校" min-width="100" />
            <el-table-column prop="department" label="部门" width="80" />
            <el-table-column prop="title" label="职务" min-width="100" />
          </el-table>
          <div class="mt-2 flex items-center gap-3">
            <el-checkbox v-model="excelDialog.clearExisting">导入前清空已有数据</el-checkbox>
            <span class="text-xs text-slate-400">（不勾选则追加）</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="excelDialog.show = false">取消</el-button>
        <el-button type="primary" :disabled="!excelDialog.rows.length" :loading="excelDialog.importing" @click="doExcelImport">
          确认导入 {{ excelDialog.rows.length }} 条
        </el-button>
      </template>
    </el-dialog>

    <!-- Edit dialog -->
    <el-dialog v-model="dialog.show" :title="dialog.id ? '编辑参会人员' : '新增参会人员'" width="640px" align-center>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="text-sm text-slate-600 font-medium">编号</label>
          <input v-model.number="dialog.form.no" type="number" class="form-input" />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">部门 *</label>
          <el-select v-model="dialog.form.department" class="w-full" placeholder="选择部门">
            <el-option v-for="d in departments" :key="d.code" :label="`${d.nameCn || d.name} (${d.code})`" :value="d.code" />
          </el-select>
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">学校 *</label>
          <el-select v-model="dialog.form.school" class="w-full" placeholder="选择学校 / 组织" filterable allow-create>
            <el-option v-for="o in organizations" :key="o.code" :label="o.name" :value="o.code" />
          </el-select>
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">英文名</label>
          <input v-model="dialog.form.nameEn" class="form-input" />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">中文名</label>
          <input v-model="dialog.form.nameCn" class="form-input" />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">邮箱</label>
          <input v-model="dialog.form.email" class="form-input" />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">职务</label>
          <input v-model="dialog.form.title" class="form-input" />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">电话</label>
          <input v-model="dialog.form.phone" class="form-input" />
        </div>
        <div class="sm:col-span-2">
          <label class="text-sm text-slate-600 font-medium">头像 URL</label>
          <div class="flex gap-2 mt-1">
            <input v-model="dialog.form.photoUrl" class="form-input !mt-0 flex-1" placeholder="/attendees/xxx.jpg 或上传" />
            <el-upload :auto-upload="true" :show-file-list="false" :http-request="uploadPhoto" accept="image/*">
              <el-button :loading="dialog.uploading">上传</el-button>
            </el-upload>
          </div>
          <div v-if="dialog.form.photoUrl" class="mt-2">
            <img :src="dialog.form.photoUrl" class="w-20 h-20 rounded object-cover ring-1 ring-slate-200" />
          </div>
        </div>
        <div class="sm:col-span-2">
          <label class="text-sm text-slate-600 font-medium">简介</label>
          <textarea v-model="dialog.form.bio" rows="3" class="form-input"></textarea>
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">排序</label>
          <input v-model.number="dialog.form.sortOrder" type="number" class="form-input" />
        </div>
        <div class="flex items-center gap-2 pt-6">
          <el-switch v-model="dialog.form.isActive" />
          <span class="text-sm">公开显示</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialog.show = false">取消</el-button>
        <el-button type="primary" :loading="dialog.saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import Sortable from 'sortablejs';
import * as XLSX from 'xlsx';
import api from '../../api';

const items = ref([]);
const departments = ref([]);
const organizations = ref([]);
const filter = reactive({ department: '', school: '', q: '' });
const tableRef = ref(null);

const dialog = reactive({
  show: false,
  id: null,
  saving: false,
  uploading: false,
  form: blankForm(),
});

function blankForm() {
  return {
    no: null,
    nameEn: '',
    nameCn: '',
    email: '',
    photoUrl: '',
    school: '',
    department: 'IT',
    title: '',
    phone: '',
    bio: '',
    sortOrder: 0,
    isActive: true,
  };
}

const DEP_COLORS = { IT: '#0032a0', Logistics: '#ff8200', HRD: '#7c3aed', FAD: '#3a8a4d', CMD: '#ff0044' };
function depColor(code) { return DEP_COLORS[code] || '#64748b'; }

async function loadMeta() {
  const [d, o] = await Promise.all([
    api.get('/admin/departments'),
    api.get('/admin/organizations'),
  ]);
  departments.value = d.data;
  organizations.value = o.data;
}

async function load() {
  const params = {};
  if (filter.department) params.department = filter.department;
  if (filter.school) params.school = filter.school;
  if (filter.q) params.q = filter.q;
  const { data } = await api.get('/admin/attendees', { params });
  items.value = data;
}

async function importStatic() {
  try {
    const force = items.value.length > 0;
    if (force) {
      await ElMessageBox.confirm(
        '数据库中已有参会人员，导入将清空已有人员并用 attendees.json 重新填充（仅 IT 部门），确定吗？',
        '强制导入', { type: 'warning' }
      );
    }
    const { data } = await api.post(`/admin/attendees/import-static${force ? '?force=1' : ''}`);
    const n = data?.result?.attendees?.attendees ?? 0;
    ElMessage.success(`已导入 ${n} 位人员`);
    await loadMeta();
    load();
  } catch (e) {
    if (e === 'cancel') return;
    ElMessage.error(e.response?.data?.message || '导入失败');
  }
}

// ───── Excel/CSV import ─────
const excelDialog = reactive({
  show: false,
  fileName: '',
  rows: [],
  clearExisting: false,
  importing: false,
});

const ATTENDEE_COL_MAP = {
  no: 'no', '编号': 'no', '#': 'no',
  nameen: 'nameEn', '英文名': 'nameEn', 'english name': 'nameEn', 'name_en': 'nameEn', 'name(en)': 'nameEn',
  namecn: 'nameCn', '中文名': 'nameCn', 'chinese name': 'nameCn', 'name_cn': 'nameCn', 'name(cn)': 'nameCn',
  email: 'email', '邮箱': 'email', 'e-mail': 'email',
  school: 'school', '学校': 'school', 'organization': 'school', '组织': 'school',
  department: 'department', '部门': 'department', 'dept': 'department',
  title: 'title', '职务': 'title', 'position': 'title', '职位': 'title',
  phone: 'phone', '电话': 'phone', 'tel': 'phone', '手机': 'phone',
  bio: 'bio', '简介': 'bio',
  photourl: 'photoUrl', '照片url': 'photoUrl', 'photo': 'photoUrl', '照片': 'photoUrl',
};

function handleExcelFile(uploadFile) {
  const file = uploadFile.raw || uploadFile;
  excelDialog.fileName = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
      // Map columns
      excelDialog.rows = raw.map((row) => {
        const mapped = {};
        for (const [key, val] of Object.entries(row)) {
          const norm = String(key).trim().toLowerCase().replace(/[\s_]+/g, '');
          const field = ATTENDEE_COL_MAP[norm];
          if (field) mapped[field] = val;
        }
        if (!mapped.department) mapped.department = 'IT';
        return mapped;
      }).filter((r) => r.school || r.nameEn || r.nameCn || r.email);
      if (!excelDialog.rows.length) ElMessage.warning('未识别到有效数据行');
    } catch (err) {
      ElMessage.error('文件解析失败: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

async function doExcelImport() {
  excelDialog.importing = true;
  try {
    if (excelDialog.clearExisting) {
      await ElMessageBox.confirm(
        `将先清空已有的 ${items.value.length} 条参会人员再导入，确定吗？`,
        '确认清空', { type: 'warning' }
      );
      // Delete all existing
      for (const item of items.value) {
        await api.delete(`/admin/attendees/${item.id}`);
      }
    }
    const { data } = await api.post('/admin/attendees/bulk', { items: excelDialog.rows });
    ElMessage.success(`成功导入 ${data.imported} 条记录`);
    excelDialog.show = false;
    excelDialog.rows = [];
    excelDialog.fileName = '';
    load();
  } catch (e) {
    if (e === 'cancel') { excelDialog.importing = false; return; }
    ElMessage.error(e.response?.data?.message || '导入失败');
  } finally {
    excelDialog.importing = false;
  }
}

function openAdd() {
  Object.assign(dialog, { show: true, id: null, form: blankForm() });
}
function openEdit(row) {
  Object.assign(dialog, {
    show: true,
    id: row.id,
    form: { ...blankForm(), ...row },
  });
}

async function save() {
  dialog.saving = true;
  try {
    if (dialog.id) await api.put(`/admin/attendees/${dialog.id}`, dialog.form);
    else await api.post('/admin/attendees', dialog.form);
    dialog.show = false;
    ElMessage.success('已保存');
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    dialog.saving = false;
  }
}

async function del(row) {
  try {
    await ElMessageBox.confirm(`确定删除 "${row.nameEn || row.nameCn}"?`, '提示', { type: 'warning' });
    await api.delete(`/admin/attendees/${row.id}`);
    ElMessage.success('已删除');
    load();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.response?.data?.message || '删除失败');
  }
}

async function uploadPhoto({ file }) {
  dialog.uploading = true;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/admin/attendees/upload-photo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    dialog.form.photoUrl = data.url;
    ElMessage.success('已上传');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '上传失败');
  } finally {
    dialog.uploading = false;
  }
}

// ───── Drag sort ─────
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
      const payload = items.value.map((item, idx) => ({ id: item.id, sortOrder: idx }));
      try {
        await api.put('/admin/attendees/sort', payload);
        items.value.forEach((item, idx) => { item.sortOrder = idx; });
        ElMessage.success('排序已保存');
      } catch {
        ElMessage.error('排序保存失败');
        load();
      }
    },
  });
}

onMounted(async () => {
  await loadMeta();
  await load();
  await nextTick();
  initSortable();
});
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
