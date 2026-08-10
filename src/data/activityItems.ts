import type { ActivityItem } from '../component/sidebar'

/**
 * 活动栏条目配置
 * 顶部 = 视图切换（首页 / 编辑器 / …）；底部 = 设置 / 账户
 */
export const activityItems: ActivityItem[] = [
  { id: 'home',     label: '首页',     icon: 'home' },
  { id: 'editor',   label: '编辑器',   icon: 'file-text' },
  { id: 'files',    label: '文件管理', icon: 'folder' },
  { id: 'ai',       label: 'AI 助手',  icon: 'sparkles', badge: 2 },
  { id: 'browser',  label: '浏览器',   icon: 'globe' },
  { id: 'settings', label: '设置',     icon: 'cog', position: 'bottom' },
  { id: 'account',  label: '账户',     icon: 'user', position: 'bottom' },
]

/** 顶栏菜单 */
export const topMenus = ['文件', '编辑', '视图', '窗口', '帮助'] as const
export type TopMenu = typeof topMenus[number]
