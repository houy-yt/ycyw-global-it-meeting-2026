<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h3 class="text-lg font-semibold text-brand-deep">FA图标库</h3>
        <p class="text-sm text-slate-500 mt-1">
          Font Awesome 免费图标合集，共
          <span class="font-semibold text-brand-blue">{{ totalCount }}</span> 个图标
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

    <!-- Category sections (Solid / Regular / Brands) -->
    <div v-for="cat in filteredCategories" :key="cat.name" class="mb-6">
      <!-- Top-level Category Header -->
      <div
        class="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-100 to-slate-50 rounded-lg cursor-pointer select-none hover:from-slate-200 hover:to-slate-100 transition-all border border-slate-200/60"
        @click="toggleCategory(cat.name)"
      >
        <div class="flex items-center gap-2.5">
          <font-awesome-icon :icon="topCategoryIcon(cat.name)" class="text-brand-blue" />
          <span class="font-bold text-slate-700 text-base">{{ cat.label }}</span>
          <span class="text-xs text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full font-medium">
            {{ cat.totalIconCount }}
          </span>
        </div>
        <font-awesome-icon
          :icon="expanded[cat.name] ? 'chevron-up' : 'chevron-right'"
          class="text-xs text-slate-400 transition-transform"
        />
      </div>

      <!-- Subcategories -->
      <div v-show="expanded[cat.name]" class="mt-2 ml-2">
        <div v-for="sub in cat.subcategories" :key="sub.key" class="mb-3">
          <!-- Subcategory Header -->
          <div
            class="flex items-center justify-between px-3 py-2 bg-white rounded-md cursor-pointer select-none hover:bg-blue-50/50 transition-colors border-l-3 border-blue-400/40"
            @click="toggleSub(cat.name + '.' + sub.key)"
          >
            <div class="flex items-center gap-2">
              <span class="text-base">{{ sub.emoji }}</span>
              <span class="font-semibold text-slate-600 text-sm">{{ sub.label }}</span>
              <span class="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full font-medium">
                {{ sub.icons.length }}
              </span>
            </div>
            <font-awesome-icon
              :icon="expandedSub[cat.name + '.' + sub.key] ? 'chevron-up' : 'chevron-right'"
              class="text-[10px] text-slate-300 transition-transform"
            />
          </div>

          <!-- Icons Grid -->
          <div
            v-show="expandedSub[cat.name + '.' + sub.key]"
            class="icon-grid mt-2 ml-4"
          >
            <div
              v-for="ic in sub.icons"
              :key="ic.prefix + '-' + ic.iconName"
              class="icon-card"
              :title="ic.prefix + ' fa-' + ic.iconName"
              @click="openDetail(ic)"
            >
              <div class="icon-preview">
                <font-awesome-icon :icon="[ic.prefix, ic.iconName]" />
              </div>
              <div class="icon-name">{{ ic.iconName }}</div>
              <div class="icon-unicode">{{ ic.unicode }}</div>
            </div>
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
      :title="detailIcon ? 'fa-' + detailIcon.iconName : ''"
      width="680px"
      destroy-on-close
      class="icon-detail-dialog"
    >
      <div v-if="detailIcon" class="detail-body">
        <!-- Preview & Info -->
        <div class="flex items-start gap-6 mb-6">
          <div class="detail-preview-box">
            <font-awesome-icon :icon="[detailIcon.prefix, detailIcon.iconName]" class="detail-preview-icon" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-xl font-bold text-slate-800 mb-1">{{ detailIcon.iconName }}</h3>
            <div class="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-3">
              <el-tag size="small" type="info">{{ prefixLabel(detailIcon.prefix) }}</el-tag>
              <span class="font-mono text-xs text-slate-400">Unicode: {{ detailIcon.unicode || 'N/A' }}</span>
            </div>
            <!-- Action buttons -->
            <div class="flex flex-wrap gap-2">
              <el-button size="small" type="primary" @click="copyText('fa-' + detailIcon.iconName)">
                <font-awesome-icon icon="clipboard-check" class="mr-1" /> 复制类名
              </el-button>
              <el-button size="small" @click="copyText(detailIcon.prefix + ' fa-' + detailIcon.iconName)">
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
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, shallowRef } from 'vue';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { ElMessage } from 'element-plus';
import { Search as SearchIcon } from '@element-plus/icons-vue';

// ── Register ALL free icons into the FA library ──
library.add(fas, far, fab);

