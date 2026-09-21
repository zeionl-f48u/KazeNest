/**
 * 浏览器视图共享类型（React 版）
 */

/** 标签页 */
export interface BrowserTab {
  id: number
  /** 标签标题（新标签页 / 域名） */
  title: string
  /** 当前地址（'' = 新标签页） */
  url: string
  /** favicon 占位色/字母 */
  color: string
  letter: string
  loading: boolean
  /** 前进后退历史（url 数组） */
  history: string[]
  histIndex: number
  /** 所属标签组（undefined = 未分组） */
  groupId?: number
}

/** 标签组（Edge 风格：颜色 + 名称 + 折叠态） */
export interface BrowserGroup {
  id: number
  name: string
  color: string
  collapsed: boolean
}

/** 书签 */
export interface Bookmark {
  url: string
  title: string
}
