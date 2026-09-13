/**
 * Composables 入口：组合式函数（共享状态逻辑）
 * 引用方式：`import { useAppSession, useSidebarWidth, useAppBoot, useAiChat } from './composables'`
 */
export { useAppSession } from './useAppSession'
export { useSidebarWidth } from './useSidebarWidth'
export { useAppBoot } from './useAppBoot'
export { useAiChat, workByKind } from './useAiChat'
export type { WorkKind, WorkMode, AiMessage, AiSession } from './useAiChat'