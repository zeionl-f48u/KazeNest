<!--
  AI：AI 助手页（占位）
-->
<template>
  <PageLayout title="AI 助手" subtitle="让 AI 帮你写、读、想" icon="sparkles">
    <div class="empty">
      <Icon name="sparkles" :size="40" color="var(--kn-magenta-500)" />
      <p>AI 助手开发中</p>
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
