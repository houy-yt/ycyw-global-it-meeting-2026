<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h3 class="text-lg font-semibold text-brand-deep">FA图标库</h3>
        <p class="text-sm text-slate-500 mt-1">
          Font Awesome 免费图标合集，共
          <span class="font-semibold text-brand-blue">{{ totalCount }}</span> 个图标
          <span class="text-xs ml-2 text-slate-400">（点击图标可复制名称）</span>
        </p>
      </div>
      <el-input
        v-model="search"
        placeholder="搜索图标名称..."
        clearable
        class="!w-64"
        :prefix-icon="SearchIcon"
      />
    </div>

    <!-- Category sections -->
    <div v-for="cat in filteredCategories" :key="cat.name" class="mb-4">
      <!-- Category Header Bar -->
      <div
        class="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-lg cursor-pointer select-none hover:bg-slate-100 transition-colors"
        @click="toggleCategory(cat.name)"
      >
        <div class="flex items-center gap-2.5">
          <span class="font-semibold text-slate-700">{{ cat.label }}</span>
          <span class="text-xs text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full font-medium">
            {{ cat.icons.length }}
          </span>
        </div>
        <font-awesome-icon
          :icon="expanded[cat.name] ? 'chevron-up' : 'chevron-right'"
          class="text-xs text-slate-400 transition-transform"
        />
      </div>

      <!-- Icons Grid -->
      <div
        v-show="expanded[cat.name]"
        class="icon-grid mt-3"
      >
        <div
          v-for="ic in cat.icons"
          :key="ic.prefix + '-' + ic.iconName"
          class="icon-card"
          :title="ic.prefix + ' fa-' + ic.iconName"
          @click="copyIconName(ic)"
        >
          <div class="icon-preview">
            <font-awesome-icon :icon="[ic.prefix, ic.iconName]" />
          </div>
          <div class="icon-name">{{ ic.iconName }}</div>
          <div class="icon-unicode">{{ ic.unicode }}</div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="filteredCategories.length === 0" class="text-center py-16 text-slate-400">
      <font-awesome-icon icon="icons" class="text-4xl mb-3 block" />
      <p>没有找到匹配 "<b class="text-slate-600">{{ search }}</b>" 的图标</p>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, shallowRef, markRaw } from 'vue';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { ElMessage } from 'element-plus';
import { Search as SearchIcon } from '@element-plus/icons-vue';

// ── Register ALL free icons into the FA library ──
library.add(fas, far, fab);

// ── Build sorted icon lists from each icon set ──
function buildIconList(iconSet) {
  return Object.values(iconSet)
    .filter((ic) => ic && typeof ic === 'object' && ic.iconName && ic.prefix && ic.icon)
    .map((ic) => ({
      prefix: ic.prefix,
      iconName: ic.iconName,
      unicode: Array.isArray(ic.icon) && ic.icon.length > 3
        ? (typeof ic.icon[3] === 'string' ? ic.icon[3] : String(ic.icon[3]))
        : '',
    }))
    .sort((a, b) => a.iconName.localeCompare(b.iconName));
}

const allCategories = shallowRef([
  { name: 'solid',   label: 'Solid',   icons: buildIconList(fas) },
  { name: 'regular', label: 'Regular', icons: buildIconList(far) },
  { name: 'brands',  label: 'Brands',  icons: buildIconList(fab) },
]);

const search = ref('');
const expanded = reactive({ solid: true, regular: true, brands: true });

const totalCount = computed(() =>
  allCategories.value.reduce((sum, cat) => sum + cat.icons.length, 0)
);

const filteredCategories = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return allCategories.value;

  return allCategories.value
    .map((cat) => ({
      ...cat,
      icons: cat.icons.filter((ic) => ic.iconName.includes(q) || ic.unicode.includes(q)),
    }))
    .filter((cat) => cat.icons.length > 0);
});

function toggleCategory(name) {
  expanded[name] = !expanded[name];
}

async function copyIconName(ic) {
  const text = `fa-${ic.iconName}`;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage({ message: `已复制: ${text}`, type: 'success', duration: 1500 });
  } catch {
    ElMessage({ message: '复制失败，请手动复制', type: 'warning' });
  }
}
</script>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 4px;
}

.icon-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.icon-card:hover {
  background: #f8fafc;
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.2);
}

.icon-card:hover .icon-preview {
  color: var(--brand-blue, #2563eb);
  transform: scale(1.15);
}

.icon-preview {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #334155;
  transition: all 0.15s ease;
}

.icon-name {
  margin-top: 8px;
  font-size: 12px;
  color: #475569;
  text-align: center;
  word-break: break-all;
  line-height: 1.3;
  max-width: 100%;
}

.icon-unicode {
  margin-top: 2px;
  font-size: 10px;
  color: #94a3b8;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
}
</style>
