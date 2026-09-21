/**
 * BootGate：启动闸门（窗口显示保障）
 * - 挂在应用最外层（ErrorBoundary 之外），即使 App 渲染崩溃也能执行 boot()
 * - boot(): init_custom_titlebar + 等待装饰插件 + win.show()（窗口默认 visible:false）
 * - 模块级标志防止 StrictMode/重复挂载导致重复启动
 */
import { useEffect, type ReactNode } from 'react'
import { useAppBoot } from '@/hooks/useAppBoot'

let bootStarted = false

export function BootGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (bootStarted) return
    bootStarted = true
    const { boot } = useAppBoot()
    void boot()
  }, [])

  return <>{children}</>
}
