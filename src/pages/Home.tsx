/**
 * Home：首页（React 版）
 * - 单屏布局：整页不滚动（height:100%），卡片网格与最近列表在内部自适应
 * - 欢迎横幅：品牌 + 主操作 + 状态；Rare UI FluidOrb 背景 + GravityLetters 互动层
 * - 快速开始：玻璃卡片网格（3×2 拉伸填满剩余高度）
 * - 最近打开：右侧列表（条数超出时列表内部滚动）
 * - 导航通过 onNavigate 回调（App 统一处理视图切换）
 */
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { CARD_IN, CARD_VIEWPORT, SPRING, cardDelay } from '@/lib/motion'
import { GlassCard } from '@/component/common/GlassCard'
import { Icon } from '@/component/common/Icon'
import { Button } from '@/component/ui/button'
import FluidOrb from '@/component/ui/fluid-orb'
import { AnimatedCounter } from '@/component/ui/animated-counter'
import GravityLetters from '@/component/ui/gravity-letters'
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
      {/* ==================== 欢迎横幅（紧凑单行 + 互动背景） ==================== */}
      <header className="home-hero">
        <div className="home-hero-orb" aria-hidden="true">
          <FluidOrb size={240} color="#fc4c01" />
        </div>
        {/* Rare UI 字母重力：横幅整块可点按掉落（内容层在其上） */}
        <div className="home-gravity" aria-hidden="true">
          <GravityLetters
            type="letters"
            items={['K', 'a', 'z', 'e', 'N', 'e', 's', 't', '☁']}
            size={20}
            color="var(--kn-brand-500)"
            maxGlyphs={48}
            className="h-full w-full"
          />
        </div>

        <div className="home-hero-main">
          <div className="home-logo">
            <span className="home-logo-glow" aria-hidden="true" />
            <Icon name="cloud" size={24} />
          </div>
          <div className="home-hero-text">
            <h1 className="home-title">KazeNest</h1>
            <p className="home-subtitle">Where Clouds Rest · 云原生开发工作台</p>
          </div>
        </div>

        <div className="home-hero-side">
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
              <AnimatedCounter value={recent.length} /> 个最近文件
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
        </div>
      </header>

      {/* ==================== 主区：快速开始 | 最近打开 ==================== */}
      <div className="home-main">
        <section className="home-pane home-pane-quick">
          <h2 className="home-section-title">
            <Icon name="sparkles" size={14} />
            快速开始
          </h2>
          <div className="home-grid">
            {homeCards.map((card, i) => (
              <motion.div
                key={card.id}
                className="home-card-cell"
                initial={CARD_IN.initial}
                whileInView={CARD_IN.animate}
                viewport={CARD_VIEWPORT}
                transition={{ ...SPRING.smooth, ...cardDelay(i) }}
              >
                <GlassCard
                  className="home-card"
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
              </motion.div>
            ))}
          </div>
        </section>

        <section className="home-pane home-pane-recent">
          <h2 className="home-section-title">
            <Icon name="clock" size={14} />
            最近打开
            <span className="home-pane-count">{recent.length}</span>
          </h2>
          <div className="home-recent">
            {recent.map((item, i) => (
              <button
                key={`${item.name}-${i}`}
                type="button"
                className="home-recent-item"
                onClick={() => onNavigate('editor')}
              >
                <Icon name={item.icon} size={14} className="home-recent-icon" color={item.color} />
                <span className="home-recent-name" title={item.name}>
                  {item.name}
                </span>
                <span className="home-recent-time">{formatRelativeTime(item.timestamp)}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
