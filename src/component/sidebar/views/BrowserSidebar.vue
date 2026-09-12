<!--
  BrowserSidebar：内置浏览器侧栏
  - 历史（网址 + 访问时间）+ 书签
  - 接后端 WebView 后点击历史/书签即打开标签页
-->
<template>
  <div class="vs">
    <SidebarSection title="历史" :count="history.length">
      <SidebarRow
        v-for="h in history"
        :key="h.id"
        icon="globe"
        :color="h.color"
        :selected="active === h.id"
        @click="active = h.id"
      >
        {{ h.label }}
        <template #meta><span class="vs-meta">{{ h.meta }}</span></template>
      </SidebarRow>
    </SidebarSection>

    <SidebarSection title="书签" icon="star" :count="bookmarks.length">
      <SidebarRow
        v-for="b in bookmarks"
        :key="b.id"
        icon="globe"
        :color="b.color"
        :selected="active === b.id"
        @click="active = b.id"
      >
        {{ b.label }}
      </SidebarRow>
    </SidebarSection>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SidebarSection from './SidebarSection.vue'
import SidebarRow from './SidebarRow.vue'

const history = [
  { id: 'his-1', label: 'https://example.com', color: 'var(--kn-sky-500)',    meta: '2 分钟前' },
  { id: 'his-2', label: 'https://tauri.app',   color: 'var(--kn-emerald-500)', meta: '1 小时前' },
  { id: 'his-3', label: 'https://vite.dev',    color: 'var(--kn-magenta-500)', meta: '昨天' },
]

const bookmarks = [
  { id: 'bm-1', label: 'Tauri 文档',  color: 'var(--kn-amber-500)' },
  { id: 'bm-2', label: 'Vue 3 文档',  color: 'var(--kn-brand-500)' },
  { id: 'bm-3', label: 'GitHub',     color: 'var(--kn-fg-muted)' },
]

const active = ref('his-1')
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