<!--
  BrowserTabBar：浏览器标签栏（Edge 风格标签组 + 拖拽）
  - 拖拽标签：
    · 拖到另一标签左/右侧 28% 区域 → 插入重排（显示插入线）
    · 拖到标签中间区域 → 合并成组（目标无组则新建组；已有组则加入该组，显示组框高亮）
    · 拖到标签栏空白 → 移到末尾并脱离当前组
  - 标签组：组头（色点 + 名称 + 数量）点击折叠/展开，双击重命名
  - 宽度自适应：标签 flex 均分可用宽度，最少 54px / 最多 220px，超出横向滚动
  - 组头与新建按钮固定宽度不参与伸缩
-->
<template>
  <div class="btb">
    <div
      ref="barRef"
      class="btb-tabs"
      @dragover.prevent="onBarDragOver"
      @drop.prevent="onBarDrop"
    >
      <template v-for="row in rows" :key="row.kind === 'group' ? `g${row.group.id}` : `t${row.tab.id}`">
        <!-- 组头（点击折叠/展开，双击重命名；拖标签到组头 = 加入该组） -->
        <div
          v-if="row.kind === 'group'"
          class="btb-group"
          :class="{ 'is-collapsed': row.group.collapsed, 'is-drop-group': dropOnGroupId === row.group.id }"
          :style="{ '--tint': row.group.color }"
          :title="row.group.name"
          @click="emit('toggle-group', row.group.id)"
          @dblclick.stop="startRename(row.group)"
          @dragover.stop.prevent="onGroupDragOver(row.group.id)"
          @drop.stop.prevent="onGroupDrop(row.group.id)"
        >
          <span class="btb-group-dot" />
          <input
            v-if="renamingId === row.group.id"
            v-model="renameDraft"
            class="btb-group-input"
            spellcheck="false"
            @click.stop
            @dblclick.stop
            @keydown.enter="commitRename"
            @keydown.esc="cancelRename"
            @blur="commitRename"
          />
          <span v-else class="btb-group-name">{{ row.group.name }}</span>
          <span class="btb-group-count">{{ row.count }}</span>
        </div>

        <!-- 标签 -->
        <button
          v-else
          type="button"
          class="btb-tab"
          :class="{
            'is-on': row.tab.id === activeId,
            'is-dragging': dragId === row.tab.id,
            'is-drop-before': dropTarget?.tabId === row.tab.id && dropTarget.position === 'before',
            'is-drop-after': dropTarget?.tabId === row.tab.id && dropTarget.position === 'after',
            'is-drop-group': dropTarget?.tabId === row.tab.id && dropTarget.position === 'group',
            'is-grouped': !!row.tab.groupId,
          }"
          :style="row.tab.groupId ? { '--tint': groupColor(row.tab.groupId) } : undefined"
          :title="row.tab.url || '新标签页'"
          draggable="true"
          @click="emit('activate', row.tab.id)"
          @dragstart="onDragStart($event, row.tab.id)"
          @dragend="onDragEnd"
          @dragover="onTabDragOver($event, row.tab.id)"
          @drop.stop.prevent="onTabDrop"
        >
          <span v-if="row.tab.loading" class="btb-fav is-loading">
            <Icon name="refresh" :size="10" />
          </span>
          <span v-else class="btb-fav" :style="{ '--tint': row.tab.color }">{{ row.tab.letter || '✳' }}</span>
          <span class="btb-title">{{ row.tab.title }}</span>
          <span class="btb-close" role="button" aria-label="关闭标签页" @click.stop="emit('close', row.tab.id)">
            <Icon name="times" :size="11" />
          </span>
        </button>
      </template>

      <button type="button" class="btb-new" title="新建标签页" @click="emit('new')">
        <Icon name="plus" :size="13" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Icon } from '../common'

interface TabLike {
  id: number
  title: string
  url: string
  color: string
  letter: string
  loading: boolean
  groupId?: number
}

interface GroupLike {
  id: number
  name: string
  color: string
  collapsed: boolean
}

const props = defineProps<{
  tabs: TabLike[]
  groups: GroupLike[]
  activeId: number
}>()

const emit = defineEmits<{
  activate: [id: number]
  close: [id: number]
  new: []
  /** 拖拽结果：插入重排（before/after）/ 合并成组（group）/ 移到末尾（end） */
  move: [payload: { dragId: number; targetId: number; position: 'before' | 'after' | 'group' | 'end' }]
  'toggle-group': [groupId: number]
  'rename-group': [groupId: number, name: string]
}>()

const barRef = ref<HTMLElement | null>(null)

/* =================== 渲染序列（组头 + 成员标签） =================== */

type Row = { kind: 'tab'; tab: TabLike } | { kind: 'group'; group: GroupLike; count: number }

