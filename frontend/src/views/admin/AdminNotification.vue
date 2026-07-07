<template>
  <div>
    <!-- SMTP not configured warning -->
    <el-alert
      v-if="smtpStatus === 'unconfigured'"
      type="warning"
      :closable="false"
      class="mb-4"
      show-icon
    >
      <template #title>SMTP 邮件服务未配置</template>
      <template #default>
        请先到「系统设置」页面配置 SMTP 邮件服务器，才能发送邮件通知。
      </template>
    </el-alert>

    <!-- ── 发件人邮箱 ── -->
    <div class="mb-4">
      <label class="field-label">
        发件人邮箱 <span class="text-red-500">*</span>
      </label>
      <el-select
        v-model="mailForm.fromEmail"
        placeholder="请选择发件邮箱"
        class="w-full"
        @change="onSenderEmailChange"
      >
        <el-option
          v-for="sender in senderEmails"
          :key="sender.email"
          :label="`${sender.email}${sender.name ? ' (' + sender.name + ')' : ''}`"
          :value="sender.email"
        />
      </el-select>
      <p v-if="senderEmails.length === 0" class="text-xs text-orange-500 mt-1">
        <font-awesome-icon icon="circle-exclamation" class="mr-1" />
        尚未配置发件邮箱，请先到「系统设置」→「邮件服务」中添加发件邮箱。
      </p>
    </div>

    <!-- ── 发件人名称 ── -->
    <div class="mb-4">
      <label class="field-label">发件人名称</label>
      <el-input v-model="mailForm.fromName" placeholder="发件人显示名称">
        <template #prefix>
          <font-awesome-icon icon="user" class="text-slate-400" />
        </template>
      </el-input>
      <p class="text-xs text-slate-400 mt-1">选择发件邮箱后自动填充，可修改。</p>
    </div>

    <!-- ── 收件人 ── -->
    <div class="mb-4">
      <label class="field-label">
        收件人 <span class="text-red-500">*</span>
        <span v-if="allRecipientEmails.length > 0" class="text-brand-blue font-normal ml-1">
          ({{ allRecipientEmails.length }} 人)
        </span>
      </label>
      <div class="recipient-box" @click="focusEmailInput">
        <el-tag
          v-for="email in allRecipientEmails"
          :key="email"
          closable
          size="small"
          class="recipient-tag"
          @close="removeRecipient(email)"
        >
          {{ email }}
        </el-tag>
        <input
          ref="emailInputRef"
          v-model="emailInput"
          class="recipient-input"
          placeholder="输入邮箱地址，按回车添加"
          @keydown.enter.prevent="addTypedEmail"
          @keydown.,="addTypedEmail"
          @keydown.delete="onBackspace"
          @blur="addTypedEmail"
        />
      </div>
      <div class="flex items-center mt-1.5">
        <el-button size="small" link type="primary" @click="openPickerDialog">
          <font-awesome-icon icon="users" class="mr-1" />
          选择收件人
        </el-button>
      </div>
    </div>

    <!-- ── 邮件主题 ── -->
    <div class="mb-4">
      <label class="field-label">
        邮件主题 <span class="text-red-500">*</span>
      </label>
      <el-input
        v-model="mailForm.subject"
        placeholder="请输入邮件主题"
        maxlength="200"
        show-word-limit
      >
        <template #prefix>
          <font-awesome-icon icon="pen-to-square" class="text-slate-400" />
        </template>
      </el-input>
    </div>

    <!-- ── 邮件正文 ── -->
    <div class="mb-6">
      <label class="field-label mb-1">邮件正文</label>
      <TinyEditor v-model="mailForm.body" :height="400" placeholder="请输入邮件正文..." />
    </div>

    <!-- ── 发送按钮 ── -->
    <div class="flex gap-3">
      <el-button
        type="primary"
        size="large"
        :loading="sending"
        :disabled="!canSend"
        @click="confirmSend"
      >
        <font-awesome-icon icon="paper-plane" class="mr-1" />
        发送邮件 ({{ allRecipientEmails.length }} 人)
      </el-button>
      <el-button size="large" @click="resetForm">
        <font-awesome-icon icon="xmark" class="mr-1" />
        重置
      </el-button>
    </div>

    <!-- 发送结果 -->
    <el-alert
      v-if="sendResult"
      :type="sendResult.failed > 0 ? 'warning' : 'success'"
      :closable="true"
      class="mt-4"
      show-icon
      @close="sendResult = null"
    >
      <template #title>{{ sendResult.message }}</template>
      <template v-if="sendResult.errors && sendResult.errors.length > 0" #default>
        <div class="mt-2 text-xs">
          <div v-for="(err, i) in sendResult.errors" :key="i" class="text-red-600">
            {{ err.email }}: {{ err.error }}
          </div>
        </div>
      </template>
    </el-alert>

    <!-- ══════════ 选择收件人弹窗 ══════════ -->
    <el-dialog
      v-model="pickerVisible"
      title="选择收件人"
      width="680px"
      :close-on-click-modal="false"
      destroy-on-close
      class="picker-dialog"
    >
      <!-- 已选状态栏 -->
      <div class="picker-status-bar">
        <span class="text-sm text-slate-500">
          已选 <b class="text-brand-blue text-base">{{ dlgSelectedPersonIds.length }}</b> 人
        </span>
      </div>

      <el-tabs v-model="pickerTab" class="picker-tabs">
        <!-- ── Tab 1: 按学校选择 ── -->
        <el-tab-pane name="school">
          <template #label>
            <span class="tab-label">
              <font-awesome-icon icon="school" class="mr-1.5" />按学校选择
            </span>
          </template>

          <div class="flex justify-end mb-3 gap-2">
            <el-button size="small" @click="dlgSelectAllSchools">
              <font-awesome-icon icon="check-double" class="mr-1" />全选
            </el-button>
            <el-button size="small" @click="dlgDeselectAllSchools">
              <font-awesome-icon icon="xmark" class="mr-1" />取消全选
            </el-button>
          </div>

          <el-checkbox-group v-model="dlgSelectedSchools" @change="dlgOnSchoolChange">
            <div class="school-grid">
              <label
                v-for="group in recipientGroups"
                :key="group.school"
                class="school-card"
                :class="{ 'school-card--active': dlgSelectedSchools.includes(group.school) }"
              >
                <el-checkbox :label="group.school" :value="group.school" class="school-checkbox">
                  <span class="school-card-name">{{ group.schoolName }}</span>
                  <span class="school-card-count">{{ group.members.length }}人</span>
                </el-checkbox>
              </label>
            </div>
          </el-checkbox-group>
        </el-tab-pane>

        <!-- ── Tab 2: 按个人选择 ── -->
        <el-tab-pane name="person">
          <template #label>
            <span class="tab-label">
              <font-awesome-icon icon="user" class="mr-1.5" />按个人选择
            </span>
          </template>

          <div class="flex items-center justify-end mb-3 gap-2">
            <el-button size="small" @click="dlgSelectAllPersons">
              <font-awesome-icon icon="check-double" class="mr-1" />全选
            </el-button>
            <el-button size="small" @click="dlgDeselectAllPersons">
              <font-awesome-icon icon="xmark" class="mr-1" />取消全选
            </el-button>
            <el-input
              v-model="dlgPersonSearch"
              placeholder="搜索姓名/邮箱..."
              clearable
              size="small"
              style="width: 200px"
            >
              <template #prefix>
                <font-awesome-icon icon="magnifying-glass" class="text-slate-400" />
              </template>
            </el-input>
          </div>

          <div class="person-list">
            <el-checkbox-group v-model="dlgSelectedPersonIds" @change="dlgSyncSchools">
              <div
                v-for="person in dlgFilteredPersons"
                :key="person.id"
                class="person-item"
                :class="{ 'person-item--active': dlgSelectedPersonIds.includes(person.id) }"
              >
                <el-checkbox :label="person.id" :value="person.id">
                  <span class="text-sm">
                    <span class="font-medium">{{ person.nameCn || person.nameEn || '(无名)' }}</span>
                    <span class="text-slate-400 text-xs ml-2">{{ person.email }}</span>
                    <el-tag size="small" type="info" class="ml-2" effect="plain">{{ person.school }}</el-tag>
                  </span>
                </el-checkbox>
              </div>
              <div v-if="dlgFilteredPersons.length === 0" class="text-center text-slate-400 text-sm py-8">
                <font-awesome-icon icon="face-meh" class="text-2xl mb-2 block" />
                无匹配结果
              </div>
            </el-checkbox-group>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <div class="flex items-center justify-between w-full">
          <span class="text-xs text-slate-400">
            已选 <b class="text-brand-blue">{{ dlgSelectedPersonIds.length }}</b> 人
          </span>
          <div class="flex gap-2">
            <el-button @click="pickerVisible = false">取消</el-button>
            <el-button type="primary" @click="confirmPicker">确定</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../../api';
