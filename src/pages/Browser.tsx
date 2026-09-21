/**
 * Browser：浏览器页面（React 版，未嵌入真实网页）
 * - 多标签 + 标签组（拖拽移动/成组/折叠/重命名）
 * - 工具栏导航 + 地址栏 + 收藏星标 + 书签栏
 * - 内容区：新标签页 / 模拟网页（接 Tauri WebView 后替换）
 * - 会话持久化：标签（含组与历史）/ 书签 / 最近访问
 */
import { useCallback, useEffect, useState } from 'react'
import { BrowserTabBar } from '@/component/browser/BrowserTabBar'
import { BrowserToolbar } from '@/component/browser/BrowserToolbar'
import { BrowserViewport } from '@/component/browser/BrowserViewport'
import { domainOf, faviconOf, normalizeUrl } from '@/component/browser/favicon'
import type { Bookmark, BrowserGroup, BrowserTab } from '@/component/browser/types'
import { useAppSession } from '@/hooks/useAppSession'
import '@/component/browser/browser.css'

let tabSeq = 0
let groupSeq = 0
let loadTimer: number | undefined

function createTab(): BrowserTab {
  return {
    id: ++tabSeq,
    title: '新标签页',
    url: '',
    color: 'var(--kn-brand-500)',
    letter: '',
    loading: false,
    history: [],
    histIndex: -1,
  }
}

const GROUP_COLORS = [
  'var(--kn-brand-500)',
  'var(--kn-sky-500)',
  'var(--kn-emerald-500)',
  'var(--kn-amber-500)',
  'var(--kn-rose-500)',
  'var(--kn-magenta-500)',
]

