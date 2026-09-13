/**
 * ============================================================
 * 视图注册表 —— 全局视图定义的"单一事实来源"
 * ============================================================
 * 以前一个视图的定义散落在 4 处（活动栏数据 / 页面组件表 / 侧栏表 / 占位配置），
 * 新增视图要改 4 个文件。现在收敛成一张表：每个视图在这里一次定义
 *   - 主内容页面组件（page）
 *   - 侧栏组件与标题（sidebar / sidebarTitle，无侧栏的视图省略）
 *   - 占位页配置（comingSoon，仅建设中视图有）
 *   - 是否显示侧栏（sidebarVisible，设置/账户等全屏视图为 false）
 *
 * 类型守卫：`: Record<ViewId, ...>` 保证——
 *   - 活动栏加了新视图（ViewId 扩展）而这里漏配 → 编译报错
 *   - 视图 id 拼错 → 编译报错
 * 视图 id 的单一来源是 data/activityItems.ts 的 ViewId。
 *
 * 新增一个视图的流程（一处改动即可）：
 *   1. data/activityItems.ts 加活动栏条目（id 决定 ViewId）
 *   2. 在这里加一条：页面组件 + （可选）侧栏组件 + 占位配置
 * 此后 App.vue / 活动栏 / 侧边栏 / 占位页全部自动跟随。
 */
import type { Component } from 'vue'
import { markRaw } from 'vue'

import type { ViewId, ComingSoonConfig } from '../data'
import { comingSoonConfig } from '../data'

import Home from '../pages/Home.vue'
import Editor from '../pages/Editor.vue'
import ComingSoon from '../component/common/ComingSoon.vue'
import { AiWorkspace } from '../component/ai'

import {
  HomeSidebar,
  EditorSidebar,
  FilesSidebar,
  AISidebar,
  BrowserSidebar,
} from '../component/sidebar/views'

/** 单个视图的完整定义（见文件头部注释） */
export interface ViewDefinition {
  /** 主内容页面组件（渲染在 app-content 区域） */
  page: Component
  /** 侧栏内容组件（省略 = 该视图无侧栏，如设置/账户） */
  sidebar?: Component
  /** 侧栏标题（SideBar 标题栏显示；无侧栏时忽略） */
  sidebarTitle?: string
  /** 占位页配置（仅建设中视图有，驱动 ComingSoon 渲染） */
  comingSoon?: ComingSoonConfig
  /** 是否显示侧边栏（false = 全屏视图） */
  sidebarVisible: boolean
}

/**
 * 视图定义表：key = ViewId（活动栏条目 id）
 * 显式标注 `: Record<ViewId, ViewDefinition>`（不用 satisfies）——
 * 这样每个条目都是完整 ViewDefinition，App.vue 侧 `views[id].sidebar` 等属性
 * 可直接访问（satisfies 会保留各条目的字面量类型，属性访问反而报错）。
 * markRaw：组件是静态引用，标记为非响应式避免 Vue 做深度代理（性能 + 语义）
 */
export const views: Record<ViewId, ViewDefinition> = {
  home: {
    page: markRaw(Home),
    sidebar: markRaw(HomeSidebar),
    sidebarTitle: '首页',
    sidebarVisible: true,
  },
  editor: {
    page: markRaw(Editor),
    sidebar: markRaw(EditorSidebar),
    sidebarTitle: '资源管理器',
    sidebarVisible: true,
  },
  // 以下为建设中视图：占位页统一走 ComingSoon，侧栏仍按各自形态先行呈现
  files: {
    page: markRaw(ComingSoon),
    sidebar: markRaw(FilesSidebar),
    sidebarTitle: '文件管理',
    sidebarVisible: true,
    comingSoon: comingSoonConfig.files,
  },
  ai: {
    page: markRaw(AiWorkspace),
    sidebar: markRaw(AISidebar),
    sidebarTitle: 'AI 助手',
    sidebarVisible: true,
    comingSoon: comingSoonConfig.ai,
  },
  browser: {
    page: markRaw(ComingSoon),
    sidebar: markRaw(BrowserSidebar),
    sidebarTitle: '浏览器',
    sidebarVisible: true,
    comingSoon: comingSoonConfig.browser,
  },
  settings: {
    page: markRaw(ComingSoon),
    sidebarVisible: false,
    comingSoon: comingSoonConfig.settings,
  },
  account: {
    page: markRaw(ComingSoon),
    sidebarVisible: false,
    comingSoon: comingSoonConfig.account,
  },
}

/** 视图 id 集合（用于遍历/校验） */
export type ViewKey = keyof typeof views
