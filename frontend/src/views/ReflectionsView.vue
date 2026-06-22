<template>
  <div>
    <!-- Hero -->
    <section class="hero-bg text-white py-14 sm:py-16">
      <div class="container-x">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div class="flex-1 text-center lg:text-left">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 text-xs tracking-widest uppercase"><font-awesome-icon icon="lightbulb" class="mr-1" />{{ heroLabel }}</div>
            <h1 class="mt-4 text-4xl sm:text-5xl font-extrabold">{{ heroTitle }}</h1>
            <p v-if="heroSubtitle" class="mt-3 text-white/70 text-sm">{{ heroSubtitle }}</p>
          </div>
          <div class="flex-shrink-0 flex flex-wrap gap-3 justify-center">
            <button class="btn-orange" @click="openPublish"><font-awesome-icon icon="pen-to-square" class="mr-1" /> 写下我的反思</button>
          </div>
          <div class="flex-shrink-0 flex justify-center lg:justify-end lg:pl-8 lg:border-l lg:border-white/20">
            <WeatherCard />
          </div>
        </div>
      </div>
    </section>

    <section class="section-y">
      <div class="container-x">

        <!-- Masonry Reflections Grid -->
        <div class="masonry-grid">
          <div
            v-for="r in items"
            :key="r.id"
            class="masonry-item group cursor-pointer"
            :style="{
              '--note-bg': noteColor(r.id),
              '--note-accent': noteAccent(r.id),
            }"
            @click="openDetail(r)"
          >
            <div class="note-card">
              <!-- Top accent bar -->
              <div class="note-accent-bar"></div>

              <!-- Header -->
              <div class="px-5 pt-4 pb-0">
                <h3 class="text-base font-bold text-slate-800 leading-snug line-clamp-2">{{ displayTitle(r.title) }}</h3>
                <div class="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
                  <span
                    class="inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold text-white flex-shrink-0"
                    :style="{ backgroundColor: noteAccent(r.id) }"
                  >{{ (r.author.nickname || '?').charAt(0).toUpperCase() }}</span>
                  <span class="font-medium text-slate-600 truncate">{{ displayAuthorName(r.author) }}</span>
                  <span class="text-slate-300">·</span>
                  <span class="flex-shrink-0">{{ formatDate(r.createdAt) }}</span>
                </div>
              </div>

              <!-- Content preview -->
              <p class="mt-3 px-5 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{{ r.content }}</p>

              <!-- Footer actions -->
              <div class="mt-4 px-5 pb-5 flex items-center gap-4 text-xs text-slate-400">
                <span class="inline-flex items-center gap-1" :class="r.likedByMe ? 'text-brand-red' : ''">
                  <font-awesome-icon :icon="r.likedByMe ? ['fas','heart'] : ['far','heart']" /> {{ r.likeCount }}
                </span>
                <span class="inline-flex items-center gap-1">
                  <font-awesome-icon :icon="['fas','comment-dots']" /> {{ r.commentCount }}
                </span>
                <span class="ml-auto text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition">点击查看详情 →</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="items.length === 0 && !loading" class="text-center py-20">
          <div class="text-5xl mb-4 text-slate-300"><font-awesome-icon icon="file-pen" /></div>
          <div class="text-lg font-semibold text-slate-400">还没有任何反思</div>
          <p class="text-sm text-slate-400 mt-1">做第一个分享者吧，你的思考值得被记录 <font-awesome-icon icon="wand-magic-sparkles" class="text-brand-orange" /></p>
        </div>

        <!-- Load more -->
        <div v-if="page * limit < total" class="text-center mt-10">
          <button class="btn-secondary" @click="loadMore">加载更多</button>
        </div>
      </div>
    </section>

    <!-- ══════ Detail Modal (Pinterest-style) ══════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="detail"
          class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto"
          @click.self="closeDetail"
        >
          <!-- Backdrop -->
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="closeDetail"></div>

          <!-- Modal Card -->
          <div
            class="relative z-10 w-full max-w-2xl my-10 mx-4 rounded-3xl shadow-2xl overflow-hidden animate-modal-in"
            :style="{ backgroundColor: noteColor(detail.id) }"
          >
            <!-- Top accent bar -->
            <div class="h-1.5 w-full" :style="{ background: `linear-gradient(90deg, ${noteAccent(detail.id)}, ${noteAccent(detail.id)}88)` }"></div>

            <!-- Close button -->
            <button
              @click="closeDetail"
              class="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm transition shadow-sm z-20"
            ><font-awesome-icon icon="xmark" /></button>

            <!-- Delete button -->
            <button
              v-if="auth.isAdmin || auth.user?.id === detail.authorId"
              @click="del(detail)"
              class="absolute top-4 right-14 text-xs text-slate-400 hover:text-brand-red bg-white/80 hover:bg-white rounded-full px-3 py-1.5 transition shadow-sm z-20"
            >删除</button>

            <div class="p-6 sm:p-8">
              <!-- Title -->
              <h2 class="text-xl sm:text-2xl font-extrabold text-slate-800 leading-tight pr-16">{{ displayTitle(detail.title) }}</h2>

              <!-- Author & time -->
              <div class="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <span
                  class="inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold text-white flex-shrink-0"
                  :style="{ backgroundColor: noteAccent(detail.id) }"
                >{{ (detail.author.nickname || '?').charAt(0).toUpperCase() }}</span>
                <span class="font-medium text-slate-700">{{ displayAuthorName(detail.author) }}</span>
                <span class="text-slate-300">·</span>
                <span>{{ formatTime(detail.createdAt) }}</span>
              </div>

              <!-- Full content -->
              <div class="mt-6 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{{ detail.content }}</div>

              <!-- Like & comment count -->
              <div class="mt-6 flex items-center gap-5 text-sm">
                <button
                  @click.stop="like(detail)"
                  class="inline-flex items-center gap-1.5 transition font-medium"
                  :class="detail.likedByMe ? 'text-brand-red' : 'text-slate-400 hover:text-brand-red'"
                >
                  <span class="text-base"><font-awesome-icon :icon="detail.likedByMe ? ['fas','heart'] : ['far','heart']" /></span>
                  {{ detail.likeCount }}
                </button>
                <span class="inline-flex items-center gap-1.5 text-slate-400 font-medium">
                  <font-awesome-icon :icon="['fas','comment-dots']" /> {{ detail.commentCount }} 条评论
                </span>
              </div>

              <!-- Comments section -->
              <div class="mt-6 pt-6 border-t border-black/5">
                <div v-if="detail.commentList === null" class="text-xs text-slate-400 text-center py-4">
                  加载评论中...
                </div>
                <template v-else>
                  <div v-if="detail.commentList.length" class="space-y-3 mb-5">
                    <div
                      v-for="c in detail.commentList"
                      :key="c.id"
                      class="bg-white/50 backdrop-blur-sm rounded-xl p-3.5 text-sm"
                    >
                      <div class="text-xs text-slate-500 mb-1 flex items-center gap-2">
                        <span class="font-medium text-slate-700">{{ displayAuthorName(c.author) }}</span>
                        <span class="text-slate-300">·</span>
                        <span>{{ formatTime(c.createdAt) }}</span>
                        <button
                          v-if="auth.isAdmin || auth.user?.id === c.authorId"
                          class="ml-auto text-slate-400 hover:text-brand-red transition"
                          @click.stop="delComment(detail, c)"
                        >删除</button>
                      </div>
                      <div class="text-slate-700 whitespace-pre-wrap">{{ c.content }}</div>
                    </div>
                  </div>
                  <div v-else class="text-xs text-slate-400 mb-5 text-center py-2">还没有评论，来说点什么吧 <font-awesome-icon :icon="['far','comment']" /></div>
                </template>

                <!-- Comment input -->
                <div class="flex gap-2">
                  <input
                    v-model="detail.draft"
                    type="text"
                    placeholder="写下你的评论..."
                    class="flex-1 rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-blue transition"
                    @keyup.enter="addComment(detail)"
                    @click.stop
                  />
                  <label class="flex items-center gap-1 text-xs text-slate-500 select-none flex-shrink-0" @click.stop>
                    <input type="checkbox" v-model="detail.draftAnon" class="accent-brand-blue" /> 匿名
                  </label>
                  <button class="btn-primary !py-2 !px-4 !text-xs flex-shrink-0" @click.stop="addComment(detail)">发送</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Publish Dialog -->
    <el-dialog v-model="showPublishForm" title="写下我的反思" width="500px" align-center>
      <div v-if="!auth.isLoggedIn" class="text-center py-6">
        <p class="text-sm text-slate-500 mb-4">登录后才能发布反思</p>
        <button class="btn-primary" @click="showPublishForm = false; auth.requireLogin(router, '/reflections', 'publish')">前往登录</button>
      </div>
      <div v-else-if="auth.isLoggedIn && !auth.isAttendee" class="text-center py-6">
        <p class="text-sm text-brand-red">当前账户未识别为参会人员，无法发布反思。请使用参会人员邮箱登录。</p>
      </div>
      <div v-else class="space-y-4">
        <div>
          <label class="text-sm text-slate-600">标题</label>
          <input
            v-model="form.title"
            class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-blue"
            placeholder="给你的反思起个标题…"
          />
        </div>
        <div>
          <label class="text-sm text-slate-600">内容</label>
          <textarea
            v-model="form.content"
            placeholder="写下你的思考…"
            rows="5"
            class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-blue transition resize-none"
          ></textarea>
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none">
          <input type="checkbox" v-model="form.isAnonymous" class="accent-brand-blue" />
          匿名发布
        </label>
      </div>
      <template #footer v-if="auth.isLoggedIn && auth.isAttendee">
        <button class="btn-secondary mr-2" @click="showPublishForm = false">取消</button>
        <button class="btn-primary" :disabled="posting" @click="submit">
          {{ posting ? '发布中...' : '发布反思' }}
        </button>
      </template>
    </el-dialog>

    <!-- Floating action button (visible when scrolled past hero) -->
    <Transition name="fab-fade">
      <button
        v-show="showFab"
        class="fab-action btn-orange"
        @click="openPublish"
      >
        <font-awesome-icon icon="pen-to-square" />
        <span class="hidden sm:inline ml-1.5">写下我的反思</span>
      </button>
    </Transition>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';
