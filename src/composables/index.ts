/**
 * Composables 入口：组合式函数（共享状态逻辑）
 * 引用方式：`import { useAppSession, useSidebarWidth, useAppBoot, useAiChat } from './composables'`
 */
export { useAppSession } from './useAppSession'
export { useSidebarWidth } from './useSidebarWidth'
export { useAppBoot } from './useAppBoot'
export { useAiChat, workByKind } from './useAiChat'
export { useAiPanel, AI_PANEL_MIN, AI_PANEL_MAX, AI_PANEL_DEFAULT, AI_PANEL_SNAP_CLOSE } from './useAiPanel'
export { useFileManager } from './useFileManager'
export type { FileSpace } from './useFileManager'
export type { WorkKind, WorkMode, AiMessage, AiSession } from './useAiChat'