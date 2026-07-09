<template>
  <div>
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <div class="text-sm text-slate-500">
          维护第三方 API Key / Secret（天气、地图等）。敏感字段会被脱敏展示；编辑时如保留 <span class="font-mono">****xxxx</span> 不变，服务器会自动保留原值。
        </div>
      </div>
      <div class="flex items-center gap-2">
        <el-button size="small" @click="load" :loading="loading">刷新</el-button>
        <el-button size="small" type="primary" @click="openCreate">
          <font-awesome-icon icon="plus" class="mr-1" />新增配置
        </el-button>
      </div>
    </div>

    <div class="mt-4 flex items-center gap-3 flex-wrap">
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-400">类型</span>
        <el-select v-model="filters.type" size="small" class="w-40" clearable placeholder="全部">
          <el-option label="天气" value="weather" />
          <el-option label="地图" value="map" />
          <el-option label="其他" value="other" />
        </el-select>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-400">关键字</span>
        <el-input v-model="filters.q" size="small" class="w-64" clearable placeholder="名称 / Provider" />
      </div>
      <div class="text-xs text-slate-400">共 {{ filtered.length }} 条</div>
    </div>

    <div class="mt-4 rounded-lg ring-1 ring-slate-200 overflow-hidden bg-white">
      <el-table
        :data="filtered"
        size="small"
        stripe
        v-loading="loading"
        row-key="id"
        empty-text="暂无配置"
      >
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <span class="text-xs px-2 py-0.5 rounded-full"
              :class="row.type === 'weather'
                ? 'bg-sky-50 text-sky-700'
                : row.type === 'map'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-50 text-slate-600'"
            >
              {{ typeLabel(row.type) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="名称" min-width="140" prop="name" show-overflow-tooltip />
        <el-table-column label="Provider" min-width="120" prop="provider" show-overflow-tooltip />
        <el-table-column label="排序" width="70" align="center" prop="sortOrder" />
        <el-table-column label="Active" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.isActive"
              size="small"
              @change="() => quickUpdate(row, { isActive: row.isActive })"
            />
          </template>
        </el-table-column>
        <el-table-column label="首页小部件" width="110" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.widgetEnabled"
              size="small"
              :disabled="!row.isActive"
              @change="() => quickUpdate(row, { widgetEnabled: row.widgetEnabled })"
            />
          </template>
        </el-table-column>
        <el-table-column label="配置(脱敏)" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="font-mono text-xs text-slate-500">{{ row.config }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" link type="danger" @click="removeRow(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Dialog: Create/Edit -->
    <el-dialog
      v-model="dlg.visible"
      :title="dlg.isEdit ? '编辑配置' : '新增配置'"
      width="640px"
      align-center
      class="api-config-dialog"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form :model="dlg.form" label-position="top">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <el-form-item label="名称" required>
            <el-input v-model="dlg.form.name" placeholder="如：和风天气 / 高德地图" />
          </el-form-item>
          <el-form-item label="类型" required>
            <el-select v-model="dlg.form.type" class="w-full">
              <el-option label="天气" value="weather" />
              <el-option label="地图" value="map" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item label="Provider" required>
            <el-select v-model="dlg.form.provider" class="w-full" filterable allow-create default-first-option>
              <el-option v-for="p in providerOptions" :key="p" :label="p" :value="p" />
            </el-select>
            <div class="text-[11px] text-slate-400 mt-1">可选择或手动输入 provider 标识（用于后端识别不同供应商）。</div>
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="dlg.form.sortOrder" :min="0" class="w-full" />
          </el-form-item>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <el-form-item label="启用 (isActive)">
            <el-switch v-model="dlg.form.isActive" />
          </el-form-item>
          <el-form-item label="首页显示小部件 (widgetEnabled)">
            <el-switch v-model="dlg.form.widgetEnabled" :disabled="!dlg.form.isActive" />
          </el-form-item>
        </div>

        <el-form-item label="配置" required>
          <div class="w-full">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="text-[11px] text-slate-400">
                推荐使用“简单模式”填写。需要自定义字段时可切换到 JSON 高级模式。
              </div>
              <el-switch
                v-model="dlg.ui.advanced"
                active-text="高级(JSON)"
                inactive-text="简单"
              />
            </div>

            <!-- Simple Mode: structured forms -->
            <div v-if="!dlg.ui.advanced" class="space-y-4">
              <!-- Weather: QWeather -->
              <div v-if="dlg.form.type === 'weather' && dlg.form.provider === 'qweather'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <el-form-item label="API Host" required>
                  <el-input v-model="dlg.simple.weatherQ.apiHost" placeholder="如：xxx.re.qweatherapi.com" />
                </el-form-item>
                <el-form-item label="Credential ID" required>
                  <el-input v-model="dlg.simple.weatherQ.credentialId" placeholder="如：Q00D3880B2" />
                </el-form-item>
                <el-form-item label="Private Key" required class="sm:col-span-2">
                  <div class="flex items-center gap-2">
                    <el-input
                      v-model="dlg.simple.weatherQ.privateKey"
                      :type="dlg.ui.showSecrets ? 'text' : 'password'"
                      placeholder="粘贴 Ed25519 私钥(base64 body)"
                      show-password
                      class="flex-1"
                    />
                    <el-button
                      v-if="dlg.isEdit"
                      size="small"
                      @click="revealSecrets"
                      :loading="dlg.ui.revealing"
                    >
                      显示密钥
                    </el-button>
                  </div>
                  <div class="text-[11px] text-slate-400 mt-1">
                    默认不下发明文密钥。点击“显示密钥”会请求服务器返回该配置的明文（仅管理员）。
                  </div>
                </el-form-item>
                <el-form-item label="Location (ID)" required>
                  <el-input v-model="dlg.simple.weatherQ.location" placeholder="如：101010100" />
                </el-form-item>
                <el-form-item label="Location Name">
                  <el-input v-model="dlg.simple.weatherQ.locationName" placeholder="如：北京" />
                </el-form-item>
              </div>

              <!-- Weather: Open-Meteo -->
              <div v-else-if="dlg.form.type === 'weather' && dlg.form.provider === 'openmeteo'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <el-form-item label="Latitude" required>
                  <el-input v-model="dlg.simple.weatherO.latitude" placeholder="如：39.9042" />
                </el-form-item>
                <el-form-item label="Longitude" required>
                  <el-input v-model="dlg.simple.weatherO.longitude" placeholder="如：116.4074" />
                </el-form-item>
                <el-form-item label="Location Name" class="sm:col-span-2">
                  <el-input v-model="dlg.simple.weatherO.locationName" placeholder="如：北京" />
                </el-form-item>
              </div>

              <!-- Fallback: other types/providers -->
              <div v-else class="text-[12px] text-slate-500">
                当前类型/Provider 暂无简单表单，请切换到“高级(JSON)”模式编辑。
              </div>
            </div>

            <!-- Advanced Mode: JSON -->
            <div v-else>
              <el-input
                v-model="dlg.form.config"
                type="textarea"
                :rows="8"
                placeholder='如：{"apiHost":"xxx.re.qweatherapi.com","credentialId":"...","privateKey":"..."}'
              />
              <div class="text-[11px] text-slate-400 mt-1">
                提示：敏感字段（apiKey/privateKey/secret/token 等）会被脱敏回显。编辑时如保留 <span class="font-mono">****</span> 前缀，服务器会保留原值。
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="Widget Config (JSON，可选)">
          <el-input v-model="dlg.form.widgetConfig" type="textarea" :rows="3" placeholder='如：{"position":"hero-top-right"}' />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="dlg.visible = false">取消</el-button>
          <el-button type="primary" :loading="dlg.saving" @click="saveDialog">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../../api';

const loading = ref(false);
const rows = ref([]);

const filters = reactive({ type: '', q: '' });

function typeLabel(t) {
  if (t === 'weather') return '天气';
  if (t === 'map') return '地图';
  return '其他';
}

const filtered = computed(() => {
  const q = (filters.q || '').trim().toLowerCase();
  return rows.value.filter((r) => {
    if (filters.type && r.type !== filters.type) return false;
    if (q) {
      const hay = `${r.name || ''} ${r.provider || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
});

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/admin/api-configs');
    rows.value = Array.isArray(data) ? data : [];
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载失败');
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

async function quickUpdate(row, patch) {
  try {
    const payload = { ...row, ...patch };
    // Ensure numeric
    payload.sortOrder = Number(payload.sortOrder) || 0;
    const { data } = await api.put(`/admin/api-configs/${row.id}`, payload);
    // Update local row with response (config is masked by backend)
    Object.assign(row, data);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '更新失败');
    await load();
  }
}

const dlg = reactive({
  visible: false,
  isEdit: false,
  saving: false,
  id: null,
  ui: {
    advanced: false,
    showSecrets: false,
    revealing: false,
  },
  simple: {
    weatherQ: {
      apiHost: '',
      credentialId: '',
      privateKey: '',
      location: '101010100',
      locationName: '北京',
    },
    weatherO: {
      latitude: '39.9042',
      longitude: '116.4074',
      locationName: '北京',
    },
  },
  form: {
    name: '',
    type: 'weather',
    provider: 'qweather',
    config: '{\n  \"apiHost\": \"\",\n  \"credentialId\": \"\",\n  \"privateKey\": \"\",\n  \"location\": \"101010100\",\n  \"locationName\": \"北京\"\n}',
    widgetEnabled: false,
    widgetConfig: '{}',
    isActive: true,
    sortOrder: 0,
  },
});

function blankForm() {
  return {
    name: '',
    type: 'weather',
    provider: 'qweather',
    config: '{\n  \"apiHost\": \"\",\n  \"credentialId\": \"\",\n  \"privateKey\": \"\",\n  \"location\": \"101010100\",\n  \"locationName\": \"北京\"\n}',
    widgetEnabled: false,
    widgetConfig: '{}',
    isActive: true,
    sortOrder: 0,
  };
}

function safeParseConfig(str) {
  try {
    const o = JSON.parse(str || '{}');
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

function syncSimpleFromConfig() {
  const cfg = safeParseConfig(dlg.form.config);
  if (dlg.form.type === 'weather' && dlg.form.provider === 'qweather') {
    dlg.simple.weatherQ.apiHost = cfg.apiHost || '';
    dlg.simple.weatherQ.credentialId = cfg.credentialId || '';
    dlg.simple.weatherQ.privateKey = cfg.privateKey || '';
    dlg.simple.weatherQ.location = cfg.location || '101010100';
    dlg.simple.weatherQ.locationName = cfg.locationName || '北京';
  }
  if (dlg.form.type === 'weather' && dlg.form.provider === 'openmeteo') {
    dlg.simple.weatherO.latitude = String(cfg.latitude ?? '39.9042');
    dlg.simple.weatherO.longitude = String(cfg.longitude ?? '116.4074');
    dlg.simple.weatherO.locationName = cfg.locationName || '北京';
  }
}

function buildConfigFromSimple() {
  if (dlg.form.type === 'weather' && dlg.form.provider === 'qweather') {
    const q = dlg.simple.weatherQ;
    return {
      apiHost: (q.apiHost || '').trim(),
      credentialId: (q.credentialId || '').trim(),
      privateKey: (q.privateKey || '').trim(),
      location: (q.location || '101010100').trim(),
      locationName: (q.locationName || '北京').trim(),
    };
  }
  if (dlg.form.type === 'weather' && dlg.form.provider === 'openmeteo') {
    const o = dlg.simple.weatherO;
    return {
      latitude: Number(o.latitude),
      longitude: Number(o.longitude),
      locationName: (o.locationName || '北京').trim(),
    };
  }
  return safeParseConfig(dlg.form.config);
}

function openCreate() {
  dlg.isEdit = false;
  dlg.id = null;
  dlg.ui.advanced = false;
  dlg.ui.showSecrets = false;
  dlg.form = blankForm();
  syncSimpleFromConfig();
  dlg.visible = true;
}

function openEdit(row) {
  dlg.isEdit = true;
  dlg.id = row.id;
  dlg.ui.advanced = false;
  dlg.ui.showSecrets = false;
  dlg.form = {
    name: row.name || '',
    type: row.type || 'other',
    provider: row.provider || 'custom',
    config: row.config || '{}', // masked string from backend
    widgetEnabled: !!row.widgetEnabled,
    widgetConfig: row.widgetConfig || '{}',
    isActive: row.isActive !== false,
    sortOrder: Number(row.sortOrder) || 0,
  };
  syncSimpleFromConfig();
  dlg.visible = true;
}

async function revealSecrets() {
  if (!dlg.isEdit || !dlg.id) return;
  try {
    await ElMessageBox.confirm(
      '即将向服务器请求返回该配置的明文密钥。请确认当前环境安全（避免录屏/共享屏幕）。',
      '显示密钥确认',
      { confirmButtonText: '继续', cancelButtonText: '取消', type: 'warning' }
    );
  } catch {
    return;
  }
  dlg.ui.revealing = true;
  try {
    const { data } = await api.get(`/admin/api-configs/${dlg.id}/reveal?confirm=1`);
    if (data?.config) {
      dlg.form.config = data.config;
      syncSimpleFromConfig();
      dlg.ui.showSecrets = true;
      ElMessage.success('已加载明文配置');
    } else {
      ElMessage.warning('未获取到配置内容');
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '获取明文配置失败');
  } finally {
    dlg.ui.revealing = false;
  }
}

const providerOptions = computed(() => {
  if (dlg.form.type === 'weather') return ['qweather', 'openmeteo', 'custom'];
  if (dlg.form.type === 'map') return ['amap', 'baidu', 'google', 'tencent', 'custom'];
  return ['custom'];
});

watch(
  () => dlg.form.type,
  (t) => {
    // If provider is empty or not in common list, keep user value.
    if (!dlg.form.provider) {
      dlg.form.provider = t === 'weather' ? 'qweather' : 'custom';
    }
  }
);

function assertValidJson(str, label) {
  try {
    const parsed = JSON.parse(str || '{}');
    if (parsed === null || typeof parsed !== 'object') {
      throw new Error('JSON must be an object');
    }
    return true;
  } catch (e) {
    ElMessage.warning(`${label} 不是合法 JSON：${e.message}`);
    return false;
  }
}

async function saveDialog() {
  if (!dlg.form.name?.trim()) {
    ElMessage.warning('请填写名称');
    return;
  }
  if (!dlg.form.type) {
    ElMessage.warning('请选择类型');
    return;
  }
  if (!dlg.form.provider?.trim()) {
    ElMessage.warning('请填写 Provider');
    return;
  }
  // If in simple mode, build config JSON from structured fields.
  if (!dlg.ui.advanced) {
    const cfg = buildConfigFromSimple();
    dlg.form.config = JSON.stringify(cfg, null, 2);
  }
  if (!assertValidJson(dlg.form.config, 'Config')) return;
  if (!assertValidJson(dlg.form.widgetConfig, 'Widget Config')) return;

  dlg.saving = true;
  try {
    const payload = {
      ...dlg.form,
      sortOrder: Number(dlg.form.sortOrder) || 0,
    };
    if (dlg.isEdit) {
      await api.put(`/admin/api-configs/${dlg.id}`, payload);
    } else {
      await api.post('/admin/api-configs', payload);
    }
    ElMessage.success('已保存');
    dlg.visible = false;
    await load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    dlg.saving = false;
  }
}

async function removeRow(row) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name || row.id}」？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  try {
    await api.delete(`/admin/api-configs/${row.id}`);
    ElMessage.success('已删除');
    await load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败');
  }
}

onMounted(() => {
  load();
});
</script>

<!-- Non-scoped styles so they work with el-dialog teleport -->
<style>
/* ========== API Config dialog sizing ========== */
.api-config-dialog .el-dialog__body {
  max-height: 65vh;
  overflow-y: auto;
}
</style>
