/**
 * 同步 tauri-plugin-decoration 注入的窗口控制器尺寸
 * ------------------------------------------------------------
 * 插件会把原生窗口控制条作为 overlay 注入到 body：
 *   [data-tauri-plugin-decoration-root]  → 固定 32px 高（Win/Linux 的 ─ ☐ ✕，macOS 的拖拽条）
 * 这里自动读取它的实际高度并写入 --tb-height，
 * 让应用顶栏高度与原生控制器完全对齐（不再写死 52px）。
 *
 * 注意：
 * - 插件注入是异步的：先用 MutationObserver 等它出现，再用 ResizeObserver 跟踪变化
 * - 全屏时插件隐藏（高度 0），此时保留上一次的有效值
 * - 左右让位宽度由插件写入的 --tauri-plugin-decoration-{left,right}-clearance 提供，
 *   组件里直接消费，无需在这里处理
 */
const ROOT_SELECTOR = '[data-tauri-plugin-decoration-root]'

export function initDecorationMetrics() {
  if (typeof document === 'undefined') return () => {}

  const apply = (el: HTMLElement | null) => {
    const h = el?.offsetHeight ?? 0
    if (h > 0) {
      document.documentElement.style.setProperty('--tb-height', `${h}px`)
    }
  }

  const findRoot = () => document.querySelector<HTMLElement>(ROOT_SELECTOR)

  let ro: ResizeObserver | null = null
  const watch = (el: HTMLElement) => {
    ro?.disconnect()
    ro = new ResizeObserver(() => apply(el))
    ro.observe(el)
    apply(el)
  }

  const existing = findRoot()
  if (existing) {
    watch(existing)
  }

  const mo = new MutationObserver(() => {
    const el = findRoot()
    if (!el) return
    watch(el)
    mo.disconnect()
  })
  if (!existing) {
    mo.observe(document.body, { childList: true, subtree: true })
  }

  return () => {
    ro?.disconnect()
    mo.disconnect()
  }
}
