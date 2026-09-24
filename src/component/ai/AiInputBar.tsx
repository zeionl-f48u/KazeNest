/**
 * AiInputBar：AI 输入条（React 版，一体化卡片）
 * - 卡片结构：附件芯片 + 文本编辑区 + 工具行（附件/表情/引用 → 发送/停止）
 * - 聚焦高亮、自动增高（最多 8 行）、Enter 发送 / Shift+Enter 换行
 * - 粘贴智能识别：多行内容自动包成 ```代码块``` 并猜语言
 * - 流式输出中发送键变为停止键
 */
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/component/common/Icon'
import './ai.css'

interface Attachment {
  id: number
  name: string
  size: number
}

export interface AiInputBarProps {
  placeholder?: string
  streaming?: boolean
  onSend: (payload: { text: string; attachments: string[] }) => void
  onStop: () => void
  /** 输入框聚焦变化（AI 形象 Orb 的 listening 状态） */
  onFocusChange?: (focused: boolean) => void
}

const EMOJIS = ['😊', '👍', '🎉', '🔥', '💡', '⚡', '✅', '❌', '🔍', '📝', '🎯', '🚀', '💻', '🐛', '📌', '📚']

const CONTEXT_ITEMS = [
  { id: 'file', label: '当前文件', icon: 'file', text: '@当前文件: ', hint: '插入当前打开的文件' },
  { id: 'selection', label: '选中代码', icon: 'terminal', text: '@选中代码: ', hint: '插入编辑器选中片段' },
  { id: 'workspace', label: '工作区', icon: 'workspace', text: '@工作区: ', hint: '插入工作区信息' },
]

