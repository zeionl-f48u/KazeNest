/**
 * SidebarRow / SidebarSection：侧栏通用行与可折叠分组（React 版）
 */
import { useState, type ReactNode } from 'react'
import { Icon } from '../../common/Icon'

/* ==================== SidebarRow ==================== */

export interface SidebarRowProps {
  icon?: string
  /** 图标着色（var(--kn-*) 或任意 CSS 颜色） */
  color?: string
  selected?: boolean
  meta?: ReactNode
  onClick?: () => void
  children: ReactNode
}

export function SidebarRow({ icon, color, selected, meta, onClick, children }: SidebarRowProps) {
  return (
    <button
      type="button"
      className={`sbrow${selected ? ' is-selected' : ''}`}
      onClick={onClick}
    >
      {icon && (
        <Icon
          name={icon}
          size="var(--sb-icon-size)"
          className="sbrow-icon"
          style={color ? { color } : undefined}
        />
      )}
      <span className="sbrow-label">{children}</span>
      {meta}
    </button>
  )
}

/* ==================== SidebarSection ==================== */

export interface SidebarSectionProps {
  title: string
  icon?: string
  count?: number
  collapsible?: boolean
  initialCollapsed?: boolean
  children: ReactNode
}

export function SidebarSection({
  title,
  icon,
  count,
  collapsible = true,
  initialCollapsed = false,
  children,
}: SidebarSectionProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const open = !collapsible || !collapsed

  return (
    <section className="sbsec">
      {collapsible ? (
        <button
          type="button"
          className="sbsec-header"
          aria-expanded={open}
          onClick={() => setCollapsed((v) => !v)}
        >
          <Icon name={collapsed ? 'chevron-right' : 'chevron-down'} size={10} className="sbsec-chevron" />
          {icon && <Icon name={icon} size="var(--sb-sec-icon-size)" className="sbsec-icon" />}
          <span className="sbsec-title">{title}</span>
          {count ? <span className="sbsec-count">{count}</span> : null}
        </button>
      ) : (
        <div className="sbsec-header">
          {icon && <Icon name={icon} size="var(--sb-sec-icon-size)" className="sbsec-icon" />}
          <span className="sbsec-title">{title}</span>
          {count ? <span className="sbsec-count">{count}</span> : null}
        </div>
      )}
      <div className="sbsec-body" style={{ display: open ? undefined : 'none' }}>
        {children}
      </div>
    </section>
  )
}
