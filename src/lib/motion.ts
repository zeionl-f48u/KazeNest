/**
 * 全项目动效 token（克制 macOS 风）
 * ------------------------------------------------------------
 * 准则：
 *  - 会移动 / 变形的用弹簧（可中断、可重定向），不用一次性 keyframe
 *  - 大面板与视图用平滑弹簧（几乎无回弹），小元素允许轻微弹
 *  - 退出动画短于进入动画：减少"两层同时存在"的时间
 *  - 统一从 SPRING / EASE 取值，禁止各处再写零散曲线
 */
import type { Transition, Variants } from 'motion/react'

/** 弹簧参数（useSpring 等 motion value 场景使用） */
export const SPRING_OPTIONS: Record<
  'smooth' | 'snappy' | 'gentle',
  { stiffness: number; damping: number; mass: number }
> = {
  smooth: { stiffness: 320, damping: 34, mass: 1 },
  snappy: { stiffness: 460, damping: 38, mass: 0.9 },
  gentle: { stiffness: 220, damping: 30, mass: 1 },
}

/** 弹簧档位（transition 场景使用） */
export const SPRING: Record<'smooth' | 'snappy' | 'gentle', Transition> = {
  /** 面板 / 侧栏 / 视图：稳重无回弹 */
  smooth: { type: 'spring', ...SPRING_OPTIONS.smooth },
  /** 按压 / hover / 小元素：更跟手 */
  snappy: { type: 'spring', ...SPRING_OPTIONS.snappy },
  /** 大面积弱动效 */
  gentle: { type: 'spring', ...SPRING_OPTIONS.gentle },
}

/** 曲线（仅退出 / 淡出等一次性过渡使用） */
export const EASE: Record<'apple' | 'inOut', [number, number, number, number]> = {
  apple: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
}

/* ==================== 视图切换（方向感） ==================== */

/** 进入位移（px）；退出位移更小、更快 */
const VIEW_ENTER_X = 24
const VIEW_EXIT_X = 16
const VIEW_EXIT_DURATION = 0.13

/**
 * 生成方向相关的视图过渡：
 * @param dir 1 = 前进（向右推进）/ -1 = 后退 / 0 = 原地（纯淡入）
 */
export function viewVariants(dir: number): Variants {
  const enterX = dir > 0 ? VIEW_ENTER_X : dir < 0 ? -VIEW_ENTER_X : 0
  const exitX = dir > 0 ? -VIEW_EXIT_X : dir < 0 ? VIEW_EXIT_X : 0

  return {
    initial: { opacity: 0, x: enterX, scale: 0.995 },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: SPRING.smooth,
    },
    exit: {
      opacity: 0,
      x: exitX,
      scale: 0.998,
      transition: { duration: VIEW_EXIT_DURATION, ease: EASE.apple },
    },
  }
}

/* ==================== 浮层（Dialog / Dropdown / Popover） ==================== */

export const POPOVER: Variants = {
  initial: { opacity: 0, scale: 0.96, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0, transition: SPRING.snappy },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -2,
    transition: { duration: 0.12, ease: EASE.apple },
  },
}

/* ==================== 卡片入场（视口内错峰） ==================== */

/** 卡片错峰延迟：上限 max 个，避免长列表动画拖沓 */
export function cardDelay(index: number, step = 0.035, max = 8): Transition {
  return { delay: Math.min(index, max) * step }
}

export const CARD_IN: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

/** 视口内触发的入场（配合 whileInView 使用） */
export const CARD_VIEWPORT = { once: true, margin: '0px 0px -10% 0px' } as const