import TinyEditor from '../../components/TinyEditor.vue';

// ── State ──
const sending = ref(false);
const smtpStatus = ref('checking');
const sendResult = ref(null);
const senderEmails = ref([]);  // [{email, name}] from settings

const mailForm = reactive({
  fromEmail: '',
  fromName: '',
  subject: '',
  body: '',
});

// ── Recipient data ──
const recipientGroups = ref([]);
const selectedPersonIds = ref([]);   // person IDs selected from picker
const manualEmails = ref([]);        // emails typed directly
const emailInput = ref('');          // current typing in the input
const emailInputRef = ref(null);

// ── Picker dialog state ──
const pickerVisible = ref(false);
const pickerTab = ref('school');
const dlgSelectedSchools = ref([]);
const dlgSelectedPersonIds = ref([]);
const dlgPersonSearch = ref('');

// ── Computed ──
const allPersons = computed(() => recipientGroups.value.flatMap(g => g.members));

const allRecipientEmails = computed(() => {
  const emailSet = new Set();
  for (const id of selectedPersonIds.value) {
    const person = allPersons.value.find(p => p.id === id);
    if (person?.email) emailSet.add(person.email.trim().toLowerCase());
  }
  for (const e of manualEmails.value) {
    emailSet.add(e.trim().toLowerCase());
  }
  return [...emailSet];
});

