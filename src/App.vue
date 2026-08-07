<template>
  <!--
    真正无边框（decorations: false）+ 接近原生体验的标题栏。
    - 窗口控件（─/☐/✕）由插件在 webview 内部注入；不需手画。
    - Snap Layout 悬浮提示（Win11）由插件用原生 HWND overlay 实现。
    - macOS 上插件用 set_traffic_lights_inset() 接管红绿灯位置。
    - 拖动：data-tauri-drag-region
    - 双击最大化、Alt+F4 等系统手势：由插件/Tauri 自身处理。
  -->
  <div class="app-shell">
    <header class="titlebar" data-tauri-drag-region>
      <div class="titlebar-content">
        <span class="title">KazeNest</span>
      </div>
    </header>

    <main class="app-content">
      <p>主内容区</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

onMounted(async () => {
  const win = getCurrentWindow()
  try {
    // 1. 激活插件 overlay（注入 HTML 控件 + 注册 Win32 HTMAXBUTTON 子窗口）。
    //    必须在窗口可见前调用，避免出现原生标题栏闪烁。
    await invoke('init_custom_titlebar')

    // 2. 等待插件在 <html> 上设置 data-tauri-plugin-decoration-active。
    //    这是插件完成注入的信号。
    const activated = await waitForPluginActive(5000)
    if (!activated) {
      console.warn('⚠️ 插件未在 5s 内激活，但无边框窗口继续显示。')
    }

    // 3. 标题栏就绪后再显示窗口。
    await win.show()
  } catch (error) {
    console.error('❌ 标题栏初始化失败:', error)
    // 出错也要把窗口显示出来，否则用户什么都看不到
    await win.show()
  }
})

/**
 * 轮询检查 <html> 上的 data-tauri-plugin-decoration-active 属性。
 * 该属性由 tauri-plugin-decoration 在 overlay 注入成功后设置。
 */
function waitForPluginActive(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now()
    const tick = () => {
      if (document.documentElement.hasAttribute('data-tauri-plugin-decoration-active')) {
        return resolve(true)
      }
      if (Date.now() - start > timeoutMs) {
        return resolve(false)
      }
      setTimeout(tick, 50)
    }
    tick()
  })
}
</script>

<style>
/* README "Titlebar Layout and CSS" 节推荐的全局规则 */
:root {
  --app-titlebar-height: 32px;
}

html,
body,
#app {
  height: 100%;
  margin: 0;
}

body,
.app-shell {
  overflow: hidden;
}
</style>

<style scoped>
.app-shell {
  height: 100%;
}

.titlebar {
  /* 占满顶部；高度 32px 配合插件注入的 Win32/Libadwaita 控件带高度 */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--app-titlebar-height);
  display: flex;
  align-items: center;
  z-index: 10;

  /* 与插件默认风格接近的视觉（淡灰底 + 底边线） */
  background: #f3f3f3;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .titlebar {
    background: #2b2b2b;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
}

.titlebar-content {
  /* 关键：让出插件注入的窗口控件占用的空间。
     - 无原生 traffic-light 的平台（Windows / Linux）：左侧 0，右侧 138px 左右（─ ☐ ✕）。
     - macOS：左侧 ~80px（红绿灯），右侧 0。
     插件会动态写入 --tauri-plugin-decoration-{left,right}-clearance。 */
  padding-left: max(8px, var(--tauri-plugin-decoration-left-clearance, 0px));
  padding-right: max(8px, var(--tauri-plugin-decoration-right-clearance, 0px));
  cursor: default;
  user-select: none;
  font-size: 12px;
  font-weight: 400;
  color: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI",
    "PingFang SC", sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (prefers-color-scheme: dark) {
  .titlebar-content {
    color: #f0f0f0;
  }
}

.app-content {
  /* 高度 = 视口 - 标题栏高度；margin-top 把内容顶到标题栏下方 */
  height: 100%;
  margin-top: var(--app-titlebar-height);
  overflow-y: auto;
  padding: 32px 40px;
  background: #fafafa;
  color: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
  box-sizing: border-box;
}

@media (prefers-color-scheme: dark) {
  .app-content {
    background: #1e1e1e;
    color: #f0f0f0;
  }
}
</style>
