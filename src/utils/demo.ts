/**
 * 演示反馈（DemoDialog）
 * 用于"还没有真实功能"的按钮：点击后弹出一个统一的演示弹窗画面，
 * 让操作有明确反馈，而不是"点了没反应"。
 *
 * 用法（任意组件里）：
 *   import { showDemo } from '../../utils'
 *   showDemo({ title: '新建文件', desc: '演示模式：该功能尚未接入' })
 *
 * 实现：派发全局事件 'kn:demo'，由挂在 App.vue 的 DemoDialog 组件统一渲染
 * （避免每个按钮各自维护弹窗状态）。
 */

/** 演示弹窗内容 */
export interface DemoPayload {
  /** 功能名（弹窗标题） */
  title: string
  /** 说明文字（缺省用统一的"演示模式"文案） */
  desc?: string
  /** 图标名（Icon 组件，缺省 sparkles） */
  icon?: string
  /** 图标色调（--tint，缺省品牌色） */
  tint?: string
}

export function showDemo(payload: DemoPayload) {
  window.dispatchEvent(new CustomEvent<DemoPayload>('kn:demo', { detail: payload }))
}
