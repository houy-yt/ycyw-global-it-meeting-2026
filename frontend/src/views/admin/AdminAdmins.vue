<template>
  <div>
    <!-- 顶部说明 -->
    <div class="flex flex-wrap items-start justify-between gap-3 mb-5">
      <p class="text-xs text-slate-400 flex-1 min-w-[240px] leading-relaxed">
        管理系统角色与权限。<b>超级管理员</b>（在服务器 <code>.env</code> 文件中配置）拥有全部权限且不可修改。
        其他角色（管理员、审核员、编辑等）可由超级管理员添加、编辑和删除。
      </p>
      <el-button type="primary" @click="openAddDialog">
        <font-awesome-icon icon="user-plus" class="mr-1" />
        添加角色用户
      </el-button>
    </div>

    <!-- 角色用户列表 -->
    <el-table :data="users" stripe v-loading="loading" class="w-full">
      <el-table-column label="用户" min-width="200">
        <template #default="{ row }">
          <div class="flex items-center gap-2">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              :class="row.isSuperAdmin
                ? 'bg-amber-100 text-amber-700'
                : 'bg-brand-blue/10 text-brand-blue'"
            >
              <font-awesome-icon :icon="row.isSuperAdmin ? 'crown' : 'user'" />
            </div>
            <div class="min-w-0">
              <div class="font-medium text-slate-700 truncate">{{ row.nickname || row.email.split('@')[0] }}</div>
              <div class="text-xs text-slate-400 truncate">{{ row.email }}</div>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="角色" width="140">
        <template #default="{ row }">
          <el-tag
            v-if="row.isSuperAdmin"
            type="warning"
            size="small"
            effect="dark"
            class="!rounded-full"
          >
            <font-awesome-icon icon="crown" class="mr-1 text-[10px]" />
            超级管理员
          </el-tag>
          <el-tag
            v-else
            :type="roleTagType(row.role)"
            size="small"
            effect="plain"
            class="!rounded-full"
          >
            {{ roleLabel(row.role) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="权限范围" min-width="240">
        <template #default="{ row }">
          <template v-if="row.isSuperAdmin">
            <span class="text-xs text-amber-600 font-medium">全部权限</span>
          </template>
          <template v-else-if="row.adminPermissions && row.adminPermissions.length > 0">
            <div class="flex flex-wrap gap-1">
              <el-tag
                v-for="key in row.adminPermissions"
                :key="key"
                size="small"
                type="info"
                effect="plain"
                class="!rounded"
              >
                {{ permLabel(key) }}
              </el-tag>
            </div>
          </template>
          <template v-else>
            <span class="text-xs text-slate-400">未分配权限</span>
          </template>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="160" align="right">
        <template #default="{ row }">
          <template v-if="!row.isSuperAdmin">
            <el-button size="small" text type="primary" @click="openEditDialog(row)">
              <font-awesome-icon icon="pen-to-square" class="mr-1" />
              编辑
            </el-button>
            <el-popconfirm
              title="确定要撤销该用户的角色吗？将恢复为普通用户。"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="removeUser(row)"
            >
              <template #reference>
                <el-button size="small" text type="danger">
                  <font-awesome-icon icon="user-minus" class="mr-1" />
                  删除
                </el-button>
              </template>
            </el-popconfirm>
          </template>
          <template v-else>
            <span class="text-[11px] text-slate-400 inline-flex items-center gap-1">
              <font-awesome-icon icon="lock" class="text-[10px]" />
              不可修改
            </span>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加角色用户对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加角色用户"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form :model="addForm" label-width="80px" class="pr-4">
        <el-form-item label="邮箱" required>
          <el-input
            v-model="addForm.email"
            placeholder="请输入用户邮箱"
            clearable
          />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="addForm.role" placeholder="请选择角色" class="w-full">
            <el-option
              v-for="r in roleDefinitions"
              :key="r.key"
              :label="r.label"
              :value="r.key"
            >
              <span class="inline-flex items-center gap-2">
                <font-awesome-icon :icon="r.icon" class="w-4 text-slate-400" />
                {{ r.label }}
                <span class="text-xs text-slate-400">— {{ r.description }}</span>
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="管理权限">
          <div class="text-xs text-slate-400 mb-2">
            勾选允许该用户访问的后台页面。不勾选则无后台访问权限。
          </div>
          <div class="space-y-3 w-full">
            <div v-for="group in permGroups" :key="group.title">
              <div class="text-xs font-semibold text-slate-500 mb-1">{{ group.title }}</div>
              <div class="flex flex-wrap gap-x-4 gap-y-1 pl-2">
                <el-checkbox
                  v-for="item in group.items"
                  :key="item.key"
                  v-model="addForm.permissions"
                  :value="item.key"
                  class="!h-7"
                >
                  <span class="inline-flex items-center gap-1.5">
                    <font-awesome-icon :icon="item.icon" class="w-3.5 text-slate-400" />
                    {{ item.label }}
                  </span>
                </el-checkbox>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex items-center justify-between">
          <el-button text @click="selectAllPerms(addForm)">全选</el-button>
          <div class="flex gap-2">
            <el-button @click="addDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="addUser">确定添加</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 编辑角色用户对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑角色用户"
      width="560px"
      :close-on-click-modal="false"
    >
      <div class="mb-4 flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-xs font-bold">
          <font-awesome-icon icon="user" />
        </div>
        <div>
          <div class="font-medium text-slate-700">{{ editForm.nickname || editForm.email }}</div>
          <div class="text-xs text-slate-400">{{ editForm.email }}</div>
        </div>
      </div>

      <el-form label-width="80px" class="pr-4">
        <el-form-item label="角色">
          <el-select v-model="editForm.role" placeholder="请选择角色" class="w-full">
            <el-option
              v-for="r in roleDefinitions"
              :key="r.key"
              :label="r.label"
              :value="r.key"
            >
              <span class="inline-flex items-center gap-2">
                <font-awesome-icon :icon="r.icon" class="w-4 text-slate-400" />
                {{ r.label }}
                <span class="text-xs text-slate-400">— {{ r.description }}</span>
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="管理权限">
          <div class="space-y-3 w-full">
            <div v-for="group in permGroups" :key="group.title">
              <div class="text-xs font-semibold text-slate-500 mb-1">{{ group.title }}</div>
              <div class="flex flex-wrap gap-x-4 gap-y-1 pl-2">
                <el-checkbox
                  v-for="item in group.items"
                  :key="item.key"
                  v-model="editForm.permissions"
                  :value="item.key"
                  class="!h-7"
                >
                  <span class="inline-flex items-center gap-1.5">
                    <font-awesome-icon :icon="item.icon" class="w-3.5 text-slate-400" />
                    {{ item.label }}
                  </span>
                </el-checkbox>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex items-center justify-between">
          <el-button text @click="selectAllPerms(editForm)">全选</el-button>
          <div class="flex gap-2">
            <el-button @click="editDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="updateUser">保存</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../../api';
import { adminMenuGroups } from '../../config/adminMenu';

const loading = ref(false);
const saving = ref(false);
const users = ref([]);
const roleDefinitions = ref([]);

// ── Role display helpers ──
const roleMap = computed(() => {
  const m = {};
  for (const r of roleDefinitions.value) {
    m[r.key] = r;
  }
  return m;
});

function roleLabel(role) {
  return roleMap.value[role]?.label || role;
}

function roleTagType(role) {
  return roleMap.value[role]?.color || 'info';
}

// ── Permission helpers ──
const permGroups = computed(() =>
  adminMenuGroups.map((g) => ({
    title: g.title,
    items: g.items.filter((it) => !it.superAdminOnly),
  })).filter((g) => g.items.length > 0)
);

const permLabelMap = computed(() => {
  const map = {};
  for (const g of adminMenuGroups) {
    for (const it of g.items) {
      map[it.key] = it.label;
    }
  }
  return map;
});

function permLabel(key) {
  return permLabelMap.value[key] || key;
}

const allPermKeys = computed(() =>
  permGroups.value.flatMap((g) => g.items.map((it) => it.key))
);

function selectAllPerms(form) {
  form.permissions = [...allPermKeys.value];
}

// ── Load ──
async function loadRoles() {
  try {
    const { data } = await api.get('/admin/admins/roles');
    roleDefinitions.value = data;
  } catch {
    roleDefinitions.value = [
      { key: 'admin', label: '管理员', icon: 'user-gear', color: 'primary', description: '可访问后台管理页面' },
      { key: 'auditor', label: '审核员', icon: 'clipboard-check', color: 'success', description: '可审核内容（预留）' },
      { key: 'editor', label: '编辑', icon: 'pen-nib', color: 'warning', description: '可编辑内容（预留）' },
    ];
  }
}

async function loadUsers() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/admins');
    users.value = data;
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载角色用户列表失败');
  } finally {
    loading.value = false;
  }
}

