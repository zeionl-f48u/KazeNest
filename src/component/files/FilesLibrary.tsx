/**
 * FilesLibrary：资料空间（React 版）
 * - 统一搜索（#类型 @标签 可叠加）+ 标签多选筛选（须含全部选中标签）
 * - 列表 + 详情（标签 / 注释 / AI 批注）；单选
 */
import { useMemo, useRef, useState } from 'react'
import { Icon } from '@/component/common/Icon'
import { FileTable } from './FileTable'
import { FileDetail } from './FileDetail'
import { useFileManager } from '@/hooks/useFileManager'
import { parseQuery, matchFile } from '@/utils/fileSearch'
import { showDemo } from '@/utils'
import './files.css'

export function FilesLibrary() {
  const fm = useFileManager()
  const [query, setQuery] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const importTimer = useRef<number | undefined>(undefined)

  const parsed = useMemo(() => parseQuery(query), [query])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const f of fm.libraryFiles) for (const t of f.tags) set.add(t)
    return [...set]
  }, [fm.libraryFiles, fm])

  const filtered = useMemo(
    () => fm.libraryFiles.filter((f) => matchFile(f, parsed, activeTags)),
    [fm.libraryFiles, parsed, activeTags, fm]
  )

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const single = fm.selectedIds.length === 1 ? (filtered.find((f) => f.id === fm.selectedIds[0]) ?? fm.libraryFiles.find((f) => f.id === fm.selectedIds[0]) ?? null) : null

  const onImport = () => {
    setImporting(true)
    showDemo({ title: '导入文件', desc: '演示模式：暂未接入实际文件系统', icon: 'upload' })
    window.clearTimeout(importTimer.current)
    importTimer.current = window.setTimeout(() => setImporting(false), 900)
  }

  return (
    <>
      <div className="fm-tools">
        <div className="fm-search">
          <Icon name="search" size={14} className="fm-search-icon" />
          <input
            className="fm-search-input"
            placeholder="搜索名称 / 注释，支持 #类型 @标签"
            title="示例：报告 #docx @报表（# 可搜扩展名/类别，条件可叠加）"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="fm-search-x" aria-label="清空搜索" onClick={() => setQuery('')}>
              <Icon name="times" size={11} />
            </button>
          )}
        </div>
        <button type="button" className="fm-btn is-primary" title="演示：暂未接入实际文件系统" onClick={onImport}>
          <Icon name="upload" size={13} />
          {importing ? '演示：未接入' : '导入文件'}
        </button>
      </div>

      <div className="fm-tagbar">
        <button
          type="button"
          className={`fm-tagchip${activeTags.length === 0 ? ' is-on' : ''}`}
          onClick={() => setActiveTags([])}
        >
          全部
        </button>
        {allTags.map((t) => (
          <button
            key={t}
            type="button"
            className={`fm-tagchip${activeTags.includes(t) ? ' is-on' : ''}`}
            onClick={() => toggleTag(t)}
          >
            {t}
          </button>
        ))}
        {activeTags.length > 0 && (
          <span className="fm-tagbar-hint">
            <Icon name="check" size={10} />
            文件需含全部 {activeTags.length} 个选中标签
          </span>
        )}
      </div>

      <div className="fm-body">
        <div className="fm-main">
          <div className="fm-crumbs">
            <span className="fm-crumb is-static">
              <Icon name="tag" size={12} /> 资料空间
            </span>
            <span className="fm-crumbs-count">{filtered.length} 个文件</span>
          </div>
          <FileTable
            files={filtered}
            selectedIds={fm.selectedIds}
            emptyHint="试试 #类型（如 #docx）或 @标签（如 @报表）组合筛选"
            onSelect={(id) => fm.setSelection([id])}
          />
        </div>

        {single && (
          <FileDetail
            file={single}
            availableTags={allTags}
            onClose={fm.clearSelection}
            onUpdateTags={(tags) => {
              single.tags = tags
              fm.setSelection([single.id])
            }}
            onUpdateNote={(note) => {
              single.note = note
              fm.setSelection([single.id])
            }}
          />
        )}
      </div>
    </>
  )
}
