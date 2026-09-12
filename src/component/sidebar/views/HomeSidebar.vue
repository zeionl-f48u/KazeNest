<!--
  HomeSidebar：首页侧栏
  - 快捷方式：一键跳转常用视图（导航风格：右侧箭头）
  - 最近打开：从 settings.json 读取，回到首页时刷新
-->
<template>
  <div class="vs">
    <SidebarSection title="快捷方式" icon="bolt">
      <SidebarRow
        v-for="a in quickActions"
        :key="a.id"
        :icon="a.icon"
        :color="a.color"
        @click="navigate(a.target)"
      >
        {{ a.label }}
        <template #meta>
          <Icon name="arrow-right" :size="10" class="vs-arrow" />
        </template>
      </SidebarRow>
    </SidebarSection>

    <SidebarSection title="最近打开" :count="recent.length">
      <SidebarRow
        v-for="f in recent"
        :key="f.name"
        :icon="f.icon"
        :color="f.color"
        @click="navigate('editor')"
      >
        {{ f.name }}
        <template #meta>
          <span class="vs-meta">{{ formatRelativeTime(f.timestamp) }}</span>
        </template>
      </SidebarRow>
    </SidebarSection>
  </div>
</template>

<script setup lang="ts">
import { onActivated, ref } from 'vue'
import SidebarSection from './SidebarSection.vue'
import SidebarRow from './SidebarRow.vue'
import { Icon } from '../../common'
import { getRecentFiles, formatRelativeTime } from '../../../utils/persist'
import type { RecentFile } from '../../../utils/persist'

const quickActions = [
  { id: 'qk-editor', label: '进入编辑器', icon: 'file-text', color: 'var(--kn-sky-500)', target: 'editor' },
  { id: 'qk-files',  label: '打开工作区', icon: 'folder-open', color: 'var(--kn-amber-500)', target: 'files' },
  { id: 'qk-ai',     label: 'AI 助手',   icon: 'sparkles',   color: 'var(--kn-magenta-500)', target: 'ai' },
]

/** 最近打开（优先从 store 读取；首次使用用示例数据兜底） */
const recent = ref<RecentFile[]>([
  { name: 'src/App.vue',            icon: 'file-text', color: 'var(--kn-emerald-500)', timestamp: Date.now() - 2 * 60_000 },
  { name: 'src/data/homeCards.ts',  icon: 'file-text', color: 'var(--kn-sky-500)',     timestamp: Date.now() - 60 * 60_000 },
  { name: 'README.md',              icon: 'file-text', color: 'var(--kn-fg-muted)',    timestamp: Date.now() - 24 * 60 * 60_000 },
])

onActivated(async () => {
  const saved = await getRecentFiles()
  if (saved.length > 0) recent.value = saved
})

function navigate(target: string) {
  window.dispatchEvent(new CustomEvent('kn:navigate', { detail: target }))
}
</script>

<style scoped>
.vs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 8px;
}
.vs-arrow {
  opacity: 0;
  flex-shrink: 0;
  transition: opacity var(--sb-transition-fast), transform var(--sb-transition-fast);
}
.sbrow:hover .vs-arrow {
  opacity: 0.6;
  transform: translateX(2px);
}
.vs-meta {
  font-size: 10px;
  opacity: 0.5;
  flex-shrink: 0;
  margin-left: 6px;
}
</style>