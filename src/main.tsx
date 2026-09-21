/**
 * React 入口（react-rewrite 分支）
 *
 * 说明：
 * - 样式复用既有设计体系：tailwind.css（工具类）+ tokens.css / effects.css（设计令牌与全局动效）
 * - 迁移期：旧 Vue 代码保留在源码树中作参考，不再被 index.html 引用（入口已切到本文件）
 * - 设计目标：接入 Rare UI（shadcn 注册表）承载新组件，逐步替换全部视图
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/tailwind.css'
import './styles/tokens.css'
import './styles/effects.css'

import App from './App'
import { bootstrapTheme } from '@/hooks/useTheme'

/* 应用外观（读盘；渲染前应用避免闪白） */
void bootstrapTheme()

const container = document.getElementById('root')
if (!container) throw new Error('找不到 #root 挂载点')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)