// ══════════════════════════════════════════════════════
// Subcategory definitions with keyword matchers
// An icon can appear in multiple subcategories.
//
// Matching rules:
// - Keywords are matched against icon name SEGMENTS (split by "-")
// - Single-word keyword: must match a whole segment exactly
//   e.g. "glass" matches "wine-glass" (segment "glass") but NOT "hourglass" (single segment)
// - Multi-word keyword (contains "-"): must match a contiguous run of segments
//   e.g. "wine-glass" matches "wine-glass-empty" but NOT "magnifying-glass"
// ══════════════════════════════════════════════════════
const SUBCATEGORY_DEFS = [
  {
    key: 'food-dining',
    emoji: '🍽️',
    label: '餐饮食物',
    keywords: [
      'utensils', 'pizza', 'burger', 'coffee', 'mug', 'beer',
      'lemon', 'pepper', 'egg', 'bread', 'cheese', 'cake', 'cookie',
      'ice-cream', 'candy', 'bowl', 'plate', 'spoon', 'kitchen', 'blender',
      'carrot', 'drumstick', 'hotdog', 'champagne', 'bottle', 'wheat',
      'bacon', 'stroopwafel', 'jar', 'olive',
      'wine-glass', 'wine-bottle', 'martini-glass', 'whiskey-glass',
      'champagne-glasses', 'glass-water', 'beer-mug',
      'mug-hot', 'mug-saucer', 'pizza-slice', 'pepper-hot',
      'candy-cane', 'bowl-food', 'bowl-rice', 'cookie-bite',
      'ice-cream', 'apple-whole', 'seedling',
    ],
  },
  {
    key: 'transport',
    emoji: '🚗',
    label: '交通出行',
    keywords: [
      'car', 'bus', 'truck', 'plane', 'train', 'bicycle', 'bike',
      'ship', 'taxi', 'helicopter', 'rocket', 'shuttle', 'van',
      'motorcycle', 'subway', 'ferry', 'jet', 'sailboat', 'anchor',
      'gas-pump', 'road', 'route', 'trailer', 'suitcase', 'passport',
      'luggage', 'transit', 'car-side', 'car-rear', 'car-tunnel',
      'car-burst', 'car-battery', 'truck-fast', 'truck-medical',
      'truck-monster', 'truck-pickup', 'plane-departure', 'plane-arrival',
      'plane-up', 'train-subway', 'train-tram',
      'cart-flatbed', 'cart-flatbed-suitcase',
    ],
  },
  {
    key: 'building',
    emoji: '🏢',
    label: '建筑场所',
    keywords: [
      'building', 'house', 'hospital', 'school', 'hotel', 'church',
      'warehouse', 'city', 'mosque', 'synagogue', 'landmark', 'monument',
      'industry', 'factory', 'garage', 'barn', 'tent', 'igloo',
      'cabin', 'castle', 'palace', 'temple', 'kaaba', 'torii-gate',
      'gopuram', 'vihara', 'dungeon', 'archway',
      'house-chimney', 'house-medical', 'house-user', 'house-flag',
      'house-flood-water', 'house-fire', 'house-laptop',
      'building-columns', 'building-flag', 'building-shield',
      'store-slash', 'shop-slash', 'shop-lock',
    ],
  },
  {
    key: 'user-people',
    emoji: '👤',
    label: '用户人物',
    keywords: [
      'user', 'person', 'people', 'child', 'baby', 'children',
      'skull', 'handshake', 'wheelchair', 'accessibility',
      'universal-access', 'restroom', 'mars', 'venus', 'transgender',
      'neuter', 'head-side', 'person-walking', 'person-running',
      'person-biking', 'person-swimming', 'person-hiking',
      'person-skating', 'person-skiing', 'person-snowboarding',
      'person-praying', 'person-dress', 'person-cane',
      'person-pregnant', 'person-breastfeeding', 'person-shelter',
      'users', 'user-group', 'user-plus', 'user-minus',
      'user-check', 'user-xmark', 'user-pen', 'user-gear',
      'user-shield', 'user-lock', 'user-tag', 'user-tie',
      'user-nurse', 'user-doctor', 'user-astronaut', 'user-ninja',
      'user-secret', 'user-injured', 'user-graduate',
    ],
  },
  {
    key: 'tech-device',
    emoji: '💻',
    label: '技术设备',
    keywords: [
      'computer', 'laptop', 'tablet', 'keyboard', 'desktop',
      'server', 'database', 'hard-drive', 'microchip', 'memory',
      'ethernet', 'wifi', 'satellite', 'robot', 'code', 'terminal',
      'display', 'screen', 'monitor', 'tv', 'floppy', 'disk',
      'usb', 'print', 'hdd', 'ssd', 'network',
      'mobile', 'sim-card', 'sd-card',
      'laptop-code', 'laptop-file', 'laptop-medical',
      'computer-mouse', 'phone-flip', 'phone-slash',
      'mobile-screen', 'mobile-button', 'mobile-retro',
      'satellite-dish', 'tower-cell', 'tower-broadcast',
      'code-branch', 'code-commit', 'code-compare',
      'code-fork', 'code-merge', 'code-pull-request',
    ],
  },
  {
    key: 'business-chart',
    emoji: '📊',
    label: '商业图表',
    keywords: [
      'chart', 'money', 'dollar', 'euro', 'pound', 'yen',
      'rupee', 'ruble', 'won', 'lira', 'franc', 'peso',
      'credit', 'bank', 'briefcase', 'coins', 'wallet', 'cash',
      'piggy', 'sack', 'percent', 'calculator',
      'analytics', 'trend', 'stock', 'invoice',
      'chart-line', 'chart-bar', 'chart-pie', 'chart-area',
      'chart-column', 'chart-gantt', 'chart-simple',
      'money-bill', 'money-check', 'money-bills',
      'file-invoice', 'file-invoice-dollar',
      'scale-balanced', 'scale-unbalanced',
      'hand-holding-dollar', 'sack-dollar', 'sack-xmark',
      'piggy-bank', 'landmark-dome', 'vault',
      'cash-register', 'receipt', 'coins',
      'circle-dollar-to-slot', 'dollar-sign', 'cent-sign',
      'sterling-sign', 'euro-sign', 'yen-sign',
      'rupee-sign', 'ruble-sign', 'won-sign',
      'bitcoin-sign', 'indian-rupee-sign',
    ],
  },
  {
    key: 'media',
    emoji: '🎵',
    label: '音乐媒体',
    keywords: [
      'music', 'film', 'video', 'camera', 'image', 'photo',
      'pause', 'record', 'microphone', 'volume', 'speaker',
      'headphones', 'headset', 'radio', 'podcast', 'compact-disc',
      'dvd', 'cinema', 'clapperboard', 'guitar', 'drum',
      'circle-play', 'circle-pause', 'circle-stop',
      'play', 'stop', 'forward', 'backward',
      'forward-step', 'forward-fast', 'backward-step', 'backward-fast',
      'camera-retro', 'camera-rotate', 'video-slash',
      'film-simple', 'images', 'photo-film',
      'volume-high', 'volume-low', 'volume-off', 'volume-xmark',
      'music-note', 'itunes-note', 'spotify',
    ],
  },
  {
    key: 'tools-settings',
    emoji: '⚙️',
    label: '工具设置',
    keywords: [
      'gear', 'gears', 'wrench', 'screwdriver', 'hammer', 'toolbox',
      'slider', 'sliders', 'toggle', 'paintbrush', 'paint-roller',
      'brush', 'ruler', 'drafting-compass', 'tape',
      'screwdriver-wrench', 'gear', 'gears',
      'toggle-on', 'toggle-off',
      'filter', 'filter-circle-dollar', 'filter-circle-xmark',
      'wrench', 'tools',
    ],
  },
  {
    key: 'weather-nature',
    emoji: '🌤️',
    label: '天气自然',
    keywords: [
      'sun', 'moon', 'cloud', 'rain', 'snow', 'wind', 'tree',
      'leaf', 'water', 'droplet', 'fire', 'bolt', 'temperature',
      'thermometer', 'rainbow', 'umbrella', 'tornado', 'hurricane',
      'flood', 'volcano', 'mountain', 'wave', 'tsunami', 'icicle',
      'smog', 'snowflake', 'meteor', 'comet', 'earth', 'globe',
      'paw', 'feather', 'spider', 'worm', 'frog', 'dove', 'crow',
      'dragon', 'horse', 'cat', 'dog', 'otter', 'hippo', 'kiwi',
      'locust', 'mosquito', 'shrimp', 'fish',
      'cloud-sun', 'cloud-moon', 'cloud-rain', 'cloud-bolt',
      'cloud-showers-heavy', 'cloud-showers-water',
      'cloud-sun-rain', 'cloud-moon-rain',
      'cloud-meatball', 'cloud-arrow-up', 'cloud-arrow-down',
      'sun-plant-wilt', 'temperature-high', 'temperature-low',
      'temperature-half', 'temperature-full', 'temperature-empty',
      'wind', 'fire-flame-curved', 'fire-flame-simple',
      'tree-city', 'leaf-maple',
    ],
  },
  {
    key: 'edit-document',
    emoji: '✏️',
    label: '编辑文档',
    keywords: [
      'pen', 'pencil', 'edit', 'file', 'folder', 'clipboard', 'book',
      'paper', 'note', 'signature', 'eraser', 'highlight',
      'copy', 'paste', 'scissors', 'floppy-disk',
      'newspaper', 'scroll', 'envelope', 'inbox', 'stamp',
      'pen-to-square', 'pen-nib', 'pen-clip', 'pen-fancy',
      'pen-ruler', 'pencil',
      'file-lines', 'file-pdf', 'file-word', 'file-excel',
      'file-powerpoint', 'file-image', 'file-video',
      'file-audio', 'file-code', 'file-zipper',
      'file-circle-plus', 'file-circle-minus',
      'file-circle-check', 'file-circle-xmark',
      'file-arrow-up', 'file-arrow-down',
      'file-export', 'file-import', 'file-contract',
      'file-signature', 'file-prescription',
      'folder-open', 'folder-plus', 'folder-minus',
      'folder-tree', 'folder-closed',
      'clipboard-list', 'clipboard-check',
      'clipboard-question', 'clipboard-user',
      'book-open', 'book-open-reader', 'book-bookmark',
      'book-atlas', 'book-bible', 'book-journal-whills',
      'book-medical', 'book-quran', 'book-skull',
      'book-tanakh', 'bookmark',
      'note-sticky', 'note-medical', 'notes-medical',
      'envelope-open', 'envelope-circle-check',
      'paper-plane', 'paperclip',
    ],
  },
  {
    key: 'security',
    emoji: '🔒',
    label: '安全标识',
    keywords: [
      'lock', 'unlock', 'shield', 'key', 'eye', 'ban',
      'check', 'xmark', 'fingerprint', 'mask', 'virus',
      'lock-open', 'shield-halved', 'shield-heart',
      'shield-virus', 'shield-cat', 'shield-dog',
      'key-skeleton', 'eye-slash', 'eye-dropper',
      'triangle-exclamation', 'circle-exclamation',
      'circle-check', 'circle-xmark', 'square-check',
      'radiation', 'biohazard', 'skull-crossbones',
      'id-card', 'id-card-clip', 'id-badge',
      'user-shield', 'user-lock',
      'lock-hashtag', 'file-shield',
      'bug', 'bug-slash', 'virus-slash', 'virus-covid',
      'virus-covid-slash', 'shield-blank',
    ],
  },
  {
    key: 'social-emotion',
    emoji: '❤️',
    label: '社交情感',
    keywords: [
      'heart', 'star', 'thumbs', 'comment', 'share',
      'bell', 'bullhorn', 'megaphone', 'rss',
      'face-smile', 'face-angry', 'face-sad-tear', 'face-sad-cry',
      'face-laugh', 'face-laugh-wink', 'face-laugh-beam',
      'face-laugh-squint', 'face-grin', 'face-grin-wide',
      'face-grin-beam', 'face-grin-beam-sweat',
      'face-grin-hearts', 'face-grin-squint',
      'face-grin-squint-tears', 'face-grin-stars',
      'face-grin-tears', 'face-grin-tongue',
      'face-grin-tongue-squint', 'face-grin-tongue-wink',
      'face-grin-wink', 'face-kiss', 'face-kiss-beam',
      'face-kiss-wink-heart', 'face-meh', 'face-meh-blank',
      'face-rolling-eyes', 'face-surprise',
      'face-dizzy', 'face-flushed', 'face-frown',
      'face-frown-open', 'face-grimace',
      'face-tired', 'face-angry',
      'heart-crack', 'heart-circle-bolt', 'heart-circle-check',
      'heart-circle-exclamation', 'heart-circle-minus',
      'heart-circle-plus', 'heart-circle-xmark',
      'heart-pulse', 'star-half', 'star-half-stroke',
      'star-of-life', 'star-of-david',
      'thumbs-up', 'thumbs-down',
      'comment-dots', 'comment-slash', 'comment-medical',
      'comments', 'message',
      'share-nodes', 'share-from-square',
      'bell-slash', 'bell-concierge',
    ],
  },
  {
    key: 'medical',
    emoji: '🏥',
    label: '医疗健康',
    keywords: [
      'stethoscope', 'pills', 'capsules', 'syringe', 'vial', 'vials',
      'prescription', 'ambulance', 'bandage', 'lungs', 'brain',
      'tooth', 'dna', 'microscope', 'flask', 'bone', 'crutch',
      'blood', 'droplet',
      'heart-pulse', 'hand-holding-medical',
      'staff-snake', 'notes-medical', 'file-medical',
      'briefcase-medical', 'pump-medical', 'kit-medical',
      'house-medical', 'house-chimney-medical',
      'truck-medical', 'laptop-medical', 'book-medical',
      'comment-medical', 'clipboard-medical',
      'suitcase-medical', 'star-of-life',
      'prescription-bottle', 'prescription-bottle-medical',
      'hospital-user', 'user-doctor', 'user-nurse',
      'bed-pulse', 'x-ray', 'disease',
      'virus', 'virus-covid', 'virus-slash',
      'bacteria', 'bacterium',
      'biohazard', 'radiation',
    ],
  },
  {
    key: 'gaming',
    emoji: '🎮',
    label: '游戏娱乐',
    keywords: [
      'gamepad', 'dice', 'puzzle', 'chess', 'trophy', 'medal',
      'award', 'crown', 'ghost', 'dungeon', 'gem',
      'clover', 'futbol', 'soccer',
      'dice-one', 'dice-two', 'dice-three', 'dice-four',
      'dice-five', 'dice-six', 'dice-d6', 'dice-d20',
      'chess-rook', 'chess-knight', 'chess-bishop',
      'chess-queen', 'chess-king', 'chess-pawn',
      'chess-board',
      'puzzle-piece',
      'hat-wizard', 'wand-magic', 'wand-magic-sparkles',
      'wand-sparkles',
      'football', 'baseball', 'baseball-bat-ball',
      'basketball', 'volleyball', 'golf-ball-tee',
      'table-tennis-paddle-ball', 'hockey-puck',
      'bowling-ball', 'medal-star',
      'ranking-star', 'trophy-star',
    ],
  },
  {
    key: 'arrows-direction',
    emoji: '🧭',
    label: '箭头方向',
    keywords: [
      'arrow', 'chevron', 'angle', 'caret', 'sort',
      'expand', 'compress', 'maximize', 'minimize',
      'rotate', 'repeat', 'shuffle',
      'location', 'crosshairs', 'compass',
      'arrows', 'up-down', 'left-right',
      'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
      'arrow-rotate-left', 'arrow-rotate-right',
      'arrows-rotate', 'arrows-spin',
      'arrows-up-down', 'arrows-left-right',
      'arrows-up-down-left-right', 'arrows-to-circle',
      'arrows-to-dot', 'arrows-turn-to-dots',
      'arrows-down-to-line', 'arrows-down-to-people',
      'arrows-left-right-to-line', 'arrows-to-eye',
      'arrows-turn-right', 'arrows-up-to-line',
      'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right',
      'angle-up', 'angle-down', 'angle-left', 'angle-right',
      'angles-up', 'angles-down', 'angles-left', 'angles-right',
      'caret-up', 'caret-down', 'caret-left', 'caret-right',
      'sort-up', 'sort-down',
      'up-down-left-right', 'up-long', 'down-long',
      'left-long', 'right-long',
      'circle-arrow-up', 'circle-arrow-down',
      'circle-arrow-left', 'circle-arrow-right',
      'square-arrow-up-right',
      'up-right-and-down-left-from-center',
      'down-left-and-up-right-to-center',
    ],
  },
  {
    key: 'text-typography',
    emoji: '🔤',
    label: '文字排版',
    keywords: [
      'font', 'text', 'bold', 'italic', 'underline', 'strikethrough',
      'heading', 'paragraph', 'quote', 'indent', 'outdent',
      'superscript', 'subscript', 'spell-check', 'language',
      'align-left', 'align-center', 'align-right', 'align-justify',
      'list-ul', 'list-ol', 'list-check',
      'quote-left', 'quote-right',
      'text-height', 'text-width', 'text-slash',
      'font-awesome',
    ],
  },
  {
    key: 'map-location',
    emoji: '📍',
    label: '地图定位',
    keywords: [
      'map', 'location', 'globe', 'earth', 'compass', 'flag',
      'route', 'crosshairs', 'mountain',
      'map-location', 'map-location-dot', 'map-pin',
      'location-dot', 'location-arrow', 'location-crosshairs',
      'location-pin', 'location-pin-lock',
      'street-view', 'signs-post', 'diamond-turn-to-right',
      'globe-americas', 'globe-europe', 'globe-asia',
      'earth-americas', 'earth-europe', 'earth-asia',
      'earth-africa', 'earth-oceania',
      'flag-usa', 'flag-checkered',
      'map-marked', 'map-marked-alt',
    ],
  },
  {
    key: 'science-education',
    emoji: '🔬',
    label: '科学教育',
    keywords: [
      'atom', 'flask', 'vial', 'vials', 'microscope', 'dna',
      'brain', 'graduation-cap', 'school', 'chalkboard',
      'lightbulb', 'magnet', 'satellite', 'telescope', 'binoculars',
      'calculator', 'infinity',
      'flask-vial', 'chalkboard-user',
      'apple-whole', 'book-open-reader',
      'square-root-variable', 'diagram-project',
      'diagram-next', 'diagram-predecessor',
      'diagram-successor',
    ],
  },
  {
    key: 'shopping',
    emoji: '🛒',
    label: '购物电商',
    keywords: [
      'cart', 'basket', 'gift', 'box', 'barcode', 'qrcode',
      'percent', 'receipt',
      'cart-shopping', 'cart-plus', 'cart-arrow-down',
      'basket-shopping', 'bag-shopping',
      'store', 'shop', 'tags', 'tag',
      'gift-card', 'box-open', 'box-archive',
      'boxes-stacked', 'boxes-packing',
      'truck-fast', 'parachute-box',
      'credit-card', 'cash-register',
      'shopping-bag', 'shopping-cart', 'shopping-basket',
    ],
  },
  {
    key: 'communication',
    emoji: '💬',
    label: '通讯沟通',
    keywords: [
      'phone', 'envelope', 'comment', 'comments', 'message',
      'paper-plane', 'inbox', 'fax', 'headset', 'rss',
      'wifi', 'signal', 'bell', 'bullhorn', 'satellite',
      'phone-volume', 'phone-flip', 'phone-slash',
      'mobile-screen-button',
      'envelope-open', 'envelope-open-text',
      'envelope-circle-check',
      'comment-dots', 'comment-slash',
      'tower-broadcast', 'tower-cell',
      'walkie-talkie', 'voicemail',
      'at', 'hashtag',
    ],
  },
  {
    key: 'time-calendar',
    emoji: '📅',
    label: '时间日历',
    keywords: [
      'clock', 'calendar', 'hourglass', 'timer', 'stopwatch',
      'clock-rotate-left', 'clock-four',
      'calendar-days', 'calendar-week', 'calendar-check',
      'calendar-plus', 'calendar-minus', 'calendar-xmark',
      'hourglass-start', 'hourglass-half', 'hourglass-end',
      'stopwatch-20',
      'business-time', 'timeline',
    ],
  },
  {
    key: 'brands-social',
    emoji: '📱',
    label: '社交媒体',
    keywords: [
      'facebook', 'twitter', 'instagram', 'linkedin', 'youtube',
      'tiktok', 'snapchat', 'pinterest', 'reddit', 'tumblr',
      'whatsapp', 'telegram', 'discord', 'slack', 'wechat',
      'weixin', 'weibo', 'qq', 'viber', 'skype', 'mastodon',
      'threads', 'x-twitter',
      'square-facebook', 'square-twitter', 'square-instagram',
      'square-whatsapp', 'square-youtube', 'square-reddit',
      'square-snapchat', 'square-pinterest',
      'square-tumblr', 'square-vimeo',
      'facebook-messenger', 'facebook-f',
      'twitter-x', 'linkedin-in',
    ],
  },
  {
    key: 'brands-dev',
    emoji: '🛠️',
    label: '开发工具',
    keywords: [
      'github', 'gitlab', 'bitbucket', 'docker', 'jenkins',
      'jira', 'confluence', 'aws', 'digital-ocean',
      'npm', 'yarn', 'node-js', 'python', 'java', 'php',
      'rust', 'golang', 'swift', 'laravel', 'vuejs', 'angular',
      'ember', 'sass', 'less', 'css3', 'html5',
      'js', 'square-js', 'bootstrap', 'wordpress',
      'drupal', 'magento', 'shopify', 'figma', 'sketch',
      'git', 'git-alt', 'square-git',
      'stack-overflow', 'dev', 'codepen',
      'linux', 'ubuntu', 'redhat', 'centos', 'fedora',
      'debian', 'suse', 'freebsd',
      'windows', 'apple', 'android',
      'chrome', 'firefox', 'firefox-browser',
      'safari', 'edge', 'opera', 'internet-explorer', 'brave',
      'react', 'reacteurope',
      'github-alt', 'square-github',
      'docker', 'kubernetes',
      'python', 'r-project',
    ],
  },
  {
    key: 'brands-company',
    emoji: '🏛️',
    label: '品牌公司',
    keywords: [
      'microsoft', 'apple', 'google', 'amazon', 'meta',
      'adobe', 'atlassian', 'salesforce', 'oracle',
      'ibm', 'intel', 'nvidia', 'amd', 'cisco', 'vmware',
      'paypal', 'stripe', 'shopify', 'spotify', 'netflix',
      'twitch', 'airbnb', 'uber', 'lyft', 'tesla',
      'bluetooth', 'usb', 'creative-commons', 'font-awesome',
      'steam', 'playstation', 'xbox', 'nintendo', 'unity',
      'aws', 'digital-ocean', 'cloudflare',
      'google-pay', 'apple-pay', 'amazon-pay',
      'cc-visa', 'cc-mastercard', 'cc-amex',
      'cc-paypal', 'cc-stripe', 'cc-discover',
      'cc-jcb', 'cc-diners-club',
      'google-drive', 'google-play', 'google-plus',
      'google-scholar', 'google-wallet',
    ],
  },
];