/** 按标签顺序生成渲染行：组头出现在其首个成员位置，折叠时隐藏成员 */
const rows = computed<Row[]>(() => {
  const out: Row[] = []
  const emitted = new Set<number>()
  const renderedTabs = new Set<number>()

  for (const t of props.tabs) {
    if (t.groupId) {
      const g = props.groups.find((x) => x.id === t.groupId)
      if (!g) {
        if (!renderedTabs.has(t.id)) out.push({ kind: 'tab', tab: t })
        renderedTabs.add(t.id)
        continue
      }
      if (!emitted.has(g.id)) {
        emitted.add(g.id)
        const members = props.tabs.filter((x) => x.groupId === g.id)
        out.push({ kind: 'group', group: g, count: members.length })
        if (!g.collapsed) {
          for (const m of members) {
            out.push({ kind: 'tab', tab: m })
            renderedTabs.add(m.id)
          }
        } else {
          for (const m of members) renderedTabs.add(m.id)
        }
      }
    } else if (!renderedTabs.has(t.id)) {
      out.push({ kind: 'tab', tab: t })
      renderedTabs.add(t.id)
    }
  }
  return out
})

/** 组色（标签顶部细条用） */
function groupColor(groupId: number): string {
  return props.groups.find((g) => g.id === groupId)?.color ?? 'var(--kn-brand-500)'
}

/* =================== 拖拽（重排 / 成组） =================== */

const dragId = ref<number | null>(null)
const dropTarget = ref<{ tabId: number; position: 'before' | 'after' | 'group' } | null>(null)

function onDragStart(e: DragEvent, id: number) {
  dragId.value = id
  e.dataTransfer?.setData('text/plain', String(id))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  dragId.value = null
  dropTarget.value = null
  dropOnGroupId.value = null
}

/** 标签上的 dragover：按鼠标位置分三区（左 28% / 中 / 右 28%） */
function onTabDragOver(e: DragEvent, tabId: number) {
  if (dragId.value === null || dragId.value === tabId) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  dropTarget.value = {
    tabId,
    position: ratio < 0.28 ? 'before' : ratio > 0.72 ? 'after' : 'group',
  }
}

function onTabDrop() {
  if (dragId.value === null || !dropTarget.value) return
  emit('move', {
    dragId: dragId.value,
    targetId: dropTarget.value.tabId,
    position: dropTarget.value.position,
  })
  onDragEnd()
}

/** 标签栏空白：放到末尾并脱离组 */
function onBarDragOver(e: DragEvent) {
  if (dragId.value === null) return
  const el = e.target as HTMLElement
  /* 只在空白/容器本身时清除目标提示（标签上的 dragover 已 stop 语义由事件冒泡控制） */
  if (el.closest('.btb-tab') || el.closest('.btb-group')) return
  dropTarget.value = null
  dropOnGroupId.value = null
}

function onBarDrop() {
  if (dragId.value === null) return
  /* 落在标签/组上的情况已由它们自己的 drop 处理（此处仅空白区域） */
  emit('move', { dragId: dragId.value, targetId: 0, position: 'end' })
  onDragEnd()
}

/** 拖到组头：加入该组（以首个成员为目标 + group 位置语义） */
const dropOnGroupId = ref<number | null>(null)

function onGroupDragOver(groupId: number) {
  if (dragId.value === null) return
  dropOnGroupId.value = groupId
  dropTarget.value = null
}

function onGroupDrop(groupId: number) {
  const drag = dragId.value
  if (drag === null) return
  const first = props.tabs.find((t) => t.groupId === groupId)
  if (first && first.id !== drag) {
    emit('move', { dragId: drag, targetId: first.id, position: 'group' })
  }
  onDragEnd()
}

/* =================== 组重命名（双击组头） =================== */

const renamingId = ref<number | null>(null)
const renameDraft = ref('')

async function startRename(group: GroupLike) {
  renamingId.value = group.id
  renameDraft.value = group.name
  await nextTick()
  const el = barRef.value?.querySelector<HTMLInputElement>('.btb-group-input')
  el?.focus()
  el?.select()
}

function commitRename() {
  if (renamingId.value === null) return
  const name = renameDraft.value.trim()
  if (name) emit('rename-group', renamingId.value, name)
  renamingId.value = null
}

function cancelRename() {
  renamingId.value = null
}
</script>

<style scoped>
.btb {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 4px 6px 0;
  background: var(--kn-bg-sunken);
  border-bottom: 1px solid var(--kn-border);
  flex-shrink: 0;
}

/* 标签行：均分宽度（自适应），超出横向滚动 */
.btb-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}
.btb-tabs::-webkit-scrollbar {
  display: none;
}