const canSend = computed(() => {
  return allRecipientEmails.value.length > 0 &&
    mailForm.fromEmail &&
    mailForm.subject.trim() &&
    smtpStatus.value !== 'unconfigured';
});

const dlgFilteredPersons = computed(() => {
  const q = dlgPersonSearch.value.toLowerCase().trim();
  if (!q) return allPersons.value;
  return allPersons.value.filter(p =>
    (p.nameCn || '').toLowerCase().includes(q) ||
    (p.nameEn || '').toLowerCase().includes(q) ||
    (p.email || '').toLowerCase().includes(q)
  );
});

// ── Methods ──

function focusEmailInput() {
  emailInputRef.value?.focus();
}

function addTypedEmail() {
  const raw = emailInput.value.replace(/,|;|，|；/g, '').trim();
  if (!raw) return;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(raw)) {
    ElMessage.warning('请输入有效的邮箱地址');
    return;
  }
  const lower = raw.toLowerCase();
  if (allRecipientEmails.value.includes(lower)) {
    emailInput.value = '';
    return;
  }
  manualEmails.value.push(lower);
  emailInput.value = '';
}

function onBackspace() {
  if (emailInput.value) return; // still has text, let default behavior
  // Remove last recipient
  if (manualEmails.value.length > 0) {
    manualEmails.value.pop();
  } else if (selectedPersonIds.value.length > 0) {
    selectedPersonIds.value.pop();
  }
}

function removeRecipient(email) {
  const manualIdx = manualEmails.value.indexOf(email);
  if (manualIdx >= 0) {
    manualEmails.value.splice(manualIdx, 1);
    return;
  }
  const person = allPersons.value.find(p => p.email?.trim().toLowerCase() === email);
  if (person) {
    const idx = selectedPersonIds.value.indexOf(person.id);
    if (idx >= 0) selectedPersonIds.value.splice(idx, 1);
  }
}

// ── Picker dialog ──

function openPickerDialog() {
  // Initialize dialog state from current selection
  dlgSelectedPersonIds.value = [...selectedPersonIds.value];
  dlgPersonSearch.value = '';
  // Sync school checkboxes
  dlgSyncSchools();
  pickerVisible.value = true;
}

function dlgOnSchoolChange() {
  const schoolSet = new Set(dlgSelectedSchools.value);
  const newIds = new Set(dlgSelectedPersonIds.value);
  for (const group of recipientGroups.value) {
    for (const m of group.members) {
      if (schoolSet.has(group.school)) {
        newIds.add(m.id);
      } else {
        newIds.delete(m.id);
      }
    }
  }
  dlgSelectedPersonIds.value = [...newIds];
}

function dlgSyncSchools() {
  const schools = [];
  for (const group of recipientGroups.value) {
    if (group.members.length > 0 && group.members.every(m => dlgSelectedPersonIds.value.includes(m.id))) {
      schools.push(group.school);
    }
  }
  dlgSelectedSchools.value = schools;
}

function dlgSelectAllSchools() {
  dlgSelectedSchools.value = recipientGroups.value.map(g => g.school);
  dlgSelectedPersonIds.value = allPersons.value.map(p => p.id);
}

function dlgDeselectAllSchools() {
  dlgSelectedSchools.value = [];
  dlgSelectedPersonIds.value = [];
}

function dlgSelectAllPersons() {
  dlgSelectedPersonIds.value = allPersons.value.map(p => p.id);
  dlgSyncSchools();
}

