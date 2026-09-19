/**
 * 平台检测（前端侧统一入口）
 * - macOS：顶栏为交通灯（红黄绿）让位、快捷键显示 ⌘（⌘K / ⌘⌥I）
 * - 用 userAgent + platform 双判定：Tauri WebView2 / WKWebView / WebKitGTK 均适用
 *   （本项目无 SSR，navigator 恒可用）
 */
export const isMac =
  /mac/i.test(navigator.userAgent) || /Mac/.test(navigator.platform ?? '')
