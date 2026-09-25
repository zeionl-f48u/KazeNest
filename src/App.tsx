/**
 * App：React 版外壳
 * - 布局：Titlebar | ActivityBar + SideBar + 内容舞台（主内容 + AI 右侧面板）
 * - 状态：activeView / sideBarOpen / 通知数 / 工作区名 / AI 面板（会话快照持久化）
 * - 启动：会话恢复、macOS 原生菜单（窗口显示由入口 BootGate 保障）
 * - AI 面板：常驻开关；位于 AI 视图时向左扩展铺满内容区（morph 动画）
 * - 全局：DemoDialog（showDemo 事件驱动的点击画面）、Ctrl/Cmd+Alt+I 开合面板
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { Titlebar } from '@/component/titlebar/Titlebar'
import { TitlebarChrome } from '@/component/titlebar/TitlebarChrome'
import { ActivityBar, SideBar } from '@/component/sidebar'
import { AiPanel } from '@/component/ai'
import { DemoDialog } from '@/component/common/DemoDialog'
import { GapDivider } from '@/component/common/GapDivider'
import { ScrollIndicator, suppressScrollIndicator } from '@/component/common/ScrollIndicator'
import { useAppSession } from '@/hooks/useAppSession'
import { AI_PANEL_SNAP_CLOSE } from '@/hooks/useAiPanel'
import { useSidebarWidth, clampWidth, SIDEBAR_SNAP_CLOSE } from '@/hooks/useSidebarWidth'
import {
  useAiPanel,
  toggleAiPanel,
  hideAiPanel,
  showAiPanel,
  restoreAiPanelWidth,
  resetAiPanelWidth,
  setAiPanelWidth,
} from '@/hooks/useAiPanel'
import { activityItems, directionOf, searchItems, topMenus } from '@/data'
import type { SearchItem, ViewId } from '@/data'
import type { ActivityItem } from '@/component/sidebar'
import { views } from '@/registry/views'
import { cn } from '@/lib/utils'
import { initMacNativeMenu, isMac, showDemo } from '@/utils'
import { EASE, SPRING_OPTIONS, viewVariants } from '@/lib/motion'
import './App.css'

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>('editor')
  /* 视图切换方向（1 前进 / -1 后退 / 0 原地）与会话恢复时的"不播动画"标记 */
  const [viewDir, setViewDir] = useState(0)
  const activeViewRef = useRef<ViewId>('editor')
  const instantViewRef = useRef(false)

  const goView = useCallback((next: ViewId, animate = true) => {
    const prev = activeViewRef.current
    if (prev === next) return
    activeViewRef.current = next
    instantViewRef.current = !animate
    setViewDir(animate ? directionOf(prev, next) : 0)
    setActiveView(next)
  }, [])
  const [sideBarOpen, setSideBarOpen] = useState(true)
  const [notifyCount, setNotifyCount] = useState(3)
  const [workspaceName, setWorkspaceName] = useState('我的工作区')
  const [sessionReady, setSessionReady] = useState(false)

  const panel = useAiPanel()
  const sidebarWidth = useSidebarWidth()
  const reduceMotion = useReducedMotion() ?? false
  const { restore, flush, update } = useAppSession()

  /* ==================== 舞台宽度（面板 left 换算） ==================== */

  const mainAreaRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLElement>(null)
  const [mainAreaWidth, setMainAreaWidth] = useState(() => window.innerWidth)
  /* 视口宽度（rAF 节流）：用于"窗口变小先让侧栏/面板，而不是压缩主内容" */
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const el = mainAreaRef.current
    if (!el) return
    const measure = () => setMainAreaWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setViewportWidth(window.innerWidth))
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
    }
  }, [])

  /* ==================== 启动：窗口 + 会话恢复 + 全局事件 ==================== */

  useEffect(() => {
    void initMacNativeMenu()

    let cancelled = false

    const go = (id: string) => {
      const target = id as ViewId
      if (!target || !views[target]) return
      goView(target)
      setSideBarOpen(views[target].sidebarDefaultOpen !== false)
    }

    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail) go(detail)
    }
    const onCommand = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail === 'toggle-sidebar') setSideBarOpen((v) => !v)
      else if (detail === 'toggle-ai-panel') toggleAiPanel()
    }
    const onKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey && e.code === 'KeyI') {
        e.preventDefault()
        toggleAiPanel()
      }
    }

    window.addEventListener('kn:navigate', onNavigate)
    window.addEventListener('kn:command', onCommand)
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('beforeunload', flush)

    void restore().then((saved) => {
      if (cancelled) return
      if (saved) {
        goView(saved.activeView as ViewId, false)
        setSideBarOpen(saved.sideBarOpen)
        if (saved.aiPanel) {
          restoreAiPanelWidth(saved.aiPanel.width)
          if (saved.aiPanel.open) showAiPanel()
        }
      }
      setSessionReady(true)
    })

    return () => {
      cancelled = true
      window.removeEventListener('kn:navigate', onNavigate)
      window.removeEventListener('kn:command', onCommand)
      window.removeEventListener('keydown', onKeydown)
      window.removeEventListener('beforeunload', flush)
    }
  }, [restore, flush, goView])

  /* 活动视图 / 侧栏 / AI 面板 → 写回会话快照 */
  useEffect(() => {
    if (!sessionReady) return
    update((s) => {
      s.activeView = activeView
      s.sideBarOpen = sideBarOpen
      s.aiPanel = { open: panel.open, width: panel.width }
    })
  }, [activeView, sideBarOpen, panel.open, panel.width, sessionReady, update])

  /* ==================== 顶栏 handler ==================== */

  const onSearchSelect = useCallback((item: SearchItem) => {
    const view = item.id.startsWith('nav.') ? item.id.slice(4) : ''
    if (view && view in views) {
      window.dispatchEvent(new CustomEvent('kn:navigate', { detail: view }))
      return
    }
    showDemo({ title: item.title, desc: `演示模式：${item.desc}（尚未接入）`, icon: item.icon })
  }, [])

  const active = views[activeView]
  const menus = useMemo(() => (isMac ? [] : [...(active.menus ?? topMenus)]), [active])

  const onAskAi = useCallback(() => {
    toggleAiPanel()
  }, [])

  const onNotifyRead = useCallback(() => setNotifyCount(0), [])
  const onNotifyReadOne = useCallback(() => setNotifyCount((c) => Math.max(0, c - 1)), [])

  /* 顶栏内容 memo 化：身份稳定 → 顶栏测量/收纳逻辑不会每次重渲染都重排（此前导致频闪） */
  const titlebarLeading = useMemo(
    () => (
      <TitlebarChrome
        part="leading"
        workspaceName={workspaceName}
        menus={menus}
        onWorkspaceSelect={setWorkspaceName}
      />
    ),
    [workspaceName, menus]
  )

  const titlebarTrailing = useMemo(
    () => (
      <TitlebarChrome
        part="trailing"
        notifyCount={notifyCount}
        aiActive={panel.open || activeView === 'ai'}
        onAskAi={onAskAi}
        onNotifyRead={onNotifyRead}
        onNotifyReadOne={onNotifyReadOne}
      />
    ),
    [notifyCount, panel.open, activeView, onAskAi, onNotifyRead, onNotifyReadOne]
  )

  /* ==================== 活动栏 handler ==================== */

  const onActivitySelect = (id: string) => {
    const target = id as ViewId
    goView(target)
    setSideBarOpen(views[target]?.sidebarDefaultOpen !== false)
  }

  const onActivityToggle = (_item: ActivityItem) => {
    /* 自动让位中：点击改为临时强制显示（窗口变宽后自动复位） */
    if (sideBarAutoHidden) {
      setSideBarForceShow((v) => !v)
      return
    }
    setSideBarOpen((v) => !v)
  }

  /* ==================== 渲染 ==================== */

  const Page = active.page
  const SidebarComp = active.sidebar

  /* AI 面板：展开（AI 视图，占满主区域） / 停靠（其它视图，独立一列） */
  const panelExpanded = panel.open && activeView === 'ai'
  const panelDocked = panel.open && !panelExpanded
  const panelTargetWidth = panelExpanded ? mainAreaWidth : panel.width

  /* ==================== 按尺寸自动让位 ====================
   * 窗口变小时优先保住主内容：把固定宽度的侧栏自动收起（不改用户偏好，
   * 窗口恢复后自动回来）；若 AI 面板停靠占用右侧，门槛再抬高其宽度。
   * 侧栏内容基准需求：活动栏 50 + 侧栏 300 + 间隙/圆角 ≈ 880，
   * 再加主内容最小可用宽约 520 → 基准 900。 */
  const sideBarAutoHidden =
    viewportWidth < 900 + (panelDocked ? panel.width + 8 : 0)

  /* 窄窗口下用户手动再开侧栏：临时强制显示，窗口变宽后自动复位 */
  const [sideBarForceShow, setSideBarForceShow] = useState(false)
  useEffect(() => {
    if (!sideBarAutoHidden) setSideBarForceShow(false)
  }, [sideBarAutoHidden])

  const sideBarVisible =
    ((sideBarOpen && !sideBarAutoHidden) || sideBarForceShow) &&
    active.sidebarVisible &&
    !!SidebarComp
  const isFlush = activeView === 'editor' || activeView === 'ai' || activeView === 'browser'

  /* ==================== 离场动画（存在感状态） ==================== */
  /* React 条件渲染默认瞬间卸载；这里保留元素至离场动画播完再卸载 */

  /* 侧栏宽度弹簧（内容保持固定宽，只裁剪 + 左滑，避免内部重排） */
  const sideBarWidthSpring = useSpring(
    sideBarVisible ? sidebarWidth.width : 0,
    SPRING_OPTIONS.smooth
  )
  const sideBarInnerX = useTransform(
    sideBarWidthSpring,
    (w) => w - sidebarWidth.width
  )

  useEffect(() => {
    const jump = reduceMotion || document.body.classList.contains('sb-resizing')
    const target = sideBarVisible ? sidebarWidth.width : 0
    if (jump) sideBarWidthSpring.jump(target)
    else sideBarWidthSpring.set(target)
  }, [sideBarVisible, sidebarWidth.width, sideBarWidthSpring, reduceMotion])

  /* 独立列：宽度做 0 ↔ 目标宽 的过渡（开合与展开/停靠切换都走同一动画） */
  const [panelRendered, setPanelRendered] = useState(panel.open)
  /* 面板宽度由弹簧驱动：可中断、拖拽时 1:1 跟手（jump） */
  const panelWidth = useSpring(0, SPRING_OPTIONS.smooth)

  useEffect(() => {
    let timer = 0
    /* 拖拽调宽中或系统开启"减少动态效果"：直接赋值，避免弹簧滞后/动画 */
    const jump = reduceMotion || document.body.classList.contains('ai-panel-resizing')
    if (panel.open) {
      setPanelRendered(true)
      if (jump) panelWidth.jump(panelTargetWidth)
      else panelWidth.set(panelTargetWidth)
    } else {
      if (jump) panelWidth.jump(0)
      else panelWidth.set(0)
      if (panelRendered) {
        timer = window.setTimeout(() => setPanelRendered(false), jump ? 80 : 520)
      }
    }
    return () => window.clearTimeout(timer)
  }, [panel.open, panelTargetWidth, panelRendered, panelWidth, reduceMotion])

  /* 视图落位后：清除"不播动画"标记并复位滚动 */
  useEffect(() => {
    instantViewRef.current = false
    suppressScrollIndicator()
    contentRef.current?.scrollTo({ top: 0 })
  }, [activeView])

  return (
    <div className="app-shell">
      <Titlebar
        title="KazeNest"
        searchItems={searchItems}
        onSearchSelect={onSearchSelect}
        leading={titlebarLeading}
        trailing={titlebarTrailing}
      />

      <div className="app-body">
        <ActivityBar
          items={activityItems}
          activeId={activeView}
          onSelect={onActivitySelect}
          onToggle={onActivityToggle}
        />

        <AnimatePresence initial={false}>
          {sideBarVisible && SidebarComp && (
            <motion.div
              key="sidebar"
              className="sb-presence"
              style={{ width: sideBarWidthSpring }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE.apple }}
            >
              <motion.div className="sb-presence-inner" style={{ x: sideBarInnerX }}>
                <SideBar title={active.sidebarTitle ?? '侧边栏'} onClose={() => setSideBarOpen(false)}>
                  <SidebarComp />
                </SideBar>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 中线（左）：侧栏 ↔ 主内容，悬停显示、可拖拽调宽 */}
        {sideBarVisible && (
          <GapDivider
            dir="right"
            width={sidebarWidth.width}
            clamp={clampWidth}
            snapClose={SIDEBAR_SNAP_CLOSE}
            onChange={sidebarWidth.setWidth}
            onCommit={sidebarWidth.persist}
            onSnapClose={() => {
              setSideBarOpen(false)
              sidebarWidth.resetToDefault()
            }}
            onReset={sidebarWidth.resetToDefault}
            resizingClass="sb-resizing"
            label="调整侧边栏宽度"
          />
        )}

        {/* 主区域：主内容块 + AI 面板块（三个区块并列，互不重叠） */}
        <div className={cn('app-main-area', panelExpanded && 'is-expanded')} ref={mainAreaRef}>
          <div className={cn('app-stage', isFlush && 'is-flush', panelExpanded && 'is-expanded')}>
            <main ref={contentRef} className={cn('app-content', isFlush && 'is-flush')}>
              {/* 方向感视图过渡：两视图同占一个网格单元，只动 transform/opacity */}
              <div className="view-stack">
                <AnimatePresence mode="sync" initial={false}>
                  <motion.div
                    key={activeView}
                    className="view-layer"
                    variants={viewVariants(viewDir)}
                    initial={instantViewRef.current ? false : 'initial'}
                    animate="animate"
                    exit="exit"
                  >
                    <Suspense fallback={<div className="view-loading" aria-hidden />}>
                      <Page {...(active.comingSoon ?? {})} />
                    </Suspense>
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>
          </div>

          {panelRendered && !panelExpanded && (
            <GapDivider
              idle={!panel.open}
              dir="left"
              width={panel.width}
              snapClose={AI_PANEL_SNAP_CLOSE}
              onChange={setAiPanelWidth}
              onSnapClose={hideAiPanel}
              onReset={resetAiPanelWidth}
              resizingClass="ai-panel-resizing"
              label="调整 AI 面板宽度"
            />
          )}

          {panelRendered && (
            <motion.div
              className={cn('ai-panel-wrap', panelExpanded && 'is-expanded')}
              style={{ width: panelWidth, opacity: panel.open ? 1 : 0 }}
            >
              <AiPanel
                expanded={panelExpanded}
                onExpand={() => window.dispatchEvent(new CustomEvent('kn:navigate', { detail: 'ai' }))}
                onClose={hideAiPanel}
              />
            </motion.div>
          )}
        </div>
      </div>

      <ScrollIndicator />
      <DemoDialog />
    </div>
  )
}
