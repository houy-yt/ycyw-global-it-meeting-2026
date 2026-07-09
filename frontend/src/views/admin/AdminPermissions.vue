<template>
  <div>
    <!-- ── 顶部说明 + 操作栏 ── -->
    <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
      <p class="text-xs text-slate-400 flex-1 min-w-[240px] leading-relaxed">
        以目录树形式管理站点所有页面的访问权限。默认所有页面都需要登录后才能访问，
        勾选前台页面的<b>「免登录访问」</b>后，该页面将允许匿名访问（管理后台始终需要登录）。
        目录结构支持后续扩展二级、三级页面及更多权限项。
      </p>
      <el-button type="primary" plain :loading="scanning" @click="scanSite">
        <font-awesome-icon icon="magnifying-glass" class="mr-1" />
        扫描站点页面
      </el-button>
    </div>

    <!-- ── 扫描结果提示 ── -->
    <el-alert
      v-if="scanNotice"
      :title="scanNotice.title"
      :type="scanNotice.type"
      :closable="true"
      show-icon
      class="mb-4"
      @close="scanNotice = null"
    />

    <!-- ── 权限目录（Tab 拆分：前台 / 后台） ── -->
    <el-tabs v-model="activeTab" type="border-card" class="perm-tabs">
      <el-tab-pane name="frontend">
        <template #label>
          <span class="inline-flex items-center gap-1.5">
            <font-awesome-icon icon="desktop" class="text-brand-blue" />
            <span>前台页面</span>
            <span class="text-[11px] text-slate-400">（{{ frontendCount }}）</span>
          </span>
        </template>
        <el-tree
          :data="frontendNodes"
          node-key="id"
          :default-expand-all="true"
          :expand-on-click-node="false"
          :indent="20"
          class="perm-tree"
        >
          <template #default="{ data }">
            <div class="flex items-center justify-between w-full pr-3 gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <font-awesome-icon
                  :icon="nodeIcon(data)"
                  class="w-4 text-center flex-shrink-0"
                  :class="nodeIconClass(data)"
                />
                <span
                  class="truncate"
                  :class="data.kind === 'group' ? 'font-semibold text-slate-700' : 'text-slate-600'"
                >
                  {{ data.label }}
                </span>
                <span v-if="data.path" class="text-[11px] font-mono text-slate-400 flex-shrink-0">
                  {{ data.path }}
                </span>
                <span
                  v-if="data.isNew"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-semibold flex-shrink-0"
                >
                  新
                </span>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <template v-if="data.kind === 'page'">
                  <span class="text-[11px] text-slate-400">免登录访问</span>
                  <el-switch v-model="data.anonymous" size="small" />
                </template>
                <span v-else class="text-[11px] text-slate-300">
                  {{ leafCount(data) }} 个页面
                </span>
              </div>
            </div>
          </template>
        </el-tree>
      </el-tab-pane>

      <el-tab-pane name="admin">
        <template #label>
          <span class="inline-flex items-center gap-1.5">
            <font-awesome-icon icon="screwdriver-wrench" class="text-slate-500" />
            <span>后台页面</span>
            <span class="text-[11px] text-slate-400">（{{ adminCount }}）</span>
          </span>
        </template>
        <el-tree
          :data="adminNodes"
          node-key="id"
          :default-expand-all="true"
          :expand-on-click-node="false"
          :indent="20"
          class="perm-tree"
        >
          <template #default="{ data }">
            <div class="flex items-center justify-between w-full pr-3 gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <font-awesome-icon
                  :icon="nodeIcon(data)"
                  class="w-4 text-center flex-shrink-0"
                  :class="nodeIconClass(data)"
                />
                <span
                  class="truncate"
                  :class="data.kind === 'group' ? 'font-semibold text-slate-700' : 'text-slate-600'"
                >
                  {{ data.label }}
                </span>
                <span v-if="data.path" class="text-[11px] font-mono text-slate-400 flex-shrink-0">
                  {{ data.path }}
                </span>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <template v-if="data.kind === 'page'">
                  <span class="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <font-awesome-icon icon="lock" class="text-[10px]" />
                    需登录
                  </span>
                </template>
                <span v-else class="text-[11px] text-slate-300">
                  {{ leafCount(data) }} 个页面
                </span>
              </div>
            </div>
          </template>
        </el-tree>
      </el-tab-pane>
    </el-tabs>

    <!-- ── 底部操作 ── -->
    <div class="pt-6 flex gap-3">
      <el-button type="primary" :loading="saving" @click="save">保存权限设置</el-button>
      <el-button @click="load">重新加载</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../../api';
