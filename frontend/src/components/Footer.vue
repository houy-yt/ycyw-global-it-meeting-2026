<template>
  <footer class="mt-12 bg-brand-deep text-white">
    <div class="container-x py-10 grid gap-8 sm:grid-cols-3">
      <div>
        <div class="flex items-center gap-3">
          <img src="/logo.gif" alt="YCYW" class="h-10 w-auto bg-white rounded p-1" />
          <div>
            <div class="text-base font-semibold">YCYW</div>
            <div class="text-xs text-white/70">2026 Global IT Meeting</div>
          </div>
        </div>
        <p class="mt-4 text-sm text-white/70 leading-relaxed">
          连接 · 创新 · 未来。一年一度的 YCYW 全球 IT 同仁聚会。
        </p>
      </div>

      <div>
        <div class="text-sm font-semibold mb-3">快速导航</div>
        <ul class="text-sm space-y-2 text-white/80">
          <li><router-link to="/schedule" class="hover:text-brand-orange">日程安排</router-link></li>
          <li><router-link to="/attendees" class="hover:text-brand-orange">参会人员</router-link></li>
          <li><router-link to="/reflections" class="hover:text-brand-orange">会后反思</router-link></li>
          <li><router-link to="/gallery" class="hover:text-brand-orange">会议剪影</router-link></li>
          <li><router-link to="/past-meetings" class="hover:text-brand-orange">往届会议</router-link></li>
        </ul>
      </div>

      <div>
        <div class="text-sm font-semibold mb-3">联系</div>
        <ul class="text-sm space-y-2 text-white/80">
          <li>会议时间：2026 年 7 月 14 - 16 日</li>
          <li>会议地点：北京</li>
          <li>主办方：YCYW Education</li>
        </ul>
      </div>
    </div>
    <div class="border-t border-white/10">
      <div class="container-x py-4 text-xs text-white/60 flex flex-col sm:flex-row justify-between gap-2">
        <div>© {{ year }} YCYW Education. All rights reserved.</div>
        <div>Powered by Vue 3 · Express · Prisma</div>
      </div>
    </div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear();
</script>
