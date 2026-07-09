<template>
  <div>
    <!-- ── Hero Banner 背景图管理 ── -->
    <div class="rounded-xl border border-slate-200 bg-white overflow-hidden mb-6">
      <div class="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
        <font-awesome-icon icon="image" class="text-brand-blue" />
        <span class="text-sm font-semibold text-brand-deep">Hero Banner 背景图</span>
        <span class="text-[11px] text-slate-400">首页顶部大图，桌面端与移动端分别上传</span>
      </div>
      <div class="px-5 py-4">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <!-- 桌面端 Banner -->
          <div class="flex gap-4 items-start">
            <div class="relative flex-shrink-0 w-[220px] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
              <img :src="heroBannerDesktop || '/hero-banner.jpg'" class="w-full aspect-[3/2] object-cover" />
              <span
                v-if="!heroBannerDesktop"
                class="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-500/70 text-white leading-none"
              >默认</span>
            </div>
            <div class="flex-1 min-w-0 pt-0.5">
              <div class="text-sm font-medium text-slate-700">桌面端 Banner</div>
              <div class="text-[11px] text-slate-400 mt-0.5">宽度 ≥ 1920px · 比例 3:2（横版）</div>
              <div class="mt-3 flex items-center gap-2">
                <el-button size="small" @click="triggerHeroBannerUpload('desktop')">
                  <font-awesome-icon :icon="heroBannerDesktop ? 'arrows-rotate' : 'upload'" class="mr-1" />
                  {{ heroBannerDesktop ? '更换图片' : '上传图片' }}
                </el-button>
                <el-button
                  v-if="heroBannerDesktop"
                  size="small" type="danger" plain
                  @click="deleteHeroBanner('desktop')"
                  :loading="heroBannerDeleting.desktop"
                >
                  <font-awesome-icon icon="trash" class="mr-1" />恢复默认
                </el-button>
              </div>
              <div v-if="heroBannerDesktop" class="mt-2 text-[11px] text-emerald-500">
                <font-awesome-icon icon="circle-check" class="mr-0.5" />已自定义
              </div>
            </div>
            <input
              ref="desktopFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleHeroBannerUpload($event, 'desktop')"
            />
          </div>

          <!-- 移动端 Banner -->
          <div class="flex gap-4 items-start">
            <div class="relative flex-shrink-0 w-[120px] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
              <img :src="heroBannerMobile || '/hero-banner-sm.jpg'" class="w-full aspect-[2/3] object-cover" />
              <span
                v-if="!heroBannerMobile"
                class="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-500/70 text-white leading-none"
              >默认</span>
            </div>
            <div class="flex-1 min-w-0 pt-0.5">
              <div class="text-sm font-medium text-slate-700">移动端 Banner</div>
              <div class="text-[11px] text-slate-400 mt-0.5">宽度 ≥ 1024px · 比例 2:3（竖版）</div>
              <div class="mt-3 flex items-center gap-2">
                <el-button size="small" @click="triggerHeroBannerUpload('mobile')">
                  <font-awesome-icon :icon="heroBannerMobile ? 'arrows-rotate' : 'upload'" class="mr-1" />
                  {{ heroBannerMobile ? '更换图片' : '上传图片' }}
                </el-button>
                <el-button
                  v-if="heroBannerMobile"
                  size="small" type="danger" plain
                  @click="deleteHeroBanner('mobile')"
                  :loading="heroBannerDeleting.mobile"
                >
                  <font-awesome-icon icon="trash" class="mr-1" />恢复默认
                </el-button>
              </div>
              <div v-if="heroBannerMobile" class="mt-2 text-[11px] text-emerald-500">
                <font-awesome-icon icon="circle-check" class="mr-0.5" />已自定义
              </div>
            </div>
            <input
              ref="mobileFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleHeroBannerUpload($event, 'mobile')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>        
        <p class="text-xs text-slate-400 mt-1">管理首页的内容展示板块（如 Conference Theme、议题轨道、公告等），每个板块可包含多张卡片。拖动板块可调整前台显示顺序。</p>
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

    <!-- Sections list (sortable) -->
    <div v-loading="loading" ref="sectionListRef" class="space-y-5">
      <div v-if="sections.length === 0 && !loading" class="text-center text-slate-400 py-16">
        <font-awesome-icon icon="inbox" class="text-4xl mb-3 block" />
        <p>暂无板块，点击「导入默认数据」快速初始化</p>
      </div>

      <div
        v-for="section in sections"
        :key="section.id"
        :data-section-id="section.id"
        class="rounded-xl border border-slate-200 bg-white overflow-hidden"
      >
        <!-- Section header -->
        <div class="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
          <!-- Drag handle for section -->
          <span class="section-drag-handle cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 flex-shrink-0">
            <font-awesome-icon icon="grip-vertical" />
          </span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span
                class="text-xs px-2 py-0.5 rounded-full font-medium"
                :class="section.sectionType === 'announcement'
                  ? 'bg-brand-orange/10 text-brand-orange'
                  : (section.sectionType === 'intro' || section.sectionType === 'stats')
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-brand-blue/10 text-brand-blue'"
              >
                <font-awesome-icon v-if="section.sectionType === 'announcement'" icon="bullhorn" class="mr-1" />
                <font-awesome-icon v-else-if="section.sectionType === 'intro'" icon="circle-info" class="mr-1" />
                <font-awesome-icon v-else-if="section.sectionType === 'stats'" icon="hashtag" class="mr-1" />
                {{ section.sectionType === 'announcement' ? '公告' : section.sectionType === 'intro' ? '关于会议' : section.sectionType === 'stats' ? '数字一览' : (section.chipLabel || '—') }}
              </span>
              <span class="text-sm font-semibold text-brand-deep truncate">
                {{ section.sectionType === 'statement'
                  ? (section.chipLabel || '宣言/引言')
                  : section.sectionType === 'announcement'
                    ? '公告管理'
                    : section.sectionType === 'intro'
                      ? '关于本次会议'
                      : (section.title || '(无标题)')
                }}
              </span>
              <span class="text-[11px] text-slate-400">Key: {{ section.key }}</span>
            </div>
            <p v-if="section.description && section.sectionType !== 'statement' && section.sectionType !== 'announcement'" class="text-xs text-slate-400 mt-1 line-clamp-1">{{ section.description }}</p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span v-if="section.sectionType !== 'statement' && section.sectionType !== 'announcement' && section.sectionType !== 'intro' && section.sectionType !== 'stats'" class="text-xs text-slate-400">{{ section.cards?.length || 0 }} 张卡片</span>
            <el-switch
              v-model="section.visible"
              size="small"
              active-text="显示"
              inactive-text="隐藏"
              @change="toggleSectionVisible(section)"
            />
            <el-button link type="primary" size="small" @click="openEditSection(section)" :title="(section.sectionType === 'announcement' || section.sectionType === 'intro' || section.sectionType === 'stats') ? '编辑样式' : '编辑板块'">
              <font-awesome-icon :icon="(section.sectionType === 'announcement' || section.sectionType === 'intro' || section.sectionType === 'stats') ? 'palette' : 'pen'" />
            </el-button>
            <el-button v-if="section.sectionType !== 'announcement' && section.sectionType !== 'intro' && section.sectionType !== 'stats'" link type="danger" size="small" @click="deleteSection(section)">
              <font-awesome-icon icon="trash" />
            </el-button>
            <el-button link size="small" @click="toggleExpand(section.id)">
              <font-awesome-icon :icon="expanded[section.id] ? 'chevron-up' : 'chevron-down'" />
            </el-button>
          </div>
        </div>

        <!-- Announcement type: show AdminAnnouncements -->
        <div v-if="section.sectionType === 'announcement'" v-show="expanded[section.id]" class="p-5">
          <AdminAnnouncements />
        </div>

        <!-- Intro type: read-only hint -->
        <div v-else-if="section.sectionType === 'intro'" v-show="expanded[section.id]" class="p-5">
          <div class="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center">
            <font-awesome-icon icon="circle-info" class="text-emerald-500 text-2xl mb-2" />
            <p class="text-sm text-slate-600">此板块的内容在左侧菜单「<b>会议信息</b>」中编辑管理。</p>
            <p class="text-xs text-slate-400 mt-1">此处仅可拖拽调整该板块在首页的排列位置。</p>
          </div>
        </div>

        <!-- Stats type: read-only hint -->
        <div v-else-if="section.sectionType === 'stats'" v-show="expanded[section.id]" class="p-5">
          <div class="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center">
            <font-awesome-icon icon="hashtag" class="text-emerald-500 text-2xl mb-2" />
            <p class="text-sm text-slate-600">此板块为系统内置板块，内容根据参会人员等数据自动生成。</p>
            <p class="text-xs text-slate-400 mt-1">此处仅可拖拽调整该板块在首页的排列位置。</p>
          </div>
        </div>

        <!-- Statement type: inline preview (no cards) -->
        <div v-else-if="section.sectionType === 'statement'" v-show="expanded[section.id]" class="p-5">
          <div class="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
            <div class="text-brand-orange text-3xl leading-none mb-2">"</div>
            <p class="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed italic">
              {{ section.title || '(暂无宣言内容)' }}
            </p>
            <div class="mt-3 text-xs text-slate-400">
              {{ section.description || '— 署名' }}
            </div>
          </div>
        </div>

        <!-- Cards (expandable) — for normal card sections -->
        <div v-else v-show="expanded[section.id]" class="p-4">
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
      :title="sectionIsEdit ? (sectionForm.sectionType === 'statement' ? '编辑宣言/引言' : '编辑板块') : '新增板块'"
      width="600px"
      destroy-on-close
      align-center
    >
      <!-- Section-specific hint for statement type -->
      <el-alert
        v-if="sectionForm.sectionType === 'statement'"
        type="info"
        :closable="false"
        class="mb-4"
        show-icon
      >
        <template #title>宣言/引言板块：「宣言正文」将显示为首页的引用文字，「署名」显示在宣言下方，无卡片列表</template>
      </el-alert>

      <el-form :model="sectionForm" label-width="90px" label-position="top">
        <div class="grid grid-cols-2 gap-4">
          <el-form-item label="Key（唯一标识）" required>
            <el-input v-model="sectionForm.key" :disabled="sectionIsEdit" placeholder="e.g. conference-theme" />
          </el-form-item>
          <el-form-item label="板块类型" required>
            <el-select v-model="sectionForm.sectionType" class="w-full">
              <el-option label="卡片组" value="cards" />
              <el-option label="宣言/引言" value="statement" />
              <el-option label="公告" value="announcement" />
            </el-select>
          </el-form-item>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <el-form-item label="板块标签（Chip）">
            <el-input v-model="sectionForm.chipLabel" :placeholder="sectionForm.sectionType === 'statement' ? '如：团队宣言' : sectionForm.sectionType === 'announcement' ? '如：最新公告' : 'e.g. Conference Theme'" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="sectionForm.sortOrder" :min="0" class="w-full" />
          </el-form-item>
        </div>
        <template v-if="sectionForm.sectionType !== 'announcement'">
          <el-form-item :label="sectionForm.sectionType === 'statement' ? '宣言正文' : '板块标题'">
            <el-input v-model="sectionForm.title" :type="sectionForm.sectionType === 'statement' ? 'textarea' : 'text'" :rows="4" :placeholder="sectionForm.sectionType === 'statement' ? '如：我们既是技术的工程师，也是教育的同行者……' : 'e.g. Connect · Innovate · Empower'" />
          </el-form-item>
          <el-form-item :label="sectionForm.sectionType === 'statement' ? '署名' : '板块描述'">
            <el-input v-model="sectionForm.description" :type="sectionForm.sectionType === 'statement' ? 'text' : 'textarea'" :rows="3" :placeholder="sectionForm.sectionType === 'statement' ? '如：— YCYW Global IT Team' : '板块下方的说明文字'" />
          </el-form-item>
        </template>
        <el-form-item label="前台显示">
          <el-switch v-model="sectionForm.visible" />
        </el-form-item>

        <!-- ── 板块样式设置 ── -->
        <el-divider content-position="left">
          <span class="text-xs text-slate-400">板块样式</span>
        </el-divider>
        <div class="grid grid-cols-2 gap-4">
          <el-form-item label="背景颜色">
            <el-radio-group v-model="sectionForm.bgColor" class="w-full">
              <el-radio-button value="">
                <span class="inline-flex items-center gap-1.5">
                  <span class="inline-block w-3 h-3 rounded-sm border border-slate-200" style="background: transparent"></span>
                  无背景
                </span>
              </el-radio-button>
              <el-radio-button value="#ffffff">
                <span class="inline-flex items-center gap-1.5">
                  <span class="inline-block w-3 h-3 rounded-sm border border-slate-200" style="background: #ffffff"></span>
                  白色
                </span>
              </el-radio-button>
              <el-radio-button value="#FAFBFC">
                <span class="inline-flex items-center gap-1.5">
                  <span class="inline-block w-3 h-3 rounded-sm border border-slate-200" style="background: #FAFBFC"></span>
                  淡灰
                </span>
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="边线设置">
            <div class="flex flex-col gap-2">
              <el-checkbox v-model="sectionForm.borderTop">
                上边线
                <span class="text-[11px] text-slate-400 ml-1">1px #e5e7eb solid</span>
              </el-checkbox>
              <el-checkbox v-model="sectionForm.borderBottom">
                下边线
                <span class="text-[11px] text-slate-400 ml-1">1px #e5e7eb solid</span>
              </el-checkbox>
            </div>
          </el-form-item>
        </div>
        <!-- 样式预览 -->
        <div class="mb-2">
          <span class="text-xs text-slate-400 block mb-1">预览效果：</span>
          <div
            class="rounded-md h-10 border border-dashed border-slate-200 transition-all"
            :style="{
              backgroundColor: sectionForm.bgColor || 'transparent',
              borderTop: sectionForm.borderTop ? '1px solid #e5e7eb' : undefined,
              borderBottom: sectionForm.borderBottom ? '1px solid #e5e7eb' : undefined,
            }"
          ></div>
        </div>
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
      <!-- Section-specific hint -->
      <el-alert
        v-if="cardSectionKey === 'quick-nav'"
        type="info"
        :closable="false"
        class="mb-4"
        show-icon
      >
        <template #title>快捷入口卡片：「副标题」填写路由路径（如 /schedule），「内容」填写描述文字</template>
      </el-alert>
      <el-alert
        v-if="cardSectionKey === 'tech-stack'"
        type="info"
        :closable="false"
        class="mb-4"
        show-icon
      >
        <template #title>技术栈卡片：「内容」填写逗号分隔的技术列表（如 Microsoft 365, Entra ID, Intune）</template>
      </el-alert>

      <el-form :model="cardForm" label-width="90px" label-position="top">
        <div class="grid grid-cols-2 gap-4">
          <el-form-item label="标题" required>
            <el-input v-model="cardForm.title" :placeholder="cardSectionKey === 'quick-nav' ? '如：日程安排' : cardSectionKey === 'tech-stack' ? '如：Productivity & Identity' : 'e.g. AI for Education'" />
          </el-form-item>
          <el-form-item :label="cardSectionKey === 'quick-nav' ? '路由路径' : '副标题'">
            <el-input v-model="cardForm.subtitle" :placeholder="cardSectionKey === 'quick-nav' ? '如：/schedule' : cardSectionKey === 'tech-stack' ? '如：日常协作与身份基础' : 'e.g. Connect Learning'" />
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
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import Sortable from 'sortablejs';
import api from '../../api';
import AdminAnnouncements from './AdminAnnouncements.vue';

