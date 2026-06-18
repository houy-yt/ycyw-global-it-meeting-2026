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
        <el-tabs v-model="tab" class="admin-tabs" type="card">
          <el-tab-pane label="会议信息" name="meeting">
            <AdminMeeting v-if="tab === 'meeting'" />
          </el-tab-pane>
          <el-tab-pane label="日程安排" name="schedule">
            <AdminSchedule v-if="tab === 'schedule'" />
          </el-tab-pane>
          <el-tab-pane label="参会人员" name="attendees">
            <AdminAttendees v-if="tab === 'attendees'" />
          </el-tab-pane>
          <el-tab-pane label="部门维护" name="departments">
            <AdminDepartments v-if="tab === 'departments'" />
          </el-tab-pane>
          <el-tab-pane label="组织维护" name="organizations">
            <AdminOrganizations v-if="tab === 'organizations'" />
          </el-tab-pane>
          <el-tab-pane label="反思管理" name="reflections">
            <AdminReflections v-if="tab === 'reflections'" />
          </el-tab-pane>
          <el-tab-pane label="数据分析" name="analytics">
            <AdminAnalytics v-if="tab === 'analytics'" />
          </el-tab-pane>
          <el-tab-pane label="剪影管理" name="gallery">
            <AdminGallery v-if="tab === 'gallery'" />
          </el-tab-pane>
          <el-tab-pane label="往届会议" name="past">
            <AdminPast v-if="tab === 'past'" />
          </el-tab-pane>
          <el-tab-pane label="预设标签" name="tags">
            <AdminTags v-if="tab === 'tags'" />
          </el-tab-pane>
          <el-tab-pane label="公告管理" name="announce">
            <AdminAnnouncements v-if="tab === 'announce'" />
          </el-tab-pane>
          <el-tab-pane label="系统设置" name="settings">
            <AdminSettings v-if="tab === 'settings'" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AdminMeeting from './admin/AdminMeeting.vue';
import AdminSchedule from './admin/AdminSchedule.vue';
import AdminAttendees from './admin/AdminAttendees.vue';
import AdminDepartments from './admin/AdminDepartments.vue';
import AdminOrganizations from './admin/AdminOrganizations.vue';
import AdminReflections from './admin/AdminReflections.vue';
import AdminAnalytics from './admin/AdminAnalytics.vue';
import AdminGallery from './admin/AdminGallery.vue';
import AdminPast from './admin/AdminPast.vue';
import AdminTags from './admin/AdminTags.vue';
import AdminAnnouncements from './admin/AdminAnnouncements.vue';
import AdminSettings from './admin/AdminSettings.vue';

const tab = ref('meeting');
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
