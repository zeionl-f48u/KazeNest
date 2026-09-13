<!--
  KazeNest 入口
  - 顶栏独立：./component/titlebar
  - 边栏独立：./component/sidebar
  - 通用组件：./component/common
  - 业务数据：./data
  - 视图页面：./pages
  - 视图注册表：./registry/views.ts（页面 + 侧栏 + 占位配置的单一来源）
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
          v-if="sideBarVisible"
          :title="sideBarTitle"
          @close="sideBarOpen = false"
        >
          <!-- 视图专属侧栏内容（来自 registry/views.ts 的 sidebar 组件） -->
          <component :is="activeSidebar" />
        </SideBar>
      </Transition>

      <!-- 编辑器视图通栏铺满（VS Code 风格），其余视图保留内边距 -->
      <main
        class="app-content"
        :class="{ 'is-flush': activeView === 'editor' }"
      >
        <!-- 切换视图时安卓 Activity 风格过渡（淡入 + 上移）
             KeepAlive：切走不销毁，回来保留状态（编辑器标签/光标/滚动位置等）。
             同一组件类型（ComingSoon）靠 :key 区分实例，互不串数据。 -->
        <Transition name="view" mode="out-in">
          <KeepAlive>
            <component :is="viewComponent" :key="activeView" v-bind="comingSoonProps" />
          </KeepAlive>
        </Transition>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import { Titlebar, TitlebarChrome } from './component/titlebar'
import { ActivityBar, SideBar } from './component/sidebar'
import { Home, Editor } from './pages'
import { useAppSession, useAppBoot } from './composables'

import { searchItems, activityItems, topMenus } from './data'
import type { SearchItem, ViewId } from './data'
import { views } from './registry/views'

/* =================== 视图状态 =================== */
/* 调节入口（改这里的值即可调默认行为）：
 * - activeView:   默认进入哪个视图。'editor' 是应用定位；改 'home' 可改成先见欢迎页
 * - sideBarOpen:  启动时侧边栏是否展开
 * - notifyCount:  顶栏通知徽标数字（0 = 不显示）
 * - workspaceName: 顶栏左侧工作区选择器显示的文字
 * 视图 id 与 activityItems.ts 的 id 一一对应。 */
const activeView = ref<ViewId>('editor')
const sideBarOpen = ref(true)
const notifyCount = ref(3)
const workspaceName = '我的工作区'

/* =================== 视图注册表驱动 =================== */
/* 视图的完整定义（页面 / 侧栏 / 占位配置 / 侧栏可见性）在 registry/views.ts，
 * 这里只做查找——改动/新增视图不需要再动 App.vue。 */

/** 当前视图的完整定义 */
const active = computed(() => views[activeView.value])

/** 主内容页面组件 */
const viewComponent = computed(() => active.value.page)

/** 占位视图的展示数据（非占位视图返回空对象，组件不接收多余 props） */
const comingSoonProps = computed(() => active.value.comingSoon ?? {})

/** 侧栏内容组件（设置/账户等无侧栏视图为 undefined） */
const activeSidebar = computed(() => active.value.sidebar)

/** 侧栏标题（SideBar 框架标题栏显示） */
const sideBarTitle = computed(() => active.value.sidebarTitle ?? '侧边栏')

/** 侧边栏是否显示：开关打开 且 该视图声明了侧栏（registry 的 sidebarVisible + sidebar） */
const sideBarVisible = computed(
  () => sideBarOpen.value && active.value.sidebarVisible && !!active.value.sidebar
)

/* =================== 全局会话持久化 =================== */

const { session, restore, save, flush } = useAppSession()

/** 活动视图 / 侧栏开关变化 → 写回快照并防抖落盘 */
watch([activeView, sideBarOpen], () => {
  const s = session.value
  if (!s) return
  s.activeView = activeView.value
  s.sideBarOpen = sideBarOpen.value
  save()
})

/* =================== 顶栏 handler =================== */
/* 这些目前只是打日志的占位。接真实逻辑时在这里替换：
 * - onSearchSelect: 搜索面板选中某项 → 可导航/执行命令
 * - onMenu: 顶栏菜单（文件/编辑/…）点中 → 弹出菜单
 * - onWorkspace: 工作区选择器 → 打开"切换工作区"对话框
 * - onAskAI: Ask AI 按钮 → 打开 AI 侧栏/对话框
 * - onNotify: 通知铃铛 → 打开通知中心
 * - onAccount: 账户头像 → 打开账户面板（目前跳设置页） */
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

/** 切视图：强制展开侧边栏（VS Code 行为）
 * id 来自 activityItems，类型上直接收窄为 ViewId */
function onActivitySelect(id: string) {
  activeView.value = id as ViewId
  sideBarOpen.value = true
}

/** 再次点击当前活动项：折叠/展开侧边栏 */
function onActivityToggle() {
  sideBarOpen.value = !sideBarOpen.value
}

/* =================== 启动 =================== */

const { boot } = useAppBoot()

onMounted(async () => {
  /* 页面 → 外壳导航（首页卡片 / 快捷入口等派发 'kn:navigate'） */
  const onNavigate = (e: Event) => {
    const detail = (e as CustomEvent<string>).detail
    if (detail) onActivitySelect(detail)
  }
  window.addEventListener('kn:navigate', onNavigate)

  /* 恢复上次会话（窗口尚未显示，恢复动作用户不可见） */
  const saved = await restore()
  if (saved) {
    activeView.value = saved.activeView as ViewId
    sideBarOpen.value = saved.sideBarOpen
  }

  /* 关闭窗口前立即落盘（防抖窗口内的改动不丢） */
  window.addEventListener('beforeunload', flush)

  /* 初始化自定义标题栏并显示窗口 */
  await boot()
})
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