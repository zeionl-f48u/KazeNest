/**
 * SideBar：二级侧边栏框架（React 版）
 * - 标题栏：标题 + actions + 关闭
 * - 宽度来自 useSidebarWidth（拖拽调宽由 App 层的独立中线 GapDivider 负责）
 */
import { useEffect, type ReactNode } from 'react'
import { Icon } from '../common/Icon'
import { useSidebarWidth } from '@/hooks/useSidebarWidth'

export interface SideBarProps {
  title: string
  children: ReactNode
  onClose: () => void
}

export function SideBar({ title, children, onClose }: SideBarProps) {
  const { width } = useSidebarWidth()

  /* 宽度 → CSS 变量（布局消费） */
  useEffect(() => {
    document.documentElement.style.setProperty('--sb-width', `${width}px`)
  }, [width])

  return (
    <aside className="sb" aria-label="侧边栏">
      <div className="sb-titlebar">
        <span className="sb-title">{title}</span>
        <div className="sb-actions">
          <button type="button" className="sb-action" title="关闭侧边栏" aria-label="关闭侧边栏" onClick={onClose}>
            <Icon name="angle-double-left" size={13} />
          </button>
        </div>
      </div>

      <div className="sb-content">{children}</div>
    </aside>
  )
}
