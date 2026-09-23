/**
 * AiPanel：AI 右侧面板（React 版）
 * - 未展开（其他视图）：panel 紧凑形态；展开（AI 视图）：page 全宽形态
 * - 收回稳定性：收回期间冻结内容布局（只被裁剪，不重排）→ 收尾渐隐 → 换形态渐显
 * - 左边缘拖拽调宽；拖到吸附阈值内松手 → 完全收起（onClose）
 */
import { useEffect, useRef, useState } from 'react'
import { AiWorkspace } from './AiWorkspace'
import './ai.css'

export interface AiPanelProps {
  expanded: boolean
  onExpand: () => void
  onClose: () => void
}

const RETRACT_MS = 430

export function AiPanel({ expanded, onExpand, onClose }: AiPanelProps) {
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

  return (
    <div
      ref={rootRef}
      className={`aip${expanded ? ' is-expanded' : ''}${retracting ? ' is-retracting' : ''}`}
    >
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
