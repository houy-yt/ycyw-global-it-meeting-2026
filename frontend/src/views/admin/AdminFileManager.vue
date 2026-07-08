<template>
  <div class="admin-file-manager">
    <iframe
      :src="iframeSrc"
      class="w-full border-0 rounded-lg"
      style="height: 70vh; min-height: 500px;"
      allow="clipboard-read; clipboard-write"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const token = localStorage.getItem('token') || '';

const iframeSrc = computed(() => {
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  const qs = params.toString();
  return '/elfinder.html' + (qs ? '?' + qs : '');
});
</script>
