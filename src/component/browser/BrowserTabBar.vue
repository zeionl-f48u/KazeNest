<!--
  BrowserTabBar：浏览器标签栏（Edge 风格标签组 + 拖拽）
  - 拖拽方案：鼠标跟随（transform）+ 布局坐标判定目标（与编辑器标签栏同一套稳定方案，
    不使用 HTML5 drag & drop —— 在 WebView 中行为不可靠）
  - 拖拽落点（按鼠标相对目标的水平位置分三区）：
    · 左 30% / 右 30% → 插入重排（插入线提示）
    · 中间 40% → 合并成组（目标高亮；无组则松手新建）
    · 悬停组头 → 加入该组（组头高亮）
    · 标签栏外松手 → 移到末尾并脱离当前组
  - 标签组：组头（色点 + 名称 + 数量）点击折叠/展开，双击重命名
  - 宽度自适应：标签 flex 均分可用宽度，最少 54px / 最多 220px，超出横向滚动
-->
<template>
  <div class="btb">
    <div ref="barRef" class="btb-tabs">
      <template v-for="row in rows" :key="row.kind === 'group' ? `g${row.group.id}` : `t${row.tab.id}`">
        <!-- 组头（点击折叠/展开，双击重命名；拖标签悬停 = 加入该组） -->
        <div
          v-if="row.kind === 'group'"
          class="btb-group"
          :class="{ 'is-collapsed': row.group.collapsed, 'is-drop-group': dropPos === 'group' && dropGroupId === row.group.id }"
          :style="{ '--tint': row.group.color }"
          :title="row.group.name"
          :data-group-id="row.group.id"
          @click="emit('toggle-group', row.group.id)"
          @dblclick.stop="startRename(row.group)"
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
            'is-drop-before': dropPos === 'before' && dropId === row.tab.id,
            'is-drop-after': dropPos === 'after' && dropId === row.tab.id,
            'is-drop-group': dropPos === 'group' && dropId === row.tab.id,
            'is-grouped': !!row.tab.groupId,
          }"
          :style="row.tab.groupId ? { '--tint': groupColor(row.tab.groupId) } : undefined"
          :title="row.tab.url || '新标签页'"
          :data-tab-id="row.tab.id"
          :ref="(el) => setTabEl(row.tab.id, el)"
          @mousedown.left="onTabMousedown(row.tab.id, $event)"
          @click="onTabClick(row.tab.id)"
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
import { computed, nextTick, onUnmounted, ref } from 'vue'
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

/** 组色（组内标签顶部细条用） */
function groupColor(groupId: number): string {
  return props.groups.find((g) => g.id === groupId)?.color ?? 'var(--kn-brand-500)'
}

/* =================== 拖拽（鼠标跟随 + 落点判定） =================== */

const tabElMap = new Map<number, HTMLElement>()
function setTabEl(id: number, el: unknown) {
  if (el) tabElMap.set(id, el as HTMLElement)
  else tabElMap.delete(id)
}

const dragId = ref<number | null>(null)
/** 落点类型（before/after 重排，group 成组，null 无目标=末尾） */
const dropPos = ref<'before' | 'after' | 'group' | null>(null)
/** 落点目标标签 id（group 意图时为目标标签；悬停组头时为组内首个成员） */
const dropId = ref<number | null>(null)
/** 成组意图高亮的组 id（目标标签所在组 / 悬停的组头） */
const dropGroupId = ref<number | null>(null)

let startX = 0
let startY = 0
/** 是否真的拖动过（用于抑制拖动后的 click 误切换） */
let didDrag = false

