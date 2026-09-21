/**
 * 侧边栏宽度（React 版）
 * - 值在模块级 store 中共享，持久化走 utils/persist
 * - 拖拽吸附：拖到 ≤ SIDEBAR_SNAP_CLOSE 松手 → 完全收起（由 SideBar 组件触发 close）
 */
import { useEffect } from 'react'
import { getSidebarWidth, setSidebarWidth } from '@/utils'
import { createStore, useStore } from '@/lib/store'

/** 拖拽可达的最小宽度（px） */
export const MIN_WIDTH = 120
export const MAX_WIDTH = 480
/** 默认宽度（双击手柄恢复） */
export const DEFAULT_WIDTH = 300
/** 拖拽吸附收起阈值（松手宽度不超过它 → 完全收起） */
export const SIDEBAR_SNAP_CLOSE = 150

export function clampWidth(w: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(w)))
}

const widthStore = createStore(DEFAULT_WIDTH)
let restoredOnce = false

export function useSidebarWidth() {
  const width = useStore(widthStore)

  useEffect(() => {
    if (restoredOnce) return
    restoredOnce = true
    void getSidebarWidth().then((saved) => {
      if (saved != null) widthStore.set(clampWidth(saved))
    })
  }, [])

  return {
    width,
    setWidth: (w: number) => widthStore.set(clampWidth(w)),
    /** 把当前宽度落盘 */
    persist: () => void setSidebarWidth(widthStore.get()),
    /** 恢复默认并落盘 */
    resetToDefault: () => {
      widthStore.set(DEFAULT_WIDTH)
      void setSidebarWidth(DEFAULT_WIDTH)
    },
  }
}