export function Browser() {
  const [tabs, setTabs] = useState<BrowserTab[]>(() => [createTab()])
  const [activeId, setActiveId] = useState(() => tabs[0].id)
  const [groups, setGroups] = useState<BrowserGroup[]>([])
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([
    { url: 'https://tauri.app', title: 'Tauri 文档' },
    { url: 'https://cn.vuejs.org', title: 'Vue 3 文档' },
    { url: 'https://github.com', title: 'GitHub' },
  ])
  const [recent, setRecent] = useState<string[]>([
    'https://github.com/zeionl-f48u/KazeNest',
    'https://tauri.app',
    'https://vite.dev',
  ])
  const [ready, setReady] = useState(false)

  const { restore, update } = useAppSession()

  const activeTab = tabs.find((t) => t.id === activeId) ?? null
  const canBack = !!activeTab && activeTab.histIndex > 0
  const canForward = !!activeTab && activeTab.histIndex < activeTab.history.length - 1
  const bookmarked = !!activeTab?.url && bookmarks.some((b) => b.url === activeTab.url)

  /* ==================== 会话恢复 / 持久化 ==================== */

  useEffect(() => {
    let cancelled = false
    void restore().then((saved) => {
      if (cancelled) return
      const b = saved?.browser
      if (b && Array.isArray(b.tabs) && b.tabs.length) {
        const restored = b.tabs.map((t) => ({ ...t, loading: false, history: [...t.history] }))
        setTabs(restored)
        setGroups(Array.isArray(b.groups) ? b.groups.map((g) => ({ ...g })) : [])
        setBookmarks(Array.isArray(b.bookmarks) ? b.bookmarks.map((x) => ({ ...x })) : [])
        setRecent(Array.isArray(b.recent) ? [...b.recent] : [])
        setActiveId(restored.some((t) => t.id === b.activeTabId) ? b.activeTabId : restored[0].id)
        tabSeq = Math.max(0, ...b.tabs.map((t) => t.id))
        groupSeq = Math.max(0, ...(b.groups ?? []).map((g) => g.id))
      }
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [restore])

  useEffect(() => {
    if (!ready) return
    update((s) => {
      s.browser = {
        tabs: tabs.map((t) => ({
          id: t.id,
          title: t.title,
          url: t.url,
          color: t.color,
          letter: t.letter,
          groupId: t.groupId,
          history: [...t.history],
          histIndex: t.histIndex,
        })),
        activeTabId: activeId,
        groups: groups.map((g) => ({ ...g })),
        bookmarks: bookmarks.map((b) => ({ ...b })),
        recent: [...recent],
      }
    })
  }, [tabs, groups, bookmarks, recent, activeId, ready, update])

  useEffect(() => () => window.clearTimeout(loadTimer), [])

  /* ==================== 标签组 ==================== */

  const dissolveIfLonely = useCallback(
    (groupId: number) => {
      const members = tabs.filter((t) => t.groupId === groupId)
      if (members.length === 0) {
        setGroups((prev) => prev.filter((g) => g.id !== groupId))
      } else if (members.length === 1) {
        setTabs((prev) => prev.map((t) => (t.id === members[0].id ? { ...t, groupId: undefined } : t)))
        setGroups((prev) => prev.filter((g) => g.id !== groupId))
      }
    },
    [tabs]
  )

  const createGroup = () => {
    const g: BrowserGroup = {
      id: ++groupSeq,
      name: `标签组 ${groupSeq}`,
      color: GROUP_COLORS[(groupSeq - 1) % GROUP_COLORS.length],
      collapsed: false,
    }
    setGroups((prev) => [...prev, g])
    return g
  }

  const toggleGroup = (groupId: number) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g)))
  }

  const renameGroup = (groupId: number, name: string) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name } : g)))
  }

  /** 拖拽结果：重排 / 成组 / 末尾（组规则与 Vue 版一致） */
  const onTabMove = (payload: {
    dragId: number
    targetId: number
    position: 'before' | 'after' | 'group' | 'end'
  }) => {
    const { dragId: id, targetId, position } = payload
    let oldGroupId: number | undefined
    let nextTabs: BrowserTab[] = []

    setTabs((prev) => {
      const from = prev.findIndex((t) => t.id === id)
      if (from === -1) return prev
      const drag = prev[from]
      oldGroupId = drag.groupId
      const clone = prev.map((t) => ({ ...t }))

      if (position === 'end' || !targetId) {
        clone[from].groupId = undefined
        const [item] = clone.splice(from, 1)
        clone.push(item)
        nextTabs = clone
        return clone
      }

      const target = clone.find((t) => t.id === targetId)
      if (!target || target.id === id) return prev

      if (position === 'group') {
        let groupId = target.groupId
        if (!groupId) {
          groupId = createGroup().id
          target.groupId = groupId
        }
        clone[from].groupId = groupId
        const [item] = clone.splice(from, 1)
        const ti = clone.findIndex((t) => t.id === targetId)
        clone.splice(ti + 1, 0, item)
        nextTabs = clone
        return clone
      }

      /* 插入重排 */
      const [item] = clone.splice(from, 1)
      let ti = clone.findIndex((t) => t.id === targetId)
      if (position === 'after') ti += 1
      clone.splice(ti, 0, item)

      /* 离开组范围则脱离 */
      if (item.groupId) {
        const idx = clone.findIndex((t) => t.id === id)
        const prevT = clone[idx - 1]
        const nextT = clone[idx + 1]
        const stillIn =
          (prevT && prevT.groupId === item.groupId) || (nextT && nextT.groupId === item.groupId)
        if (!stillIn) {
          oldGroupId = item.groupId
          item.groupId = undefined
        }
      }
      nextTabs = clone
      return clone
    })

    /* 组清理放到状态提交后（不同 setState 批次） */
    window.setTimeout(() => {
      if (oldGroupId) dissolveIfLonely(oldGroupId)
    }, 0)
    void nextTabs
  }

  /* ==================== 导航 ==================== */

  const patchTab = (id: number, patch: Partial<BrowserTab>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const startLoading = (ms: number) => {
    window.clearTimeout(loadTimer)
    loadTimer = window.setTimeout(() => {
      setTabs((prev) => prev.map((t) => (t.loading ? { ...t, loading: false } : t)))
    }, ms)
  }

  const navigate = (input: string) => {
    const tab = tabs.find((t) => t.id === activeId)
    if (!tab) return
    const url = normalizeUrl(input)
    if (!url) return
    const fav = faviconOf(url)
    const history = [...tab.history.slice(0, tab.histIndex + 1), url]
    patchTab(tab.id, {
      url,
      title: domainOf(url),
      color: fav.color,
      letter: fav.letter,
      history,
      histIndex: history.length - 1,
      loading: true,
    })
    setRecent((prev) => [url, ...prev.filter((u) => u !== url)].slice(0, 6))
    startLoading(650)
  }

  const go = (delta: number) => {
    const tab = tabs.find((t) => t.id === activeId)
    if (!tab) return
    const next = tab.histIndex + delta
    if (next < 0 || next >= tab.history.length) return
    const url = tab.history[next]
    const fav = faviconOf(url)
    patchTab(tab.id, {
      histIndex: next,
      url,
      title: domainOf(url),
      color: fav.color,
      letter: fav.letter,
      loading: true,
    })
    startLoading(450)
  }

  const refresh = () => {
    const tab = tabs.find((t) => t.id === activeId)
    if (!tab?.url) return
    patchTab(tab.id, { loading: true })
    startLoading(650)
  }

  const goHome = () => {
    const tab = tabs.find((t) => t.id === activeId)
    if (!tab) return
    patchTab(tab.id, { url: '', title: '新标签页', loading: false })
  }

  const toggleBookmark = () => {
    const tab = tabs.find((t) => t.id === activeId)
    if (!tab?.url) return
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.url === tab.url)
      if (exists) return prev.filter((b) => b.url !== tab.url)
      return [...prev, { url: tab.url, title: tab.title }]
    })
  }

  /* ==================== 标签操作 ==================== */

  const newTab = () => {
    const tab = createTab()
    const cur = tabs.find((t) => t.id === activeId)
    if (cur?.groupId) tab.groupId = cur.groupId
    setTabs((prev) => [...prev, tab])
    setActiveId(tab.id)
  }

  const closeTab = (id: number) => {
    const idx = tabs.findIndex((t) => t.id === id)
    if (idx === -1) return
    const closed = tabs[idx]
    const next = tabs.filter((t) => t.id !== id)
    if (next.length === 0) {
      const tab = createTab()
      setTabs([tab])
      setActiveId(tab.id)
    } else {
      setTabs(next)
      if (activeId === id) setActiveId(next[Math.min(idx, next.length - 1)].id)
    }
    if (closed.groupId) window.setTimeout(() => dissolveIfLonely(closed.groupId!), 0)
  }

  /* ==================== 渲染 ==================== */

  return (
    <div className="bw">
      <BrowserTabBar
        tabs={tabs}
        groups={groups}
        activeId={activeId}
        onActivate={setActiveId}
        onClose={closeTab}
        onNew={newTab}
        onMove={onTabMove}
        onToggleGroup={toggleGroup}
        onRenameGroup={renameGroup}
      />

      <BrowserToolbar
        url={activeTab?.url ?? ''}
        loading={!!activeTab?.loading}
        canBack={canBack}
        canForward={canForward}
        bookmarked={bookmarked}
        onBack={() => go(-1)}
        onForward={() => go(1)}
        onRefresh={refresh}
        onHome={goHome}
        onNavigate={navigate}
        onToggleBookmark={toggleBookmark}
      />

      {bookmarks.length > 0 && (
        <div className="bw-bookmarks">
          {bookmarks.map((b) => {
            const fav = faviconOf(b.url)
            return (
              <button
                key={b.url}
                type="button"
                className="bw-bookmark"
                title={b.url}
                onClick={() => navigate(b.url)}
              >
                <span className="bw-bookmark-fav" style={{ '--tint': fav.color } as React.CSSProperties}>
                  {fav.letter}
                </span>
                <span className="bw-bookmark-title">{b.title}</span>
              </button>
            )
          })}
        </div>
      )}

      <BrowserViewport
        url={activeTab?.url ?? ''}
        loading={!!activeTab?.loading}
        recent={recent}
        onNavigate={navigate}
      />
    </div>
  )
}
