<template>
  <el-dialog
    v-model="visible"
    :show-close="true"
    width="420px"
    align-center
    :close-on-click-modal="false"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <img src="/logo.gif" class="h-8" />
        <div>
          <div class="text-base font-bold text-brand-deep">登录</div>
          <div class="text-xs text-slate-500">使用单点登录邮箱 (Mock OIDC)</div>
        </div>
      </div>
    </template>

    <form @submit.prevent="submit">
      <label class="block text-sm font-medium text-slate-600 mb-2">邮箱地址</label>
      <input
        v-model="email"
        type="email"
        autocomplete="email"
        placeholder="your.name@ycyw-edu.com"
        class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition"
        required
      />
      <p v-if="error" class="mt-3 text-sm text-brand-red">{{ error }}</p>

      <div class="mt-4 text-xs text-slate-500 bg-brand-blue/5 rounded-xl p-3 leading-relaxed">
        说明：当前为模拟登录。已预置参会人员邮箱（如
        <code class="text-brand-blue">joycechen@ycyw-edu.com</code>），输入即可获得参会人员权限。其他邮箱将自动创建为普通账户。
      </div>

      <button type="submit" class="btn-primary w-full mt-5" :disabled="loading">
        {{ loading ? '登录中...' : '登 录' }}
      </button>
    </form>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

const visible = computed({
  get: () => auth.showLogin,
  set: (v) => (v ? auth.openLogin(auth.loginRedirect, auth.loginAction) : auth.closeLogin()),
});

const email = ref('');
const loading = ref(false);
const error = ref('');

watch(visible, (v) => {
  if (v) {
    email.value = '';
    error.value = '';
  }
});

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value.trim());
    // Capture redirect/action before closing (closeLogin resets them)
    const redirect = auth.loginRedirect;
    const action = auth.loginAction;
    auth.closeLogin();
    // Navigate to target page with optional action
    if (redirect) {
      const target = { path: redirect };
      if (action) target.query = { action };
      router.push(target);
    }
  } catch (e) {
    error.value = e.response?.data?.message || '登录失败，请重试';
  } finally {
    loading.value = false;
  }
}
</script>
