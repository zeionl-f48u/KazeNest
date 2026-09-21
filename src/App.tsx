/**
 * App：React 版外壳
 * - 布局：Titlebar | ActivityBar + SideBar + 主内容（VS Code 式）
 * - 状态：activeView / sideBarOpen / 通知数 / 工作区名（会话快照持久化）
 * - 启动：useAppBoot（自定义标题栏 + 显示窗口）、会话恢复、macOS 原生菜单
 * - 视图：registry/views（未迁移视图由 ComingSoon 占位）
 * - 全局：DemoDialog（showDemo 事件驱动的点击画面）
 */
import { useCallback, useEffect, useState } from 'react'
import { Titlebar } from '@/component/titlebar/Titlebar'
import { TitlebarChrome } from '@/component/titlebar/TitlebarChrome'
import { ActivityBar, SideBar } from '@/component/sidebar'
import { DemoDialog } from '@/component/common/DemoDialog'
import { useAppSession } from '@/hooks/useAppSession'
import { useAppBoot } from '@/composables/useAppBoot'
import { activityItems, searchItems, topMenus } from '@/data'
import type { SearchItem, ViewId } from '@/data'
import type { ActivityItem } from '@/component/sidebar'
import { views } from '@/registry/views'
import { cn } from '@/lib/utils'
import { initMacNativeMenu, isMac, showDemo } from '@/utils'
import './App.css'

/** 防止 StrictMode 下启动流程执行两次（init_custom_titlebar 幂等性未知，保险起见表） */
let bootStarted = false

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>('editor')
  const [sideBarOpen, setSideBarOpen] = useState(true)
  const [notifyCount, setNotifyCount] = useState(3)
  const [workspaceName, setWorkspaceName] = useState('我的工作区')
  const [sessionReady, setSessionReady] = useState(false)

  const { restore, flush, update } = useAppSession()

  /* ==================== 启动：窗口 + 会话恢复 + 全局事件 ==================== */

  useEffect(() => {
    if (!bootStarted) {
      bootStarted = true
      const { boot } = useAppBoot()
      void boot()
    }
    void initMacNativeMenu()

    let cancelled = false

    /** 视图切换（活动栏 / 首页卡片 / macOS 菜单共用） */
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
      else if (detail === 'toggle-ai-panel') {
        showDemo({ title: 'AI 面板', desc: '演示模式：AI 面板将在 AI 视图迁移后恢复', icon: 'sparkles' })
      }
    }

    window.addEventListener('kn:navigate', onNavigate)
    window.addEventListener('kn:command', onCommand)
    window.addEventListener('beforeunload', flush)

    void restore().then((saved) => {
      if (cancelled) return
      if (saved) {
        setActiveView(saved.activeView as ViewId)
        setSideBarOpen(saved.sideBarOpen)
      }
      setSessionReady(true)
    })

    return () => {
      cancelled = true
      window.removeEventListener('kn:navigate', onNavigate)
      window.removeEventListener('kn:command', onCommand)
      window.removeEventListener('beforeunload', flush)
    }
  }, [restore, flush])

  /* 活动视图 / 侧栏开关 → 写回会话快照（恢复完成后才开始写入） */
  useEffect(() => {
    if (!sessionReady) return
    update((s) => {
      s.activeView = activeView
      s.sideBarOpen = sideBarOpen
    })
  }, [activeView, sideBarOpen, sessionReady, update])

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
    showDemo({ title: 'AI 面板', desc: '演示模式：AI 面板将在 AI 视图迁移后恢复', icon: 'sparkles' })
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
            aiActive={false}
            onAskAi={onAskAi}
            onNotifyRead={() => setNotifyCount(0)}
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

        {sideBarVisible && SidebarComp && (
          <SideBar title={active.sidebarTitle ?? '侧边栏'} onClose={() => setSideBarOpen(false)}>
            <SidebarComp />
          </SideBar>
        )}

        <main className={cn('app-content', isFlush && 'is-flush')}>
          <div key={activeView} className="view-anim">
            <Page {...(active.comingSoon ?? {})} />
          </div>
        </main>
      </div>

      <DemoDialog />
    </div>
  )
}
