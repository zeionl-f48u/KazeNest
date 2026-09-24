/**
 * ScrollIndicator：全局竖向滚动指示条（macOS 覆盖层风格）
 * ------------------------------------------------------------
 * 背景：原生滚动条（尤其 Windows）与应用的柔和风格不搭；
 * 这里隐藏原生竖条，改由本组件绘制一条细圆角指示条：
 *  - 任意滚动容器通用：监听 document 的 scroll（capture），按事件目标计算
 *  - 滚动时淡入，停止 0.9s 后淡出（类 macOS "滚动时显示指示器"）
 *  - 直接改 DOM 样式（不 setState），避免滚动时 React 逐帧重渲染
 *  - 指示条本身 pointer-events: none，不挡交互
 */
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

const FADE_DELAY = 900
const THUMB_WIDTH = 6
const EDGE_INSET = 3

/* 抑制窗口：视图切换等程序化滚动不显示指示条 */
let suppressedUntil = 0
export function suppressScrollIndicator(duration = 400) {
  suppressedUntil = performance.now() + duration
}

export function ScrollIndicator() {
  const thumbRef = useRef<HTMLDivElement>(null)
  const fadeTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const thumb = thumbRef.current
    if (!thumb) return

    const hide = () => {
      thumb.style.opacity = '0'
    }

    const onScroll = (e: Event) => {
      if (performance.now() < suppressedUntil) return
      const el = e.target
      if (!(el instanceof HTMLElement)) return
      const scrollable = el.scrollHeight - el.clientHeight
      if (scrollable <= 2) return

      const rect = el.getBoundingClientRect()
      if (rect.height <= 0 || rect.bottom < 0 || rect.top > window.innerHeight) return

      /* 轨道内缩，指示条高度按可视比例，位置按滚动进度 */
      const trackTop = rect.top + EDGE_INSET
      const trackHeight = rect.height - EDGE_INSET * 2
      const ratio = el.clientHeight / el.scrollHeight
      const thumbHeight = Math.max(28, Math.round(trackHeight * ratio))
      const maxTravel = trackHeight - thumbHeight
      const progress = maxTravel > 0 ? el.scrollTop / scrollable : 0
      const top = trackTop + Math.round(maxTravel * progress)

      thumb.style.opacity = '1'
      thumb.style.height = `${thumbHeight}px`
      thumb.style.left = `${Math.round(rect.right - THUMB_WIDTH - EDGE_INSET)}px`
      thumb.style.transform = `translateY(${top}px)`

      window.clearTimeout(fadeTimer.current)
      fadeTimer.current = window.setTimeout(hide, FADE_DELAY)
    }

    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true })
      window.clearTimeout(fadeTimer.current)
    }
  }, [])

  return (
    <div
      ref={thumbRef}
      aria-hidden="true"
      className={cn(
        'kn-scroll-indicator pointer-events-none fixed top-0 left-0 z-[500]',
        'w-[6px] rounded-full'
      )}
      style={{ opacity: 0, height: 0 }}
    />
  )
}

export default ScrollIndicator
