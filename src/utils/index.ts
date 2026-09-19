/**
 * Utils 入口：纯工具函数（无组件依赖）
 * 引用方式：`import { getRecentFiles, formatRelativeTime, isMac } from './utils'`
 */
export * from './persist'
export * from './platform'
export { initMacNativeMenu } from './nativeMenu'
export { showDemo } from './demo'
export type { DemoPayload } from './demo'