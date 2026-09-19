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
          :menus="titlebarMenus"
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
        <!-- 全宽视图（编辑器/AI 工作台/浏览器）：通栏铺满，无外圈内边距，内部自滚动 -->
        <main
          class="app-content"
          :class="{ 'is-flush': ['editor', 'ai', 'browser'].includes(activeView), 'margin-anim': marginAnim }"
          :style="{ marginRight: aiPanelDocking ? `${aiPanelWidth}px` : '0px' }"
        >
          <!-- 切换视图时安卓 Activity 风格过渡（淡入 + 上移）
               从展开的 AI 面板切出时取消该过渡（skipViewTransition）：
               由面板收回动画承担全部过渡，避免在面板底下看到"中间一块"的
               淡出/缩放与面板收回各行其是。
               KeepAlive：切走不销毁，回来保留状态（编辑器标签/光标/滚动位置等）。
               同一组件类型（ComingSoon）靠 :key 区分实例，互不串数据。 -->
          <Transition :name="viewTransitionName" mode="out-in">
            <KeepAlive>
              <component :is="viewComponent" :key="activeView" v-bind="comingSoonProps" />
            </KeepAlive>
          </Transition>
        </main>

        <!-- AI 右侧面板（常驻：打开后不随视图切换卸载；
             位于 AI 视图时向左扩展铺满内容区） -->
        <Transition name="ai-panel">
          <div
            v-if="aiPanelOpen"
            class="ai-panel-wrap"
            :style="aiPanelStyle"
          >
            <AiPanel
              :width="aiPanelWidth"
              :expanded="aiPanelExpanded"
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
import { isMac, initMacNativeMenu } from './utils'

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

/** 顶栏文字菜单：随视图自动切换（注册表 views[id].menus，未配置时用默认 topMenus） */
const activeMenus = computed(() => active.value.menus ?? topMenus)

/** 顶栏内绘菜单：macOS 上菜单移至系统顶栏（原生菜单管理），内绘菜单留空 */
const titlebarMenus = computed(() => (isMac ? [] : activeMenus.value))

/** 侧边栏是否显示：开关打开 且 该视图声明了侧栏（registry 的 sidebarVisible + sidebar） */
const sideBarVisible = computed(
  () => sideBarOpen.value && active.value.sidebarVisible && !!active.value.sidebar
)

/* =================== AI 右侧面板 =================== */
/* 面板与 AI 主界面（AiWorkspace）共享同一份聊天状态（useAiChat），
 * 只是形式不同：窄侧栏 ↔ 全宽主界面。
 * 面板打开后常驻：进入 AI 视图时它向左扩展铺满内容区（形态切为 page），
 * 离开 AI 视图自动收回右侧栏宽度 —— 扩展/收回只是 left/margin 过渡。 */

const {
  open: aiPanelOpen,
  width: aiPanelWidth,
  show: showAiPanel,
  hide: hideAiPanel,
  toggle: toggleAiPanel,
  setWidth: setAiPanelWidth,
  restoreWidth: restoreAiPanelWidth,
  resetWidth: resetAiPanelWidth,
} = useAiPanel()

/** 是否展开为 AI 主界面：面板打开 且 位于 AI 视图 */
const aiPanelExpanded = computed(() => aiPanelOpen.value && activeView.value === 'ai')

/** 面板是否占用内容区宽度（展开时铺满，不占位） */
const aiPanelDocking = computed(() => aiPanelOpen.value && !aiPanelExpanded.value)

/** Ask AI 按钮激活态：面板打开或位于 AI 主界面（与顶栏联动） */
const aiPanelActive = computed(() => aiPanelOpen.value || activeView.value === 'ai')

/** 视图切换过渡名：从展开的 AI 面板切出时用 view-none（无过渡，见模板注释） */
const skipViewTransition = ref(false)
const viewTransitionName = computed(() => (skipViewTransition.value ? 'view-none' : 'view'))

/* 主内容让位（margin-right）仅在"面板开/关"时用过渡；
 * 展开/收回（切视图）时瞬时生效——让位区域此刻都被面板完整覆盖，
 * 主内容一步到位、动画期间不再重排，面板收回更顺滑 */
const marginAnim = ref(false)
let marginAnimTimer: number | undefined

watch(aiPanelOpen, () => {
  marginAnim.value = true
  window.clearTimeout(marginAnimTimer)
  marginAnimTimer = window.setTimeout(() => {
    marginAnim.value = false
  }, 460)
})

