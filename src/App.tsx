/**
 * App：React 版外壳
 * - 布局：Titlebar | ActivityBar + SideBar + 内容舞台（主内容 + AI 右侧面板）
 * - 状态：activeView / sideBarOpen / 通知数 / 工作区名 / AI 面板（会话快照持久化）
 * - 启动：useAppBoot（自定义标题栏 + 显示窗口）、会话恢复、macOS 原生菜单
 * - AI 面板：常驻开关；位于 AI 视图时向左扩展铺满内容区（morph 动画）
 * - 全局：DemoDialog（showDemo 事件驱动的点击画面）、Ctrl/Cmd+Alt+I 开合面板
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Titlebar } from '@/component/titlebar/Titlebar'
import { TitlebarChrome } from '@/component/titlebar/TitlebarChrome'
import { ActivityBar, SideBar } from '@/component/sidebar'
import { AiPanel } from '@/component/ai'
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
import { useAppBoot } from '@/hooks/useAppBoot'
import { activityItems, searchItems, topMenus } from '@/data'
import type { SearchItem, ViewId } from '@/data'
import type { ActivityItem } from '@/component/sidebar'
import { views } from '@/registry/views'
import { cn } from '@/lib/utils'
import { initMacNativeMenu, isMac, showDemo } from '@/utils'
import './App.css'

let bootStarted = false

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>('editor')
  const [sideBarOpen, setSideBarOpen] = useState(true)
  const [notifyCount, setNotifyCount] = useState(3)
  const [workspaceName, setWorkspaceName] = useState('我的工作区')
  const [sessionReady, setSessionReady] = useState(false)

  const panel = useAiPanel()
  const { restore, flush, update } = useAppSession()

  /* ==================== 舞台宽度（面板 left 换算） ==================== */

  const stageRef = useRef<HTMLDivElement>(null)
  const [stageWidth, setStageWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setStageWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ==================== 启动：窗口 + 会话恢复 + 全局事件 ==================== */

  useEffect(() => {
    if (!bootStarted) {
      bootStarted = true
      const { boot } = useAppBoot()
      void boot()
    }
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

  /* AI 面板：展开（AI 视图，铺满） / 停靠（其它视图，右侧占位） */
  const panelExpanded = panel.open && activeView === 'ai'
  const panelDocked = panel.open && !panelExpanded
  const panelLeft = panelExpanded ? 0 : Math.max(0, stageWidth - panel.width)

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

  const [panelRendered, setPanelRendered] = useState(panel.open)
  const [panelClosing, setPanelClosing] = useState(false)

  useEffect(() => {
    if (panel.open) {
      setPanelRendered(true)
      setPanelClosing(false)
      return
    }
    if (!panelRendered) return
    setPanelClosing(true)
    const t = window.setTimeout(() => {
      setPanelRendered(false)
      setPanelClosing(false)
    }, 240)
    return () => window.clearTimeout(t)
  }, [panel.open, panelRendered])

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

        {/* 内容舞台：主内容 + AI 右侧面板 */}
        <div className="app-stage" ref={stageRef}>
          <main
            className={cn('app-content', isFlush && 'is-flush')}
            style={{ marginRight: panelDocked ? `${panel.width}px` : 0 }}
          >
            <div key={activeView} className="view-anim">
              <Page {...(active.comingSoon ?? {})} />
            </div>
          </main>

          {panelRendered && (
            <div
              className={`ai-panel-wrap${panelClosing ? ' is-closing' : ''}`}
              style={{ left: `${panelLeft}px` }}
            >
              <AiPanel
                width={panel.width}
                expanded={panelExpanded}
                onExpand={() => window.dispatchEvent(new CustomEvent('kn:navigate', { detail: 'ai' }))}
                onClose={hideAiPanel}
                onWidthChange={setAiPanelWidth}
                onResetWidth={resetAiPanelWidth}
              />
            </div>
          )}
        </div>
      </div>

      <DemoDialog />
    </div>
  )
}