function onTabMousedown(id: number, e: MouseEvent) {
  if (e.button !== 0) return
  if ((e.target as HTMLElement).closest('.btb-close')) return
  dragId.value = id
  didDrag = false
  startX = e.clientX
  startY = e.clientY
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e: MouseEvent) {
  const id = dragId.value
  if (id == null) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (!didDrag && Math.hypot(dx, dy) > 4) didDrag = true
  if (!didDrag) return

  /* 拖拽标签跟随鼠标（每帧更新，避免跳变） */
  const el = tabElMap.get(id)
  if (el) {
    el.style.transform = `translate(${dx}px, ${dy}px)`
    el.style.zIndex = '20'
  }
  updateDropTarget(e.clientX, e.clientY)
}

/** 落点判定：组头优先 → 标签三区（左/右=重排，中=成组）→ 无目标（末尾） */
function updateDropTarget(x: number, y: number) {
  const bar = barRef.value
  if (!bar) return
  const barRect = bar.getBoundingClientRect()

  /* 垂直方向明显离开标签栏：视为拖到末尾（脱离组） */
  if (y < barRect.top - 24 || y > barRect.bottom + 24) {
    clearDrop()
    return
  }

  /* 1) 悬停组头：加入该组 */
  for (const gEl of bar.querySelectorAll<HTMLElement>('[data-group-id]')) {
    const r = gEl.getBoundingClientRect()
    if (x >= r.left && x <= r.right) {
      const gid = Number(gEl.dataset.groupId)
      const first = props.tabs.find((t) => t.groupId === gid)
      dropPos.value = 'group'
      dropId.value = first?.id ?? null
      dropGroupId.value = gid
      return
    }
  }

  /* 2) 悬停标签：按水平位置分三区 */
  for (const tEl of bar.querySelectorAll<HTMLElement>('[data-tab-id]')) {
    const tid = Number(tEl.dataset.tabId)
    if (tid === dragId.value) continue
    const r = tEl.getBoundingClientRect()
    if (x >= r.left && x <= r.right) {
      const ratio = (x - r.left) / r.width
      if (ratio < 0.3) {
        dropPos.value = 'before'
        dropId.value = tid
        dropGroupId.value = null
      } else if (ratio > 0.7) {
        dropPos.value = 'after'
        dropId.value = tid
        dropGroupId.value = null
      } else {
        const tab = props.tabs.find((t) => t.id === tid)
        dropPos.value = 'group'
        dropId.value = tid
        dropGroupId.value = tab?.groupId ?? null
      }
      return
    }
  }

  /* 3) 空白区域：无目标 → 移到末尾 */
  clearDrop()
}

function clearDrop() {
  dropPos.value = null
  dropId.value = null
  dropGroupId.value = null
}

function onDragEnd() {
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)

  const id = dragId.value
  const el = id != null ? tabElMap.get(id) : null
  if (el) {
    el.style.transform = ''
    el.style.zIndex = ''
  }

  if (didDrag && id != null) {
    if (dropPos.value && dropId.value != null) {
      emit('move', { dragId: id, targetId: dropId.value, position: dropPos.value })
    } else {
      emit('move', { dragId: id, targetId: 0, position: 'end' })
    }
  }

  dragId.value = null
  clearDrop()
}

/** 点击切换标签；拖动结束时抑制这次 click（避免误切） */
function onTabClick(id: number) {
  if (didDrag) {
    didDrag = false
    return
  }
  emit('activate', id)
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

/* 卸载兜底：拖拽中的全局监听清理 */
onUnmounted(() => {
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
})
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
  position: relative;
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
  user-select: none;
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
/* 拖拽中的标签：抬起效果（transform 由脚本控制） */
.btb-tab.is-dragging {
  cursor: grabbing;
  background: var(--kn-bg-elev);
  color: var(--kn-fg);
  box-shadow: var(--kn-shadow-lg);
  opacity: 0.92;
}

/* 插入线（重排提示） */
.btb-tab.is-drop-before {
  box-shadow: inset 2px 0 0 var(--kn-brand-500);
}
.btb-tab.is-drop-after {
  box-shadow: inset -2px 0 0 var(--kn-brand-500);
}
/* 合并成组提示（中间区域）：品牌色描边 */
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
/* 拖标签悬停组头（加入该组）提示 */
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
