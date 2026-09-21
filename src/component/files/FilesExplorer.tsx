/**
 * FilesExplorer：文件夹模式（资源管理器）—— React 版
 * - 未打开：打开文件夹空态（打开按钮 + 最近打开）
 * - 已打开：面包屑 + 搜索（当前目录及子目录）+ 更换/新建文件夹
 * - 三栏：目录树 / 文件列表（Ctrl 切换 + Shift 范围多选）/ 详情或批量面板
 * - 批量「添加到资料空间 / 私有空间」（复制语义 + 反馈）
 */
import { useMemo, useRef, useState } from 'react'
import { Icon } from '@/component/common/Icon'
import { FileTable } from './FileTable'
import { FileDetail } from './FileDetail'
import { Button } from '@/component/ui/button'
import FolderComponent from '@/component/ui/folder-component'
import { kindMeta } from './types'
import type { FolderNode, ManagedFile } from './types'
import { SideBarTree } from '@/component/sidebar/SideBarTree'
import type { TreeItem } from '@/component/sidebar/types'
import { useFileManager } from '@/hooks/useFileManager'
import { parseQuery, matchFile } from '@/utils/fileSearch'
import './files.css'

const RECENT_FOLDERS = [
  { name: 'KazeNest', path: 'D:\\Projects\\KazeNest' },
  { name: 'Documents', path: 'C:\\Users\\Zeionl\\Documents' },
]

function toTreeItems(nodes: FolderNode[]): TreeItem[] {
  return nodes.map((n) => ({
    id: n.id,
    label: n.name,
    icon: n.children?.length ? undefined : 'folder',
    children: n.children?.length ? toTreeItems(n.children) : undefined,
  }))
}

