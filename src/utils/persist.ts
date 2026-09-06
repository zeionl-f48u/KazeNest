/**
 * 本地持久化封装（基于 tauri-plugin-store，settings.json）
 *
 * 用途：侧边栏宽度、最近打开文件等少量偏好数据。
 * 底层是 JSON 文件（appDataDir/settings.json），改 schema 无需迁移。
 *
 * 设计：所有函数都 try/catch 并带内存兜底——
 * 在纯浏览器里跑 vite dev（无 Tauri 后端）时不会报错，只是不落盘。
 *
 * 将来数据变多/需要查询时再换 tauri-plugin-sql，调用方无需改。
 */
import { load } from '@tauri-apps/plugin-store'
import type { Store } from '@tauri-apps/plugin-store'

/** settings.json 里用到的 key（统一在这里登记，避免字符串散落） */
const KEYS = {
  sidebarWidth: 'sidebarWidth',
  recentFiles: 'recentFiles',
} as const

/** 最近打开的文件项（name 去重键） */
export interface RecentFile {
  name: string
  icon: string
  color?: string
  /** 打开时间戳（ms），渲染时换算成"x 分钟前" */
  timestamp: number
}

/** 最近列表最多保留条数 */
const RECENT_MAX = 10

let store: Store | null = null

async function getStore(): Promise<Store | null> {
  if (store) return store
  try {
    store = await load('settings.json', { autoSave: true })
  } catch {
    store = null // 浏览器环境（无 Tauri）或插件未初始化：用内存兜底
  }
  return store
}

/* =================== 侧边栏宽度 =================== */

export async function getSidebarWidth(): Promise<number | null> {
  const s = await getStore()
  if (!s) return null
  try {
    return (await s.get<number>(KEYS.sidebarWidth)) ?? null
  } catch {
    return null
  }
}

export async function setSidebarWidth(width: number): Promise<void> {
  const s = await getStore()
  if (!s) return
  try {
    await s.set(KEYS.sidebarWidth, width)
  } catch {
    /* 忽略持久化失败（如浏览器环境） */
  }
}

/* =================== 最近打开 =================== */

export async function getRecentFiles(): Promise<RecentFile[]> {
  const s = await getStore()
  if (!s) return []
  try {
    return (await s.get<RecentFile[]>(KEYS.recentFiles)) ?? []
  } catch {
    return []
  }
}

/** 记录一次"打开文件"：去重放到最前，超出 RECENT_MAX 截断 */
export async function addRecentFile(file: RecentFile): Promise<void> {
  const s = await getStore()
  if (!s) return
  try {
    const list = (await s.get<RecentFile[]>(KEYS.recentFiles)) ?? []
    const next = [file, ...list.filter((f) => f.name !== file.name)].slice(0, RECENT_MAX)
    await s.set(KEYS.recentFiles, next)
  } catch {
    /* 忽略持久化失败 */
  }
}

/** 时间戳 → "x 分钟前 / 昨天 / 日期"（最近列表展示用） */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const min = Math.floor(diff / 60_000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day === 1) return '昨天'
  if (day < 7) return `${day} 天前`
  const d = new Date(timestamp)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}