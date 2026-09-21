/**
 * 应用启动流程（useAppBoot）
 * 把 App.vue onMounted 里的窗口初始化细节抽出来，App 只负责编排顺序：
 *   1. init_custom_titlebar —— 让装饰插件接管原生标题栏
 *   2. waitForPluginActive   —— 等插件注入完成（最长 5s）
 *   3. win.show()            —— 显示窗口（默认 hidden 启动，全部就绪后再展示，
 *                               避免用户看到恢复会话/初始化中间态）
 *
 * 注意：会话恢复（useAppSession.restore）不在 boot 里 —— 它由各视图自己调用，
 * boot 只负责"窗口可见性"这一个关注点。
 */
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

export function useAppBoot() {
  /** 执行启动流程；失败也会调用 show()，保证窗口一定能显示 */
  async function boot() {
    const win = getCurrentWindow()
    try {
      await invoke('init_custom_titlebar')
      await waitForPluginActive(5000)
      await win.show()
    } catch (error) {
      console.error('❌ 标题栏初始化失败:', error)
      await win.show()
    }
  }

  return { boot }
}

/** 轮询等待 tauri-plugin-decoration 注入完成（带超时兜底） */
function waitForPluginActive(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now()
    const tick = () => {
      if (document.documentElement.hasAttribute('data-tauri-plugin-decoration-active')) {
        return resolve(true)
      }
      if (Date.now() - start > timeoutMs) return resolve(false)
      setTimeout(tick, 50)
    }
    tick()
  })
}