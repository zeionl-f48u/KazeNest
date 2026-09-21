/**
 * Editor：编辑器页（React 版）
 * - 标签页（EditorTabs）→ 代码区（CodeView）→ 状态栏（StatusBar）
 * - 文件数据来自 data/editorFiles（后续接 Tauri 文件系统）
 * - 编辑联动：CodeView 变更 → 更新内容 + 标记未保存；Ctrl+S 清除标记
 * - 会话持久化：标签 / 内容 / 未保存标记（useAppSession）
 */
import { useCallback, useEffect, useState } from 'react'
import { EditorTabs } from '@/component/editor/EditorTabs'
import { CodeView } from '@/component/editor/CodeView'
import { StatusBar } from '@/component/editor/StatusBar'
import { editorFiles } from '@/data/editorFiles'
import type { EditorFile } from '@/data/editorFiles'
import { addRecentFile } from '@/utils'
import { useAppSession } from '@/hooks/useAppSession'
import '@/component/editor/tokens.css'
import '@/component/editor/editor.css'

/** 无标签时的兜底空文件（CodeView 有"空文件"空态） */
const EMPTY_FILE: EditorFile = {
  id: '',
  name: '未打开文件',
  language: '',
  icon: 'file',
  content: '',
}

export function Editor() {
  const [openFiles, setOpenFiles] = useState<EditorFile[]>(() => [...editorFiles])
  const [activeFileId, setActiveFileId] = useState(editorFiles[0]?.id ?? '')
  const [cursor, setCursor] = useState({ line: 1, col: 1, selected: 0 })
  const [sessionReady, setSessionReady] = useState(false)

  const { restore, update } = useAppSession()

  /* ==================== 会话恢复 ==================== */

  useEffect(() => {
    let cancelled = false
    void restore().then((saved) => {
      if (cancelled) return
      const ed = saved?.editor
      if (ed?.initialized) {
        const byId = new Map(editorFiles.map((f) => [f.id, f]))
        const files = ed.openFileIds
          .map((id) => byId.get(id))
          .filter((f): f is EditorFile => Boolean(f))
          .map((f) => ({
            ...f,
            content: ed.contents[f.id] ?? f.content,
            modified: ed.modifiedIds.includes(f.id),
          }))
        setOpenFiles(files)
        setActiveFileId(
          files.some((f) => f.id === ed.activeFileId) ? ed.activeFileId : (files[0]?.id ?? '')
        )
      }
      setSessionReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [restore])

  /* 标签 / 内容 / 未保存标记变化 → 写回快照防抖落盘 */
  useEffect(() => {
    if (!sessionReady) return
    update((s) => {
      s.editor = {
        initialized: true,
        openFileIds: openFiles.map((f) => f.id),
        activeFileId,
        contents: Object.fromEntries(openFiles.map((f) => [f.id, f.content])),
        modifiedIds: openFiles.filter((f) => f.modified).map((f) => f.id),
      }
    })
  }, [openFiles, activeFileId, sessionReady, update])

  /* ==================== 编辑联动 ==================== */

  const activeFile =
    openFiles.find((f) => f.id === activeFileId) ?? openFiles[0] ?? EMPTY_FILE

  const onContentUpdate = useCallback(
    (content: string) => {
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.id === activeFile.id && f.content !== content ? { ...f, content, modified: true } : f
        )
      )
    },
    [activeFile.id]
  )

  const onCursor = useCallback((pos: { line: number; col: number; selected: number }) => {
    setCursor(pos)
  }, [])

  /** Ctrl+S：保存当前文件（演示版仅清除未保存标记） */
  const onSave = useCallback(() => {
    setOpenFiles((prev) => prev.map((f) => (f.id === activeFile.id && f.modified ? { ...f, modified: false } : f)))
  }, [activeFile.id])

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        onSave()
      }
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [onSave])

  /* ==================== 标签操作 ==================== */

  const onTabSelect = (id: string) => {
    if (id === activeFileId) return
    setActiveFileId(id)
    const f = openFiles.find((x) => x.id === id)
    if (f) void addRecentFile({ name: f.id, icon: f.icon, color: f.color, timestamp: Date.now() })
  }

  const onCloseTab = (id: string) => {
    const idx = openFiles.findIndex((f) => f.id === id)
    if (idx === -1) return
    const next = openFiles.slice()
    const closedActive = next[idx].id === activeFileId
    next.splice(idx, 1)
    if (closedActive) {
      const neighbor = next[idx] ?? next[idx - 1]
      setActiveFileId(neighbor?.id ?? '')
    }
    setOpenFiles(next)
  }

  const onReorder = ({ from, to }: { from: number; to: number }) => {
    setOpenFiles((prev) => {
      const arr = prev.slice()
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
  }

  const onCloseOthers = () => {
    if (activeFileId) setOpenFiles((prev) => prev.filter((f) => f.id === activeFileId))
  }

  const onCloseAll = () => {
    setOpenFiles([])
    setActiveFileId('')
  }

  const onCloseSaved = () => {
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.modified || f.id === activeFileId)
      if (!next.some((f) => f.id === activeFileId)) setActiveFileId(next[0]?.id ?? '')
      return next
    })
  }

  return (
    <div className="editor-page">
      <EditorTabs
        files={openFiles}
        activeId={activeFileId}
        onSelect={onTabSelect}
        onClose={onCloseTab}
        onCloseOthers={onCloseOthers}
        onCloseAll={onCloseAll}
        onCloseSaved={onCloseSaved}
        onReorder={onReorder}
      />

      <CodeView file={activeFile} onUpdate={onContentUpdate} onCursor={onCursor} />

      <StatusBar file={activeFile} line={cursor.line} col={cursor.col} selected={cursor.selected} />
    </div>
  )
}
