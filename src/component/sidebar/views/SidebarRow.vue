<!--
  SidebarRow：侧栏通用行（各视图侧栏的基础条目）
  - 图标（可选着色）+ 文字 label（默认 slot）+ 右侧 meta（具名 slot）
  - selected 高亮选中态；点击 emit click
-->
<template>
  <button
    type="button"
    class="sbrow"
    :class="{ 'is-selected': selected }"
    @click="$emit('click')"
  >
    <Icon v-if="icon" :name="icon" :size="13" class="sbrow-icon" :style="iconColor" />
    <span class="sbrow-label"><slot /></span>
    <slot name="meta" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '../../common'

const props = defineProps<{
  icon?: string
  /** 图标着色（var(--kn-*) 或任意 CSS 颜色） */
  color?: string
  /** 选中高亮 */
  selected?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const iconColor = computed(() => (props.color ? { color: props.color } : undefined))
</script>

<style scoped>
.sbrow {
  display: flex;
  align-items: center;
  gap: 7px;
  width: calc(100% - 12px);
  height: var(--sb-row-height);
  margin: 0 6px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--sb-fg);
  font: inherit;
  font-size: var(--sb-font-size);
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--sb-transition-fast);
}
.sbrow:hover { background: var(--sb-item-hover); }
.sbrow.is-selected {
  background: var(--sb-selection-bg);
  color: var(--sb-selection-fg);
}
.sbrow.is-selected .sbrow-icon { color: inherit; }

.sbrow-icon {
  flex-shrink: 0;
  opacity: 0.85;
}

.sbrow-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>