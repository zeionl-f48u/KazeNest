/**
 * MarketplaceSidebar：插件市场侧栏（React 版）
 * - 搜索（界面演示）+ 已安装 / 官方推荐（演示数据与页面共用）+ 分类导航
 * - 点击条目：已安装/推荐 → 插件详情弹窗（演示）；分类 → 跳转插件市场页
 */
import { useMemo, useState } from 'react'
import { Icon } from '@/component/common/Icon'
import { SidebarSection, SidebarRow } from './SidebarRow'
import { plugins, pluginCategories } from '@/data/plugins'
import { showDemo } from '@/utils'
import './view-sidebar.css'

export function MarketplaceSidebar() {
  const [keyword, setKeyword] = useState('')

  const installed = useMemo(() => plugins.filter((p) => p.installed), [])
  const featured = useMemo(() => plugins.filter((p) => p.featured), [])

  const openPlugin = (id: string) => {
    const p = plugins.find((x) => x.id === id)
    if (!p) return
    showDemo({
      title: p.name,
      desc: `${p.author} · ${p.desc}（演示模式：插件详情尚未接入）`,
      icon: p.icon,
      tint: p.color,
    })
  }

  const openMarketplace = () => {
    window.dispatchEvent(new CustomEvent('kn:navigate', { detail: 'marketplace' }))
  }

  return (
    <div className="vs">
      {/* 搜索（演示） */}
      <div className="vs-search">
        <Icon name="search" size={13} className="vs-search-icon" />
        <input
          className="vs-search-input"
          placeholder="搜索插件"
          spellCheck={false}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <SidebarSection title="已安装" count={installed.length}>
        {installed.map((p) => (
          <SidebarRow
            key={p.id}
            icon={p.icon}
            color={p.color}
            onClick={() => openPlugin(p.id)}
            meta={<span className="vs-meta">{p.category}</span>}
          >
            {p.name}
          </SidebarRow>
        ))}
      </SidebarSection>

      <SidebarSection title="官方推荐" icon="sparkles" count={featured.length}>
        {featured.map((p) => (
          <SidebarRow
            key={p.id}
            icon={p.icon}
            color={p.color}
            onClick={() => openPlugin(p.id)}
            meta={<span className="vs-meta">{p.downloads}</span>}
          >
            {p.name}
          </SidebarRow>
        ))}
      </SidebarSection>

      <SidebarSection title="分类" icon="menu" initialCollapsed>
        {pluginCategories.slice(1).map((c) => (
          <SidebarRow key={c} icon="folder" onClick={openMarketplace}>
            {c}
          </SidebarRow>
        ))}
      </SidebarSection>
    </div>
  )
}
