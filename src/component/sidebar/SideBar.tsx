/**
 * SideBar：二级侧边栏框架（React 版）
 * - 标题栏：标题 + actions + 关闭
 * - 宽度拖拽（吸附完全收起：≤ 150px 松手 → onClose）
 * - 宽度写入 --sb-width（全局变量，App 布局消费）
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../common/Icon'
import {
  useSidebarWidth,
  clampWidth,
  SIDEBAR_SNAP_CLOSE,
} from '@/hooks/useSidebarWidth'

export interface SideBarProps {
  title: string
  children: ReactNode
  onClose: () => void
}

export function SideBar({ title, children, onClose }: SideBarProps) {
  const { width, setWidth, persist, resetToDefault } = useSidebarWidth()
  const [dragging, setDragging] = useState(false)
  const dragState = useRef({ startX: 0, startWidth: 0, last: 0 })

  /* 宽度 → CSS 变量（布局消费） */
  useEffect(() => {
    document.documentElement.style.setProperty('--sb-width', `${width}px`)
  }, [width])

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    dragState.current = { startX: e.clientX, startWidth: width, last: width }
    document.body.classList.add('sb-resizing')
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const { startX, startWidth } = dragState.current
      const next = clampWidth(startWidth + (e.clientX - startX))
      dragState.current.last = next
      setWidth(next)
    }
    const onUp = () => {
      setDragging(false)
      document.body.classList.remove('sb-resizing')
      /* 拖到吸附阈值内 → 完全收起（宽度复位默认，下次打开正常） */
      if (dragState.current.last <= SIDEBAR_SNAP_CLOSE) {
        onClose()
        resetToDefault()
        return
      }
      persist()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.classList.remove('sb-resizing')
    }
  }, [dragging, onClose, persist, resetToDefault, setWidth])

  const onResetWidth = () => {
    resetToDefault()
    document.documentElement.style.setProperty('--sb-width', '300px')
  }

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

      <div
        className="sb-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="调整侧边栏宽度"
        onMouseDown={onResizeStart}
        onDoubleClick={onResetWidth}
      />
    </aside>
  )
}
