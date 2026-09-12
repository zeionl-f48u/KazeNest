<!--
  SideBar：二级侧边栏框架（外壳，不负责具体内容）
  - 标题栏：视图名 + 操作（actions slot，留给视图侧栏自定义）+ 关闭
  - 内容：default slot 由视图专属侧栏组件渲染（component/sidebar/views/*）
  - 宽度拖拽 + 持久化（useSidebarWidth）
-->
<template>
  <aside class="sb" aria-label="侧边栏">
    <div class="sb-titlebar">
      <span class="sb-title">{{ title }}</span>
      <div class="sb-actions">
        <slot name="actions" />
        <button
          type="button"
          class="sb-action"
          title="关闭侧边栏"
          aria-label="关闭侧边栏"
          @click="$emit('close')"
        >
          <Icon name="angle-double-left" :size="13" />
        </button>
      </div>
    </div>

    <div class="sb-content">
      <slot />
    </div>

    <!-- 拖拽手柄：调节侧边栏宽度 -->
    <div
      class="sb-resize"
      role="separator"
      aria-orientation="vertical"
      aria-label="调整侧边栏宽度"
      @mousedown="onResizeStart"
      @dblclick="resetWidth"
    />
  </aside>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { Icon } from '../common'
import { useSidebarWidth, MIN_WIDTH, MAX_WIDTH } from '../../composables/useSidebarWidth'

defineProps<{
  /** 侧边栏标题（视图名，如「资源管理器」「AI 助手」） */
  title: string
}>()

const emit = defineEmits<{
  close: []
}>()

/* =================== 宽度拖拽（值/范围/持久化在 useSidebarWidth） =================== */

const { width: sbWidth, restore: restoreWidth, persist: persistWidth, resetToDefault } = useSidebarWidth()

let dragging = false
let startX = 0
let startWidth = 0

function onResizeStart(e: MouseEvent) {
  e.preventDefault()
  dragging = true
  startX = e.clientX
  startWidth = sbWidth.value
  document.body.classList.add('sb-resizing')
  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', onResizeEnd)
}

function onResizeMove(e: MouseEvent) {
  if (!dragging) return
  const delta = e.clientX - startX
  const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta))
  sbWidth.value = next
  document.documentElement.style.setProperty('--sb-width', `${next}px`)
}

function onResizeEnd() {
  dragging = false
  document.body.classList.remove('sb-resizing')
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeEnd)
  persistWidth()
}

/** 双击手柄恢复默认宽度（同时覆盖持久化的值） */
function resetWidth() {
  resetToDefault()
  document.documentElement.style.setProperty('--sb-width', `${sbWidth.value}px`)
}

onMounted(async () => {
  await restoreWidth()
  document.documentElement.style.setProperty('--sb-width', `${sbWidth.value}px`)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeEnd)
})
</script>

<style scoped>
.sb {
  position: relative;
  width: var(--sb-width);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sb-bg);
  color: var(--sb-fg);
  border-right: 1px solid var(--sb-border);
  flex-shrink: 0;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  transition: width var(--sb-resize-transition, 0s);
}

/* ============ 拖拽手柄 ============ */
.sb-resize {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
  transition: background var(--sb-transition-fast);
}
.sb-resize:hover {
  background: color-mix(in srgb, var(--kn-brand-500) 25%, transparent);
}
.sb-resize:active {
  background: color-mix(in srgb, var(--kn-brand-500) 40%, transparent);
}

/* ============ 标题栏 ============ */
.sb-titlebar {
  height: var(--sb-titlebar-height);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px 0 16px;
  box-sizing: border-box;
}

.sb-title {
  font-size: var(--kn-text-md);
  font-weight: 600;
  letter-spacing: 0.1px;
  color: var(--sb-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sb-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.sb-action {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  border-radius: 4px;
  color: var(--sb-fg-muted);
  font-size: 13px;
  cursor: pointer;
  transition: background var(--sb-transition-fast), color var(--sb-transition-fast);
}
.sb-action:hover {
  background: var(--sb-hover);
  color: var(--sb-fg);
}

/* ============ 内容区（视图侧栏渲染到这里） ============ */
.sb-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 8px;
}
</style>