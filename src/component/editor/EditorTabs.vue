<!--
  EditorTabs：编辑器标签页栏
  - 展示打开的文件；点击切换，右上角 × 关闭
  - 纯受控组件：files / v-model(activeId) / close
-->
<template>
  <div class="ed-tabs" role="tablist">
    <button
      v-for="f in files"
      :key="f.id"
      type="button"
      class="ed-tab"
      :class="{ 'is-active': f.id === modelValue }"
      role="tab"
      :aria-selected="f.id === modelValue"
      @click="$emit('update:modelValue', f.id)"
    >
      <Icon
        :name="f.icon"
        :size="13"
        class="ed-tab-icon"
        :style="f.color ? { color: f.color } : undefined"
      />
      <span class="ed-tab-name">{{ f.name }}</span>
      <button
        type="button"
        class="ed-tab-close"
        :aria-label="`关闭 ${f.name}`"
        @click.stop="$emit('close', f.id)"
      >
        <Icon name="times" :size="10" />
      </button>
    </button>

    <div class="ed-tabs-more" title="更多标签">
      <Icon name="ellipsis-h" :size="13" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '../common'
import type { EditorFile } from '../../data/editorFiles'

defineProps<{
  files: EditorFile[]
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [string]
  close: [string]
}>()
</script>

<style scoped>
.ed-tabs {
  display: flex;
  align-items: stretch;
  gap: 2px;
  height: var(--ed-tab-height);
  background: var(--ed-tabbar-bg);
  border-bottom: 1px solid var(--ed-tabbar-border);
  padding: 4px 8px 0;
  box-sizing: border-box;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  flex-shrink: 0;
}
.ed-tabs::-webkit-scrollbar { display: none; }

.ed-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: calc(var(--ed-tab-height) - 4px);
  padding: 0 8px 0 10px;
  border: 0;
  border-radius: 0;   /* VS Code：标签直角 */
  background: var(--ed-tab-bg);
  color: var(--ed-tab-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background var(--kn-dur-fast) var(--kn-ease-out), color var(--kn-dur-fast);
}
.ed-tab:hover { background: var(--ed-tab-hover); }
.ed-tab:active { background: var(--kn-active); }

.ed-tab.is-active {
  background: var(--ed-tab-active-bg);
  color: var(--ed-tab-active-fg);
}
/* 活动标签顶部一条品牌色 */
.ed-tab.is-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 10px;
  right: 10px;
  height: 2px;
  border-radius: 2px;
  background: var(--ed-tab-active-border);
}

.ed-tab-icon { flex-shrink: 0; }
.ed-tab-name { max-width: 160px; overflow: hidden; text-overflow: ellipsis; }

.ed-tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 2px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  opacity: 0;
  cursor: pointer;
  transition: opacity var(--kn-dur-fast), background var(--kn-dur-fast);
}
.ed-tab:hover .ed-tab-close,
.ed-tab.is-active .ed-tab-close { opacity: 0.7; }
.ed-tab-close:hover { background: var(--kn-active); opacity: 1 !important; }

.ed-tabs-more {
  display: inline-flex;
  align-items: center;
  padding: 0 6px;
  color: var(--ed-tab-fg);
  opacity: 0.6;
  flex-shrink: 0;
}
</style>
