/**
 * BrowserToolbar：浏览器工具栏（React 版）
 * - 导航：后退 / 前进 / 刷新（加载中旋转） / 主页
 * - 地址栏：安全锁 + 输入框（聚焦全选；Enter 导航/搜索）
 * - 操作：收藏星标（激活填充）/ 更多（演示弹窗）
 */
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/component/common/Icon'
import { showDemo } from '@/utils'
import './browser.css'

export interface BrowserToolbarProps {
  url: string
  loading: boolean
  canBack: boolean
  canForward: boolean
  bookmarked: boolean
  onBack: () => void
  onForward: () => void
  onRefresh: () => void
  onHome: () => void
  onNavigate: (url: string) => void
  onToggleBookmark: () => void
}

function display(url: string) {
  return url.replace(/^https?:\/\//, '')
}

export function BrowserToolbar({
  url,
  loading,
  canBack,
  canForward,
  bookmarked,
  onBack,
  onForward,
  onRefresh,
  onHome,
  onNavigate,
  onToggleBookmark,
}: BrowserToolbarProps) {
  const [draft, setDraft] = useState(display(url))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(display(url))
  }, [url])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNavigate(draft)
  }

  return (
    <div className="bt">
      <div className="bt-nav">
        <button type="button" className="bt-btn" disabled={!canBack} title="后退" onClick={onBack}>
          <Icon name="arrow-left" size={14} />
        </button>
        <button type="button" className="bt-btn" disabled={!canForward} title="前进" onClick={onForward}>
          <Icon name="arrow-right" size={14} />
        </button>
        <button
          type="button"
          className={`bt-btn${loading ? ' is-spin' : ''}`}
          disabled={!url}
          title="刷新"
          onClick={onRefresh}
        >
          <Icon name="refresh" size={14} />
        </button>
        <button type="button" className="bt-btn" title="主页（新标签页）" onClick={onHome}>
          <Icon name="home" size={14} />
        </button>
      </div>

      <form className="bt-addr" onSubmit={onSubmit}>
        <Icon name={url ? 'lock' : 'search'} size={11} className="bt-addr-icon" />
        <input
          ref={inputRef}
          className="bt-addr-input"
          value={draft}
          placeholder="搜索或输入网址"
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => inputRef.current?.select()}
        />
      </form>

      <div className="bt-actions">
        <button
          type="button"
          className={`bt-btn${bookmarked ? ' is-starred' : ''}`}
          disabled={!url}
          title={bookmarked ? '取消收藏' : '收藏此页'}
          onClick={onToggleBookmark}
        >
          <Icon name={bookmarked ? 'star-fill' : 'star'} size={14} />
        </button>
        <button
          type="button"
          className="bt-btn"
          title="更多（演示）"
          onClick={() => showDemo({ title: '更多', desc: '演示模式：浏览器更多菜单尚未接入', icon: 'globe' })}
        >
          <Icon name="ellipsis-h" size={14} />
        </button>
      </div>
    </div>
  )
}
