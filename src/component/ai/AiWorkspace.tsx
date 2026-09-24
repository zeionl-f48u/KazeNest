/**
 * AiWorkspace：AI 工作台（React 版，DeepSeek Harness 风格）
 * - variant='page'：AI 主界面全宽形态；variant='panel'：右侧面板紧凑形态
 * - 空态：欢迎页（Logo + 欢迎语 + 居中输入卡片 + 建议卡片）；有消息后输入区落底
 * - 消息流：思考折叠块 + 流式打字机 + 消息卡片（复制/重新生成）
 * - 滚动：贴近底部时自动跟随；上滚显示"回到底部"
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/component/common/Icon'
import FluidOrb from '@/component/ui/fluid-orb'
import MatrixOrb from '@/component/ui/matrix-orb'
import type { MatrixOrbState } from '@/component/ui/matrix-orb'
import { AiMessageView } from './AiMessageView'
import { AiInputBar } from './AiInputBar'
import { useAiChat } from '@/hooks/useAiChat'
import { restoreAi } from '@/hooks/useAiChat'
import type { WorkKind } from '@/hooks/useAiChat'
import './ai.css'

export interface AiWorkspaceProps {
  variant?: 'page' | 'panel'
  /** page 形态：面板展开态显示关闭按钮 */
  closable?: boolean
  onExpand?: () => void
  onClose?: () => void
}

interface EmptySuggest {
  label: string
  desc: string
  icon: string
  color: string
  work: WorkKind
}

const SUGGESTS: EmptySuggest[] = [
  { label: '解释代码', desc: '按 思路 → 要点 → 风险 拆解', icon: 'file-text', color: 'var(--kn-emerald-500)', work: 'explain' },
  { label: '编写代码', desc: '生成可直接使用的实现', icon: 'file-plus', color: 'var(--kn-sky-500)', work: 'coding' },
  { label: '代码评审', desc: '正确性 / 健壮性 / 可读性', icon: 'check', color: 'var(--kn-rose-500)', work: 'review' },
  { label: '写单元测试', desc: '正常路径 → 边界 → 异常', icon: 'terminal', color: 'var(--kn-amber-500)', work: 'test' },
]

