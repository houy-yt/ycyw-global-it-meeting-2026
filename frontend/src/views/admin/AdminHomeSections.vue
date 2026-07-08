<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>        
        <p class="text-xs text-slate-400 mt-1">管理首页的内容展示板块（如 Conference Theme、议题轨道等），每个板块可包含多张卡片。</p>
      </div>
      <div class="flex gap-2">
        <el-button size="small" @click="seedDefaults" :loading="seeding">
          <font-awesome-icon icon="wand-magic-sparkles" class="mr-1" />
          导入默认数据
        </el-button>
        <el-button type="primary" size="small" @click="openCreateSection">
          <font-awesome-icon icon="plus" class="mr-1" />
          新增板块
        </el-button>
      </div>
    </div>

    <!-- Sections list -->
    <div v-loading="loading" class="space-y-5">
      <div v-if="sections.length === 0 && !loading" class="text-center text-slate-400 py-16">
        <font-awesome-icon icon="inbox" class="text-4xl mb-3 block" />
        <p>暂无板块，点击「导入默认数据」快速初始化</p>
      </div>

      <div
        v-for="section in sections"
        :key="section.id"
        class="rounded-xl border border-slate-200 bg-white overflow-hidden"
      >
        <!-- Section header -->
        <div class="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue font-medium">{{ section.chipLabel || '—' }}</span>
              <span class="text-sm font-semibold text-brand-deep truncate">{{ section.title || '(无标题)' }}</span>
              <span class="text-[11px] text-slate-400">Key: {{ section.key }}</span>
            </div>
            <p v-if="section.description" class="text-xs text-slate-400 mt-1 line-clamp-1">{{ section.description }}</p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-xs text-slate-400">{{ section.cards?.length || 0 }} 张卡片</span>
            <el-switch
              v-model="section.visible"
              size="small"
              active-text="显示"
              inactive-text="隐藏"
              @change="toggleSectionVisible(section)"
            />
            <el-button link type="primary" size="small" @click="openEditSection(section)">
              <font-awesome-icon icon="pen" />
            </el-button>
            <el-button link type="danger" size="small" @click="deleteSection(section)">
              <font-awesome-icon icon="trash" />
            </el-button>
            <el-button link size="small" @click="toggleExpand(section.id)">
              <font-awesome-icon :icon="expanded[section.id] ? 'chevron-up' : 'chevron-down'" />
            </el-button>
          </div>
        </div>

        <!-- Cards (expandable) -->
        <div v-show="expanded[section.id]" class="p-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-medium text-slate-500">卡片列表</span>
            <el-button type="primary" size="small" plain @click="openCreateCard(section)">
              <font-awesome-icon icon="plus" class="mr-1" />
              新增卡片
            </el-button>
          </div>

          <el-table
            :ref="el => setCardTableRef(section.id, el)"
            :data="section.cards || []"
            stripe
            size="small"
            row-key="id"
            empty-text="暂无卡片"
          >
            <el-table-column width="45" align="center">
              <template #header><font-awesome-icon icon="grip-vertical" class="text-slate-300" /></template>
              <template #default>
                <span :class="'drag-handle-' + section.id" class="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
                  <font-awesome-icon icon="grip-vertical" />
                </span>
              </template>
            </el-table-column>
            <el-table-column label="序号" prop="sortOrder" width="55" align="center" />
            <el-table-column label="图标" width="65" align="center">
              <template #default="{ row }">
                <img v-if="row.imageUrl" :src="row.imageUrl" class="w-8 h-8 rounded object-cover" />
                <div
                  v-else-if="row.icon"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm"
                  :style="{ background: row.iconColor || '#0032a0' }"
                >
                  <font-awesome-icon :icon="row.icon" />
                </div>
                <span v-else class="text-slate-300">—</span>
              </template>
            </el-table-column>
            <el-table-column label="标题" prop="title" min-width="140" show-overflow-tooltip />
            <el-table-column label="副标题" prop="subtitle" min-width="100" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="text-slate-400">{{ row.subtitle || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="内容" prop="content" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="text-slate-500 text-xs">{{ row.content || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openEditCard(section, row)">编辑</el-button>
                <el-button link type="danger" size="small" @click="deleteCard(section, row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <!-- ── Section Edit/Create Dialog ── -->
    <el-dialog
      v-model="sectionDlg"
      :title="sectionIsEdit ? '编辑板块' : '新增板块'"
      width="600px"
      destroy-on-close
      align-center
    >
      <el-form :model="sectionForm" label-width="90px" label-position="top">
        <div class="grid grid-cols-2 gap-4">
          <el-form-item label="Key（唯一标识）" required>
            <el-input v-model="sectionForm.key" :disabled="sectionIsEdit" placeholder="e.g. conference-theme" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="sectionForm.sortOrder" :min="0" class="w-full" />
          </el-form-item>
        </div>
        <el-form-item label="板块标签（Chip）">
          <el-input v-model="sectionForm.chipLabel" placeholder="e.g. Conference Theme" />
        </el-form-item>
        <el-form-item label="板块标题">
          <el-input v-model="sectionForm.title" placeholder="e.g. Connect · Innovate · Empower" />
        </el-form-item>
        <el-form-item label="板块描述">
          <el-input v-model="sectionForm.description" type="textarea" :rows="3" placeholder="板块下方的说明文字" />
        </el-form-item>
        <el-form-item label="前台显示">
          <el-switch v-model="sectionForm.visible" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sectionDlg = false">取消</el-button>
        <el-button type="primary" @click="saveSection" :loading="sectionSaving">保存</el-button>
      </template>
    </el-dialog>

    <!-- ── Card Edit/Create Dialog ── -->
    <el-dialog
      v-model="cardDlg"
      :title="cardIsEdit ? '编辑卡片' : '新增卡片'"
      width="650px"
      destroy-on-close
      align-center
      class="card-edit-dialog"
    >
      <el-form :model="cardForm" label-width="90px" label-position="top">
        <div class="grid grid-cols-2 gap-4">
          <el-form-item label="标题" required>
            <el-input v-model="cardForm.title" placeholder="e.g. AI for Education" />
          </el-form-item>
          <el-form-item label="副标题">
            <el-input v-model="cardForm.subtitle" placeholder="e.g. Connect Learning" />
          </el-form-item>
          <el-form-item label="图标（FA名）">
            <el-input v-model="cardForm.icon" placeholder="e.g. robot">
              <template #prefix>
                <font-awesome-icon :icon="cardForm.icon || 'circle-info'" :style="{ color: cardForm.iconColor }" />
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="图标颜色">
            <div class="flex items-center gap-2 w-full">
              <el-input v-model="cardForm.iconColor" placeholder="#0032a0" class="flex-1">
                <template #prefix>
                  <span class="inline-block w-4 h-4 rounded-sm border border-slate-200" :style="{ backgroundColor: cardForm.iconColor }"></span>
                </template>
              </el-input>
              <el-color-picker v-model="cardForm.iconColor" show-alpha size="default" />
            </div>
          </el-form-item>
        </div>
        <el-form-item label="图片 URL（可选，优先于图标）">
          <el-input v-model="cardForm.imageUrl" placeholder="https://... 或 /uploads/..." />
        </el-form-item>
        <el-form-item label="内容 / 描述">
          <el-input v-model="cardForm.content" type="textarea" :rows="3" placeholder="卡片正文内容" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="cardForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cardDlg = false">取消</el-button>
        <el-button type="primary" @click="saveCard" :loading="cardSaving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import Sortable from 'sortablejs';
import api from '../../api';

// ── Data ──
const sections = ref([]);
const loading = ref(false);
const seeding = ref(false);
const expanded = reactive({});

// Card table refs for sortable
const cardTableRefs = {};
const sortableInstances = {};

function setCardTableRef(sectionId, el) {
  if (el) cardTableRefs[sectionId] = el;
}

function toggleExpand(sectionId) {
  expanded[sectionId] = !expanded[sectionId];
  if (expanded[sectionId]) {
    nextTick(() => initCardSortable(sectionId));
  }
}

// ── Load ──
async function loadSections() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/home-sections');
    sections.value = data;
    // Expand all by default
    data.forEach((s) => {
      if (expanded[s.id] === undefined) expanded[s.id] = true;
    });
    await nextTick();
    data.forEach((s) => {
      if (expanded[s.id]) initCardSortable(s.id);
    });
  } catch (e) {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
}

// ── Card drag sorting ──
function initCardSortable(sectionId) {
  if (sortableInstances[sectionId]) {
    sortableInstances[sectionId].destroy();
    delete sortableInstances[sectionId];
  }
  const tableEl = cardTableRefs[sectionId];
  if (!tableEl) return;
  const tbody = tableEl.$el?.querySelector('.el-table__body-wrapper tbody');
  if (!tbody) return;

  sortableInstances[sectionId] = Sortable.create(tbody, {
    handle: `.drag-handle-${sectionId}`,
    animation: 180,
    ghostClass: 'sortable-ghost',
    onEnd: async ({ oldIndex, newIndex }) => {
      if (oldIndex === newIndex) return;
      const section = sections.value.find((s) => s.id === sectionId);
      if (!section) return;
      const row = section.cards.splice(oldIndex, 1)[0];
      section.cards.splice(newIndex, 0, row);
      const orders = section.cards.map((c, i) => ({ id: c.id, sortOrder: i }));
      section.cards.forEach((c, i) => { c.sortOrder = i; });
      try {
        await api.put(`/admin/home-sections/${sectionId}/cards/reorder`, { orders });
      } catch {
        ElMessage.error('排序保存失败');
        await loadSections();
      }
    },
  });
}

// ── Section CRUD ──
const sectionDlg = ref(false);
const sectionIsEdit = ref(false);
const sectionSaving = ref(false);
const sectionEditId = ref(null);

const emptySectionForm = () => ({
  key: '',
  chipLabel: '',
  title: '',
  description: '',
  visible: true,
  sortOrder: 0,
});
const sectionForm = ref(emptySectionForm());

function openCreateSection() {
  sectionIsEdit.value = false;
  sectionEditId.value = null;
  sectionForm.value = emptySectionForm();
  sectionDlg.value = true;
}

function openEditSection(section) {
  sectionIsEdit.value = true;
  sectionEditId.value = section.id;
  sectionForm.value = {
    key: section.key,
    chipLabel: section.chipLabel,
    title: section.title,
    description: section.description,
    visible: section.visible,
    sortOrder: section.sortOrder,
  };
  sectionDlg.value = true;
}

async function saveSection() {
  if (!sectionForm.value.key) return ElMessage.warning('Key 为必填');
  sectionSaving.value = true;
  try {
    if (sectionIsEdit.value) {
      await api.put(`/admin/home-sections/${sectionEditId.value}`, sectionForm.value);
    } else {
      await api.post('/admin/home-sections', sectionForm.value);
    }
    ElMessage.success('保存成功');
    sectionDlg.value = false;
    await loadSections();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    sectionSaving.value = false;
  }
}

async function deleteSection(section) {
  try {
    await ElMessageBox.confirm(
      `确定删除板块「${section.title || section.key}」及其所有卡片？`,
      '提示',
      { type: 'warning' }
    );
    await api.delete(`/admin/home-sections/${section.id}`);
    ElMessage.success('已删除');
    await loadSections();
  } catch {
    // cancelled
  }
}

async function toggleSectionVisible(section) {
  try {
    await api.put(`/admin/home-sections/${section.id}`, { visible: section.visible });
  } catch {
    section.visible = !section.visible;
    ElMessage.error('更新失败');
  }
}

// ── Card CRUD ──
const cardDlg = ref(false);
const cardIsEdit = ref(false);
const cardSaving = ref(false);
const cardEditId = ref(null);
const cardSectionId = ref(null);

const emptyCardForm = () => ({
  icon: '',
  iconColor: '#0032a0',
  imageUrl: '',
  title: '',
  subtitle: '',
  content: '',
  sortOrder: 0,
});
const cardForm = ref(emptyCardForm());

function openCreateCard(section) {
  cardIsEdit.value = false;
  cardEditId.value = null;
  cardSectionId.value = section.id;
  const nextSort = section.cards?.length || 0;
  cardForm.value = { ...emptyCardForm(), sortOrder: nextSort };
  cardDlg.value = true;
}

function openEditCard(section, card) {
  cardIsEdit.value = true;
  cardEditId.value = card.id;
  cardSectionId.value = section.id;
  cardForm.value = {
    icon: card.icon || '',
    iconColor: card.iconColor || '#0032a0',
    imageUrl: card.imageUrl || '',
    title: card.title || '',
    subtitle: card.subtitle || '',
    content: card.content || '',
    sortOrder: card.sortOrder,
  };
  cardDlg.value = true;
}

async function saveCard() {
  if (!cardForm.value.title) return ElMessage.warning('标题为必填');
  cardSaving.value = true;
  try {
    if (cardIsEdit.value) {
      await api.put(`/admin/home-sections/cards/${cardEditId.value}`, cardForm.value);
    } else {
      await api.post(`/admin/home-sections/${cardSectionId.value}/cards`, cardForm.value);
    }
    ElMessage.success('保存成功');
    cardDlg.value = false;
    await loadSections();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    cardSaving.value = false;
  }
}

async function deleteCard(section, card) {
  try {
    await ElMessageBox.confirm(`确定删除卡片「${card.title}」？`, '提示', { type: 'warning' });
    await api.delete(`/admin/home-sections/cards/${card.id}`);
    ElMessage.success('已删除');
    await loadSections();
  } catch {
    // cancelled
  }
}

// ── Seed defaults ──
async function seedDefaults() {
  seeding.value = true;
  try {
    const { data } = await api.post('/admin/home-sections/seed-defaults');
    ElMessage.success(`导入完成：新增 ${data.created} 个板块`);
    await loadSections();
  } catch (e) {
    ElMessage.error('导入失败');
  } finally {
    seeding.value = false;
  }
}

onMounted(() => {
  loadSections();
});
</script>

<style scoped>
:deep(.sortable-ghost) {
  background-color: #ecf5ff !important;
  opacity: 0.8;
}

:global(.card-edit-dialog .el-dialog__body) {
  max-height: 65vh;
  overflow-y: auto;
  padding-top: 12px;
  padding-bottom: 12px;
}
</style>
