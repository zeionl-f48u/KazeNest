/**
 * EditorSidebar：资源管理器侧栏（React 版）
 * - 打开的编辑器（计数）+ 工作区树 + 大纲
 * - 数据目前是示例，接 Tauri 文件系统后换成真实目录树
 */
import { useState } from 'react'
import { SidebarSection, SidebarRow } from './SidebarRow'
import { SideBarTree } from '../SideBarTree'
import type { TreeItem } from '../types'
import './view-sidebar.css'

const OPEN_EDITORS: TreeItem[] = [
  { id: 'oe-app', label: 'App.tsx', icon: 'file', color: 'var(--kn-sky-500)', meta: 'React' },
  { id: 'oe-editor', label: 'Editor.tsx', icon: 'file', color: 'var(--kn-sky-500)', meta: 'React' },
  { id: 'oe-home', label: 'Home.tsx', icon: 'file', color: 'var(--kn-sky-500)', meta: 'React' },
]

const WORKSPACE_TREE: TreeItem[] = [
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
              { id: 'ws-file-activitybar', label: 'ActivityBar.tsx', meta: 'React' },
              { id: 'ws-file-sidebar', label: 'SideBar.tsx', meta: 'React' },
              { id: 'ws-file-tree', label: 'SideBarTree.tsx', meta: 'React' },
            ],
          },
          {
            id: 'ws-src-component-editor',
            label: 'editor',
            children: [
              { id: 'ws-file-tabs', label: 'EditorTabs.tsx', meta: 'React' },
              { id: 'ws-file-code', label: 'CodeView.tsx', meta: 'React' },
              { id: 'ws-file-status', label: 'StatusBar.tsx', meta: 'React' },
            ],
          },
          {
            id: 'ws-src-component-titlebar',
            label: 'titlebar',
            children: [
              { id: 'ws-file-titlebar', label: 'Titlebar.tsx', meta: 'React' },
              { id: 'ws-file-search', label: 'SearchPanel.tsx', meta: 'React' },
            ],
          },
        ],
      },
      {
        id: 'ws-src-pages',
        label: 'pages',
        children: [
          { id: 'ws-file-home', label: 'Home.tsx', meta: 'React' },
          { id: 'ws-file-editor', label: 'Editor.tsx', meta: 'React' },
        ],
      },
      { id: 'ws-file-app', label: 'App.tsx', meta: 'React' },
      { id: 'ws-file-main', label: 'main.tsx', meta: 'TS' },
    ],
  },
  { id: 'ws-file-package', label: 'package.json', meta: 'JSON' },
  { id: 'ws-file-vite', label: 'vite.config.ts', meta: 'TS' },
]

const OUTLINE: TreeItem[] = [
  { id: 'ol-editor', label: 'Editor.tsx', icon: 'file-text', color: 'var(--kn-sky-500)', meta: '页面' },
  { id: 'ol-code', label: 'CodeView.tsx', icon: 'file-text', color: 'var(--kn-brand-500)', meta: '组件' },
]

export function EditorSidebar() {
  const [selected, setSelected] = useState('')
  const [collapsed] = useState<Set<string>>(new Set())

  const onTreeSelect = (item: TreeItem) => setSelected(item.id)

  return (
    <div className="vs">
      <SidebarSection title="打开的编辑器" count={OPEN_EDITORS.length}>
        {OPEN_EDITORS.map((f) => (
          <SidebarRow
            key={f.id}
            icon={f.icon}
            color={f.color}
            selected={selected === f.id}
            onClick={() => setSelected(f.id)}
            meta={<span className="vs-meta">{f.meta}</span>}
          >
            {f.label}
          </SidebarRow>
        ))}
      </SidebarSection>

      <SidebarSection title="KAZENEST">
        <SideBarTree
          nodes={WORKSPACE_TREE}
          selected={selected}
          collapsed={collapsed}
          onSelect={onTreeSelect}
        />
      </SidebarSection>

      <SidebarSection title="大纲">
        {OUTLINE.map((o) => (
          <SidebarRow
            key={o.id}
            icon={o.icon}
            color={o.color}
            selected={selected === o.id}
            onClick={() => setSelected(o.id)}
            meta={<span className="vs-meta">{o.meta}</span>}
          >
            {o.label}
          </SidebarRow>
        ))}
      </SidebarSection>
    </div>
  )
}