// ── Build sorted icon lists from each icon set ──
function buildIconList(iconSet) {
  return Object.values(iconSet)
    .filter((ic) => ic && typeof ic === 'object' && ic.iconName && ic.prefix && ic.icon)
    .map((ic) => ({
      prefix: ic.prefix,
      iconName: ic.iconName,
      unicode: Array.isArray(ic.icon) && ic.icon.length > 3
        ? (typeof ic.icon[3] === 'string' ? ic.icon[3] : String(ic.icon[3]))
        : '',
    }))
    .sort((a, b) => a.iconName.localeCompare(b.iconName));
}

// Match a single keyword against an icon name using segment-based matching.
// Icon names use "-" as separator, e.g. "wine-glass-empty" → segments ["wine","glass","empty"]
// - Single-word keyword (no "-"): matches if any segment equals the keyword exactly.
//   e.g. "glass" matches "wine-glass" but NOT "hourglass" (single segment ≠ "glass")
// - Multi-word keyword (contains "-"): matches if the keyword appears as a contiguous
//   sequence of segments in the icon name.
//   e.g. "wine-glass" matches "wine-glass-empty" but NOT "magnifying-glass-plus"
function iconMatchesKeyword(iconName, keyword) {
  const segments = iconName.split('-');
  if (keyword.includes('-')) {
    const kwSegments = keyword.split('-');
    for (let i = 0; i <= segments.length - kwSegments.length; i++) {
      if (kwSegments.every((ks, j) => segments[i + j] === ks)) return true;
    }
    return false;
  }
  return segments.includes(keyword);
}

