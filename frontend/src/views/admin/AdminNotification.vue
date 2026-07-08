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
    <div class="mb-4">
      <label class="field-label mb-1">邮件正文</label>
      <TinyEditor v-model="mailForm.body" :height="400" placeholder="请输入邮件正文..." />
    </div>

    <!-- ── 附件 ── -->
    <div class="mb-6">
      <label class="field-label mb-1">附件</label>
      <div class="attachment-area">
        <!-- 已选附件列表 -->
        <div v-if="attachments.length > 0" class="attachment-list">
          <div
            v-for="(file, idx) in attachments"
            :key="idx"
            class="attachment-item"
          >
            <font-awesome-icon
              :icon="getFileIcon(file.name)"
              :class="getFileIconColor(file.name)"
              class="attachment-icon"
            />
            <span class="attachment-name" :title="file.name">{{ file.name }}</span>
            <button
              class="attachment-remove"
              title="移除附件"
              @click="removeAttachment(idx)"
            >
              <font-awesome-icon icon="xmark" />
            </button>
          </div>
        </div>
        <div v-else class="text-xs text-slate-400 mb-2">
          暂无附件
        </div>
        <!-- 上传本地文件 -->
        <input
          ref="localFileInputRef"
          type="file"
          class="hidden-file-input"
          @change="onLocalFileSelected"
        />
        <el-button size="small" :loading="uploading" @click="triggerLocalFileUpload">
          <font-awesome-icon icon="upload" class="mr-1" />
          上传本地文件
        </el-button>
        <!-- 选择网络文件 -->
        <el-button size="small" @click="openAttachmentPicker" class="ml-2">
          <font-awesome-icon icon="paperclip" class="mr-1" />
          选择网络文件
        </el-button>
        <span class="text-xs text-slate-400 ml-2">
          支持 PDF、图片、Word、Excel、PPT 等常用文件
        </span>
      </div>
    </div>

    <!-- ── 发送按钮 ── -->
    <div class="flex flex-wrap gap-3">
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
      <el-button
        type="danger"
        size="large"
        :disabled="!sending"
        @click="cancelSend"
      >
        <font-awesome-icon icon="ban" class="mr-1" />
        取消发送
      </el-button>
      <el-button
        size="large"
        :loading="savingDraft"
        @click="saveDraft"
      >
        <font-awesome-icon icon="floppy-disk" class="mr-1" />
        保存邮件草稿
      </el-button>
      <el-button size="large" @click="resetForm">
        <font-awesome-icon icon="xmark" class="mr-1" />
        重置
      </el-button>
    </div>

    <!-- 草稿提示 -->
    <el-alert
      v-if="draftHint"
      type="info"
      :closable="true"
      class="mt-4"
      show-icon
      @close="draftHint = ''"
    >
      <template #title>{{ draftHint }}</template>
    </el-alert>

    <!-- 发送进度 -->
    <div v-if="sending && sendProgress" class="send-progress-box mt-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-slate-600">
          <font-awesome-icon icon="spinner" spin class="mr-1.5 text-brand-blue" />
          正在发送邮件...
        </span>
        <span class="text-sm text-slate-500">
          {{ sendProgress.success + sendProgress.failed }} / {{ sendProgress.total }}
        </span>
      </div>
      <el-progress
        :percentage="sendProgress.total > 0 ? Math.round((sendProgress.success + sendProgress.failed) / sendProgress.total * 100) : 0"
        :status="sendProgress.failed > 0 ? 'warning' : ''"
        :stroke-width="10"
      />
      <div class="flex gap-4 mt-2 text-xs text-slate-500">
        <span>
          <font-awesome-icon icon="circle-check" class="text-green-500 mr-1" />
          成功 {{ sendProgress.success }}
        </span>
        <span v-if="sendProgress.failed > 0">
          <font-awesome-icon icon="circle-xmark" class="text-red-500 mr-1" />
          失败 {{ sendProgress.failed }}
        </span>
        <span v-if="sendProgress.currentEmail" class="text-slate-400 truncate">
          当前: {{ sendProgress.currentEmail }}
        </span>
      </div>
    </div>

    <!-- 发送结果 -->
    <el-alert
      v-if="sendResult"
      :type="sendResult.type || (sendResult.failed > 0 ? 'warning' : 'success')"
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
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
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

// ── Attachments ──
const attachments = ref([]);  // [{name, url}]
const uploading = ref(false);
const localFileInputRef = ref(null);

// ── Async send job state ──
const currentJobId = ref(null);
const sendProgress = ref(null);   // { total, success, failed, currentEmail }
let pollTimer = null;

// ── Draft state ──
const savingDraft = ref(false);
const draftHint = ref('');

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

// ── Attachment helpers ──