/* 舞台宽度：面板 left 用 px 过渡（left: 舞台宽-面板宽 → 0）
 * 用 px 而非 calc/% 过渡是为了兼容 WebKitGTK（calc 插值支持不稳） */
const stageRef = ref<HTMLElement | null>(null)
const stageWidth = ref(window.innerWidth)
let stageObserver: ResizeObserver | null = null

const aiPanelStyle = computed(() => ({
  left: `${aiPanelExpanded.value ? 0 : Math.max(0, stageWidth.value - aiPanelWidth.value)}px`,
}))

/** 展开为 AI 主界面（面板顶栏的展开按钮）：切到 AI 视图即可，
 *  面板的 left 过渡（右侧栏宽 → 0）自动播放"向左扩展"动画 */
function expandAiPanel() {
  activeView.value = 'ai'
  sideBarOpen.value = true
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
  /* 开合 AI 面板（面板常驻：在 AI 视图内关闭后露出 AI 主界面，再按重新覆盖） */
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

/** 切视图：按注册表配置决定侧边栏开合（默认强制展开 = VS Code 行为；
 *  sidebarDefaultOpen: false 的视图（如浏览器）进入时默认收缩）
 * id 来自 activityItems，类型上直接收窄为 ViewId
 * - 面板开着时进入 AI 视图：面板自动向左扩展为全宽（由 aiPanelExpanded 驱动）
 * - 从展开的面板切出：主内容直接切换（跳过视图过渡），过渡交给面板收回动画 */
function onActivitySelect(id: string) {
  const target = id as ViewId
  skipViewTransition.value = aiPanelExpanded.value && target !== 'ai'
  activeView.value = target
  sideBarOpen.value = views[target]?.sidebarDefaultOpen !== false
}

/** 再次点击当前活动项：折叠/展开侧边栏 */
function onActivityToggle() {
  sideBarOpen.value = !sideBarOpen.value
}

/* =================== 启动 =================== */

const { boot } = useAppBoot()

/** 页面 → 外壳导航（首页卡片 / 快捷入口 / macOS 原生菜单派发 'kn:navigate'） */
function onNavigate(e: Event) {
  const detail = (e as CustomEvent<string>).detail
  if (detail) onActivitySelect(detail)
}

/** 应用命令（macOS 原生菜单等派发 'kn:command'） */
function onCommand(e: Event) {
  const detail = (e as CustomEvent<string>).detail
  if (detail === 'toggle-sidebar') sideBarOpen.value = !sideBarOpen.value
  else if (detail === 'toggle-ai-panel') onAskAI()
}

onMounted(async () => {
  window.addEventListener('kn:navigate', onNavigate)
  window.addEventListener('kn:command', onCommand)

  /* macOS：菜单移至系统顶栏（原生菜单管理；失败自动回退内绘菜单） */
  void initMacNativeMenu()

  /* 恢复上次会话（窗口尚未显示，恢复动作用户不可见） */
  const saved = await restore()
  if (saved) {
    activeView.value = saved.activeView as ViewId
    sideBarOpen.value = saved.sideBarOpen
    if (saved.aiPanel) {
      restoreAiPanelWidth(saved.aiPanel.width)
      /* 面板常驻：上次开着就恢复（AI 视图下会直接以展开形态出现） */
      if (saved.aiPanel.open) showAiPanel()
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
  window.clearTimeout(marginAnimTimer)
  window.removeEventListener('keydown', onGlobalKeydown)
  window.removeEventListener('kn:navigate', onNavigate)
  window.removeEventListener('kn:command', onCommand)
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

/* 面板开/关时的让位过渡（与面板滑入/滑出同曲线同时长）；
 * 展开/收回（切视图）不启用——瞬时让位，动画期间主内容不重排 */
.app-content.margin-anim {
  transition: margin-right 0.4s cubic-bezier(0.22, 1, 0.36, 1);
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

/* 面板容器：右缘贴舞台，left 由内联样式给出（舞台宽-面板宽，展开时 → 0）
 * left 用 px 过渡（非 calc/%）以兼容 WebKitGTK 的插值实现；
 * 展开/收起动画（进入 AI 视图 ↔ 离开）都由这条 left 过渡完成 */
.ai-panel-wrap {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  transition: left 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: left;
}

/* 面板开关：从右侧滑入/滑出 */
.ai-panel-enter-active,
.ai-panel-leave-active {
  transition:
    left 0.4s cubic-bezier(0.22, 1, 0.36, 1),
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