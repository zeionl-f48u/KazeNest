/**
 * 视图注册表（React 版）—— 全局视图定义的单一来源
 * - 每个视图一次定义：页面组件 / 侧栏 / 侧栏标题 / 占位配置 / 顶栏菜单
 * - 全部视图均为真实页面；未来新增建设中视图可复用 ComingSoon 组件
 * - 视图 id 的单一来源仍是 data/activityItems.ts 的 ViewId（漏配会编译报错）
 */
import { lazy, type ComponentType } from 'react'
import { MarketplaceSidebar } from '../component/sidebar/views/MarketplaceSidebar'
import { AiWorkspace } from '../component/ai'
import { HomeSidebar } from '../component/sidebar/views/HomeSidebar'
import { EditorSidebar } from '../component/sidebar/views/EditorSidebar'
import { FilesSidebar } from '../component/sidebar/views/FilesSidebar'
import { BrowserSidebar } from '../component/sidebar/views/BrowserSidebar'
import { AISidebar } from '../component/sidebar/views/AISidebar'
import type { ViewId, ComingSoonConfig } from '../data'

/* 页面组件懒加载：首屏只加载当前视图，其余页面由 prefetchViews() 空闲预取 */
const Home = lazy(() => import('../pages/Home').then((m) => ({ default: m.Home })))
const Editor = lazy(() => import('../pages/Editor').then((m) => ({ default: m.Editor })))
const Files = lazy(() => import('../pages/Files').then((m) => ({ default: m.Files })))
const Browser = lazy(() => import('../pages/Browser').then((m) => ({ default: m.Browser })))
const Settings = lazy(() => import('../pages/Settings').then((m) => ({ default: m.Settings })))
const Marketplace = lazy(() => import('../pages/Marketplace').then((m) => ({ default: m.Marketplace })))
const Account = lazy(() => import('../pages/Account').then((m) => ({ default: m.Account })))

/* 空闲预取页面 chunk：首次切换视图时无需等待加载 */
const PAGE_LOADERS = [
  () => import('../pages/Home'),
  () => import('../pages/Editor'),
  () => import('../pages/Files'),
  () => import('../pages/Browser'),
  () => import('../pages/Settings'),
  () => import('../pages/Marketplace'),
  () => import('../pages/Account'),
]

export function prefetchViews() {
  const run = () => {
    for (const load of PAGE_LOADERS) void load()
  }
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
    .requestIdleCallback
  if (ric) ric(run)
  else window.setTimeout(run, 1500)
}

/** 单个视图的完整定义 */
export interface ViewDefinition {
  /** 主内容页面组件（渲染在 app-content 区域；props 由 registry 配置 + App 注入） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: ComponentType<any>
  /** 侧栏内容组件（省略 = 该视图无侧栏） */
  sidebar?: ComponentType
  /** 侧栏标题（SideBar 标题栏显示） */
  sidebarTitle?: string
  /** 占位页配置（ComingSoon 驱动） */
  comingSoon?: ComingSoonConfig
  /** 是否显示侧边栏（false = 全屏视图） */
  sidebarVisible: boolean
  /** 切换到该视图时侧边栏是否默认展开（省略 = true；浏览器默认收缩） */
  sidebarDefaultOpen?: boolean
  /** 顶栏文字菜单（macOS 交给系统菜单，内绘留空） */
  menus?: readonly string[]
}

export const views: Record<ViewId, ViewDefinition> = {
  home: {
    page: Home,
    sidebar: HomeSidebar,
    sidebarTitle: '首页',
    sidebarVisible: true,
    menus: ['文件', '编辑', '视图', '帮助'],
  },
  editor: {
    page: Editor,
    sidebar: EditorSidebar,
    sidebarTitle: '资源管理器',
    sidebarVisible: true,
    menus: ['文件', '编辑', '选择', '视图', '转到', '运行', '终端', '帮助'],
  },
  files: {
    page: Files,
    sidebar: FilesSidebar,
    sidebarTitle: '文件管理',
    sidebarVisible: true,
    menus: ['文件', '编辑', '视图', '空间', '工具', '帮助'],
  },
  ai: {
    page: AiWorkspace,
    sidebar: AISidebar,
    sidebarTitle: 'AI 助手',
    sidebarVisible: true,
    menus: ['文件', '编辑', '视图', '会话', '模型', '帮助'],
  },
  browser: {
    page: Browser,
    sidebar: BrowserSidebar,
    sidebarTitle: '浏览器',
    sidebarVisible: true,
    /* 浏览器以内容为主：切换进入时侧栏默认收缩（可手动展开） */
    sidebarDefaultOpen: false,
    menus: ['文件', '编辑', '视图', '历史', '书签', '工具', '帮助'],
  },
  marketplace: {
    page: Marketplace,
    sidebar: MarketplaceSidebar,
    sidebarTitle: '插件市场',
    sidebarVisible: true,
    menus: ['文件', '编辑', '视图', '插件', '帮助'],
  },
  settings: {
    page: Settings,
    sidebarVisible: false,
    menus: ['文件', '编辑', '视图', '帮助'],
  },
  account: {
    page: Account,
    sidebarVisible: false,
    menus: ['文件', '编辑', '视图', '帮助'],
  },
}

/** 视图 id 集合（用于遍历/校验） */
export type ViewKey = keyof typeof views
