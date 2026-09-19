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

/** 面板宽度范围与默认值（px）
 * - MIN：拖拽可达的最小宽度（继续往左拖即进入"收起意图区"）
 * - SNAP_CLOSE：拖拽松手时宽度 ≤ 该值 → 完全收起（关闭面板，宽度复位）
 * - DEFAULT：双击手柄恢复 / 收起后复位宽度 */
export const AI_PANEL_MIN = 160
export const AI_PANEL_MAX = 640
export const AI_PANEL_DEFAULT = 400
/** 拖拽吸附收起阈值（px）：松手宽度不超过它 → 完全收起 */
export const AI_PANEL_SNAP_CLOSE = 260

/** 是否打开（模块级单例，跨组件共享；打开后常驻） */
const open = ref(false)
/** 面板宽度（px） */
const width = ref(AI_PANEL_DEFAULT)

export function useAiPanel() {
  /** 打开面板 */
  function show() {
    open.value = true
  }

  /** 关闭面板：若当前宽度处于"收起意图区"（拖拽松手吸附），
   *  等离开动画结束后复位默认宽度（避免动画中宽度跳变） */
  function hide() {
    open.value = false
    if (width.value <= AI_PANEL_SNAP_CLOSE) {
      window.setTimeout(() => {
        width.value = AI_PANEL_DEFAULT
      }, 450)
    }
  }

  /** 开/关切换（顶栏 Ask AI / 快捷键用） */
  function toggle() {
    open.value = !open.value
  }

  /** 设置宽度（越界钳制为整数） */
  function setWidth(w: number) {
    width.value = Math.min(AI_PANEL_MAX, Math.max(AI_PANEL_MIN, Math.round(w)))
  }

  /** 恢复持久化宽度（低于吸附阈值的值视为"收起过程"残留，复位默认） */
  function restoreWidth(w: number) {
    setWidth(w <= AI_PANEL_SNAP_CLOSE ? AI_PANEL_DEFAULT : w)
  }

  /** 恢复默认宽度（拖拽手柄双击） */
  function resetWidth() {
    width.value = AI_PANEL_DEFAULT
  }

  return { open, width, show, hide, toggle, setWidth, restoreWidth, resetWidth }
}
