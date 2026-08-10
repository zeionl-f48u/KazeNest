/* 共享类型 */

/** 搜索项 */
export interface SearchItem {
  id: string
  title: string
  desc: string
  group: string
  icon: string
  color: string
}

/** 顶栏项类型（用于 type-safe 扩展）*/
export type TitlebarSlot = 'leading' | 'default' | 'trailing'
