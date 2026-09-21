/**
 * EditorTabs：编辑器标签页栏（React 版）
 * - 展示打开的文件；点击切换，× / 中键关闭，修改点（·）提示未保存
 * - ⋯ 菜单：关闭其他 / 关闭全部 / 关闭已保存
 * - 拖拽排序：鼠标跟随 + 布局坐标判定（鼠标跟随 + 布局坐标判定，避免 transform 反噬）
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '../common/Icon'
import { Dropdown } from '../ui/dropdown'
import type { DropdownItem } from '../ui/dropdown'
import type { EditorFile } from '@/data/editorFiles'

export interface EditorTabsProps {
  files: EditorFile[]
  activeId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onCloseOthers: () => void
  onCloseAll: () => void
  onCloseSaved: () => void
  onReorder: (payload: { from: number; to: number }) => void
  /** 无标签时的空态操作：恢复默认示例文件 */
  onOpenDefaults?: () => void
}

export function EditorTabs({
  files,
  activeId,
  onSelect,
  onClose,
  onCloseOthers,
  onCloseAll,
  onCloseSaved,
  onReorder,
  onOpenDefaults,
}: EditorTabsProps) {
  /* ==================== 拖拽排序 ====================
   * 拖拽中的标签跟随鼠标（translateX，每帧更新），其余标签让位（位移一个标签宽度），
   * 松手后 onReorder。目标下标用「布局坐标」（offsetLeft）计算——不受 transform 影响，
   * 避免「目标 ↔ 位移」振荡。 */

  const tabsRef = useRef<HTMLDivElement>(null)
  const tabEls = useRef<(HTMLButtonElement | null)[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const dragRef = useRef({ from: -1, startX: 0, offset: 0, width: 0, didDrag: false })

  const computeTarget = useCallback((clientX: number): number => {
    const from = dragRef.current.from
    const bar = tabsRef.current
    if (!bar) return from
    const x = clientX - bar.getBoundingClientRect().left + bar.scrollLeft
    let target = from
    for (let i = 0; i < tabEls.current.length; i++) {
      const el = tabEls.current[i]
      if (!el) continue
      const mid = el.offsetLeft + el.offsetWidth / 2
      if (x < mid) {
        target = i
        break
      }
      target = i
    }
    return target
  }, [])

  const applyTransforms = useCallback((to: number) => {
    const { from, offset, width } = dragRef.current
    for (let i = 0; i < tabEls.current.length; i++) {
      const el = tabEls.current[i]
      if (!el) continue
      if (i === from) {
        el.style.transform = `translateX(${offset}px)`
        el.style.zIndex = '5'
      } else if (from < to && i > from && i <= to) {
        el.style.transform = `translateX(${-width}px)`
      } else if (to < from && i >= to && i < from) {
        el.style.transform = `translateX(${width}px)`
      } else {
        el.style.transform = ''
        el.style.zIndex = ''
      }
    }
  }, [])

  const clearTransforms = useCallback(() => {
    for (const el of tabEls.current) {
      if (el) {
        el.style.transform = ''
        el.style.zIndex = ''
      }
    }
  }, [])

  const onTabMousedown = (i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('.ed-tab-close')) return
    const el = tabEls.current[i]
    dragRef.current = {
      from: i,
      startX: e.clientX,
      offset: 0,
      width: el?.offsetWidth ?? 100,
      didDrag: false,
    }
    setDragIndex(i)

    const toRef = { current: i }

    const onMove = (ev: MouseEvent) => {
      const st = dragRef.current
      st.offset = ev.clientX - st.startX
      if (Math.abs(st.offset) > 3) st.didDrag = true
      const dragged = tabEls.current[st.from]
      if (dragged) dragged.style.transform = `translateX(${st.offset}px)`
      const target = computeTarget(ev.clientX)
      if (target !== toRef.current) {
        toRef.current = target
        applyTransforms(target)
      }
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const st = dragRef.current
      clearTransforms()
      setDragIndex(null)
      if (st.didDrag && st.from !== toRef.current) {
        onReorder({ from: st.from, to: toRef.current })
      }
      /* 抑制拖动后的误点击 */
      if (st.didDrag) suppressClickRef.current = true
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const suppressClickRef = useRef(false)

  const onTabClick = (id: string) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onSelect(id)
  }

  /* ==================== ⋯ 菜单 ==================== */

  const [moreAnchor, setMoreAnchor] = useState<{ x: number; y: number } | null>(null)

  const moreItems: DropdownItem[] = [
    { id: 'closeOthers', label: '关闭其他', icon: 'times' },
    { id: 'closeAll', label: '关闭全部', icon: 'times' },
    { id: 'closeSaved', label: '关闭已保存', icon: 'check' },
  ]

  const onMoreSelect = (item: DropdownItem) => {
    setMoreAnchor(null)
    if (item.id === 'closeOthers') onCloseOthers()
    else if (item.id === 'closeAll') onCloseAll()
    else onCloseSaved()
  }

  /* 卸载兜底（拖拽监听在 mouseup 已清理；此处无长驻监听） */
  useEffect(() => {
    return () => clearTransforms()
  }, [clearTransforms])

  return (
    <div ref={tabsRef} className="ed-tabs" role="tablist" data-tauri-drag-region="deep">
      {files.map((f, i) => (
        <button
          key={f.id}
          type="button"
          role="tab"
          aria-selected={f.id === activeId}
          className={`ed-tab${f.id === activeId ? ' is-active' : ''}${i === dragIndex ? ' is-dragging' : ''}`}
          ref={(el) => {
            tabEls.current[i] = el
          }}
          onClick={() => onTabClick(f.id)}
          onMouseDown={(e) => onTabMousedown(i, e)}
          onAuxClick={(e) => {
            if (e.button === 1) {
              e.preventDefault()
              onClose(f.id)
            }
          }}
        >
          <Icon
            name={f.icon}
            size={13}
            className="ed-tab-icon"
            style={f.color ? { color: f.color } : undefined}
          />
          <span className="ed-tab-name">{f.name}</span>
          {f.modified && <span className="ed-tab-dot" title="有未保存的修改" />}
          <button
            type="button"
            className="ed-tab-close"
            aria-label={`关闭 ${f.name}`}
            onClick={(e) => {
              e.stopPropagation()
              onClose(f.id)
            }}
          >
            <Icon name="times" size={10} />
          </button>
        </button>
      ))}

      {/* 空态：无打开的文件 */}
      {files.length === 0 && (
        <div className="ed-tabs-empty">
          <span className="ed-tabs-empty-text">没有打开的文件</span>
          {onOpenDefaults && (
            <button type="button" className="ed-tabs-empty-btn" onClick={onOpenDefaults}>
              <Icon name="file-plus" size={12} />
              打开示例文件
            </button>
          )}
        </div>
      )}

      {files.length > 0 && (
        <div
          className="ed-tabs-more"
          role="button"
          title="更多标签"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            setMoreAnchor({ x: r.right - 170, y: r.bottom + 6 })
          }}
        >
          <Icon name="ellipsis-h" size={13} />
        </div>
      )}

      {moreAnchor && (
        <Dropdown
          items={moreItems}
          x={moreAnchor.x}
          y={moreAnchor.y}
          onSelect={onMoreSelect}
          onClose={() => setMoreAnchor(null)}
        />
      )}
    </div>
  )
}
