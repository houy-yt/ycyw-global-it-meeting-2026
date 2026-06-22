<template>
  <div>
    <!-- ============ HERO with QR Code ============ -->
    <section class="hero-bg text-white py-14 sm:py-16">
      <div class="container-x">
        <div class="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
          <!-- Left: Text -->
          <div class="flex-1 text-center lg:text-left">
            <div class="chip-orange bg-white/10 !text-brand-orange ring-1 ring-white/20">
              <font-awesome-icon icon="shield-halved" class="mr-1" />
              入校指引
            </div>
            <h1 class="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
              Campus Entry Guide
            </h1>
            <p class="mt-3 text-white/70 text-sm sm:text-base lg:whitespace-nowrap">
              参会访客入校申请填写指引，请使用微信扫描右侧二维码完成申请
            </p>
          </div>

          <!-- Right: QR Code Card -->
          <div class="flex-shrink-0">
            <div class="cursor-pointer" @click="previewQrcode">
              <div class="bg-white rounded-[6px] p-1 shadow-lg">
                <img
                  :src="qrcodeUrl"
                  alt="访客申请二维码"
                  class="w-[100px] h-[100px] rounded-[4px] object-contain bg-white"
                />
              </div>
              <p class="text-white/80 text-xs text-center mt-2">扫码填写进校申请</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ MAIN CONTENT ============ -->
    <section class="section-y">
      <div class="container-x">
        <!-- Intro text (no card) -->
        <p class="text-slate-500 text-sm leading-relaxed mb-8">
          <font-awesome-icon icon="lightbulb" class="text-brand-orange mr-1" />
          访客入校需提前提交申请。表单中大部分字段请根据个人实际情况填写，但以下
          <strong class="text-brand-deep">3 个字段</strong>
          需要填写固定内容，请按照下方指引操作。
        </p>

        <!-- 3 required fields (inline, no card wrapper) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <!-- Field 1 -->
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
              <font-awesome-icon icon="building" class="text-brand-blue" />
            </div>
            <div>
              <div class="text-xs text-slate-400">到访部门</div>
              <div class="text-lg font-extrabold text-brand-deep">信息技术部 / ITD</div>
            </div>
          </div>

          <!-- Field 2 -->
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
              <font-awesome-icon icon="file-pen" class="text-brand-orange" />
            </div>
            <div>
              <div class="text-xs text-slate-400">访客事由</div>
              <div class="text-lg font-extrabold text-brand-deep">参加 IT 年度会议</div>
            </div>
          </div>

          <!-- Field 3 -->
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <font-awesome-icon icon="user-check" class="text-green-600" />
            </div>
            <div>
              <div class="text-xs text-slate-400">被访者姓名</div>
              <div class="text-lg font-extrabold text-brand-deep">宋磊</div>
            </div>
          </div>
        </div>

        <!-- Warning text (no card) -->
        <p class="text-sm text-slate-500 flex items-start gap-2 mb-10">
          <font-awesome-icon icon="triangle-exclamation" class="text-brand-red mt-0.5 flex-shrink-0" />
          <span>
            这 3 个字段内容要
            <strong class="text-brand-red">严格按固定内容填写</strong>，填写不正确将导致审批不通过
          </span>
        </p>

        <!-- Form example image (single column) -->
        <div
          class="bg-white rounded-[6px] border border-slate-200 overflow-hidden cursor-pointer group"
          @click="previewImage('/fkzn.jpg', '访客申请表单示例')"
        >
          <div class="relative">
            <img
              src="/fkzn.jpg"
              alt="访客申请表单示例"
              class="w-full object-contain bg-slate-50 transition-transform duration-300 group-hover:scale-[1.01]"
              loading="lazy"
            />
            <div class="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition">
              <font-awesome-icon icon="magnifying-glass-plus" class="mr-1" />
              点击查看大图
            </div>
          </div>
        </div>
        <p class="text-center text-xs text-slate-400 mt-3">
          <font-awesome-icon icon="image" class="mr-1" />
          申请表单示例（点击可放大查看）
        </p>

        <!-- Custom content from backend -->
        <div v-if="customContent" class="mt-10">
          <div class="entry-content text-sm text-slate-600 leading-relaxed" v-html="customContent"></div>
        </div>
      </div>
    </section>

    <!-- Photo Preview Modal -->
    <PhotoPreviewModal
      v-model="previewVisible"
      :src="previewSrc"
      :title="previewTitle"
      type="image"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';
import PhotoPreviewModal from '../components/PhotoPreviewModal.vue';

const DEFAULT_QRCODE = '/fksq-qrcode.jpg';
const qrcodeUrl = ref(DEFAULT_QRCODE);
const customContent = ref('');

// Preview modal
const previewVisible = ref(false);
const previewSrc = ref('');
const previewTitle = ref('');

function previewImage(src, title) {
  previewSrc.value = src;
  previewTitle.value = title || '';
  previewVisible.value = true;
}

function previewQrcode() {
  previewImage(qrcodeUrl.value, '访客申请二维码');
}

// Load settings from backend
async function loadSettings() {
  try {
    const { data } = await api.get('/entry-guide/settings');
    if (data?.qrcodeUrl) qrcodeUrl.value = data.qrcodeUrl;
    if (data?.customContent) customContent.value = data.customContent;
  } catch {
    // fallback to defaults
  }
}

onMounted(loadSettings);
</script>
