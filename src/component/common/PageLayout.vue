<!--
  PageLayout：所有 page/* 共享的容器
  - 统一 page padding / 标题区 / 动画
  - 缺省槽位：title 标题区 / default 主内容 / actions 顶部右侧操作
-->
<template>
  <section class="page">
    <header v-if="$slots.title || title" class="page-head">
      <div class="page-head-text">
        <h1 v-if="title" class="page-title">
          <Icon v-if="icon" :name="icon" class="page-title-icon" />
          <span>{{ title }}</span>
        </h1>
        <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="page-head-actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="page-body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import Icon from './Icon.vue'

defineProps<{
  title?: string
  subtitle?: string
  /** 标题左侧的 PrimeIcons 类名（不含 'pi ' 前缀），如 'chart-line' */
  icon?: string
}>()
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--kn-space-6);
  animation: page-fade var(--kn-dur-slow) var(--kn-ease-out);
}

@keyframes page-fade {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--kn-space-4);
  padding-bottom: var(--kn-space-2);
  border-bottom: 1px solid var(--kn-border);
}

.page-head-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.page-title {
  margin: 0;
  font-size: var(--kn-text-2xl);
  font-weight: 600;
  letter-spacing: 0.2px;
  color: var(--kn-fg);
  display: inline-flex;
  align-items: center;
  gap: var(--kn-space-2);
}

.page-title-icon {
  font-size: 22px;
  color: var(--kn-brand-500);
}

.page-subtitle {
  margin: 0;
  font-size: var(--kn-text-sm);
  color: var(--kn-fg-muted);
}

.page-head-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--kn-space-2);
  flex-shrink: 0;
}

.page-body {
  min-width: 0;
  min-height: 0;
}
</style>
