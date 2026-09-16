<!--
  FilesSidebar：文件管理侧栏（与页面目录同步）
  - 「文件夹」模式目录树：与页面共享同一棵树 / 当前目录（useFileManager），
    侧栏点目录 → 页面列表与面包屑同步；页面点 → 侧栏高亮同步
  - 空间入口：文件夹 / 资料空间 / 私有空间（与顶部 Tab 同步）
  - 折叠状态由本组件本地维护
-->
<template>
  <div class="fs">
    <SidebarSection title="目录" icon="folder">
      <SidebarRow :icon="'th-large'" :selected="space === 'folder' && !activeFolderId" @click="pickAll">
        全部文件
        <template #meta><span class="fs-count">{{ folderFiles.length }}</span></template>
      </SidebarRow>

      <SideBarTree
        :nodes="folderItems"
        :selected="space === 'folder' ? activeFolderId : ''"
        :collapsed="collapsed"
        @select="onNode"
      />
    </SidebarSection>

    <div class="fs-sep" />

    <SidebarSection title="空间" icon="shield">
      <SidebarRow
        :icon="'folder'"
        :color="'var(--kn-sky-500)'"
        :selected="space === 'folder'"
        @click="setSpace('folder')"
      >
        文件夹
      </SidebarRow>
      <SidebarRow
        :icon="'tag'"
        :color="'var(--kn-brand-500)'"
        :selected="space === 'library'"
        @click="setSpace('library')"
      >
        资料空间
        <template #meta><span class="fs-count">{{ libraryFiles.length }}</span></template>
      </SidebarRow>
      <SidebarRow
        :icon="'lock'"
        :color="'var(--kn-amber-500)'"
        :selected="space === 'private'"
        @click="setSpace('private')"
      >
        私有空间
        <template #meta><span class="fs-count">加密</span></template>
      </SidebarRow>
    </SidebarSection>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SidebarSection from './SidebarSection.vue'
import SidebarRow from './SidebarRow.vue'
import SideBarTree from '../SideBarTree.vue'
import type { TreeItem } from '../types'
import { useFileManager } from '../../../composables'
import type { FolderNode } from '../../../component/files'

const {
  folders,
  folderFiles,
  libraryFiles,
  space,
  activeFolderId,
  setSpace,
  selectFolder,
} = useFileManager()

/** 文件夹树 → SideBarTree 节点（叶子文件夹补 folder 图标） */
function toTreeItems(nodes: FolderNode[]): TreeItem[] {
  return nodes.map((n) => ({
    id: n.id,
    label: n.name,
    icon: n.children?.length ? undefined : 'folder',
    children: n.children?.length ? toTreeItems(n.children) : undefined,
  }))
}

const folderItems = computed(() => toTreeItems(folders.value))

/** 折叠状态（本地维护） */
const collapsed = ref<Set<string>>(new Set())

function pickAll() {
  setSpace('folder')
  selectFolder('')
}

/** 点目录节点：切到文件夹模式并选中该目录（与页面同步） */
function onNode(item: TreeItem) {
  setSpace('folder')
  selectFolder(item.id)
}
</script>

<style scoped>
.fs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 8px;
}
.fs-sep {
  height: 1px;
  margin: 6px 10px;
  background: var(--sb-border);
}
.fs-count {
  font-size: 10px;
  opacity: 0.5;
  flex-shrink: 0;
  margin-left: 6px;
}
</style>
