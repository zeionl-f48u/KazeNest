/**
 * Marketplace：插件市场页面（界面样式版，不接真实插件源）
 * - 工具行：搜索 + 分类筛选 + 排序
 * - 插件卡片网格：图标 / 名称 / 作者 / 描述 / 下载量 / 评分 / 安装按钮（演示弹窗）
 * - 演示数据与侧栏共用（data/plugins.ts）
 */
import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { CARD_IN, CARD_VIEWPORT, SPRING, cardDelay } from '@/lib/motion'
import { Icon } from '@/component/common/Icon'
import { Button } from '@/component/ui/button'
import { Badge } from '@/component/ui/primitives'
import { plugins, pluginCategories } from '@/data/plugins'
import type { PluginDef } from '@/data/plugins'
import ProximitySidebar from '@/component/ui/proximity-sidebar'
import { GooeyNav } from '@/component/ui/gooey-nav'
import StepPlayer from '@/component/ui/step-player'
import { showDemo } from '@/utils'
import './marketplace.css'

type SortKey = 'popular' | 'rating' | 'name'

/* 安装流程演示步骤（StepPlayer 驱动） */
const INSTALL_STEPS = [
  { label: '搜索插件', duration: 1 },
  { label: '下载安装包', duration: 1.1 },
  { label: '校验并注册', duration: 1.1 },
  { label: '就绪可用', duration: 0.9 },
]