/** Map file extension to Font Awesome icon name */
function getFileIcon(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const iconMap = {
    pdf: 'file-pdf',
    doc: 'file-word',
    docx: 'file-word',
    xls: 'file-excel',
    xlsx: 'file-excel',
    ppt: 'file-powerpoint',
    pptx: 'file-powerpoint',
    jpg: 'file-image',
    jpeg: 'file-image',
    png: 'file-image',
    gif: 'file-image',
    bmp: 'file-image',
    webp: 'file-image',
    svg: 'file-image',
    zip: 'file-zipper',
    rar: 'file-zipper',
    '7z': 'file-zipper',
    gz: 'file-zipper',
    tar: 'file-zipper',
    txt: 'file-lines',
    csv: 'file-csv',
    mp3: 'file-audio',
    wav: 'file-audio',
    mp4: 'file-video',
    avi: 'file-video',
    mov: 'file-video',
    mkv: 'file-video',
  };
  return iconMap[ext] || 'file';
}

/** Map file extension to color class */
function getFileIconColor(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const colorMap = {
    pdf: 'text-red-500',
    doc: 'text-blue-600',
    docx: 'text-blue-600',
    xls: 'text-green-600',
    xlsx: 'text-green-600',
    ppt: 'text-orange-500',
    pptx: 'text-orange-500',
    jpg: 'text-purple-500',
    jpeg: 'text-purple-500',
    png: 'text-purple-500',
    gif: 'text-purple-500',
    bmp: 'text-purple-500',
    webp: 'text-purple-500',
    svg: 'text-purple-500',
    zip: 'text-yellow-600',
    rar: 'text-yellow-600',
    '7z': 'text-yellow-600',
    txt: 'text-slate-500',
    csv: 'text-green-500',
  };
  return colorMap[ext] || 'text-slate-400';
}

/** Remove attachment by index */
function removeAttachment(idx) {
  attachments.value.splice(idx, 1);
}

/** Trigger hidden file input for local upload */
function triggerLocalFileUpload() {
  localFileInputRef.value?.click();
}

/** Handle local file selection and upload */
async function onLocalFileSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  // Reset input so the same file can be re-selected
  e.target.value = '';

  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/admin/notification/upload-attachment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Check for duplicates
    const already = attachments.value.some(a => a.url === data.url);
    if (!already) {
      attachments.value.push({ name: data.name, url: data.url });
      ElMessage.success(`文件 "${data.name}" 上传成功`);
    } else {
      ElMessage.info('该文件已在附件列表中');
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '文件上传失败');
  } finally {
    uploading.value = false;
  }
}

/** Open elFinder to pick an attachment file */
function openAttachmentPicker() {
  const callbackId = 'attach_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const token = localStorage.getItem('token') || '';

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:100000;display:flex;align-items:center;justify-content:center;';

  // Create dialog container
  const dialog = document.createElement('div');
  dialog.style.cssText = 'background:#fff;border-radius:8px;width:80vw;height:80vh;max-width:1200px;max-height:900px;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.3);';

  // Header bar
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;border-radius:8px 8px 0 0;flex-shrink:0;';
  const title = document.createElement('strong');
  title.textContent = '选择附件文件';
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

  dialog.appendChild(header);
  dialog.appendChild(iframe);
  overlay.appendChild(dialog);
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
      const fileUrl = e.data.url;
      // Extract filename from URL
      const fileName = decodeURIComponent(fileUrl.split('/').pop());
      // Check for duplicates
      const already = attachments.value.some(a => a.url === fileUrl);
      if (!already) {
        attachments.value.push({ name: fileName, url: fileUrl });
      } else {
        ElMessage.info('该文件已在附件列表中');
      }
      cleanup();
    }
  };
  window.addEventListener('message', handler);
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
  sendProgress.value = null;
  currentJobId.value = null;
  try {
    const { data } = await api.post('/admin/notification/send', {
      recipients: allRecipientEmails.value,
      subject: mailForm.subject.trim(),
      body: mailForm.body,
      fromEmail: mailForm.fromEmail || undefined,
      fromName: mailForm.fromName || undefined,
      attachments: attachments.value.length > 0 ? attachments.value : undefined,
    });

    if (!data.jobId) {
      // Fallback: server returned old-style synchronous response
      sendResult.value = data;
      sending.value = false;
      if (data.failed === 0) {
        ElMessage.success(data.message);
        deleteDraft();  // auto-delete draft on success
      } else {
        ElMessage.warning(data.message);
      }
      return;
    }

    // Async job started — begin polling
    currentJobId.value = data.jobId;
    sendProgress.value = { total: data.total, success: 0, failed: 0, currentEmail: '' };
    startPolling(data.jobId);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发送失败');
    sending.value = false;
  }
}

// ── Polling progress ──

