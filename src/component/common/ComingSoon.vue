<!--
  ComingSoon：占位页（"建设中"页面统一用这个组件）
  - 由 data/comingSoon.ts 的配置驱动，四个占位视图共用一份模板 + 样式
  - props 全部来自配置：title / subtitle / icon / tint / desc / tags
-->
<template>
  <PageLayout :title="title" :subtitle="subtitle" :icon="icon">
    <div class="empty">
      <div class="empty-icon" :style="{ '--tint': tint }">
        <Icon :name="icon" :size="40" />
      </div>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-desc">{{ desc }}</p>
      <div class="empty-tags">
        <span v-for="tag in tags" :key="tag" class="empty-tag">{{ tag }}</span>
      </div>
    </div>
  </PageLayout>
</template>

<script setup lang="ts">
import PageLayout from './PageLayout.vue'
import Icon from './Icon.vue'

defineProps<{
  title: string
  subtitle: string
  icon: string
  /** 图标底色/文字着色（--tint），如 'var(--kn-amber-500)' */
  tint: string
  desc: string
  /** 能力标签列表，如 ['文件夹树', '全文搜索'] */
  tags: string[]
}>()
</script>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--kn-space-3);
  padding: var(--kn-space-10) 0;
  text-align: center;
}

.empty-icon {
  width: 84px;
  height: 84px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--kn-radius-2xl);
  background: color-mix(in srgb, var(--tint) 14%, transparent);
  color: var(--tint);
  box-shadow: var(--kn-shadow-md);
  animation: empty-float 3.5s var(--kn-ease-in-out) infinite;
}
@keyframes empty-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}

.empty-title {
  margin: var(--kn-space-2) 0 0;
  font-size: var(--kn-text-xl);
  font-weight: 600;
  color: var(--kn-fg);
}

.empty-desc {
  margin: 0;
  font-size: var(--kn-text-sm);
  color: var(--kn-fg-muted);
  max-width: 320px;
  line-height: 1.6;
}

.empty-tags {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--kn-space-2);
  margin-top: var(--kn-space-2);
}

.empty-tag {
  padding: 4px 12px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-pill);
  background: var(--kn-bg-elev);
  font-size: var(--kn-text-xs);
  color: var(--kn-fg-muted);
}
</style>