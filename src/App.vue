<!--
  KazeNest 入口
  - 顶栏独立：./component/titlebar
  - 边栏独立：./component/sidebar
  - 通用组件：./component/common
  - 业务数据：./data
  - 视图组件：./pages/*
-->
<template>
  <div class="app-shell">
    <Titlebar
      title="KazeNest"
      :search-items="searchItems"
      @search-select="onSearchSelect"
    >
      <!-- 左侧：工作区 + 菜单（TitlebarChrome 模块化） -->
      <template #leading>
        <TitlebarChrome
          part="leading"
          :workspace-name="workspaceName"
          :menus="topMenus"
          @workspace="onWorkspace"
          @menu="onMenu"
        />
      </template>

      <!-- 右侧：Ask AI + 通知 + 账户（TitlebarChrome 模块化） -->
      <template #trailing>
        <TitlebarChrome
          part="trailing"
          :notify-count="notifyCount"
          @ask-ai="onAskAI"
          @notify="onNotify"
          @account="onAccount"
        />
      </template>
    </Titlebar>

    <!-- VS Code 布局：活动栏 | 侧边栏 | 主内容 -->
    <div class="app-body">
      <ActivityBar
        :items="activityItems"
        :model-value="activeView"
        @update:model-value="onActivitySelect"
        @toggle="onActivityToggle"
      />

      <Transition name="sidebar" mode="out-in">
        <SideBar
          v-if="sideBarOpen"
          :title="sideBarTitle"
          :sections="sideBarSections"
          v-model="selectedNodeId"
          @close="sideBarOpen = false"
        />
      </Transition>

      <!-- 编辑器视图通栏铺满（VS Code 风格），其余视图保留内边距 -->
      <main
        class="app-content"
        :class="{ 'is-flush': activeView === 'editor' }"
      >
        <!-- 切换视图时安卓 Activity 风格过渡（淡入 + 上移） -->
        <Transition name="view" mode="out-in">
          <component :is="viewComponent" :key="activeView" />
        </Transition>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

import { Titlebar, TitlebarChrome } from './component/titlebar'
import { ActivityBar, SideBar } from './component/sidebar'

import {
  searchItems,
  activityItems,
  topMenus,
  sideBarConfig,
} from './data'
import type { SearchItem } from './data'

import Home from './pages/Home.vue'
import Editor from './pages/Editor.vue'
import Files from './pages/Files.vue'
import AI from './pages/AI.vue'
import Browser from './pages/Browser.vue'
import Settings from './pages/Settings.vue'

/* =================== 视图状态 =================== */

/** 默认进入编辑器（应用定位为编辑器） */
const activeView = ref('editor')
const sideBarOpen = ref(true)
const selectedNodeId = ref('')
const notifyCount = ref(3)
const workspaceName = '我的工作区'

/* =================== 视图组件映射 =================== */

const viewComponents = {
  home:     markRaw(Home),
  editor:   markRaw(Editor),
  files:    markRaw(Files),
  ai:       markRaw(AI),
  browser:  markRaw(Browser),
  settings: markRaw(Settings),
  // account 走 settings 页（账户面板后续单独做）
  account:  markRaw(Settings),
} as const

const viewComponent = computed(
  () => viewComponents[activeView.value as keyof typeof viewComponents] ?? Home
)

/* =================== 侧边栏内容 =================== */

const sideBarTitle = computed(() => sideBarConfig[activeView.value]?.title ?? '侧边栏')
const sideBarSections = computed(() => sideBarConfig[activeView.value]?.sections ?? [])

/* =================== 顶栏 handler =================== */

function onSearchSelect(item: SearchItem) {
  console.log('search selected:', item)
}

function onMenu(name: string) {
  console.log('menu clicked:', name)
}

function onWorkspace() {
  console.log('workspace clicked')
}

function onAskAI() {
  console.log('ask AI')
}

function onNotify() {
  console.log('notify clicked')
}

function onAccount() {
  console.log('account clicked')
}

/* =================== 活动栏 handler =================== */

function onActivitySelect(id: string) {
  activeView.value = id
  selectedNodeId.value = ''
  sideBarOpen.value = true
}

function onActivityToggle() {
  sideBarOpen.value = !sideBarOpen.value
}

/* =================== 启动 =================== */

onMounted(async () => {
  /* 页面 → 外壳导航（首页卡片 / 快捷入口等派发 'kn:navigate'） */
  const onNavigate = (e: Event) => {
    const detail = (e as CustomEvent<string>).detail
    if (detail) onActivitySelect(detail)
  }
  window.addEventListener('kn:navigate', onNavigate)

  const win = getCurrentWindow()
  try {
    await invoke('init_custom_titlebar')
    await waitForPluginActive(5000)
    await win.show()
  } catch (error) {
    console.error('❌ 标题栏初始化失败:', error)
    await win.show()
  }
})

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
</script>

<style>
/* ============================================================
 * 全局基础（tokens.css 提供 --kn-* 语义色 / 间距 / 圆角 / 阴影）
 * ============================================================ */
html,
body,
#app {
  height: 100%;
  margin: 0;
}

body {
  background:
    radial-gradient(1200px 600px at 10% 0%, rgba(99, 102, 241, 0.18), transparent 60%),
    radial-gradient(900px 500px at 100% 100%, rgba(236, 72, 153, 0.12), transparent 60%),
    var(--kn-bg);
  color: var(--kn-fg);
  font-family: var(--kn-font-sans);
  font-size: var(--kn-text-md);
  overflow: hidden;
}

#app,
.app-shell {
  height: 100%;
  overflow: hidden;
}

/* tauri-plugin-decoration 注入的覆盖层不接收事件（让位给应用按钮） */
[data-tauri-plugin-decoration-root]
  [data-tauri-decoration-tb]
  > [data-tauri-drag-region] {
  pointer-events: none !important;
}

/* PrimeVue 5 未配置许可证时会在右下角固定渲染水印宿主
   （控制台同时输出 "PrimeUI license is not configured"）。
   个人项目不使用其商业水印，直接隐藏。 */
#p-license-host {
  display: none !important;
}
</style>

<style scoped>
.app-shell {
  position: relative;
}

/* ============ 布局：活动栏 | 侧边栏 | 主内容 ============ */
.app-body {
  height: 100%;
  padding-top: var(--tb-height);
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  overflow: hidden;
}

.app-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: var(--kn-space-6);
  box-sizing: border-box;
}

/* 编辑器等全屏视图：去掉内边距、内部自滚动 */
.app-content.is-flush {
  padding: 0;
  overflow: hidden;
}

/* ============ 侧边栏滑入/滑出过渡 ============ */
.sidebar-enter-active,
.sidebar-leave-active {
  transition:
    opacity var(--kn-dur-slow) var(--kn-ease-out),
    transform var(--kn-dur-slow) var(--kn-ease-out);
}
.sidebar-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}
.sidebar-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>
