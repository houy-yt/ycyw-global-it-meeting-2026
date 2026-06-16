<template>
  <div>
    <section class="hero-bg text-white py-16">
      <div class="container-x flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <div class="chip-orange bg-white/10 !text-brand-orange ring-1 ring-white/20">会议剪影</div>
          <h1 class="mt-4 text-4xl sm:text-5xl font-extrabold">Gallery</h1>
          <p class="mt-3 text-white/70 text-sm">照片 · 视频 · 第三方链接</p>
        </div>
        <button class="btn-orange" @click="openUpload"><font-awesome-icon icon="plus" class="mr-1" /> 上传剪影</button>
      </div>
    </section>

    <section class="section-y">
      <div class="container-x">
        <!-- filters -->
        <div class="flex flex-wrap gap-2 mb-6">
          <button
            class="chip"
            :class="!filter.tag ? '!bg-brand-blue !text-white' : ''"
            @click="filter.tag = ''; load()"
          >全部</button>
          <button
            v-for="t in tags"
            :key="t.id"
            class="chip"
            :class="filter.tag === t.name ? '!bg-brand-blue !text-white' : ''"
            @click="filter.tag = t.name; load()"
          >{{ t.name }}</button>
        </div>

        <!-- grid -->
        <div
          v-if="items.length"
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5"
        >
          <div
            v-for="g in items"
            :key="g.id"
            class="card overflow-hidden group cursor-pointer"
            @click="preview(g)"
          >
            <div class="aspect-square bg-slate-100 relative overflow-hidden">
              <img
                v-if="g.type === 'image'"
                :src="g.fileUrl"
                class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div v-else class="absolute inset-0 flex items-center justify-center bg-brand-deep text-white">
                <div class="text-center">
                  <div class="text-4xl"><font-awesome-icon :icon="g.type === 'link' ? 'link' : 'video'" /></div>
                  <div class="text-xs mt-2 px-3 line-clamp-2">{{ g.title }}</div>
                </div>
              </div>
            </div>
            <div class="p-3">
              <div class="text-sm font-medium text-brand-deep truncate">{{ g.title }}</div>
              <div class="mt-1 flex gap-1 flex-wrap">
                <span v-for="t in g.tags.slice(0, 2)" :key="t" class="chip !text-[10px] !py-0.5">{{ t }}</span>
              </div>
              <div class="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
                <span class="truncate">{{ g.uploader?.nickname }}</span>
                <button
                  v-if="auth.isAdmin"
                  class="text-brand-red hover:underline"
                  @click.stop="del(g)"
                >删除</button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center text-slate-400 py-16">暂无内容</div>

        <div v-if="page * 12 < total" class="text-center mt-8">
          <button class="btn-secondary" @click="loadMore">加载更多</button>
        </div>
      </div>
    </section>

    <!-- Upload Dialog -->
    <el-dialog v-model="upload.show" title="上传剪影" width="500px" align-center>
      <div v-if="!auth.isLoggedIn" class="text-center py-6">
        <p class="text-sm text-slate-500 mb-4">登录后才能上传</p>
        <button class="btn-primary" @click="upload.show = false; auth.requireLogin(router, '/gallery', 'upload')">前往登录</button>
      </div>
      <div v-else class="space-y-4">
        <div>
          <label class="text-sm text-slate-600">类型</label>
          <div class="mt-2 flex gap-2">
            <button
              v-for="t in [
                { v: 'image', l: '图片' },
                { v: 'video', l: '视频' },
                { v: 'link', l: '第三方链接' },
              ]"
              :key="t.v"
              class="px-4 py-2 rounded-full text-sm transition"
              :class="upload.type === t.v
                ? 'bg-brand-blue text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              @click="upload.type = t.v"
            >{{ t.l }}</button>
          </div>
        </div>

        <div>
          <label class="text-sm text-slate-600">标题</label>
          <input
            v-model="upload.title"
            class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-blue"
            placeholder="给这段回忆起个名字"
          />
        </div>

        <div v-if="upload.type !== 'link'">
          <label class="text-sm text-slate-600">
            选择文件
            <span class="text-xs text-slate-400">
              ({{ upload.type === 'image' ? '≤10MB' : '≤50MB' }})
            </span>
          </label>
          <input
            ref="fileInput"
            type="file"
            class="mt-2 block w-full text-sm"
            :accept="upload.type === 'image' ? 'image/*' : 'video/*'"
            @change="onFile"
          />
        </div>
        <div v-else>
          <label class="text-sm text-slate-600">视频链接（YouTube / Vimeo / 直链）</label>
          <input
            v-model="upload.videoLink"
            class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-blue"
            placeholder="https://..."
          />
        </div>

        <div>
          <label class="text-sm text-slate-600">标签</label>
          <div class="mt-2 flex gap-2 flex-wrap">
            <button
              v-for="t in tags"
              :key="t.id"
              class="chip"
              :class="upload.tags.includes(t.name) ? '!bg-brand-blue !text-white' : ''"
              @click="toggleTag(t.name)"
            >{{ t.name }}</button>
          </div>
          <div class="mt-2 flex gap-2">
            <input
              v-model="upload.customTag"
              class="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-blue"
              placeholder="自定义标签..."
              @keyup.enter="addCustomTag"
            />
            <button class="btn-secondary !py-2 !px-4 !text-xs" @click="addCustomTag">+ 添加</button>
          </div>
          <div v-if="upload.tags.length" class="mt-2 text-xs text-slate-500">
            已选：{{ upload.tags.join('、') }}
          </div>
        </div>
      </div>
      <template #footer v-if="auth.isLoggedIn">
        <button class="btn-secondary mr-2" @click="upload.show = false">取消</button>
        <button class="btn-primary" :disabled="upload.uploading" @click="doUpload">
          {{ upload.uploading ? '上传中...' : '提 交' }}
        </button>
      </template>
    </el-dialog>

    <!-- Preview Dialog -->
    <el-dialog v-model="previewVisible" :title="current?.title" width="800px" align-center>
      <div v-if="current?.type === 'image'" class="text-center">
        <img :src="current.fileUrl" class="max-h-[70vh] mx-auto rounded-xl" />
      </div>
      <div v-else-if="current?.type === 'video'" class="text-center">
        <video :src="current.fileUrl" controls class="max-h-[70vh] mx-auto rounded-xl" />
      </div>
      <div v-else-if="current?.type === 'link'" class="text-center">
        <a :href="current.videoLink" target="_blank" class="text-brand-blue underline">
          {{ current.videoLink }}
        </a>
      </div>
      <div class="mt-4 text-xs text-slate-500 text-center">
        {{ current?.uploader?.nickname }} · {{ formatTime(current?.createdAt) }}
        <span v-if="current?.tags?.length" class="ml-2">
          标签：{{ current.tags.join('、') }}
        </span>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';
