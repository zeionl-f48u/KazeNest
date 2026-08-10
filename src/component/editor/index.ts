/**
 * Editor 组件入口
 * 一次性 import './tokens.css' 注册全局设计 token；
 * 之后按需 named import 即可。
 */
import './tokens.css'

export { default as EditorTabs } from './EditorTabs.vue'
export { default as CodeView } from './CodeView.vue'
export { default as StatusBar } from './StatusBar.vue'
