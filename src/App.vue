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
          :ai-active="aiPanelActive"
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

      <!-- 内容舞台：主内容 + AI 右侧面板
           （面板绝对定位于舞台右缘，可拖宽；进入 AI 视图时向左扩展覆盖整个舞台，
            动画完成后卸载面板，主内容无缝接管 —— 一个东西两种形式） -->
      <div class="app-stage" ref="stageRef">
        <!-- 全宽视图（编辑器/AI 工作台）：通栏铺满，无外圈内边距，内部自滚动 -->
        <main
          class="app-content"
          :class="{ 'is-flush': ['editor', 'ai'].includes(activeView) }"
          :style="{ marginRight: aiPanelDocking ? `${aiPanelWidth}px` : '0px' }"
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

        <!-- AI 右侧面板（与 AI 主界面共享同一份聊天状态） -->
        <Transition name="ai-panel">
          <div
            v-if="aiPanelOpen"
            class="ai-panel-wrap"
            :class="{ 'is-expanding': aiPanelExpanding }"
            :style="aiPanelStyle"
          >
            <AiPanel
              :width="aiPanelWidth"
              :expanding="aiPanelExpanding"
              @update:width="setAiPanelWidth"
              @reset-width="resetAiPanelWidth"
              @expand="expandAiPanel"
              @close="hideAiPanel"
            />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { Titlebar, TitlebarChrome } from './component/titlebar'
import { ActivityBar, SideBar } from './component/sidebar'
import { AiPanel } from './component/ai'
import { useAppSession, useAppBoot, useAiPanel } from './composables'

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

/* =================== AI 右侧面板 =================== */
/* 面板与 AI 主界面（AiWorkspace）共享同一份聊天状态（useAiChat），
 * 只是形式不同：窄侧栏 ↔ 全宽主界面；进入 AI 视图时播放"向左扩展"过渡。 */

const {
  open: aiPanelOpen,
  expanding: aiPanelExpanding,
  width: aiPanelWidth,
  show: showAiPanel,
  hide: hideAiPanel,
  toggle: toggleAiPanel,
  setWidth: setAiPanelWidth,
  resetWidth: resetAiPanelWidth,
} = useAiPanel()

/** 面板是否正在"占位"（扩展动画中不占位，主内容铺满交给面板覆盖） */
const aiPanelDocking = computed(() => aiPanelOpen.value && !aiPanelExpanding.value)

/** Ask AI 按钮激活态：面板打开或位于 AI 主界面（与顶栏联动） */
const aiPanelActive = computed(() => aiPanelOpen.value || activeView.value === 'ai')

/* 舞台宽度：面板 left 用 px 过渡（left: 舞台宽-面板宽 → 0）
 * 用 px 而非 calc/% 过渡是为了兼容 WebKitGTK（calc 插值支持不稳） */
const stageRef = ref<HTMLElement | null>(null)
const stageWidth = ref(window.innerWidth)
let stageObserver: ResizeObserver | null = null

const aiPanelStyle = computed(() => ({
  left: `${aiPanelExpanding.value ? 0 : Math.max(0, stageWidth.value - aiPanelWidth.value)}px`,
}))

/** 向左扩展成 AI 主界面：面板扫满内容区 → 切换到 AI 视图 → 卸载面板（无缝接管） */
function expandAiPanel() {
  if (!aiPanelOpen.value || aiPanelExpanding.value) return
  aiPanelExpanding.value = true
  /* 主内容同步切为 AI 工作台（面板覆盖中不可见；展开完成后正好接替） */
  activeView.value = 'ai'
  sideBarOpen.value = true
  window.setTimeout(() => {
    aiPanelOpen.value = false
    /* 卸载完成后再解锁（保证卸载不播放退出动画） */
    window.setTimeout(() => {
      aiPanelExpanding.value = false
    }, 60)
  }, 400)
}

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

