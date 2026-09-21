/**
 * 基础控件（React 版）：Switch / Slider / Segmented
 * - 纯样式组件（受控）：外观遵循 Rare UI / shadcn 风格与设计令牌
 * - Switch：胶囊轨道 + 圆点滑动
 * - Slider：原生 range + 品牌色轨道 + 数值徽标
 * - Segmented：分段选择（胶囊容器 + 激活项浮起）
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ==================== Switch ==================== */

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  'aria-label'?: string
}

export function Switch({ checked, onChange, disabled, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest['aria-label']}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border border-transparent',
        'transition-colors duration-150 disabled:cursor-default disabled:opacity-45',
        checked
          ? 'bg-[linear-gradient(135deg,var(--kn-brand-500),var(--kn-magenta-500))]'
          : 'bg-[color-mix(in_srgb,var(--kn-fg)_18%,transparent)]'
      )}
    >
      <span
        className={cn(
          'inline-block h-[16px] w-[16px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]',
          'transition-transform duration-150',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        )}
      />
    </button>
  )
}

/* ==================== Slider ==================== */

export interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** 右侧数值后缀（如 px） */
  unit?: string
  disabled?: boolean
  'aria-label'?: string
}

export function Slider({ value, min, max, step = 1, onChange, unit = '', disabled, ...rest }: SliderProps) {
  return (
    <div className="inline-flex items-center gap-3">
      <input
        type="range"
        className="ui-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={rest['aria-label']}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="inline-flex h-[20px] min-w-[46px] items-center justify-center rounded-md bg-[var(--kn-bg-sunken)] px-2 text-[11px] font-semibold tabular-nums text-[var(--kn-fg-muted)]">
        {value}
        {unit}
      </span>
    </div>
  )
}

/* ==================== Segmented ==================== */

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
}

export interface SegmentedProps<T extends string> {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  'aria-label'?: string
}

export function Segmented<T extends string>({ value, options, onChange, ...rest }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={rest['aria-label']}
      className="inline-flex gap-0.5 rounded-lg border border-[var(--kn-border)] bg-[var(--kn-bg-sunken)] p-[3px]"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'ui-press inline-flex h-[24px] cursor-pointer items-center rounded-md px-3 text-xs font-medium',
            opt.value === value
              ? 'bg-[var(--kn-bg-elev)] text-[var(--kn-fg)] shadow-[var(--kn-shadow-md)]'
              : 'text-[var(--kn-fg-muted)] hover:text-[var(--kn-fg)]'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
