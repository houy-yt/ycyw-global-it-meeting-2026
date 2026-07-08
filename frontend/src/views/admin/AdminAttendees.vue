<template>
  <div>
    <!-- Toolbar Row 1: Search / Filter -->
    <div class="flex flex-wrap items-center gap-3 mb-3">
      <el-select v-model="filter.department" placeholder="全部部门" clearable size="default" style="width:160px" @change="load">
        <el-option v-for="d in departments" :key="d.code" :label="`${d.nameCn || d.name} (${d.code})`" :value="d.code" />
      </el-select>
      <el-select v-model="filter.school" placeholder="全部学校" clearable filterable size="default" style="width:180px" @change="load">
        <el-option v-for="o in organizations" :key="o.code" :label="o.name" :value="o.code" />
      </el-select>
      <input v-model="filter.q" class="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:border-brand-blue" placeholder="姓名 / 邮箱" @keyup.enter="load" />
      <button class="btn-primary !py-2 !px-4 !text-xs" @click="load">搜索</button>
    </div>

    <!-- Toolbar Row 2: Action Buttons -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <!-- Left: Import & Add -->
      <el-button :type="items.length === 0 ? 'warning' : 'default'" @click="triggerJsonImport">
        <font-awesome-icon icon="file-import" class="mr-1" /> 导入 Json 文件
      </el-button>
      <input ref="jsonFileInput" type="file" accept=".json" style="display:none" @change="handleJsonFile" />
      <el-button type="success" @click="excelDialog.show = true">
        <font-awesome-icon icon="file-arrow-up" class="mr-1" /> 导入 Excel/CSV
      </el-button>
      <el-button type="primary" @click="openAdd">+ 新增参会人员</el-button>

      <div class="flex-1"></div>

      <!-- Right: Export -->
      <el-button type="success" @click="exportAttendees">
        <font-awesome-icon icon="file-arrow-down" class="mr-1" /> 导出参会人员名单
      </el-button>
      <el-button type="warning" :loading="exportingPhotos" @click="exportPhotos">
        <font-awesome-icon icon="images" class="mr-1" /> 导出参会人员照片
      </el-button>
    </div>

    <!-- Empty hint -->
    <el-alert
      v-if="items.length === 0 && !filter.department && !filter.school && !filter.q"
      type="info"
      :closable="false"
      class="mb-4"
      title="暂无参会人员"
      description="您可以点击「导入 Json 文件」选择编辑好的 attendees.json 文件导入人员数据，或手动「+ 新增参会人员」录入其他部门成员。"
      show-icon
    />

    <!-- Grouped by school/organization -->
    <el-collapse v-model="activeGroups" class="attendee-groups">
      <el-collapse-item v-for="group in groupedItems" :key="group.school" :name="group.school">
        <template #title>
          <div class="flex items-center gap-3 w-full pr-2">
            <span class="text-brand-deep font-semibold text-sm">{{ group.school || '(未分配)' }}</span>
            <el-tag size="small" type="info">{{ group.members.length }} 人</el-tag>
          </div>
        </template>

        <el-table :ref="(el) => setGroupTableRef(group.school, el)" :data="group.members" border stripe size="small" row-key="id" class="group-table">
          <el-table-column width="44" align="center">
            <template #header>
              <span class="text-xs text-slate-400" title="拖拽排序">↕</span>
            </template>
            <template #default>
              <span class="drag-handle cursor-move text-slate-400 hover:text-brand-blue text-lg select-none">≡</span>
            </template>
          </el-table-column>
          <el-table-column prop="no" label="#" width="50" />
          <el-table-column label="照片" width="60">
            <template #default="{ row }">
              <img v-if="row.photoUrl" :src="row.photoUrl" class="w-8 rounded object-cover" style="aspect-ratio:3/4" />
              <div v-else class="w-8 rounded bg-slate-200 flex items-center justify-center text-xs text-slate-500" style="aspect-ratio:3/4">N/A</div>
            </template>
          </el-table-column>
          <el-table-column prop="nameEn" label="英文名" min-width="110" />
          <el-table-column prop="nameCn" label="中文名" width="90" />
          <el-table-column label="部门" width="80">
            <template #default="{ row }">
              <el-tag :color="depColor(row.department)" effect="dark" size="small">{{ row.department }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="职务" min-width="110" />
          <el-table-column prop="email" label="邮箱" min-width="160" />
          <el-table-column label="状态" width="70">
            <template #default="{ row }">
              <el-tag v-if="row.isActive" type="success" size="small">在职</el-tag>
              <el-tag v-else type="info" size="small">隐藏</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="del(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>

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
          <label class="text-sm text-slate-600 font-medium">部门 <span class="text-red-500">*</span></label>
          <el-select v-model="dialog.form.department" class="w-full" placeholder="选择部门">
            <el-option v-for="d in departments" :key="d.code" :label="`${d.nameCn || d.name} (${d.code})`" :value="d.code" />
          </el-select>
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">学校 <span class="text-red-500">*</span></label>
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
          <label class="text-sm text-slate-600 font-medium">照片 URL</label>
          <div class="flex gap-2 mt-1 items-stretch">
            <input v-model="dialog.form.photoUrl" class="form-input !mt-0 !py-0 flex-1" style="height:32px;line-height:32px;" placeholder="/uploads/attendees/xxx.jpg" />
            <el-upload :auto-upload="true" :show-file-list="false" :http-request="uploadPhoto" accept="image/*">
              <el-button :loading="dialog.uploading" style="height:32px;">选择文件</el-button>
            </el-upload>
            <el-button style="height:32px;" @click="openElFinderPicker">选择网络文件</el-button>
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
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import Sortable from 'sortablejs';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import api from '../../api';

const items = ref([]);
const departments = ref([]);
const organizations = ref([]);
const filter = reactive({ department: '', school: '', q: '' });
const activeGroups = ref([]);

// Group items by school
const groupedItems = computed(() => {
  const map = new Map();
  for (const item of items.value) {
    const key = item.school || '';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  // Sort groups alphabetically, each group's members by sortOrder
  const groups = [];
  for (const [school, members] of map) {
    members.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    groups.push({ school, members });
  }
  // Sort groups by Organization sortOrder (matching AdminOrganizations page order)
  const orgSortMap = {};
  for (const o of organizations.value) {
    orgSortMap[o.code] = o.sortOrder ?? 999;
  }
  groups.sort((a, b) => (orgSortMap[a.school] ?? 999) - (orgSortMap[b.school] ?? 999) || a.school.localeCompare(b.school));
  return groups;
});

// Track group table refs for sortable
const groupTableRefs = {};
function setGroupTableRef(school, el) {
  if (el) groupTableRefs[school] = el;
}

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
    sortOrder: -1, // New members go to top of their group
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

// ───── JSON file import ─────
const jsonFileInput = ref(null);

function triggerJsonImport() {
  jsonFileInput.value.value = '';
  jsonFileInput.value.click();
}

function handleJsonFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const jsonData = JSON.parse(e.target.result);
      if (!Array.isArray(jsonData)) {
        ElMessage.error('JSON 文件格式不正确，应为数组格式');
        return;
      }
      const force = items.value.length > 0;
      if (force) {
        await ElMessageBox.confirm(
          '数据库中已有参会人员，导入将清空已有人员并用所选 JSON 文件重新填充，确定吗？',
          '强制导入', { type: 'warning' }
        );
      }
      const { data } = await api.post('/admin/attendees/import-json', { jsonData, force });
      const n = data?.attendees ?? 0;
      ElMessage.success(`已导入 ${n} 位人员`);
      await loadMeta();
      load();
    } catch (err) {
      if (err === 'cancel') return;
      if (err instanceof SyntaxError) {
        ElMessage.error('JSON 文件解析失败，请检查文件格式');
      } else {
        ElMessage.error(err.response?.data?.message || '导入失败');
      }
    }
  };
  reader.readAsText(file);
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

