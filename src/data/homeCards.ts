/**
 * 首页快捷入口卡片数据
 * 实际项目可从后端 / 配置加载
 */
export interface HomeCard {
  id: string
  title: string
  desc: string
  icon: string
  color: string
  /** 点击后跳转的视图 id（对应 activityItems / App.vue 的视图） */
  target: string
}

export const homeCards: HomeCard[] = [
  { id: 'new-file',      title: '新建文件',   icon: 'file-plus',   desc: '从零开始创建一个文件',      color: 'var(--kn-brand-500)',  target: 'editor' },
  { id: 'open-workspace', title: '打开工作区', icon: 'folder-open', desc: '打开本地文件夹开始编码',    color: 'var(--kn-amber-500)',  target: 'files' },
  { id: 'editor',        title: '编辑器',     icon: 'file-text',   desc: '进入代码编辑器',           color: 'var(--kn-sky-500)',    target: 'editor' },
  { id: 'ai',            title: 'AI 助手',    icon: 'sparkles',    desc: '让 AI 帮你写、读、想',      color: 'var(--kn-magenta-500)', target: 'ai' },
  { id: 'browser',       title: '浏览器',     icon: 'globe',       desc: '内嵌 Web 视图与历史',      color: 'var(--kn-emerald-500)', target: 'browser' },
  { id: 'settings',      title: '设置',       icon: 'cog',         desc: '主题、快捷键与偏好',       color: 'var(--kn-fg-muted)',   target: 'settings' },
]