// ── Hero Banner ──
const heroBannerDesktop = ref('');
const heroBannerMobile = ref('');
const heroBannerDeleting = reactive({ desktop: false, mobile: false });
const desktopFileInput = ref(null);
const mobileFileInput = ref(null);

async function loadHeroBanners() {
  try {
    const { data } = await api.get('/meeting');
    if (data) {
      heroBannerDesktop.value = data.heroBannerDesktop || '';
      heroBannerMobile.value = data.heroBannerMobile || '';
    }
  } catch {
    // silent
  }
}

function triggerHeroBannerUpload(type) {
  if (type === 'desktop') desktopFileInput.value?.click();
  else mobileFileInput.value?.click();
}

/**
 * Validate image dimensions before upload.
 * Returns { ok, reason } where ok=true means valid.
 */
function validateHeroBannerImage(file, type) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const ratio = w / h;

      if (type === 'desktop') {
        // Desktop: width >= 1920, ratio 3:2 (1.5)
        if (w < 1920) {
          return resolve({ ok: false, reason: `图片宽度不足：当前 ${w}px，要求 ≥ 1920px` });
        }
        const expectedRatio = 3 / 2; // 1.5
        if (Math.abs(ratio - expectedRatio) / expectedRatio > 0.02) {
          return resolve({ ok: false, reason: `图片比例不符：当前 ${w}×${h}（${ratio.toFixed(2)}），要求 3:2 横版（1.50）` });
        }
      } else {
        // Mobile: width >= 1024, ratio 2:3 (0.667)
        if (w < 1024) {
          return resolve({ ok: false, reason: `图片宽度不足：当前 ${w}px，要求 ≥ 1024px` });
        }
        const expectedRatio = 2 / 3; // 0.667
        if (Math.abs(ratio - expectedRatio) / expectedRatio > 0.02) {
          return resolve({ ok: false, reason: `图片比例不符：当前 ${w}×${h}（${ratio.toFixed(2)}），要求 2:3 竖版（0.67）` });
        }
      }
      resolve({ ok: true });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ok: false, reason: '无法读取图片信息，请确认文件是有效的图片格式' });
    };
    img.src = url;
  });
}

