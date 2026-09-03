<!--
  Browser：内置浏览器页（占位）
-->
<template>
  <PageLayout title="浏览器" subtitle="内嵌 Web 视图与历史" icon="globe">
    <div class="empty">
      <div class="empty-icon" :style="{ '--tint': 'var(--kn-emerald-500)' }">
        <Icon name="globe" :size="40" />
      </div>
      <h3 class="empty-title">内置浏览器</h3>
      <p class="empty-desc">内嵌 Web 视图、标签页与浏览历史正在建设中</p>
      <div class="empty-tags">
        <span class="empty-tag">Web 视图</span>
        <span class="empty-tag">多标签</span>
        <span class="empty-tag">历史记录</span>
      </div>
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
