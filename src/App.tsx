/**
 * App：React 版外壳
 * - 布局：Titlebar | ActivityBar + SideBar + 内容舞台（主内容 + AI 右侧面板）
 * - 状态：activeView / sideBarOpen / 通知数 / 工作区名 / AI 面板（会话快照持久化）
 * - 启动：会话恢复、macOS 原生菜单（窗口显示由入口 BootGate 保障）
 * - AI 面板：常驻开关；位于 AI 视图时向左扩展铺满内容区（morph 动画）
 * - 全局：DemoDialog（showDemo 事件驱动的点击画面）、Ctrl/Cmd+Alt+I 开合面板
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Titlebar } from '@/component/titlebar/Titlebar'
import { TitlebarChrome } from '@/component/titlebar/TitlebarChrome'
import { ActivityBar, SideBar } from '@/component/sidebar'
import { AiPanel, AiPanelDivider } from '@/component/ai'
import { DemoDialog } from '@/component/common/DemoDialog'
import { useAppSession } from '@/hooks/useAppSession'
import {
  useAiPanel,
  toggleAiPanel,
  hideAiPanel,
  showAiPanel,
  restoreAiPanelWidth,
  resetAiPanelWidth,
  setAiPanelWidth,
} from '@/hooks/useAiPanel'
import { activityItems, searchItems, topMenus } from '@/data'
import type { SearchItem, ViewId } from '@/data'
import type { ActivityItem } from '@/component/sidebar'
import { views } from '@/registry/views'
import { cn } from '@/lib/utils'
import { initMacNativeMenu, isMac, showDemo } from '@/utils'
import './App.css'

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>('editor')
  const [sideBarOpen, setSideBarOpen] = useState(true)
  const [notifyCount, setNotifyCount] = useState(3)
  const [workspaceName, setWorkspaceName] = useState('我的工作区')
  const [sessionReady, setSessionReady] = useState(false)

  const panel = useAiPanel()
  const { restore, flush, update } = useAppSession()

  /* ==================== 舞台宽度（面板 left 换算） ==================== */

  const mainAreaRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLElement>(null)
  const [mainAreaWidth, setMainAreaWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const el = mainAreaRef.current
    if (!el) return
    const measure = () => setMainAreaWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ==================== 启动：窗口 + 会话恢复 + 全局事件 ==================== */

  useEffect(() => {
    void initMacNativeMenu()

    let cancelled = false

    const go = (id: string) => {
      const target = id as ViewId
      if (!target || !views[target]) return
      setActiveView(target)
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
        setActiveView(saved.activeView as ViewId)
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
  }, [restore, flush])

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

  const onAskAi = useCallback(() => {
    toggleAiPanel()
  }, [])

  /* ==================== 活动栏 handler ==================== */

  const onActivitySelect = (id: string) => {
    const target = id as ViewId
    setActiveView(target)
    setSideBarOpen(views[target]?.sidebarDefaultOpen !== false)
  }

  const onActivityToggle = (_item: ActivityItem) => {
    setSideBarOpen((v) => !v)
  }

  /* ==================== 渲染 ==================== */

  const active = views[activeView]
  const Page = active.page
  const SidebarComp = active.sidebar
  const sideBarVisible = sideBarOpen && active.sidebarVisible && !!SidebarComp
  const menus = isMac ? [] : (active.menus ?? topMenus)
  const isFlush = activeView === 'editor' || activeView === 'ai' || activeView === 'browser'

  /* AI 面板：展开（AI 视图，占满主区域） / 停靠（其它视图，独立一列） */
  const panelExpanded = panel.open && activeView === 'ai'
  const panelTargetWidth = panelExpanded ? mainAreaWidth : panel.width

  /* ==================== 离场动画（存在感状态） ==================== */
  /* React 条件渲染默认瞬间卸载；这里保留元素至离场动画播完再卸载 */

  const [sideBarRendered, setSideBarRendered] = useState(sideBarOpen)
  const [sideBarClosing, setSideBarClosing] = useState(false)

  useEffect(() => {
    if (sideBarVisible) {
      setSideBarRendered(true)
      setSideBarClosing(false)
      return
    }
    if (!sideBarRendered) return
    setSideBarClosing(true)
    const t = window.setTimeout(() => {
      setSideBarRendered(false)
      setSideBarClosing(false)
    }, 220)
    return () => window.clearTimeout(t)
  }, [sideBarVisible, sideBarRendered])

  /* 独立列：宽度做 0 ↔ 目标宽 的过渡（开合与展开/停靠切换都走同一动画） */
  const [panelRendered, setPanelRendered] = useState(panel.open)
  const [panelWidthAnim, setPanelWidthAnim] = useState(0)

  useEffect(() => {
    let raf = 0
    let timer = 0
    if (panel.open) {
      setPanelRendered(true)
      /* 下一帧再给目标宽度，保证从 0 开始有过渡 */
      raf = window.requestAnimationFrame(() => setPanelWidthAnim(panelTargetWidth))
    } else {
      setPanelWidthAnim(0)
      if (panelRendered) {
        timer = window.setTimeout(() => setPanelRendered(false), 430)
      }
    }
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [panel.open, panelTargetWidth, panelRendered])

  return (
    <div className="app-shell">
      <Titlebar
        title="KazeNest"
        searchItems={searchItems}
        onSearchSelect={onSearchSelect}
        leading={
          <TitlebarChrome
            part="leading"
            workspaceName={workspaceName}
            menus={[...menus]}
            onWorkspaceSelect={setWorkspaceName}
          />
        }
        trailing={
          <TitlebarChrome
            part="trailing"
            notifyCount={notifyCount}
            aiActive={panel.open || activeView === 'ai'}
            onAskAi={onAskAi}
            onNotifyRead={() => setNotifyCount(0)}
            onNotifyReadOne={() => setNotifyCount((c) => Math.max(0, c - 1))}
          />
        }
      />

      <div className="app-body">
        <ActivityBar
          items={activityItems}
          activeId={activeView}
          onSelect={onActivitySelect}
          onToggle={onActivityToggle}
        />

        {sideBarRendered && SidebarComp && (
          <div className={`sb-presence${sideBarClosing ? ' is-closing' : ''}`}>
            <SideBar title={active.sidebarTitle ?? '侧边栏'} onClose={() => setSideBarOpen(false)}>
              <SidebarComp />
            </SideBar>
          </div>
        )}

        {/* 主区域：主内容块 + AI 面板块（三个区块并列，互不重叠） */}
        <div className={cn('app-main-area', panelExpanded && 'is-expanded')} ref={mainAreaRef}>
          <div className={cn('app-stage', isFlush && 'is-flush', panelExpanded && 'is-expanded')}>
            <main ref={contentRef} className={cn('app-content', isFlush && 'is-flush')}>
              <div key={activeView} className="view-anim">
                <Page {...(active.comingSoon ?? {})} />
              </div>
            </main>
          </div>

          {panelRendered && !panelExpanded && (
            <AiPanelDivider
              idle={!panel.open}
              width={panel.width}
              onWidthChange={setAiPanelWidth}
              onClose={hideAiPanel}
              onResetWidth={resetAiPanelWidth}
            />
          )}

          {panelRendered && (
            <div
              className={cn('ai-panel-wrap', panelExpanded && 'is-expanded')}
              style={{ width: panelWidthAnim, opacity: panel.open ? 1 : 0 }}
            >
              <AiPanel
                expanded={panelExpanded}
                onExpand={() => window.dispatchEvent(new CustomEvent('kn:navigate', { detail: 'ai' }))}
                onClose={hideAiPanel}
              />
            </div>
          )}
        </div>
      </div>

      <DemoDialog />
    </div>
  )
}
