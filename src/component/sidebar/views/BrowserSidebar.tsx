/**
 * BrowserSidebar：内置浏览器侧栏（React 版）
 * - 历史（网址 + 访问时间）+ 书签（示例数据；接后端 WebView 后点击即打开标签页）
 */
import { useState } from 'react'
import { SidebarSection, SidebarRow } from './SidebarRow'
import type { TreeItem } from '../types'
import './view-sidebar.css'

const HISTORY: (TreeItem & { color: string })[] = [
  { id: 'his-1', label: 'https://example.com', color: 'var(--kn-sky-500)', meta: '2 分钟前' },
  { id: 'his-2', label: 'https://tauri.app', color: 'var(--kn-emerald-500)', meta: '1 小时前' },
  { id: 'his-3', label: 'https://vite.dev', color: 'var(--kn-magenta-500)', meta: '昨天' },
]

const BOOKMARKS: (TreeItem & { color: string })[] = [
  { id: 'bm-1', label: 'Tauri 文档', color: 'var(--kn-amber-500)' },
  { id: 'bm-2', label: 'Vue 3 文档', color: 'var(--kn-brand-500)' },
  { id: 'bm-3', label: 'GitHub', color: 'var(--kn-fg-muted)' },
]

export function BrowserSidebar() {
  const [active, setActive] = useState('his-1')

  return (
    <div className="vs">
      <SidebarSection title="历史" count={HISTORY.length}>
        {HISTORY.map((h) => (
          <SidebarRow
            key={h.id}
            icon="globe"
            color={h.color}
            selected={active === h.id}
            onClick={() => setActive(h.id)}
            meta={<span className="vs-meta">{h.meta}</span>}
          >
            {h.label}
          </SidebarRow>
        ))}
      </SidebarSection>

      <SidebarSection title="书签" icon="star" count={BOOKMARKS.length}>
        {BOOKMARKS.map((b) => (
          <SidebarRow
            key={b.id}
            icon="globe"
            color={b.color}
            selected={active === b.id}
            onClick={() => setActive(b.id)}
          >
            {b.label}
          </SidebarRow>
        ))}
      </SidebarSection>
    </div>
  )
}