export function Marketplace() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof pluginCategories)[number]>('全部')
  const [sort, setSort] = useState<SortKey>('popular')

  /* 安装流程演示状态：StepPlayer 随安装动作推进 */
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [installStep, setInstallStep] = useState(0)
  const [installPlaying, setInstallPlaying] = useState(false)
  const [installedIds, setInstalledIds] = useState<string[]>(
    () => plugins.filter((p) => p.installed).map((p) => p.id)
  )

  const installing = plugins.find((p) => p.id === installingId) ?? null
  const isInstalled = (p: PluginDef) => installedIds.includes(p.id)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = plugins.filter((p) => {
      if (category !== '全部' && p.category !== category) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q)
      )
    })
    list = [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'rating') return b.rating - a.rating
      return parseFloat(b.downloads) - parseFloat(a.downloads)
    })
    return list
  }, [query, category, sort])

  const startInstall = (p: PluginDef) => {
    if (isInstalled(p)) {
      showDemo({
        title: `已安装：${p.name}`,
        desc: '演示模式：插件安装与运行尚未接入',
        icon: p.icon,
        tint: p.color,
      })
      return
    }
    setInstallingId(p.id)
    setInstallStep(0)
    setInstallPlaying(true)
  }

  const finishInstall = () => {
    setInstallPlaying(false)
    const p = plugins.find((x) => x.id === installingId)
    if (!p) return
    setInstalledIds((ids) => (ids.includes(p.id) ? ids : [...ids, p.id]))
    setInstallingId(null)
    showDemo({
      title: `${p.name} 安装完成`,
      desc: '演示模式：安装流程已跑完（未真正安装）',
      icon: p.icon,
      tint: p.color,
    })
  }

  return (
    <div className="mk mk-with-rail">
      {/* Rare UI：贴近式侧边导航（滚动联动高亮） */}
      <ProximitySidebar
        className="mk-rail"
        sections={[
          { id: 'mk-head', label: '插件市场', kind: 'title' },
          { id: 'mk-tools', label: '搜索与排序', kind: 'section' },
          { id: 'mk-steps', label: '安装流程', kind: 'section' },
          { id: 'mk-grid', label: '插件列表', kind: 'section' },
        ]}
      />

      <div className="mk-main">
      <header className="mk-head" id="mk-head">
        <h1 className="mk-title">
          <Icon name="extensions" size={20} className="mk-title-icon" />
          插件市场
        </h1>
        <p className="mk-subtitle">发现、安装与管理插件（当前为界面演示）</p>
      </header>

      {/* 工具行 */}
      <div className="mk-tools" id="mk-tools">
        <div className="mk-search">
          <Icon name="search" size={14} className="mk-search-icon" />
          <input
            className="mk-search-input"
            placeholder="搜索插件、作者或关键词"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="mk-search-x" aria-label="清空搜索" onClick={() => setQuery('')}>
              <Icon name="times" size={11} />
            </button>
          )}
        </div>

        <select
          className="mk-sort"
          aria-label="排序方式"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="popular">按下载量</option>
          <option value="rating">按评分</option>
          <option value="name">按名称</option>
        </select>
      </div>

      {/* Rare UI：安装流程（点击插件「安装」后由 StepPlayer 逐步演示） */}
      <div className="mk-steps" id="mk-steps">
        <div className="mk-steps-info">
          <span className="mk-steps-title">
            <Icon name="extensions" size={12} />
            安装流程
          </span>
          <span className="mk-steps-desc">
            {installing
              ? `${installing.name} · 步骤 ${installStep + 1}/${INSTALL_STEPS.length} · ${
                  INSTALL_STEPS[installStep]?.label ?? ''
                }`
              : '点击任意插件的「安装」，这里会演示安装进度'}
          </span>
        </div>
        <StepPlayer
          steps={INSTALL_STEPS}
          value={installStep}
          onValueChange={setInstallStep}
          playing={installPlaying}
          onPlayingChange={setInstallPlaying}
          onComplete={finishInstall}
          seekable={!!installing}
          showControl
          controlPosition="left"
        />
      </div>

      {/* 分类筛选（Rare UI 果冻导航） */}
      <div className="mk-cats">
        <GooeyNav
          size="sm"
          items={pluginCategories.map((c) => ({ label: c }))}
          value={Math.max(0, pluginCategories.indexOf(category))}
          onChange={(i: number) => setCategory(pluginCategories[i])}
          activeColor="var(--kn-brand-500)"
        />
      </div>

      {/* 卡片网格 */}
      {filtered.length === 0 ? (
        <div className="mk-empty">
          <Icon name="search" size={18} />
          <span>没有匹配的插件</span>
          <span className="mk-empty-hint">试试其他关键词或切换分类</span>
        </div>
      ) : (
        <div className="mk-grid" id="mk-grid">
          {filtered.map((p, i) => (
            <motion.article
              key={p.id}
              className="mk-card"
              initial={CARD_IN.initial}
              whileInView={CARD_IN.animate}
              viewport={CARD_VIEWPORT}
              transition={{ ...SPRING.smooth, ...cardDelay(i, 0.03) }}
              whileHover={{ y: -3, transition: SPRING.snappy }}
            >
              <div className="mk-card-head">
                <span className="mk-card-icon" style={{ '--tint': p.color } as React.CSSProperties}>
                  <Icon name={p.icon} size={18} />
                </span>
                <div className="mk-card-title">
                  <span className="mk-card-name">{p.name}</span>
                  <span className="mk-card-author">{p.author}</span>
                </div>
                {p.featured && <Badge className="mk-card-featured">推荐</Badge>}
              </div>

              <p className="mk-card-desc">{p.desc}</p>

              <div className="mk-card-foot">
                <span className="mk-card-stats">
                  <Icon name="arrow-down" size={11} />
                  {p.downloads}
                  <Icon name="star-fill" size={11} className="mk-card-star" />
                  {p.rating.toFixed(1)}
                </span>
                <Button
                  size="sm"
                  variant={isInstalled(p) ? 'outline' : 'primary'}
                  disabled={installingId === p.id}
                  onClick={() => startInstall(p)}
                >
                  {installingId === p.id ? (
                    <>
                      <Icon name="refresh" size={12} />
                      安装中
                    </>
                  ) : isInstalled(p) ? (
                    <>
                      <Icon name="check" size={12} />
                      已安装
                    </>
                  ) : (
                    <>
                      <Icon name="plus" size={12} />
                      安装
                    </>
                  )}
                </Button>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <p className="mk-hint">演示模式：插件数据为内置示例，安装与运行尚未接入</p>
      </div>
    </div>
  )
}
