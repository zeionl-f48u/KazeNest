import type { ActivityItem } from '../component/sidebar'

/**
 * 活动栏条目配置
 * 顶部 = 视图切换（首页 / 编辑器 / …）；底部 = 设置 / 账户
 * 这里只放"活动栏展示"数据；页面组件 / 侧栏组件 / 侧栏可见性的定义都在
 * src/registry/views.ts（视图注册表）—— 新增视图只需改这两处。
 *
 * 调节指南：
 *  - 加一个视图：数组里加一条（id 决定 ViewId）→ registry/views.ts 补一条定义
 *  - 调徽标：badge 数字（如 ai 的 2，改为 0 或去掉即不显示）
 *  - 放到底部：position: 'bottom'
 *  - 图标名来自 Icon.tsx 的 ICONS 表（不认识的名字会退化成圆点）
 */
export const activityItems = [
  { id: 'home',        label: '首页',     icon: 'home' },
  { id: 'editor',      label: '编辑器',   icon: 'file-text' },
  { id: 'files',       label: '文件管理', icon: 'folder' },
  { id: 'ai',          label: 'AI 助手',  icon: 'sparkles', badge: 2, hideTooltip: true },
  { id: 'browser',     label: '浏览器',   icon: 'globe' },
  { id: 'marketplace', label: '插件市场', icon: 'extensions' },
  { id: 'account',     label: '账户',     icon: 'user', position: 'bottom' },
  { id: 'settings',    label: '设置',     icon: 'cog', position: 'bottom' },
] as const satisfies ActivityItem[]

/**
 * 视图 id 全集（视图的"单一事实来源"）。
 * registry/views.ts 的视图注册表、component/sidebar/views 侧栏目录都引用它做类型约束，
 * 新增/删除活动栏条目时，漏配组件或侧边栏配置会直接编译报错。
 */
export type ViewId = (typeof activityItems)[number]['id']

/** 活动栏展示顺序（视图"方向感"的单一来源：与顶部/底部分组渲染顺序一致） */
export const viewOrder: readonly ViewId[] = activityItems.map((item) => item.id)

/** 视图切换方向：1 = 前进（向右推进）/ -1 = 后退 / 0 = 原地 */
export function directionOf(prev: ViewId, next: ViewId): number {
  const from = viewOrder.indexOf(prev)
  const to = viewOrder.indexOf(next)
  if (from === -1 || to === -1 || from === to) return 0
  return to > from ? 1 : -1
}

/** 顶栏文字菜单：增删菜单项只改这里（放不下的自动收进 ⋯） */
export const topMenus = ['文件', '编辑', '视图', '窗口', '帮助'] as const
export type TopMenu = typeof topMenus[number]
