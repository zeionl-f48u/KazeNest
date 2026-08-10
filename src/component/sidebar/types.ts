/* Sidebar 模块共享类型 */

/** 活动栏条目（对应 VS Code 活动栏里的一个视图切换图标） */
export interface ActivityItem {
  id: string
  /** 悬停提示 / aria-label */
  label: string
  /** PrimeIcons 名称（不含 'pi ' 前缀），如 'folder' */
  icon: string
  /** 右上角徽标数（可选） */
  badge?: number
  /** 分组：top 顶部（视图切换）/ bottom 底部（设置/账户等） */
  position?: 'top' | 'bottom'
}

/** 侧边栏树节点（对应 VS Code 资源管理器里的文件 / 文件夹） */
export interface TreeItem {
  id: string
  label: string
  /** PrimeIcons 名称（不含 'pi ' 前缀）；缺省时按 children 自动推断 文件夹/文件 */
  icon?: string
  /** 图标颜色（可选，用于文件类型着色） */
  color?: string
  /** 右侧元信息（如文件语言缩写 ts / json） */
  meta?: string
  /** 子节点（有则视为文件夹，可展开折叠） */
  children?: TreeItem[]
  /** 折叠状态（仅对文件夹生效） */
  collapsed?: boolean
}

/** 侧边栏分组（对应 VS Code 侧边栏里的 section，如「打开的编辑器」「资源管理器」） */
export interface SideBarSection {
  id: string
  title: string
  /** 分组头图标（可选，name-only 格式） */
  icon?: string
  /** 分组头右侧计数（可选） */
  count?: number
  /** 树内容（可选；若为空可配合具名 slot 自定义渲染） */
  items?: TreeItem[]
  /** 是否可折叠（默认 true） */
  collapsible?: boolean
  /** 初始折叠态（默认 false） */
  collapsed?: boolean
}

/** 侧边栏选中项 */
export interface SideBarSelection {
  sectionId: string
  item: TreeItem
}
