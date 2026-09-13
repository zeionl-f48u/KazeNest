/**
 * Sidebar 组件入口
 * 一次性 import './tokens.css' 注册全局设计 token；
 * 之后按需 named import 即可。
 *
 * 说明：视图↔侧栏的映射在 src/registry/views.ts（视图注册表），这里只导出组件本体。
 */
import './tokens.css'

export { default as ActivityBar } from './ActivityBar.vue'
export { default as SideBar } from './SideBar.vue'
export { default as SideBarTree } from './SideBarTree.vue'
export {
  HomeSidebar,
  EditorSidebar,
  FilesSidebar,
  AISidebar,
  BrowserSidebar,
  SidebarSection,
  SidebarRow,
} from './views'
export type { ActivityItem, SideBarSection, SideBarSelection, TreeItem } from './types'
export { AiWorkspace, AiMessageView, AiInputBar } from '../ai'
