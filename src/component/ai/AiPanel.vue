<!--
  AiPanel：AI 右侧面板（主流 AI 侧栏形态）
  - 内容即 AiWorkspace 的 panel 形态——同一份 useAiChat 状态，一个东西两种形式
  - 左边缘手柄拖拽调宽（双击恢复默认）；拖拽期间 body 加 is-ai-panel-resizing
    由 App 侧禁用主内容让位过渡，保证跟手
  - 顶部控制（模型 / 新对话 / 展开 / 关闭）由 AiWorkspace panel 顶栏提供
  - "展开"事件交给 App：播放向左扩展动画后切换为 AI 主界面
-->
<template>
  <div class="ai-panel">
    <!-- 左边缘：拖拽调宽手柄（双击恢复默认宽度） -->
    <div
      class="ai-panel-resize"
      :class="{ 'is-disabled': expanding }"
      @mousedown="onResizeStart"
      @dblclick="emit('reset-width')"
    />
    <AiWorkspace
      variant="panel"
      @expand="emit('expand')"
      @close="emit('close')"
    />
  </div>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'
import AiWorkspace from './AiWorkspace.vue'

const props = defineProps<{
  /** 当前面板宽度（px，App 侧持有并负责钳制/持久化） */
  width: number
  /** 是否正在向左扩展动画中（期间禁止拖拽） */
  expanding: boolean
}>()

const emit = defineEmits<{
  'update:width': [width: number]
  'reset-width': []
  expand: []
  close: []
}>()

/* =================== 拖拽调宽 =================== */

/** 卸载兜底：清理拖拽中的全局监听 */
let stopResize: (() => void) | null = null

function onResizeStart(e: MouseEvent) {
  if (props.expanding) return
  e.preventDefault()
  const startX = e.clientX
  const startWidth = props.width

  /** 面板贴右：鼠标左移 = 宽度增大 */
  function onMove(ev: MouseEvent) {
    emit('update:width', startWidth + (startX - ev.clientX))
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.classList.remove('ai-panel-resizing')
    stopResize = null
  }

  document.body.classList.add('ai-panel-resizing')
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  stopResize = onUp
}

onUnmounted(() => stopResize?.())
</script>

<style scoped>
.ai-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  flex: 1;
  border-left: 1px solid var(--kn-border);
  background: var(--kn-bg);
  overflow: hidden;
}

/* 拖拽调宽手柄（左边缘热区 + hover 高亮） */
.ai-panel-resize {
  position: absolute;
  left: -2px;
  top: 0;
  bottom: 0;
  width: 6px;
  z-index: 6;
  cursor: col-resize;
  transition: background var(--kn-dur-fast);
}
.ai-panel-resize:hover,
.ai-panel-resize:active {
  background: color-mix(in srgb, var(--kn-brand-500) 45%, transparent);
}
.ai-panel-resize.is-disabled {
  cursor: default;
  pointer-events: none;
}
</style>