import { useAuthStore } from '../../stores/auth';
import {
  adminMenuGroups,
  frontendRouteLabels,
  excludedFrontendPaths,
} from '../../config/adminMenu';

const auth = useAuthStore();
const router = useRouter();

const treeData = ref([]);
const saving = ref(false);
const scanning = ref(false);
const scanNotice = ref(null);
const activeTab = ref('frontend');

// ── Per-tab views (children of the two logical root nodes) ──
const frontendRoot = computed(
  () => treeData.value.find((n) => n.id === 'root:frontend') || null,
);
const adminRoot = computed(
  () => treeData.value.find((n) => n.id === 'root:admin') || null,
);
const frontendNodes = computed(() => frontendRoot.value?.children || []);
const adminNodes = computed(() => adminRoot.value?.children || []);
const frontendCount = computed(() =>
  frontendRoot.value ? leafCount(frontendRoot.value) : 0,
);
const adminCount = computed(() =>
  adminRoot.value ? leafCount(adminRoot.value) : 0,
);


// ── Node display helpers ──
function nodeIcon(data) {
  if (data.kind === 'root') return data.type === 'frontend' ? 'desktop' : 'screwdriver-wrench';
  if (data.kind === 'group') return 'folder';
  return data.icon || (data.type === 'frontend' ? 'file-lines' : 'gear');
}

function nodeIconClass(data) {
  if (data.kind === 'root') return 'text-brand-blue';
  if (data.kind === 'group') return 'text-slate-400';
  return data.type === 'frontend' ? 'text-emerald-500' : 'text-slate-400';
}
function leafCount(data) {
  let n = 0;
  const walk = (node) => {
    if (node.kind === 'page') { n += 1; return; }
    (node.children || []).forEach(walk);
  };
  (data.children || []).forEach(walk);
  return n;
}

/**
 * Build the canonical permission tree by scanning the live site:
 *  - Frontend pages come from the Vue Router route table (router.getRoutes()).
 *  - Admin pages come from the shared admin menu definition (adminMenuGroups).
 * @returns {Array} root nodes
 */
function buildCanonicalTree() {
  // ── Frontend pages ──
  const seen = new Set();
  const frontendChildren = [];
  for (const r of router.getRoutes()) {
    const p = r.path;
    if (!p || p.includes(':') || p.includes('*')) continue; // skip dynamic / catch-all
    if (excludedFrontendPaths.has(p)) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    frontendChildren.push({
      id: 'fe:' + p,
      kind: 'page',
      type: 'frontend',
      path: p,
      label: frontendRouteLabels[p] || (r.name ? String(r.name) : p),
      anonymous: false,
    });
  }
  // Stable order: root first, then alphabetical
  frontendChildren.sort((a, b) => {
    if (a.path === '/') return -1;
    if (b.path === '/') return 1;
    return a.path.localeCompare(b.path);
  });

  // ── Admin pages (grouped) ──
  const adminChildren = adminMenuGroups.map((g) => ({
    id: 'admin-group:' + g.title,
    kind: 'group',
    type: 'admin',
    label: g.title,
    children: g.items.map((it) => ({
      id: 'admin:' + it.key,
      kind: 'page',
      type: 'admin',
      key: it.key,
      icon: it.icon,
      label: it.label,
    })),
  }));

  return [
    {
      id: 'root:frontend',
      kind: 'root',
      type: 'frontend',
      label: '前台页面',
      children: frontendChildren,
    },
    {
      id: 'root:admin',
      kind: 'root',
      type: 'admin',
      label: '后台管理',
      children: adminChildren,
    },
  ];
}

/** Collect all leaf page nodes from a tree into a Map keyed by id. */
function collectLeaves(nodes, map = new Map()) {
  for (const n of nodes) {
    if (n.kind === 'page') map.set(n.id, n);
    if (n.children) collectLeaves(n.children, map);
  }
  return map;
}

/**
 * Overlay saved permission state onto a freshly built canonical tree.
 * @param {Array} canonical - freshly scanned tree
 * @param {Object} opts - { savedTree?, whitelist? }
 * @param {boolean} markNew - if true, flag pages not present in savedTree as isNew
 * @returns {{tree: Array, newCount: number}}
 */
