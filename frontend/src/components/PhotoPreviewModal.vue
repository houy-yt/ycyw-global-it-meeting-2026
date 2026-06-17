<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="modelValue"
        class="photo-modal-overlay"
        @click.self="close"
      >
        <div class="photo-modal-container">
          <!-- Close button -->
          <button
            class="photo-modal-close"
            @click="close"
            aria-label="关闭"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <!-- Card with 3D depth -->
          <div class="photo-modal-card">
            <div class="photo-modal-frame">
              <!-- Image -->
              <img
                v-if="type === 'image'"
                :src="src"
                :alt="title"
                class="photo-modal-img"
              />
              <!-- Video -->
              <video
                v-else-if="type === 'video'"
                :src="src"
                controls
                class="photo-modal-img"
              />
              <!-- Link: embeddable video (iframe) -->
              <div v-else-if="type === 'link' && embedUrl" class="photo-modal-embed-content">
                <iframe
                  :src="embedUrl"
                  frameborder="0"
                  allowfullscreen
                  allow="autoplay; encrypted-media; picture-in-picture"
                  class="photo-modal-iframe"
                ></iframe>
              </div>
              <!-- Link: non-embeddable (plain link fallback) -->
              <div v-else-if="type === 'link'" class="photo-modal-link-content">
                <div class="text-5xl mb-4 text-white/60">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </div>
                <a
                  :href="videoLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-brand-blue hover:text-brand-orange underline underline-offset-4 text-sm break-all transition"
                >
                  {{ videoLink }}
                </a>
              </div>
            </div>
            <!-- Info below -->
            <div class="photo-modal-info">
              <div class="photo-modal-name">{{ title }}</div>
              <div v-if="subtitle" class="photo-modal-name-sub">{{ subtitle }}</div>
              <div v-if="meta" class="photo-modal-meta">{{ meta }}</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { getEmbedUrl } from '../utils/videoEmbed';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  src: { type: String, default: '' },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  type: { type: String, default: 'image' },       // 'image' | 'video' | 'link'
  videoLink: { type: String, default: '' },
  meta: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

/** Computed: if the videoLink is a recognised platform, return its embed URL */
const embedUrl = computed(() => getEmbedUrl(props.videoLink));

function close() {
  emit('update:modelValue', false);
}

function handleKeydown(e) {
  if (e.key === 'Escape' && props.modelValue) {
    close();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<!-- Non-scoped styles so they work inside Teleport -->
<style>
/* ========== Photo Preview Modal ========== */
.photo-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 10, 30, 0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  padding: 30px;
}

.photo-modal-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 92vw;
  max-height: calc(100vh - 60px);
}

.photo-modal-close {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: all 0.25s ease;
  backdrop-filter: blur(6px);
}
.photo-modal-close:hover {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  transform: rotate(90deg);
}
.photo-modal-close svg{
  display: block;
  width:70%;
  height:70%;
}
/* Card with 3D depth effect */
.photo-modal-card {
  display: inline-block;
  max-width: 100%;
  perspective: 800px;
  animation: modal-card-enter 0.45s cubic-bezier(0.23, 1, 0.32, 1) both;
}

.photo-modal-frame {
  position: relative;
  display: inline-block;
  max-width: 100%;
  border-radius: 6px;
  overflow: hidden;
  background: #111;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.3),
    0 12px 40px rgba(0, 0, 0, 0.45),
    0 30px 80px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 -4px 20px rgba(0, 50, 160, 0.15);
  transform: rotateX(1.5deg);
  transition: transform 0.35s ease, box-shadow 0.35s ease;
}
.photo-modal-frame:hover {
  transform: rotateX(0deg) scale(1.01);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.3),
    0 16px 50px rgba(0, 0, 0, 0.5),
    0 40px 100px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.12) inset,
    0 0 60px rgba(0, 50, 160, 0.12);
}

/* Glossy shine overlay on the frame */
.photo-modal-frame::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: linear-gradient(
    165deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.04) 30%,
    transparent 50%
  );
  pointer-events: none;
}

.photo-modal-img {
  display: block;
  width: auto;
  height: auto;
  max-width: 92vw;
  max-height: calc(100vh - 160px);
}

/* Embedded video (iframe) inside frame */
.photo-modal-embed-content {
  position: relative;
  width: 90vw;
  max-width: 900px;
  background: #000;
}
.photo-modal-embed-content::before {
  content: '';
  display: block;
  padding-top: 56.25%; /* 16:9 aspect ratio */
}
.photo-modal-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

/* Link content inside frame */
.photo-modal-link-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  min-height: 200px;
  background: linear-gradient(135deg, #0a1628 0%, #162544 100%);
}

/* Person / item info below photo */
.photo-modal-info {
  text-align: center;
  margin-top: 20px;
}
.photo-modal-name {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 0.02em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
.photo-modal-name-sub {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 4px;
  font-weight: 400;
}
.photo-modal-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 8px;
  font-weight: 400;
}

/* ========== Transition animations ========== */
.modal-fade-enter-active {
  transition: opacity 0.3s ease;
}
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@keyframes modal-card-enter {
  0% {
    opacity: 0;
    transform: scale(0.88) translateY(30px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* ========== Tablet ========== */
@media (min-width: 640px) {
  .photo-modal-overlay {
    padding: 40px;
  }
  .photo-modal-container {
    max-width: 88vw;
    max-height: calc(100vh - 80px);
  }
  .photo-modal-img {
    max-width: 88vw;
    max-height: calc(100vh - 180px);
  }
  .photo-modal-frame {
    border-radius: 10px;
  }
  .photo-modal-frame::after {
    border-radius: 10px;
  }
  .photo-modal-name {
    font-size: 20px;
  }
  .photo-modal-close{
    width:30px;
    height:30px;
    position: absolute;
    top: -15px;
    right: -15px;
  }
}

/* ========== Desktop ========== */
@media (min-width: 1024px) {
  .photo-modal-container {
    max-width: 85vw;
    max-height: calc(100vh - 80px);
  }
  .photo-modal-img {
    max-width: 85vw;
    max-height: calc(100vh - 180px);
  }
  .photo-modal-close{
    width:40px;
    height:40px;
    position: absolute;
    top: -20px;
    right: -20px;
  }
}
</style>
