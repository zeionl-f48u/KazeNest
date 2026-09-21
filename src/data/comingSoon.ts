/**
 * 占位视图配置（模板）
 * - 当前所有视图均已迁移为真实页面，本配置为空
 * - 新增建设中视图时：在 registry/views.ts 用 ComingSoon 作为 page 并传入配置
 *
 * 类型：Partial<Record<ViewId, …>> —— 键受 ViewId 约束，
 * 拼错键会直接编译报错。
 */
import type { ViewId } from './activityItems'

export interface ComingSoonConfig {
  title: string
  subtitle: string
  icon: string
  /** 图标底色/文字着色（--tint），如 'var(--kn-amber-500)' */
  tint: string
  desc: string
  /** 能力标签列表，如 ['文件夹树', '全文搜索'] */
  tags: string[]
}

export const comingSoonConfig: Partial<Record<ViewId, ComingSoonConfig>> = {}