export function AiWorkspace({ variant = 'page', closable = false, onExpand, onClose }: AiWorkspaceProps) {
  const chat = useAiChat()
  const isPanel = variant === 'panel'

  const chatRef = useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  /* 输入框聚焦 → Orb listening（AI 形象状态联动） */
  const [inputFocused, setInputFocused] = useState(false)

  const messages = chat.messages
  const streaming = chat.streaming
  const thinking = chat.thinking

  /* AI 形象（MatrixOrb）状态：生成/思考中 → thinking；输入聚焦 → listening；否则 idle */
  const orbState: MatrixOrbState =
    streaming || (thinking && thinking.text === '')
      ? 'thinking'
      : inputFocused
        ? 'listening'
        : 'idle'

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].id
    }
    return null
  }, [messages])

  /* ==================== 滚动跟随 ==================== */

  const onChatScroll = () => {
    const el = chatRef.current
    if (!el) return
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 80)
  }

  const scrollToBottom = useCallback((force = false) => {
    const el = chatRef.current
    if (!el) return
    if (!force && el.scrollHeight - el.scrollTop - el.clientHeight >= 80) return
    window.setTimeout(() => {
      const node = chatRef.current
      if (!node) return
      node.scrollTop = node.scrollHeight
      setShowScrollBtn(false)
    }, 0)
  }, [])

  /* 新消息 / 流式增量：贴近底部时跟随 */
  useLayoutEffect(() => {
    scrollToBottom(false)
  }, [messages.length, streaming?.length, scrollToBottom])

  useEffect(() => {
    scrollToBottom(true)
  }, [chat.activeSessionId, scrollToBottom])

  /* 启动恢复（幂等） */
  useEffect(() => {
    void restoreAi()
  }, [])

  /* ==================== 操作 ==================== */

  const onSend = (payload: { text: string; attachments: string[] }) => {
    chat.send(payload)
    scrollToBottom(true)
  }

  const onSuggest = (s: EmptySuggest) => {
    const w = chat.workModes.find((x) => x.kind === s.work)
    if (!w) return
    chat.pickWork(w)
    scrollToBottom(true)
  }

  const onNewChat = () => {
    chat.newChat()
    scrollToBottom(true)
  }

  const onClear = () => {
    const sess = chat.activeSession
    if (sess) {
      sess.messages = []
      chat.selectSession(sess.id)
    }
  }

  /* ==================== 渲染 ==================== */

  return (
    <div className="ai-workspace">
      <div className={`aw-top${isPanel ? ' is-panel' : ''}`}>
        <div className="aw-title">
          {/* Rare UI MatrixOrb：AI 形象（随生成/输入状态变化） */}
          <span className="aw-title-orb" aria-hidden="true">
            <MatrixOrb size={isPanel ? 18 : 20} state={orbState} className="ai-orb" />
          </span>
          <span>{isPanel ? 'AI 助手' : 'AI 工作台'}</span>
          {!isPanel && chat.activeSession && <span className="aw-session-name">{chat.activeSession.label}</span>}
        </div>

        <div className="aw-actions">
          <div className="aw-model">
            {!isPanel && <Icon name="sparkles" size={11} className="aw-model-icon" />}
            <select
              className="aw-model-select"
              aria-label="选择模型"
              value={chat.activeModel}
              onChange={(e) => chat.setActiveModel(e.target.value)}
            >
              {chat.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {isPanel ? m.label : `${m.label} · ${m.desc}`}
                </option>
              ))}
            </select>
          </div>

          {isPanel ? (
            <>
              <button type="button" className="aw-btn is-icon" aria-label="新对话" title="新对话" onClick={onNewChat}>
                <Icon name="plus" size={14} />
              </button>
              <button
                type="button"
                className="aw-btn is-icon is-expand"
                aria-label="在 AI 界面打开"
                title="在 AI 界面打开"
                onClick={onExpand}
              >
                <Icon name="angle-double-left" size={13} />
              </button>
              <button type="button" className="aw-btn is-icon is-close" aria-label="关闭面板" title="关闭面板" onClick={onClose}>
                <Icon name="times" size={14} />
              </button>
            </>
          ) : (
            <>
              <button type="button" className="aw-btn" aria-label="新对话" onClick={onNewChat}>
                <Icon name="plus" size={13} />
                <span>新对话</span>
              </button>
              <button type="button" className="aw-btn is-icon" aria-label="清空当前对话" title="清空当前对话" onClick={onClear}>
                <Icon name="refresh" size={13} />
              </button>
              {closable && (
                <button type="button" className="aw-btn is-icon is-close" aria-label="关闭面板" title="关闭面板" onClick={onClose}>
                  <Icon name="times" size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="aw-chat" ref={chatRef} onScroll={onChatScroll}>
        <div className={`aw-thread${messages.length ? '' : ' is-hero'}${isPanel ? ' is-panel' : ''}`}>
          {messages.length === 0 ? (
            <div className={`aw-hero${isPanel ? ' is-panel' : ''}`}>
              {/* Rare UI 流体球：空态装饰背景（面板形态省略，节省空间） */}
              {!isPanel && (
                <div className="aw-hero-orb" aria-hidden="true">
                  <FluidOrb size={300} color="#fc4c01" />
                </div>
              )}
              <div className="aw-hero-logo is-orb">
                <MatrixOrb
                  size={isPanel ? 54 : 72}
                  state={orbState}
                  className="ai-orb"
                />
              </div>
              <h2 className="aw-hero-title">
                {isPanel ? '你好，我是 AI 助手' : '你好，我是 KazeNest 开发工作助手'}
              </h2>
              {!isPanel && (
                <p className="aw-hero-sub">写代码 · 解释代码 · 重构 · 写测试 · 评审 · 文档 · 数据分析 · 翻译</p>
              )}

              <div className="aw-hero-input">
                <AiInputBar
                  onSend={onSend}
                  onStop={chat.stopStreaming}
                  onFocusChange={setInputFocused}
                />
              </div>

              <div className={`aw-suggests${isPanel ? ' is-panel' : ''}`}>
                {SUGGESTS.map((s) => (
                  <button
                    key={s.work}
                    type="button"
                    className="aw-suggest"
                    style={{ '--tint': s.color } as React.CSSProperties}
                    onClick={() => onSuggest(s)}
                  >
                    <Icon name={s.icon} size={14} className="aw-suggest-icon" />
                    <span className="aw-suggest-body">
                      <span className="aw-suggest-label">{s.label}</span>
                      <span className="aw-suggest-desc">{s.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <AiMessageView
              messages={messages}
              thinking={thinking}
              streaming={streaming}
              modelLabel={chat.activeModelInfo?.label ?? ''}
              lastAssistantId={lastAssistantId}
              onToggleThinking={chat.toggleThinking}
              onRegenerate={chat.regenerate}
            />
          )}
        </div>
      </div>

      {showScrollBtn && (
        <button
          type="button"
          className={`aw-scroll-btn${isPanel ? ' is-panel' : ''}`}
          aria-label="回到底部"
          onClick={() => scrollToBottom(true)}
        >
          <Icon name="chevron-down" size={14} />
        </button>
      )}

      {messages.length > 0 && (
        <div className={`aw-input-area${isPanel ? ' is-panel' : ''}`}>
          <AiInputBar
            streaming={!!streaming}
            onSend={onSend}
            onStop={chat.stopStreaming}
            onFocusChange={setInputFocused}
          />
          {!isPanel && <p className="aw-disclaimer">内容由 AI 生成，请仔细甄别</p>}
        </div>
      )}
    </div>
  )
}
