<template>
  <div>
    <!-- ── 网站LOGO ── -->
    <el-divider content-position="left"><b>网站LOGO</b></el-divider>
    <p class="text-xs text-slate-400 mb-3">
      上传自定义LOGO，将替换页头和页尾的默认LOGO。建议使用透明背景的 PNG/GIF 图片。
    </p>
    <div class="flex items-center gap-4">
      <div class="relative group">
        <div class="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
          <img v-if="logoUrl" :src="logoUrl" alt="LOGO" class="max-w-full max-h-full object-contain" />
          <font-awesome-icon v-else icon="image" class="text-2xl text-slate-300" />
        </div>
      </div>
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <label class="btn-upload cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-brand-blue text-white hover:bg-blue-600 transition">
            <font-awesome-icon icon="upload" />
            {{ logoUrl ? '更换LOGO' : '上传LOGO' }}
            <input type="file" accept="image/*" class="hidden" @change="handleLogoUpload" />
          </label>
          <el-button v-if="logoUrl" size="small" type="danger" plain @click="removeLogo">
            <font-awesome-icon :icon="['far', 'trash-can']" class="mr-1" /> 删除
          </el-button>
        </div>
        <p class="text-xs text-slate-400">支持 PNG / GIF / JPG，不超过 5MB</p>
      </div>
    </div>

    <!-- ── 导航链接维护 ── -->
    <el-divider content-position="left" class="mt-6"><b>导航链接维护</b></el-divider>
    <p class="text-xs text-slate-400 mb-3">
      管理页头和页尾的导航链接。拖动 <span class="font-mono text-slate-500">≡</span> 调整顺序，开关控制显示位置。
    </p>

    <div ref="navListRef" class="space-y-2">
      <div
        v-for="(link, idx) in navLinks"
        :key="idx"
        class="nav-link-card rounded-lg bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden flex"
      >
        <!-- ▸ 左列：拖拽条 -->
        <div class="drag-handle flex-shrink-0 w-7 flex flex-col items-center justify-center cursor-move bg-slate-100 hover:bg-blue-50 border-r border-slate-200 transition-colors" title="拖动排序">
          <font-awesome-icon icon="grip-vertical" class="text-slate-400 text-xs" />
        </div>

        <!-- ▸ 中列：内容 -->
        <div class="flex-1 min-w-0 py-2.5 px-3 space-y-1.5">
          <!-- 行1：标题 + 链接 + 开关 -->
          <div class="flex items-center gap-2 flex-wrap">
            <div class="flex items-center gap-1 flex-1 min-w-[120px]">
              <label class="field-label-inline">标题</label>
              <input v-model="link.label" class="form-input-compact flex-1" placeholder="导航名称" />
            </div>
            <div class="flex items-center gap-1 flex-1 min-w-[120px]">
              <label class="field-label-inline">链接</label>
              <input v-model="link.to" class="form-input-compact flex-1" placeholder="/schedule" />
            </div>
            <div class="flex items-center gap-3 flex-shrink-0 ml-1">
              <label class="checkbox-label" :class="link.showInNav ? 'text-blue-600' : 'text-slate-400'">
                <input type="checkbox" v-model="link.showInNav" class="accent-blue-500" />
                显示到页头
              </label>
              <label class="checkbox-label" :class="link.showInFooter ? 'text-blue-600' : 'text-slate-400'">
                <input type="checkbox" v-model="link.showInFooter" class="accent-blue-500" />
                显示到页尾
              </label>
            </div>
          </div>

          <!-- 行2：Hero 标题 + Hero 副标题 -->
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1 flex-1 min-w-0">
              <label class="field-label-inline text-slate-400">Hero 标题</label>
              <input v-model="link.heroTitle" class="form-input-compact form-input-secondary flex-1" placeholder="留空则用导航名称" />
            </div>
            <div class="flex items-center gap-1 flex-1 min-w-0">
              <label class="field-label-inline text-slate-400">Hero 副标题</label>
              <input v-model="link.heroSubtitle" class="form-input-compact form-input-secondary flex-1" placeholder="可选" />
            </div>
          </div>

          <!-- 行3：说明 -->
          <div class="flex items-center gap-1">
            <label class="field-label-inline text-slate-400">说明</label>
            <input v-model="link.description" class="form-input-compact form-input-secondary flex-1" placeholder="页面说明文字（可选）" />
          </div>
        </div>

        <!-- ▸ 右列：删除 -->
        <div class="flex-shrink-0 w-10 flex items-center justify-center border-l border-slate-100 bg-slate-50/50 hover:bg-red-50 transition-colors">
          <button class="p-2 text-slate-300 hover:text-red-500 transition" title="删除此链接" @click="confirmRemoveLink(idx)">
            <font-awesome-icon :icon="['far', 'trash-can']" />
          </button>
        </div>
      </div>
    </div>

    <div class="mt-3">
      <el-button size="small" @click="addLink">
        <font-awesome-icon icon="plus" class="mr-1" /> 添加链接
      </el-button>
    </div>

    <!-- ── 页尾设置 ── -->
    <el-divider content-position="left" class="mt-6"><b>页尾设置</b></el-divider>
    <p class="text-xs text-slate-400 mb-2">控制页尾区域的显示内容。</p>

    <!-- 品牌区域卡片 -->
    <div class="rounded-lg bg-white ring-1 ring-slate-200 overflow-hidden">
      <div class="px-3 py-1.5 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-100">品牌区域</div>
      <div class="footer-row">
        <span class="footer-row-label">显示LOGO</span>
        <span class="footer-row-desc">页尾左上角显示网站LOGO</span>
        <el-switch v-model="footerSettings.showLogo" size="small" class="flex-shrink-0" />
        <span class="w-6 flex-shrink-0"></span>
      </div>
      <div class="footer-row">
        <span class="footer-row-label">显示网站名称</span>
        <span class="footer-row-desc">页尾左上角显示会议名称及标语</span>
        <el-switch v-model="footerSettings.showSiteName" size="small" class="flex-shrink-0" />
        <span class="w-6 flex-shrink-0"></span>
      </div>
      <div class="footer-row border-b-0">
        <span class="footer-row-label">显示会议主题</span>
        <span class="footer-row-desc">在网站名称下方显示会议主题（来自会议信息）</span>
        <el-switch v-model="footerSettings.showMeetingName" size="small" class="flex-shrink-0" />
        <span class="w-6 flex-shrink-0"></span>
      </div>
    </div>

    <!-- 联系区域卡片 -->
    <div class="rounded-lg bg-white ring-1 ring-slate-200 overflow-hidden mt-3">
      <div class="px-3 py-1.5 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-100">「联系」区域</div>
      <div class="footer-row">
        <input v-model="footerSettings.meetingTimeLabel" class="form-input-compact w-28 text-center flex-shrink-0" placeholder="标签" />
        <span class="footer-row-desc">显示会议日期范围</span>
        <el-switch v-model="footerSettings.showMeetingTime" size="small" class="flex-shrink-0" />
        <span class="w-6 flex-shrink-0"></span>
      </div>
      <div class="footer-row">
        <input v-model="footerSettings.meetingLocationLabel" class="form-input-compact w-28 text-center flex-shrink-0" placeholder="标签" />
        <span class="footer-row-desc">显示会议地点信息</span>
        <el-switch v-model="footerSettings.showMeetingLocation" size="small" class="flex-shrink-0" />
        <span class="w-6 flex-shrink-0"></span>
      </div>
      <div class="footer-row">
        <input v-model="footerSettings.organizerLabel" class="form-input-compact w-28 text-center flex-shrink-0" placeholder="标签" />
        <span class="footer-row-desc">显示主办方信息</span>
        <el-switch v-model="footerSettings.showOrganizer" size="small" class="flex-shrink-0" />
        <span class="w-6 flex-shrink-0"></span>
      </div>
      <!-- 自定义字段 -->
      <div
        v-for="(field, idx) in footerSettings.customFields"
        :key="'cf-' + idx"
        class="footer-row"
      >
        <input v-model="field.label" class="form-input-compact w-28 text-center flex-shrink-0" placeholder="字段名" />
        <input v-model="field.value" class="form-input-compact flex-1" placeholder="字段值" />
        <el-switch v-model="field.visible" size="small" class="flex-shrink-0" />
        <button class="w-6 flex-shrink-0 p-0 flex items-center justify-center text-slate-300 hover:text-red-500 transition" title="删除" @click="removeCustomField(idx)">
          <font-awesome-icon :icon="['far', 'trash-can']" class="text-xs" />
        </button>
      </div>
      <div class="px-3 py-2 border-t border-slate-100">
        <el-button size="small" @click="addCustomField">
          <font-awesome-icon icon="plus" class="mr-1" /> 添加字段
        </el-button>
      </div>
    </div>

    <!-- ── 上传限制 ── -->
    <el-divider content-position="left" class="mt-6"><b>上传限制（MB）</b></el-divider>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label class="text-sm text-slate-600 font-medium">图片上限 (MB)</label>
        <el-input-number v-model="form['upload.maxImageMB']" :min="1" :max="500" class="w-full" />
      </div>
      <div>
        <label class="text-sm text-slate-600 font-medium">视频上限 (MB)</label>
        <el-input-number v-model="form['upload.maxVideoMB']" :min="1" :max="2000" class="w-full" />
      </div>
      <div>
        <label class="text-sm text-slate-600 font-medium">演讲资料上限 (MB)</label>
        <el-input-number v-model="form['upload.maxResourceMB']" :min="1" :max="2000" class="w-full" />
      </div>
    </div>

    <el-divider content-position="left" class="mt-6"><b>情感分析引擎</b></el-divider>
    <div class="space-y-4">
      <div>
        <label class="text-sm text-slate-600 font-medium">引擎</label>
        <el-select v-model="form['analytics.sentimentEngine']" class="w-full">
          <el-option label="本地词典（默认，免费）" value="local" />
          <el-option label="OpenAI" value="openai" />
          <el-option label="DeepSeek" value="deepseek" />
        </el-select>
      </div>
      <div v-if="form['analytics.sentimentEngine'] !== 'local'">
        <label class="text-sm text-slate-600 font-medium">API Base URL（可选）</label>
        <input v-model="form['analytics.llmBaseUrl']" class="form-input" placeholder="https://api.openai.com/v1 或 https://api.deepseek.com/v1" />
      </div>
      <div v-if="form['analytics.sentimentEngine'] !== 'local'">
        <label class="text-sm text-slate-600 font-medium">模型名称</label>
        <input v-model="form['analytics.llmModel']" class="form-input" placeholder="gpt-4o-mini / deepseek-chat" />
      </div>
      <div v-if="form['analytics.sentimentEngine'] !== 'local'">
        <label class="text-sm text-slate-600 font-medium">API Key</label>
        <el-input v-model="form['analytics.llmApiKey']" type="password" show-password placeholder="sk-..." />
        <p class="text-xs text-slate-400 mt-1">仅用于服务器端调用，不会暴露给前端。</p>
      </div>
    </div>

    <!-- ── 邮件服务 (SMTP) ── -->
    <el-divider content-position="left" class="mt-6"><b>邮件服务 (SMTP)</b></el-divider>
    <p class="text-xs text-slate-400 mb-3">
      配置发件邮箱及 SMTP 服务器，用于「发送通知」功能向参会人员发送邮件。发送通知时从下拉列表中选择。
    </p>

    <!-- ── 邮箱列表表格 ── -->
    <div class="rounded-lg ring-1 ring-slate-200 overflow-hidden bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-slate-50 text-slate-500 text-xs">
            <th class="text-left px-4 py-2 font-semibold">发件邮箱</th>
            <th class="text-center px-4 py-2 font-semibold w-20">Active</th>
            <th class="text-center px-4 py-2 font-semibold w-40">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(sender, idx) in senderEmails"
            :key="idx"
            class="border-t border-slate-100 hover:bg-slate-50/50 transition"
          >
            <td class="px-4 py-2.5">
              <div class="font-medium text-slate-700">{{ sender.email || '(未填写)' }}</div>
              <div v-if="sender.name" class="text-xs text-slate-400">{{ sender.name }}</div>
            </td>
            <td class="px-4 py-2.5 text-center">
              <el-switch v-model="sender.active" size="small" @change="saveSenderEmails" />
            </td>
            <td class="px-4 py-2.5 text-center">
              <div class="inline-flex items-center gap-2">
                <el-button size="small" link type="primary" @click="openSmtpDialog(idx)">
                  <font-awesome-icon icon="pen-to-square" class="mr-1" />修改配置
                </el-button>
                <el-button size="small" link type="danger" @click="confirmRemoveSender(idx)">
                  <font-awesome-icon :icon="['far', 'trash-can']" class="mr-1" />删除
                </el-button>
              </div>
            </td>
          </tr>
          <tr v-if="senderEmails.length === 0">
            <td colspan="3" class="px-4 py-6 text-center text-slate-400 text-xs">
              <font-awesome-icon icon="inbox" class="text-xl mb-1 block" />
              尚未配置发件邮箱，请点击下方按钮添加。
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-3 flex items-center gap-3">
      <el-button size="small" @click="openSmtpDialog(-1)">
        <font-awesome-icon icon="plus" class="mr-1" /> 添加邮箱
      </el-button>
    </div>

    <!-- ── 配置弹窗 ── -->
    <el-dialog
      v-model="smtpDlgVisible"
      :title="smtpDlgIdx < 0 ? '添加发件邮箱' : '修改邮箱配置'"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-sm text-slate-600 font-medium">发件邮箱 <span class="text-red-500">*</span></label>
            <input v-model="smtpDlgForm.email" class="form-input" placeholder="noreply@example.com" />
          </div>
          <div>
            <label class="text-sm text-slate-600 font-medium">发件人名称</label>
            <input v-model="smtpDlgForm.name" class="form-input" placeholder="IT Meeting" />
          </div>
        </div>
        <el-divider class="!my-2" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-sm text-slate-600 font-medium">SMTP 服务器 <span class="text-red-500">*</span></label>
            <input v-model="smtpDlgForm.host" class="form-input" placeholder="smtp.example.com" />
          </div>
          <div>
            <label class="text-sm text-slate-600 font-medium">端口</label>
            <el-input-number v-model="smtpDlgForm.port" :min="1" :max="65535" class="w-full" />
          </div>
        </div>
        <div>
          <label class="text-sm text-slate-600 font-medium">加密方式</label>
          <el-select v-model="smtpDlgForm.secure" class="w-full">
            <el-option label="STARTTLS（端口 587，推荐）" value="tls" />
            <el-option label="SSL/TLS（端口 465）" value="ssl" />
            <el-option label="无加密" value="none" />
          </el-select>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-sm text-slate-600 font-medium">SMTP 用户名</label>
            <input v-model="smtpDlgForm.user" class="form-input" placeholder="your-email@example.com" />
          </div>
          <div>
            <label class="text-sm text-slate-600 font-medium">SMTP 密码</label>
            <el-input v-model="smtpDlgForm.pass" type="password" show-password placeholder="SMTP 密码或授权码" />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-slate-600 font-medium">启用</label>
          <el-switch v-model="smtpDlgForm.active" />
        </div>
        <!-- 测试按钮 -->
        <div class="flex items-center gap-3 pt-1">
          <el-button size="small" :loading="smtpTesting" @click="testSmtpInDialog">
            <font-awesome-icon icon="paper-plane" class="mr-1" /> 发送测试邮件
          </el-button>
          <span v-if="smtpTestResult" :class="smtpTestResult.ok ? 'text-green-600' : 'text-red-500'" class="text-xs">
            {{ smtpTestResult.message }}
          </span>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="smtpDlgVisible = false">取消</el-button>
          <el-button type="primary" @click="saveSmtpDialog">保存</el-button>
        </div>
      </template>
    </el-dialog>

    <div class="pt-6 flex gap-3">
      <el-button type="primary" :loading="saving" @click="save">保存所有设置</el-button>
      <el-button @click="load">重新加载</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import Sortable from 'sortablejs';
