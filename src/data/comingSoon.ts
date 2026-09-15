/**
 * 占位视图配置（文件管理 / AI / 浏览器 / 设置 / 账户）
 * 由 component/common/ComingSoon.vue 统一渲染
 *
 * 调节指南：改对应视图的 title / desc / tags 等字段即可，
 * 模板与样式完全共用，不用再复制整页代码。
 *
 * 类型：Partial<Record<ViewId, …>> —— 键受 ViewId 约束，
 * 漏写某个占位视图配置或拼错键会直接编译报错。
 */
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

import type { ViewId } from './activityItems'

export const comingSoonConfig: Partial<Record<ViewId, ComingSoonConfig>> = {
  files: {
    title: '文件管理',
    subtitle: '浏览、搜索与快速预览',
    icon: 'folder',
    tint: 'var(--kn-amber-500)',
    desc: '浏览、搜索与快速预览文件的能力正在建设中',
    tags: ['文件夹树', '全文搜索', '快速预览'],
  },
  ai: {
    title: 'AI 助手',
    subtitle: '让 AI 帮你写、读、想',
    icon: 'sparkles',
    tint: 'var(--kn-magenta-500)',
    desc: '智能补全、代码问答与自动重构正在接入中',
    tags: ['代码补全', '智能问答', '自动重构'],
  },
  browser: {
    title: '浏览器',
    subtitle: '内嵌 Web 视图与历史',
    icon: 'globe',
    tint: 'var(--kn-emerald-500)',
    desc: '内嵌 Web 视图、标签页与浏览历史正在建设中',
    tags: ['Web 视图', '多标签', '历史记录'],
  },
  marketplace: {
    title: '插件市场',
    subtitle: '发现、安装与管理插件',
    icon: 'extensions',
    tint: 'var(--kn-brand-500)',
    desc: '插件浏览、搜索与一键安装能力正在建设中',
    tags: ['插件浏览', '搜索筛选', '一键安装'],
  },
  settings: {
    title: '设置',
    subtitle: '主题、快捷键与偏好',
    icon: 'cog',
    tint: 'var(--kn-sky-500)',
    desc: '主题、快捷键与个性化偏好正在建设中',
    tags: ['主题外观', '快捷键', '偏好设置'],
  },
  account: {
    title: '账户',
    subtitle: '登录与个人信息',
    icon: 'user',
    tint: 'var(--kn-fg-muted)',
    desc: '账户登录与个人信息正在建设中',
    tags: ['登录', '个人信息', '同步'],
  },
}