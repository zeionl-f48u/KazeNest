/**
 * 顶栏菜单的占位条目（演示）
 * 菜单名 → 条目列表（对应数据 data/activityItems.ts 的 topMenus 与
 * registry/views.ts 中各视图的菜单）；点击条目由 UI 弹出"演示模式"画面，
 * 接真实功能时把对应条目替换为实现即可。
 */
export interface MenuEntry {
  id: string
  icon: string
  label: string
  /** 右侧快捷键提示（演示文本） */
  meta?: string
}

export const menuItemMap: Record<string, MenuEntry[]> = {
  文件: [
    { id: 'new-file', icon: 'file-plus', label: '新建文件', meta: 'Ctrl+N' },
    { id: 'open-file', icon: 'folder-open', label: '打开文件…', meta: 'Ctrl+O' },
    { id: 'open-folder', icon: 'folder', label: '打开文件夹…' },
    { id: 'save', icon: 'check', label: '保存', meta: 'Ctrl+S' },
    { id: 'save-all', icon: 'check', label: '全部保存', meta: 'Ctrl+K S' },
    { id: 'close-editor', icon: 'times', label: '关闭编辑器', meta: 'Ctrl+W' },
  ],
  编辑: [
    { id: 'undo', icon: 'restore', label: '撤销', meta: 'Ctrl+Z' },
    { id: 'redo', icon: 'forward', label: '重做', meta: 'Ctrl+Y' },
    { id: 'cut', icon: 'copy', label: '剪切', meta: 'Ctrl+X' },
    { id: 'copy', icon: 'copy', label: '复制', meta: 'Ctrl+C' },
    { id: 'paste', icon: 'copy', label: '粘贴', meta: 'Ctrl+V' },
    { id: 'find', icon: 'search', label: '查找', meta: 'Ctrl+F' },
    { id: 'replace', icon: 'search', label: '替换', meta: 'Ctrl+H' },
  ],
  选择: [
    { id: 'select-all', icon: 'check', label: '全选', meta: 'Ctrl+A' },
    { id: 'expand', icon: 'indent', label: '扩展选择' },
    { id: 'multi-cursor', icon: 'vertical-align', label: '多光标' },
  ],
  视图: [
    { id: 'command-palette', icon: 'search', label: '命令面板', meta: 'Ctrl+Shift+P' },
    { id: 'view-menu', icon: 'layout', label: '打开视图…' },
    { id: 'appearance', icon: 'palette', label: '外观' },
    { id: 'fullscreen', icon: 'maximize', label: '全屏' },
  ],
  转到: [
    { id: 'goto-file', icon: 'file-text', label: '转到文件…', meta: 'Ctrl+P' },
    { id: 'goto-symbol', icon: 'branch', label: '转到符号…', meta: 'Ctrl+Shift+O' },
    { id: 'goto-line', icon: 'indent', label: '转到行…', meta: 'Ctrl+G' },
  ],
  运行: [
    { id: 'start', icon: 'run', label: '开始调试', meta: 'F5' },
    { id: 'task', icon: 'debug', label: '运行任务' },
    { id: 'config', icon: 'cog', label: '管理配置' },
  ],
  终端: [
    { id: 'new-terminal', icon: 'terminal', label: '新建终端', meta: 'Ctrl+`' },
    { id: 'split-terminal', icon: 'layout', label: '拆分终端' },
    { id: 'clear-terminal', icon: 'times', label: '清空终端' },
  ],
  历史: [
    { id: 'back', icon: 'arrow-left', label: '后退', meta: 'Alt+←' },
    { id: 'forward', icon: 'arrow-right', label: '前进', meta: 'Alt+→' },
    { id: 'all-history', icon: 'clock', label: '显示全部历史' },
  ],
  书签: [
    { id: 'star-page', icon: 'star', label: '收藏当前页', meta: 'Ctrl+D' },
    { id: 'show-bar', icon: 'layout', label: '显示书签栏' },
    { id: 'manage', icon: 'cog', label: '管理书签' },
  ],
  工具: [
    { id: 'devtools', icon: 'terminal', label: '开发者工具' },
    { id: 'clear-data', icon: 'trash', label: '清除浏览数据' },
    { id: 'settings', icon: 'cog', label: '设置' },
  ],
  空间: [
    { id: 'library', icon: 'tag', label: '资料空间' },
    { id: 'private', icon: 'lock', label: '私有空间' },
    { id: 'new-folder', icon: 'folder', label: '新建文件夹' },
  ],
  会话: [
    { id: 'new-chat', icon: 'plus', label: '新建会话' },
    { id: 'history-chat', icon: 'clock', label: '历史会话' },
    { id: 'export-chat', icon: 'forward', label: '导出会话' },
  ],
  模型: [
    { id: 'model-r1', icon: 'sparkles', label: 'DeepSeek-R1' },
    { id: 'model-chat', icon: 'sparkles', label: 'DeepSeek-Chat' },
    { id: 'model-coder', icon: 'sparkles', label: 'DeepSeek-Coder' },
  ],
  插件: [
    { id: 'browse', icon: 'extensions', label: '浏览插件' },
    { id: 'installed', icon: 'check', label: '已安装' },
    { id: 'update', icon: 'refresh', label: '检查更新' },
  ],
  帮助: [
    { id: 'welcome', icon: 'home', label: '欢迎' },
    { id: 'docs', icon: 'file-text', label: '文档' },
    { id: 'shortcuts', icon: 'keyboard', label: '快捷键参考' },
    { id: 'about', icon: 'cloud', label: '关于 KazeNest' },
  ],
}

/** 取菜单条目（未登记的菜单给一个通用占位） */
export function menuEntriesOf(name: string): MenuEntry[] {
  return (
    menuItemMap[name] ?? [
      { id: 'demo-1', icon: 'dot', label: `${name} · 功能一` },
      { id: 'demo-2', icon: 'dot', label: `${name} · 功能二` },
    ]
  )
}
