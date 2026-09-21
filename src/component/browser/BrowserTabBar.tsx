/**
 * BrowserTabBar：浏览器标签栏（React 版，Edge 风格标签组 + 拖拽）
 * - 拖拽：鼠标跟随（水平轨道 + 轻微放大）；落点用布局坐标（不受 transform 影响）；
 *   mousemove 用 rAF 节流；落点 70ms 防抖（抑制边界抖动）；松手即时判定
 * - 落点三区：左/右 30% 插入重排（插入线 + 让位动画）；中间 40% 合并成组；组头悬停加入组；
 *   标签栏外松手 → 移到末尾并脱离组
 * - 标签组：点击组头折叠/展开；双击重命名；宽度自适应（flex 均分 54~220px）
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/component/common/Icon'
import type { BrowserGroup, BrowserTab } from './types'
import './browser.css'

export interface BrowserTabBarProps {
  tabs: BrowserTab[]
  groups: BrowserGroup[]
  activeId: number
  onActivate: (id: number) => void
  onClose: (id: number) => void
  onNew: () => void
  onMove: (payload: {
    dragId: number
    targetId: number
    position: 'before' | 'after' | 'group' | 'end'
  }) => void
  onToggleGroup: (groupId: number) => void
  onRenameGroup: (groupId: number, name: string) => void
}

type Row = { kind: 'tab'; tab: BrowserTab } | { kind: 'group'; group: BrowserGroup; count: number }

const DROP_SETTLE_MS = 70

export function BrowserTabBar({
  tabs,
  groups,
  activeId,
  onActivate,
  onClose,
  onNew,
  onMove,
  onToggleGroup,
  onRenameGroup,
}: BrowserTabBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const tabEls = useRef(new Map<number, HTMLButtonElement>())
  const groupHeaderEls = useRef(new Map<number, HTMLDivElement>())

  const [dragId, setDragId] = useState<number | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [dropPos, setDropPos] = useState<'before' | 'after' | 'group' | null>(null)
  const [dropId, setDropId] = useState<number | null>(null)
  const [dropGroupId, setDropGroupId] = useState<number | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  /* ==================== 渲染序列（组头 + 成员） ==================== */

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    const emitted = new Set<number>()
    const renderedTabs = new Set<number>()
    for (const t of tabs) {
      if (t.groupId) {
        const g = groups.find((x) => x.id === t.groupId)
        if (!g) {
          if (!renderedTabs.has(t.id)) out.push({ kind: 'tab', tab: t })
          renderedTabs.add(t.id)
          continue
        }
        if (!emitted.has(g.id)) {
          emitted.add(g.id)
          const members = tabs.filter((x) => x.groupId === g.id)
          out.push({ kind: 'group', group: g, count: members.length })
          if (!g.collapsed) {
            for (const m of members) {
              out.push({ kind: 'tab', tab: m })
              renderedTabs.add(m.id)
            }
          } else {
            for (const m of members) renderedTabs.add(m.id)
          }
        }
      } else if (!renderedTabs.has(t.id)) {
        out.push({ kind: 'tab', tab: t })
        renderedTabs.add(t.id)
      }
    }
    return out
  }, [tabs, groups])

  const groupColor = (groupId?: number) =>
    groups.find((g) => g.id === groupId)?.color ?? 'var(--kn-brand-500)'

  /** 排序切换（与 rows 顺序一致） */
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const dropPosRef = useRef(dropPos)
  dropPosRef.current = dropPos
  const dropIdRef = useRef(dropId)
  dropIdRef.current = dropId
  const dropGroupIdRef = useRef<number | null>(null)
  dropGroupIdRef.current = dropGroupId

  /* ==================== 拖拽 ==================== */

  const lastMove = useRef<MouseEvent | null>(null)
  const rafId = useRef(0)
  const dropTimer = useRef<number | undefined>(undefined)
  const candidate = useRef<{ key: string; pos: 'before' | 'after' | 'group' | null; id: number | null; gid: number | null }>({
    key: '',
    pos: null,
    id: null,
    gid: null,
  })
  const dragState = useRef({ startX: 0, didDrag: false })
  const suppressClick = useRef(false)

  /** 纯计算的落点判定（布局坐标，不受 transform 影响） */
  const computeDrop = useCallback(
    (clientX: number, clientY: number) => {
      const bar = barRef.current
      if (!bar) return { pos: null as null | 'before' | 'after' | 'group', id: null as number | null, gid: null as number | null }
      const barRect = bar.getBoundingClientRect()
      if (clientY < barRect.top - 24 || clientY > barRect.bottom + 24) {
        return { pos: null, id: null, gid: null }
      }
      const x = clientX - barRect.left + bar.scrollLeft

      /* 1) 组头优先 */
      for (const [gid, el] of groupHeaderEls.current) {
        const left = el.offsetLeft
        const right = left + el.offsetWidth
        if (x >= left && x <= right) {
          const first = tabs.find((t) => t.groupId === gid)
          return { pos: 'group' as const, id: first?.id ?? null, gid }
        }
      }

      /* 2) 标签三区 */
      for (const [tid, el] of tabEls.current) {
        if (tid === dragIdRef.current) continue
        const left = el.offsetLeft
        const width = el.offsetWidth
        if (x >= left && x <= left + width) {
          const ratio = (x - left) / width
          if (ratio < 0.3) return { pos: 'before' as const, id: tid, gid: null }
          if (ratio > 0.7) return { pos: 'after' as const, id: tid, gid: null }
          const tab = tabs.find((t) => t.id === tid)
          return { pos: 'group' as const, id: tid, gid: tab?.groupId ?? null }
        }
      }
      return { pos: null, id: null, gid: null }
    },
    [tabs]
  )

  const dragIdRef = useRef<number | null>(null)
  dragIdRef.current = dragId

  /** 提交落点（防抖到点后调用） */
  const commitDrop = useCallback(() => {
    window.clearTimeout(dropTimer.current)
    const c = candidate.current
    setDropPos((prev) => (prev === c.pos && dropIdRef.current === c.id && dropGroupIdRef.current === c.gid ? prev : c.pos))
    setDropId(c.id)
    setDropGroupId(c.gid)
    applyShiftRef.current(c.pos, c.id)
  }, [])

  const updateDropTarget = useCallback(
    (x: number, y: number) => {
      const next = computeDrop(x, y)
      const key = `${next.pos}|${next.id}|${next.gid}`
      if (key === candidate.current.key) return
      candidate.current = { key, ...next }
      window.clearTimeout(dropTimer.current)
      dropTimer.current = window.setTimeout(commitDrop, DROP_SETTLE_MS)
    },
    [computeDrop, commitDrop]
  )

  /* ==================== 让位动画（重排意图） ==================== */

  const lastShiftKey = useRef('')
  const applyShiftRef = useRef<(pos: 'before' | 'after' | 'group' | null, id: number | null) => void>(() => {})

  const applyShift = useCallback(
    (pos: 'before' | 'after' | 'group' | null, id: number | null) => {
      const from = dragIdRef.current
      const key = `${from}|${pos}|${id}`
      if (key === lastShiftKey.current) return
      lastShiftKey.current = key

      for (const [tid, el] of tabEls.current) {
        if (tid !== from) el.style.transform = ''
      }
      if (from == null || !dragState.current.didDrag) return
      if ((pos !== 'before' && pos !== 'after') || id == null) return

      const all = rowsRef.current
      const fromRow = all.findIndex((r) => r.kind === 'tab' && r.tab.id === from)
      const tgtRow = all.findIndex((r) => r.kind === 'tab' && r.tab.id === id)
      if (fromRow < 0 || tgtRow < 0) return

      let toRow = pos === 'before' ? tgtRow : tgtRow + 1
      if (toRow > fromRow) toRow -= 1

      const lo = Math.min(fromRow, toRow)
      const hi = Math.max(fromRow, toRow)
      for (let i = lo; i <= hi; i++) {
        if (all[i].kind === 'group') return
      }

      const draggedW = (tabEls.current.get(from)?.offsetWidth ?? 100) + 2
      for (let i = 0; i < all.length; i++) {
        const row = all[i]
        if (row.kind !== 'tab' || row.tab.id === from) continue
        const el = tabEls.current.get(row.tab.id)
        if (!el) continue
        if (toRow > fromRow && i > fromRow && i <= toRow) {
          el.style.transform = `translateX(${-draggedW}px)`
        } else if (toRow < fromRow && i >= toRow && i < fromRow) {
          el.style.transform = `translateX(${draggedW}px)`
        }
      }
    },
    []
  )
  applyShiftRef.current = applyShift

  /* ==================== 鼠标事件 ==================== */

  const processMove = useCallback(() => {
    rafId.current = 0
    const e = lastMove.current
    const id = dragIdRef.current
    if (!e || id == null) return

    const dx = e.clientX - dragState.current.startX
    if (!dragState.current.didDrag && Math.abs(dx) > 4) {
      dragState.current.didDrag = true
      setDragActive(true)
      document.body.style.cursor = 'grabbing'
    }
    if (!dragState.current.didDrag) return

    const el = tabEls.current.get(id)
    if (el) {
      el.style.transform = `translateX(${dx}px) scale(1.04)`
      el.style.zIndex = '20'
    }
    updateDropTarget(e.clientX, e.clientY)
  }, [updateDropTarget])

  const onTabMousedown = (id: number, e: React.MouseEvent) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('.btb-close')) return

    dragState.current = { startX: e.clientX, didDrag: false }
    setDragId(id)

    const handleMove = (ev: MouseEvent) => {
      lastMove.current = ev
      if (!rafId.current) rafId.current = requestAnimationFrame(processMove)
    }
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
        rafId.current = 0
      }
      window.clearTimeout(dropTimer.current)

      const didDrag = dragState.current.didDrag
      const final =
        didDrag && lastMove.current
          ? computeDrop(lastMove.current.clientX, lastMove.current.clientY)
          : null

      setDragActive(false)
      document.body.style.cursor = ''
      lastShiftKey.current = ''
      for (const el of tabEls.current.values()) {
        el.style.transform = ''
        el.style.zIndex = ''
      }

      if (didDrag) {
        if (final && final.pos && final.id != null) {
          onMove({ dragId: id, targetId: final.id, position: final.pos })
        } else {
          onMove({ dragId: id, targetId: 0, position: 'end' })
        }
        suppressClick.current = true
      }

      setDragId(null)
      setDropPos(null)
      setDropId(null)
      setDropGroupId(null)
      candidate.current = { key: '', pos: null, id: null, gid: null }
      lastMove.current = null
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  const onTabClick = (id: number) => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    onActivate(id)
  }

  /* 卸载兜底 */
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
      window.clearTimeout(dropTimer.current)
      document.body.style.cursor = ''
    }
  }, [])

  /* ==================== 组重命名 ==================== */

  const startRename = (group: BrowserGroup) => {
    setRenamingId(group.id)
    setRenameDraft(group.name)
    window.setTimeout(() => {
      const input = barRef.current?.querySelector<HTMLInputElement>('.btb-group-input')
      input?.focus()
      input?.select()
    }, 20)
  }

  const commitRename = () => {
    if (renamingId == null) return
    const name = renameDraft.trim()
    if (name) onRenameGroup(renamingId, name)
    setRenamingId(null)
  }

  /* ==================== 渲染 ==================== */

  return (
    <div className="btb">
      <div ref={barRef} className={`btb-tabs${dragActive ? ' is-drag-active' : ''}`}>
        {rows.map((row) =>
          row.kind === 'group' ? (
            <div
              key={`g${row.group.id}`}
              ref={(el) => {
                if (el) groupHeaderEls.current.set(row.group.id, el)
                else groupHeaderEls.current.delete(row.group.id)
              }}
              className={`btb-group${row.group.collapsed ? ' is-collapsed' : ''}${dropPos === 'group' && dropGroupId === row.group.id ? ' is-drop-group' : ''}`}
              style={{ '--tint': row.group.color } as React.CSSProperties}
              title={row.group.name}
              onClick={() => onToggleGroup(row.group.id)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                startRename(row.group)
              }}
            >
              <span className="btb-group-dot" />
              {renamingId === row.group.id ? (
                <input
                  className="btb-group-input"
                  value={renameDraft}
                  spellCheck={false}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  onBlur={commitRename}
                />
              ) : (
                <span className="btb-group-name">{row.group.name}</span>
              )}
              <span className="btb-group-count">{row.count}</span>
            </div>
          ) : (
            <button
              key={`t${row.tab.id}`}
              type="button"
              ref={(el) => {
                if (el) tabEls.current.set(row.tab.id, el as HTMLButtonElement)
                else tabEls.current.delete(row.tab.id)
              }}
              className={[
                'btb-tab',
                row.tab.id === activeId ? 'is-on' : '',
                dragId === row.tab.id ? 'is-dragging' : '',
                dropPos === 'before' && dropId === row.tab.id ? 'is-drop-before' : '',
                dropPos === 'after' && dropId === row.tab.id ? 'is-drop-after' : '',
                dropPos === 'group' && dropId === row.tab.id ? 'is-drop-group' : '',
                row.tab.groupId ? 'is-grouped' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={row.tab.groupId ? ({ '--tint': groupColor(row.tab.groupId) } as React.CSSProperties) : undefined}
              title={row.tab.url || '新标签页'}
              onClick={() => onTabClick(row.tab.id)}
              onMouseDown={(e) => onTabMousedown(row.tab.id, e)}
            >
              {row.tab.loading ? (
                <span className="btb-fav is-loading">
                  <Icon name="refresh" size={10} />
                </span>
              ) : (
                <span className="btb-fav" style={{ '--tint': row.tab.color } as React.CSSProperties}>
                  {row.tab.letter || '✳'}
                </span>
              )}
              <span className="btb-title">{row.tab.title}</span>
              <span
                className="btb-close"
                role="button"
                aria-label="关闭标签页"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(row.tab.id)
                }}
              >
                <Icon name="times" size={11} />
              </span>
            </button>
          )
        )}

        <button type="button" className="btb-new" title="新建标签页" onClick={onNew}>
          <Icon name="plus" size={13} />
        </button>
      </div>
    </div>
  )
}
