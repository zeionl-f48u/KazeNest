/**
 * HomeSidebar：首页侧栏（React 版）
 * - 快捷方式：一键跳转常用视图（派发 kn:navigate）
 * - 最近打开：从 settings.json 读取
 */
import { useEffect, useState } from 'react'
import { SidebarSection, SidebarRow } from './SidebarRow'
import { Icon } from '../../common/Icon'
import { getRecentFiles, formatRelativeTime } from '@/utils/persist'
import type { RecentFile } from '@/utils/persist'
import './home-sidebar.css'

const QUICK_ACTIONS = [
  { id: 'qk-editor', label: '进入编辑器', icon: 'file-text', color: 'var(--kn-sky-500)', target: 'editor' },
  { id: 'qk-files', label: '打开工作区', icon: 'folder-open', color: 'var(--kn-amber-500)', target: 'files' },
  { id: 'qk-ai', label: 'AI 助手', icon: 'sparkles', color: 'var(--kn-magenta-500)', target: 'ai' },
]

const FALLBACK_RECENT: RecentFile[] = [
  { name: 'src/App.tsx', icon: 'file-text', color: 'var(--kn-emerald-500)', timestamp: Date.now() - 2 * 60_000 },
  { name: 'src/data/homeCards.ts', icon: 'file-text', color: 'var(--kn-sky-500)', timestamp: Date.now() - 60 * 60_000 },
  { name: 'README.md', icon: 'file-text', color: 'var(--kn-fg-muted)', timestamp: Date.now() - 24 * 60 * 60_000 },
]

function navigate(target: string) {
  window.dispatchEvent(new CustomEvent('kn:navigate', { detail: target }))
}

export function HomeSidebar() {
  const [recent, setRecent] = useState<RecentFile[]>(FALLBACK_RECENT)

  useEffect(() => {
    let cancelled = false
    void getRecentFiles().then((saved) => {
      if (!cancelled && saved.length > 0) setRecent(saved)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="home-sidebar">
      <SidebarSection title="快捷方式" icon="bolt">
        {QUICK_ACTIONS.map((a) => (
          <SidebarRow
            key={a.id}
            icon={a.icon}
            color={a.color}
            onClick={() => navigate(a.target)}
            meta={<Icon name="arrow-right" size={10} className="home-sidebar-arrow" />}
          >
            {a.label}
          </SidebarRow>
        ))}
      </SidebarSection>

      <SidebarSection title="最近打开" count={recent.length}>
        {recent.map((f) => (
          <SidebarRow
            key={f.name}
            icon={f.icon}
            color={f.color}
            onClick={() => navigate('editor')}
            meta={<span className="home-sidebar-meta">{formatRelativeTime(f.timestamp)}</span>}
          >
            {f.name}
          </SidebarRow>
        ))}
      </SidebarSection>
    </div>
  )
}
