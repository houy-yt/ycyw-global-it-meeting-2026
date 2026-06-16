<template>
  <div class="hero-bg min-h-[80vh] flex items-center justify-center text-white p-6">
    <div class="bg-white text-slate-700 rounded-3xl shadow-glow w-full max-w-md p-8">
      <div class="text-center">
        <img src="/logo.gif" class="h-12 mx-auto" />
        <h1 class="mt-4 text-2xl font-bold text-brand-deep">登录到 YCYW Meeting</h1>
        <p class="text-sm text-slate-500 mt-2">使用单点登录邮箱 (Mock OIDC)</p>
      </div>

      <form @submit.prevent="submit" class="mt-8 space-y-4">
        <input
          v-model="email"
          required
          type="email"
          placeholder="your.name@ycyw-edu.com"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition"
        />
        <button class="btn-primary w-full" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
        <p v-if="error" class="text-sm text-brand-red text-center">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const email = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  loading.value = true;
  try {
    await auth.login(email.value.trim());
    // Redirect to the target page after login (standard OIDC callback behaviour)
    const redirect = route.query.redirect || '/';
    const action = route.query.action;
    const target = { path: redirect };
    if (action) target.query = { action };
    router.push(target);
  } catch (e) {
    error.value = e.response?.data?.message || '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>
