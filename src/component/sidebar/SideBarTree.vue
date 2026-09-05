<!--
  SideBarTree：VS Code 资源管理器树（自递归）
  - 文件夹：chevron + 文件夹图标，可展开折叠
  - 文件：缩进 + 文件图标 + 右侧 meta
  - 选中行：list.activeSelectionBackground 蓝底白字
-->
<template>
  <div class="sbt" role="tree">
    <template v-for="node in nodes" :key="node.id">
      <button
        type="button"
        class="sbt-row"
        role="treeitem"
        :class="{
          'is-folder': isFolder(node),
          'is-selected': selected === node.id,
        }"
        :style="{ paddingLeft: `calc(2px + ${depth} * var(--sb-tree-indent))` }"
        @click="onRowClick(node)"
      >
        <Icon
          v-if="isFolder(node)"
          :name="isCollapsed(node) ? 'chevron-right' : 'chevron-down'"
          :size="10"
          class="sbt-chevron"
        />
        <span v-else class="sbt-chevron-spacer" aria-hidden="true" />
        <Icon
          :name="nodeIcon(node)"
          :size="14"
          class="sbt-icon"
          :style="node.color ? { color: node.color } : undefined"
        />
        <span class="sbt-label">{{ node.label }}</span>
        <span v-if="node.meta" class="sbt-meta">{{ node.meta }}</span>
      </button>

      <SideBarTree
        v-if="isFolder(node) && !isCollapsed(node)"
        :nodes="node.children!"
        :depth="depth + 1"
        :selected="selected"
        :collapsed="collapsed"
        @select="onChildSelect"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '../common'
import type { TreeItem } from './types'

const props = withDefaults(
  defineProps<{
    nodes: TreeItem[]
    /** 当前深度（用于缩进） */
    depth?: number
    /** 选中项 id */
    selected?: string
    /** 已折叠的节点 id 集合（由父级 SideBar 统一持有） */
    collapsed?: Set<string>
  }>(),
  { depth: 0, selected: '', collapsed: undefined }
)

const emit = defineEmits<{
  select: [TreeItem]
}>()

function isFolder(node: TreeItem) {
  return !!node.children?.length
}

function isCollapsed(node: TreeItem) {
  if (props.collapsed?.has(node.id)) return true
  return node.collapsed === true
}

function nodeIcon(node: TreeItem): string {
  if (node.icon) return node.icon
  if (isFolder(node)) {
    return isCollapsed(node) ? 'folder' : 'folder-open'
  }
  return 'file'
}

function onRowClick(node: TreeItem) {
  if (isFolder(node)) {
    // 切换文件夹折叠
    if (props.collapsed) {
      if (props.collapsed.has(node.id)) props.collapsed.delete(node.id)
      else props.collapsed.add(node.id)
    }
  }
  emit('select', node)
}

function onChildSelect(node: TreeItem) {
  emit('select', node)
}
</script>

<style scoped>
.sbt {
  display: flex;
  flex-direction: column;
}

.sbt-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  width: calc(100% - 12px);
  height: var(--sb-row-height);   /* 行高：sidebar/tokens.css 的 --sb-row-height */
  margin: 0 6px;
  padding-right: 6px;
  background: transparent;
  border: 0;
  border-radius: 6px;   /* macOS Finder 风格圆角悬停 */
  color: inherit;
  font: inherit;
  font-size: var(--sb-font-size);
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  transition: background var(--sb-transition-fast);
}
.sbt-row:hover {
  background: var(--sb-item-hover);
}
.sbt-row.is-selected {
  background: var(--sb-selection-bg);
  color: var(--sb-selection-fg);
}
.sbt-row.is-selected .sbt-icon,
.sbt-row.is-selected .sbt-meta {
  color: inherit;
}

/* 选中行左侧品牌色指示条 */
.sbt-row.is-selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 3px;
  bottom: 3px;
  width: 2px;
  border-radius: 2px;
  background: var(--kn-brand-500);
}

.sbt-chevron {
  opacity: 0.6;
  flex-shrink: 0;
  width: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sbt-chevron-spacer {
  flex-shrink: 0;
  width: 12px;
}

.sbt-icon {
  opacity: 0.9;
  flex-shrink: 0;
}

.sbt-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--sb-font-size);
}

.sbt-meta {
  font-size: 10px;
  opacity: 0.5;
  flex-shrink: 0;
}
</style>
