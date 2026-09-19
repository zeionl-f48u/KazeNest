/**
 * macOS 原生菜单（菜单移至系统顶栏，由 macOS 管理）
 * - 仅 macOS + Tauri 运行时执行；Windows / Linux 保持应用内自绘菜单
 * - 动态 import 菜单模块（非 mac 平台不加载，不增加启动开销）
 * - 菜单项通过全局事件与 App 通信（与自绘菜单同一入口语义）：
 *   · kn:navigate → 视图切换（App.vue 的 onNavigate 已监听）
 *   · kn:command  → 应用命令（开关侧边栏 / AI 面板）
 * - "编辑"菜单使用系统预定义项：保证 ⌘C / ⌘V / ⌘A 等标准快捷键在 WebView 内生效
 * - 任何失败静默回退到应用内菜单（不影响使用）
 */
import { isMac } from './platform'

/** 是否运行在 Tauri 运行时（纯浏览器 dev 为 false） */
function inTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function initMacNativeMenu(): Promise<void> {
  if (!isMac || !inTauri()) return

  try {
    const { Menu, Submenu, PredefinedMenuItem, MenuItem } = await import('@tauri-apps/api/menu')

    /** 视图切换项（复用 kn:navigate 事件） */
    const viewItem = (label: string, view: string) =>
      MenuItem.new({
        text: label,
        action: () => window.dispatchEvent(new CustomEvent('kn:navigate', { detail: view })),
      })

    /** 应用命令项（kn:command 事件） */
    const commandItem = (label: string, command: string) =>
      MenuItem.new({
        text: label,
        action: () => window.dispatchEvent(new CustomEvent('kn:command', { detail: command })),
      })

    /* ---- 应用菜单（KazeNest）：关于 / 隐藏 / 退出 ---- */
    const appMenu = await Submenu.new({
      text: 'KazeNest',
      items: [
        await PredefinedMenuItem.new({ item: { About: { name: 'KazeNest', version: '0.1.0' } } }),
        await PredefinedMenuItem.new({ item: 'Separator' }),
        await PredefinedMenuItem.new({ item: 'Services' }),
        await PredefinedMenuItem.new({ item: 'Separator' }),
        await PredefinedMenuItem.new({ item: 'Hide' }),
        await PredefinedMenuItem.new({ item: 'HideOthers' }),
        await PredefinedMenuItem.new({ item: 'ShowAll' }),
        await PredefinedMenuItem.new({ item: 'Separator' }),
        await PredefinedMenuItem.new({ item: 'Quit' }),
      ],
    })

    /* ---- 编辑：系统预定义项（⌘Z/⌘X/⌘C/⌘V/⌘A 生效的关键） ---- */
    const editMenu = await Submenu.new({
      text: '编辑',
      items: [
        await PredefinedMenuItem.new({ item: 'Undo' }),
        await PredefinedMenuItem.new({ item: 'Redo' }),
        await PredefinedMenuItem.new({ item: 'Separator' }),
        await PredefinedMenuItem.new({ item: 'Cut' }),
        await PredefinedMenuItem.new({ item: 'Copy' }),
        await PredefinedMenuItem.new({ item: 'Paste' }),
        await PredefinedMenuItem.new({ item: 'SelectAll' }),
      ],
    })

    /* ---- 视图：视图切换 + 面板开关 + 全屏 ---- */
    const viewMenu = await Submenu.new({
      text: '视图',
      items: [
        await viewItem('首页', 'home'),
        await viewItem('编辑器', 'editor'),
        await viewItem('文件管理', 'files'),
        await viewItem('AI 助手', 'ai'),
        await viewItem('浏览器', 'browser'),
        await viewItem('插件市场', 'marketplace'),
        await viewItem('设置', 'settings'),
        await viewItem('账户', 'account'),
        await PredefinedMenuItem.new({ item: 'Separator' }),
        await commandItem('显示/隐藏侧边栏', 'toggle-sidebar'),
        await commandItem('显示/隐藏 AI 面板', 'toggle-ai-panel'),
        await PredefinedMenuItem.new({ item: 'Separator' }),
        await PredefinedMenuItem.new({ item: 'Fullscreen' }),
      ],
    })

    /* ---- 窗口 ---- */
    const windowMenu = await Submenu.new({
      text: '窗口',
      items: [
        await PredefinedMenuItem.new({ item: 'Minimize' }),
        await PredefinedMenuItem.new({ item: 'Maximize' }),
        await PredefinedMenuItem.new({ item: 'Separator' }),
        await PredefinedMenuItem.new({ item: 'CloseWindow' }),
      ],
    })

    const menu = await Menu.new({ items: [appMenu, editMenu, viewMenu, windowMenu] })
    await menu.setAsAppMenu()
  } catch (error) {
    console.warn('[nativeMenu] macOS 原生菜单初始化失败，已回退应用内菜单：', error)
  }
}