export function FilesExplorer() {
  const fm = useFileManager()
  const [folderQuery, setFolderQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [batchMsg, setBatchMsg] = useState('')
  const batchTimer = useRef<number | undefined>(undefined)
  const lastAnchor = useRef('')

  const folderItems = useMemo(() => toTreeItems(fm.folders), [fm.folders, fm])

  /* 目录范围 + 搜索 */
  const scope = useMemo(
    () => (fm.activeFolderId ? fm.folderScopeIds(fm.activeFolderId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fm.activeFolderId, fm.folders, fm]
  )
  const parsed = useMemo(() => parseQuery(folderQuery), [folderQuery])

  const filtered = useMemo(
    () =>
      fm.folderFiles.filter((f) => {
        if (scope && !(f.folderId && scope.has(f.folderId))) return false
        return matchFile(f, parsed, [])
      }),
    [fm.folderFiles, scope, parsed, fm]
  )

  const order = filtered.map((f) => f.id)

  const onSelect = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastAnchor.current && order.includes(lastAnchor.current)) {
      const a = order.indexOf(lastAnchor.current)
      const b = order.indexOf(id)
      fm.setSelection(order.slice(Math.min(a, b), Math.max(a, b) + 1))
    } else if (e.ctrlKey || e.metaKey) {
      fm.toggleSelection(id)
    } else {
      fm.setSelection([id])
    }
    lastAnchor.current = id
  }

  const batchAdd = (target: 'library' | 'private') => {
    const { added, skipped } = fm.addSelectionTo(target)
    const name = target === 'library' ? '资料空间' : '私有空间'
    setBatchMsg(`已添加 ${added} 项到${name}${skipped ? `（${skipped} 项已存在，跳过）` : ''}`)
    window.clearTimeout(batchTimer.current)
    batchTimer.current = window.setTimeout(() => setBatchMsg(''), 2600)
  }

  const single: ManagedFile | null =
    fm.selectedIds.length === 1
      ? (fm.folderFiles.find((f) => f.id === fm.selectedIds[0]) ?? null)
      : null

  const selectedFiles = fm.folderFiles.filter((f) => fm.selectedIds.includes(f.id))

  const folderAvailableTags = useMemo(() => {
    const set = new Set<string>()
    for (const f of fm.folderFiles) for (const t of f.tags) set.add(t)
    return [...set]
  }, [fm.folderFiles, fm])

  /* ==================== 未打开文件夹：空态 ==================== */

  if (!fm.folderOpened) {
    return (
      <div className="fm-open">
        <div className="fm-open-card">
          {/* Rare UI 文件夹动画：悬停/点击可开合 */}
          <div className="fm-open-folder">
            <FolderComponent size="sm" color="blue" />
          </div>
          <h2 className="fm-open-title">打开本地文件夹</h2>
          <p className="fm-open-desc">
            像资源管理器一样浏览本地文件：多选后可添加到资料空间或私有空间统一管理
          </p>

          <Button variant="primary" className="fm-open-btn" disabled={fm.opening} onClick={() => fm.openFolder()}>
            <Icon name="folder-open" size={14} />
            {fm.opening ? '正在打开…' : '打开文件夹'}
          </Button>

          <div className="fm-open-recent">
            <div className="fm-open-recent-title">最近打开</div>
            {RECENT_FOLDERS.map((r) => (
              <button
                key={r.path}
                type="button"
                className="fm-open-recent-item"
                disabled={fm.opening}
                onClick={() => fm.openFolder(r.name)}
              >
                <Icon name="clock" size={12} />
                <span className="fm-open-recent-path">{r.path}</span>
              </button>
            ))}
          </div>

          <p className="fm-open-hint">演示模式：打开后加载内置演示目录（接 Tauri 后读取真实文件系统）</p>
        </div>
      </div>
    )
  }

  /* ==================== 已打开：资源管理器 ==================== */

  return (
    <>
      <div className="fm-tools">
        <div className="fm-crumbs is-tools">
          <button type="button" className="fm-crumb" onClick={() => fm.selectFolder('')}>
            <Icon name="folder-open" size={12} />
            {fm.rootFolderName}
          </button>
          {fm.folderPath(fm.activeFolderId).map((node) => (
            <span key={node.id} style={{ display: 'contents' }}>
              <Icon name="chevron-right" size={10} className="fm-crumb-sep" />
              <button type="button" className="fm-crumb" onClick={() => fm.selectFolder(node.id)}>
                {node.name}
              </button>
            </span>
          ))}
          <span className="fm-crumbs-count">{filtered.length} 个文件</span>
        </div>

        <div className="fm-search is-folder">
          <Icon name="search" size={14} className="fm-search-icon" />
          <input
            className="fm-search-input"
            placeholder="搜索文件，支持 #类型"
            title="示例：报表 #xlsx（搜索当前目录及子目录）"
            spellCheck={false}
            value={folderQuery}
            onChange={(e) => setFolderQuery(e.target.value)}
          />
          {folderQuery && (
            <button type="button" className="fm-search-x" aria-label="清空搜索" onClick={() => setFolderQuery('')}>
              <Icon name="times" size={11} />
            </button>
          )}
        </div>

        <button type="button" className="fm-btn" title="关闭当前文件夹，重新选择" onClick={fm.closeFolder}>
          <Icon name="folder-open" size={13} />
          更换文件夹
        </button>
        <button type="button" className="fm-btn" title="演示：新建文件夹" onClick={() => fm.addFolder(fm.activeFolderId)}>
          <Icon name="plus" size={13} />
          新建文件夹
        </button>
      </div>

      <div className="fm-body">
        <aside className="fm-folders">
          <div className="fm-folders-head">
            <span>目录</span>
          </div>
          <button
            type="button"
            className={`fm-folder-row${!fm.activeFolderId ? ' is-on' : ''}`}
            onClick={() => fm.selectFolder('')}
          >
            <Icon name="th-large" size={13} className="fm-folder-icon" />
            <span className="fm-folder-name">全部文件</span>
            <span className="fm-folder-count">{fm.folderFiles.length}</span>
          </button>

          <SideBarTree
            nodes={folderItems}
            selected={fm.activeFolderId}
            collapsed={collapsed}
            onSelect={(item) => fm.selectFolder(item.id)}
            onToggle={(id) =>
              setCollapsed((prev) => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }
          />

          <div className="fm-folders-sep" />
          <button type="button" className="fm-folder-row is-private" onClick={() => fm.setSpace('private')}>
            <Icon name="lock" size={13} className="fm-folder-icon" />
            <span className="fm-folder-name">私有空间</span>
            <span className="fm-folder-count">{fm.privateFiles.length}</span>
          </button>
        </aside>

        <div className="fm-main">
          <FileTable
            files={filtered}
            selectedIds={fm.selectedIds}
            emptyHint={folderQuery.trim() ? '试试 #类型（如 #docx）或调整关键词' : '该目录下暂无文件'}
            onSelect={onSelect}
          />
        </div>

        {single && (
          <FileDetail
            file={single}
            availableTags={folderAvailableTags}
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

        {!single && fm.selectedIds.length > 1 && (
          <aside className="fm-multi">
            <div className="fm-multi-head">
              <span>已选 {fm.selectedIds.length} 项</span>
              <div className="fm-multi-head-actions">
                <button type="button" className="fm-link" onClick={() => fm.setSelection(order)}>
                  全选
                </button>
                <button type="button" className="fm-link" onClick={fm.clearSelection}>
                  清除
                </button>
              </div>
            </div>

            <div className="fm-multi-list">
              {selectedFiles.map((f) => (
                <div key={f.id} className="fm-multi-item">
                  <Icon name={kindMeta(f.kind).icon} size={12} color={kindMeta(f.kind).color} />
                  <span className="fm-multi-name">{f.name}</span>
                </div>
              ))}
            </div>

            <Button variant="primary" className="fm-multi-btn" onClick={() => batchAdd('library')}>
              <Icon name="tag" size={13} />
              添加到资料空间
            </Button>
            <Button className="fm-multi-btn" onClick={() => batchAdd('private')}>
              <Icon name="lock" size={13} />
              添加到私有空间
            </Button>

            {batchMsg ? (
              <p className="fm-multi-hint is-ok">{batchMsg}</p>
            ) : (
              <p className="fm-multi-hint">"添加"为复制语义：原文件保留在文件夹中</p>
            )}
          </aside>
        )}
      </div>
    </>
  )
}
