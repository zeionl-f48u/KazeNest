/**
 * 外观主题（React 版 useTheme）
 * - 模式：light（亮色）/ dark（暗色）/ system（跟随系统）
 * - 应用方式：切换 <html> 的 dark 类（tokens.css 的 html.dark 覆盖全部设计令牌）
 * - 持久化：settings.json 的 theme 键；启动时 bootstrapTheme() 先应用再渲染
 * - 跟随系统：监听 prefers-color-scheme 变化，模式为 system 时自动切换
 */
import { getTheme, setTheme as persistTheme } from '@/utils'
import type { StoredTheme } from '@/utils'
import { createStore, useStore } from '@/lib/store'

export type ThemeMode = StoredTheme

const store = createStore<ThemeMode>('system')
let mediaBound = false

/** 应用模式到 <html> */
function apply(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = mode === 'dark' || (mode === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', dark)
}

/** 切换模式（应用 + 落盘） */
export function setThemeMode(mode: ThemeMode) {
  store.set(mode)
  apply(mode)
  void persistTheme(mode)
}

/** 启动引导：读盘应用到 <html>（在 React 渲染前调用，避免闪白） */
export async function bootstrapTheme() {
  try {
    if (!mediaBound) {
      mediaBound = true
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener?.('change', () => {
          if (store.get() === 'system') apply('system')
        })
    }
    const saved = await getTheme()
    if (saved) {
      store.set(saved)
      apply(saved)
    } else {
      apply(store.get())
    }
  } catch (error) {
    /* 主题引导失败不应阻塞启动 */
    console.warn('[KazeNest] 主题初始化失败：', error)
  }
}

export function useTheme() {
  const mode = useStore(store)
  return { mode, setThemeMode }
}
