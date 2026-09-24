/**
 * React 入口（react-rewrite 分支）
 *
 * 渲染结构（从外到内）：
 *   BootGate      启动闸门：无论 App 是否渲染成功都调用 boot() 显示窗口
 *   ErrorBoundary 错误边界：渲染错误显示为可读面板（而非白屏）
 *   App           应用外壳
 *
 * 样式复用既有设计体系：tailwind.css + tokens.css / effects.css
 */
import { createRoot } from 'react-dom/client'

import './styles/tailwind.css'
import './styles/tokens.css'
import './styles/fonts.css'
import './styles/effects.css'

import App from './App'
import { BootGate } from '@/component/common/BootGate'
import { ErrorBoundary } from '@/component/common/ErrorBoundary'
import { bootstrapTheme } from '@/hooks/useTheme'
import { initDecorationMetrics } from '@/utils/decoration'

/* 应用外观（读盘；渲染前应用避免闪白） */
void bootstrapTheme()

/* 顶栏高度跟随 tauri-plugin-decoration 注入的原生窗口控制器（32px 等） */
initDecorationMetrics()

const container = document.getElementById('root')
if (!container) throw new Error('找不到 #root 挂载点')

createRoot(container).render(
  <BootGate>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </BootGate>
)

/* 标记前端已启动（index.html 的兜底脚本据此判断是否需要强制显示窗口） */
document.documentElement.dataset.knReady = '1'
