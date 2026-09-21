/**
 * ComingSoon：占位页（「建设中」页面统一用它）
 * - 由 data/comingSoon 的配置驱动（title/subtitle/icon/tint/desc/tags）
 * - 视觉：品牌色光晕 + 浮动图标 + 能力清单（交错入场）+ 路线图提示
 */
import { Icon } from './Icon'
import { PageLayout } from './PageLayout'
import type { ComingSoonConfig } from '@/data'
import './coming-soon.css'

export function ComingSoon({ title, subtitle, icon, tint, desc, tags }: ComingSoonConfig) {
  return (
    <PageLayout title={title} subtitle={subtitle} icon={icon}>
      <div className="cs" style={{ '--tint': tint } as React.CSSProperties}>
        {/* 品牌色光晕背景 */}
        <div className="cs-glow" aria-hidden="true" />

        <div className="cs-card">
          <div className="cs-float">
            <Icon name={icon} size={40} />
          </div>
          <h3 className="cs-title">{title}</h3>
          <p className="cs-desc">{desc}</p>

          {/* 能力清单（建设中） */}
          <div className="cs-tags">
            {tags.map((tag, i) => (
              <span key={tag} className="cs-tag" style={{ animationDelay: `${i * 70}ms` }}>
                <Icon name="clock" size={11} className="cs-tag-icon" />
                <span className="cs-tag-label">{tag}</span>
                <span className="cs-tag-state">建设中</span>
              </span>
            ))}
          </div>

          <p className="cs-hint">该模块将按路线图逐步开放 · 当前为界面占位</p>
        </div>
      </div>
    </PageLayout>
  )
}
