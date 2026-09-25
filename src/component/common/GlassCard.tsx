/**
 * GlassCard：玻璃风格卡片（React 版，视觉与 Vue 版一致）
 * - 三个区域：媒体（图标）/ 内容（标题 + 描述或自定义）/ 底部（footer）
 * - hover 微抬 + 阴影加深（interactive 时）
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from './Icon'

export interface GlassCardProps {
  title?: string
  desc?: string
  icon?: string
  /** 主题色，作用于图标底色与文字；缺省品牌色 */
  color?: string
  /** hover 微抬（卡片网格场景） */
  interactive?: boolean
  footer?: ReactNode
  children?: ReactNode
  onClick?: () => void
  /** 额外样式（如网格中拉伸填满：h-full） */
  className?: string
}

export function GlassCard({
  title,
  desc,
  icon,
  color,
  interactive,
  footer,
  children,
  onClick,
  className,
}: GlassCardProps) {
  return (
    <article
      onClick={onClick}
      className={cn(
        className,
        'relative flex flex-col gap-3 rounded-2xl p-5 text-[var(--kn-fg)]',
        'bg-[var(--kn-glass-bg)] backdrop-blur-[var(--kn-glass-blur)] backdrop-saturate-[var(--kn-glass-saturation)]',
        'border border-[var(--kn-glass-border)] shadow-[var(--kn-glass-shadow)]',
        'transition-[transform,box-shadow,border-color] duration-[var(--kn-dur-base)] ease-out',
        interactive && 'group cursor-pointer hover:-translate-y-[3px] hover:shadow-[var(--kn-shadow-lg)]'
      )}
    >
      {icon && (
        <div className="flex items-center">
          <span
            style={color ? { background: `color-mix(in srgb, ${color} 18%, transparent)`, color } : undefined}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-xl',
              'bg-[color-mix(in_srgb,var(--kn-brand-500)_18%,transparent)] text-[var(--kn-brand-500)]',
              'transition-transform duration-[var(--kn-dur-base)] ease-out',
              interactive && 'group-hover:scale-[1.08] group-hover:-rotate-3'
            )}
          >
            <Icon name={icon} size={20} />
          </span>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {title && <h3 className="m-0 text-lg font-semibold tracking-[0.1px]">{title}</h3>}
        <div className="text-sm leading-[1.55] text-[var(--kn-fg-muted)]">
          {children ?? (desc && <p className="m-0">{desc}</p>)}
        </div>
      </div>

      {footer && (
        <footer className="flex items-center justify-end gap-2 border-t border-[var(--kn-border)] pt-2">
          {footer}
        </footer>
      )}
    </article>
  )
}
