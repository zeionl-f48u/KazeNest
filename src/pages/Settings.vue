<!--
  Settings：系统设置页（占位）
-->
<template>
  <PageLayout title="设置" subtitle="主题、快捷键与偏好" icon="cog">
    <div class="empty">
      <Icon name="cog" :size="40" color="var(--kn-fg-subtle)" />
      <p>设置面板开发中</p>
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
