/**
 * ActivityBar：VS Code 活动栏（React 版）
 * - 顶部视图切换 + 底部全局动作；激活项左侧指示条 + 徽标
 * - 点击当前活动项再次点击 → 折叠侧边栏（onToggle）
 */
import { Icon } from '../common/Icon'
import type { ActivityItem } from './types'

export interface ActivityBarProps {
  items: ActivityItem[]
  activeId: string
  onSelect: (id: string) => void
  onToggle: (item: ActivityItem) => void
}

export function ActivityBar({ items, activeId, onSelect, onToggle }: ActivityBarProps) {
  const topItems = items.filter((i) => i.position !== 'bottom')
  const bottomItems = items.filter((i) => i.position === 'bottom')

  const renderItem = (item: ActivityItem) => (
    <button
      key={item.id}
      type="button"
      className={`ab-item${activeId === item.id ? ' is-active' : ''}`}
      aria-label={item.label}
      aria-pressed={activeId === item.id}
      title={item.hideTooltip ? undefined : item.label}
      onClick={() => (activeId === item.id ? onToggle(item) : onSelect(item.id))}
    >
      <span className="ab-indicator" aria-hidden="true" />
      <Icon name={item.icon} size="var(--ab-icon-size)" className="ab-icon" />
      {item.badge ? <span className="ab-badge">{item.badge}</span> : null}
    </button>
  )

  return (
    <nav className="ab" aria-label="活动栏">
      <div className="ab-group">{topItems.map(renderItem)}</div>
      <div className="ab-group">{bottomItems.map(renderItem)}</div>
    </nav>
  )
}
