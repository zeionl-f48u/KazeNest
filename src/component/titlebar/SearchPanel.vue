<!--
  SearchPanel：命令面板风格搜索（覆盖式下拉）
  独立组件，便于单独修改 / 复用 / 测试
-->
<template>
  <Teleport to="body">
    <div v-if="modelValue" class="sp-overlay" @click.self="$emit('update:modelValue', false)">
      <div class="sp-panel" @keydown.stop>
        <!-- 输入区 -->
        <div class="sp-input-wrap">
          <Icon name="search" :size="15" class="sp-search-icon" />
          <input
            ref="inputRef"
            :value="query"
            class="sp-input"
            type="text"
            :placeholder="placeholder"
            @input="onInput"
            @keydown="onKeydown"
          />
          <button
            v-if="query"
            type="button"
            class="sp-clear"
            aria-label="清空"
            @click="query = ''"
          >
            <Icon name="times" :size="13" />
          </button>
          <kbd class="sp-esc" @click="$emit('update:modelValue', false)">Esc</kbd>
        </div>

        <!-- 结果列表 -->
        <div class="sp-results" ref="resultsRef">
          <div v-if="filtered.length === 0" class="sp-empty">
            <Icon name="inbox" :size="28" />
            <span>未匹配到 "{{ query }}"</span>
          </div>
          <button
            v-for="(item, i) in filtered"
            :key="item.id"
            type="button"
            class="sp-item"
            :class="{ 'is-active': i === activeIndex }"
            :style="{ '--accent': item.color }"
            @mouseenter="activeIndex = i"
            @click="select(item)"
          >
            <Icon :name="item.icon" :size="15" class="sp-item-icon" />
            <div class="sp-item-body">
              <div class="sp-item-title">{{ item.title }}</div>
              <div class="sp-item-desc">{{ item.desc }}</div>
            </div>
            <span class="sp-item-group">{{ item.group }}</span>
          </button>
        </div>

        <!-- 底部快捷键提示 -->
        <div class="sp-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
          <span><kbd>↵</kbd> 打开</span>
          <span><kbd>Esc</kbd> 关闭</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Icon } from '../common'
import type { SearchItem } from './types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    items: SearchItem[]
    /** 输入框占位文案，可自定义 */
    placeholder?: string
  }>(),
  { placeholder: '搜索设置、文件、命令…' }
)

const emit = defineEmits<{
  'update:modelValue': [boolean]
  select: [SearchItem]
}>()

const query = ref('')
const activeIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const resultsRef = ref<HTMLElement | null>(null)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter(
    (it) =>
      it.title.toLowerCase().includes(q) ||
      it.desc.toLowerCase().includes(q) ||
      it.group.toLowerCase().includes(q)
  )
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      activeIndex.value = 0
      query.value = ''
      nextTick(() => inputRef.value?.focus())
    }
  }
)

watch(filtered, () => {
  // 结果变化时把 active 拉回第一项，避免越界
  activeIndex.value = 0
})

function onInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value
}

function onKeydown(e: KeyboardEvent) {
  const n = filtered.value.length
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('update:modelValue', false)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % Math.max(n, 1)
    scrollActiveIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + n) % Math.max(n, 1)
    scrollActiveIntoView()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = filtered.value[activeIndex.value]
    if (item) select(item)
  }
}

function select(item: SearchItem) {
  emit('select', item)
  emit('update:modelValue', false)
}

function scrollActiveIntoView() {
  nextTick(() => {
    const el = resultsRef.value?.querySelector('.sp-item.is-active') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  })
}
</script>

<style scoped>
/*
  样式全用 --tb-* token；
  因为 Teleport 到 body，scoped 仍然生效（Vue 给元素加了 data-v-xxx），
  不需要 :global()，组件间不会互相污染。
*/

.sp-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  background: var(--tb-overlay-bg);
  animation: sp-fade var(--tb-transition-base);
}
@keyframes sp-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.sp-panel {
  width: var(--tb-panel-width);
  max-height: var(--tb-panel-max-height);
  display: flex;
  flex-direction: column;
  background: var(--tb-panel-bg);
  border: 1px solid var(--tb-panel-border);
  border-radius: var(--tb-panel-radius);
  box-shadow: var(--tb-panel-shadow);
  overflow: hidden;
  font-family: "Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont,
    "PingFang SC", sans-serif;
  color: var(--tb-fg);
  animation: sp-slide var(--tb-transition-slow);
}
@keyframes sp-slide {
  from { transform: translateY(-8px) scale(0.98); opacity: 0; }
  to   { transform: translateY(0)    scale(1);    opacity: 1; }
}

.sp-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--tb-item-divider);
}

.sp-search-icon { font-size: 14px; opacity: 0.6; }

.sp-input {
  flex: 1;
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
  font-size: 14px;
  color: var(--tb-fg);
  padding: 0;
}

.sp-clear {
  background: transparent;
  border: 0;
  cursor: pointer;
  color: inherit;
  opacity: 0.5;
  padding: 2px;
  border-radius: 4px;
  display: inline-flex;
  transition: opacity var(--tb-transition-fast), background var(--tb-transition-fast);
}
.sp-clear:hover { opacity: 1; background: var(--tb-hover); }

.sp-esc {
  font-family: inherit;
  font-size: 10px;
  padding: 2px 6px;
  border: 1px solid var(--tb-kbd-border);
  border-radius: 3px;
  background: var(--tb-kbd-bg);
  color: var(--tb-kbd-fg);
  cursor: pointer;
  user-select: none;
}

.sp-results {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.sp-empty {
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.55;
  font-size: 13px;
}
.sp-empty :deep(.kn-icon) { opacity: 0.7; }

.sp-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: 0;
  border-radius: 4px;
  text-align: left;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  transition: background var(--tb-transition-fast);
}
.sp-item.is-active {
  background: var(--tb-item-active);
  color: var(--tb-item-active-fg);
}
.sp-item.is-active .sp-item-group {
  background: rgba(255, 255, 255, 0.16);
  color: inherit;
}

.sp-item-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
  font-size: 14px;
  flex-shrink: 0;
}

.sp-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sp-item-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sp-item-desc {
  font-size: 11px;
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sp-item-group {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--tb-item-group-bg);
  color: var(--tb-item-group-fg);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sp-footer {
  display: flex;
  gap: 14px;
  padding: 8px 14px;
  border-top: 1px solid var(--tb-item-divider);
  font-size: 11px;
  opacity: 0.65;
}
.sp-footer kbd {
  font-family: inherit;
  font-size: 10px;
  padding: 1px 4px;
  margin-right: 3px;
  border: 1px solid var(--tb-kbd-border);
  border-radius: 3px;
  background: var(--tb-kbd-bg);
}
</style>
