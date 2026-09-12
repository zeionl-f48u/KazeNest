<!--
  FilesSidebar：文件管理侧栏
  - 收藏 + 最近 + 目录树（SideBarTree，接 Tauri 文件系统后替换为真实目录）
-->
<template>
  <div class="vs">
    <SidebarSection title="收藏" icon="star">
      <SidebarRow v-for="f in favorites" :key="f.id" :icon="f.icon" :color="f.color" :selected="selected === f.id" @click="selected = f.id">
        {{ f.label }}
        <template #meta><span class="vs-meta">{{ f.meta }}</span></template>
      </SidebarRow>
    </SidebarSection>

    <SidebarSection title="最近" :count="recents.length">
      <SidebarRow v-for="r in recents" :key="r.id" :icon="r.icon" :color="r.color" :selected="selected === r.id" @click="selected = r.id">
        {{ r.label }}
        <template #meta><span class="vs-meta">{{ r.meta }}</span></template>
      </SidebarRow>
    </SidebarSection>

    <SidebarSection title="目录" icon="folder">
      <SideBarTree :nodes="folderTree" :selected="selected" :collapsed="collapsedNodes" @select="onTreeSelect" />
    </SidebarSection>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SidebarSection from './SidebarSection.vue'
import SidebarRow from './SidebarRow.vue'
import SideBarTree from '../SideBarTree.vue'
import type { TreeItem } from '../types'

const favorites: TreeItem[] = [
  { id: 'fav-1', label: '示例文档.md', icon: 'file-text', color: 'var(--kn-amber-500)', meta: 'MD' },
  { id: 'fav-2', label: 'API.md',      icon: 'file-text', color: 'var(--kn-sky-500)',    meta: 'MD' },
]

const recents: TreeItem[] = [
  { id: 'rec-1', label: 'README.md', icon: 'file-text', color: 'var(--kn-fg-muted)', meta: 'MD' },
  { id: 'rec-2', label: 'Editor.vue', icon: 'file-text', color: 'var(--kn-emerald-500)', meta: 'Vue' },
]

const folderTree: TreeItem[] = [
  {
    id: 'fd-docs',
    label: 'docs',
    children: [{ id: 'fd-file-api', label: 'API.md', meta: 'MD' }],
  },
  { id: 'fd-file-readme', label: 'README.md', meta: 'MD' },
]

const selected = ref('')
const collapsedNodes = ref<Set<string>>(new Set())

function onTreeSelect(item: TreeItem) {
  selected.value = item.id
}
</script>

<style scoped>
.vs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 8px;
}
.vs-meta {
  font-size: 10px;
  opacity: 0.5;
  flex-shrink: 0;
  margin-left: 6px;
}
</style>