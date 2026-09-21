/**
 * AiMessageView：消息流渲染（React 版，DeepSeek Harness 风格）
 * - 思考过程折叠块（默认收起；text 为空 = 思考中动画点）
 * - 用户消息右对齐浅色卡片；助手消息左对齐面板卡片（平铺）
 * - 流式打字机光标；悬停操作：复制 / 重新生成（仅最后一条）
 */
import { useState } from 'react'
import { Icon } from '@/component/common/Icon'
import { renderMessage } from './render'
import type { AiMessage } from '@/hooks/useAiChat'
import { workByKind } from '@/hooks/useAiChat'
import './ai.css'

export interface AiMessageViewProps {
  messages: AiMessage[]
  thinking: { open: boolean; text: string } | null
  streaming: { messageId: number; length: number } | null
  modelLabel: string
  lastAssistantId: number | null
  onToggleThinking: () => void
  onRegenerate: () => void
}

export function AiMessageView({
  messages,
  thinking,
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
      {thinking && (
        <div className="ai-think">
          <button type="button" className="ai-think-head" onClick={onToggleThinking}>
            <Icon
              name="chevron-right"
              size={12}
              className={`ai-think-arrow${thinking.open ? ' is-open' : ''}`}
            />
            <span className="ai-think-title">思考过程</span>
            <span className="ai-think-model">{modelLabel}</span>
            {!thinking.text && (
              <span className="ai-typing">
                <i />
                <i />
                <i />
              </span>
            )}
          </button>
          {thinking.open && thinking.text && <div className="ai-think-body">{thinking.text}</div>}
        </div>
      )}

      {messages.map((m) => {
        const work = workByKind(m.work)
        const isStreaming = !!streaming && streaming.messageId === m.id
        return (
          <div key={m.id} className={`ai-msg is-${m.role}`}>
            <div className="ai-msg-head">
              <Icon name={m.role === 'user' ? 'user' : 'sparkles'} size={11} className="ai-msg-role-icon" />
              <span className="ai-msg-role">{m.role === 'user' ? '你' : modelLabel}</span>
              {work && (
                <span className="ai-work-tag" style={{ '--tint': work.color } as React.CSSProperties}>
                  {work.label}
                </span>
              )}
              <span className="ai-msg-time">{m.time}</span>
            </div>

            {m.role === 'assistant' ? (
              <div
                className="ai-msg-markdown"
                onClick={onMarkdownClick}
                dangerouslySetInnerHTML={{ __html: renderMessage(m.text) }}
              />
            ) : (
              <p className="ai-msg-text">{m.text}</p>
            )}

            {isStreaming && <span className="ai-caret" />}

            {m.role === 'assistant' && !isStreaming && (
              <div className="ai-msg-actions">
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
