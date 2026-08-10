<!--
  SideBar：VS Code 侧边栏（资源管理器风格）
  - 标题栏：视图名 + 折叠所有 / 更多 / 关闭
  - 分组：sideBarSectionHeader 半透明灰底，可折叠
  - 树内容默认由 SideBarTree 渲染；可用具名 slot（section.id）自定义
  - 选中项通过 v-model 双向绑定
-->
<template>
  <aside class="sb" aria-label="侧边栏">
    <!-- 标题栏 -->
    <div class="sb-titlebar">
      <span class="sb-title">{{ title }}</span>
      <div class="sb-actions">
        <button
          type="button"
          class="sb-action"
          :title="'折叠所有区域'"
          aria-label="折叠所有区域"
          @click="collapseAll"
        >
          <Icon name="angle-double-up" :size="13" />
        </button>
        <button
          type="button"
          class="sb-action"
          :title="'更多操作'"
          aria-label="更多操作"
          @click="$emit('more')"
        >
          <Icon name="ellipsis-h" :size="13" />
        </button>
        <button
          type="button"
          class="sb-action"
          :title="'关闭侧边栏'"
          aria-label="关闭侧边栏"
          @click="$emit('close')"
        >
          <Icon name="angle-double-left" :size="13" />
        </button>
      </div>
    </div>

    <!-- 分组 -->
    <div class="sb-sections">
      <section
        v-for="sec in sections"
        :key="sec.id"
        class="sb-section"
      >
        <button
          v-if="sec.collapsible !== false"
          type="button"
          class="sb-section-header"
          :aria-expanded="!isSectionCollapsed(sec)"
          @click="toggleSection(sec)"
        >
          <Icon
            :name="isSectionCollapsed(sec) ? 'chevron-right' : 'chevron-down'"
            :size="10"
            class="sb-section-chevron"
          />
          <Icon v-if="sec.icon" :name="sec.icon" :size="12" class="sb-section-icon" />
          <span class="sb-section-title">{{ sec.title }}</span>
          <span v-if="sec.count" class="sb-section-count">{{ sec.count }}</span>
          <span class="sb-section-spacer" />
          <Icon name="ellipsis-h" :size="12" class="sb-section-more" />
        </button>

        <div v-show="!isSectionCollapsed(sec)" class="sb-section-body">
          <slot :name="sec.id" :section="sec" :items="sec.items ?? []">
            <SideBarTree
              v-if="sec.items?.length"
              :nodes="sec.items"
              :selected="modelValue"
              :collapsed="collapsedNodes"
              @select="onSelect(sec, $event)"
            />
            <div v-else class="sb-empty">— 无内容 —</div>
          </slot>
        </div>
      </section>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { Icon } from '../common'
import SideBarTree from './SideBarTree.vue'
import type { SideBarSection, SideBarSelection, TreeItem } from './types'

const props = withDefaults(
  defineProps<{
    /** 侧边栏标题（如「资源管理器」） */
    title: string
    /** 分组 */
    sections: SideBarSection[]
    /** 当前选中树节点 id（v-model） */
    modelValue?: string
  }>(),
  { modelValue: '' }
)

const emit = defineEmits<{
  'update:modelValue': [string]
  select: [SideBarSelection]
  more: []
  close: []
}>()

/* =================== 分组折叠 =================== */
const collapsedSections = reactive<Set<string>>(
  new Set(props.sections.filter((s) => s.collapsed).map((s) => s.id))
)

function isSectionCollapsed(sec: SideBarSection) {
  return collapsedSections.has(sec.id)
}

function toggleSection(sec: SideBarSection) {
  if (collapsedSections.has(sec.id)) collapsedSections.delete(sec.id)
  else collapsedSections.add(sec.id)
}

/* =================== 树节点折叠 =================== */
const collapsedNodes = reactive<Set<string>>(new Set())

/** 折叠所有文件夹节点（VS Code「折叠所有区域」） */
function collapseAll() {
  collapsedNodes.clear()
  for (const s of props.sections) collectFolderIds(s.items ?? [], collapsedNodes)
}

function collectFolderIds(items: TreeItem[], into: Set<string>) {
  for (const it of items) {
    if (it.children?.length) {
      into.add(it.id)
      collectFolderIds(it.children, into)
    }
  }
}

/* =================== 选中 =================== */
function onSelect(sec: SideBarSection, item: TreeItem) {
  emit('update:modelValue', item.id)
  emit('select', { sectionId: sec.id, item })
}
</script>

<style scoped>
.sb {
  width: var(--sb-width);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sb-bg);
  color: var(--sb-fg);
  border-right: 1px solid var(--sb-border);
  flex-shrink: 0;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

/* ============ 标题栏 ============ */
.sb-titlebar {
  height: var(--sb-titlebar-height);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px 0 16px;
  box-sizing: border-box;
}

/* 句子式标题（不再全大写），更柔和 */
.sb-title {
  font-size: var(--kn-text-md);
  font-weight: 600;
  letter-spacing: 0.1px;
  color: var(--sb-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sb-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.sb-action {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  border-radius: 4px;
  color: var(--sb-fg-muted);
  font-size: 13px;
  cursor: pointer;
  transition: background var(--sb-transition-fast), color var(--sb-transition-fast);
}
.sb-action:hover {
  background: var(--sb-hover);
  color: var(--sb-fg);
}

/* ============ 分组 ============ */
.sb-sections {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.sb-section-header {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 24px;
  padding: 0 10px;
  background: transparent;
  border: 0;
  color: var(--sb-section-header-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  font-weight: 600;
  letter-spacing: 0.2px;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background var(--sb-transition-fast),
    color var(--sb-transition-fast);
}
.sb-section-header:hover {
  background: var(--sb-section-header-hover);
  color: var(--sb-fg);
}
/* 分组右侧「⋯」仅在悬停时出现（更干净） */
.sb-section-header:hover .sb-section-more {
  opacity: 1;
}

.sb-section-chevron {
  font-size: 10px;
  opacity: 0.7;
  flex-shrink: 0;
  width: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sb-section-icon {
  font-size: 12px;
  opacity: 0.7;
}

.sb-section-title {
  overflow: hidden;
  text-overflow: ellipsis;
}

.sb-section-count {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.5;
}

.sb-section-spacer {
  flex: 1;
}

.sb-section-more {
  opacity: 0;
  transition: opacity var(--sb-transition-fast);
}

.sb-section-body {
  padding: 4px 0;
}

.sb-empty {
  padding: 12px 20px;
  font-size: 12px;
  opacity: 0.5;
}
</style>
