/**
 * Badge / Kbd / Separator：小件基础组件（Rare UI / shadcn 风格）
 */
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ==================== Badge ==================== */

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** 主题色（--tint 变量；缺省为品牌色） */
  tint?: string
  children: ReactNode
}

export function Badge({ tint = 'var(--kn-brand-500)', className, children, ...props }: BadgeProps) {
  return (
    <span
      style={{ '--tint': tint } as React.CSSProperties}
      className={cn(
        'inline-flex h-[18px] items-center rounded-full px-2 text-[10px] font-semibold whitespace-nowrap',
        'bg-[color-mix(in_srgb,var(--tint)_14%,transparent)] text-[var(--tint)]',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/* ==================== Kbd ==================== */

export function Kbd({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-[18px] items-center rounded border border-[var(--kn-border)]',
        'bg-[color-mix(in_srgb,var(--kn-fg)_5%,transparent)] px-1.5',
        'font-sans text-[10px] text-[var(--kn-fg-muted)]',
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}

/* ==================== Separator ==================== */

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
}

export function Separator({ orientation = 'horizontal', className, ...props }: SeparatorProps) {
  return (
    <div
      role="separator"
      className={cn(
        'shrink-0 bg-[var(--kn-border)]',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className
      )}
      {...props}
    />
  )
}
