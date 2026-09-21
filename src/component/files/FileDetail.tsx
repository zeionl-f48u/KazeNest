/**
 * FileDetail：文件详情面板（React 版）
 * - 预览占位（按格式）：图片渐变 / 视频播放器 / 音频波形 / 代码 / 表格 / 幻灯片 / 文档 / 压缩包
 * - 标签编辑：chips 删除 + 输入新增 + 「选择已有标签」下拉
 * - 注释编辑（即时写回）+ AI 一键批注（演示模拟）
 */
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/component/common/Icon'
import { kindMeta } from './types'
import type { ManagedFile } from './types'
import './files.css'

export interface FileDetailProps {
  file: ManagedFile
  /** 当前空间已有标签集合（供"选择已有标签"下拉） */
  availableTags: string[]
  onClose: () => void
  onUpdateTags: (tags: string[]) => void
  onUpdateNote: (note: string) => void
}

export function FileDetail({
  file,
  availableTags,
  onClose,
  onUpdateTags,
  onUpdateNote,
}: FileDetailProps) {
  const meta = kindMeta(file.kind)

  /* ==================== 标签编辑 ==================== */

  const [tagDraft, setTagDraft] = useState('')

  const addTag = () => {
    const t = tagDraft.trim()
    if (!t || file.tags.includes(t)) {
      setTagDraft('')
      return
    }
    onUpdateTags([...file.tags, t])
    setTagDraft('')
  }

  const removeTag = (tag: string) => onUpdateTags(file.tags.filter((t) => t !== tag))

  /* ==================== 选择已有标签（下拉） ==================== */

  const [tagPopOpen, setTagPopOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const selectableTags = availableTags.filter((t) => !file.tags.includes(t))

  useEffect(() => {
    if (!tagPopOpen) return
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current?.contains(e.target as Node)) return
      setTagPopOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [tagPopOpen])

  const pickTag = (tag: string) => {
    onUpdateTags([...file.tags, tag])
    setTagPopOpen(false)
  }

  /* ==================== AI 一键批注（演示） ==================== */

  const [aiBusy, setAiBusy] = useState(false)
  const aiTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(aiTimer.current), [])

  const aiAnnotate = () => {
    if (aiBusy) return
    setAiBusy(true)
    const targetId = file.id
    aiTimer.current = window.setTimeout(() => {
      setAiBusy(false)
      if (file.id !== targetId) return
      const kind = kindMeta(file.kind).label
      const parts = [`AI 批注：这是一份${kind}文件「${file.name}」`]
      if (file.tags.length) parts.push(`涉及 ${file.tags.join('、')} 等主题`)
      parts.push('建议关注内容要点与时效性，归档时补充来源与版本信息')
      onUpdateNote(`${parts.join('，')}。`)
    }, 900)
  }

  /* ==================== 预览 ==================== */

  /** 由 id 生成稳定的演示元信息（分辨率/时长/页数等；接真实文件元数据后替换） */
  const previewMeta = (() => {
    let h = 0
    for (const ch of file.id + file.name) h = (h * 31 + ch.charCodeAt(0)) % 99991
    const pad = (n: number) => String(n).padStart(2, '0')
    switch (file.kind) {
      case 'image':
        return `${[1280, 1920, 2560, 3840][h % 4]} × ${[720, 1080, 1440, 2160][(h >> 2) % 4]} · ${['PNG', 'JPEG', 'WebP'][h % 3]}`
      case 'video':
        return `${pad((h % 20) + 1)}:${pad(h % 60)} · ${[1080, 1440, 2160][h % 3]}p`
      case 'audio':
        return `${pad((h % 5) + 2)}:${pad(h % 60)} · ${[192, 256, 320][h % 3]} kbps`
      case 'code':
        return `${(h % 400) + 20} 行 · UTF-8`
      case 'doc':
      case 'pdf':
        return `${(h % 40) + 3} 页`
      case 'sheet':
        return `${(h % 6) + 1} 个工作表`
      case 'ppt':
        return `${(h % 30) + 5} 张幻灯片`
      case 'archive':
        return `${(h % 40) + 3} 个文件`
      default:
        return ''
    }
  })()

  const renderPreview = () => {
    switch (file.kind) {
      case 'image':
        return <Icon name="image" size={30} />
      case 'video':
        return (
          <span className="fd-pv-play">
            <Icon name="play" size={16} />
          </span>
        )
      case 'audio':
        return (
          <span className="fd-pv-bars">
            {Array.from({ length: 14 }, (_, i) => (
              <i key={i} style={{ height: `${8 + ((i * 13) % 26)}px` }} />
            ))}
          </span>
        )
      case 'code':
        return (
          <pre className="fd-pv-code">{`1  const theme = {
2    brand: '#6366f1',
3    radius: 8,
4  }`}</pre>
        )
      case 'sheet':
        return <span className="fd-pv-grid" />
      case 'ppt':
        return (
          <span className="fd-pv-slide">
            <i className="fd-pv-slide-title" />
            <i className="fd-pv-slide-line" />
            <i className="fd-pv-slide-line is-short" />
          </span>
        )
      case 'archive':
        return <Icon name="archive" size={28} />
      default:
        return (
          <span className="fd-pv-paper">
            {Array.from({ length: 4 }, (_, i) => (
              <i key={i} className="fd-pv-paper-line" style={{ width: `${92 - i * 14}%` }} />
            ))}
          </span>
        )
    }
  }

  return (
    <aside className="fd">
      <div className="fd-head">
        <span className="fd-icon" style={{ '--tint': meta.color } as React.CSSProperties}>
          <Icon name={meta.icon} size={18} />
        </span>
        <div className="fd-title">
          <div className="fd-name" title={file.name}>
            {file.name}
          </div>
          <div className="fd-badges">
            <span className="fd-badge">{meta.label}</span>
            {file.encrypted && (
              <span className="fd-badge is-encrypted">
                <Icon name="lock" size={9} /> 加密
              </span>
            )}
          </div>
        </div>
        <button type="button" className="fd-close" aria-label="关闭详情" onClick={onClose}>
          <Icon name="times" size={13} />
        </button>
      </div>

      <div className={`fd-preview is-${file.kind}`}>
        <span className="fd-preview-tag">预览</span>
        {renderPreview()}
        {previewMeta && <span className="fd-preview-meta">{previewMeta}</span>}
      </div>

      <div className="fd-meta">
        <div className="fd-meta-row">
          <span>大小</span>
          <span>{file.size}</span>
        </div>
        <div className="fd-meta-row">
          <span>修改时间</span>
          <span>{file.modified}</span>
        </div>
        <div className="fd-meta-row">
          <span>存储方式</span>
          <span>{file.encrypted ? '加密存储' : '普通存储'}</span>
        </div>
      </div>

      {/* 标签 */}
      <div className="fd-section">
        <div className="fd-section-title">
          <Icon name="tag" size={12} />
          <span>标签</span>
        </div>
        <div className="fd-tags">
          {file.tags.map((t) => (
            <span key={t} className="fd-tag">
              {t}
              <button type="button" className="fd-tag-x" aria-label={`移除标签 ${t}`} onClick={() => removeTag(t)}>
                <Icon name="times" size={9} />
              </button>
            </span>
          ))}
          {file.tags.length === 0 && <span className="fd-tags-empty">暂无标签</span>}
        </div>
        <div className="fd-tag-add">
          <input
            className="fd-tag-input"
            placeholder="添加标签，Enter 确认"
            spellCheck={false}
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
          />
          <button
            type="button"
            className="fd-tag-btn"
            disabled={!tagDraft.trim()}
            aria-label="添加标签"
            onClick={addTag}
          >
            <Icon name="plus" size={12} />
          </button>

          <div ref={pickerRef} className="fd-tag-picker">
            <button
              type="button"
              className={`fd-tag-btn${tagPopOpen ? ' is-on' : ''}`}
              aria-label="选择已有标签"
              title="选择已有标签"
              onClick={() => setTagPopOpen((v) => !v)}
            >
              <Icon name="tag" size={12} />
            </button>
            {tagPopOpen && (
              <div className="fd-tagpop">
                <div className="fd-tagpop-title">已有标签</div>
                {selectableTags.map((t) => (
                  <button key={t} type="button" className="fd-tagpop-item" onClick={() => pickTag(t)}>
                    <Icon name="tag" size={11} className="fd-tagpop-icon" />
                    <span>{t}</span>
                  </button>
                ))}
                {selectableTags.length === 0 && <div className="fd-tagpop-empty">暂无可选标签</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 注释 */}
      <div className="fd-section">
        <div className="fd-section-title">
          <Icon name="message-square" size={12} />
          <span>注释</span>
        </div>
        <textarea
          className="fd-note"
          rows={5}
          placeholder="写点说明，便于以后检索…"
          spellCheck={false}
          value={file.note}
          onChange={(e) => onUpdateNote(e.target.value)}
        />
        <button
          type="button"
          className="fd-ai-btn"
          disabled={aiBusy}
          title="演示：模拟 AI 生成注释"
          onClick={aiAnnotate}
        >
          <Icon name="sparkles" size={12} />
          <span>{aiBusy ? 'AI 批注生成中…' : 'AI 一键批注'}</span>
        </button>
      </div>

      <p className="fd-hint">标签与注释会被统一搜索命中（演示：即时保存在当前会话）</p>
    </aside>
  )
}