import api from '../../api';

// ── General settings ──
const saving = ref(false);

const form = reactive({
  'upload.maxImageMB': 10,
  'upload.maxVideoMB': 100,
  'upload.maxResourceMB': 100,
  'analytics.sentimentEngine': 'local',
  'analytics.llmBaseUrl': '',
  'analytics.llmModel': '',
  'analytics.llmApiKey': '',
});

// ── Sender emails (SMTP) ──
const senderEmails = ref([]);  // [{email, name, host, port, secure, user, pass, active}]
const smtpTesting = ref(false);
const smtpTestResult = ref(null);

// Dialog state
const smtpDlgVisible = ref(false);
const smtpDlgIdx = ref(-1); // -1 = add new
const smtpDlgForm = reactive({
  email: '', name: '', host: '', port: 587, secure: 'tls', user: '', pass: '', active: true,
});

// ── Page access whitelist ──
// NOTE: 页面访问白名单已迁移到独立的「权限设置」（AdminPermissions.vue），
// 由其统一管理 auth.whitelist。本组件不再读写该配置。

// ── Site Logo ──
const logoUrl = ref('');
const logoUploading = ref(false);


async function handleLogoUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('文件不能超过 5MB');
    return;
  }
  logoUploading.value = true;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/admin/settings/site-logo', fd);
    logoUrl.value = data.logoUrl;
    ElMessage.success('LOGO 已上传');
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '上传失败');
  } finally {
    logoUploading.value = false;
    e.target.value = '';
  }
}

