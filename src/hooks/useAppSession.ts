/**
 * 全局会话持久化（React 版 useAppSession）
 * 与 Vue 版行为一致：
 * - 共享同一份 AppSessionSnapshot（模块级 store）
 * - restore()：启动读一次（缓存），save()：300ms 防抖落盘，flush()：立即落盘
 * - 各视图通过 update(mutator) 写回自己的那段状态
 */
import { getAppSession, setAppSession } from '@/utils'
import type { AppSessionSnapshot } from '@/utils'
import { createStore, useStore } from '@/lib/store'

const store = createStore<AppSessionSnapshot | null>(null)
let restoring = false
let timer: number | undefined

/** 读取已保存快照（仅首次真正读盘；返回 null 表示从未保存过） */
async function restore(): Promise<AppSessionSnapshot | null> {
  const cached = store.get()
  if (cached) return cached
  restoring = true
  try {
    const snap = await getAppSession()
    store.set(snap)
    return snap
  } finally {
    restoring = false
  }
}

/** 防抖落盘（300ms） */
function save() {
  if (restoring || !store.get()) return
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    const snap = store.get()
    if (snap) void setAppSession(snap)
  }, 300)
}

/** 立即落盘（beforeunload / 卸载前） */
function flush() {
  window.clearTimeout(timer)
  const snap = store.get()
  if (!restoring && snap) void setAppSession(snap)
}

/** 默认快照（从未保存过时首次写入用） */
function defaultSnapshot(): AppSessionSnapshot {
  return {
    version: 1,
    activeView: 'editor',
    sideBarOpen: true,
    editor: {
      initialized: false,
      openFileIds: [],
      activeFileId: '',
      contents: {},
      modifiedIds: [],
    },
    ai: {
      activeModel: 'model-chat',
      sessions: [],
      activeSessionId: '',
      messages: [],
    },
  }
}

/** 修改快照并触发订阅（无快照时先建默认；浅拷贝以触发 useSyncExternalStore 比对） */
function update(mutator: (snap: AppSessionSnapshot) => void) {
  let snap = store.get()
  if (!snap) {
    snap = defaultSnapshot()
    store.set(snap)
  }
  mutator(snap)
  store.set({ ...snap })
  save()
}

export function useAppSession() {
  const session = useStore(store)
  return { session, restore, save, flush, update }
}
