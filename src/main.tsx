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

import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'

import './styles/tailwind.css'
import './styles/tokens.css'
import './styles/fonts.css'
import './styles/effects.css'
import './styles/native-controls.css'

import { MotionConfig } from 'motion/react'

import App from './App'
import { BootGate } from '@/component/common/BootGate'
import { ErrorBoundary } from '@/component/common/ErrorBoundary'
import { prefetchViews } from '@/registry/views'
import { bootstrapTheme } from '@/hooks/useTheme'
import { bootstrapDensity } from '@/hooks/useDensity'

/* 应用外观与密度（读盘；渲染前应用避免闪白/尺寸跳动） */
void bootstrapTheme()
void bootstrapDensity()

const container = document.getElementById('root')
if (!container) throw new Error('找不到 #root 挂载点')

createRoot(container).render(
  <MotionConfig reducedMotion="user">
    <BootGate>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BootGate>
  </MotionConfig>
)

/* 空闲预取其余页面（首次切换视图无需等待加载） */
prefetchViews()

/* 标记前端已启动（index.html 的兜底脚本据此判断是否需要强制显示窗口） */
document.documentElement.dataset.knReady = '1'
