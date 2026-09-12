<!--
  EditorTabs：编辑器标签页栏
  - 展示打开的文件；点击切换，× / 中键关闭，修改点（·）提示未保存
  - ⋯ 菜单：关闭其他 / 关闭全部 / 关闭已保存
  - 纯受控组件：files / modelValue / close 及批操作事件
-->
<template>
  <div
    class="ed-tabs"
    role="tablist"
    data-tauri-drag-region="deep"
  >
    <button
      v-for="(f, i) in files"
      :key="f.id"
      type="button"
      class="ed-tab"
      :class="{ 'is-active': f.id === modelValue, 'is-dragging': i === dragIndex }"
      role="tab"
      :aria-selected="f.id === modelValue"
      :ref="(el) => setTabEl(i, el)"
      @click="onTabClick(f.id)"
      @mousedown.left="onTabMousedown(i, $event)"
      @mousedown.middle.prevent="$emit('close', f.id)"
    >
      <Icon
        :name="f.icon"
        :size="13"
        class="ed-tab-icon"
        :style="f.color ? { color: f.color } : undefined"
      />
      <span class="ed-tab-name">{{ f.name }}</span>
      <!-- 未保存：显示修改点；悬停换成 × -->
      <span v-if="f.modified" class="ed-tab-dot" title="有未保存的修改" />
      <button
        type="button"
        class="ed-tab-close"
        :aria-label="`关闭 ${f.name}`"
        @click.stop="$emit('close', f.id)"
      >
        <Icon name="times" :size="10" />
      </button>
    </button>

    <!-- ⋯ 批量关闭菜单（role=button：让 tauri 拖拽逻辑识别为可点击元素，不触发窗口拖动） -->
    <div
      class="ed-tabs-more"
      ref="moreRef"
      title="更多标签"
      role="button"
      @click.stop="toggleMore"
    >
      <Icon name="ellipsis-h" :size="13" />
    </div>

    <Teleport to="body">
      <div v-if="moreOpen" class="ed-more-overlay" @click="moreOpen = false">
        <div class="ed-more-menu" :style="moreStyle" role="menu">
          <button
            class="ed-more-item"
            role="menuitem"
            :disabled="files.length === 0"
            @click="onItem('closeOthers')"
          >关闭其他</button>
          <button
            class="ed-more-item"
            role="menuitem"
            :disabled="files.length === 0"
            @click="onItem('closeAll')"
          >关闭全部</button>
          <button
            class="ed-more-item"
            role="menuitem"
            @click="onItem('closeSaved')"
          >关闭已保存</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { Icon } from '../common'
import type { EditorFile } from '../../data/editorFiles'

