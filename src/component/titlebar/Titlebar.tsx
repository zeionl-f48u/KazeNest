/**
 * Titlebar：顶栏骨架（React 版）
 * - 布局：应用图标 + 应用名 + leading 内容 | 中央搜索 | trailing 内容 | caption 让位
 * - 应用名完全收缩：空间不足先收窄（省略号），收不下时隐藏（优先级：应用名 → 菜单 ⋯ → 搜索框）
 * - macOS：为左上角交通灯让位；Windows/Linux：右侧给原生窗口按钮留空
 * - 拖动：data-tauri-drag-region（tauri-plugin-decoration 处理原生拖拽）
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../common/Icon'
import { SearchTrigger } from './SearchTrigger'
import { SearchPanel } from './SearchPanel'
import type { SearchItem } from './types'
import { cn } from '@/lib/utils'
import { isMac } from '@/utils'
import './tokens.css'
import './titlebar.css'

export interface TitlebarProps {
  title?: string
  appIcon?: string
  isInactive?: boolean
  searchItems?: SearchItem[]
  searchEnabled?: boolean
  /** 左侧扩展内容（工作区 + 菜单） */
  leading?: ReactNode
  /** 右侧扩展内容（Ask AI + 通知 + 账户） */
  trailing?: ReactNode
  onSearchSelect?: (item: SearchItem) => void
}

export function Titlebar({
  title = 'KazeNest',
  appIcon = 'cloud',
  isInactive = false,
  searchItems = [],
  searchEnabled = true,
  leading,
  trailing,
  onSearchSelect,
}: TitlebarProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  /* 全局 ⌘K / Ctrl+K：toggle 搜索面板（SearchTrigger 已拦截按键，这里只接收事件） */
  useEffect(() => {
    const onToggle = () => setSearchOpen((v) => !v)
    window.addEventListener('titlebar:search-toggle', onToggle)
    return () => window.removeEventListener('titlebar:search-toggle', onToggle)
  }, [])

  /* ==================== 应用名收缩 ==================== */

  const leftRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const titleNaturalRef = useRef(0)

  const measureTitleNatural = useCallback(() => {
    const el = titleRef.current
    if (!el) return
    const collapsed = el.classList.contains('is-collapsed')
    if (collapsed) el.classList.remove('is-collapsed')
    titleNaturalRef.current = el.scrollWidth
    if (collapsed) el.classList.add('is-collapsed')
  }, [])

  /**
   * 固定左区 / leading 的 flex-basis 为「自然宽度」：
   * 否则应用名收缩、菜单收进 ⋯ 会改变内容宽度 → 布局宽度跟着变 → 再次触发收缩计算，
   * 形成「内容 ↔ 宽度」反馈环（表现就是顶栏持续频闪）。
   * leading 的自然宽度由 TitlebarChrome 通过 data-natural-width 上报。
   */
  const syncNaturalBases = useCallback(() => {
    const left = leftRef.current
    const title = titleRef.current
    const slot = slotRef.current
    if (!left || !title || !slot) return
    const gap = parseFloat(getComputedStyle(left).gap) || 0
    const icon = left.querySelector<HTMLElement>('.tb-icon-btn')
    const iconW = icon ? icon.offsetWidth : 0
    const child = slot.firstElementChild as HTMLElement | null
    const slotNatural = Number(child?.dataset.naturalWidth ?? 0) || child?.scrollWidth || 0
    if (slotNatural > 0) slot.style.flexBasis = `${slotNatural}px`
    const leftNatural = Math.ceil(iconW + titleNaturalRef.current + slotNatural + gap * 2)
    if (leftNatural > 0) left.style.flexBasis = `${leftNatural}px`
  }, [])

  /** 应用名可用宽度 = 左区宽 − 图标 − leading 自然宽 − 间距（用固定 basis，反馈环已切断） */
  const updateTitleWidth = useCallback(() => {
    const left = leftRef.current
    const title = titleRef.current
    const slot = slotRef.current
    if (!left || !title || !slot) return
    const gap = parseFloat(getComputedStyle(left).gap) || 0
    const icon = left.querySelector<HTMLElement>('.tb-icon-btn')
    const iconW = icon ? icon.offsetWidth : 0
    const child = slot.firstElementChild as HTMLElement | null
    const slotBasis = parseFloat(slot.style.flexBasis || '0')
    const slotNatural = slotBasis || Number(child?.dataset.naturalWidth ?? 0) || slot.scrollWidth
    const avail = Math.max(0, left.clientWidth - iconW - slotNatural - gap * 2)

    if (avail < 18) {
      title.classList.add('is-collapsed')
      title.style.width = ''
      return
    }
    title.classList.remove('is-collapsed')
    title.style.width = avail < titleNaturalRef.current ? `${Math.floor(avail)}px` : ''
  }, [])

  useEffect(() => {
    const relayout = () => {
      measureTitleNatural()
      syncNaturalBases()
      updateTitleWidth()
    }
    relayout()
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
    void fonts?.ready.then(relayout)

    const left = leftRef.current
    const slot = slotRef.current
    /* 左区宽度变化（窗口缩放/侧栏开关）→ 重新计算应用名（只改应用名，不改 basis，无循环） */
    const ro = new ResizeObserver(() => updateTitleWidth())
    if (left) ro.observe(left)
    /* leading 自然宽变化（菜单溢出收纳完成）→ 重设 basis 并重算应用名 */
    const mo = new MutationObserver(() => relayout())
    const child = slot?.firstElementChild
    if (child) mo.observe(child, { attributes: true, attributeFilter: ['data-natural-width'] })

    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [measureTitleNatural, syncNaturalBases, updateTitleWidth, leading])

  /* ==================== 渲染 ==================== */

  const captionSpacer = isMac ? '8px' : 'max(8px, var(--tauri-plugin-decoration-right-clearance, 174px))'

  return (
    <header
      data-tauri-drag-region="deep"
      className={cn(
        'tb',
        isInactive && 'is-inactive'
      )}
      style={isMac ? { paddingLeft: 'max(var(--tb-pad-x), var(--tauri-plugin-decoration-left-clearance, var(--tb-traffic-lights, 78px)))' } : undefined}
    >
      {/* 左：应用图标 + 应用名 + leading */}
      <div ref={leftRef} className="tb-left">
        <button type="button" className="tb-icon-btn" aria-label={`${title} 菜单`}>
          <Icon name={appIcon} size={17} />
        </button>
        <span ref={titleRef} className="tb-title">
          {title}
        </span>
        <div ref={slotRef} className="tb-slot tb-slot--leading">
          {leading}
        </div>
      </div>

      {/* 中：命令中心 */}
      <div className="tb-center">
        {searchEnabled && (
          <SearchTrigger open={searchOpen} onOpen={() => setSearchOpen(true)} />
        )}
      </div>

      {/* 右：扩展 + caption 让位 */}
      <div className="tb-slot tb-slot--trailing">{trailing}</div>
      <div className="tb-caption-spacer" style={{ width: captionSpacer }} aria-hidden />

      {searchEnabled && (
        <SearchPanel
          open={searchOpen}
          items={searchItems}
          onClose={() => setSearchOpen(false)}
          onSelect={(item) => onSearchSelect?.(item)}
        />
      )}
    </header>
  )
}
