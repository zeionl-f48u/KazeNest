/**
 * 侧边栏宽度状态（宽度值 + 持久化），供 SideBar.vue 使用
 * - 调节：宽度范围/默认值都在这改（与 tokens.css 的 --sb-width 默认 300 保持一致）
 * - CSS 变量的写入仍在组件里做（这是视图层的职责），这里只管"值"和"落盘"
 */
import { ref } from 'vue'
import { getSidebarWidth, setSidebarWidth } from '../utils/persist'

/** 侧边栏宽度范围（px） */
export const MIN_WIDTH = 180
export const MAX_WIDTH = 480
/** 默认宽度（双击手柄恢复到这个值） */
export const DEFAULT_WIDTH = 300

export function useSidebarWidth() {
  const width = ref(DEFAULT_WIDTH)

  /** 启动时恢复上次保存的宽度（越界钳制；无记录则保持默认） */
  async function restore() {
    const saved = await getSidebarWidth()
    if (saved != null) {
      width.value = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, saved))
    }
  }

  /** 把当前宽度落盘 */
  function persist() {
    setSidebarWidth(width.value)
  }

  /** 恢复默认宽度并落盘 */
  function resetToDefault() {
    width.value = DEFAULT_WIDTH
    persist()
  }

  return { width, restore, persist, resetToDefault }
}