import api from '../api';
import { useAuthStore } from '../stores/auth';
import WeatherCard from '../components/WeatherCard.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

// Hero text from nav
const heroLabel = ref('会后反思');
const heroTitle = ref('Reflections');
const heroSubtitle = ref('分享你在会议中的所学、所思、所悟');

const items = ref([]);
const total = ref(0);
const page = ref(1);
const limit = 20;
const loading = ref(false);
const posting = ref(false);
const detail = ref(null);
const showPublishForm = ref(false);
const showFab = ref(false);

const form = reactive({ title: '', content: '', isAnonymous: false });

function handleScroll() {
  showFab.value = window.scrollY > 300;
}

/* ── Note colors ── */
const NOTE_COLORS = [
  '#fef9e7', '#fef3c7', '#fce7f3', '#fce4ec', '#e8f5e9',
  '#e0f2f1', '#e3f2fd', '#ede9fe', '#fff3e0', '#f3e5f5',
];
const NOTE_ACCENTS = [
  '#f59e0b', '#eab308', '#ec4899', '#ef4444', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#f97316', '#a855f7',
];

function noteColor(id) {
  const idx = typeof id === 'number' ? id : hashStr(String(id));
  return NOTE_COLORS[Math.abs(idx) % NOTE_COLORS.length];
}

