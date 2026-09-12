<!--
  EditorSidebar：资源管理器侧栏（VS Code 风格）
  - 打开的编辑器（计数）+ 工作区树（SideBarTree 递归）+ 大纲
  - 数据目前是示例，接 Tauri 文件系统后换成真实目录树
-->
<template>
  <div class="vs">
    <SidebarSection title="打开的编辑器" :count="openEditors.length">
      <SidebarRow
        v-for="f in openEditors"
        :key="f.id"
        :icon="f.icon"
        :color="f.color"
        :selected="selected === f.id"
        @click="selected = f.id"
      >
        {{ f.label }}
        <template #meta><span class="vs-meta">{{ f.meta }}</span></template>
      </SidebarRow>
    </SidebarSection>

    <SidebarSection title="KAZENEST">
      <SideBarTree :nodes="workspaceTree" :selected="selected" :collapsed="collapsedNodes" @select="onTreeSelect" />
    </SidebarSection>

    <SidebarSection title="大纲">
      <SidebarRow
        v-for="o in outline"
        :key="o.id"
        :icon="o.icon"
        :color="o.color"
        :selected="selected === o.id"
        @click="selected = o.id"
      >
        {{ o.label }}
        <template #meta><span class="vs-meta">{{ o.meta }}</span></template>
      </SidebarRow>
    </SidebarSection>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SidebarSection from './SidebarSection.vue'
import SidebarRow from './SidebarRow.vue'
import SideBarTree from '../SideBarTree.vue'
import type { TreeItem } from '../types'

const openEditors: TreeItem[] = [
  { id: 'oe-app',    label: 'App.vue',    icon: 'file', color: 'var(--kn-emerald-500)', meta: 'Vue' },
  { id: 'oe-editor', label: 'Editor.vue', icon: 'file', color: 'var(--kn-emerald-500)', meta: 'Vue' },
  { id: 'oe-home',   label: 'Home.vue',   icon: 'file', color: 'var(--kn-emerald-500)', meta: 'Vue' },
]

const workspaceTree: TreeItem[] = [
  {
    id: 'ws-src',
    label: 'src',
    children: [
      {
        id: 'ws-src-component',
        label: 'component',
        children: [
          {
            id: 'ws-src-component-sidebar',
            label: 'sidebar',
            children: [
              { id: 'ws-file-activitybar', label: 'ActivityBar.vue', meta: 'Vue' },
              { id: 'ws-file-sidebar',     label: 'SideBar.vue',     meta: 'Vue' },
              { id: 'ws-file-tree',        label: 'SideBarTree.vue', meta: 'Vue' },
            ],
          },
          {
            id: 'ws-src-component-editor',
            label: 'editor',
            children: [
              { id: 'ws-file-tabs',   label: 'EditorTabs.vue', meta: 'Vue' },
              { id: 'ws-file-code',   label: 'CodeView.vue',   meta: 'Vue' },
              { id: 'ws-file-status', label: 'StatusBar.vue',  meta: 'Vue' },
            ],
          },
          {
            id: 'ws-src-component-titlebar',
            label: 'titlebar',
            children: [
              { id: 'ws-file-titlebar', label: 'Titlebar.vue',    meta: 'Vue' },
              { id: 'ws-file-search',   label: 'SearchPanel.vue', meta: 'Vue' },
            ],
          },
        ],
      },
      {
        id: 'ws-src-pages',
        label: 'pages',
        children: [
          { id: 'ws-file-home',   label: 'Home.vue',   meta: 'Vue' },
          { id: 'ws-file-editor', label: 'Editor.vue', meta: 'Vue' },
        ],
      },
      { id: 'ws-file-app',  label: 'App.vue',  meta: 'Vue' },
      { id: 'ws-file-main', label: 'main.ts',  meta: 'TS' },
    ],
  },
  { id: 'ws-file-package', label: 'package.json',   meta: 'JSON' },
  { id: 'ws-file-vite',    label: 'vite.config.ts', meta: 'TS' },
]

const outline: TreeItem[] = [
  { id: 'ol-editor', label: 'Editor.vue',  icon: 'file-text', color: 'var(--kn-emerald-500)', meta: '组件' },
  { id: 'ol-code',   label: 'CodeView.vue', icon: 'file-text', color: 'var(--kn-sky-500)',    meta: '组件' },
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