function startPolling(jobId) {
  stopPolling();
  pollTimer = setInterval(async () => {
    try {
      const { data } = await api.get(`/admin/notification/send-progress/${jobId}`);
      sendProgress.value = {
        total: data.total,
        success: data.success,
        failed: data.failed,
        currentEmail: data.currentEmail || '',
      };
      if (data.status === 'completed' || data.status === 'cancelled') {
        stopPolling();
        sending.value = false;
        currentJobId.value = null;
        sendProgress.value = null;
        sendResult.value = {
          message: data.message,
          success: data.success,
          failed: data.failed,
          errors: data.errors,
          type: data.status === 'cancelled' ? 'warning' : (data.failed > 0 ? 'warning' : 'success'),
        };
        if (data.status === 'completed' && data.failed === 0) {
          ElMessage.success(data.message);
          deleteDraft();  // auto-delete draft on full success
        } else if (data.status === 'cancelled') {
          ElMessage.warning(data.message);
        } else {
          ElMessage.warning(data.message);
        }
      }
    } catch {
      // Network error during polling — stop and show error
      stopPolling();
      sending.value = false;
      currentJobId.value = null;
      sendProgress.value = null;
      ElMessage.error('获取发送进度失败，请刷新页面查看结果');
    }
  }, 1000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// ── Cancel send ──

async function cancelSend() {
  if (!currentJobId.value) return;
  try {
    await ElMessageBox.confirm(
      '确定要取消发送？已发送的邮件不会被撤回。',
      '取消发送',
      { confirmButtonText: '确定取消', cancelButtonText: '继续发送', type: 'warning' }
    );
    await api.post(`/admin/notification/send-cancel/${currentJobId.value}`);
    ElMessage.info('正在取消发送...');
  } catch { /* user cancelled the cancel dialog */ }
}

// ── Draft ──

async function saveDraft() {
  savingDraft.value = true;
  try {
    await api.put('/admin/notification/draft', {
      fromEmail: mailForm.fromEmail,
      fromName: mailForm.fromName,
      subject: mailForm.subject,
      body: mailForm.body,
      selectedPersonIds: selectedPersonIds.value,
      manualEmails: manualEmails.value,
      attachments: attachments.value,
    });
    ElMessage.success('草稿已保存');
    draftHint.value = '';
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存草稿失败');
  } finally {
    savingDraft.value = false;
  }
}

async function loadDraft() {
  try {
    const { data } = await api.get('/admin/notification/draft');
    if (data.draft) {
      const d = data.draft;
      if (d.fromEmail) mailForm.fromEmail = d.fromEmail;
      if (d.fromName) mailForm.fromName = d.fromName;
      if (d.subject) mailForm.subject = d.subject;
      if (d.body) mailForm.body = d.body;
      if (Array.isArray(d.selectedPersonIds) && d.selectedPersonIds.length > 0) {
        selectedPersonIds.value = d.selectedPersonIds;
      }
      if (Array.isArray(d.manualEmails) && d.manualEmails.length > 0) {
        manualEmails.value = d.manualEmails;
      }
      if (Array.isArray(d.attachments) && d.attachments.length > 0) {
        attachments.value = d.attachments;
      }
      // Show hint with saved time
      const savedTime = d.savedAt ? new Date(d.savedAt).toLocaleString('zh-CN') : '';
      draftHint.value = `已恢复草稿${savedTime ? '（保存于 ' + savedTime + '）' : ''}`;
    }
  } catch {
    // silently ignore draft load failure
  }
}

async function deleteDraft() {
  try {
    await api.delete('/admin/notification/draft');
  } catch {
    // silently ignore
  }
  draftHint.value = '';
}

function resetForm() {
  mailForm.fromEmail = '';
  mailForm.fromName = '';
  mailForm.subject = '';
  mailForm.body = '';
  selectedPersonIds.value = [];
  manualEmails.value = [];
  emailInput.value = '';
  attachments.value = [];
  sendResult.value = null;
  sendProgress.value = null;
  draftHint.value = '';
  // Also delete draft from server
  deleteDraft();
  // Re-select default sender email
  if (senderEmails.value.length > 0) {
    mailForm.fromEmail = senderEmails.value[0].email;
    mailForm.fromName = senderEmails.value[0].name || '';
  }
}

onMounted(async () => {
  await Promise.all([loadSmtpConfig(), loadRecipients()]);
  // Load draft after recipients are available (so selectedPersonIds can be restored)
  await loadDraft();
});

onBeforeUnmount(() => {
  stopPolling();
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

/* ── Attachment Area ── */
.attachment-area {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.attachment-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.attachment-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.attachment-name {
  flex: 1;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-remove {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.15s;
}

.attachment-remove:hover {
  background: #fee2e2;
  color: #ef4444;
}

/* ── Send Progress Box ── */
.send-progress-box {
  padding: 16px 20px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

/* Hidden file input */
.hidden-file-input {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>