function noteAccent(id) {
  const idx = typeof id === 'number' ? id : hashStr(String(id));
  return NOTE_ACCENTS[Math.abs(idx) % NOTE_ACCENTS.length];
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}

const DEMO_PREFIX = '[DEMO] ';
function displayTitle(title) {
  return title.startsWith(DEMO_PREFIX) ? title.slice(DEMO_PREFIX.length) : title;
}

function formatDate(t) {
  return dayjs(t).format('MM/DD');
}

function formatTime(t) {
  return dayjs(t).format('YYYY-MM-DD HH:mm');
}

/**
 * Display author name using the same logic as auth store displayName:
 * If nickname contains CJK characters, prefer emailPrefix; otherwise use nickname.
 */
function displayAuthorName(author) {
  if (!author) return '用户';
  if (author.isAnonymous) return '匿名';
  const nick = author.nickname;
  const emailPrefix = author.emailPrefix || '';
  if (nick && !/[\u4e00-\u9fa5]/.test(nick)) return nick;
  return emailPrefix || nick || '用户';
}

/* ── Publish dialog ── */
function openPublish() {
  if (!auth.isLoggedIn) return auth.requireLogin(router, '/reflections', 'publish');
  showPublishForm.value = true;
  form.title = '';
  form.content = '';
  form.isAnonymous = false;
}

/* ── Detail modal ── */
async function openDetail(r) {
  detail.value = r;
  document.body.style.overflow = 'hidden';
  if (r.commentList === null) {
    const { data } = await api.get(`/reflections/${r.id}/comments`);
    r.commentList = data;
  }
}

