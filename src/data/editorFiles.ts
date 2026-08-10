/**
 * 编辑器打开的文件（标签页 + 代码内容）
 * 实际项目：标签 = 侧边栏点击打开的文件；content 从 Tauri 文件系统读取
 * 这里内置几个示例文件，方便编辑器页演示
 */
export interface EditorFile {
  id: string
  name: string
  language: string
  icon: string
  color?: string
  content: string
}

const mainTs = `// KazeNest — Where Clouds Rest
import { createApp } from 'vue'
import App from './App.vue'
import { useEditor } from './composables/editor'

const editor = useEditor({
  language: 'typescript',
  theme: 'kazenest',
  tabSize: 2,
})

createApp(App)
  .use(editor.plugin)
  .mount('#app')

/** 格式化源码：去掉每行首尾空白 */
export function format(source: string): string {
  const lines = source.split('\\n')
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\\n')
}`

const appVue = `<template>
  <div class="app-shell">
    <Titlebar title="KazeNest" @search-select="onSearchSelect">
      <template #leading>
        <TitlebarChrome part="leading" :menus="menus" />
      </template>
    </Titlebar>

    <div class="app-body">
      <ActivityBar :items="items" v-model="activeView" />
      <SideBar v-if="sideBarOpen" :sections="sections" />
      <main class="app-content">
        <component :is="viewComponent" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Titlebar } from './component/titlebar'

const activeView = ref('editor')
const sideBarOpen = ref(true)
const viewComponent = computed(() => activeView.value)
</script>`

const stylesCss = `/* KazeNest — 全局样式 */
:root {
  --brand: #6366f1;
  --brand-soft: rgba(99, 102, 241, 0.16);
  --radius-pill: 999px;
  --blur: 20px;
}

.app-shell {
  height: 100vh;
  overflow: hidden;
}

.tb {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 38px;
  background: rgba(248, 249, 252, 0.72);
  backdrop-filter: saturate(180%) blur(var(--blur));
}

.glass-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
}`

export const editorFiles: EditorFile[] = [
  {
    id: 'main.ts',
    name: 'main.ts',
    language: 'TypeScript',
    icon: 'file-text',
    color: 'var(--kn-sky-500)',
    content: mainTs,
  },
  {
    id: 'App.vue',
    name: 'App.vue',
    language: 'Vue',
    icon: 'file-text',
    color: 'var(--kn-emerald-500)',
    content: appVue,
  },
  {
    id: 'styles.css',
    name: 'styles.css',
    language: 'CSS',
    icon: 'file-text',
    color: 'var(--kn-magenta-500)',
    content: stylesCss,
  },
]
