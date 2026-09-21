/**
 * PageLayout：通用页面容器（React 版）
 * - 页头：图标 + 标题 + 副标题（ComingSoon 等页面共用）
 * - 内容区默认垂直排布；由子组件决定内部布局
 */
import type { ReactNode } from 'react'
import { Icon } from './Icon'

export interface PageLayoutProps {
  title: string
  subtitle?: string
  icon?: string
  children: ReactNode
}

export function PageLayout({ title, subtitle, icon, children }: PageLayoutProps) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--kn-fg)]">
          {icon && <Icon name={icon} size={20} className="text-[var(--kn-brand-500)]" />}
          {title}
        </h1>
        {subtitle && <p className="text-sm text-[var(--kn-fg-muted)]">{subtitle}</p>}
      </header>
      {children}
    </div>
  )
}
