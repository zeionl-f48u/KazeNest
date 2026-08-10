<!--
  Browser：内置浏览器页（占位）
-->
<template>
  <PageLayout title="浏览器" subtitle="内嵌 Web 视图与历史" icon="globe">
    <div class="empty">
      <Icon name="globe" :size="40" color="var(--kn-emerald-500)" />
      <p>浏览器开发中</p>
    </div>
  </PageLayout>
</template>

<script setup lang="ts">
import { PageLayout, Icon } from '../component/common'
</script>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--kn-space-3);
  padding: var(--kn-space-10) 0;
  color: var(--kn-fg-muted);
  font-size: var(--kn-text-sm);
}
</style>
