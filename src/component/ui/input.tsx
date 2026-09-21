/**
 * Input / Textarea：基础输入（Rare UI / shadcn 风格）
 * - 聚焦时品牌色描边 + 外发光（--kn-shadow-focus）
 */
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const BASE =
  'w-full min-w-0 border border-[var(--kn-border)] bg-[var(--kn-bg)] text-[var(--kn-fg)] ' +
  'placeholder:text-[var(--kn-fg-subtle)] outline-none transition-[border-color,box-shadow] ' +
  'focus:border-[color-mix(in_srgb,var(--kn-brand-500)_55%,transparent)] focus:shadow-[var(--kn-shadow-focus)] ' +
  'disabled:cursor-default disabled:opacity-50'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(BASE, 'h-8 rounded-lg px-3 text-sm', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(BASE, 'resize-vertical rounded-lg px-3 py-2 text-xs leading-relaxed', className)}
      {...props}
    />
  )
}
