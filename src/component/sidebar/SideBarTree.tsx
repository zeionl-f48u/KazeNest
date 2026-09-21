/**
 * SideBarTree：资源管理器树（React 递归渲染）
 * - 文件夹：chevron + 文件夹图标（展开/折叠）
 * - 文件：缩进 + 图标 + 右侧 meta
 * - 选中行：左侧品牌色指示条 + 高亮
 */
import { Icon } from '../common/Icon'
import { cn } from '@/lib/utils'
import type { TreeItem } from './types'

export interface SideBarTreeProps {
  nodes: TreeItem[]
  /** 当前深度（缩进用，内部递归自增） */
  depth?: number
  /** 选中项 id */
  selected?: string
  /** 已折叠节点集合（父级持有） */
  collapsed?: Set<string>
  onSelect: (item: TreeItem) => void
  onToggle?: (id: string) => void
}

export function SideBarTree({
  nodes,
  depth = 0,
  selected = '',
  collapsed,
  onSelect,
  onToggle,
}: SideBarTreeProps) {
  const isFolder = (node: TreeItem) => !!node.children?.length
  const isCollapsed = (node: TreeItem) =>
    collapsed?.has(node.id) ?? node.collapsed === true

  const nodeIcon = (node: TreeItem): string => {
    if (node.icon) return node.icon
    if (isFolder(node)) return isCollapsed(node) ? 'folder' : 'folder-open'
    return 'file'
  }

  return (
    <div className="sbt" role="tree">
      {nodes.map((node) => (
        <div key={node.id}>
          <button
            type="button"
            role="treeitem"
            aria-selected={selected === node.id}
            className={cn('sbt-row', isFolder(node) && 'is-folder', selected === node.id && 'is-selected')}
            style={{ paddingLeft: `calc(2px + ${depth} * var(--sb-tree-indent))` }}
            onClick={() => {
              if (isFolder(node)) onToggle?.(node.id)
              onSelect(node)
            }}
          >
            {isFolder(node) ? (
              <Icon
                name={isCollapsed(node) ? 'chevron-right' : 'chevron-down'}
                size={10}
                className="sbt-chevron"
              />
            ) : (
              <span className="sbt-chevron-spacer" aria-hidden="true" />
            )}
            <Icon
              name={nodeIcon(node)}
              size={14}
              className="sbt-icon"
              style={node.color ? { color: node.color } : undefined}
            />
            <span className="sbt-label">{node.label}</span>
            {node.meta && <span className="sbt-meta">{node.meta}</span>}
          </button>

          {isFolder(node) && !isCollapsed(node) && (
            <SideBarTree
              nodes={node.children!}
              depth={depth + 1}
              selected={selected}
              collapsed={collapsed}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          )}
        </div>
      ))}
    </div>
  )
}
