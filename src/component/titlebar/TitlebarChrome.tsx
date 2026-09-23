/**
 * TitlebarChrome：顶栏左右内容（React 版）
 * - part="leading"：工作区选择器 + 文字菜单（放不下的收进 ⋯）+ 下拉面板
 * - part="trailing"：Ask AI + 通知（徽标）+ 账户 + 下拉面板
 * - 全部"无真实功能"的入口 → 下拉画面 → 条目点击弹演示弹窗（showDemo）
 * - 溢出收纳：容器变窄时从右往左把菜单收进 ⋯（ResizeObserver 测量）
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../common/Icon'
import { Dropdown } from '../ui/dropdown'
import type { DropdownItem } from '../ui/dropdown'
import { Button } from '../ui/button'
import NotificationBell from '../ui/notification-bell'
import { Kbd } from '../ui/primitives'
import { cn } from '@/lib/utils'
import { isMac, showDemo } from '@/utils'
import { menuEntriesOf } from '@/data/menuItems'
import { useTheme } from '@/hooks/useTheme'

export interface TitlebarChromeProps {
  part: 'leading' | 'trailing'
  workspaceName?: string
  menus?: string[]
  notifyCount?: number
  aiActive?: boolean
  onWorkspaceSelect?: (name: string) => void
  onNotifyRead?: () => void
  /** 单条通知已读（顶栏徽标 -1） */
  onNotifyReadOne?: () => void
  onAskAi?: () => void
}

interface DropdownState {
  kind: string // 'menu:文件' | 'workspace' | 'notify' | 'account'
  x: number
  y: number
  title?: string
  items: DropdownItem[]
}

const MORE_BTN_W = 28
const BUFFER = 6

