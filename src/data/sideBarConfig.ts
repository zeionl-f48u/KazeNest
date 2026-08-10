import type { SideBarSection, TreeItem } from '../component/sidebar'

/* ============ 共享数据 ============ */

const openEditors: TreeItem[] = [
  { id: 'oe-app',    label: 'App.vue',    icon: 'file', meta: 'Vue' },
  { id: 'oe-editor', label: 'Editor.vue', icon: 'file', meta: 'Vue' },
  { id: 'oe-home',   label: 'Home.vue',   icon: 'file', meta: 'Vue' },
]

/* KazeNest 工作区树（示例数据，后续接 Tauri 文件系统） */
const workspaceTree: TreeItem[] = [
  {
    id: 'ws-src',
    label: 'src',
    children: [
      {
        id: 'ws-src-component',
        label: 'component',
        children: [
          {
            id: 'ws-src-component-sidebar',
            label: 'sidebar',
            children: [
              { id: 'ws-file-activitybar', label: 'ActivityBar.vue', meta: 'Vue' },
              { id: 'ws-file-sidebar',     label: 'SideBar.vue',     meta: 'Vue' },
              { id: 'ws-file-tree',        label: 'SideBarTree.vue', meta: 'Vue' },
            ],
          },
          {
            id: 'ws-src-component-editor',
            label: 'editor',
            children: [
              { id: 'ws-file-tabs',  label: 'EditorTabs.vue', meta: 'Vue' },
              { id: 'ws-file-code',  label: 'CodeView.vue',   meta: 'Vue' },
              { id: 'ws-file-status', label: 'StatusBar.vue', meta: 'Vue' },
            ],
          },
          {
            id: 'ws-src-component-titlebar',
            label: 'titlebar',
            children: [
              { id: 'ws-file-titlebar', label: 'Titlebar.vue',    meta: 'Vue' },
              { id: 'ws-file-search',   label: 'SearchPanel.vue', meta: 'Vue' },
            ],
          },
        ],
      },
      {
        id: 'ws-src-pages',
        label: 'pages',
        children: [
          { id: 'ws-file-home',   label: 'Home.vue',   meta: 'Vue' },
          { id: 'ws-file-editor', label: 'Editor.vue', meta: 'Vue' },
          { id: 'ws-file-files',  label: 'Files.vue',  meta: 'Vue' },
        ],
      },
      { id: 'ws-file-app',  label: 'App.vue',  meta: 'Vue' },
      { id: 'ws-file-main', label: 'main.ts',  meta: 'TS' },
    ],
  },
  { id: 'ws-file-package', label: 'package.json',   meta: 'JSON' },
  { id: 'ws-file-vite',    label: 'vite.config.ts', meta: 'TS' },
]

/* ============ 按视图分组的侧边栏配置 ============ */

export interface SideBarConfig {
  title: string
  sections: SideBarSection[]
}

export const sideBarConfig: Record<string, SideBarConfig> = {
  home: {
    title: '首页',
    sections: [
      { id: 'sec-quick',  title: '快捷方式', items: [
        { id: 'qk-editor', label: '进入编辑器', icon: 'file-text' },
        { id: 'qk-files',  label: '打开工作区', icon: 'folder-open' },
        { id: 'qk-ai',     label: 'AI 助手',   icon: 'sparkles' },
      ]},
      { id: 'sec-recent-home', title: '最近打开', count: 3, items: [
        { id: 'rh-1', label: 'App.vue',        icon: 'file-text', meta: 'Vue' },
        { id: 'rh-2', label: 'homeCards.ts',   icon: 'file-text', meta: 'TS' },
        { id: 'rh-3', label: 'README.md',      icon: 'file-text', meta: 'MD' },
      ]},
    ],
  },
  editor: {
    title: '资源管理器',
    sections: [
      { id: 'sec-open-editors', title: '打开的编辑器', count: openEditors.length, items: openEditors },
      { id: 'sec-workspace',    title: 'KAZENEST',     items: workspaceTree },
      { id: 'sec-outline',      title: '大纲',         items: [
        { id: 'ol-editor', label: 'Editor.vue',  icon: 'file-text' },
        { id: 'ol-code',   label: 'CodeView.vue', icon: 'file-text' },
      ]},
    ],
  },
  files: {
    title: '文件管理',
    sections: [
      { id: 'sec-favorites', title: '收藏', items: [{ id: 'fav-1', label: '示例文档.md', meta: 'MD' }] },
      { id: 'sec-recent',    title: '最近', items: [{ id: 'rec-1', label: 'README.md',   meta: 'MD' }] },
    ],
  },
  ai: {
    title: 'AI 助手',
    sections: [
      { id: 'sec-sessions', title: '对话', count: 2, items: [{ id: 'ses-1', label: '重构顶栏为 VS Code 风格', icon: 'sparkles' }] },
    ],
  },
  browser: {
    title: '浏览器',
    sections: [
      { id: 'sec-history', title: '历史', items: [{ id: 'his-1', label: 'https://example.com', icon: 'globe' }] },
    ],
  },
  settings: {
    title: '设置',
    sections: [
      { id: 'sec-general',   title: '常规',   items: [{ id: 'stg-1', label: '外观', icon: 'palette' }] },
      { id: 'sec-shortcuts', title: '快捷键', items: [{ id: 'stg-2', label: '打开搜索', icon: 'keyboard' }] },
    ],
  },
  account: {
    title: '账户',
    sections: [
      { id: 'sec-profile', title: '账户信息', items: [{ id: 'acc-1', label: '未登录', icon: 'user' }] },
    ],
  },
}
