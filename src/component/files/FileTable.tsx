/**
 * FileTable：统一文件列表（React 版）
 * - 多格式图标 + 标签 chips + 注释摘要；选中高亮（多选支持）
 * - 选择：普通点击单选；Ctrl/Cmd 点击切换；Shift 点击范围（修饰键由父级处理）
 */
import { Icon } from '@/component/common/Icon'
import { kindMeta } from './types'
import type { ManagedFile } from './types'
import './files.css'

export interface FileTableProps {
  files: ManagedFile[]
  selectedIds: string[]
  emptyHint?: string
  onSelect: (id: string, e: React.MouseEvent) => void
}

export function FileTable({ files, selectedIds, emptyHint, onSelect }: FileTableProps) {
  return (
    <div className="ft">
      <div className="ft-head">
        <span>名称</span>
        <span>格式</span>
        <span>大小</span>
        <span>修改时间</span>
        <span>标签</span>
        <span>注释</span>
      </div>

      {files.length === 0 && (
        <div className="ft-empty">
          <Icon name="search" size={18} />
          <span>没有匹配的文件</span>
          {emptyHint && <span className="ft-empty-hint">{emptyHint}</span>}
        </div>
      )}

      {files.map((f) => {
        const meta = kindMeta(f.kind)
        return (
          <button
            key={f.id}
            type="button"
            className={`ft-row${selectedIds.includes(f.id) ? ' is-on' : ''}`}
            onClick={(e) => onSelect(f.id, e)}
          >
            <span className="ft-name">
              <span
                className="ft-icon"
                style={{ '--tint': meta.color } as React.CSSProperties}
              >
                <Icon name={meta.icon} size={14} />
              </span>
              <span className="ft-name-text">{f.name}</span>
              {f.encrypted && <Icon name="lock" size={11} className="ft-lock" />}
            </span>

            <span className="ft-kind">{meta.label}</span>
            <span className="ft-size">{f.size}</span>
            <span className="ft-time">{f.modified}</span>

            <span className="ft-tags">
              {f.tags.slice(0, 2).map((t) => (
                <span key={t} className="ft-tag">
                  {t}
                </span>
              ))}
              {f.tags.length > 2 && <span className="ft-tag-more">+{f.tags.length - 2}</span>}
            </span>

            <span className={`ft-note${f.note ? '' : ' is-empty'}`}>{f.note || '—'}</span>
          </button>
        )
      })}
    </div>
  )
}
