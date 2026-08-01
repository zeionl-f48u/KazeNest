<template>
  <div class="app-container">
    <!-- 自定义标题栏（放在最上面） -->
    <div class="titlebar" data-tauri-drag-region>
      <div class="titlebar-left">
        <!-- 这里可以放应用图标或标题 -->
        <span class="title">KazeNest</span>
      </div>
      <div class="titlebar-right">
        <!-- 窗口控制按钮（调用 Tauri API） -->
        <button @click="minimize">─</button>
        <button @click="toggleMaximize">☐</button>
        <button @click="close">✕</button>
      </div>
    </div>
  </div>
  <div class="app-container">
    <!-- 侧边栏 -->
    <nav class="sidebar">
      <div class="logo">🌪️ KazeNest</div>
      <ul class="nav-list">
        <li
          v-for="item in navItems"
          :key="item.key"
          @click="currentPage = item.key"
          :class="{ active: currentPage === item.key }"
        >
          {{ item.icon }} {{ item.label }}
        </li>
      </ul>
      <div class="sidebar-footer">
        <span class="version">v0.1.0</span>
      </div>
    </nav>

    <!-- 内容区 -->
    <main class="content">
      <Dashboard   v-show="currentPage === 'dashboard'" class="page-wrapper" />
      <Files       v-show="currentPage === 'files'"     class="page-wrapper" />
      <AIChat      v-show="currentPage === 'ai'"        class="page-wrapper" />
      <Browser     v-show="currentPage === 'browser'"   class="page-wrapper" />
      <Settings    v-show="currentPage === 'settings'"  class="page-wrapper" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window';

onMounted(async () => {
  try {
    console.log('🔄 正在激活自定义标题栏...')
    await invoke('init_custom_titlebar')
    console.log('✅ 自定义标题栏激活成功！窗口应显示。')
  } catch (error) {
    console.error('❌ 自定义标题栏激活失败:', error)
  }
})

const win = getCurrentWindow();

import { ref } from 'vue'
import Dashboard from './pages/Dashboard.vue'
import Files from './pages/Files.vue'
import AIChat from './pages/AI.vue'
import Browser from './pages/Browser.vue'
import Settings from './pages/Settings.vue'

const currentPage = ref('dashboard')

const navItems = [
  { key: 'dashboard', icon: '📊', label: '仪表盘' },
  { key: 'files',     icon: '📁', label: '文件管理' },
  { key: 'ai',        icon: '🤖', label: 'AI' },
  { key: 'browser',   icon: '🌐', label: '浏览器' },
  { key: 'settings',  icon: '⚙️', label: '设置' },
]

const minimize = () => win.minimize();
const toggleMaximize = () => win.toggleMaximize();
const close = () => win.close();

</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.titlebar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  user-select: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}
.titlebar button {
  border: none;
  background: transparent;
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
}
.titlebar button:hover {
  background: rgba(0, 0, 0, 0.05);
}

.app-container {
  display: flex;
  height: 100vh;
  background: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif;
}

.sidebar {
  width: 220px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 0.5px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  padding: 24px 0 16px 0;
  flex-shrink: 0;
}

.logo {
  font-size: 22px;
  font-weight: 700;
  padding: 0 20px 32px 20px;
  color: #1a1a2e;
}

.nav-list {
  list-style: none;
  flex: 1;
}

.nav-list li {
  padding: 10px 20px;
  margin: 2px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #4a4a6a;
  font-size: 15px;
  font-weight: 500;
}

.nav-list li:hover {
  background: rgba(0, 0, 0, 0.04);
}

.nav-list li.active {
  background: #1a1a2e;
  color: #ffffff;
}

.sidebar-footer {
  padding: 16px 20px 0 20px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.06);
}

.version {
  font-size: 12px;
  color: #999;
}

.content {
  flex: 1;
  padding: 32px 40px;
  overflow-y: auto;
}

.page-wrapper {
  animation: pageFadeIn 0.25s ease;
}

@keyframes pageFadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>