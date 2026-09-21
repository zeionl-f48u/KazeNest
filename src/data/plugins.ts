/**
 * 插件市场演示数据（页面与侧栏共用）
 * 接真实插件源后替换为远端数据
 */
export interface PluginDef {
  id: string
  name: string
  author: string
  desc: string
  /** 分类（对应 pluginCategories 中的项） */
  category: string
  icon: string
  /** 图标主题色 */
  color: string
  /** 下载量展示文本 */
  downloads: string
  /** 评分（0-5，一位小数） */
  rating: number
  installed?: boolean
  /** 是否官方推荐（卡片角标） */
  featured?: boolean
}

export const pluginCategories = ['全部', '主题', '语言支持', '工具', 'AI', '调试', '测试', '部署'] as const

export const plugins: PluginDef[] = [
  { id: 'p-theme',   name: 'Aurora Themes',    author: 'KazeNest 官方', desc: '一组柔和的极光配色主题，含亮色与暗色两套', category: '主题',     icon: 'palette',  color: 'var(--kn-brand-500)',   downloads: '128k', rating: 4.9, installed: true, featured: true },
  { id: 'p-snip',    name: 'React Snippets',   author: 'community',   desc: 'React 常用片段：hooks、组件模板、类型定义', category: '语言支持', icon: 'file-plus', color: 'var(--kn-sky-500)',     downloads: '96k',  rating: 4.8, installed: true },
  { id: 'p-md',      name: 'Markdown Preview', author: 'community',   desc: '实时预览 Markdown，支持数学公式与图表',   category: '工具',     icon: 'file-text', color: 'var(--kn-emerald-500)', downloads: '210k', rating: 4.7, installed: true },
  { id: 'p-commit',  name: 'AI Commit',        author: 'KazeNest 官方', desc: '根据改动自动生成规范的提交信息',          category: 'AI',       icon: 'sparkles',  color: 'var(--kn-magenta-500)', downloads: '88k',  rating: 4.9, featured: true },
  { id: 'p-rest',    name: 'REST Client',      author: 'community',   desc: '在编辑器内发送 HTTP 请求并查看响应',      category: '工具',     icon: 'globe',     color: 'var(--kn-amber-500)',   downloads: '154k', rating: 4.6 },
  { id: 'p-debug',   name: 'Debug Toolkit',    author: 'KazeNest 官方', desc: '断点、变量面板与调用栈增强',             category: '调试',     icon: 'debug',     color: 'var(--kn-rose-500)',    downloads: '72k',  rating: 4.7 },
  { id: 'p-test',    name: 'Test Runner',      author: 'community',   desc: '在编辑器侧栏运行与调试单元测试',          category: '测试',     icon: 'terminal',  color: 'var(--kn-emerald-500)', downloads: '64k',  rating: 4.5 },
  { id: 'p-docker',  name: 'Container Tools',  author: 'community',   desc: '管理镜像与容器，查看日志与资源占用',      category: '部署',     icon: 'archive',   color: 'var(--kn-sky-500)',     downloads: '119k', rating: 4.6 },
  { id: 'p-format',  name: 'Prettier+',        author: 'community',   desc: '增强格式化：保存自动格式化与规则集',      category: '工具',     icon: 'indent',    color: 'var(--kn-fg-muted)',    downloads: '302k', rating: 4.8, installed: true },
  { id: 'p-i18n',    name: 'i18n Lens',        author: 'community',   desc: '在代码中内联显示翻译文案，缺失高亮',      category: '语言支持', icon: 'globe',     color: 'var(--kn-brand-400)',   downloads: '41k',  rating: 4.4 },
]
