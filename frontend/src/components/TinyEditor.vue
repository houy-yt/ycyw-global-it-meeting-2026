<template>
  <div class="tiny-editor-wrap">
    <Editor
      v-model="content"
      :init="editorInit"
      :disabled="disabled"
      license-key="gpl"
    />
  </div>
</template>

<script setup>
/**
 * TinyEditor — 通用富文本编辑器组件（本地部署，无需 API Key）
 *
 * 使用示例:
 *   <TinyEditor v-model="htmlContent" />
 *   <TinyEditor v-model="htmlContent" height="400" :toolbar="customToolbar" />
 *
 * Props:
 *   modelValue  — 绑定的 HTML 内容 (v-model)
 *   height      — 编辑器高度 (px), 默认 360
 *   toolbar     — 自定义工具栏配置
 *   plugins     — 自定义插件列表
 *   menubar     — 是否显示菜单栏, 默认 true
 *   disabled    — 是否禁用编辑
 *   placeholder — 占位文本
 */
import { computed } from 'vue';

// Import TinyMCE core (must be before the vue wrapper)
import 'tinymce/tinymce';
// Theme & model
import 'tinymce/themes/silver';
import 'tinymce/models/dom';
// Icons
import 'tinymce/icons/default';
// Plugins (import all commonly used ones)
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/image';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/code';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/help';
import 'tinymce/plugins/wordcount';

import Editor from '@tinymce/tinymce-vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  height: { type: [Number, String], default: 360 },
  /* toolbar: {
    type: String,
    default:
      'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | ' +
      'alignleft aligncenter alignright alignjustify | ' +
      'bullist numlist outdent indent | link image table charmap | ' +
      'forecolor backcolor removeformat | code fullscreen preview | help',
  }, */
  toolbar: {
    type: String,
    default:
      'blocks fontsize bold italic underline alignleft aligncenter alignright alignjustify bullist numlist | link image table charmap | forecolor backcolor removeformat | code fullscreen preview | help',
  },
  plugins: {
    type: String,
    default:
      'advlist autolink lists link image charmap preview anchor ' +
      'searchreplace visualblocks code fullscreen ' +
      'insertdatetime media table help wordcount',
  },
  menubar: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: '请输入内容...' },
});

const emit = defineEmits(['update:modelValue']);

const content = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const editorInit = computed(() => ({
  // Local deployment: load skins/icons/themes from /tinymce/ (copied by vite-plugin-static-copy)
  base_url: '/tinymce',
  suffix: '.min',

  // GPL license (self-hosted, no API key needed)
  license_key: 'gpl',

  // Chinese UI
  language: 'zh_CN',
  language_url: '/tinymce/langs/zh_CN.js',

  // Editor size
  height: Number(props.height),
  min_height: 200,
  resize: true,

  // Plugins & toolbar
  plugins: props.plugins,
  toolbar: props.toolbar,
  menubar: props.menubar ? 'file edit view insert format tools table help' : false,

  // Skin
  skin: 'oxide',

  // Content style (make editing area look nice)
  content_style: `
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
      padding: 8px 12px;
    }
    p { margin: 0 0 0.5em 0; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    table td, table th { border: 1px solid #ccc; padding: 6px 8px; }
  `,

  // Placeholder
  placeholder: props.placeholder,

  // Branding
  branding: false,
  promotion: false,

  // File picker — open elFinder in modal dialog (iframe) for browsing/selecting files
  file_picker_callback: (callback, value, meta) => {
    // Generate a unique callback ID
    const callbackId = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    // Get auth token for elFinder
    const token = localStorage.getItem('token') || '';

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:100000;display:flex;align-items:center;justify-content:center;';

    // Create dialog container
    const dialog = document.createElement('div');
    dialog.style.cssText = 'background:#fff;border-radius:4px;width:80vw;height:80vh;max-width:1200px;max-height:900px;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.3);';

    // Header bar
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 16px;border-bottom:1px solid #ddd;background:#f5f5f5;border-radius:4px 4px 0 0;flex-shrink:0;';
    const title = document.createElement('strong');
    title.textContent = 'elFinder 文件管理器';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'border:none;background:none;font-size:18px;cursor:pointer;padding:4px 8px;color:#666;';
    closeBtn.onmouseenter = () => { closeBtn.style.color = '#000'; };
    closeBtn.onmouseleave = () => { closeBtn.style.color = '#666'; };
    closeBtn.onclick = () => cleanup();
    header.appendChild(closeBtn);

    // iframe
    const iframe = document.createElement('iframe');
    iframe.src = `/elfinder.html?cb=${callbackId}&token=${encodeURIComponent(token)}&mode=iframe`;
    iframe.style.cssText = 'flex:1;border:none;border-radius:0 0 4px 4px;width:100%;';

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
        callback(e.data.url);
        cleanup();
      }
    };
    window.addEventListener('message', handler);
  },
  file_picker_types: 'file image media',

  // Image upload — upload to server, return URL (not base64)
  automatic_uploads: true,
  images_upload_handler: (blobInfo) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', blobInfo.blob(), blobInfo.filename());

      const token = localStorage.getItem('token');
      fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
        .then((resp) => {
          if (!resp.ok) {
            return resp.json().then((data) => {
              reject(data.message || `上传失败 (${resp.status})`);
            }).catch(() => reject(`上传失败 (${resp.status})`));
          }
          return resp.json();
        })
        .then((data) => {
          if (data && data.location) {
            resolve(data.location);
          } else {
            reject('上传返回数据异常');
          }
        })
        .catch((err) => {
          reject(typeof err === 'string' ? err : (err.message || '图片上传失败'));
        });
    });
  },

  // Allow all HTML elements (for flexible content)
  extended_valid_elements: '*[*]',
  valid_children: '+body[style],+body[link]',
}));
</script>

<style scoped>
.tiny-editor-wrap {
  width: 100%;
}
/* Fix TinyMCE z-index issues inside el-dialog */
.tiny-editor-wrap :deep(.tox-tinymce) {
  border-radius: 6px;
  border-color: #e2e8f0;
}
.tiny-editor-wrap :deep(.tox .tox-toolbar__group) {
  border-color: #e2e8f0;
}
</style>

<!-- Global (non-scoped) style: fix TinyMCE floating panels behind el-dialog -->
<style>
.tox-tinymce-aux {
  z-index: 10000 !important;
}
</style>