async function removeLogo() {
  try {
    await ElMessageBox.confirm('确定删除自定义LOGO？将恢复为默认LOGO。', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await api.delete('/admin/settings/site-logo');
    logoUrl.value = '';
    ElMessage.success('LOGO 已删除');
  } catch {
    // cancelled
  }
}

// ── Footer settings ──
const footerSettings = reactive({
  showLogo: true,
  showSiteName: true,
  showMeetingName: false,
  showMeetingTime: true,
  showMeetingLocation: true,
  showOrganizer: true,
  meetingTimeLabel: '会议时间',
  meetingLocationLabel: '会议地点',
  organizerLabel: '主办方',
  customFields: [],
});

function addCustomField() {
  footerSettings.customFields.push({ label: '', value: '', visible: true });
}

function removeCustomField(idx) {
  footerSettings.customFields.splice(idx, 1);
}

// ── Nav links ──
const defaultNavLinks = [
  { label: '首页',     to: '/',               showInNav: true,  showInFooter: false, heroTitle: '',                  heroSubtitle: '', description: '' },
  { label: '日程安排', to: '/schedule',        showInNav: true,  showInFooter: true,  heroTitle: '日程安排',           heroSubtitle: '', description: '' },
  { label: '会议地点', to: '/venue',           showInNav: true,  showInFooter: false, heroTitle: '',                  heroSubtitle: '', description: '' },
  { label: '参会须知', to: '/meeting-guide',   showInNav: true,  showInFooter: false, heroTitle: 'Meeting Guide',     heroSubtitle: '参会前请仔细阅读以下信息，做好出行准备', description: '' },
  { label: '参会人员', to: '/attendees',       showInNav: true,  showInFooter: true,  heroTitle: 'Meet the Team',     heroSubtitle: '', description: '' },
  { label: '会后反思', to: '/reflections',     showInNav: true,  showInFooter: true,  heroTitle: '会后反思',           heroSubtitle: '记录你的收获、想法与建议', description: '' },
  { label: '会议剪影', to: '/gallery',         showInNav: true,  showInFooter: true,  heroTitle: 'Gallery',           heroSubtitle: '照片 · 视频 · 第三方链接', description: '' },
  { label: '往届会议', to: '/past-meetings',   showInNav: false, showInFooter: true,  heroTitle: 'Past Meetings',     heroSubtitle: '回顾每一届 YCYW Global IT Meeting', description: '' },
  { label: '入校指引', to: '/entry-guide',     showInNav: false, showInFooter: false, heroTitle: 'Campus Entry Guide', heroSubtitle: '参会访客入校申请填写指引，请使用微信扫描右侧二维码完成申请', description: '' },
];

const navLinks = ref([]);
const navListRef = ref(null);
let sortableInstance = null;

function addLink() {
  navLinks.value.push({ label: '', to: '/', showInNav: true, showInFooter: false, heroTitle: '', heroSubtitle: '', description: '' });
  nextTick(() => initSortable());
}

function removeLink(idx) {
  navLinks.value.splice(idx, 1);
  nextTick(() => initSortable());
}

async function confirmRemoveLink(idx) {
  const name = navLinks.value[idx]?.label || '此链接';
  try {
    await ElMessageBox.confirm(`确定删除「${name}」？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    removeLink(idx);
  } catch {
    // cancelled
  }
}

// ── Sortable drag-and-drop ──
function initSortable() {
  if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
  const el = navListRef.value;
  if (!el) return;
  sortableInstance = Sortable.create(el, {
    handle: '.drag-handle',
    animation: 180,
    ghostClass: 'sortable-ghost',
    onEnd: ({ oldIndex, newIndex }) => {
      if (oldIndex === newIndex) return;
      const list = [...navLinks.value];
      const [moved] = list.splice(oldIndex, 1);
      list.splice(newIndex, 0, moved);
      navLinks.value = list;
    },
  });
}

// ── Sender emails management ──

async function loadSenderEmails() {
  try {
    const { data } = await api.get('/admin/notification/smtp-config');
    senderEmails.value = Array.isArray(data.senderEmails) ? data.senderEmails : [];
  } catch {
    senderEmails.value = [];
  }
}

async function saveSenderEmails() {
  try {
    await api.put('/admin/notification/smtp-config', {
      senderEmails: senderEmails.value,
    });
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存邮箱配置失败');
  }
}

function openSmtpDialog(idx) {
  smtpDlgIdx.value = idx;
  smtpTestResult.value = null;
  if (idx >= 0 && senderEmails.value[idx]) {
    const s = senderEmails.value[idx];
    Object.assign(smtpDlgForm, {
      email: s.email || '', name: s.name || '',
      host: s.host || '', port: Number(s.port) || 587, secure: s.secure || 'tls',
      user: s.user || '', pass: s.pass || '', active: s.active !== false,
    });
  } else {
    Object.assign(smtpDlgForm, {
      email: '', name: '', host: '', port: 587, secure: 'tls', user: '', pass: '', active: true,
    });
  }
  smtpDlgVisible.value = true;
}

async function saveSmtpDialog() {
  if (!smtpDlgForm.email || !smtpDlgForm.email.trim()) {
    ElMessage.warning('请填写发件邮箱');
    return;
  }
  if (!smtpDlgForm.host || !smtpDlgForm.host.trim()) {
    ElMessage.warning('请填写 SMTP 服务器');
    return;
  }
  const entry = { ...smtpDlgForm, port: Number(smtpDlgForm.port) || 587 };
  if (smtpDlgIdx.value >= 0) {
    senderEmails.value[smtpDlgIdx.value] = entry;
  } else {
    senderEmails.value.push(entry);
  }
  await saveSenderEmails();
  smtpDlgVisible.value = false;
  ElMessage.success('邮箱配置已保存');
  // Reload to get masked passwords
  await loadSenderEmails();
}

async function confirmRemoveSender(idx) {
  const email = senderEmails.value[idx]?.email || '此邮箱';
  try {
    await ElMessageBox.confirm(`确定删除「${email}」的邮箱配置？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    senderEmails.value.splice(idx, 1);
    await saveSenderEmails();
    ElMessage.success('已删除');
  } catch {
    // cancelled
  }
}

async function testSmtpInDialog() {
  smtpTesting.value = true;
  smtpTestResult.value = null;
  try {
    // First save dialog data so backend has latest config
    if (!smtpDlgForm.email || !smtpDlgForm.host) {
      smtpTestResult.value = { ok: false, message: '请先填写发件邮箱和 SMTP 服务器' };
      return;
    }
    // Save current dialog entry temporarily
    const entry = { ...smtpDlgForm, port: Number(smtpDlgForm.port) || 587 };
    const tempList = [...senderEmails.value];
    if (smtpDlgIdx.value >= 0) {
      tempList[smtpDlgIdx.value] = entry;
    } else {
      tempList.push(entry);
    }
    await api.put('/admin/notification/smtp-config', { senderEmails: tempList });

    const testEmail = smtpDlgForm.user || smtpDlgForm.email;
    const { data } = await api.post('/admin/notification/test-smtp', {
      senderEmail: smtpDlgForm.email,
      testEmail,
    });
    smtpTestResult.value = { ok: true, message: data.message || '测试邮件已发送' };
  } catch (e) {
    smtpTestResult.value = { ok: false, message: e.response?.data?.message || '测试失败' };
  } finally {
    smtpTesting.value = false;
  }
}

async function load() {
  const { data } = await api.get('/admin/settings');
  const list = Array.isArray(data) ? data : (data?.list || []);
  for (const it of list) {
    if (it.key === 'nav.links') {
      try {
        const parsed = JSON.parse(it.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          navLinks.value = parsed.map(l => ({ description: '', ...l }));
        } else {
          navLinks.value = JSON.parse(JSON.stringify(defaultNavLinks));
        }
      } catch {
        navLinks.value = JSON.parse(JSON.stringify(defaultNavLinks));
      }
    } else if (it.key === 'site.logoUrl') {
      logoUrl.value = it.value || '';
    } else if (it.key === 'footer.settings') {

      try {
        const parsed = JSON.parse(it.value);
        if (parsed && typeof parsed === 'object') {
          footerSettings.showLogo = parsed.showLogo !== false;
          footerSettings.showSiteName = parsed.showSiteName !== false;
          footerSettings.showMeetingName = !!parsed.showMeetingName;
          footerSettings.showMeetingTime = parsed.showMeetingTime !== false;
          footerSettings.showMeetingLocation = parsed.showMeetingLocation !== false;
          footerSettings.showOrganizer = parsed.showOrganizer !== false;
          footerSettings.meetingTimeLabel = parsed.meetingTimeLabel || '会议时间';
          footerSettings.meetingLocationLabel = parsed.meetingLocationLabel || '会议地点';
          footerSettings.organizerLabel = parsed.organizerLabel || '主办方';
          footerSettings.customFields = Array.isArray(parsed.customFields) ? parsed.customFields : [];
        }
      } catch {
        // keep defaults
      }
    } else if (it.key in form) {
      if (typeof form[it.key] === 'number') form[it.key] = Number(it.value) || 0;
      else form[it.key] = it.value || '';
    }
  }
  if (navLinks.value.length === 0) {
    navLinks.value = JSON.parse(JSON.stringify(defaultNavLinks));
  }
  await nextTick();
  initSortable();
}

async function save() {
  saving.value = true;
  try {
    const items = Object.entries(form).map(([key, value]) => ({ key, value }));
    items.push({
      key: 'nav.links',
      value: JSON.stringify(navLinks.value),
      category: 'nav',
    });
    items.push({
      key: 'footer.settings',
      value: JSON.stringify({
        showLogo: footerSettings.showLogo,
        showSiteName: footerSettings.showSiteName,
        showMeetingName: footerSettings.showMeetingName,
        showMeetingTime: footerSettings.showMeetingTime,
        showMeetingLocation: footerSettings.showMeetingLocation,
        showOrganizer: footerSettings.showOrganizer,
        meetingTimeLabel: footerSettings.meetingTimeLabel || '会议时间',
        meetingLocationLabel: footerSettings.meetingLocationLabel || '会议地点',
        organizerLabel: footerSettings.organizerLabel || '主办方',
        customFields: footerSettings.customFields.filter(f => f.label || f.value),
      }),
      category: 'footer',
    });
    await api.put('/admin/settings', { items });
    // SMTP sender emails are saved independently via their own API
    ElMessage.success('已保存');

  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally { saving.value = false; }
}

onMounted(() => {
  load();
  loadSenderEmails();
});
</script>

<style scoped>
/* ── Inline field label (same line as input) ── */
.field-label-inline {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Block field label (for other sections) ── */
.field-label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
}

/* ── Full form input (for other sections) ── */
.form-input {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  outline: none;
  transition: border-color 0.15s;
  background: #fff;
}
.form-input:focus {
  border-color: var(--brand-blue);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

/* ── Compact input (nav link cards) ── */
.form-input-compact {
  border-radius: 0.375rem;
  border: 1px solid #e2e8f0;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  outline: none;
  transition: border-color 0.15s;
  background: #fff;
  min-width: 0;
}
.form-input-compact:focus {
  border-color: var(--brand-blue);
  box-shadow: 0 0 0 1.5px rgba(59, 130, 246, 0.1);
}

/* ── Secondary style (lighter border for Hero/description rows) ── */
.form-input-secondary {
  border-color: #f1f5f9;
  background: #fafbfc;
}
.form-input-secondary:focus {
  border-color: var(--brand-blue);
  background: #fff;
}

/* ── Checkbox + label combo ── */
.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}

/* ── Sortable ghost highlight ── */
.sortable-ghost {
  opacity: 0.4;
  background: #dbeafe !important;
  border-radius: 0.5rem;
}

/* ── Card hover ── */
.nav-link-card {
  transition: box-shadow 0.15s;
}
.nav-link-card:hover {
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
}

/* ── Footer settings compact rows ── */
.footer-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}
.footer-row-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
  min-width: 6rem;
}
.footer-row-desc {
  flex: 1;
  font-size: 0.6875rem;
  color: #94a3b8;
  min-width: 0;
}
</style>