function dlgDeselectAllPersons() {
  dlgSelectedPersonIds.value = [];
  dlgSelectedSchools.value = [];
}

function confirmPicker() {
  selectedPersonIds.value = [...dlgSelectedPersonIds.value];
  pickerVisible.value = false;
}

// ── Sender email change handler ──
function onSenderEmailChange(email) {
  const sender = senderEmails.value.find(s => s.email === email);
  if (sender) {
    mailForm.fromName = sender.name || '';
  }
}

// ── Data loading ──

async function loadSmtpConfig() {
  try {
    const { data } = await api.get('/admin/notification/smtp-config');
    const allEmails = Array.isArray(data.senderEmails) ? data.senderEmails : [];
    // Only show active emails with valid config in the dropdown
    senderEmails.value = allEmails.filter(s => s.email && s.active !== false && s.host);
    // Check SMTP status: configured if at least one active email with SMTP
    smtpStatus.value = senderEmails.value.length > 0 ? 'configured' : 'unconfigured';
    // Auto-select the first active sender email if available
    if (senderEmails.value.length > 0 && !mailForm.fromEmail) {
      mailForm.fromEmail = senderEmails.value[0].email;
      mailForm.fromName = senderEmails.value[0].name || '';
    }
  } catch {
    smtpStatus.value = 'unconfigured';
  }
}

async function loadRecipients() {
  try {
    const { data } = await api.get('/admin/notification/recipients');
    recipientGroups.value = data;
  } catch {
    ElMessage.error('加载收件人列表失败');
  }
}

// ── Send ──

async function confirmSend() {
  if (!mailForm.subject.trim()) {
    ElMessage.warning('请输入邮件主题');
    return;
  }
  if (allRecipientEmails.value.length === 0) {
    ElMessage.warning('请选择至少一个收件人');
    return;
  }
  if (!mailForm.body.trim()) {
    ElMessage.warning('请输入邮件正文');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定发送邮件给 ${allRecipientEmails.value.length} 位收件人？`,
      '确认发送',
      { confirmButtonText: '发送', cancelButtonText: '取消', type: 'info' }
    );
    await doSend();
  } catch { /* cancelled */ }
}

async function doSend() {
  sending.value = true;
  sendResult.value = null;
  try {
    const { data } = await api.post('/admin/notification/send', {
      recipients: allRecipientEmails.value,
      subject: mailForm.subject.trim(),
      body: mailForm.body,
      fromEmail: mailForm.fromEmail || undefined,
      fromName: mailForm.fromName || undefined,
    });
    sendResult.value = data;
    if (data.failed === 0) {
      ElMessage.success(data.message);
    } else {
      ElMessage.warning(data.message);
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发送失败');
  } finally {
    sending.value = false;
  }
}

function resetForm() {
  mailForm.fromEmail = '';
  mailForm.fromName = '';
  mailForm.subject = '';
  mailForm.body = '';
  selectedPersonIds.value = [];
  manualEmails.value = [];
  emailInput.value = '';
  sendResult.value = null;
}

onMounted(() => {
  loadSmtpConfig();
  loadRecipients();
});
</script>

<style scoped>
.field-label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
}

.recipient-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 38px;
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  cursor: text;
  transition: border-color 0.2s;
}
.recipient-box:focus-within {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7);
}

.recipient-tag {
  flex-shrink: 0;
}

.recipient-input {
  flex: 1;
  min-width: 160px;
  border: none;
  outline: none;
  font-size: 0.8125rem;
  padding: 2px 0;
  background: transparent;
  color: #333;
}
.recipient-input::placeholder {
  color: #a8abb2;
}

/* ── Picker Dialog ── */
.picker-status-bar {
  padding: 8px 16px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
}

.picker-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.tab-label {
  font-size: 0.875rem;
  font-weight: 500;
}

/* ── School Grid ── */
.school-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.school-card {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.school-card:hover {
  border-color: #93c5fd;
  background: #f0f7ff;
}

.school-card--active {
  border-color: var(--el-color-primary);
  background: #eff6ff;
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7);
}

.school-checkbox {
  width: 100%;
}

.school-checkbox :deep(.el-checkbox__label) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-left: 8px;
}

.school-card-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.school-card-count {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-left: 4px;
  flex-shrink: 0;
}

/* ── Person List ── */
.person-list {
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.person-item {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.15s;
}

.person-item:last-child {
  border-bottom: none;
}

.person-item:hover {
  background: #f8fafc;
}

.person-item--active {
  background: #eff6ff;
}

.person-item--active:hover {
  background: #dbeafe;
}
</style>