const MAX_INPUT_H = 160

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** 按关键词猜编程语言（给粘贴的代码块加标记） */
function detectLang(text: string): string {
  if (/^\s*(#include|int main|std::)/m.test(text)) return 'cpp'
  if (/^\s*(def |class .*:|import |print\()/m.test(text)) return 'python'
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/im.test(text)) return 'sql'
  if (/^\s*(const|let|var|function|=>|import|export)/m.test(text)) return 'typescript'
  if (/<!DOCTYPE|<html|<div|<style/m.test(text)) return 'html'
  if (/^\s*[\[{]/m.test(text) && /("|\w+):/.test(text)) return 'json'
  return ''
}

export function AiInputBar({
  placeholder = '给 KazeNest 发送消息，Enter 发送，Shift+Enter 换行',
  streaming = false,
  onSend,
  onStop,
  onFocusChange,
}: AiInputBarProps) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const attachSeq = useRef(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const canSend = text.trim().length > 0 || attachments.length > 0

  const autoGrow = () => {
    const ta = inputRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, MAX_INPUT_H)}px`
  }

  const insertAtCursor = (paste: string) => {
    const ta = inputRef.current
    if (!ta) return
    const s = ta.selectionStart
    const e = ta.selectionEnd
    setText((prev) => prev.slice(0, s) + paste + prev.slice(e))
    window.setTimeout(() => {
      const pos = s + paste.length
      ta.focus()
      ta.setSelectionRange(pos, pos)
      autoGrow()
    }, 0)
  }

  const doSend = () => {
    if (!canSend) return
    const payload = { text, attachments: attachments.map((a) => a.name) }
    setText('')
    setAttachments([])
    window.setTimeout(autoGrow, 0)
    onSend(payload)
  }

  /* 点击输入条以外：关闭弹层 */
  useEffect(() => {
    if (!emojiOpen && !contextOpen) return
    const onDown = (e: MouseEvent) => {
      if (barRef.current?.contains(e.target as Node)) return
      setEmojiOpen(false)
      setContextOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [emojiOpen, contextOpen])

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const paste = e.clipboardData.getData('text/plain')
    if (!paste) return
    const trimmed = paste.trim()
    if (/^```/.test(trimmed) && /```$/.test(trimmed)) {
      e.preventDefault()
      insertAtCursor(paste)
      return
    }
    if (!trimmed.includes('\n')) return
    e.preventDefault()
    const lang = detectLang(paste)
    insertAtCursor(`\`\`\`${lang}\n${trimmed}\n\`\`\``)
  }

  return (
    <div ref={barRef} className="ai-input-bar">
      <div className={`ai-box${focused ? ' is-focus' : ''}`}>
        {attachments.length > 0 && (
          <div className="ai-attach-row">
            {attachments.map((a) => (
              <span key={a.id} className="ai-attach-chip">
                <Icon name="file" size={11} className="ai-attach-icon" />
                <span className="ai-attach-name">{a.name}</span>
                <span className="ai-attach-size">{formatSize(a.size)}</span>
                <button
                  type="button"
                  className="ai-attach-x"
                  aria-label="移除附件"
                  onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                >
                  <Icon name="times" size={9} />
                </button>
              </span>
            ))}
          </div>
        )}

        <textarea
          ref={inputRef}
          className="ai-input"
          rows={1}
          placeholder={placeholder}
          spellCheck={false}
          value={text}
          onFocus={() => {
            setFocused(true)
            onFocusChange?.(true)
          }}
          onBlur={() => {
            setFocused(false)
            onFocusChange?.(false)
          }}
          onChange={(e) => {
            setText(e.target.value)
            autoGrow()
          }}
          onInput={autoGrow}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              doSend()
            }
          }}
        />

        <div className="ai-tools">
          <button type="button" className="ai-tool-btn" aria-label="添加附件" onClick={() => fileInputRef.current?.click()}>
            <Icon name="paperclip" size={14} />
          </button>
          <button
            type="button"
            className={`ai-tool-btn${emojiOpen ? ' is-on' : ''}`}
            aria-label="表情"
            onClick={() => {
              setEmojiOpen((v) => !v)
              setContextOpen(false)
            }}
          >
            <Icon name="smile" size={14} />
          </button>
          <button
            type="button"
            className={`ai-tool-btn${contextOpen ? ' is-on' : ''}`}
            aria-label="引用上下文"
            onClick={() => {
              setContextOpen((v) => !v)
              setEmojiOpen(false)
            }}
          >
            <Icon name="at-sign" size={14} />
          </button>

          <span className="ai-tools-spacer" />

          {!streaming ? (
            <button type="button" className="ai-send" aria-label="发送" disabled={!canSend} onClick={doSend}>
              <Icon name="arrow-up" size={14} />
            </button>
          ) : (
            <button type="button" className="ai-send is-stop" aria-label="停止生成" onClick={onStop}>
              <Icon name="stop" size={13} />
            </button>
          )}
        </div>
      </div>

      {emojiOpen && (
        <div className="ai-pop" onMouseDown={(e) => e.stopPropagation()}>
          <div className="ai-pop-title">表情</div>
          <div className="ai-emoji-grid">
            {EMOJIS.map((em) => (
              <button key={em} type="button" className="ai-emoji" onClick={() => insertAtCursor(em)}>
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {contextOpen && (
        <div className="ai-pop" onMouseDown={(e) => e.stopPropagation()}>
          <div className="ai-pop-title">引用上下文</div>
          {CONTEXT_ITEMS.map((c) => (
            <button key={c.id} type="button" className="ai-ctx-item" onClick={() => insertAtCursor(c.text)}>
              <Icon name={c.icon} size={13} className="ai-ctx-icon" />
              <span className="ai-ctx-label">{c.label}</span>
              <span className="ai-ctx-hint">{c.hint}</span>
            </button>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="ai-file-input"
        onChange={(e) => {
          const files = e.target.files
          if (files) {
            const next: Attachment[] = []
            for (const f of Array.from(files)) {
              next.push({ id: ++attachSeq.current, name: f.name, size: f.size })
            }
            setAttachments((prev) => [...prev, ...next])
          }
          e.target.value = ''
        }}
      />
    </div>
  )
}
