<!--
  Files：文件管理页（占位）
-->
<template>
  <PageLayout title="文件管理" subtitle="浏览、搜索与快速预览" icon="folder">
    <div class="empty">
      <Icon name="folder-open" :size="40" color="var(--kn-fg-subtle)" />
      <p>文件管理功能开发中</p>
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
