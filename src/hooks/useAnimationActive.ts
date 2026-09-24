/**
 * useAnimationActive：元素可见且页面在前台时才为 true
 * ------------------------------------------------------------
 * 供组件内部的动画循环（rAF / WebGL）使用：
 * 离屏或切到后台时暂停循环，避免常驻动画空耗 CPU/GPU。
 * 用法：
 *   const active = useAnimationActive(canvasRef)
 *   useEffect(() => { if (!active) return; ...循环... }, [active, ...])
 */
import { useEffect, useState, type RefObject } from 'react'

export function useAnimationActive(ref: RefObject<Element | null>): boolean {
  const [active, setActive] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    let inView = true
    const sync = () => setActive(inView && document.visibilityState === 'visible')

    /* rootMargin 留一点余量，减少滚动时的频繁切换 */
    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true
        sync()
      },
      { rootMargin: '120px' }
    )
    io.observe(el)
    document.addEventListener('visibilitychange', sync)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [ref])

  return active
}
