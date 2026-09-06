<!--
  Editor：编辑器页
  - 标签页（EditorTabs）→ 代码区（CodeView）→ 状态栏（StatusBar）
  - 文件数据来自 data/editorFiles.ts（后续接 Tauri 文件系统）
  - 关闭标签：移除并自动切换到相邻标签（至少保留一个）
-->
<template>
  <div class="editor-page">
    <EditorTabs
      :files="openFiles"
      :model-value="activeFileId"
      @update:model-value="onTabSelect"
      @close="onCloseTab"
    />

    <CodeView :file="activeFile" @cursor="onCursor" />

    <StatusBar :file="activeFile" :line="cursor.line" :col="cursor.col" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { EditorTabs, CodeView, StatusBar } from '../component/editor'
import { editorFiles } from '../data/editorFiles'
import type { EditorFile } from '../data/editorFiles'
import { addRecentFile } from '../utils/persist'

/** 打开的标签（初始 = 全部示例文件；可关闭）
 * 调节：想让编辑器初始打开别的文件，改 data/editorFiles.ts，
 * 这里会自动跟随；初始活动标签 = 数组第一项。 */
const openFiles = ref<EditorFile[]>([...editorFiles])
const activeFileId = ref(editorFiles[0]?.id ?? '')

const activeFile = computed(
  () => openFiles.value.find((f) => f.id === activeFileId.value) ?? openFiles.value[0]
)

const cursor = ref({ line: 1, col: 1 })

function onCursor(pos: { line: number; col: number }) {
  cursor.value = pos
}

/** 用户点击标签切换：切到某文件即记为"最近打开"（首次初始激活不算） */
function onTabSelect(id: string) {
  if (id === activeFileId.value) return
  activeFileId.value = id
  const f = openFiles.value.find((x) => x.id === id)
  if (f) addRecentFile({ name: f.id, icon: f.icon, color: f.color, timestamp: Date.now() })
}

function onCloseTab(id: string) {
  const idx = openFiles.value.findIndex((f) => f.id === id)
  if (idx === -1) return
  // 关闭的是当前活动标签 → 切换到相邻标签
  if (openFiles.value[idx].id === activeFileId.value) {
    const next = openFiles.value[idx + 1] ?? openFiles.value[idx - 1]
    if (next) activeFileId.value = next.id
  }
  openFiles.value.splice(idx, 1)
  if (openFiles.value.length === 0) {
    // 兜底：至少保留一个空标签（示例）
    activeFileId.value = editorFiles[0].id
    openFiles.value = [editorFiles[0]]
  }
}
</script>

<style scoped>
/* VS Code 风格：无圆角、无边框、无外框阴影，通栏铺满 */
.editor-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--ed-bg);
  animation: editor-fade var(--kn-dur-slow) var(--kn-ease-out);
}
@keyframes editor-fade {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
