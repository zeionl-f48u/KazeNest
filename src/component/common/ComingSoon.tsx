/**
 * ComingSoon：占位页（「建设中」页面统一用它）
 * - 由 data/comingSoon 的配置驱动（title/subtitle/icon/tint/desc/tags）
 * - 与 Vue 版视觉一致：浮动图标 + 标题 + 描述 + 能力标签
 */
import { Icon } from './Icon'
import { PageLayout } from './PageLayout'
import type { ComingSoonConfig } from '@/data'

export function ComingSoon({ title, subtitle, icon, tint, desc, tags }: ComingSoonConfig) {
  return (
    <PageLayout title={title} subtitle={subtitle} icon={icon}>
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div
          style={{ '--tint': tint } as React.CSSProperties}
          className="cs-float inline-flex h-[84px] w-[84px] items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--tint)_14%,transparent)] text-[var(--tint)] shadow-[var(--kn-shadow-md)]"
        >
          <Icon name={icon} size={40} />
        </div>
        <h3 className="mt-2 text-xl font-semibold text-[var(--kn-fg)]">{title}</h3>
        <p className="m-0 max-w-[320px] text-sm leading-relaxed text-[var(--kn-fg-muted)]">
          {desc}
        </p>
        <div className="mt-2 inline-flex flex-wrap justify-center gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--kn-border)] bg-[var(--kn-bg-elev)] px-3 py-1 text-xs text-[var(--kn-fg-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}
