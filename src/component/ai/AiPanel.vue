<!--
  AiPanel：AI 右侧面板（常驻式，主流 AI 侧栏形态）
  - 内容即 AiWorkspace —— 同一份 useAiChat 状态，一个东西两种形式：
    · 未展开（其他视图）：panel 紧凑形态（窄侧栏）
    · 展开（AI 视图）：page 全宽形态（面板向左铺满内容区）
  - 展开/收回动画由外层 .ai-panel-wrap 的 left 过渡驱动（时长/曲线在 App.vue）。
    本组件只处理内容侧的稳定性：
    · 收回中：冻结内容布局宽度（不参与收缩重排，只被裁剪）——消除每帧文本重排的卡顿
    · 收尾：内容渐隐 → 沉默切换回紧凑形态 → 渐显（形态跳变被淡化掩盖）
    · 展开：立即切 page 形态，内容随宽度"生长"（观感自然）
  - 左边缘手柄拖拽调宽（双击恢复默认）；展开/收回中手柄隐藏
-->
<template>
  <div
    ref="rootRef"
    class="ai-panel"
    :class="{ 'is-expanded': expanded, 'is-retracting': retracting }"
  >
    <!-- 左边缘：拖拽调宽手柄（双击恢复默认宽度） -->
    <div
      v-if="!expanded && !retracting"
      class="ai-panel-resize"
      @mousedown="onResizeStart"
      @dblclick="emit('reset-width')"
    />

    <!-- 内容层：收回期间冻结为展开时宽度（外层裁剪），避免收缩重排 -->
    <div class="ai-panel-freeze" :style="retracting ? { width: `${freezeWidth}px` } : undefined">
      <AiWorkspace
        :variant="variant"
        :closable="expanded"
        @expand="emit('expand')"
        @close="emit('close')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import AiWorkspace from './AiWorkspace.vue'
import { AI_PANEL_SNAP_CLOSE } from '../../composables'

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

/* =================== 内容形态与收回稳定性 =================== */

const rootRef = ref<HTMLElement | null>(null)

/** 内容形态：展开 page / 侧栏 panel */
const variant = ref<'page' | 'panel'>(props.expanded ? 'page' : 'panel')
/** 是否正在"收回"（冻结布局 + 渐隐，等动画结束再切面板形态） */
const retracting = ref(false)
/** 冻结宽度（收回开始时量取，即展开态的面板宽度） */
const freezeWidth = ref(0)

/** 收回动画时长（与 App.vue 的 left 过渡 0.4s 对齐，略留余量） */
const RETRACT_MS = 430

let settleTimer: number | undefined

watch(() => props.expanded, (v) => {
  window.clearTimeout(settleTimer)
  if (v) {
    /* 展开：立即用全宽形态（内容随扩展动画生长） */
    variant.value = 'page'
    retracting.value = false
    return
  }
  /* 收回：先冻结当前（展开态）布局宽度——期间不发生任何收缩重排，
   * 内容只是被逐渐变窄的面板裁剪；动画末尾内容渐隐，
   * 到位后切换为紧凑形态再渐显（跳变不可见） */
  freezeWidth.value = rootRef.value?.offsetWidth ?? 0
  retracting.value = true
  settleTimer = window.setTimeout(() => {
    variant.value = 'panel'
    retracting.value = false
  }, RETRACT_MS)
})

onUnmounted(() => window.clearTimeout(settleTimer))

/* =================== 拖拽调宽 =================== */

/** 卸载兜底：清理拖拽中的全局监听 */
let stopResize: (() => void) | null = null

function onResizeStart(e: MouseEvent) {
  if (props.expanded || retracting.value) return
  e.preventDefault()
  const startX = e.clientX
  const startWidth = props.width
  /** 拖拽目标宽度（本地记录，松手吸附判定不依赖 props 回流的时序） */
  let lastWidth = startWidth

  /** 面板贴右：鼠标左移 = 宽度增大 */
  function onMove(ev: MouseEvent) {
    lastWidth = startWidth + (startX - ev.clientX)
    emit('update:width', lastWidth)
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.classList.remove('ai-panel-resizing')
    stopResize = null

    /* 拖到吸附阈值内 → 完全收起（宽度复位由 useAiPanel.hide 在动画后处理） */
    if (lastWidth <= AI_PANEL_SNAP_CLOSE) {
      emit('close')
    }
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
  overflow: hidden; /* 收回冻结时裁剪内容（右侧被裁掉） */
}
/* 展开态：全宽接管内容区，边界线没有意义 */
.ai-panel.is-expanded {
  border-left: 0;
}

/* ==================== 内容层（收回稳定性） ==================== */
.ai-panel-freeze {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  flex: 1;
  opacity: 1;
  transition: opacity 0.14s var(--kn-ease-out);
}
/* 收回中：布局宽度冻结为展开值（不重排），收尾渐隐（掩盖形态切换） */
.ai-panel.is-retracting .ai-panel-freeze {
  flex: none;
  opacity: 0;
  /* 前 0.24s 保持可见（跟随宽度收回/裁剪），末尾 0.19s 淡出 */
  transition: opacity 0.19s var(--kn-ease-out) 0.24s;
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