// ───── Export attendees to Excel ─────
function exportAttendees() {
  const rows = [];
  for (const group of groupedItems.value) {
    for (const item of group.members) {
      rows.push({
        '#': item.no ?? '',
        '部门': item.department ?? '',
        '学校': item.school ?? '',
        '职务': item.title ?? '',
        '英文名': item.nameEn ?? '',
        '中文名': item.nameCn ?? '',
        '邮箱': item.email ?? '',
        '照片': item.photoUrl ?? '',
      });
    }
  }
  if (!rows.length) { ElMessage.warning('暂无参会人员可导出'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },   // #
    { wch: 10 },  // 部门
    { wch: 20 },  // 学校
    { wch: 20 },  // 职务
    { wch: 20 },  // EN Name
    { wch: 12 },  // Name
    { wch: 30 },  // Email
    { wch: 40 },  // 照片
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '参会人员名单');
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `参会人员名单_${today}.xlsx`);
  ElMessage.success(`已导出 ${rows.length} 条记录`);
}

// ───── Export attendee photos as ZIP ─────
const exportingPhotos = ref(false);

async function exportPhotos() {
  if (items.value.length === 0) {
    ElMessage.warning('暂无参会人员可导出');
    return;
  }

  // Collect all attendees with photos
  const withPhoto = [];
  for (const group of groupedItems.value) {
    for (const item of group.members) {
      if (item.photoUrl) {
        withPhoto.push(item);
      }
    }
  }

  if (withPhoto.length === 0) {
    ElMessage.warning('没有参会人员有照片可导出');
    return;
  }

  exportingPhotos.value = true;
  const msgInstance = ElMessage({ message: `正在打包 ${withPhoto.length} 张照片，请稍候…`, type: 'info', duration: 0 });

  try {
    const zip = new JSZip();
    const folderNameCount = {};
    let successCount = 0;
    let failCount = 0;

    const CONCURRENCY = 6;
    let index = 0;

    async function fetchNext() {
      while (index < withPhoto.length) {
        const i = index++;
        const item = withPhoto[i];
        const school = item.school || '未分配';
        const folderName = school.replace(/[\\/:*?"<>|]/g, '_');

        const nameParts = [item.nameEn, item.nameCn].filter(Boolean).join('_') || `attendee_${item.id}`;
        const ext = getExtFromUrl(item.photoUrl);

        const folderKey = folderName;
        if (!folderNameCount[folderKey]) folderNameCount[folderKey] = {};
        let fileName = `${nameParts}${ext}`;
        if (folderNameCount[folderKey][fileName]) {
          folderNameCount[folderKey][fileName]++;
          fileName = `${nameParts}_${folderNameCount[folderKey][fileName]}${ext}`;
        } else {
          folderNameCount[folderKey][fileName] = 1;
        }

        try {
          const response = await fetch(item.photoUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          zip.folder(folderName).file(fileName, blob);
          successCount++;
        } catch (err) {
          console.warn(`Failed to fetch photo for ${nameParts}:`, err);
          failCount++;
        }
      }
    }

    const workers = [];
    for (let w = 0; w < Math.min(CONCURRENCY, withPhoto.length); w++) {
      workers.push(fetchNext());
    }
    await Promise.all(workers);

    const content = await zip.generateAsync({ type: 'blob' });
    const today = new Date().toISOString().slice(0, 10);
    saveAs(content, `参会人员照片_${today}.zip`);

    msgInstance.close();
    if (failCount > 0) {
      ElMessage.warning(`已导出 ${successCount} 张照片，${failCount} 张下载失败`);
    } else {
      ElMessage.success(`已导出 ${successCount} 张照片`);
    }
  } catch (e) {
    msgInstance.close();
    ElMessage.error('导出照片失败: ' + (e.message || '未知错误'));
  } finally {
    exportingPhotos.value = false;
  }
}

function getExtFromUrl(url) {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const dotIdx = pathname.lastIndexOf('.');
    if (dotIdx > -1) {
      const ext = pathname.substring(dotIdx).toLowerCase().split('?')[0];
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext)) return ext;
    }
  } catch { /* ignore */ }
  return '.jpg';
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
  if (!dialog.form.department) return ElMessage.warning('请选择部门');
  if (!dialog.form.school) return ElMessage.warning('请选择学校');
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

// ───── Open elFinder to pick a photo ─────
function openElFinderPicker() {
  const callbackId = 'photo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const token = localStorage.getItem('token') || '';

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:100000;display:flex;align-items:center;justify-content:center;';

  // Create dialog container
  const dlg = document.createElement('div');
  dlg.style.cssText = 'background:#fff;border-radius:8px;width:80vw;height:80vh;max-width:1200px;max-height:900px;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.3);';

  // Header bar
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;border-radius:8px 8px 0 0;flex-shrink:0;';
  const title = document.createElement('strong');
  title.textContent = '选择照片文件';
  title.style.cssText = 'font-size:14px;color:#334155;';
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'border:none;background:none;font-size:18px;cursor:pointer;padding:4px 8px;color:#666;border-radius:4px;';
  closeBtn.onmouseenter = () => { closeBtn.style.background = '#f1f5f9'; closeBtn.style.color = '#000'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background = 'none'; closeBtn.style.color = '#666'; };
  closeBtn.onclick = () => cleanup();
  header.appendChild(closeBtn);

  // iframe
  const iframe = document.createElement('iframe');
  iframe.src = `/elfinder.html?cb=${callbackId}&token=${encodeURIComponent(token)}&mode=iframe`;
  iframe.style.cssText = 'flex:1;border:none;border-radius:0 0 8px 8px;width:100%;';

  dlg.appendChild(header);
  dlg.appendChild(iframe);
  overlay.appendChild(dlg);
  document.body.appendChild(overlay);

  // Click overlay background to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup();
  });

  // Cleanup function
  const cleanup = () => {
    window.removeEventListener('message', handler);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };

  // Listen for postMessage from iframe
  const handler = (e) => {
    if (e.data && e.data.type === 'elfinderFileSelected' && e.data.callbackId === callbackId) {
      dialog.form.photoUrl = e.data.url;
      ElMessage.success('已选择照片');
      cleanup();
    }
  };
  window.addEventListener('message', handler);
}

