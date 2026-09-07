<!--
  Editor：编辑器页
  - 标签页（EditorTabs）→ 代码区（CodeView）→ 状态栏（StatusBar）
  - 文件数据来自 data/editorFiles.ts（后续接 Tauri 文件系统）
  - 编辑联动：CodeView 变更 → 更新内容 + 标记未保存；Ctrl+S 清除标记
  - 关闭标签：自动切换到相邻标签；关闭全部后进入空文件态
-->
<template>
  <div class="editor-page">
    <EditorTabs
      :files="openFiles"
      :model-value="activeFileId"
      @update:model-value="onTabSelect"
      @close="onCloseTab"
      @close-others="onCloseOthers"
      @close-all="onCloseAll"
      @close-saved="onCloseSaved"
    />

    <CodeView :file="activeFile" @update="onContentUpdate" @cursor="onCursor" />

    <StatusBar
      :file="activeFile"
      :line="cursor.line"
      :col="cursor.col"
      :selected="cursor.selected"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { EditorTabs, CodeView, StatusBar } from '../component/editor'
import { editorFiles } from '../data/editorFiles'
import type { EditorFile } from '../data/editorFiles'
import { addRecentFile } from '../utils/persist'

/** 打开的标签（初始 = 全部示例文件；可关闭）
 * 调节：想让编辑器初始打开别的文件，改 data/editorFiles.ts，
 * 这里会自动跟随；初始活动标签 = 数组第一项。 */
const openFiles = ref<EditorFile[]>([...editorFiles])
const activeFileId = ref(editorFiles[0]?.id ?? '')

/** 无标签时的兜底空文件（CodeView 已有"空文件"空态展示） */
const EMPTY_FILE: EditorFile = {
  id: '',
  name: '未打开文件',
  language: '',
  icon: 'file',
  content: '',
}

const activeFile = computed(
  () => openFiles.value.find((f) => f.id === activeFileId.value) ?? openFiles.value[0] ?? EMPTY_FILE
)

const cursor = ref({ line: 1, col: 1, selected: 0 })

function onCursor(pos: { line: number; col: number; selected: number }) {
  cursor.value = pos
}

/** 代码内容变更：更新文件内容并标记未保存 */
function onContentUpdate(content: string) {
  const f = activeFile.value
  if (!f || f.content === content) return
  f.content = content
  f.modified = true
}

/** Ctrl+S：保存当前文件（演示版仅清除未保存标记） */
function onSave() {
  const f = activeFile.value
  if (!f || !f.modified) return
  f.modified = false
}

/* =================== 标签操作 =================== */

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
    activeFileId.value = next?.id ?? ''
  }
  openFiles.value.splice(idx, 1)
}

/** ⋯ 菜单：关闭其他标签 */
function onCloseOthers() {
  if (activeFileId.value) {
    openFiles.value = openFiles.value.filter((f) => f.id === activeFileId.value)
  }
}

/** ⋯ 菜单：关闭全部标签（进入空文件态） */
function onCloseAll() {
  openFiles.value = []
  activeFileId.value = ''
}

/** ⋯ 菜单：关闭所有已保存标签（未保存的保留） */
function onCloseSaved() {
  const activeId = activeFileId.value
  openFiles.value = openFiles.value.filter((f) => f.modified || f.id === activeId)
  if (!openFiles.value.some((f) => f.id === activeFileId.value)) {
    activeFileId.value = openFiles.value[0]?.id ?? ''
  }
}

/* =================== 全局快捷键 =================== */

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))

function onGlobalKeydown(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey
  if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault()
    onSave()
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