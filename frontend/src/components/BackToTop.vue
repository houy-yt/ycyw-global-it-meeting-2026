<template>
  <Transition name="backtop-fade">
    <button
      v-show="visible"
      @click="scrollToTop"
      class="fixed bottom-8 right-6 z-40 h-11 w-11 rounded-full bg-brand-blue text-white shadow-glow flex items-center justify-center hover:bg-brand-deep transition"
      title="回到顶部"
    >
      <font-awesome-icon icon="chevron-up" />
    </button>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const visible = ref(false);

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleScroll() {
  visible.value = window.scrollY > 600;
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
.backtop-fade-enter-active,
.backtop-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.backtop-fade-enter-from,
.backtop-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