// Match icon to subcategories by keyword
function matchSubcategories(iconName, defs) {
  const matched = [];
  for (const def of defs) {
    if (def.keywords.some((kw) => iconMatchesKeyword(iconName, kw))) {
      matched.push(def.key);
    }
  }
  return matched;
}

// Build subcategorized structure for a top-level category
function buildSubcategorized(icons, catName) {
  // Determine which subcategory defs apply to this top-level category
  const applicableDefs = catName === 'brands'
    ? SUBCATEGORY_DEFS.filter((d) => d.key.startsWith('brands-') || ['social-emotion', 'gaming', 'media', 'tech-device'].includes(d.key))
    : SUBCATEGORY_DEFS.filter((d) => !d.key.startsWith('brands-'));

  const subMap = {};
  const unmatched = [];

  for (const ic of icons) {
    const keys = matchSubcategories(ic.iconName, applicableDefs);
    if (keys.length === 0) {
      unmatched.push(ic);
    } else {
      for (const key of keys) {
        if (!subMap[key]) subMap[key] = [];
        subMap[key].push(ic);
      }
    }
  }

  // Build subcategories array in the order of SUBCATEGORY_DEFS
  const result = [];
  for (const def of applicableDefs) {
    if (subMap[def.key] && subMap[def.key].length > 0) {
      result.push({
        key: def.key,
        emoji: def.emoji,
        label: def.label,
        icons: subMap[def.key],
      });
    }
  }

  // Add "Other" subcategory
  if (unmatched.length > 0) {
    result.push({
      key: 'other',
      emoji: '📦',
      label: '其他',
      icons: unmatched,
    });
  }

  return result;
}

