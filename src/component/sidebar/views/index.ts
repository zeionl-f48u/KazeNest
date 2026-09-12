/**
 * 视图侧栏注册表：每个活动栏视图 → 专属侧栏组件
 * 结构化约定：一个视图一个组件，数据/交互都收在组件内（component/sidebar/views/）
 *
 * 调节指南：
 *  - 改某视图侧栏的内容：直接改对应 views/<View>Sidebar.vue
 *  - 新增视图：在 component/sidebar/views/ 下建组件 + 在这里注册一条
 *    （key 受 ViewId 类型约束：漏注册、拼错 key 都会编译报错）
 *  - 设置/账户在 data/activityItems.ts 标记了 sidebar:false，不在此注册
 */
import type { Component } from 'vue'
import type { ViewId } from '../../../data'
import HomeSidebar from './HomeSidebar.vue'
import EditorSidebar from './EditorSidebar.vue'
import FilesSidebar from './FilesSidebar.vue'
import AISidebar from './AISidebar.vue'
import BrowserSidebar from './BrowserSidebar.vue'

export interface ViewSidebarEntry {
  /** 侧栏标题（SideBar 框架标题栏显示） */
  title: string
  /** 侧栏内容组件（渲染在 SideBar 的 default slot） */
  component: Component
}

export const viewSidebars = {
  home:    { title: '首页',       component: HomeSidebar },
  editor:  { title: '资源管理器', component: EditorSidebar },
  files:   { title: '文件管理',   component: FilesSidebar },
  ai:      { title: 'AI 助手',    component: AISidebar },
  browser: { title: '浏览器',     component: BrowserSidebar },
} satisfies Partial<Record<ViewId, ViewSidebarEntry>>

export type ViewSidebarKey = keyof typeof viewSidebars