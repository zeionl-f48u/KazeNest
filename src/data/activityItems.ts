import type { ActivityItem } from '../component/sidebar'

/**
 * 活动栏条目配置
 * 顶部 = 视图切换（首页 / 编辑器 / …）；底部 = 设置 / 账户
 *
 * 调节指南：
 *  - 加一个视图：数组里加一条，然后在 App.vue 的 viewComponents 注册对应组件，
 *    在 sideBarConfig.ts 加该视图的侧边栏内容
 *  - 调徽标：badge 数字（如 ai 的 2，改为 0 或去掉即不显示）
 *  - 放到底部：position: 'bottom'
 *  - 图标名来自 Icon.vue 的 ICONS 表（不认识的名字会退化成圆点）
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

/** 顶栏文字菜单：增删菜单项只改这里（放不下的自动收进 ⋯） */
export const topMenus = ['文件', '编辑', '视图', '窗口', '帮助'] as const
export type TopMenu = typeof topMenus[number]
