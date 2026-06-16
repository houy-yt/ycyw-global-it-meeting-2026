<template>
  <div>
    <section class="hero-bg text-white py-12">
      <div class="container-x flex items-center gap-3">
        <div class="chip-orange bg-white/10 !text-brand-orange ring-1 ring-white/20">管理后台</div>
        <h1 class="text-3xl sm:text-4xl font-extrabold">Admin Console</h1>
      </div>
    </section>

    <section class="section-y">
      <div class="container-x">
        <el-tabs v-model="tab" class="admin-tabs">
          <el-tab-pane label="反思管理" name="reflections">
            <AdminReflections />
          </el-tab-pane>
          <el-tab-pane label="剪影管理" name="gallery">
            <AdminGallery />
          </el-tab-pane>
          <el-tab-pane label="往届会议" name="past">
            <AdminPast />
          </el-tab-pane>
          <el-tab-pane label="预设标签" name="tags">
            <AdminTags />
          </el-tab-pane>
          <el-tab-pane label="公告管理" name="announce">
            <AdminAnnouncements />
          </el-tab-pane>
        </el-tabs>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AdminReflections from './admin/AdminReflections.vue';
import AdminGallery from './admin/AdminGallery.vue';
import AdminPast from './admin/AdminPast.vue';
import AdminTags from './admin/AdminTags.vue';
import AdminAnnouncements from './admin/AdminAnnouncements.vue';
const tab = ref('reflections');
</script>

<style scoped>
.admin-tabs :deep(.el-tabs__item) {
  font-weight: 600;
}
.admin-tabs :deep(.el-tabs__active-bar) {
  background-color: var(--brand-blue);
}
.admin-tabs :deep(.el-tabs__item.is-active) {
  color: var(--brand-blue);
}
</style>