const solidIcons = buildIconList(fas);
const regularIcons = buildIconList(far);
const brandsIcons = buildIconList(fab);

const allCategories = shallowRef([
  {
    name: 'solid',
    label: 'Solid（实心）',
    allIcons: solidIcons,
    subcategories: buildSubcategorized(solidIcons, 'solid'),
    totalIconCount: solidIcons.length,
  },
  {
    name: 'regular',
    label: 'Regular（线框）',
    allIcons: regularIcons,
    subcategories: buildSubcategorized(regularIcons, 'regular'),
    totalIconCount: regularIcons.length,
  },
  {
    name: 'brands',
    label: 'Brands（品牌）',
    allIcons: brandsIcons,
    subcategories: buildSubcategorized(brandsIcons, 'brands'),
    totalIconCount: brandsIcons.length,
  },
]);

const search = ref('');
const expanded = reactive({ solid: true, regular: false, brands: false });
const expandedSub = reactive({});

// Initialize all subcategories to collapsed
for (const cat of allCategories.value) {
  for (const sub of cat.subcategories) {
    expandedSub[cat.name + '.' + sub.key] = false;
  }
}

const totalCount = computed(() =>
  allCategories.value.reduce((sum, cat) => sum + cat.totalIconCount, 0)
);

const filteredCategories = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return allCategories.value;

  return allCategories.value
    .map((cat) => {
      const filteredSubs = cat.subcategories
        .map((sub) => ({
          ...sub,
          icons: sub.icons.filter((ic) => ic.iconName.includes(q) || ic.unicode.includes(q)),
        }))
        .filter((sub) => sub.icons.length > 0);

      return {
        ...cat,
        subcategories: filteredSubs,
        totalIconCount: new Set(filteredSubs.flatMap((s) => s.icons.map((ic) => ic.prefix + ':' + ic.iconName))).size,
      };
    })
    .filter((cat) => cat.subcategories.length > 0);
});

