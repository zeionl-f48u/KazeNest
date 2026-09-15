/**
 * AI 右侧面板状态（useAiPanel）
 * - 全局单例：任何入口（顶栏 Ask AI / 面板展开按钮 / 快捷键）共享同一份开合状态
 * - 状态语义：
 *   open  —— 用户开关。打开后常驻（不随视图切换卸载），直到显式关闭
 *   width —— 面板宽度（拖拽调整，范围见 AI_PANEL_MIN/MAX）
 * - "展开为 AI 主界面"不是独立状态：App.vue 按 `open && activeView === 'ai'`
 *   派生（展开时面板铺满内容区，离开 AI 视图自动收回右侧栏宽度）
 * - 持久化由 App.vue 写回 AppSessionSnapshot.aiPanel（本模块只管值）
 */
import { ref } from 'vue'

/** 面板宽度范围与默认值（px） */
export const AI_PANEL_MIN = 320
export const AI_PANEL_MAX = 640
export const AI_PANEL_DEFAULT = 400

/** 是否打开（模块级单例，跨组件共享；打开后常驻） */
const open = ref(false)
/** 面板宽度（px） */
const width = ref(AI_PANEL_DEFAULT)

export function useAiPanel() {
  /** 打开面板 */
  function show() {
    open.value = true
  }

  /** 关闭面板 */
  function hide() {
    open.value = false
  }

  /** 开/关切换（顶栏 Ask AI / 快捷键用） */
  function toggle() {
    open.value = !open.value
  }

  /** 设置宽度（越界钳制为整数） */
  function setWidth(w: number) {
    width.value = Math.min(AI_PANEL_MAX, Math.max(AI_PANEL_MIN, Math.round(w)))
  }

  /** 恢复默认宽度（拖拽手柄双击） */
  function resetWidth() {
    width.value = AI_PANEL_DEFAULT
  }

  return { open, width, show, hide, toggle, setWidth, resetWidth }
}
