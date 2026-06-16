<template>
  <div class="min-h-screen flex flex-col">
    <NavBar />
    <main class="flex-1">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <Footer />
    <!-- AuthModal shown only in mock mode (OIDC_ENABLED=false) -->
    <AuthModal v-if="!auth.oidcEnabled" />
    <BackToTop />
  </div>
</template>

<script setup>
import NavBar from './components/NavBar.vue';
import Footer from './components/Footer.vue';
import AuthModal from './components/AuthModal.vue';
import BackToTop from './components/BackToTop.vue';
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
onMounted(async () => {
  await auth.fetchConfig();
  if (auth.token) auth.fetchMe();
});
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
