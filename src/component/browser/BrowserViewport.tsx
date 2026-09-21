/**
 * BrowserViewport：浏览器内容区（React 版）
 * - 新标签页：Logo + 搜索框 + 快捷入口 + 最近访问
 * - 模拟网页：假站点头 + 加载进度条 + 骨架内容 + 演示提示（接 Tauri WebView 后替换）
 */
import { useState } from 'react'
import { Icon } from '@/component/common/Icon'
import { domainOf, faviconOf } from './favicon'
import './browser.css'

export interface BrowserViewportProps {
  url: string
  loading: boolean
  recent: string[]
  onNavigate: (url: string) => void
}

const QUICK_LINKS = [
  { name: 'GitHub', url: 'https://github.com', host: 'github.com', color: 'var(--kn-fg)', letter: 'G' },
  { name: 'Tauri', url: 'https://tauri.app', host: 'tauri.app', color: 'var(--kn-amber-500)', letter: 'T' },
  { name: 'Vue 3', url: 'https://cn.vuejs.org', host: 'cn.vuejs.org', color: 'var(--kn-emerald-500)', letter: 'V' },
  { name: 'MDN', url: 'https://developer.mozilla.org', host: 'developer.mozilla.org', color: 'var(--kn-sky-500)', letter: 'M' },
  { name: '掘金', url: 'https://juejin.cn', host: 'juejin.cn', color: 'var(--kn-brand-500)', letter: '掘' },
  { name: 'Bilibili', url: 'https://www.bilibili.com', host: 'bilibili.com', color: 'var(--kn-rose-500)', letter: 'B' },
]

export function BrowserViewport({ url, loading, recent, onNavigate }: BrowserViewportProps) {
  const [draft, setDraft] = useState('')

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const v = draft.trim()
    if (!v) return
    setDraft('')
    onNavigate(v)
  }

  /* ==================== 新标签页 ==================== */

  if (!url) {
    return (
      <div className="bv-start">
        <div className="bv-start-logo">
          <Icon name="globe" size={30} />
        </div>
        <h1 className="bv-start-title">KazeNest 浏览器</h1>
        <p className="bv-start-sub">搜索或输入网址开始浏览</p>

        <form className="bv-start-search" onSubmit={submitSearch}>
          <Icon name="search" size={14} className="bv-start-search-icon" />
          <input
            className="bv-start-search-input"
            placeholder="搜索或输入网址"
            spellCheck={false}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="bv-start-search-btn" disabled={!draft.trim()}>
            打开
          </button>
        </form>

        <div className="bv-quick">
          {QUICK_LINKS.map((q) => (
            <button
              key={q.url}
              type="button"
              className="bv-quick-card"
              style={{ '--tint': q.color } as React.CSSProperties}
              onClick={() => onNavigate(q.url)}
            >
              <span className="bv-quick-fav">{q.letter}</span>
              <span className="bv-quick-name">{q.name}</span>
              <span className="bv-quick-url">{q.host}</span>
            </button>
          ))}
        </div>

        {recent.length > 0 && (
          <div className="bv-recent">
            <div className="bv-recent-title">
              <Icon name="clock" size={11} />
              <span>最近访问</span>
            </div>
            {recent.map((r) => {
              const fav = faviconOf(r)
              return (
                <button key={r} type="button" className="bv-recent-item" onClick={() => onNavigate(r)}>
                  <span className="bv-recent-fav" style={{ '--tint': fav.color } as React.CSSProperties}>
                    {fav.letter}
                  </span>
                  <span className="bv-recent-host">{domainOf(r)}</span>
                  <span className="bv-recent-url">{r}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /* ==================== 模拟网页 ==================== */

  const fav = faviconOf(url)

  return (
    <div className="bv-page">
      <div className={`bv-progress${loading ? ' is-loading' : ''}`}>
        <i />
      </div>

      <header className="bv-page-head">
        <span className="bv-page-fav" style={{ '--tint': fav.color } as React.CSSProperties}>
          {fav.letter}
        </span>
        <span className="bv-page-domain">{domainOf(url)}</span>
        <nav className="bv-page-nav">
          <span>首页</span>
          <span>文档</span>
          <span>博客</span>
          <span>关于</span>
        </nav>
        <span className="bv-page-secure">
          <Icon name="lock" size={10} />
          https
        </span>
      </header>

      <div className="bv-page-body">
        <div className="bv-notice" style={{ '--tint': fav.color } as React.CSSProperties}>
          <Icon name="globe" size={14} />
          <span>
            演示模式：这里将嵌入真实网页（接 Tauri WebView 后渲染 <b>{url}</b>）
          </span>
        </div>

        <div className="bv-skeleton">
          <div className="bv-sk-hero" style={{ '--tint': fav.color } as React.CSSProperties}>
            <span className="bv-sk-hero-tag">{fav.letter}</span>
            <span className="bv-sk-hero-line is-main" />
            <span className="bv-sk-hero-line is-sub" />
          </div>
          <div className="bv-sk-lines">
            <i />
            <i />
            <i className="is-short" />
          </div>
          <div className="bv-sk-cards">
            {[0, 1, 2].map((n) => (
              <span key={n}>
                <i className="bv-sk-card-bar" />
                <i className="bv-sk-card-line" />
                <i className="bv-sk-card-line is-short" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
