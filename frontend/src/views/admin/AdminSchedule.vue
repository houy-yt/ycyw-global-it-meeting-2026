<template>
  <div>
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <!-- Left: Import & Add -->
      <el-button :type="days.length === 0 ? 'warning' : 'default'" :icon="null" @click="triggerJsonImport">
        <font-awesome-icon icon="file-import" class="mr-1" /> 导入 Json 文件
      </el-button>
      <input ref="jsonFileInput" type="file" accept=".json" style="display:none" @change="handleJsonFile" />
      <el-button type="success" @click="excelDialog.show = true">
        <font-awesome-icon icon="file-arrow-up" class="mr-1" /> 导入 Excel/CSV
      </el-button>
      <el-button type="primary" @click="openDayDialog(null)">+ 新增日期</el-button>

      <div class="flex-1"></div>

      <!-- Right: Export -->
      <el-button type="success" @click="exportSchedule">
        <font-awesome-icon icon="file-arrow-down" class="mr-1" /> 导出日程安排
      </el-button>
    </div>

    <!-- Empty hint -->
    <el-alert
      v-if="!loading && days.length === 0"
      type="info"
      :closable="false"
      class="mb-4"
      title="暂无日程数据"
      description="您可以点击「导入 Json 文件」选择编辑好的 schedule.json 文件导入日程，或手动「+ 新增日期」开始维护。"
      show-icon
    />

    <div v-loading="loading">
      <el-collapse v-model="activeDays">
        <el-collapse-item v-for="day in days" :key="day.id" :name="day.id">
          <template #title>
            <div class="flex items-center gap-3 w-full pr-2">
              <span class="text-brand-deep font-semibold">{{ day.dayLabel }}</span>
              <span class="text-xs text-slate-400">{{ formatDate(day.date) }}</span>
              <span class="text-xs text-slate-400">· {{ day.items?.length || 0 }} 个时段</span>
              <div class="flex-1"></div>
              <el-button size="small" @click.stop="openDayDialog(day)">编辑</el-button>
              <el-button size="small" type="danger" @click.stop="delDay(day)">删除</el-button>
            </div>
          </template>

          <div class="pl-2">
            <el-button size="small" type="primary" plain class="mb-3" @click="openItemDialog(day, null)">+ 新增时段</el-button>

            <div v-for="item in day.items" :key="item.id" class="schedule-item border rounded-xl p-3 mb-3 bg-white">
              <div class="flex items-start gap-3">
                <div class="flex flex-col items-center min-w-[80px]">
                  <div class="text-brand-blue font-bold">{{ item.startTime }}</div>
                  <div class="text-xs text-slate-400">{{ item.endTime }}</div>
                  <el-tag :type="categoryType(item.category)" size="small" class="mt-1">{{ item.category }}</el-tag>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-brand-deep">{{ item.sectionTitle || '(无标题)' }}</div>
                  <div v-if="item.description" class="text-xs text-slate-500 mt-1 line-clamp-2" v-html="item.description"></div>
                  <div v-if="item.talks?.length" class="mt-2 space-y-1">
                    <div v-for="t in item.talks" :key="t.id" class="text-sm flex items-center gap-2 flex-wrap">
                      <span class="font-medium text-brand-deep">▸ {{ t.title }}</span>
                      <span v-if="t.speaker" class="text-xs text-slate-500">· {{ t.speaker }}</span>
                      <span v-if="t.resources?.length" class="chip !text-[10px] !py-0.5 !px-2">{{ t.resources.length }} 资料</span>
                      <el-button size="small" link type="primary" @click="openTalkDialog(item, t)">编辑</el-button>
                      <el-button size="small" link type="danger" @click="delTalk(t)">删除</el-button>
                    </div>
                  </div>
                </div>
                <div class="flex flex-col gap-1 items-end">
                  <el-button size="small" @click="openItemDialog(day, item)">编辑</el-button>
                  <el-button size="small" type="danger" @click="delItem(item)">删除</el-button>
                  <el-button size="small" type="success" plain @click="openTalkDialog(item, null)">+ 议题</el-button>
                </div>
              </div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- Excel/CSV import dialog -->
    <el-dialog v-model="excelDialog.show" title="导入日程 Excel / CSV" width="900px" align-center>
      <div class="space-y-4">
        <div>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept=".xlsx,.xls,.csv"
            :on-change="handleScheduleExcel"
          >
            <el-button type="primary">选择文件（.xlsx / .xls / .csv）</el-button>
          </el-upload>
          <span v-if="excelDialog.fileName" class="ml-3 text-sm text-slate-500">{{ excelDialog.fileName }}</span>
        </div>

        <el-alert v-if="!excelDialog.rows.length" type="info" :closable="false" show-icon
          title="Excel / CSV 列头说明"
          description="支持列头（不区分大小写）：date / 日期, dayLabel / 日期标签, startTime / 开始时间, endTime / 结束时间, sectionTitle / 标题, category / 类型, description / 描述, talkTitle / 议题名称, speaker / 负责人。每行代表一个时段，如同时段有多个议题可用多行（date/startTime/endTime 相同）。"
        />

        <div v-if="excelDialog.rows.length">
          <div class="text-sm text-slate-600 mb-2">预览（共 {{ excelDialog.rows.length }} 行，显示前 10 行）</div>
          <el-table :data="excelDialog.rows.slice(0, 10)" border size="small" max-height="320">
            <el-table-column prop="date" label="日期" width="100" />
            <el-table-column prop="dayLabel" label="标签" width="120" />
            <el-table-column prop="startTime" label="开始" width="70" />
            <el-table-column prop="endTime" label="结束" width="70" />
            <el-table-column prop="sectionTitle" label="标题" min-width="120" />
            <el-table-column prop="category" label="类型" width="80" />
            <el-table-column prop="talkTitle" label="议题" min-width="120" />
            <el-table-column prop="speaker" label="负责人" width="100" />
          </el-table>
          <div class="mt-2 flex items-center gap-3">
            <el-checkbox v-model="excelDialog.clearExisting">导入前清空已有日程</el-checkbox>
            <span class="text-xs text-slate-400">（不勾选则追加）</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="excelDialog.show = false">取消</el-button>
        <el-button type="primary" :disabled="!excelDialog.rows.length" :loading="excelDialog.importing" @click="doScheduleExcelImport">
          确认导入 {{ excelDialog.rows.length }} 行
        </el-button>
      </template>
    </el-dialog>

    <!-- Day dialog -->
    <el-dialog v-model="dayDialog.show" :title="dayDialog.id ? '编辑日期' : '新增日期'" width="80vw" style="max-width: 1200px" align-center class="item-dialog">
      <div class="space-y-3">
        <div>
          <label class="text-sm text-slate-600 font-medium">日期 <span class="text-red-500">*</span></label>
          <el-date-picker v-model="dayDialog.form.date" type="date" value-format="YYYY-MM-DD" class="w-full" @change="onDayDateChange" />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">日期标签 <span class="text-red-500">*</span></label>
          <input v-model="dayDialog.form.dayLabel" class="form-input" placeholder="7月14日 (周一)" />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">排序</label>
          <input v-model.number="dayDialog.form.sortOrder" type="number" class="form-input" />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">日程页通知文字（富文本，留空则不显示）</label>
          <TinyEditor v-model="dayDialog.form.notice" :height="itemEditorHeight" class="mt-1" />
        </div>
      </div>
      <template #footer>
        <el-button @click="dayDialog.show = false">取消</el-button>
        <el-button type="primary" :loading="dayDialog.saving" @click="saveDay">保存</el-button>
      </template>
    </el-dialog>

    <!-- Item dialog -->
    <el-dialog v-model="itemDialog.show" :title="itemDialog.id ? '编辑时段' : '新增时段'" width="80vw" style="max-width: 1200px" align-center class="item-dialog">
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2">
          <el-switch v-model="itemDialog.form.allDay" active-text="全天" @change="onAllDayChange" />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">开始时间 <span class="text-red-500">*</span></label>
          <input v-model="itemDialog.form.startTime" class="form-input" :disabled="itemDialog.form.allDay" :class="{ 'opacity-50 cursor-not-allowed': itemDialog.form.allDay }" placeholder="8:40" />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">结束时间 <span class="text-red-500">*</span></label>
          <input v-model="itemDialog.form.endTime" class="form-input" :disabled="itemDialog.form.allDay" :class="{ 'opacity-50 cursor-not-allowed': itemDialog.form.allDay }" placeholder="9:20" />
        </div>
        <div class="col-span-2">
          <label class="text-sm text-slate-600 font-medium">标题</label>
          <input v-model="itemDialog.form.sectionTitle" class="form-input" />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">类型 <span class="text-red-500">*</span></label>
          <el-select v-model="itemDialog.form.category" class="w-full mt-1">
            <el-option label="-" value="-" />
            <el-option label="演讲/分享 session" value="session" />
            <el-option label="用餐 meal" value="meal" />
            <el-option label="茶歇 tea" value="tea" />
            <el-option label="签到 checkin" value="checkin" />
            <el-option label="出行 transit" value="transit" />
            <el-option label="其他 other" value="other" />
          </el-select>
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">排序</label>
          <input v-model.number="itemDialog.form.sortOrder" type="number" class="form-input" />
        </div>
        <div class="col-span-2">
          <label class="text-sm text-slate-600 font-medium">详细描述</label>
          <TinyEditor v-model="itemDialog.form.description" :height="itemEditorHeight" class="mt-1" />
        </div>
      </div>
      <template #footer>
        <el-button @click="itemDialog.show = false">取消</el-button>
        <el-button type="primary" :loading="itemDialog.saving" @click="saveItem">保存</el-button>
      </template>
    </el-dialog>

    <!-- Talk dialog (with resources) -->
    <el-dialog v-model="talkDialog.show" :title="talkDialog.id ? '编辑议题' : '新增议题'" width="80vw" style="max-width: 1200px" align-center class="item-dialog">
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2">
          <label class="text-sm text-slate-600 font-medium">议题名称 <span class="text-red-500">*</span></label>
          <input v-model="talkDialog.form.title" class="form-input" />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">负责人</label>
          <input v-model="talkDialog.form.speaker" class="form-input" />
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">排序</label>
          <input v-model.number="talkDialog.form.sortOrder" type="number" class="form-input" />
        </div>
        <div class="col-span-2">
          <label class="text-sm text-slate-600 font-medium">摘要 / 详细描述</label>
          <TinyEditor v-model="talkDialog.form.abstract" :height="itemEditorHeight" class="mt-1" />
        </div>
      </div>

      <!-- Resources (only after talk saved) -->
      <div v-if="talkDialog.id" class="mt-5 border-t pt-4">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm font-semibold text-brand-deep">议题资料（PPT / 视频 / 音频 / 链接）</span>
          <el-button size="small" type="primary" @click="addResource">+ 新增资料</el-button>
        </div>
        <el-table :data="talkDialog.resources" border size="small">
          <el-table-column label="类型" width="100">
            <template #default="{ row, $index }">
              <el-select v-model="row.type" size="small" @change="markDirty($index)">
                <el-option label="PPT" value="ppt" />
                <el-option label="PDF" value="pdf" />
                <el-option label="视频" value="video" />
                <el-option label="音频" value="audio" />
                <el-option label="图片" value="image" />
                <el-option label="链接" value="link" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="标题" min-width="140">
            <template #default="{ row, $index }">
              <input v-model="row.title" class="form-input !mt-0 !py-1" @input="markDirty($index)" />
            </template>
          </el-table-column>
          <el-table-column label="文件" min-width="200">
            <template #default="{ row, $index }">
              <div class="flex gap-1 items-center">
                <input v-model="row.fileUrl" class="form-input !mt-0 !py-1 flex-1" placeholder="/uploads/talks/..." @input="markDirty($index)" />
                <el-upload :auto-upload="true" :show-file-list="false" :http-request="(opt) => uploadResource(opt, row, $index)">
                  <el-button size="small">↑</el-button>
                </el-upload>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="链接 URL" min-width="160">
            <template #default="{ row, $index }">
              <input v-model="row.linkUrl" class="form-input !mt-0 !py-1" placeholder="https://..." @input="markDirty($index)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row, $index }">
              <el-button size="small" type="primary" :disabled="!row._dirty && row.id" @click="saveResource(row, $index)">保存</el-button>
              <el-button size="small" type="danger" @click="delResource(row, $index)">×</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <el-button @click="talkDialog.show = false">关闭</el-button>
        <el-button type="primary" :loading="talkDialog.saving" @click="saveTalk">保存议题</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import api from '../../api';
