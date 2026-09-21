/**
 * Home：首页（React 版）
 * - 欢迎区（品牌 + 标语 + 主操作 + 状态条）
 * - 快速开始：玻璃卡片网格（data/homeCards 驱动）
 * - 最近打开：settings.json 读取（回到首页时刷新）
 * - 导航通过 onNavigate 回调（App 统一处理视图切换）
 */
import { useEffect, useState } from 'react'
import { GlassCard } from '@/component/common/GlassCard'
import { Icon } from '@/component/common/Icon'
import { Button } from '@/component/ui/button'
import { homeCards } from '@/data/homeCards'
import { getRecentFiles, formatRelativeTime } from '@/utils'
import type { RecentFile } from '@/utils'
import './home.css'

export interface HomeProps {
  /** 视图切换（App 传入） */
  onNavigate: (target: string) => void
}

const FALLBACK_RECENT: RecentFile[] = [
  { name: 'src/App.tsx', icon: 'file-text', color: 'var(--kn-emerald-500)', timestamp: Date.now() - 2 * 60_000 },
  { name: 'src/data/homeCards.ts', icon: 'file-text', color: 'var(--kn-sky-500)', timestamp: Date.now() - 60 * 60_000 },
  { name: 'README.md', icon: 'file-text', color: 'var(--kn-fg-muted)', timestamp: Date.now() - 24 * 60 * 60_000 },
]

export function Home({ onNavigate }: HomeProps) {
  const [recent, setRecent] = useState<RecentFile[]>(FALLBACK_RECENT)

  useEffect(() => {
    let cancelled = false
    void getRecentFiles().then((saved) => {
      if (!cancelled && saved.length > 0) setRecent(saved)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="home">
      {/* 欢迎区 */}
      <header className="home-hero">
        <div className="home-logo">
          <span className="home-logo-glow" aria-hidden="true" />
          <Icon name="cloud" size={34} />
        </div>
        <h1 className="home-title">KazeNest</h1>
        <p className="home-subtitle">Where Clouds Rest · 一个现代的云原生开发工作台</p>

        <div className="home-actions">
          <Button variant="primary" onClick={() => onNavigate('editor')}>
            <Icon name="file-text" size={14} />
            进入编辑器
          </Button>
          <Button onClick={() => onNavigate('files')}>
            <Icon name="folder-open" size={14} />
            打开工作区
          </Button>
        </div>

        <div className="home-stats">
          <span className="home-stat">
            <Icon name="file-text" size={12} />
            {recent.length} 个最近文件
          </span>
          <span className="home-stat-dot" aria-hidden="true" />
          <span className="home-stat">
            <Icon name="sparkles" size={12} />
            AI 助手就绪
          </span>
          <span className="home-stat-dot" aria-hidden="true" />
          <span className="home-stat">
            <Icon name="cloud" size={12} />
            云同步已开启
          </span>
        </div>
      </header>

      {/* 快速开始 */}
      <section className="home-section">
        <h2 className="home-section-title">
          <Icon name="sparkles" size={14} />
          快速开始
        </h2>
        <div className="home-grid">
          {homeCards.map((card) => (
            <GlassCard
              key={card.id}
              title={card.title}
              desc={card.desc}
              icon={card.icon}
              color={card.color}
              interactive
              onClick={() => onNavigate(card.target)}
              footer={
                <button
                  type="button"
                  className="home-card-link"
                  onClick={(e) => {
                    e.stopPropagation()
                    onNavigate(card.target)
                  }}
                >
                  <span>打开</span>
                  <Icon name="arrow-right" size={12} />
                </button>
              }
            />
          ))}
        </div>
      </section>

      {/* 最近打开 */}
      <section className="home-section">
        <h2 className="home-section-title">
          <Icon name="clock" size={14} />
          最近打开
        </h2>
        <div className="home-recent">
          {recent.map((item, i) => (
            <button
              key={`${item.name}-${i}`}
              type="button"
              className="home-recent-item"
              onClick={() => onNavigate('editor')}
            >
              <Icon
                name={item.icon}
                size={14}
                className="home-recent-icon"
                color={item.color}
              />
              <span className="home-recent-name">{item.name}</span>
              <span className="home-recent-time">{formatRelativeTime(item.timestamp)}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