function toggleCategory(name) {
  expanded[name] = !expanded[name];
}

function toggleSub(key) {
  expandedSub[key] = !expandedSub[key];
}

function topCategoryIcon(name) {
  if (name === 'solid') return 'circle';
  if (name === 'regular') return 'circle';
  if (name === 'brands') return 'star';
  return 'icons';
}

// ── Detail Dialog ──
const detailVisible = ref(false);
const detailIcon = ref(null);
const usageTab = ref('html');

function openDetail(ic) {
  detailIcon.value = ic;
  usageTab.value = 'html';
  detailVisible.value = true;
}

function prefixLabel(prefix) {
  if (prefix === 'fas') return 'Solid';
  if (prefix === 'far') return 'Regular';
  if (prefix === 'fab') return 'Brands';
  return prefix;
}

function faOfficialUrl(ic) {
  const style = ic.prefix === 'fas' ? 'solid' : ic.prefix === 'far' ? 'regular' : 'brands';
  return `https://fontawesome.com/icons/${ic.iconName}?style=${style}&f=classic`;
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

function htmlClassPrefix(prefix) {
  if (prefix === 'fas') return 'fas';
  if (prefix === 'far') return 'far';
  if (prefix === 'fab') return 'fab';
  return 'fas';
}

function fontFamily(prefix) {
  if (prefix === 'fas') return "'Font Awesome 6 Free'";
  if (prefix === 'far') return "'Font Awesome 6 Free'";
  if (prefix === 'fab') return "'Font Awesome 6 Brands'";
  return "'Font Awesome 6 Free'";
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
  return `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">`;
});