/* ==================== 标签 ==================== */
/* 自动调节大小：flex 均分（1 1 0），最少 54px、最多 220px */
.btb-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 0;
  min-width: 54px;
  max-width: 220px;
  height: 30px;
  padding: 0 6px 0 10px;
  border: 0;
  border-radius: var(--kn-radius-md) var(--kn-radius-md) 0 0;
  background: transparent;
  color: var(--kn-fg-muted);
  font: inherit;
  font-size: var(--kn-text-xs);
  cursor: pointer;
  transition: background var(--kn-dur-fast), color var(--kn-dur-fast), opacity var(--kn-dur-fast);
}
.btb-tab:hover {
  background: var(--kn-hover);
  color: var(--kn-fg);
}
.btb-tab.is-on {
  background: var(--kn-bg-elev);
  color: var(--kn-fg);
}
.btb-tab.is-on::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: var(--kn-brand-500);
}
/* 组内标签：顶部组色细条 */
.btb-tab.is-grouped::before {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  top: 2px;
  height: 2px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--tint) 60%, transparent);
}
/* 拖拽中的标签 */
.btb-tab.is-dragging {
  opacity: 0.45;
}

/* 插入线（重排提示） */
.btb-tab.is-drop-before {
  box-shadow: inset 2px 0 0 var(--kn-brand-500);
}
.btb-tab.is-drop-after {
  box-shadow: inset -2px 0 0 var(--kn-brand-500);
}
/* 合并成组提示（中间区域）：品牌色虚框 */
.btb-tab.is-drop-group {
  background: color-mix(in srgb, var(--kn-brand-500) 12%, transparent);
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--kn-brand-500) 65%, transparent);
}

/* favicon（字母占位） */
.btb-fav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: var(--kn-radius-xs);
  background: color-mix(in srgb, var(--tint, var(--kn-brand-500)) 18%, transparent);
  color: var(--tint, var(--kn-brand-500));
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  line-height: 1;
}
.btb-fav.is-loading {
  color: var(--kn-fg-subtle);
  background: transparent;
  animation: btb-spin 0.9s linear infinite;
}
@keyframes btb-spin {
  to { transform: rotate(360deg); }
}

.btb-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

/* 关闭键 */
.btb-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: var(--kn-fg-subtle);
  flex-shrink: 0;
  opacity: 0;
  transition: background var(--kn-dur-fast), opacity var(--kn-dur-fast);
}
.btb-tab:hover .btb-close,
.btb-tab.is-on .btb-close {
  opacity: 1;
}
.btb-close:hover {
  background: color-mix(in srgb, var(--kn-fg) 12%, transparent);
  color: var(--kn-fg);
}

/* ==================== 标签组头 ==================== */
/* 固定宽度，不参与标签宽度均分 */
.btb-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  height: 30px;
  padding: 0 10px;
  border-radius: var(--kn-radius-md) var(--kn-radius-md) 0 0;
  background: color-mix(in srgb, var(--tint, var(--kn-brand-500)) 14%, transparent);
  color: var(--tint, var(--kn-brand-500));
  font-size: var(--kn-text-xs);
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: background var(--kn-dur-fast), filter var(--kn-dur-fast);
}
.btb-group:hover {
  filter: brightness(1.06);
  background: color-mix(in srgb, var(--tint, var(--kn-brand-500)) 20%, transparent);
}
.btb-group.is-collapsed {
  background: color-mix(in srgb, var(--tint, var(--kn-brand-500)) 22%, transparent);
}
/* 拖到组头（加入该组）提示 */
.btb-group.is-drop-group {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--tint, var(--kn-brand-500)) 80%, transparent);
}
.btb-group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tint, var(--kn-brand-500));
  flex-shrink: 0;
}
.btb-group-name {
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.btb-group-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 14px;
  padding: 0 4px;
  border-radius: var(--kn-radius-pill);
  background: color-mix(in srgb, var(--tint, var(--kn-brand-500)) 22%, transparent);
  font-size: 9px;
  font-weight: 700;
}
/* 组名重命名输入框 */
.btb-group-input {
  width: 84px;
  border: 0;
  outline: 0;
  padding: 0 2px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--kn-text-xs);
  font-weight: 600;
  border-bottom: 1px solid currentColor;
}

/* ==================== 新建标签 ==================== */
.btb-new {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-left: 2px;
  border: 0;
  border-radius: var(--kn-radius-md);
  background: transparent;
  color: var(--kn-fg-muted);
  cursor: pointer;
  flex: 0 0 auto;
  transition: background var(--kn-dur-fast), color var(--kn-dur-fast);
}
.btb-new:hover {
  background: var(--kn-hover);
  color: var(--kn-fg);
}
</style>
