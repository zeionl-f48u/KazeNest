/**
 * 极简响应式 store（React 状态共享基础设施）
 * - 模块级单例值 + 订阅集合，配合 useSyncExternalStore 使用
 * - 用于跨组件共享状态（会话快照 / 侧栏宽度 / AI 面板等）
 * - 纯逻辑无框架依赖思想：store 本身可在任意模块读写（get/set）
 */
import { useSyncExternalStore } from 'react'

export interface Store<T> {
  get: () => T
  set: (next: T | ((prev: T) => T)) => void
  subscribe: (fn: () => void) => () => void
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next) {
      const v = typeof next === 'function' ? (next as (p: T) => T)(value) : next
      if (Object.is(v, value)) return
      value = v
      for (const fn of listeners) fn()
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
  }
}

/** 订阅 store 值（组件内使用） */
export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
