/**
 * App：React 版外壳（迁移起点）
 *
 * 职责：
 * - 启动流程：初始化自定义标题栏 + 显示窗口（复用 useAppBoot，纯 TS 无框架依赖）
 * - 当前为"迁移落地页"：证明 React + Tailwind + Rare UI + Tauri 启动链路全部打通
 *
 * 后续迁移顺序（参考 README 与分支计划）：
 *   1. 外壳：Titlebar / ActivityBar / SideBar / 视图注册表
 *   2. 视图：Home → Editor → Files → Browser → AI → ComingSoon 视图
 *   3. 逻辑平移：composables → hooks（纯逻辑 utils 零改动复用）
 *   4. 收尾：删除 Vue 依赖与 .vue 文件
 */
import { useEffect, useState } from 'react'

import FluidOrb from '@/component/ui/fluid-orb'
import { useAppBoot } from '@/composables/useAppBoot'
import { Icon } from '@/component/common/Icon'

import './App.css'

/** 防止 StrictMode 下启动流程执行两次（init_custom_titlebar 幂等性未知，保险起见表） */
let bootStarted = false

const MIGRATION_STATUS = [
  { label: 'React 19 + Vite 环境', done: true },
  { label: 'Tailwind + 设计令牌复用', done: true },
  { label: 'Rare UI 组件接入（fluid-orb）', done: true },
  { label: 'Tauri 启动链路（标题栏 + 窗口显示）', done: true },
  { label: '外壳迁移（顶栏 / 活动栏 / 侧栏）', done: false },
  { label: '视图迁移（首页 / 编辑器 / 文件 / 浏览器 / AI）', done: false },
]

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (bootStarted) return
    bootStarted = true
    const { boot } = useAppBoot()
    void boot().finally(() => setReady(true))
  }, [])

  return (
    <div className="app-shell">
      {/* 顶栏占位：可拖拽 + 应用名（完整顶栏在下一步迁移） */}
      <header className="app-titlebar" data-tauri-drag-region="deep">
        <Icon name="cloud" size={16} />
        <span className="app-titlebar-name">KazeNest</span>
        <span className="app-titlebar-tag">React 迁移中</span>
      </header>

      <main className="app-main">
        <div className="app-orb">
          <FluidOrb size={200} />
        </div>

        <h1 className="app-title">KazeNest</h1>
        <p className="app-subtitle">Where Clouds Rest · React 版正在重建</p>

        <div className="app-status">
          {MIGRATION_STATUS.map((s) => (
            <span key={s.label} className={`app-status-item${s.done ? ' is-done' : ''}`}>
              <Icon name={s.done ? 'check' : 'clock'} size={12} />
              {s.label}
            </span>
          ))}
        </div>

        <p className="app-hint">
          {ready
            ? '启动完成：窗口已显示，标题栏由 Tauri 装饰插件接管'
            : '正在初始化窗口…'}
        </p>
      </main>
    </div>
  )
}
