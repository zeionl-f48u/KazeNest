/**
 * AiPanel：AI 右侧面板（React 版）
 * - 未展开（其他视图）：panel 紧凑形态；展开（AI 视图）：page 全宽形态
 * - 收回稳定性：收回期间冻结内容布局（只被裁剪，不重排）→ 收尾渐隐 → 换形态渐显
 * - 左边缘拖拽调宽；拖到吸附阈值内松手 → 完全收起（onClose）
 */
import { useEffect, useRef, useState } from 'react'
import { AiWorkspace } from './AiWorkspace'
import { AI_PANEL_SNAP_CLOSE } from '@/hooks/useAiPanel'
import './ai.css'

export interface AiPanelProps {
  width: number
  expanded: boolean
  onExpand: () => void
  onClose: () => void
  onWidthChange: (width: number) => void
  onResetWidth: () => void
}

const RETRACT_MS = 430

export function AiPanel({ width, expanded, onExpand, onClose, onWidthChange, onResetWidth }: AiPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [variant, setVariant] = useState<'page' | 'panel'>(expanded ? 'page' : 'panel')
  const [retracting, setRetracting] = useState(false)
  const [freezeWidth, setFreezeWidth] = useState(0)
  const settleTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    window.clearTimeout(settleTimer.current)
    if (expanded) {
      setVariant('page')
      setRetracting(false)
      return
    }
    if (variant === 'page') {
      /* 收回：冻结当前（展开态）宽度，内容只被裁剪；收尾渐隐后切回紧凑形态 */
      setFreezeWidth(rootRef.current?.offsetWidth ?? 0)
      setRetracting(true)
      settleTimer.current = window.setTimeout(() => {
        setVariant('panel')
        setRetracting(false)
      }, RETRACT_MS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  useEffect(() => () => window.clearTimeout(settleTimer.current), [])

  /* ==================== 拖拽调宽 ==================== */

  const onResizeStart = (e: React.MouseEvent) => {
    if (expanded || retracting) return
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    let lastWidth = startWidth

    const onMove = (ev: MouseEvent) => {
      lastWidth = startWidth + (startX - ev.clientX)
      onWidthChange(lastWidth)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.classList.remove('ai-panel-resizing')
      if (lastWidth <= AI_PANEL_SNAP_CLOSE) onClose()
    }

    document.body.classList.add('ai-panel-resizing')
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div
      ref={rootRef}
      className={`aip${expanded ? ' is-expanded' : ''}${retracting ? ' is-retracting' : ''}`}
    >
      {!expanded && !retracting && (
        <div
          className="aip-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="调整面板宽度"
          onMouseDown={onResizeStart}
          onDoubleClick={onResetWidth}
        />
      )}

      <div
        className="aip-freeze"
        style={retracting ? { width: `${freezeWidth}px` } : undefined}
      >
        <AiWorkspace
          variant={variant}
          closable={expanded}
          onExpand={onExpand}
          onClose={onClose}
        />
      </div>
    </div>
  )
}
