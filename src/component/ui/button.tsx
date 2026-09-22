/**
 * Button：基础按钮（Rare UI / shadcn 风格）
 * - variant：default / primary / ghost / outline / danger
 * - size：sm / md / icon / icon-sm
 * - 微交互：按下缩放（ui-press）、hover 变色，纯 Tailwind + cn
 */
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import './ui.css'

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'outline' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'icon' | 'icon-sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const VARIANTS: Record<ButtonVariant, string> = {
  default:
    'border border-[var(--kn-border)] bg-[var(--kn-bg-elev)] text-[var(--kn-fg)] hover:bg-[var(--kn-hover)]',
  primary:
    'border border-transparent font-semibold bg-[var(--kn-primary)] text-[var(--kn-primary-fg)] hover:opacity-90',
  ghost:
    'border border-transparent bg-transparent text-[var(--kn-fg-muted)] hover:bg-[var(--kn-hover)] hover:text-[var(--kn-fg)]',
  outline:
    'border border-[var(--kn-border)] bg-transparent text-[var(--kn-fg)] hover:bg-[var(--kn-hover)]',
  danger:
    'border border-transparent text-[var(--kn-rose-500)] bg-[color-mix(in_srgb,var(--kn-rose-500)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--kn-rose-500)_20%,transparent)]',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 gap-1.5 px-2.5 text-xs rounded-md',
  md: 'h-8 gap-1.5 px-3.5 text-sm rounded-lg',
  icon: 'h-8 w-8 rounded-lg',
  'icon-sm': 'h-6 w-6 rounded-md',
}

export function Button({ variant = 'default', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'ui-press ui-lift inline-flex shrink-0 cursor-pointer items-center justify-center font-medium select-none',
        'disabled:cursor-default disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  )
}
