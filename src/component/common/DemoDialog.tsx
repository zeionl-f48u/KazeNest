/**
 * DemoDialog：全局演示弹窗（无真实功能按钮的统一点击反馈）
 * - 监听 'kn:demo' 事件（utils/demo 的 showDemo 派发）
 * - 画面：图标 + 功能名 + 说明 + 「演示模式」标签 + 知道了
 * - 由 App 挂载一次；其他组件只管调用 showDemo()
 */
import { useEffect, useState } from 'react'
import { Dialog } from '@/component/ui/dialog'
import { Button } from '@/component/ui/button'
import { Icon } from './Icon'
import type { DemoPayload } from '@/utils/demo'

export function DemoDialog() {
  const [current, setCurrent] = useState<DemoPayload | null>(null)

  useEffect(() => {
    const onDemo = (e: Event) => setCurrent((e as CustomEvent<DemoPayload>).detail)
    window.addEventListener('kn:demo', onDemo)
    return () => window.removeEventListener('kn:demo', onDemo)
  }, [])

  return (
    <Dialog open={!!current} onClose={() => setCurrent(null)} label={current?.title}>
      {current && (
        <div className="flex flex-col items-center gap-2 px-6 pt-6 pb-[18px] text-center">
          <div
            style={{ '--tint': current.tint ?? 'var(--kn-brand-500)' } as React.CSSProperties}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--tint)_14%,transparent)] text-[var(--tint)]"
          >
            <Icon name={current.icon ?? 'sparkles'} size={22} />
          </div>
          <h3 className="mt-1.5 text-lg font-bold text-[var(--kn-fg)]">{current.title}</h3>
          <p className="m-0 text-xs leading-[1.7] text-[var(--kn-fg-muted)]">
            {current.desc ?? '演示模式：该功能尚未接入'}
          </p>
          <div className="mt-2.5 flex w-full items-center justify-between border-t border-[var(--kn-border)] pt-3">
            <span className="text-[10px] font-semibold tracking-[0.4px] text-[var(--kn-fg-subtle)] uppercase">
              演示模式
            </span>
            <Button variant="primary" size="sm" onClick={() => setCurrent(null)}>
              知道了
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