// ── Add dialog ──
const addDialogVisible = ref(false);
const addForm = ref({ email: '', role: 'admin', permissions: [] });

function openAddDialog() {
  addForm.value = { email: '', role: 'admin', permissions: [] };
  addDialogVisible.value = true;
}

async function addUser() {
  const email = addForm.value.email.trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return ElMessage.warning('请输入有效的邮箱地址');
  }
  if (!addForm.value.role) {
    return ElMessage.warning('请选择角色');
  }
  saving.value = true;
  try {
    await api.post('/admin/admins', {
      email,
      role: addForm.value.role,
      adminPermissions: addForm.value.permissions,
    });
    ElMessage.success('角色用户添加成功');
    addDialogVisible.value = false;
    await loadUsers();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '添加失败');
  } finally {
    saving.value = false;
  }
}

// ── Edit dialog ──
const editDialogVisible = ref(false);
const editForm = ref({ id: null, email: '', nickname: '', role: '', permissions: [] });

function openEditDialog(row) {
  editForm.value = {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    role: row.role === 'superadmin' ? 'admin' : row.role,
    permissions: Array.isArray(row.adminPermissions) ? [...row.adminPermissions] : [],
  };
  editDialogVisible.value = true;
}

async function updateUser() {
  saving.value = true;
  try {
    await api.put(`/admin/admins/${editForm.value.id}`, {
      role: editForm.value.role,
      adminPermissions: editForm.value.permissions,
    });
    ElMessage.success('更新成功');
    editDialogVisible.value = false;
    await loadUsers();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '更新失败');
  } finally {
    saving.value = false;
  }
}

// ── Remove ──
async function removeUser(row) {
  try {
    await api.delete(`/admin/admins/${row.id}`);
    ElMessage.success('已撤销用户角色');
    await loadUsers();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '撤销失败');
  }
}

onMounted(async () => {
  await loadRoles();
  await loadUsers();
});
</script>