import api from '../api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const items = ref([]);
const total = ref(0);
const page = ref(1);
const filter = reactive({ tag: '' });
const tags = ref([]);

const upload = reactive({
  show: false,
  type: 'image',
  title: '',
  videoLink: '',
  tags: [],
  customTag: '',
  file: null,
  uploading: false,
});
const fileInput = ref(null);

const previewVisible = ref(false);
const current = ref(null);

function formatTime(t) {
  return t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '';
}

async function load(reset = true) {
  if (reset) {
    page.value = 1;
    items.value = [];
  }
  const { data } = await api.get('/gallery', {
    params: { tag: filter.tag || undefined, page: page.value, limit: 12 },
  });
  items.value = reset ? data.items : [...items.value, ...data.items];
  total.value = data.total;
}

function loadMore() {
  page.value++;
  load(false);
}

async function loadTags() {
  const { data } = await api.get('/preset-tags');
  tags.value = data;
}

function openUpload() {
  if (!auth.isLoggedIn) return auth.requireLogin(router, '/gallery', 'upload');
  upload.show = true;
  upload.type = 'image';
  upload.title = '';
  upload.videoLink = '';
  upload.tags = [];
  upload.customTag = '';
  upload.file = null;
  if (fileInput.value) fileInput.value.value = '';
}

function toggleTag(name) {
  const i = upload.tags.indexOf(name);
  if (i >= 0) upload.tags.splice(i, 1);
  else upload.tags.push(name);
}

function addCustomTag() {
  const t = upload.customTag.trim();
  if (t && !upload.tags.includes(t)) upload.tags.push(t);
  upload.customTag = '';
}

function onFile(e) {
  upload.file = e.target.files?.[0] || null;
}

async function doUpload() {
  if (!upload.title) return ElMessage.warning('请填写标题');
  if (upload.type === 'link' && !upload.videoLink) return ElMessage.warning('请填写链接');
  if (upload.type !== 'link' && !upload.file) return ElMessage.warning('请选择文件');

  const form = new FormData();
  form.append('title', upload.title);
  form.append('type', upload.type);
  form.append('tags', JSON.stringify(upload.tags));
  if (upload.type === 'link') form.append('videoLink', upload.videoLink);
  else form.append('file', upload.file);

  upload.uploading = true;
  try {
    await api.post('/gallery', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    ElMessage.success('上传成功');
    upload.show = false;
    load(true);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '上传失败');
  } finally {
    upload.uploading = false;
  }
}

function preview(g) {
  current.value = g;
  previewVisible.value = true;
}

async function del(g) {
  try {
    await ElMessageBox.confirm('确认删除该剪影？', '提示', { type: 'warning' });
  } catch {
    return;
  }
  try {
    await api.delete(`/gallery/${g.id}`);
    items.value = items.value.filter((x) => x.id !== g.id);
    ElMessage.success('已删除');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败');
  }
}

onMounted(async () => {
  await Promise.all([loadTags(), load(true)]);
  // Auto-open upload dialog if redirected back from login with action=upload
  if (route.query.action === 'upload' && auth.isLoggedIn) {
    openUpload();
  }
});
</script>