export function TitlebarChrome({
  part,
  workspaceName = '我的工作区',
  menus = [],
  notifyCount = 0,
  aiActive = false,
  onWorkspaceSelect,
  onNotifyRead,
  onNotifyReadOne,
  onAskAi,
}: TitlebarChromeProps) {
  const [dropdown, setDropdown] = useState<DropdownState | null>(null)
  const { mode: themeMode, setThemeMode } = useTheme()

  /** 通知中心（演示数据；点击标记已读，未读带圆点） */
  interface NotifyItem {
    id: string
    label: string
    icon: string
    color: string
    meta: string
    unread: boolean
  }
  const [notifications, setNotifications] = useState<NotifyItem[]>([
    { id: 'n1', label: '构建完成：kazenest v0.1.0', icon: 'check', color: 'var(--kn-emerald-500)', meta: '2 分钟前', unread: true },
    { id: 'n2', label: 'AI 会话已生成代码评审', icon: 'sparkles', color: 'var(--kn-brand-500)', meta: '1 小时前', unread: true },
    { id: 'n3', label: '私有空间新增加密文件', icon: 'lock', color: 'var(--kn-amber-500)', meta: '昨天', unread: true },
  ])

  /* ==================== 通用：以下拉为画面的交互 ==================== */

  const anchorOf = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    return { x: r.left, y: r.bottom + 6 }
  }

  const openWorkspace = (e: React.MouseEvent<HTMLButtonElement>) => {
    const workspaces = ['我的工作区', 'KazeNest 项目', '设计资源']
    const items: DropdownItem[] = workspaces.map((w) => ({
      id: `ws:${w}`,
      label: w,
      icon: 'folder-open',
      checked: w === workspaceName,
    }))
    items.push({ id: 'sep', label: '', separator: true })
    items.push({ id: 'add', label: '添加工作区…', icon: 'plus' })
    setDropdown({ kind: 'workspace', ...anchorOf(e.currentTarget), title: '切换工作区', items })
  }

  const openMenu = (name: string, el: HTMLElement) => {
    setDropdown({ kind: `menu:${name}`, ...anchorOf(el), title: name, items: menuEntriesOf(name) })
  }

  const openNotify = (e: React.MouseEvent<HTMLButtonElement>) => {
    const items: DropdownItem[] = notifications.map((n) => ({
      id: n.id,
      label: n.label,
      icon: n.icon,
      color: n.color,
      meta: n.meta,
      dot: n.unread,
    }))
    items.push({ id: 'sep', label: '', separator: true })
    items.push({ id: 'read-all', label: '全部标为已读', icon: 'check' })
    setDropdown({ kind: 'notify', ...anchorOf(e.currentTarget), title: '通知', items })
  }

  const openAccount = (e: React.MouseEvent<HTMLButtonElement>) => {
    const items: DropdownItem[] = [
      { id: 'profile', label: '个人资料', icon: 'user' },
      { id: 'usage', label: '使用统计', icon: 'chart-bar' },
      { id: 'prefs', label: '偏好设置', icon: 'cog' },
      { id: 'sep-appearance', label: '', separator: true },
      { id: 'theme-light', label: '浅色外观', icon: 'palette', checked: themeMode === 'light' },
      { id: 'theme-dark', label: '深色外观', icon: 'moon', checked: themeMode === 'dark' },
      { id: 'theme-system', label: '跟随系统', icon: 'display', checked: themeMode === 'system' },
      { id: 'sep-signout', label: '', separator: true },
      { id: 'signout', label: '退出登录', icon: 'forward' },
    ]
    setDropdown({ kind: 'account', ...anchorOf(e.currentTarget), title: 'Zeionl', items })
  }

  const onDropdownSelect = (item: DropdownItem) => {
    const state = dropdown
    setDropdown(null)
    if (!state) return

    if (state.kind.startsWith('menu:')) {
      const menuName = state.kind.slice(5)
      showDemo({ title: item.label, desc: `演示模式：「${menuName}」菜单功能尚未接入` })
      return
    }
    if (state.kind === 'workspace') {
      if (item.id === 'add') {
        showDemo({ title: '添加工作区', desc: '演示模式：工作区管理尚未接入', icon: 'folder-open' })
      } else {
        onWorkspaceSelect?.(item.label)
      }
      return
    }
    if (state.kind === 'notify') {
      if (item.id === 'read-all') {
        setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
        onNotifyRead?.()
        return
      }
      const target = notifications.find((n) => n.id === item.id)
      if (target?.unread) {
        setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n)))
        onNotifyReadOne?.()
      }
      showDemo({ title: '通知详情', desc: item.label, icon: 'bell' })
      return
    }
    if (state.kind === 'account') {
      if (item.id === 'theme-light') {
        setThemeMode('light')
        return
      }
      if (item.id === 'theme-dark') {
        setThemeMode('dark')
        return
      }
      if (item.id === 'theme-system') {
        setThemeMode('system')
        return
      }
      showDemo({ title: item.label, desc: '演示模式：账户功能尚未接入', icon: 'user' })
    }
  }

  /* ==================== leading：菜单溢出收纳 ==================== */

  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<HTMLButtonElement>(null)
  const menuRefs = useRef<(HTMLButtonElement | null)[]>([])
  const wsWidthRef = useRef(0)
  const menuWidthsRef = useRef<number[]>([])
  /* 菜单内容签名：只有菜单真正变化才重置收纳状态。
     父组件每次渲染传入新数组身份时不再触发重排，避免频闪 */
  const menusKey = useMemo(() => menus.map((m) => m).join('\u0000'), [menus])
  const menusRef = useRef(menus)
  menusRef.current = menus
  /* 收纳状态同时存 state（渲染）与 ref（layout 读取）。
   * layout 只依赖 menus（不依赖 state），避免「state → layout → state」的无限循环频闪 */
  const [visibleCount, setVisibleCount] = useState(menus.length)
  const [wsIconOnly, setWsIconOnly] = useState(false)
  const visibleCountRef = useRef(menus.length)
  const wsIconOnlyRef = useRef(false)
  /** leading 自然宽度（全部菜单展开 + 当前工作区样式），供 Titlebar 计算应用名收缩 */
  const [naturalWidth, setNaturalWidth] = useState(0)

  const layout = useCallback(() => {
    if (part !== 'leading') return
    const menus = menusRef.current
    const container = containerRef.current
    if (!container) return
    const avail = container.clientWidth

    /* 全量可见时缓存自然宽度（首帧 DOM 未就绪则稍后重试，避免缓存 0 宽导致永不收纳） */
    if (visibleCountRef.current >= menus.length && !wsIconOnlyRef.current) {
      const nextWs = wsRef.current?.offsetWidth ?? 0
      const nextMenus = menus.map((_, i) => menuRefs.current[i]?.offsetWidth ?? 0)
      const valid = menus.length === 0 || nextWs > 0 || nextMenus.some((w) => w > 0)
      if (!valid) {
        window.setTimeout(layout, 40)
        return
      }
      wsWidthRef.current = nextWs
      menuWidthsRef.current = nextMenus
    }

    const wsW = wsWidthRef.current
    const totalMenus = menuWidthsRef.current.reduce((a, b) => a + b, 0)

    /* 1) 工作区：空间不足则图标化 */
    const needIconOnly = wsW + totalMenus + BUFFER > avail
    if (needIconOnly !== wsIconOnlyRef.current) {
      wsIconOnlyRef.current = needIconOnly
      setWsIconOnly(needIconOnly)
    }

    /* 上报自然宽度（供 Titlebar 的应用名收缩计算） */
    const natural = (needIconOnly ? 33 : wsW) + totalMenus + MORE_BTN_W + (menus.length + 2) * 4 + 10
    setNaturalWidth((prev) => (Math.abs(prev - natural) > 1 ? natural : prev))

    /* 2) 菜单：从右往左收进 ⋯ */
    let nextCount = menus.length
    const fitsAll = wsW + totalMenus + BUFFER <= avail
    if (!fitsAll) {
      const used = needIconOnly ? 33 : wsW
      let acc = 0
      let count = 0
      for (const w of menuWidthsRef.current) {
        if (used + acc + w + MORE_BTN_W + BUFFER <= avail) {
          acc += w
          count++
        } else {
          break
        }
      }
      if (count < menus.length && used + acc + MORE_BTN_W + BUFFER > avail) count = 0
      nextCount = count
    }
    if (nextCount !== visibleCountRef.current) {
      visibleCountRef.current = nextCount
      setVisibleCount(nextCount)
    }
  }, [part])

  useEffect(() => {
    if (part !== 'leading') return
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => layout())
    ro.observe(container)
    window.addEventListener('resize', layout)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', layout)
    }
  }, [part, layout])

  /* 菜单内容变化（视图切换）时重置收纳状态再重排；身份变化不触发 */
  useEffect(() => {
    visibleCountRef.current = menusRef.current.length
    wsIconOnlyRef.current = false
    setVisibleCount(menusRef.current.length)
    setWsIconOnly(false)
    menuWidthsRef.current = []
    wsWidthRef.current = 0
    const t1 = window.setTimeout(layout, 30)
    const t2 = window.setTimeout(layout, 140)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [menusKey, layout])

  const hiddenMenus = useMemo(() => menus.slice(visibleCount), [menus, visibleCount])

  /* ==================== trailing：Ask AI 快捷键提示 ==================== */

  const aiShortcut = isMac ? '⌘⌥I' : 'Ctrl+Alt+I'

  /* ==================== 渲染 ==================== */

  if (part === 'leading') {
    return (
      <div
        ref={containerRef}
        data-natural-width={naturalWidth || undefined}
        className="flex min-w-0 flex-1 items-center gap-1"
      >
        {/* 工作区 */}
        <button
          ref={wsRef}
          type="button"
          aria-label="切换工作区"
          onClick={openWorkspace}
          className={cn(
            'ui-press inline-flex h-[26px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full text-sm font-medium',
            wsIconOnly ? 'px-[9px]' : 'px-2.5',
            'hover:bg-[var(--tb-hover)] active:bg-[var(--tb-active)]'
          )}
        >
          <Icon name="folder-open" size={15} className="opacity-75" />
          {!wsIconOnly && <span className="max-w-[140px] truncate">{workspaceName}</span>}
          {!wsIconOnly && <Icon name="chevron-down" size={9} className="ml-0.5 opacity-50" />}
        </button>

        <span className="mx-1 inline-block h-4 w-px shrink-0 bg-[var(--tb-divider)]" aria-hidden />

        {/* 文字菜单（放不下的收进 ⋯） */}
        {menus.map((m, i) => (
          <button
            key={m}
            ref={(el) => {
              menuRefs.current[i] = el
            }}
            type="button"
            onClick={(e) => openMenu(m, e.currentTarget)}
            className={cn(
              'ui-press h-[26px] shrink-0 cursor-pointer rounded-full px-2 text-sm tracking-[0.1px]',
              'text-[var(--tb-fg)] hover:bg-[var(--tb-hover)] active:bg-[var(--tb-active)]',
              i >= visibleCount && 'hidden'
            )}
          >
            {m}
          </button>
        ))}

        {/* ⋯ 溢出按钮 */}
        {hiddenMenus.length > 0 && (
          <button
            type="button"
            aria-label="更多菜单"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              setDropdown({
                kind: 'overflow',
                x: r.left - 170,
                y: r.bottom + 6,
                title: '更多',
                items: hiddenMenus.map((m) => ({ id: `menu:${m}`, label: m, icon: 'menu' })),
              })
            }}
            className="ui-press inline-flex h-[26px] w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--tb-fg)] hover:bg-[var(--tb-hover)]"
          >
            <Icon name="ellipsis-h" size={15} />
          </button>
        )}

        {dropdown && (
          <Dropdown
            items={dropdown.items}
            title={dropdown.title}
            x={dropdown.x}
            y={dropdown.y}
            onSelect={(item) => {
              if (dropdown.kind === 'overflow' && item.id.startsWith('menu:')) {
                const name = item.id.slice(5)
                setDropdown(null)
                const el = menuRefs.current[0]
                if (el) openMenu(name, el)
                return
              }
              onDropdownSelect(item)
            }}
            onClose={() => setDropdown(null)}
          />
        )}
      </div>
    )
  }

  /* ---------- trailing ---------- */
  return (
    <>
      <Button
        variant="primary"
        size="sm"
        aria-label={`Ask AI（${aiShortcut}）`}
        aria-pressed={aiActive}
        title={`Ask AI（${aiShortcut}）`}
        onClick={onAskAi}
        className={cn('h-[26px] rounded-full px-3', aiActive && 'ring-2 ring-[color-mix(in_srgb,var(--kn-brand-500)_45%,transparent)]')}
      >
        <Icon name="sparkles" size={15} />
        <span className="hidden min-[950px]:inline">Ask AI</span>
        {!isMac && <Kbd className="border-white/25 bg-white/15 text-white/90">Ctrl+Alt+I</Kbd>}
        {isMac && <Kbd className="border-white/25 bg-white/15 text-white/90">⌘⌥I</Kbd>}
      </Button>

      <span className="mx-1 inline-block h-4 w-px shrink-0 bg-[var(--tb-divider)]" aria-hidden />

      <div className="inline-flex shrink-0 items-center gap-0.5">
        {/* Rare UI 通知铃（未读数量徽标 + 新增时摇铃动画） */}
        <NotificationBell
          count={notifyCount}
          max={9}
          variant="count"
          size={30}
          color="orange"
          aria-label="通知"
          onClick={openNotify}
        />
        <button
          type="button"
          aria-label="账户"
          onClick={openAccount}
          className="ui-press ui-lift inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[var(--tb-fg)] hover:bg-[var(--tb-hover)]"
        >
          <Icon name="user" size={15} />
        </button>
      </div>

      {dropdown && (
        <Dropdown
          items={dropdown.items}
          title={dropdown.title}
          x={dropdown.x}
          y={dropdown.y}
          onSelect={onDropdownSelect}
          onClose={() => setDropdown(null)}
        />
      )}
    </>
  )
}