async function handleHeroBannerUpload(event, type) {
  const file = event.target.files?.[0];
  if (!file) return;

  // Reset input so the same file can be re-selected
  event.target.value = '';

  // Validate dimensions
  const { ok, reason } = await validateHeroBannerImage(file, type);
  if (!ok) {
    ElMessage.warning(reason);
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  const endpoint = type === 'desktop' ? '/admin/settings/hero-banner-desktop' : '/admin/settings/hero-banner-mobile';
  try {
    const { data } = await api.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (type === 'desktop') heroBannerDesktop.value = data.url;
    else heroBannerMobile.value = data.url;
    ElMessage.success(`${type === 'desktop' ? '桌面端' : '移动端'} Banner 上传成功`);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '上传失败');
  }
}

async function deleteHeroBanner(type) {
  try {
    await ElMessageBox.confirm(
      `确定删除${type === 'desktop' ? '桌面端' : '移动端'} Banner 图片？删除后将使用默认背景。`,
      '提示',
      { type: 'warning' }
    );
  } catch {
    return; // cancelled
  }

  heroBannerDeleting[type] = true;
  const endpoint = type === 'desktop' ? '/admin/settings/hero-banner-desktop' : '/admin/settings/hero-banner-mobile';
  try {
    await api.delete(endpoint);
    if (type === 'desktop') heroBannerDesktop.value = '';
    else heroBannerMobile.value = '';
    ElMessage.success('已删除');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败');
  } finally {
    heroBannerDeleting[type] = false;
  }
}

