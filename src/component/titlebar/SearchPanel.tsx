/**
 * SearchPanel：全局搜索面板（React 版，Teleport 到 body）
 * - 输入过滤（标题/描述/分组）；按分组展示
 * - 键盘：↑↓ 选择、Enter 确认、Esc 关闭
 * - 与 Vue 版一致的玻璃面板视觉
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../common/Icon'
import { cn } from '@/lib/utils'
import type { SearchItem } from './types'

export interface SearchPanelProps {
  open: boolean
  items: SearchItem[]
  onClose: () => void
  onSelect: (item: SearchItem) => void
}

export function SearchPanel({ open, items, onClose, onSelect }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  /* 打开时聚焦并重置 */
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const t = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(t)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.desc.toLowerCase().includes(q) ||
        it.group.toLowerCase().includes(q)
    )
  }, [items, query])

  const groups = useMemo(() => {
    const map = new Map<string, SearchItem[]>()
    for (const it of filtered) {
      const arr = map.get(it.group) ?? []
      arr.push(it)
      map.set(it.group, arr)
    }
    return [...map.entries()]
  }, [filtered])

  /* 过滤变化时重置选中 */
  useEffect(() => {
    setActive(0)
  }, [query])

  /* 键盘上下移动选中项时滚动进视野 */
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-search-active="true"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const flat = filtered

  const onKeydown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const item = flat[active]
      if (item) {
        onSelect(item)
        onClose()
      }
    }
  }

  return createPortal(
    <div
      className="ui-overlay-in fixed inset-0 z-[2800] bg-[color-mix(in_srgb,var(--kn-fg)_18%,transparent)]"
      onClick={onClose}
      onKeyDown={onKeydown}
    >
      <div
        className={cn(
          'ui-dialog-in mx-auto mt-[12vh] flex w-[min(560px,calc(100%-48px))] flex-col overflow-hidden',
          'rounded-2xl border border-[var(--kn-border-strong)] bg-[var(--kn-bg-elev)] shadow-[var(--kn-shadow-lg)]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 输入行 */}
        <div className="flex items-center gap-2 border-b border-[var(--kn-border)] px-4 py-3">
          <Icon name="search" size={14} className="shrink-0 text-[var(--kn-fg-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索页面、命令与设置…"
            spellCheck={false}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--kn-fg)] outline-none placeholder:text-[var(--kn-fg-subtle)]"
          />
          {query && (
            <button
              type="button"
              aria-label="清空"
              className="ui-press inline-flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full text-[var(--kn-fg-subtle)] hover:bg-[var(--kn-hover)] hover:text-[var(--kn-fg)]"
              onClick={() => setQuery('')}
            >
              <Icon name="times" size={11} />
            </button>
          )}
          <button
            type="button"
            className="cursor-pointer rounded border border-[var(--kn-border)] px-1.5 py-0.5 text-[10px] text-[var(--kn-fg-subtle)]"
            onClick={onClose}
          >
            Esc
          </button>
        </div>

        {/* 结果列表 */}
        <div className="max-h-[min(420px,calc(100vh-220px))] overflow-y-auto p-2">
          {flat.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-[var(--kn-fg-subtle)]">
              没有匹配的结果
            </div>
          )}

          {groups.map(([group, list]) => (
            <div key={group}>
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.4px] text-[var(--kn-fg-subtle)] uppercase">
                {group}
              </div>
              {list.map((it) => {
                const index = flat.indexOf(it)
                return (
                  <button
                    key={it.id}
                    type="button"
                    data-search-active={index === active ? 'true' : undefined}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => {
                      onSelect(it)
                      onClose()
                    }}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left',
                      index === active ? 'bg-[var(--kn-selected)]' : 'hover:bg-[var(--kn-hover)]'
                    )}
                  >
                    <span
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                      style={{ background: `color-mix(in srgb, ${it.color} 18%, transparent)`, color: it.color }}
                    >
                      <Icon name={it.icon} size={14} />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-[var(--kn-fg)]">{it.title}</span>
                      <span className="truncate text-xs text-[var(--kn-fg-muted)]">{it.desc}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
