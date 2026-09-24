/**
 * Dropdown：通用下拉面板（Rare UI 风格 + Motion 弹簧进出场）
 * - Portal 到 body（避免被父容器 overflow 裁剪）
 * - 按锚点坐标定位（自动限制在窗口内）；Esc / 点击遮罩关闭
 * - 条目：图标 + 文案 + meta（快捷键/时间），支持分隔线与勾选态
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { SPRING, EASE } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Icon } from '@/component/common/Icon'
import './ui.css'

export interface DropdownItem {
  id: string
  label: string
  icon?: string
  /** 图标颜色（如通知类型色） */
  color?: string
  /** 右侧提示（快捷键 / 时间） */
  meta?: string
  /** 勾选态（工作区当前项等） */
  checked?: boolean
  /** 未读圆点（通知等） */
  dot?: boolean
  /** 分隔线 */
  separator?: boolean
}

export interface DropdownProps {
  items: DropdownItem[]
  title?: string
  /** 锚点（视口坐标；面板出现在 y 下方、贴近 x 左对齐） */
  x: number
  y: number
  onSelect: (item: DropdownItem) => void
  onClose: () => void
}

const PANEL_WIDTH = 230

export function Dropdown({ items, title, x, y, onSelect, onClose }: DropdownProps) {
  const reduced = useReducedMotion() ?? false
  // 内部可见态：关闭时先播退场动画，结束后再通知父组件卸载
  const [visible, setVisible] = useState(true)
  const close = () => setVisible(false)

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [])

  const left = Math.max(8, Math.min(x, window.innerWidth - PANEL_WIDTH - 8))

  return createPortal(
    <AnimatePresence onExitComplete={onClose}>
      {visible && (
        <motion.div
          key="dd-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.14, ease: EASE.apple }}
          className="fixed inset-0 z-[2900]"
          onClick={close}
        >
          <motion.div
            role="menu"
            style={{ top: y, left, minWidth: PANEL_WIDTH }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
            transition={reduced ? { duration: 0 } : SPRING.snappy}
            className={cn(
              'fixed z-[3000] flex max-h-[min(420px,calc(100vh-80px))] flex-col overflow-y-auto',
              'rounded-xl border border-[var(--kn-border-strong)] bg-[var(--kn-bg-elev)] p-1.5 shadow-[var(--kn-shadow-lg)]'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold tracking-[0.4px] text-[var(--kn-fg-subtle)] uppercase">
                {title}
              </div>
            )}

            {items.map((it) =>
              it.separator ? (
                <div key={it.id} className="my-1 h-px bg-[var(--kn-border)]" />
              ) : (
                <button
                  key={it.id}
                  type="button"
                  role="menuitem"
                  onClick={() => onSelect(it)}
                  className="ui-press flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-[7px] text-left text-sm whitespace-nowrap text-[var(--kn-fg)] hover:bg-[var(--kn-hover)]"
                >
                  <span className="inline-flex w-3 shrink-0 items-center justify-center text-[var(--kn-brand-500)]">
                    {it.checked && <Icon name="check" size={11} />}
                  </span>
                  {it.dot && (
                    <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--kn-brand-500)]" />
                  )}
                  {it.icon && (
                    <Icon name={it.icon} size={13} className="shrink-0 opacity-75" color={it.color} />
                  )}
                  <span className="min-w-0 flex-1 overflow-hidden text-ellipsis">{it.label}</span>
                  {it.meta && (
                    <span className="shrink-0 text-[10px] text-[var(--kn-fg-subtle)]">{it.meta}</span>
                  )}
                </button>
              )
              )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
