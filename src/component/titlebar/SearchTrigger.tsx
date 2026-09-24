/**
 * SearchTrigger：命令中心搜索触发器（React 版）
 * - 胶囊输入框样式 + 快捷键提示（macOS 显示 ⌘K）
 * - ⌘K / Ctrl+K 全局唤起（派发 'titlebar:search-toggle'，与 Titlebar 的开关联动）
 */
import { useEffect, useState } from 'react'
import { Icon } from '../common/Icon'
import { Kbd } from '../ui/primitives'
import { cn } from '@/lib/utils'
import { isMac } from '@/utils'

export interface SearchTriggerProps {
  open: boolean
  onOpen: () => void
}

export function SearchTrigger({ open, onOpen }: SearchTriggerProps) {
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      const meta = isMac ? e.metaKey : e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('titlebar:search-toggle'))
      }
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [])

  return (
    <button
      type="button"
      aria-label="打开搜索"
      onClick={onOpen}
      onMouseEnter={() => setFocused(true)}
      onMouseLeave={() => setFocused(false)}
      className={cn(
        'tb-pill tb-search-pill ui-press inline-flex h-[34px] w-[34vw] max-w-[560px] cursor-pointer items-center gap-2',
        'px-3.5 text-left text-sm text-[var(--tb-fg-muted)] transition-colors duration-200',
        (focused || open) && 'text-[var(--tb-fg)]'
      )}
      style={open ? { width: '80%' } : undefined}
    >
      <Icon name="search" size={14} className="shrink-0" />
      <span className="flex-1 truncate">搜索</span>
      <Kbd>{isMac ? '⌘ K' : 'Ctrl K'}</Kbd>
    </button>
  )
}
