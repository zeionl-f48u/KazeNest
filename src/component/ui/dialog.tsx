/**
 * Dialog：模态对话框（Rare UI 风格：Portal + 遮罩模糊 + 缩放淡入）
 * - Esc / 点击遮罩 / 关闭按钮 均可关闭
 * - 打开时锁定 body 滚动（桌面应用内滚动容器多为局部，影响很小）
 */
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Icon } from '@/component/common/Icon'
import './ui.css'

export interface DialogProps {
  open: boolean
  onClose: () => void
  /** 无障碍标题（配合 aria-label） */
  label?: string
  /** 是否显示右上角关闭按钮（默认 true） */
  closable?: boolean
  className?: string
  children: ReactNode
}

export function Dialog({ open, onClose, label, closable = true, className, children }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="ui-overlay-in fixed inset-0 z-[4000] flex items-center justify-center bg-[color-mix(in_srgb,#000_32%,transparent)] p-6 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={label}
        className={cn(
          'ui-dialog-in relative flex max-h-[calc(100vh-80px)] w-[380px] max-w-full flex-col overflow-hidden',
          'rounded-2xl border border-[var(--kn-border-strong)] bg-[var(--kn-bg-elev)] shadow-[var(--kn-shadow-lg)]',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {closable && (
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="ui-press absolute top-3 right-3 z-10 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[var(--kn-fg-subtle)] hover:bg-[var(--kn-hover)] hover:text-[var(--kn-fg)]"
          >
            <Icon name="times" size={13} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