// ── Data ──
const sections = ref([]);
const loading = ref(false);
const seeding = ref(false);
const expanded = reactive({});

// Refs
const sectionListRef = ref(null);

// Card table refs for sortable
const cardTableRefs = {};
const sortableInstances = {};
let sectionSortableInstance = null;

function setCardTableRef(sectionId, el) {
  if (el) cardTableRefs[sectionId] = el;
}

function toggleExpand(sectionId) {
  expanded[sectionId] = !expanded[sectionId];
  if (expanded[sectionId]) {
    const section = sections.value.find(s => s.id === sectionId);
    if (section && section.sectionType !== 'statement' && section.sectionType !== 'announcement') {
      nextTick(() => initCardSortable(sectionId));
    }
  }
}

// ── Load ──
async function loadSections() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/home-sections');
    sections.value = data;
    // Expand all by default (statement / announcement types default collapsed)
    data.forEach((s) => {
      if (s.sectionType === 'statement' || s.sectionType === 'announcement' || s.sectionType === 'intro' || s.sectionType === 'stats') {
        if (expanded[s.id] === undefined) expanded[s.id] = false;
      } else if (expanded[s.id] === undefined) {
        expanded[s.id] = true;
      }
    });
    await nextTick();
    data.forEach((s) => {
      if (expanded[s.id] && s.sectionType !== 'statement' && s.sectionType !== 'announcement' && s.sectionType !== 'intro' && s.sectionType !== 'stats') {
        initCardSortable(s.id);
      }
    });
    initSectionSortable();
  } catch (e) {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
}

