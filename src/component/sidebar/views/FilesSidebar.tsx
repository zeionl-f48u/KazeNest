/**
 * FilesSidebar：文件管理侧栏（React 版，与页面目录同步）
 * - 「文件夹」模式目录树与页面共享同一份状态（useFileManager）
 * - 空间入口：文件夹 / 资料空间 / 私有空间
 * - 未打开文件夹时显示"打开文件夹…"入口
 */
import { useMemo, useState } from 'react'
import { SidebarSection, SidebarRow } from './SidebarRow'
import { SideBarTree } from '../SideBarTree'
import type { TreeItem } from '../types'
import { useFileManager } from '@/hooks/useFileManager'
import type { FolderNode } from '@/component/files/types'
import './view-sidebar.css'

function toTreeItems(nodes: FolderNode[]): TreeItem[] {
  return nodes.map((n) => ({
    id: n.id,
    label: n.name,
    icon: n.children?.length ? undefined : 'folder',
    children: n.children?.length ? toTreeItems(n.children) : undefined,
  }))
}

export function FilesSidebar() {
  const fm = useFileManager()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const folderItems = useMemo(() => toTreeItems(fm.folders), [fm.folders, fm])

  const pickAll = () => {
    fm.setSpace('folder')
    fm.selectFolder('')
  }

  const onOpenFolder = () => {
    fm.setSpace('folder')
    fm.openFolder()
  }

  const onNode = (item: TreeItem) => {
    fm.setSpace('folder')
    fm.selectFolder(item.id)
  }

  return (
    <div className="vs">
      <SidebarSection title="目录" icon="folder">
        {fm.folderOpened ? (
          <>
            <SidebarRow
              icon="th-large"
              selected={fm.space === 'folder' && !fm.activeFolderId}
              onClick={pickAll}
              meta={<span className="vs-meta">{fm.folderFiles.length}</span>}
            >
              全部文件
            </SidebarRow>
            <SideBarTree
              nodes={folderItems}
              selected={fm.space === 'folder' ? fm.activeFolderId : ''}
              collapsed={collapsed}
              onSelect={onNode}
              onToggle={(id) =>
                setCollapsed((prev) => {
                  const next = new Set(prev)
                  if (next.has(id)) next.delete(id)
                  else next.add(id)
                  return next
                })
              }
            />
          </>
        ) : (
          <>
            <SidebarRow icon="folder-open" color="var(--kn-sky-500)" onClick={onOpenFolder}>
              打开文件夹…
            </SidebarRow>
            <div className="vs-empty">未打开本地文件夹</div>
          </>
        )}
      </SidebarSection>

      <div className="vs-sep" />

      <SidebarSection title="空间" icon="shield">
        <SidebarRow
          icon="folder"
          color="var(--kn-sky-500)"
          selected={fm.space === 'folder'}
          onClick={() => fm.setSpace('folder')}
        >
          文件夹
        </SidebarRow>
        <SidebarRow
          icon="tag"
          color="var(--kn-brand-500)"
          selected={fm.space === 'library'}
          onClick={() => fm.setSpace('library')}
          meta={<span className="vs-meta">{fm.libraryFiles.length}</span>}
        >
          资料空间
        </SidebarRow>
        <SidebarRow
          icon="lock"
          color="var(--kn-amber-500)"
          selected={fm.space === 'private'}
          onClick={() => fm.setSpace('private')}
          meta={<span className="vs-meta">加密</span>}
        >
          私有空间
        </SidebarRow>
      </SidebarSection>
    </div>
  )
}
