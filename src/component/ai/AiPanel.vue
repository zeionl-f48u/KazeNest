<!--
  AiPanel：AI 右侧面板（常驻式，主流 AI 侧栏形态）
  - 内容即 AiWorkspace —— 同一份 useAiChat 状态，一个东西两种形式：
    · 未展开（其他视图）：panel 紧凑形态（窄侧栏）
    · 展开（AI 视图）：page 全宽形态（面板向左铺满内容区）
  - 左边缘手柄拖拽调宽（双击恢复默认）；展开时手柄隐藏
  - 拖拽期间 body 加 ai-panel-resizing，由 effects.css 禁用主内容让位过渡
  - 展开/关闭事件交给 App：展开 = 切到 AI 视图（面板自动扩展）；
    关闭 = 收起面板（AI 视图内关闭后露出主内容 AI 界面）
-->
<template>
  <div class="ai-panel" :class="{ 'is-expanded': expanded }">
    <!-- 左边缘：拖拽调宽手柄（双击恢复默认宽度；展开时隐藏） -->
    <div
      v-if="!expanded"
      class="ai-panel-resize"
      @mousedown="onResizeStart"
      @dblclick="emit('reset-width')"
    />
    <AiWorkspace
      :variant="variant"
      :closable="expanded"
      @expand="emit('expand')"
      @close="emit('close')"
    />
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import AiWorkspace from './AiWorkspace.vue'

const props = defineProps<{
  /** 当前面板宽度（px，App 侧持有并负责钳制/持久化） */
  width: number
  /** 是否已展开为全宽 AI 主界面（展开时不可拖拽、内容切为 page 形态） */
  expanded: boolean
}>()

const emit = defineEmits<{
  'update:width': [width: number]
  'reset-width': []
  expand: []
  close: []
}>()

/* =================== 内容形态（page ↔ panel） =================== */
/* 展开立即切 page（配合向左扩展动画）；
 * 收回延迟到动画结束再切回 panel，避免收回过程中内容重排跳动 */

const variant = ref<'page' | 'panel'>(props.expanded ? 'page' : 'panel')
let variantTimer: number | undefined

watch(() => props.expanded, (v) => {
  window.clearTimeout(variantTimer)
  if (v) {
    variant.value = 'page'
  } else {
    /* 略大于 left 过渡时长（0.4s），等面板收回完成 */
    variantTimer = window.setTimeout(() => {
      variant.value = 'panel'
    }, 420)
  }
})

onUnmounted(() => window.clearTimeout(variantTimer))

/* =================== 拖拽调宽 =================== */

/** 卸载兜底：清理拖拽中的全局监听 */
let stopResize: (() => void) | null = null

function onResizeStart(e: MouseEvent) {
  if (props.expanded) return
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
/* 展开态：全宽接管内容区，边界线没有意义 */
.ai-panel.is-expanded {
  border-left: 0;
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
</style>
