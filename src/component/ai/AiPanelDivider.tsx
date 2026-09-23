/**
 * AiPanelDivider：主内容与 AI 面板之间的独立分隔线（区块间隙正中）
 * - 独立元素：常驻显示，不依赖面板/手柄的悬停状态
 * - 拖拽调整 AI 面板宽度；拖到吸附阈值内松手 → 收起面板
 * - 双击恢复默认宽度
 */
import { AI_PANEL_SNAP_CLOSE } from '@/hooks/useAiPanel'

export interface AiPanelDividerProps {
  /** 面板正在开合动画中（不可拖拽） */
  idle?: boolean
  width: number
  onWidthChange: (width: number) => void
  onClose: () => void
  onResetWidth: () => void
}

export function AiPanelDivider({
  idle = false,
  width,
  onWidthChange,
  onClose,
  onResetWidth,
}: AiPanelDividerProps) {
  const onResizeStart = (e: React.MouseEvent) => {
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
      className={`aip-divider${idle ? ' is-idle' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label="调整 AI 面板宽度"
      title="拖拽调整宽度 · 双击恢复默认"
      onMouseDown={onResizeStart}
      onDoubleClick={onResetWidth}
    />
  )
}

export default AiPanelDivider
