/**
 * GapDivider：区块之间的独立分隔线（间隙正中；鼠标未碰到不显示）
 * - 常驻渲染但默认透明：悬停 / 拖拽时才显示品牌色细线
 * - 拖拽调整相邻区块尺寸（dir='right' 目标块在左，'left' 目标块在右）
 * - 双击恢复默认；拖到吸附阈值内松手 → 由调用方收起
 */
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface GapDividerProps {
  /** 开合动画中：不参与交互 */
  idle?: boolean
  /** 拖拽方向：目标块在左用 'right'，在右用 'left' */
  dir: 'left' | 'right'
  width: number
  /** 宽度约束（缺省不额外限制） */
  clamp?: (width: number) => number
  /** 拖到该宽度内松手 → 收起 */
  snapClose: number
  onChange: (width: number) => void
  /** 松手（未触发收起）时回调，用于落盘等 */
  onCommit?: (width: number) => void
  onSnapClose: () => void
  onReset: () => void
  /** 拖拽中挂到 body 的类名（禁用过渡 / 全局光标） */
  resizingClass: string
  label: string
}

export function GapDivider({
  idle = false,
  dir,
  width,
  clamp,
  snapClose,
  onChange,
  onCommit,
  onSnapClose,
  onReset,
  resizingClass,
  label,
}: GapDividerProps) {
  const [active, setActive] = useState(false)
  const lastRef = useRef(width)

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    lastRef.current = startWidth

    const apply = (raw: number) => {
      const next = clamp ? clamp(raw) : raw
      lastRef.current = next
      onChange(next)
    }

    const onMove = (ev: MouseEvent) => {
      apply(
        dir === 'left'
          ? startWidth + (startX - ev.clientX)
          : startWidth + (ev.clientX - startX)
      )
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.classList.remove(resizingClass)
      setActive(false)
      if (lastRef.current <= snapClose) {
        onSnapClose()
        return
      }
      onCommit?.(lastRef.current)
    }

    setActive(true)
    document.body.classList.add(resizingClass)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div
      className={cn('gap-divider', idle && 'is-idle', active && 'is-active')}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title="拖拽调整宽度 · 双击恢复默认"
      onMouseDown={onResizeStart}
      onDoubleClick={onReset}
    />
  )
}

export default GapDivider
