/**
 * Marketplace：插件市场页面（界面样式版，不接真实插件源）
 * - 工具行：搜索 + 分类筛选 + 排序
 * - 插件卡片网格：图标 / 名称 / 作者 / 描述 / 下载量 / 评分 / 安装按钮（演示弹窗）
 * - 演示数据与侧栏共用（data/plugins.ts）
 */
import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Icon } from '@/component/common/Icon'
import { Button } from '@/component/ui/button'
import { Badge } from '@/component/ui/primitives'
import { plugins, pluginCategories } from '@/data/plugins'
import type { PluginDef } from '@/data/plugins'
import ProximitySidebar from '@/component/ui/proximity-sidebar'
import StepPlayer from '@/component/ui/step-player'
import { showDemo } from '@/utils'
import './marketplace.css'

type SortKey = 'popular' | 'rating' | 'name'

export function Marketplace() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('全部')
  const [sort, setSort] = useState<SortKey>('popular')

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

  const onInstall = (p: PluginDef) => {
    showDemo({
      title: p.installed ? `已安装：${p.name}` : `安装 ${p.name}`,
      desc: '演示模式：插件安装与运行尚未接入',
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

      {/* Rare UI：安装流程演示（自动播放的 StepPlayer） */}
      <div className="mk-steps" id="mk-steps">
        <StepPlayer
          steps={[
            { label: '搜索插件', duration: 1.3 },
            { label: '一键安装', duration: 1.3 },
            { label: '授权权限', duration: 1.3 },
            { label: '就绪可用', duration: 1.3 },
          ]}
          defaultPlaying
          loop
          showControl
          controlPosition="right"
        />
      </div>

      {/* 分类筛选 */}
      <div className="mk-cats">
        {pluginCategories.map((c) => (
          <button
            key={c}
            type="button"
            className={`mk-cat${category === c ? ' is-on' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3 }}
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
                  variant={p.installed ? 'outline' : 'primary'}
                  onClick={() => onInstall(p)}
                >
                  {p.installed ? (
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
