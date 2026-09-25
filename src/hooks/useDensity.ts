/**
 * 界面密度（React 版 useDensity）
 * - 模式：compact（紧凑 0.92）/ standard（标准 1）/ loose（宽松 1.08）
 * - 应用方式：<html data-density="..."> → tokens.css 里覆盖 --kn-density，
 *   各组件尺寸 token（活动栏/侧栏/文件列表等）用它做乘法
 * - 持久化：settings.json 的 density 键；启动时 bootstrapDensity() 先应用再渲染
 */
import { useEffect } from 'react'
import { getDensity, setDensity as persistDensity } from '@/utils'
import type { StoredDensity } from '@/utils'
import { createStore, useStore } from '@/lib/store'

export type DensityMode = StoredDensity

/** 各档位的缩放系数（与 tokens.css 的 --kn-density 保持一致） */
export const DENSITY_SCALE: Record<DensityMode, number> = {
  compact: 0.92,
  standard: 1,
  loose: 1.08,
}

const store = createStore<DensityMode>('standard')
let restoredOnce = false

/** 应用模式到 <html> */
function apply(mode: DensityMode) {
  document.documentElement.dataset.density = mode
}

/** 切换模式（应用 + 落盘） */
export function setDensityMode(mode: DensityMode) {
  store.set(mode)
  apply(mode)
  void persistDensity(mode)
}

/** 启动引导：读盘应用（React 渲染前调用，避免尺寸跳动） */
export async function bootstrapDensity() {
  try {
    const saved = await getDensity()
    if (saved) {
      store.set(saved)
      apply(saved)
    } else {
      apply(store.get())
    }
  } catch (error) {
    console.warn('[KazeNest] 界面密度初始化失败：', error)
  }
}

export function useDensity() {
  const mode = useStore(store)

  /* 首次使用时兜底应用（bootstrap 失败也能生效） */
  useEffect(() => {
    if (!restoredOnce) {
      restoredOnce = true
      apply(store.get())
    }
  }, [])

  return { mode, scale: DENSITY_SCALE[mode], setDensityMode }
}
