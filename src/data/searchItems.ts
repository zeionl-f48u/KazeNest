/**
 * 顶栏全局搜索的候选项
 * 实际项目可从 Tauri 后端 / 索引服务取
 *
 * 调节指南：
 *  - 增删候选项：数组里加减一条；group 决定在结果里归到哪一组
 *  - icon 名来自 Icon.vue 的 ICONS 表；color 是结果左侧图标底色
 *  - 选中后的行为在 App.vue 的 onSearchSelect 里接
 */
export interface SearchItem {
  id: string
  title: string
  desc: string
  group: string
  icon: string
  color: string
}

export const searchItems: SearchItem[] = [
  { id: 'nav.home',    title: '首页',     desc: '欢迎页与快捷入口',      group: '导航', icon: 'home',       color: '#6366f1' },
  { id: 'nav.editor',  title: '编辑器',   desc: '代码编辑与预览',        group: '导航', icon: 'file-text',  color: '#0ea5e9' },
  { id: 'nav.files',   title: '文件管理', desc: '浏览、搜索与预览文件', group: '导航', icon: 'folder',     color: '#f59e0b' },
  { id: 'nav.ai',      title: 'AI 助手',  desc: '让 AI 帮你写、读、想', group: '导航', icon: 'sparkles',   color: '#ec4899' },
  { id: 'nav.browser', title: '浏览器',   desc: '内嵌 Web 视图与历史',  group: '导航', icon: 'globe',      color: '#10b981' },
  { id: 'nav.settings', title: '设置',    desc: '主题、快捷键与偏好',   group: '导航', icon: 'cog',        color: '#64748b' },
  { id: 'cmd.theme',    title: '切换主题', desc: '在亮色与暗色之间切换', group: '命令', icon: 'moon',       color: '#8b5cf6' },
  { id: 'cmd.new-file', title: '新建文件', desc: '在当前位置创建新文件', group: '命令', icon: 'file-plus',  color: '#3b82f6' },
  { id: 'cmd.search',   title: '打开搜索', desc: '聚焦到搜索面板',       group: '命令', icon: 'search',     color: '#0ea5e9' },
  { id: 'set.shortcut', title: '快捷键',   desc: '查看与自定义快捷键',   group: '设置', icon: 'keyboard',   color: '#ef4444' },
  { id: 'set.account',  title: '账户',     desc: '登录、同步与备份',     group: '设置', icon: 'user',       color: '#06b6d4' },
]