/** AI 面板开合 / 宽度变化 → 写回快照 */
watch([aiPanelOpen, aiPanelWidth], () => {
  const s = session.value
  if (!s) return
  s.aiPanel = { open: aiPanelOpen.value, width: aiPanelWidth.value }
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
  /* AI 主界面已全屏，无需右侧面板；其余视图打开/收起面板 */
  if (activeView.value === 'ai') return
  toggleAiPanel()
}

function onNotify() {
  console.log('notify clicked')
}

function onAccount() {
  console.log('account clicked')
}

/* =================== 全局快捷键 =================== */

/** Ctrl/Cmd + Alt + I：开合 AI 面板（与顶栏 Ask AI 按钮同一入口，VS Code Copilot Chat 同款） */
function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey && e.code === 'KeyI') {
    e.preventDefault()
    onAskAI()
  }
}

/* =================== 活动栏 handler =================== */

/** 切视图：强制展开侧边栏（VS Code 行为）
 * id 来自 activityItems，类型上直接收窄为 ViewId
 * 特例：面板开着时进入 AI 视图 → 播放"向左扩展"变形动画（面板 → 主界面） */
function onActivitySelect(id: string) {
  if (id === 'ai' && aiPanelOpen.value && !aiPanelExpanding.value) {
    expandAiPanel()
    return
  }
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
    if (saved.aiPanel) {
      setAiPanelWidth(saved.aiPanel.width)
      /* AI 主界面全屏时不需要右侧面板（同一内容）；其余视图按上次状态恢复 */
      if (saved.aiPanel.open && saved.activeView !== 'ai') showAiPanel()
    }
  }

  /* 舞台宽度监听（AI 面板 left 定位换算用） */
  stageObserver = new ResizeObserver((entries) => {
    for (const entry of entries) stageWidth.value = entry.contentRect.width
  })
  if (stageRef.value) stageObserver.observe(stageRef.value)

  /* 关闭窗口前立即落盘（防抖窗口内的改动不丢） */
  window.addEventListener('beforeunload', flush)

  /* 全局快捷键（AI 面板开合等） */
  window.addEventListener('keydown', onGlobalKeydown)

  /* 初始化自定义标题栏并显示窗口 */
  await boot()
})

onUnmounted(() => {
  stageObserver?.disconnect()
  window.removeEventListener('keydown', onGlobalKeydown)
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
  /* AI 面板开合时让位/收回（px 值过渡，兼容 WebKitGTK） */
  transition: margin-right var(--kn-dur-slow) var(--kn-ease-out);
}

/* 编辑器等全屏视图：去掉内边距、内部自滚动 */
.app-content.is-flush {
  padding: 0;
  overflow: hidden;
}

/* ============ AI 右侧面板（含向左扩展动画） ============ */
/* 内容舞台：主内容与面板共用同一相对定位上下文 */
.app-stage {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: stretch;
  overflow: hidden;
}

/* 面板容器：右缘贴舞台，left 由内联样式给出（舞台宽-面板宽，扩展时 → 0）
 * left 用 px 过渡（非 calc/%）以兼容 WebKitGTK 的插值实现 */
.ai-panel-wrap {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  transition: left var(--kn-dur-slow) var(--kn-ease-out);
  will-change: left;
}

/* 向左扩展动画：更长的缓动，扫满整个内容舞台 */
.ai-panel-wrap.is-expanding {
  transition: left 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

/* 面板开关：从右侧滑入/滑出
 * （扩展完成后的卸载不播此动画 —— is-expanding 的选择器优先级更高，
 *   只保留 left 过渡，opacity/transform 瞬变，视觉无缝接管） */
.ai-panel-enter-active,
.ai-panel-leave-active {
  transition:
    opacity var(--kn-dur-slow) var(--kn-ease-out),
    transform var(--kn-dur-slow) var(--kn-ease-out);
}
.ai-panel-enter-from,
.ai-panel-leave-to {
  opacity: 0;
  transform: translateX(24px);
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