/**
 * Titlebar 组件入口（React 版）
 * 一次性 import tokens.css 注册设计令牌；之后按需 named import。
 */
import './tokens.css'

export { Titlebar } from './Titlebar'
export { TitlebarChrome } from './TitlebarChrome'
export { SearchTrigger } from './SearchTrigger'
export { SearchPanel } from './SearchPanel'
export { Dropdown as TbDropdown } from '../ui/dropdown'
export type { DropdownItem } from '../ui/dropdown'
export type { SearchItem } from './types'
