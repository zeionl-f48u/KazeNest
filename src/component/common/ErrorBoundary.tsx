/**
 * ErrorBoundary：渲染错误边界
 * - 捕获子树渲染错误并显示可读的错误面板（而不是白屏）
 * - 配合 BootGate：错误时窗口仍会被显示，便于定位问题
 * - 提供"重新加载"按钮（location.reload）
 */
import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  componentStack: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: '' }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? '' })
    console.error('[KazeNest] 渲染错误：', error, info)
  }

  render() {
    const { error, componentStack } = this.state
    if (!error) return this.props.children

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'auto',
          padding: '32px',
          background: '#0e1015',
          color: '#e6e7eb',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          fontSize: 14,
          lineHeight: 1.7,
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: 20, color: '#ff3b30' }}>
          KazeNest 前端渲染出错
        </h1>
        <p style={{ margin: '0 0 16px', opacity: 0.75 }}>
          窗口已通过启动兜底显示；下面是错误详情（可截图反馈）。
        </p>

        <pre
          style={{
            margin: '0 0 16px',
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(244,63,94,0.12)',
            border: '1px solid rgba(244,63,94,0.4)',
            color: '#fda4af',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {error.message}
        </pre>

        {error.stack && (
          <details style={{ marginBottom: 16 }}>
            <summary style={{ cursor: 'pointer', opacity: 0.8 }}>调用栈</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', opacity: 0.7, fontSize: 12 }}>
              {error.stack}
            </pre>
          </details>
        )}

        {componentStack && (
          <details style={{ marginBottom: 16 }}>
            <summary style={{ cursor: 'pointer', opacity: 0.8 }}>组件路径</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', opacity: 0.7, fontSize: 12 }}>
              {componentStack}
            </pre>
          </details>
        )}

        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            height: 30,
            padding: '0 16px',
            border: 0,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #fc4c01, #ff3b30)',
            color: '#fff',
            font: 'inherit',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          重新加载
        </button>
      </div>
    )
  }
}
