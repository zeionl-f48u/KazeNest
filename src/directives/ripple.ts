/**
 * v-ripple：Material Design 水波纹点击反馈（安卓风格）
 * 用法：
 *   <button v-ripple>点击</button>
 *   <button v-ripple="{ color: 'rgba(255,255,255,0.5)' }">自定义波纹色</button>
 * 依赖全局样式 .kn-ripple / @keyframes kn-ripple（src/styles/effects.css）
 */
import type { Directive } from 'vue'

export interface RippleOptions {
  /** 波纹颜色；缺省用 currentColor */
  color?: string
  /** 是否禁用 */
  disabled?: boolean
}

const handlers = new WeakMap<HTMLElement, (e: PointerEvent) => void>()

export const ripple: Directive<HTMLElement, RippleOptions | undefined> = {
  mounted(el, binding) {
    const onPointerDown = (e: PointerEvent) => {
      const options = binding.value
      if (options?.disabled) return
      if (e.button !== 0 && e.pointerType === 'mouse') return

      const rect = el.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      const span = document.createElement('span')
      span.className = 'kn-ripple'
      span.style.width = `${size}px`
      span.style.height = `${size}px`
      span.style.left = `${x}px`
      span.style.top = `${y}px`
      if (options?.color) span.style.setProperty('--kn-ripple-color', options.color)
      el.appendChild(span)
      span.addEventListener('animationend', () => span.remove())
    }
    handlers.set(el, onPointerDown)
    el.addEventListener('pointerdown', onPointerDown)
  },
  unmounted(el) {
    const handler = handlers.get(el)
    if (handler) el.removeEventListener('pointerdown', handler)
    handlers.delete(el)
  },
}
