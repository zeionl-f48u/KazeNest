/**
 * AiMessageView：消息流渲染（React 版，DeepSeek Harness / opencode 风格）
 * - 每条助手回复自带思考块（位于回复正文上方）：
 *   思考中 → 展开、步骤流式写入、头部「思考中…」+ 打字点
 *   完成后 → 「已深度思考（用时 N 秒）」并自动折叠，可手动展开
 * - 用户消息右对齐浅色卡片；助手消息左对齐面板卡片（平铺）
 * - 流式打字机光标；悬停操作：表情 / 复制 / 重新生成（仅最后一条）
 */
import { useState } from 'react'
import { Icon } from '@/component/common/Icon'
import TaskList from '@/component/ui/task-list'
import MatrixOrb from '@/component/ui/matrix-orb'
import EmojiReaction from '@/component/ui/emoji-reaction'
import { renderMessage } from './render'
import type { AiMessage } from '@/hooks/useAiChat'
import { workByKind } from '@/hooks/useAiChat'
import './ai.css'

export interface AiMessageViewProps {
  messages: AiMessage[]
  /** 思考阶段流式状态（messageId = 正在思考的消息） */
  thinkingStream: { messageId: number; length: number } | null
  /** 答案阶段流式状态 */
  streaming: { messageId: number; length: number } | null
  modelLabel: string
  lastAssistantId: number | null
  onToggleThinking: (messageId: number) => void
  onRegenerate: () => void
}

export function AiMessageView({
  messages,
  thinkingStream,
  streaming,
  modelLabel,
  lastAssistantId,
  onToggleThinking,
  onRegenerate,
}: AiMessageViewProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const copyMessage = (m: AiMessage) => {
    void navigator.clipboard?.writeText(m.text).then(() => {
      setCopiedId(m.id)
      window.setTimeout(() => setCopiedId((cur) => (cur === m.id ? null : cur)), 1200)
    })
  }

  /** 代码块复制按钮（render.ts 输出 data-copy 与 .ai-code-copy 类） */
  const onMarkdownClick = (e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('.ai-code-copy') as HTMLButtonElement | null
    if (!btn) return
    const code = btn.dataset.copy ?? ''
    void navigator.clipboard?.writeText(code).then(() => {
      const label = btn.textContent
      btn.textContent = '已复制'
      window.setTimeout(() => {
        btn.textContent = label
      }, 1200)
    })
  }

  return (
    <>
      {messages.map((m) => {
        const work = workByKind(m.work)
        const isStreaming = !!streaming && streaming.messageId === m.id
        const isThinking = !!thinkingStream && thinkingStream.messageId === m.id
        const hasThinking = m.role === 'assistant' && m.thinking !== undefined
        const thinkOpen = hasThinking && (isThinking || (m.thinkingOpen ?? false))
        const steps = hasThinking
          ? (m.thinking ?? '')
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
          : []

        return (
          <div key={m.id} className={`ai-msg is-${m.role}`}>
            <div className="ai-msg-head">
              {m.role === 'assistant' && (isThinking || isStreaming) ? (
                /* Rare UI MatrixOrb：思考/生成中的 AI 形象 */
                <MatrixOrb size={16} state="thinking" className="ai-orb ai-msg-orb" />
              ) : (
                <Icon name={m.role === 'user' ? 'user' : 'sparkles'} size={11} className="ai-msg-role-icon" />
              )}
              <span className="ai-msg-role">{m.role === 'user' ? '你' : modelLabel}</span>
              {work && (
                <span className="ai-work-tag" style={{ '--tint': work.color } as React.CSSProperties}>
                  {work.label}
                </span>
              )}
              <span className="ai-msg-time">{m.time}</span>
            </div>

            {m.role === 'assistant' ? (
              <>
                {hasThinking && (
                  <div className={`ai-think${thinkOpen ? ' is-open' : ''}`}>
                    <button
                      type="button"
                      className="ai-think-head"
                      aria-expanded={thinkOpen}
                      onClick={() => onToggleThinking(m.id)}
                    >
                      <Icon
                        name="chevron-right"
                        size={12}
                        className={`ai-think-arrow${thinkOpen ? ' is-open' : ''}`}
                      />
                      <span className="ai-think-title">
                        {isThinking
                          ? '思考中'
                          : m.thinkingMs
                            ? `已深度思考（用时 ${Math.max(1, Math.round(m.thinkingMs / 1000))} 秒）`
                            : '思考过程'}
                      </span>
                      {isThinking && (
                        <span className="ai-typing">
                          <i />
                          <i />
                          <i />
                        </span>
                      )}
                    </button>
                    <div className="ai-think-body">
                      <div className="ai-think-inner">
                        {steps.length > 0 && (
                          <TaskList
                            className="ai-think-tasks"
                            size="sm"
                            accent="var(--kn-brand-500)"
                            tasks={steps.map((label, i) => ({
                              id: `think-${m.id}-${i}`,
                              label,
                              done: isThinking ? i < steps.length - 1 : true,
                            }))}
                            onTasksChange={() => {}}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {m.text ? (
                  <div
                    className="ai-msg-markdown"
                    onClick={onMarkdownClick}
                    dangerouslySetInnerHTML={{ __html: renderMessage(m.text) }}
                  />
                ) : (
                  !isStreaming &&
                  !isThinking &&
                  hasThinking && <p className="ai-msg-stopped">已停止生成</p>
                )}
              </>
            ) : (
              <p className="ai-msg-text">{m.text}</p>
            )}

            {isStreaming && <span className="ai-caret" />}

            {m.role === 'assistant' && !isStreaming && !isThinking && (
              <div className="ai-msg-actions">
                <EmojiReaction size="sm" onReact={() => {}} />
                <button type="button" className="ai-act" aria-label="复制" onClick={() => copyMessage(m)}>
                  <Icon name={copiedId === m.id ? 'check' : 'copy'} size={12} />
                </button>
                {m.id === lastAssistantId && (
                  <button type="button" className="ai-act" aria-label="重新生成" onClick={onRegenerate}>
                    <Icon name="refresh" size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
