/**
 * flubber 类型声明（该包未自带类型）
 * - 仅声明本项目用到的最小 API：interpolate / separate / combine
 */
declare module 'flubber' {
  /** 路径插值器：输入进度 t（0-1），输出 SVG path d */
  export type Interpolator = (t: number) => string
  export function interpolate(from: unknown, to: unknown, options?: unknown): Interpolator
  /** 多条路径整体形变（to 可以是路径数组） */
  export function separate(from: unknown, to: unknown, options?: unknown): Interpolator
  export function combine(...interpolators: unknown[]): Interpolator
}