function applySavedState(canonical, { savedTree = null, whitelist = [] }, markNew = false) {
  const savedLeaves = savedTree ? collectLeaves(savedTree) : new Map();
  const wl = new Set(whitelist.map((p) => normalizePath(p)));
  let newCount = 0;

  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.kind === 'page' && n.type === 'frontend') {
        const saved = savedLeaves.get(n.id);
        if (saved) {
          n.anonymous = !!saved.anonymous;
        } else if (savedTree) {
          // Not in saved tree → newly discovered page
          n.anonymous = wl.has(normalizePath(n.path));
          if (markNew) { n.isNew = true; newCount += 1; }
        } else {
          // No saved tree at all → fall back to legacy whitelist
          n.anonymous = wl.has(normalizePath(n.path));
        }
      }
      if (n.children) walk(n.children);
    }
  };
  walk(canonical);
  return { tree: canonical, newCount };
}

function normalizePath(p) {
  if (!p) return p;
  const clean = String(p).split('?')[0].split('#')[0];
  return clean.length > 1 ? clean.replace(/\/+$/, '') : clean;
}

/** Derive the anonymous-access whitelist (frontend paths) from the tree. */
function deriveWhitelist(nodes, out = []) {
  for (const n of nodes) {
    if (n.kind === 'page' && n.type === 'frontend' && n.anonymous) {
      out.push(n.path);
    }
    if (n.children) deriveWhitelist(n.children, out);
  }
  return out;
}

/** Strip transient UI flags before persisting. */
function serializeTree(nodes) {
  return nodes.map((n) => {
    const { isNew, ...rest } = n;
    const copy = { ...rest };
    if (n.children) copy.children = serializeTree(n.children);
    return copy;
  });
}

// ── Load / Save ──
async function load() {
  scanNotice.value = null;
  let savedTree = null;
  let whitelist = [];
  try {
    const { data } = await api.get('/admin/settings');
    const list = Array.isArray(data) ? data : (data?.list || []);
    for (const it of list) {
      if (it.key === 'permissions.tree') {
        try {
          const parsed = JSON.parse(it.value);
          if (Array.isArray(parsed)) savedTree = parsed;
        } catch { /* ignore */ }
      } else if (it.key === 'auth.whitelist') {
        try {
          const parsed = JSON.parse(it.value);
          if (Array.isArray(parsed)) whitelist = parsed.filter((p) => typeof p === 'string');
        } catch { /* ignore */ }
      }
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载权限设置失败');
  }
  const canonical = buildCanonicalTree();
  const { tree } = applySavedState(canonical, { savedTree, whitelist }, false);
  treeData.value = tree;
}

async function save() {
  saving.value = true;
  try {
    // Clear "new" flags on save
    clearNewFlags(treeData.value);
    const items = [
      {
        key: 'permissions.tree',
        value: JSON.stringify(serializeTree(treeData.value)),
        category: 'permissions',
      },
      {
        key: 'auth.whitelist',
        value: JSON.stringify(deriveWhitelist(treeData.value)),
        category: 'auth',
      },
    ];
    await api.put('/admin/settings', { items });
    // Refresh in-memory whitelist so the router guard picks it up immediately
    try { await auth.fetchConfig(); } catch { /* ignore */ }
    ElMessage.success('权限设置已保存');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

function clearNewFlags(nodes) {
  for (const n of nodes) {
    if (n.isNew) delete n.isNew;
    if (n.children) clearNewFlags(n.children);
  }
}

// ── Scan site for new pages ──
async function scanSite() {
  scanning.value = true;
  scanNotice.value = null;
  try {
    const canonical = buildCanonicalTree();
    // Overlay the CURRENT (possibly-unsaved) tree state, marking new pages
    const currentAsSaved = serializeTree(treeData.value);
    const { tree, newCount } = applySavedState(
      canonical,
      { savedTree: currentAsSaved, whitelist: deriveWhitelist(treeData.value) },
      true,
    );
    treeData.value = tree;

    if (newCount > 0) {
      scanNotice.value = {
        type: 'success',
        title: `扫描完成：发现 ${newCount} 个新页面并已加入目录（标记为「新」）。请检查权限后点击「保存权限设置」。`,
      };
    } else {
      scanNotice.value = {
        type: 'info',
        title: '扫描完成：未发现新页面，权限目录已是最新。',
      };
    }
  } catch (e) {
    scanNotice.value = { type: 'error', title: '扫描失败：' + (e.message || '未知错误') };
  } finally {
    scanning.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.perm-tree {
  padding: 0.25rem 0;
}
.perm-tree :deep(.el-tree-node__content) {
  height: 38px;
}
</style>
