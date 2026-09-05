import { createApp } from 'vue'
import App from './App.vue'

import './styles/tailwind.css'
import './styles/tokens.css'
import './styles/effects.css'

import { ripple } from './directives/ripple'

import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'

// 正确注册 PrimeVue 到 Vue 实例上（之前误把 Tauri 的 app 当成 Vue app）
const vueApp = createApp(App)
vueApp.directive('ripple', ripple)
vueApp.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      /* 暗色模式开关：
       * 给 <html> 加/去 class="dark" 即可切换（App.vue 依赖 .dark 变量）。
       * 之后做设置页时：document.documentElement.classList.toggle('dark') 就完事。
       */
      darkModeSelector: '.dark',
      /* cssLayer: false → PrimeVue 样式不包在 @layer 里，优先级更高。
       * 若之后全面用 Tailwind，想让它参与 layer 排序可改为 true。 */
      cssLayer: false,
    },
  },
})
vueApp.mount('#app')

/* ============================================================
 * 顶栏事件诊断器（仅开发模式生效；生产构建会被 tree-shake 掉）
 *
 * 用途：检查顶栏按钮是否被其他元素 / 事件处理函数拦截。
 * 用法：打开 DevTools 控制台，执行 `__TB_DEBUG__.enable()`，
 *       然后点击顶栏按钮，看控制台会输出：
 *       - 哪个元素收到了 mousedown（target）
 *       - 该元素是否在 .tb-slot 内
 *       - 是否最终触发了 click，以及 click 的 target 是什么
 *       - 任意一个步骤为 false，就说明事件在那一层被吃了
 * 关闭：`__TB_DEBUG__.disable()`
 * ============================================================ */
if (import.meta.env.DEV) {
  type DebugApi = {
    enable: () => void
    disable: () => void
    state: () => 'enabled' | 'disabled'
  }
  const debugApi: DebugApi = {
    state: () => 'disabled',
    enable() {
      if (this.state() === 'enabled') return
      const onDown = (e: MouseEvent) => {
        const t = e.target as HTMLElement | null
        if (!t) return
        const inSlot = !!t.closest('.tb-slot, .tb-leading, .tb-center')
        if (!inSlot) return
        console.log('[TB-DEBUG] mousedown on:', t, '| in titlebar =', inSlot, '| button? ', t.tagName)
      }
      const onClick = (e: MouseEvent) => {
        const t = e.target as HTMLElement | null
        if (!t) return
        const inSlot = !!t.closest('.tb-slot, .tb-leading, .tb-center')
        if (!inSlot) return
        const pe = getComputedStyle(t).pointerEvents
        const region = getComputedStyle(t).getPropertyValue('-webkit-app-region') || '(inherit)'
        console.log('[TB-DEBUG] click on:', t, '| pointer-events =', pe, '| app-region =', region)
      }
      window.addEventListener('mousedown', onDown, true)
      window.addEventListener('click', onClick, true)
      // 单独标一个全局开关，方便 disable 时清掉
      ;(window as unknown as { __TB_DEBUG_HANDLERS__: () => void }).__TB_DEBUG_HANDLERS__ = () => {
        window.removeEventListener('mousedown', onDown, true)
        window.removeEventListener('click', onClick, true)
      }
      this.state = () => 'enabled'
      console.log('[TB-DEBUG] enabled. 点击顶栏按钮看日志。')
    },
    disable() {
      ;(window as unknown as { __TB_DEBUG_HANDLERS__?: () => void }).__TB_DEBUG_HANDLERS__?.()
      this.state = () => 'disabled'
      console.log('[TB-DEBUG] disabled.')
    },
  }
  ;(window as unknown as { __TB_DEBUG__: DebugApi }).__TB_DEBUG__ = debugApi
}