function closeDetail() {
  detail.value = null;
  document.body.style.overflow = '';
}

/* ── Data loading ── */
async function load(reset = true) {
  loading.value = true;
  try {
    if (reset) {
      page.value = 1;
      items.value = [];
    }
    const { data } = await api.get('/reflections', {
      params: { page: page.value, limit },
    });
    const fresh = data.items.map((r) => ({
      ...r,
      showComments: false,
      commentList: null,
      draft: '',
      draftAnon: false,
    }));
    items.value = reset ? fresh : [...items.value, ...fresh];
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  page.value++;
  load(false);
}

async function submit() {
  if (!form.title || !form.content) return ElMessage.warning('请填写完整');
  posting.value = true;
  try {
    await api.post('/reflections', { ...form });
    ElMessage.success('发布成功');
    showPublishForm.value = false;
    form.title = '';
    form.content = '';
    form.isAnonymous = false;
    load(true);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发布失败');
  } finally {
    posting.value = false;
  }
}

async function like(r) {
  if (!auth.isLoggedIn) return auth.requireLogin(router, '/reflections');
  try {
    const { data } = await api.post(`/reflections/${r.id}/like`);
    r.likedByMe = data.liked;
    r.likeCount = data.likeCount;
  } catch {
    ElMessage.error('操作失败');
  }
}

async function addComment(r) {
  if (!auth.isLoggedIn) return auth.requireLogin(router, '/reflections');
  if (!r.draft?.trim()) return;
  try {
    const { data } = await api.post('/comments', {
      reflectionId: r.id,
      content: r.draft.trim(),
      isAnonymous: r.draftAnon,
    });
    r.commentList = [...(r.commentList || []), data];
    r.commentCount += 1;
    r.draft = '';
    r.draftAnon = false;
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '评论失败');
  }
}

async function delComment(r, c) {
  try {
    await ElMessageBox.confirm('确认删除该评论？', '提示', { type: 'warning' });
  } catch { return; }
  try {
    await api.delete(`/comments/${c.id}`);
    r.commentList = r.commentList.filter((x) => x.id !== c.id);
    r.commentCount -= 1;
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败');
  }
}

async function del(r) {
  try {
    await ElMessageBox.confirm('确认删除该反思？此操作不可恢复', '警告', { type: 'warning' });
  } catch { return; }
  try {
    await api.delete(`/reflections/${r.id}`);
    items.value = items.value.filter((x) => x.id !== r.id);
    total.value -= 1;
    if (detail.value?.id === r.id) closeDetail();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败');
  }
}

async function loadHero() {
  try {
    const { data } = await api.get('/nav');
    const link = (data?.links || []).find(l => l.to === '/reflections');
    if (link) {
      heroLabel.value = link.label || '会后反思';
      heroTitle.value = link.heroTitle || link.label || 'Reflections';
      if (link.heroSubtitle) heroSubtitle.value = link.heroSubtitle;
    }
  } catch { /* use defaults */ }
}

onMounted(async () => {
  window.addEventListener('scroll', handleScroll, { passive: true });
  loadHero();
  await load(true);
  // Auto-open publish form if redirected back from login with action=publish
  if (route.query.action === 'publish' && auth.isLoggedIn) {
    openPublish();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
/* ── Masonry Grid (matching GalleryView waterfall) ── */
.masonry-grid {
  columns: 2;
  column-gap: 14px;
}
.masonry-item {
  break-inside: avoid;
  margin-bottom: 14px;
}

@media (min-width: 640px) {
  .masonry-grid {
    columns: 3;
    column-gap: 16px;
  }
  .masonry-item {
    margin-bottom: 16px;
  }
}
@media (min-width: 1024px) {
  .masonry-grid {
    columns: 4;
    column-gap: 18px;
  }
  .masonry-item {
    margin-bottom: 18px;
  }
}
@media (min-width: 1280px) {
  .masonry-grid {
    columns: 5;
    column-gap: 20px;
  }
  .masonry-item {
    margin-bottom: 20px;
  }
}

/* ── Note Card ── */
.note-card {
  position: relative;
  background: var(--note-bg);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.note-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06);
}

/* Top accent bar */
.note-accent-bar {
  height: 4px;
  width: 100%;
  background: linear-gradient(90deg, var(--note-accent), var(--note-accent));
  opacity: 0.8;
}

/* Line clamp */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Modal transitions ── */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.animate-modal-in {
  animation: modalIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

</style>
