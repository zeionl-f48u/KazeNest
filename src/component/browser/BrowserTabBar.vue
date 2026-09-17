<!--
  BrowserTabBar：浏览器标签栏
  - 标签：favicon（字母占位 / 加载中旋转）+ 标题 + 关闭；激活态高亮
  - 末尾：新建标签按钮
-->
<template>
  <div class="btb">
    <div class="btb-tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="btb-tab"
        :class="{ 'is-on': t.id === activeId }"
        :title="t.url || '新标签页'"
        @click="emit('activate', t.id)"
      >
        <span v-if="t.loading" class="btb-fav is-loading">
          <Icon name="refresh" :size="10" />
        </span>
        <span v-else class="btb-fav" :style="{ '--tint': t.color }">{{ t.letter || '✳' }}</span>
        <span class="btb-title">{{ t.title }}</span>
        <span class="btb-close" role="button" aria-label="关闭标签页" @click.stop="emit('close', t.id)">
          <Icon name="times" :size="11" />
        </span>
      </button>

      <button type="button" class="btb-new" title="新建标签页" @click="emit('new')">
        <Icon name="plus" :size="13" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '../common'

defineProps<{
  /** 标签列表 */
  tabs: { id: number; title: string; url: string; color: string; letter: string; loading: boolean }[]
  /** 当前激活标签 id */
  activeId: number
}>()

const emit = defineEmits<{
  activate: [id: number]
  close: [id: number]
  new: []
}>()
</script>

<style scoped>
.btb {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 4px 6px 0;
  background: var(--kn-bg-sunken);
  border-bottom: 1px solid var(--kn-border);
  flex-shrink: 0;
}

.btb-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.btb-tabs::-webkit-scrollbar {
  display: none;
}

/* 标签 */
.btb-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 120px;
  max-width: 200px;
  height: 30px;
  padding: 0 6px 0 10px;
  border: 0;
  border-radius: var(--kn-radius-md) var(--kn-radius-md) 0 0;
  background: transparent;
  color: var(--kn-fg-muted);
  font: inherit;
  font-size: var(--kn-text-xs);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--kn-dur-fast), color var(--kn-dur-fast);
}
.btb-tab:hover {
  background: var(--kn-hover);
  color: var(--kn-fg);
}
.btb-tab.is-on {
  background: var(--kn-bg-elev);
  color: var(--kn-fg);
}
.btb-tab.is-on::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: var(--kn-brand-500);
}

/* favicon（字母占位） */
.btb-fav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: var(--kn-radius-xs);
  background: color-mix(in srgb, var(--tint, var(--kn-brand-500)) 18%, transparent);
  color: var(--tint, var(--kn-brand-500));
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  line-height: 1;
}
.btb-fav.is-loading {
  color: var(--kn-fg-subtle);
  background: transparent;
  animation: btb-spin 0.9s linear infinite;
}
@keyframes btb-spin {
  to { transform: rotate(360deg); }
}

.btb-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

/* 关闭键 */
.btb-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: var(--kn-fg-subtle);
  flex-shrink: 0;
  opacity: 0;
  transition: background var(--kn-dur-fast), opacity var(--kn-dur-fast);
}
.btb-tab:hover .btb-close,
.btb-tab.is-on .btb-close {
  opacity: 1;
}
.btb-close:hover {
  background: color-mix(in srgb, var(--kn-fg) 12%, transparent);
  color: var(--kn-fg);
}

/* 新建标签 */
.btb-new {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: var(--kn-radius-md);
  background: transparent;
  color: var(--kn-fg-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--kn-dur-fast), color var(--kn-dur-fast);
}
.btb-new:hover {
  background: var(--kn-hover);
  color: var(--kn-fg);
}
</style>
