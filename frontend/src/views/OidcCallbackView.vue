<template>
  <div class="min-h-[60vh] flex items-center justify-center">
    <div class="text-center">
      <div v-if="!error" class="space-y-4">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-blue/10">
          <font-awesome-icon icon="spinner" spin class="text-2xl text-brand-blue" />
        </div>
        <p class="text-sm text-slate-500">登录中，请稍候…</p>
      </div>
      <div v-else class="space-y-4">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-red/10">
          <font-awesome-icon icon="circle-xmark" class="text-2xl text-brand-red" />
        </div>
        <p class="text-sm text-brand-red">{{ error }}</p>
        <button class="btn-primary !text-sm" @click="$router.push('/')">返回首页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * OIDC Callback View
 *
 * After external OIDC authentication, the backend redirects here with:
 *   /auth/callback?token=JWT&redirect=/reflections&action=publish
 *
 * This page:
 * 1. Saves the JWT token
 * 2. Fetches user info
 * 3. Redirects to the target page with the optional action parameter
 */
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const error = ref('');

onMounted(async () => {
  const token = route.query.token;
  const idToken = route.query.id_token;
  const redirect = route.query.redirect || '/';
  const action = route.query.action;

  if (!token) {
    error.value = '登录失败：未收到认证令牌';
    return;
  }

  try {
    // Save token and id_token, then fetch user info
    auth.setToken(token);
    if (idToken) auth.setIdToken(idToken);
    const user = await auth.fetchMe();

    if (!user) {
      error.value = '登录失败：无法获取用户信息';
      return;
    }

    // Navigate to target page with optional action
    const target = { path: redirect };
    if (action) target.query = { action };
    router.replace(target);
  } catch (e) {
    error.value = '登录失败：' + (e.message || '未知错误');
  }
});
</script>
