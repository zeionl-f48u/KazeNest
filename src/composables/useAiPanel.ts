/**
 * AI 右侧面板状态（useAiPanel）
 * - 全局单例：任何入口（顶栏 Ask AI / AiPanel 展开按钮 / 活动栏）共享同一份开合状态
 * - 三个状态：
 *   open      —— 面板是否可见
 *   expanding —— 是否正在"向左扩展成 AI 主界面"动画中（动画期间不可重复触发/关闭）
 *   width     —— 面板宽度（拖拽调整，范围见 AI_PANEL_MIN/MAX）
 * - 持久化由 App.vue 写回 AppSessionSnapshot.aiPanel（本模块只管值）
 */
import { ref } from 'vue'

/** 面板宽度范围与默认值（px） */
export const AI_PANEL_MIN = 320
export const AI_PANEL_MAX = 640
export const AI_PANEL_DEFAULT = 400

/** 是否展开（模块级单例，跨组件共享） */
const open = ref(false)
/** 是否正在向左扩展为主界面（动画锁） */
const expanding = ref(false)
/** 面板宽度（px） */
const width = ref(AI_PANEL_DEFAULT)

export function useAiPanel() {
  /** 打开面板（若在扩展动画中则忽略） */
  function show() {
    if (expanding.value) return
    open.value = true
  }

  /** 关闭面板（扩展动画中不可关闭） */
  function hide() {
    if (expanding.value) return
    open.value = false
  }

  /** 开/关切换（顶栏 Ask AI 用） */
  function toggle() {
    if (open.value) hide()
    else show()
  }

  /** 设置宽度（越界钳制为整数） */
  function setWidth(w: number) {
    width.value = Math.min(AI_PANEL_MAX, Math.max(AI_PANEL_MIN, Math.round(w)))
  }

  /** 恢复默认宽度（拖拽手柄双击） */
  function resetWidth() {
    width.value = AI_PANEL_DEFAULT
  }

  return { open, expanding, width, show, hide, toggle, setWidth, resetWidth }
}