// ── Section drag sorting ──
function initSectionSortable() {
  if (sectionSortableInstance) {
    sectionSortableInstance.destroy();
    sectionSortableInstance = null;
  }
  const container = sectionListRef.value;
  if (!container) return;

  sectionSortableInstance = Sortable.create(container, {
    handle: '.section-drag-handle',
    animation: 200,
    ghostClass: 'sortable-section-ghost',
    draggable: '[data-section-id]',
    onEnd: async ({ oldIndex, newIndex }) => {
      if (oldIndex === newIndex) return;
      const row = sections.value.splice(oldIndex, 1)[0];
      sections.value.splice(newIndex, 0, row);
      const orders = sections.value.map((s, i) => ({ id: s.id, sortOrder: i }));
      sections.value.forEach((s, i) => { s.sortOrder = i; });
      try {
        await api.put('/admin/home-sections/reorder', { orders });
      } catch {
        ElMessage.error('排序保存失败');
        await loadSections();
      }
    },
  });
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
  sectionType: 'cards',
  chipLabel: '',
  title: '',
  description: '',
  visible: true,
  sortOrder: 0,
  bgColor: '',
  borderTop: false,
  borderBottom: false,
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
    sectionType: section.sectionType || 'cards',
    chipLabel: section.chipLabel,
    title: section.title,
    description: section.description,
    visible: section.visible,
    sortOrder: section.sortOrder,
    bgColor: section.bgColor || '',
    borderTop: section.borderTop || false,
    borderBottom: section.borderBottom || false,
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
const cardSectionKey = ref('');

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
  cardSectionKey.value = section.key || '';
  const nextSort = section.cards?.length || 0;
  cardForm.value = { ...emptyCardForm(), sortOrder: nextSort };
  cardDlg.value = true;
}

function openEditCard(section, card) {
  cardIsEdit.value = true;
  cardEditId.value = card.id;
  cardSectionId.value = section.id;
  cardSectionKey.value = section.key || '';
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
  loadHeroBanners();
  loadSections();
});

onBeforeUnmount(() => {
  if (sectionSortableInstance) sectionSortableInstance.destroy();
  Object.values(sortableInstances).forEach(inst => inst?.destroy());
});
</script>

<style scoped>
:deep(.sortable-ghost) {
  background-color: #ecf5ff !important;
  opacity: 0.8;
}

:deep(.sortable-section-ghost) {
  opacity: 0.5;
  border: 2px dashed #409eff !important;
}

:global(.card-edit-dialog .el-dialog__body) {
  max-height: 65vh;
  overflow-y: auto;
  padding-top: 12px;
  padding-bottom: 12px;
}
</style>