const htmlUsageCode = computed(() => {
  if (!detailIcon.value) return '';
  const ic = detailIcon.value;
  return `<i class="${htmlClassPrefix(ic.prefix)} fa-${ic.iconName}"></i>\n\n<!-- 设置大小 -->\n<i class="${htmlClassPrefix(ic.prefix)} fa-${ic.iconName} fa-lg"></i>\n<i class="${htmlClassPrefix(ic.prefix)} fa-${ic.iconName} fa-2x"></i>\n<i class="${htmlClassPrefix(ic.prefix)} fa-${ic.iconName} fa-3x"></i>`;
});

const vueInstallCode = computed(() => {
  if (!detailIcon.value) return '';
  return `npm install @fortawesome/fontawesome-svg-core\nnpm install ${iconPackage(detailIcon.value.prefix)}\nnpm install @fortawesome/vue-fontawesome@latest-3`;
});

const vueRegisterCode = computed(() => {
  if (!detailIcon.value) return '';
  const ic = detailIcon.value;
  const pascal = toPascalCase(ic.iconName);
  return `import { library } from '@fortawesome/fontawesome-svg-core'\nimport { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'\nimport { ${pascal} } from '${iconPackage(ic.prefix)}'\n\nlibrary.add(${pascal})\n\n// 在 createApp 后注册组件\napp.component('font-awesome-icon', FontAwesomeIcon)`;
});