defineProps<{
  files: EditorFile[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [string]
  close: [string]
  closeOthers: []
  closeAll: []
  closeSaved: []
  /** 拖拽排序：从 from 移到 to */
  reorder: [{ from: number; to: number }]
}>()

/* =================== 拖拽排序 ===================
 * 方案：拖拽中的标签跟随鼠标（translateX），其余标签让位（向拖拽方向位移一个标签宽度），
 * 松手后 emit reorder，父级重排 files。
 */

const tabEls: (HTMLElement | null)[] = []
function setTabEl(i: number, el: unknown) {
  tabEls[i] = el ? (el as HTMLElement) : null
}

const dragIndex = ref<number | null>(null)
const overIndex = ref<number | null>(null)
const dragX = ref(0)
const startX = ref(0)
const draggedW = ref(0)
/** 是否真的拖动过（用于抑制拖动后的 click 切换标签） */
let didDrag = false

function onTabMousedown(i: number, e: MouseEvent) {
  if (e.button !== 0) return
  if ((e.target as HTMLElement).closest('.ed-tab-close')) return
  dragIndex.value = i
  overIndex.value = i
  startX.value = e.clientX
  dragX.value = 0
  draggedW.value = tabEls[i]?.offsetWidth ?? 100
  didDrag = false
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e: MouseEvent) {
  if (dragIndex.value == null) return
  const dx = e.clientX - startX.value
  dragX.value = dx
  if (Math.abs(dx) > 3) didDrag = true

  // 按鼠标 x 落在哪个标签的前半段决定目标位置
  let target = dragIndex.value
  for (let i = 0; i < tabEls.length; i++) {
    const el = tabEls[i]
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (e.clientX < r.left + r.width / 2) { target = i; break }
    target = i
  }
  if (target !== overIndex.value) {
    overIndex.value = target
    applyTransforms()
  }
}

function applyTransforms() {
  const from = dragIndex.value
  const to = overIndex.value
  if (from == null || to == null) return
  const w = draggedW.value
  for (let i = 0; i < tabEls.length; i++) {
    const el = tabEls[i]
    if (!el) continue
    if (i === from) {
      el.style.transform = `translateX(${dragX.value}px)`
      el.style.zIndex = '5'
    } else if (from < to && i > from && i <= to) {
      el.style.transform = `translateX(${-w}px)`   // 向右拖：中间标签向左让位
    } else if (to < from && i >= to && i < from) {
      el.style.transform = `translateX(${w}px)`    // 向左拖：中间标签向右让位
    } else {
      el.style.transform = ''
      el.style.zIndex = ''
    }
  }
}

function onDragEnd() {
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  const from = dragIndex.value
  const to = overIndex.value
  dragIndex.value = null
  overIndex.value = null
  for (const el of tabEls) {
    if (el) { el.style.transform = ''; el.style.zIndex = '' }
  }
  if (from != null && to != null && from !== to && didDrag) {
    emit('reorder', { from, to })
  }
}

/** 点击切换标签；拖动结束时由 didDrag 抑制这次 click（避免误切） */
function onTabClick(id: string) {
  if (didDrag) {
    didDrag = false
    return
  }
  emit('update:modelValue', id)
}

/* =================== ⋯ 菜单 =================== */

const moreOpen = ref(false)
const moreRef = ref<HTMLElement>()
const moreStyle = ref<Record<string, string>>({})

function toggleMore() {
  moreOpen.value = !moreOpen.value
  if (moreOpen.value) {
    nextTick(() => {
      const btn = moreRef.value
      if (!btn) return
      const r = btn.getBoundingClientRect()
      const width = 150
      moreStyle.value = {
        top: `${r.bottom + 6}px`,
        right: `${Math.max(8, window.innerWidth - r.right - 8)}px`,
        minWidth: `${width}px`,
      }
    })
  }
}

function onItem(action: 'closeOthers' | 'closeAll' | 'closeSaved') {
  moreOpen.value = false
  // emit 是重载函数，直接传联合类型无法匹配，这里显式分发
  if (action === 'closeOthers') emit('closeOthers')
  else if (action === 'closeAll') emit('closeAll')
  else emit('closeSaved')
}
</script>

<style scoped>
.ed-tabs {
  display: flex;
  align-items: stretch;
  gap: 2px;
  height: var(--ed-tab-height);
  background: var(--ed-tabbar-bg);
  border-bottom: 1px solid var(--ed-tabbar-border);
  padding: 4px 8px 0;
  box-sizing: border-box;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  flex-shrink: 0;
  position: relative;
}
.ed-tabs::-webkit-scrollbar { display: none; }

.ed-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: calc(var(--ed-tab-height) - 4px);
  padding: 0 8px 0 10px;
  border: 0;
  border-radius: 0;   /* VS Code：标签直角 */
  background: var(--ed-tab-bg);
  color: var(--ed-tab-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
  transition: background var(--kn-dur-fast) var(--kn-ease-out), color var(--kn-dur-fast);
}
.ed-tab:hover { background: var(--ed-tab-hover); }
.ed-tab:active { background: var(--kn-active); }

/* 拖拽中的标签：跟随鼠标、浮起、淡化 */
.ed-tab.is-dragging {
  opacity: 0.75;
  box-shadow: var(--kn-shadow-md);
  cursor: grabbing;
  background: var(--ed-tab-active-bg);
  color: var(--ed-tab-active-fg);
}

.ed-tab.is-active {
  background: var(--ed-tab-active-bg);
  color: var(--ed-tab-active-fg);
}
/* 活动标签顶部一条品牌色 */
.ed-tab.is-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 10px;
  right: 10px;
  height: 2px;
  border-radius: 2px;
  background: var(--ed-tab-active-border);
}

.ed-tab-icon { flex-shrink: 0; }
.ed-tab-name { max-width: 160px; overflow: hidden; text-overflow: ellipsis; } /* 调节：标签文字最长宽度 */

/* 修改点：始终可见（包括悬停时），保证未保存状态不会被光标盖住；
   悬停时右侧的 × 一并出现，可关闭标签 */
.ed-tab-dot {
  display: inline-flex;
  width: 8px;
  height: 8px;
  margin-left: 2px;
  border-radius: 50%;
  background: var(--ed-tab-dot);
  flex-shrink: 0;
}

.ed-tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 2px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  opacity: 0;
  cursor: pointer;
  transition: opacity var(--kn-dur-fast), background var(--kn-dur-fast);
}
.ed-tab:hover .ed-tab-close,
.ed-tab.is-active .ed-tab-close { opacity: 0.7; }
.ed-tab-close:hover { background: var(--kn-active); opacity: 1 !important; }

.ed-tabs-more {
  display: inline-flex;
  align-items: center;
  padding: 0 6px;
  color: var(--ed-tab-fg);
  opacity: 0.6;
  flex-shrink: 0;
  cursor: pointer;
  transition: opacity var(--kn-dur-fast), background var(--kn-dur-fast);
}
.ed-tabs-more:hover {
  opacity: 1;
  background: var(--kn-hover);
  border-radius: 4px;
}

/* ⋯ 下拉菜单 */
.ed-more-overlay {
  position: fixed;
  inset: 0;
  z-index: 2900;
}
.ed-more-menu {
  position: fixed;
  z-index: 3000;
  padding: 6px;
  background: var(--tb-panel-bg);
  border: 1px solid var(--tb-panel-border);
  border-radius: var(--kn-radius-lg);
  box-shadow: var(--tb-panel-shadow);
  display: flex;
  flex-direction: column;
  animation: ed-more-in var(--kn-dur-fast) var(--kn-ease-out);
}
@keyframes ed-more-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ed-more-item {
  display: flex;
  align-items: center;
  padding: 7px 10px;
  border: 0;
  border-radius: var(--kn-radius-sm);
  background: transparent;
  color: var(--ed-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--kn-dur-fast);
}
.ed-more-item:hover:not(:disabled) { background: var(--kn-hover); }
.ed-more-item:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>