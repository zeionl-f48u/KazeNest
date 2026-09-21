/**
 * useAiPanel：AI 右侧面板状态（React 版）
 * - open 常驻开关（打开后不随视图卸载）；width 可拖拽；SNAP_CLOSE 拖到阈值内松手 → 收起
 * - App.vue 派生 expanded = open && activeView === 'ai'（展开铺满内容区）
 */
import { createStore, useStore } from '@/lib/store'

export const AI_PANEL_MIN = 160
export const AI_PANEL_MAX = 640
export const AI_PANEL_DEFAULT = 400
export const AI_PANEL_SNAP_CLOSE = 260

const store = createStore({ open: false, width: AI_PANEL_DEFAULT })

function clampWidth(w: number) {
  return Math.min(AI_PANEL_MAX, Math.max(AI_PANEL_MIN, Math.round(w)))
}

export function setAiPanelOpen(open: boolean) {
  store.set((s) => ({ ...s, open }))
}

export function showAiPanel() {
  setAiPanelOpen(true)
}

export function hideAiPanel() {
  const { width } = store.get()
  store.set({ open: false, width: width <= AI_PANEL_SNAP_CLOSE ? AI_PANEL_DEFAULT : width })
}

export function toggleAiPanel() {
  if (store.get().open) hideAiPanel()
  else showAiPanel()
}

export function setAiPanelWidth(w: number) {
  store.set((s) => ({ ...s, width: clampWidth(w) }))
}

/** 恢复持久化宽度（低于吸附阈值的值视为"收起过程"残留，复位默认） */
export function restoreAiPanelWidth(w: number) {
  store.set((s) => ({ ...s, width: w <= AI_PANEL_SNAP_CLOSE ? AI_PANEL_DEFAULT : clampWidth(w) }))
}

export function resetAiPanelWidth() {
  store.set((s) => ({ ...s, width: AI_PANEL_DEFAULT }))
}

export function useAiPanel() {
  return useStore(store)
}