const vueTemplateCode = computed(() => {
  if (!detailIcon.value) return '';
  const ic = detailIcon.value;
  const prefixShort = ic.prefix === 'fas' ? 'fas' : ic.prefix === 'far' ? 'far' : 'fab';
  return `<!-- 基本用法 -->\n<font-awesome-icon icon="${ic.iconName}" />\n\n<!-- 指定前缀 -->\n<font-awesome-icon :icon="['${prefixShort}', '${ic.iconName}']" />\n\n<!-- 设置大小 -->\n<font-awesome-icon icon="${ic.iconName}" size="lg" />\n<font-awesome-icon icon="${ic.iconName}" size="2x" />`;
});

const reactInstallCode = computed(() => {
  if (!detailIcon.value) return '';
  return `npm install @fortawesome/fontawesome-svg-core\nnpm install ${iconPackage(detailIcon.value.prefix)}\nnpm install @fortawesome/react-fontawesome`;
});

const reactUsageCode = computed(() => {
  if (!detailIcon.value) return '';
  const ic = detailIcon.value;
  const pascal = toPascalCase(ic.iconName);
  return `import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'\nimport { ${pascal} } from '${iconPackage(ic.prefix)}'\n\n// JSX 中使用\n<FontAwesomeIcon icon={${pascal}} />\n\n// 设置大小\n<FontAwesomeIcon icon={${pascal}} size="lg" />\n<FontAwesomeIcon icon={${pascal}} size="2x" />`;
});

const cssUsageCode = computed(() => {
  if (!detailIcon.value) return '';
  const ic = detailIcon.value;
  const uc = ic.unicode || '?';
  return `.icon-${ic.iconName}::before {\n  font-family: ${fontFamily(ic.prefix)};\n  font-weight: ${fontWeight(ic.prefix)};\n  content: "\\${uc}";\n}`;
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

.icon-unicode {
  margin-top: 2px;
  font-size: 10px;
  color: #94a3b8;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
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

/* Border left for subcategory */
.border-l-3 {
  border-left-width: 3px;
}
</style>