import TinyEditor from '../../components/TinyEditor.vue';

const days = ref([]);
const activeDays = ref([]);
const loading = ref(false);

// Dialog TinyEditor height: adaptive to 80vh dialog, min 400px
const itemEditorHeight = computed(() => Math.max(400, Math.floor(window.innerHeight * 0.8 - 340)));

function formatDate(d) { return dayjs(d).format('YYYY-MM-DD'); }
function categoryType(c) {
  return { session: '', meal: 'warning', tea: 'info', checkin: 'success', transit: 'danger', other: '' }[c] || '';
}

const dayDialog = reactive({ show: false, id: null, saving: false, form: blankDay() });
const itemDialog = reactive({ show: false, id: null, dayId: null, saving: false, form: blankItem() });
const talkDialog = reactive({
  show: false, id: null, itemId: null, saving: false,
  form: blankTalk(),
  resources: [],
});
const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
function onDayDateChange(val) {
  if (!val) return;
  if (!dayDialog.form.dayLabel) {
    const d = dayjs(val);
    dayDialog.form.dayLabel = `${d.month() + 1}月${d.date()}日，${WEEKDAY_NAMES[d.day()]}`;
  }
}
function blankDay() { return { date: '', dayLabel: '', sortOrder: 0, notice: '' }; }
function blankItem() { return { startTime: '', endTime: '', sectionTitle: '', category: '-', description: '', sortOrder: 0, allDay: false }; }
function onAllDayChange(val) {
  if (val) {
    itemDialog.form.startTime = '全天';
    itemDialog.form.endTime = '';
  } else {
    itemDialog.form.startTime = '';
    itemDialog.form.endTime = '';
  }
}
function blankTalk() { return { title: '', speaker: '', abstract: '', sortOrder: 0 }; }

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/schedule/days');
    days.value = data;
    if (!activeDays.value.length && data.length) activeDays.value = [data[0].id];
  } finally { loading.value = false; }
}

