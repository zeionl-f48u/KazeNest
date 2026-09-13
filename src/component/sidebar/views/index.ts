/**
 * 视图侧栏组件目录
 * 这里只放组件本身；"哪个视图配哪个侧栏"的统一映射在 src/registry/views.ts（视图注册表）。
 *
 * 结构化约定：一个视图一个组件，数据/交互都收在组件内
 *  - 改某视图侧栏的内容：直接改 views/<View>Sidebar.vue
 *  - 新增视图：在 component/sidebar/views/ 下建组件 + 在 registry/views.ts 注册
 *
 * 共享骨架：SidebarSection（可折叠分组头）/ SidebarRow（条目行）在各视图侧栏里复用。
 */
export { default as HomeSidebar } from './HomeSidebar.vue'
export { default as EditorSidebar } from './EditorSidebar.vue'
export { default as FilesSidebar } from './FilesSidebar.vue'
export { default as AISidebar } from './AISidebar.vue'
export { default as BrowserSidebar } from './BrowserSidebar.vue'
export { default as SidebarSection } from './SidebarSection.vue'
export { default as SidebarRow } from './SidebarRow.vue'