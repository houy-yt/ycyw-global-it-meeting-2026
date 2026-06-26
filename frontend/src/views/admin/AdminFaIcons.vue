<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h3 class="text-lg font-semibold text-brand-deep">FA图标库</h3>
        <p class="text-sm text-slate-500 mt-1">
          Font Awesome 7.3.0 免费图标合集，共
          <span class="font-semibold text-brand-blue">{{ totalCount }}</span> 个图标，
          <span class="font-semibold text-slate-600">{{ categoryData.length }}</span> 个分类
          <span class="text-xs ml-2 text-slate-400">（点击图标查看详情与用法）</span>
        </p>
      </div>
      <el-input
        v-model="search"
        placeholder="搜索图标名称..."
        clearable
        class="!w-64"
        :prefix-icon="SearchIcon"
      />
    </div>

    <!-- Category sections -->
    <div v-for="cat in filteredCategories" :key="cat.key" class="mb-4">
      <!-- Category Header -->
      <div
        class="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-100 to-slate-50 rounded-lg cursor-pointer select-none hover:from-slate-200 hover:to-slate-100 transition-all border border-slate-200/60"
        @click="toggleCategory(cat.key)"
      >
        <div class="flex items-center gap-2.5">
          <font-awesome-icon :icon="getCategoryIcon(cat.key)" class="text-brand-blue" />
          <span class="font-bold text-slate-700 text-base">{{ getCategoryLabel(cat.key) }}</span>
          <span class="text-xs text-slate-400 ml-0.5">{{ cat.label }}</span>
          <span class="text-xs text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full font-medium">
            {{ cat.iconCount }}
          </span>
        </div>
        <font-awesome-icon
          :icon="expanded[cat.key] ? 'chevron-up' : 'chevron-right'"
          class="text-xs text-slate-400 transition-transform"
        />
      </div>

      <!-- Icons Grid -->
      <div
        v-show="expanded[cat.key]"
        class="icon-grid mt-2 ml-4"
      >
        <div
          v-for="ic in cat.icons"
          :key="ic.displayPrefix + '-' + ic.name"
          class="icon-card"
          :title="ic.displayPrefix + ' fa-' + ic.name"
          @click="openDetail(ic)"
        >
          <div class="icon-preview">
            <font-awesome-icon :icon="[ic.displayPrefix, ic.name]" />
          </div>
          <div class="icon-name">{{ ic.name }}</div>
          <div class="icon-meta">
            <span class="icon-unicode">{{ ic.unicode }}</span>
            <span
              v-for="s in ic.styles"
              :key="s"
              class="style-badge"
              :class="styleBadgeClass(s)"
            >{{ styleShort(s) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="filteredCategories.length === 0" class="text-center py-16 text-slate-400">
      <font-awesome-icon icon="icons" class="text-4xl mb-3 block" />
      <p>没有找到匹配 "<b class="text-slate-600">{{ search }}</b>" 的图标</p>
    </div>

    <!-- Icon Detail Dialog -->
    <el-dialog
      v-model="detailVisible"
      :title="detailIcon ? 'fa-' + detailIcon.name : ''"
      width="90%"
      align-center
      destroy-on-close
      class="icon-detail-dialog"
    >
      <div v-if="detailIcon" class="detail-body">
        <!-- Preview & Info -->
        <div class="flex items-start gap-6 mb-6">
          <div class="detail-preview-box">
            <font-awesome-icon :icon="[currentPrefix, detailIcon.name]" class="detail-preview-icon" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-xl font-bold text-slate-800 mb-1">{{ detailIcon.name }}</h3>
            <div class="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-3">
              <el-tag
                v-for="s in detailIcon.styles"
                :key="s"
                size="small"
                :type="s === 'solid' ? '' : s === 'regular' ? 'info' : 'warning'"
              >{{ prefixLabel(styleToPrefixShort(s)) }}</el-tag>
              <span class="font-mono text-xs text-slate-400">Unicode: {{ detailIcon.unicode || 'N/A' }}</span>
            </div>
            <!-- Style switcher -->
            <div v-if="detailIcon.styles.length > 1" class="mb-3">
              <span class="text-xs text-slate-500 mr-2">切换风格：</span>
              <el-radio-group v-model="detailStyle" size="small">
                <el-radio-button
                  v-for="s in detailIcon.styles"
                  :key="s"
                  :value="s"
                >{{ prefixLabel(styleToPrefixShort(s)) }}</el-radio-button>
              </el-radio-group>
            </div>
            <!-- Action buttons -->
            <div class="flex flex-wrap gap-2">
              <el-button size="small" type="primary" @click="copyText('fa-' + detailIcon.name)">
                <font-awesome-icon icon="clipboard-check" class="mr-1" /> 复制类名
              </el-button>
              <el-button size="small" @click="copyText(currentHtmlClass + ' fa-' + detailIcon.name)">
                <font-awesome-icon icon="clipboard-check" class="mr-1" /> 复制完整类名
              </el-button>
              <el-button size="small" type="success" tag="a" :href="faOfficialUrl(detailIcon)" target="_blank">
                <font-awesome-icon icon="arrow-up-right-from-square" class="mr-1" /> FA 官网下载
              </el-button>
            </div>
          </div>
        </div>

        <!-- Usage Tabs -->
        <el-tabs v-model="usageTab" class="usage-tabs">
          <!-- HTML -->
          <el-tab-pane label="HTML" name="html">
            <div class="usage-section">
              <p class="usage-desc">通过 CDN 引入 Font Awesome 样式表，然后使用 <code>&lt;i&gt;</code> 标签。</p>
              <div class="code-block">
                <div class="code-header">
                  <span>1. 引入 CDN（放到 &lt;head&gt; 中）</span>
                  <el-button size="small" text @click="copyText(htmlCdnCode)">复制</el-button>
                </div>
                <pre><code>{{ htmlCdnCode }}</code></pre>
              </div>
              <div class="code-block mt-3">
                <div class="code-header">
                  <span>2. 使用图标</span>
                  <el-button size="small" text @click="copyText(htmlUsageCode)">复制</el-button>
                </div>
                <pre><code>{{ htmlUsageCode }}</code></pre>
              </div>
            </div>
          </el-tab-pane>

          <!-- Vue -->
          <el-tab-pane label="Vue" name="vue">
            <div class="usage-section">
              <p class="usage-desc">使用 <code>@fortawesome/vue-fontawesome</code> 组件库。</p>
              <div class="code-block">
                <div class="code-header">
                  <span>1. 安装依赖</span>
                  <el-button size="small" text @click="copyText(vueInstallCode)">复制</el-button>
                </div>
                <pre><code>{{ vueInstallCode }}</code></pre>
              </div>
              <div class="code-block mt-3">
                <div class="code-header">
                  <span>2. 注册图标（main.js / main.ts）</span>
                  <el-button size="small" text @click="copyText(vueRegisterCode)">复制</el-button>
                </div>
                <pre><code>{{ vueRegisterCode }}</code></pre>
              </div>
              <div class="code-block mt-3">
                <div class="code-header">
                  <span>3. 在模板中使用</span>
                  <el-button size="small" text @click="copyText(vueTemplateCode)">复制</el-button>
                </div>
                <pre><code>{{ vueTemplateCode }}</code></pre>
              </div>
            </div>
          </el-tab-pane>

          <!-- React -->
          <el-tab-pane label="React" name="react">
            <div class="usage-section">
              <p class="usage-desc">使用 <code>@fortawesome/react-fontawesome</code> 组件库。</p>
              <div class="code-block">
                <div class="code-header">
                  <span>1. 安装依赖</span>
                  <el-button size="small" text @click="copyText(reactInstallCode)">复制</el-button>
                </div>
                <pre><code>{{ reactInstallCode }}</code></pre>
              </div>
              <div class="code-block mt-3">
                <div class="code-header">
                  <span>2. 在组件中使用</span>
                  <el-button size="small" text @click="copyText(reactUsageCode)">复制</el-button>
                </div>
                <pre><code>{{ reactUsageCode }}</code></pre>
              </div>
            </div>
          </el-tab-pane>

          <!-- Unicode -->
          <el-tab-pane label="Unicode / CSS" name="unicode">
            <div class="usage-section">
              <p class="usage-desc">通过 CSS 伪元素或 Unicode 直接使用。</p>
              <div class="code-block">
                <div class="code-header">
                  <span>CSS 伪元素用法</span>
                  <el-button size="small" text @click="copyText(cssUsageCode)">复制</el-button>
                </div>
                <pre><code>{{ cssUsageCode }}</code></pre>
              </div>
            </div>
          </el-tab-pane>

          <!-- Webfont 字体方案 -->
          <el-tab-pane label="Webfont 字体方案" name="webfont">
            <div class="usage-section">
              <p class="usage-desc">通过 npm 安装 <code>@fortawesome/fontawesome-free</code> 包引入 Webfont 字体文件，支持 <code>&lt;i&gt;</code> 标签和 CSS 伪元素两种用法。</p>

              <div class="code-block">
                <div class="code-header">
                  <span>1. npm 安装</span>
                  <el-button size="small" text @click="copyText(webfontInstallCode)">复制</el-button>
                </div>
                <pre><code>{{ webfontInstallCode }}</code></pre>
              </div>

              <div class="code-block mt-3">
                <div class="code-header">
                  <span>2. 在入口文件中引入 CSS</span>
                  <el-button size="small" text @click="copyText(webfontImportCode)">复制</el-button>
                </div>
                <pre><code>{{ webfontImportCode }}</code></pre>
              </div>

              <div class="code-block mt-3">
                <div class="code-header">
                  <span>3. 在模板中使用（&lt;i&gt; 标签）</span>
                  <el-button size="small" text @click="copyText(webfontHtmlCode)">复制</el-button>
                </div>
                <pre><code>{{ webfontHtmlCode }}</code></pre>
              </div>

              <div class="code-block mt-3">
                <div class="code-header">
                  <span>4. CSS 伪元素用法</span>
                  <el-button size="small" text @click="copyText(webfontCssCode)">复制</el-button>
                </div>
                <pre><code>{{ webfontCssCode }}</code></pre>
              </div>

              <div class="code-block mt-3">
                <div class="code-header">
                  <span>5. CDN 引入（替代 npm）</span>
                  <el-button size="small" text @click="copyText(webfontCdnCode)">复制</el-button>
                </div>
                <pre><code>{{ webfontCdnCode }}</code></pre>
              </div>

              <!-- Download links -->
              <div class="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 class="text-sm font-bold text-slate-700 mb-3">
                  <font-awesome-icon icon="cloud" class="text-brand-blue mr-1" />
                  相关文件下载地址
                </h4>
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-xs">
                    <span class="inline-flex items-center justify-center w-16 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold flex-shrink-0">完整包</span>
                    <span class="text-slate-500 flex-1 min-w-0">CSS / JS / 字体 / SVG 全部文件（zip）</span>
                    <a href="https://github.com/FortAwesome/Font-Awesome/releases" target="_blank" class="text-brand-blue hover:underline flex-shrink-0">
                      <font-awesome-icon icon="arrow-up-right-from-square" class="mr-0.5" />GitHub Releases
                    </a>
                  </div>
                  <div class="flex items-center gap-2 text-xs">
                    <span class="inline-flex items-center justify-center w-16 px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold flex-shrink-0">npm</span>
                    <span class="text-slate-500 flex-1 min-w-0">@fortawesome/fontawesome-free</span>
                    <a href="https://www.npmjs.com/package/@fortawesome/fontawesome-free" target="_blank" class="text-brand-blue hover:underline flex-shrink-0">
                      <font-awesome-icon icon="arrow-up-right-from-square" class="mr-0.5" />npmjs.com
                    </a>
                  </div>
                  <div class="flex items-center gap-2 text-xs">
                    <span class="inline-flex items-center justify-center w-16 px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold flex-shrink-0">CSS</span>
                    <span class="text-slate-500 flex-1 min-w-0">all.min.css / fontawesome.min.css / solid.min.css</span>
                    <a href="https://cdnjs.com/libraries/font-awesome" target="_blank" class="text-brand-blue hover:underline flex-shrink-0">
                      <font-awesome-icon icon="arrow-up-right-from-square" class="mr-0.5" />cdnjs
                    </a>
                  </div>
                  <div class="flex items-center gap-2 text-xs">
                    <span class="inline-flex items-center justify-center w-16 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold flex-shrink-0">JS</span>
                    <span class="text-slate-500 flex-1 min-w-0">all.min.js / fontawesome.min.js / solid.min.js</span>
                    <a href="https://cdnjs.com/libraries/font-awesome" target="_blank" class="text-brand-blue hover:underline flex-shrink-0">
                      <font-awesome-icon icon="arrow-up-right-from-square" class="mr-0.5" />cdnjs
                    </a>
                  </div>
                  <div class="flex items-center gap-2 text-xs">
                    <span class="inline-flex items-center justify-center w-16 px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 font-semibold flex-shrink-0">字体</span>
                    <span class="text-slate-500 flex-1 min-w-0">fa-solid-900.woff2 / fa-regular-400.woff2 / fa-brands-400.woff2</span>
                    <a href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.3.0/webfonts/" target="_blank" class="text-brand-blue hover:underline flex-shrink-0">
                      <font-awesome-icon icon="arrow-up-right-from-square" class="mr-0.5" />webfonts
                    </a>
                  </div>
                  <div class="flex items-center gap-2 text-xs">
                    <span class="inline-flex items-center justify-center w-16 px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold flex-shrink-0">官网</span>
                    <span class="text-slate-500 flex-1 min-w-0">Font Awesome 官方文档与图标搜索</span>
                    <a href="https://fontawesome.com/download" target="_blank" class="text-brand-blue hover:underline flex-shrink-0">
                      <font-awesome-icon icon="arrow-up-right-from-square" class="mr-0.5" />fontawesome.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { ElMessage } from 'element-plus';
import { Search as SearchIcon } from '@element-plus/icons-vue';
import rawCategories from '@/data/fa-categories.json';

// ── Register ALL free icons into the FA library ──
library.add(fas, far, fab);

// ══════════════════════════════════════════════════════
// Category Chinese labels & representative icons
// ══════════════════════════════════════════════════════
const CATEGORY_CN = {
  'accessibility': { cn: '无障碍', icon: 'universal-access' },
  'alert': { cn: '警告提醒', icon: 'triangle-exclamation' },
  'alphabet': { cn: '字母', icon: 'font' },
  'animals': { cn: '动物', icon: 'paw' },
  'arrows': { cn: '箭头方向', icon: 'arrows-up-down-left-right' },
  'astronomy': { cn: '天文星座', icon: 'moon' },
  'automotive': { cn: '汽车交通', icon: 'car' },
  'buildings': { cn: '建筑场所', icon: 'building' },
  'business': { cn: '商业办公', icon: 'briefcase' },
  'camping': { cn: '露营户外', icon: 'campground' },
  'charity': { cn: '慈善公益', icon: 'hand-holding-heart' },
  'charts-diagrams': { cn: '图表', icon: 'chart-pie' },
  'childhood': { cn: '儿童', icon: 'child' },
  'clothing-fashion': { cn: '服饰时尚', icon: 'shirt' },
  'coding': { cn: '编程开发', icon: 'code' },
  'communication': { cn: '通讯沟通', icon: 'comment-dots' },
  'connectivity': { cn: '网络连接', icon: 'wifi' },
  'construction': { cn: '建筑施工', icon: 'helmet-safety' },
  'design': { cn: '设计', icon: 'paintbrush' },
  'devices-hardware': { cn: '设备硬件', icon: 'laptop' },
  'disaster': { cn: '灾害危机', icon: 'house-flood-water' },
  'editing': { cn: '编辑', icon: 'pen-to-square' },
  'education': { cn: '教育', icon: 'graduation-cap' },
  'emoji': { cn: '表情', icon: 'face-smile' },
  'energy': { cn: '能源', icon: 'bolt' },
  'files': { cn: '文件', icon: 'file' },
  'film-video': { cn: '影视', icon: 'film' },
  'food-beverage': { cn: '餐饮食物', icon: 'utensils' },
  'fruits-vegetables': { cn: '果蔬', icon: 'apple-whole' },
  'gaming': { cn: '游戏', icon: 'gamepad' },
  'gender': { cn: '性别', icon: 'venus-mars' },
  'halloween': { cn: '万圣节', icon: 'ghost' },
  'hands': { cn: '手势', icon: 'hand' },
  'holidays': { cn: '节日假期', icon: 'gifts' },
  'household': { cn: '家居生活', icon: 'couch' },
  'humanitarian': { cn: '人道主义', icon: 'people-carry-box' },
  'logistics': { cn: '物流运输', icon: 'truck-fast' },
  'maps': { cn: '地图定位', icon: 'map-location-dot' },
  'maritime': { cn: '航海', icon: 'anchor' },
  'marketing': { cn: '营销推广', icon: 'bullhorn' },
  'mathematics': { cn: '数学', icon: 'calculator' },
  'media-playback': { cn: '媒体播放', icon: 'circle-play' },
  'medical-health': { cn: '医疗健康', icon: 'stethoscope' },
  'money': { cn: '金融货币', icon: 'money-bill' },
  'moving': { cn: '搬迁', icon: 'truck-moving' },
  'music-audio': { cn: '音乐音频', icon: 'music' },
  'nature': { cn: '自然植物', icon: 'leaf' },
  'numbers': { cn: '数字', icon: 'hashtag' },
  'photos-images': { cn: '照片图片', icon: 'image' },
  'political': { cn: '政治', icon: 'landmark-dome' },
  'punctuation-symbols': { cn: '标点符号', icon: 'percent' },
  'religion': { cn: '宗教', icon: 'place-of-worship' },
  'science': { cn: '科学', icon: 'flask' },
  'science-fiction': { cn: '科幻', icon: 'rocket' },
  'security': { cn: '安全', icon: 'shield-halved' },
  'shapes': { cn: '形状', icon: 'shapes' },
  'shopping': { cn: '购物电商', icon: 'cart-shopping' },
  'social': { cn: '社交互动', icon: 'thumbs-up' },
  'spinners': { cn: '加载动画', icon: 'spinner' },
  'sports-fitness': { cn: '运动健身', icon: 'dumbbell' },
  'text-formatting': { cn: '文字排版', icon: 'bold' },
  'time': { cn: '时间日历', icon: 'clock' },
  'toggle': { cn: '开关切换', icon: 'toggle-on' },
  'transportation': { cn: '交通工具', icon: 'train' },
  'travel-hotel': { cn: '旅行住宿', icon: 'suitcase-rolling' },
  'users-people': { cn: '用户人物', icon: 'users' },
  'weather': { cn: '天气', icon: 'cloud-sun' },
  'writing': { cn: '写作', icon: 'pen' },
};

// ── Style helpers ──
function styleToPrefixShort(style) {
  if (style === 'solid') return 'fas';
  if (style === 'regular') return 'far';
  if (style === 'brands') return 'fab';
  return 'fas';
}

function styleShort(style) {
  if (style === 'solid') return 'S';
  if (style === 'regular') return 'R';
  if (style === 'brands') return 'B';
  return '?';
}

function styleBadgeClass(style) {
  if (style === 'solid') return 'badge-solid';
  if (style === 'regular') return 'badge-regular';
  if (style === 'brands') return 'badge-brands';
  return '';
}

// Pick preferred display prefix: solid > regular > brands
function preferredPrefix(styles) {
  if (styles.includes('solid')) return 'fas';
  if (styles.includes('regular')) return 'far';
  if (styles.includes('brands')) return 'fab';
  return 'fas';
}

// ── Build category data with display prefixes ──
const categoryData = rawCategories.map((cat) => ({
  ...cat,
  icons: cat.icons.map((ic) => ({
    ...ic,
    displayPrefix: preferredPrefix(ic.styles),
  })),
}));

// ── Compute unique total icon count ──
const totalCount = computed(() => {
  const seen = new Set();
  for (const cat of categoryData) {
    for (const ic of cat.icons) {
      seen.add(ic.name);
    }
  }
  return seen.size;
});

// ── Search & expand state ──
const search = ref('');
const expanded = reactive({});

// Initialize all collapsed
for (const cat of categoryData) {
  expanded[cat.key] = false;
}

const filteredCategories = computed(() => {
  const q = search.value.trim().toLowerCase();

  const cats = q
    ? categoryData
        .map((cat) => {
          const filtered = cat.icons.filter(
            (ic) => ic.name.includes(q) || ic.unicode.includes(q),
          );
          return filtered.length > 0
            ? { ...cat, icons: filtered, iconCount: filtered.length }
            : null;
        })
        .filter(Boolean)
    : categoryData.map((cat) => ({
        ...cat,
        iconCount: cat.icons.length,
      }));

  // When searching, auto-expand all
  if (q) {
    for (const cat of cats) {
      expanded[cat.key] = true;
    }
  }

  return cats;
});

function toggleCategory(key) {
  expanded[key] = !expanded[key];
}

function getCategoryLabel(key) {
  return CATEGORY_CN[key]?.cn || key;
}

function getCategoryIcon(key) {
  return CATEGORY_CN[key]?.icon || 'icons';
}

// ── Detail Dialog ──
const detailVisible = ref(false);
const detailIcon = ref(null);
const detailStyle = ref('solid');
const usageTab = ref('html');

function openDetail(ic) {
  detailIcon.value = ic;
  detailStyle.value = ic.styles.includes('solid')
    ? 'solid'
    : ic.styles[0] || 'solid';
  usageTab.value = 'html';
  detailVisible.value = true;
}

// JS prefix for vue-fontawesome component: fas / far / fab
const currentPrefix = computed(() => {
  if (!detailIcon.value) return 'fas';
  return styleToPrefixShort(detailStyle.value);
});

// CSS class for HTML <i> tags: fa-solid / fa-regular / fa-brands
const currentHtmlClass = computed(() => {
  return htmlClassPrefix(currentPrefix.value);
});

function prefixLabel(prefix) {
  if (prefix === 'fas') return 'Solid';
  if (prefix === 'far') return 'Regular';
  if (prefix === 'fab') return 'Brands';
  return prefix;
}

function faOfficialUrl(ic) {
  const style = detailStyle.value || 'solid';
  return `https://fontawesome.com/icons/${ic.name}?style=${style}&f=classic`;
}

// Convert iconName to PascalCase import name: "arrow-right" -> "faArrowRight"
function toPascalCase(name) {
  return 'fa' + name.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

function iconPackage(prefix) {
  if (prefix === 'fas') return '@fortawesome/free-solid-svg-icons';
  if (prefix === 'far') return '@fortawesome/free-regular-svg-icons';
  if (prefix === 'fab') return '@fortawesome/free-brands-svg-icons';
  return '@fortawesome/free-solid-svg-icons';
}

// FA 7 CSS class: fa-solid / fa-regular / fa-brands (used in HTML <i> tags)
function htmlClassPrefix(prefix) {
  if (prefix === 'fas') return 'fa-solid';
  if (prefix === 'far') return 'fa-regular';
  if (prefix === 'fab') return 'fa-brands';
  return 'fa-solid';
}

function fontFamily(prefix) {
  if (prefix === 'fas') return "'Font Awesome 7 Free'";
  if (prefix === 'far') return "'Font Awesome 7 Free'";
  if (prefix === 'fab') return "'Font Awesome 7 Brands'";
  return "'Font Awesome 7 Free'";
}

function fontWeight(prefix) {
  if (prefix === 'fas') return '900';
  if (prefix === 'far') return '400';
  if (prefix === 'fab') return '400';
  return '900';
}

// ── Code snippets (computed) ──
const htmlCdnCode = computed(() => {
  if (!detailIcon.value) return '';
  return `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.3.0/css/all.min.css">`;
});

const htmlUsageCode = computed(() => {
  if (!detailIcon.value) return '';
  const ic = detailIcon.value;
  const pfx = currentPrefix.value;
  return `<i class="${htmlClassPrefix(pfx)} fa-${ic.name}"></i>\n\n<!-- 设置大小 -->\n<i class="${htmlClassPrefix(pfx)} fa-${ic.name} fa-lg"></i>\n<i class="${htmlClassPrefix(pfx)} fa-${ic.name} fa-2x"></i>\n<i class="${htmlClassPrefix(pfx)} fa-${ic.name} fa-3x"></i>`;
});

const vueInstallCode = computed(() => {
  if (!detailIcon.value) return '';
  return `npm install @fortawesome/fontawesome-svg-core\nnpm install ${iconPackage(currentPrefix.value)}\nnpm install @fortawesome/vue-fontawesome@latest-3`;
});

const vueRegisterCode = computed(() => {
  if (!detailIcon.value) return '';
  const ic = detailIcon.value;
  const pascal = toPascalCase(ic.name);
  return `import { library } from '@fortawesome/fontawesome-svg-core'\nimport { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'\nimport { ${pascal} } from '${iconPackage(currentPrefix.value)}'\n\nlibrary.add(${pascal})\n\n// 在 createApp 后注册组件\napp.component('font-awesome-icon', FontAwesomeIcon)`;
});

const vueTemplateCode = computed(() => {
  if (!detailIcon.value) return '';
  const ic = detailIcon.value;
  const pfx = currentPrefix.value;
  return `<!-- 基本用法 -->\n<font-awesome-icon icon="${ic.name}" />\n\n<!-- 指定前缀 -->\n<font-awesome-icon :icon="['${pfx}', '${ic.name}']" />\n\n<!-- 设置大小 -->\n<font-awesome-icon icon="${ic.name}" size="lg" />\n<font-awesome-icon icon="${ic.name}" size="2x" />`;
});

const reactInstallCode = computed(() => {
  if (!detailIcon.value) return '';
  return `npm install @fortawesome/fontawesome-svg-core\nnpm install ${iconPackage(currentPrefix.value)}\nnpm install @fortawesome/react-fontawesome`;
});

const reactUsageCode = computed(() => {
  if (!detailIcon.value) return '';
  const ic = detailIcon.value;
  const pascal = toPascalCase(ic.name);
  return `import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'\nimport { ${pascal} } from '${iconPackage(currentPrefix.value)}'\n\n// JSX 中使用\n<FontAwesomeIcon icon={${pascal}} />\n\n// 设置大小\n<FontAwesomeIcon icon={${pascal}} size="lg" />\n<FontAwesomeIcon icon={${pascal}} size="2x" />`;
});

const cssUsageCode = computed(() => {
  if (!detailIcon.value) return '';
  const ic = detailIcon.value;
  const pfx = currentPrefix.value;
  const uc = ic.unicode || '?';
  return `.icon-${ic.name}::before {\n  font-family: ${fontFamily(pfx)};\n  font-weight: ${fontWeight(pfx)};\n  content: "\\${uc}";\n}`;
});

// ── Webfont 字体方案 code snippets ──
const webfontInstallCode = computed(() => {
  return `npm install @fortawesome/fontawesome-free`;
});

const webfontImportCode = computed(() => {
  return `// main.js / main.ts 入口文件\nimport '@fortawesome/fontawesome-free/css/all.min.css';\n\n// 或者按需引入（减小体积）\nimport '@fortawesome/fontawesome-free/css/fontawesome.min.css';\nimport '@fortawesome/fontawesome-free/css/solid.min.css';    // fa-solid 实心图标\nimport '@fortawesome/fontawesome-free/css/regular.min.css';  // fa-regular 线框图标\nimport '@fortawesome/fontawesome-free/css/brands.min.css';   // fa-brands 品牌图标`;
});

const webfontHtmlCode = computed(() => {
  if (!detailIcon.value) return '';
  const ic = detailIcon.value;
  const pfx = currentPrefix.value;
  return `<!-- 基本用法 -->\n<i class="${htmlClassPrefix(pfx)} fa-${ic.name}"></i>\n\n<!-- 设置大小 -->\n<i class="${htmlClassPrefix(pfx)} fa-${ic.name} fa-lg"></i>\n<i class="${htmlClassPrefix(pfx)} fa-${ic.name} fa-2x"></i>\n<i class="${htmlClassPrefix(pfx)} fa-${ic.name} fa-3x"></i>\n\n<!-- 设置颜色 -->\n<i class="${htmlClassPrefix(pfx)} fa-${ic.name}" style="color: #0032a0;"></i>`;
});

const webfontCssCode = computed(() => {
  if (!detailIcon.value) return '';
  const ic = detailIcon.value;
  const pfx = currentPrefix.value;
  const uc = ic.unicode || '?';
  return `/* CSS 伪元素用法（需要先引入 webfont CSS） */\n.icon-${ic.name}::before {\n  font-family: ${fontFamily(pfx)};\n  font-weight: ${fontWeight(pfx)};\n  content: "\\${uc}";\n}`;
});

const webfontCdnCode = computed(() => {
  return `<!-- 方式一：CSS 字体方案（推荐） -->\n<link rel="stylesheet"\n  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.3.0/css/all.min.css"\n  integrity="sha384-..." crossorigin="anonymous" />\n\n<!-- 方式二：JS 方案（自动将 <i> 替换为 SVG） -->\n<script defer\n  src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.3.0/js/all.min.js"\n  integrity="sha384-..." crossorigin="anonymous"><\/script>`;
});

async function copyText(text) {
  const raw = typeof text === 'object' && text?.value !== undefined ? text.value : text;
  try {
    await navigator.clipboard.writeText(raw);
    ElMessage({ message: '已复制到剪贴板', type: 'success', duration: 1500 });
  } catch {
    ElMessage({ message: '复制失败，请手动复制', type: 'warning' });
  }
}
</script>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 4px;
}

.icon-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.icon-card:hover {
  background: #f0f9ff;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.icon-card:hover .icon-preview {
  color: var(--brand-blue, #2563eb);
  transform: scale(1.15);
}

.icon-preview {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #334155;
  transition: all 0.15s ease;
}

.icon-name {
  margin-top: 6px;
  font-size: 11px;
  color: #475569;
  text-align: center;
  word-break: break-all;
  line-height: 1.3;
  max-width: 100%;
}

.icon-meta {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 3px;
}

.icon-unicode {
  font-size: 10px;
  color: #94a3b8;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
}

.style-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 0 3px;
  border-radius: 3px;
  line-height: 1.5;
}

.badge-solid {
  background: #dbeafe;
  color: #1e40af;
}

.badge-regular {
  background: #e0e7ff;
  color: #4338ca;
}

.badge-brands {
  background: #fef3c7;
  color: #92400e;
}

/* Detail Dialog */
.detail-body {
  padding: 0 4px;
}

.detail-preview-box {
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border-radius: 16px;
  flex-shrink: 0;
  border: 1px solid #bae6fd;
}

.detail-preview-icon {
  font-size: 42px;
  color: #1e40af;
}

/* Usage Tabs */
.usage-section {
  padding: 8px 0;
}

.usage-desc {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 12px;
  line-height: 1.6;
}

.usage-desc code {
  background: #f1f5f9;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #0f172a;
}

.code-block {
  background: #1e293b;
  border-radius: 8px;
  overflow: hidden;
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #334155;
  font-size: 12px;
  color: #94a3b8;
}

.code-header :deep(.el-button) {
  color: #93c5fd !important;
  font-size: 12px;
}

.code-block pre {
  margin: 0;
  padding: 12px 16px;
  overflow-x: auto;
}

.code-block code {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Menlo', monospace;
  font-size: 12.5px;
  line-height: 1.6;
  color: #e2e8f0;
  white-space: pre;
}

/* ========== Icon Detail Dialog: responsive size + scrollable body ========== */
:global(.icon-detail-dialog) {
  max-width: 900px;
}
:global(.icon-detail-dialog .el-dialog__body) {
  max-height: calc(90vh - 120px);
  overflow-y: auto;
  padding-top: 16px;
  padding-bottom: 16px;
}
</style>