// ───── Excel/CSV import ─────
const excelDialog = reactive({
  show: false,
  fileName: '',
  rows: [],
  clearExisting: false,
  importing: false,
});

const SCHEDULE_COL_MAP = {
  date: 'date', '日期': 'date',
  daylabel: 'dayLabel', '日期标签': 'dayLabel', '标签': 'dayLabel', 'label': 'dayLabel',
  starttime: 'startTime', '开始时间': 'startTime', '开始': 'startTime', 'start': 'startTime',
  endtime: 'endTime', '结束时间': 'endTime', '结束': 'endTime', 'end': 'endTime',
  sectiontitle: 'sectionTitle', '标题': 'sectionTitle', '时段标题': 'sectionTitle', 'section': 'sectionTitle',
  category: 'category', '类型': 'category', 'type': 'category',
  description: 'description', '描述': 'description', '详细描述': 'description',
  talktitle: 'talkTitle', '演讲标题': 'talkTitle', '议题名称': 'talkTitle', '议题': 'talkTitle', '演讲': 'talkTitle', 'talk': 'talkTitle',
  speaker: 'speaker', '演讲者': 'speaker', '负责人': 'speaker', '讲者': 'speaker',
};

function handleScheduleExcel(uploadFile) {
  const file = uploadFile.raw || uploadFile;
  excelDialog.fileName = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
      excelDialog.rows = raw.map((row) => {
        const mapped = {};
        for (const [key, val] of Object.entries(row)) {
          const norm = String(key).trim().toLowerCase().replace(/[\s_]+/g, '');
          const field = SCHEDULE_COL_MAP[norm];
          if (field) {
            if (field === 'date' && val instanceof Date) {
              mapped[field] = dayjs(val).format('YYYY-MM-DD');
            } else {
              mapped[field] = String(val).trim();
            }
          }
        }
        if (!mapped.category) mapped.category = 'session';
        return mapped;
      }).filter((r) => r.date || r.startTime || r.sectionTitle);
      if (!excelDialog.rows.length) ElMessage.warning('未识别到有效数据行');
    } catch (err) {
      ElMessage.error('文件解析失败: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

async function doScheduleExcelImport() {
  excelDialog.importing = true;
  try {
    const { data } = await api.post('/admin/schedule/import-excel', {
      rows: excelDialog.rows,
      clearExisting: excelDialog.clearExisting,
    });
    ElMessage.success(`成功导入 ${data.days} 天 ${data.items} 个时段 ${data.talks} 个议题`);
    excelDialog.show = false;
    excelDialog.rows = [];
    excelDialog.fileName = '';
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '导入失败');
  } finally {
    excelDialog.importing = false;
  }
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
      if (!jsonData.dates || !Array.isArray(jsonData.dates)) {
        ElMessage.error('JSON 文件格式不正确，缺少 dates 数组');
        return;
      }
      const force = days.value.length > 0;
      if (force) {
        await ElMessageBox.confirm(
          '数据库中已有日程数据，导入将清空已有的日程并用所选 JSON 文件重新填充，确定吗？',
          '强制导入', { type: 'warning' }
        );
      }
      const { data } = await api.post('/admin/schedule/import-json', { jsonData, force });
      const n = data?.schedule ?? 0;
      ElMessage.success(`已导入 ${n} 天日程`);
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

// ───── Export schedule to Excel ─────
const CATEGORY_LABEL = {
  session: '演讲/分享',
  meal: '用餐',
  tea: '茶歇',
  checkin: '签到',
  transit: '出行',
  other: '其他',
};

function stripHtml(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function exportSchedule() {
  if (days.value.length === 0) {
    ElMessage.warning('暂无日程数据可导出');
    return;
  }

  const wb = XLSX.utils.book_new();
  const headers = ['时段', '类型', '时段主题（标题）', '议题名称', '负责人', '详细描述'];

  for (const day of days.value) {
    const rows = [];

    for (const item of (day.items || [])) {
      const timeRange = item.endTime ? `${item.startTime}-${item.endTime}` : (item.startTime || '');
      const categoryLabel = CATEGORY_LABEL[item.category] || item.category || '';
      const sectionTitle = item.sectionTitle || '';
      const description = stripHtml(item.description);

      if (item.talks && item.talks.length > 0) {
        // First talk row: include time, category, sectionTitle, description
        item.talks.forEach((talk, idx) => {
          if (idx === 0) {
            rows.push({
              '时段': timeRange,
              '类型': categoryLabel,
              '时段主题（标题）': sectionTitle,
              '议题名称': talk.title || '',
              '负责人': talk.speaker || '',
              '详细描述': description,
            });
          } else {
            // Subsequent talks: only fill talk-specific fields
            rows.push({
              '时段': '',
              '类型': '',
              '时段主题（标题）': '',
              '议题名称': talk.title || '',
              '负责人': talk.speaker || '',
              '详细描述': '',
            });
          }
        });
      } else {
        // No talks: output item info only
        rows.push({
          '时段': timeRange,
          '类型': categoryLabel,
          '时段主题（标题）': sectionTitle,
          '议题名称': '',
          '负责人': '',
          '详细描述': description,
        });
      }
    }

    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    // Set column widths
    ws['!cols'] = [
      { wch: 14 },  // 时段
      { wch: 12 },  // 类型
      { wch: 24 },  // 时段主题（标题）
      { wch: 30 },  // 议题名称
      { wch: 12 },  // 负责人
      { wch: 40 },  // 详细描述
    ];

    // Sheet name: Chinese date format like "2026年7月8日"
    const d = dayjs(day.date);
    const sheetName = `${d.year()}年${d.month() + 1}月${d.date()}日`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `日程安排_${today}.xlsx`);
  ElMessage.success('日程安排已导出');
}

// ───── Day ─────
function openDayDialog(d) {
  if (d) Object.assign(dayDialog, { show: true, id: d.id, form: { date: formatDate(d.date), dayLabel: d.dayLabel, sortOrder: d.sortOrder, notice: d.notice || '' } });
  else Object.assign(dayDialog, { show: true, id: null, form: blankDay() });
}
async function saveDay() {
  if (!dayDialog.form.date) return ElMessage.warning('请选择日期');
  if (!dayDialog.form.dayLabel?.trim()) return ElMessage.warning('请填写日期标签');
  dayDialog.saving = true;
  try {
    if (dayDialog.id) await api.put(`/admin/schedule/days/${dayDialog.id}`, dayDialog.form);
    else await api.post('/admin/schedule/days', dayDialog.form);
    dayDialog.show = false;
    ElMessage.success('已保存');
    load();
  } catch (e) { ElMessage.error(e.response?.data?.message || '保存失败'); }
  finally { dayDialog.saving = false; }
}
async function delDay(d) {
  try {
    await ElMessageBox.confirm(`确定删除 ${d.dayLabel} 及其所有时段？`, '提示', { type: 'warning' });
    await api.delete(`/admin/schedule/days/${d.id}`);
    ElMessage.success('已删除');
    load();
  } catch (e) { if (e !== 'cancel') ElMessage.error(e.response?.data?.message || '失败'); }
}

// ───── Item ─────
function openItemDialog(day, item) {
  if (item) {
    const form = { ...blankItem(), ...item };
    form.allDay = item.startTime === '全天';
    Object.assign(itemDialog, { show: true, id: item.id, dayId: day.id, form });
  } else {
    Object.assign(itemDialog, { show: true, id: null, dayId: day.id, form: blankItem() });
  }
}
async function saveItem() {
  if (!itemDialog.form.allDay) {
    if (!itemDialog.form.startTime?.trim()) return ElMessage.warning('请填写开始时间');
    if (!itemDialog.form.endTime?.trim()) return ElMessage.warning('请填写结束时间');
  }
  if (!itemDialog.form.category || itemDialog.form.category === '-') return ElMessage.warning('请选择类型');
  itemDialog.saving = true;
  try {
    const payload = { ...itemDialog.form, dayId: itemDialog.dayId };
    delete payload.allDay;
    if (itemDialog.form.allDay) {
      payload.startTime = '全天';
      payload.endTime = '';
    }
    if (itemDialog.id) await api.put(`/admin/schedule/items/${itemDialog.id}`, payload);
    else await api.post('/admin/schedule/items', payload);
    itemDialog.show = false;
    ElMessage.success('已保存');
    load();
  } catch (e) { ElMessage.error(e.response?.data?.message || '保存失败'); }
  finally { itemDialog.saving = false; }
}
async function delItem(item) {
  try {
    await ElMessageBox.confirm('确定删除该时段及其下所有议题？', '提示', { type: 'warning' });
    await api.delete(`/admin/schedule/items/${item.id}`);
    ElMessage.success('已删除');
    load();
  } catch (e) { if (e !== 'cancel') ElMessage.error(e.response?.data?.message || '失败'); }
}

// ───── Talk ─────
async function openTalkDialog(item, talk) {
  if (talk) {
    Object.assign(talkDialog, {
      show: true, id: talk.id, itemId: item.id, saving: false,
      form: { ...blankTalk(), ...talk },
      resources: (talk.resources || []).map((r) => ({ ...r, _dirty: false })),
    });
  } else {
    Object.assign(talkDialog, {
      show: true, id: null, itemId: item.id, saving: false,
      form: blankTalk(),
      resources: [],
    });
  }
}
async function saveTalk() {
  if (!talkDialog.form.title?.trim()) return ElMessage.warning('请填写议题名称');
  talkDialog.saving = true;
  try {
    const payload = { ...talkDialog.form, itemId: talkDialog.itemId };
    let id = talkDialog.id;
    if (id) await api.put(`/admin/schedule/talks/${id}`, payload);
    else {
      const { data } = await api.post('/admin/schedule/talks', payload);
      id = data.id;
      talkDialog.id = id;
    }
    ElMessage.success('已保存');
    load();
  } catch (e) { ElMessage.error(e.response?.data?.message || '保存失败'); }
  finally { talkDialog.saving = false; }
}
async function delTalk(talk) {
  try {
    await ElMessageBox.confirm('确定删除该议题及其全部资料？', '提示', { type: 'warning' });
    await api.delete(`/admin/schedule/talks/${talk.id}`);
    ElMessage.success('已删除');
    load();
  } catch (e) { if (e !== 'cancel') ElMessage.error(e.response?.data?.message || '失败'); }
}

// ───── Resources ─────
function markDirty(i) { talkDialog.resources[i]._dirty = true; }
function addResource() {
  talkDialog.resources.push({ id: null, type: 'ppt', title: '', fileUrl: '', linkUrl: '', _dirty: true });
}
async function saveResource(row, i) {
  if (!talkDialog.id) return ElMessage.warning('请先保存议题');
  try {
    const payload = { type: row.type, title: row.title, fileUrl: row.fileUrl, linkUrl: row.linkUrl };
    if (row.id) await api.put(`/admin/schedule/talk-resources/${row.id}`, payload);
    else {
      const { data } = await api.post(`/admin/schedule/talks/${talkDialog.id}/resources`, payload);
      row.id = data.id;
    }
    row._dirty = false;
    ElMessage.success('已保存资料');
    load();
  } catch (e) { ElMessage.error(e.response?.data?.message || '保存失败'); }
}
async function delResource(row, i) {
  if (row.id) {
    try {
      await ElMessageBox.confirm('删除该资料？', '提示', { type: 'warning' });
      await api.delete(`/admin/schedule/talk-resources/${row.id}`);
    } catch (e) { if (e !== 'cancel') return ElMessage.error('失败'); return; }
  }
  talkDialog.resources.splice(i, 1);
  load();
}
async function uploadResource(opt, row, i) {
  try {
    const fd = new FormData();
    fd.append('file', opt.file);
    const { data } = await api.post('/admin/schedule/upload-resource', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    row.fileUrl = data.url;
    if (!row.title) row.title = opt.file.name;
    row._dirty = true;
    ElMessage.success('已上传');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '上传失败');
  }
}

onMounted(load);
</script>

<style scoped>
.form-input {
  margin-top: 0.25rem;
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  outline: none;
}
.form-input:focus { border-color: var(--brand-blue); }
.schedule-item:hover { box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

</style>

<style>
/* Item dialog sizing (non-scoped: el-dialog teleports to body) */
.item-dialog .el-dialog {
  height: 80vh !important;
  display: flex !important;
  flex-direction: column !important;
}
.item-dialog .el-dialog__body {
  flex: 1 !important;
  min-height: 0 !important;
  overflow-y: auto !important;
}
/* Match el-select height to form-input */
.item-dialog .el-select .el-input__wrapper {
  padding: 4px 11px;
  min-height: 38px;
  box-sizing: border-box;
}
</style>