// ───── Drag sort (per group) ─────
const sortableInstances = {};

function initAllSortables() {
  // Destroy existing
  for (const key of Object.keys(sortableInstances)) {
    sortableInstances[key]?.destroy();
    delete sortableInstances[key];
  }
  // Create for each group
  for (const group of groupedItems.value) {
    const tableEl = groupTableRefs[group.school];
    if (!tableEl) continue;
    const tbody = tableEl.$el?.querySelector('.el-table__body-wrapper tbody');
    if (!tbody) continue;
    sortableInstances[group.school] = Sortable.create(tbody, {
      handle: '.drag-handle',
      animation: 180,
      ghostClass: 'sortable-ghost',
      onEnd: async ({ oldIndex, newIndex }) => {
        if (oldIndex === newIndex) return;
        const members = group.members;
        const moved = members.splice(oldIndex, 1)[0];
        members.splice(newIndex, 0, moved);
        const payload = members.map((item, idx) => ({ id: item.id, sortOrder: idx }));
        try {
          await api.put('/admin/attendees/sort', payload);
          members.forEach((item, idx) => { item.sortOrder = idx; });
          ElMessage.success('排序已保存');
        } catch {
          ElMessage.error('排序保存失败');
          load();
        }
      },
    });
  }
}

// Re-init sortables when groups change
watch(groupedItems, async () => {
  await nextTick();
  initAllSortables();
}, { flush: 'post' });

onMounted(async () => {
  await loadMeta();
  await load();
  // Expand all groups by default
  activeGroups.value = groupedItems.value.map(g => g.school);
  await nextTick();
  initAllSortables();
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

/* Collapse panel styling */
.attendee-groups :deep(.el-collapse-item__header) {
  font-size: 14px;
  height: 44px;
  line-height: 44px;
  background: #f8fafc;
  padding-left: 12px;
}
.attendee-groups :deep(.el-collapse-item__content) {
  padding: 8px 0 0 0;
}
.group-table {
  margin-bottom: 4px;
}
</style>
