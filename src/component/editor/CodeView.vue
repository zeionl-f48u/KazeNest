<!--
  CodeView：代码编辑区（VS Code 风格，前端演示版）
  - 可编辑：透明 textarea 叠加在语法高亮层上，原生光标/选区/撤销/拼写
  - 行号栏 + 活动行高亮 + 滚动三向同步（gutter / 高亮层 / textarea）
  - 查找/替换面板（Ctrl+F 打开，Enter 下一个，Shift+Enter 上一个，Esc 关闭）
  - 内容通过 update 事件回传父级（Editor.vue 持有真实数据与未保存标记）
-->
<template>
  <div class="ed-code" @keydown.stop="onGlobalKeydown">
    <!-- 行号栏（与代码区同步滚动） -->
    <div class="ed-gutter" aria-hidden="true">
      <div class="ed-gutter-inner" :style="{ transform: `translateY(${-scrollTop}px)` }">
        <div
          v-for="i in lineCount"
          :key="i"
          class="ed-ln"
          :class="{ 'is-active': i === activeLine }"
        >{{ i }}</div>
      </div>
    </div>

    <!-- 代码区 -->
    <div class="ed-body">
      <!-- 高亮层（垫底，不接收事件；随 textarea 滚动同步） -->
      <pre class="ed-hl" ref="hlRef" aria-hidden="true"><code v-html="highlightedLines"></code></pre>

      <!-- 编辑层（文字透明 + 可见光标/选区，原生编辑） -->
      <textarea
        ref="taRef"
        class="ed-input"
        :value="content"
        spellcheck="false"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        wrap="off"
        @input="onInput"
        @keydown="onKeydown"
        @keyup="onCursorChange"
        @mouseup="onCursorChange"
        @select="onCursorChange"
        @scroll="onScroll"
      ></textarea>

      <div v-if="content === ''" class="ed-empty">空文件</div>
    </div>

    <!-- 查找/替换面板（VS Code 风格，悬浮右下角） -->
    <div v-if="findOpen" class="ed-find" @keydown.stop="onFindKeydown">
      <div class="ed-find-row">
        <input
          ref="findInputRef"
          v-model="findQuery"
          class="ed-find-input"
          type="text"
          placeholder="查找"
          @input="onFindInput"
        />
        <span class="ed-find-count">
          {{ matches.length > 0 ? `${activeIndex + 1}/${matches.length}` : '无结果' }}
        </span>
        <button class="ed-find-btn" title="上一个 (Shift+Enter)" @click="findPrev">
          <Icon name="chevron-up" :size="12" />
        </button>
        <button class="ed-find-btn" title="下一个 (Enter)" @click="findNext">
          <Icon name="chevron-down" :size="12" />
        </button>
        <button class="ed-find-btn" title="替换 (Enter)" @click="replaceCurrent">替换</button>
        <button class="ed-find-btn" title="全部替换" @click="replaceAll">全部替换</button>
        <button class="ed-find-btn" title="关闭 (Esc)" @click="findOpen = false">
          <Icon name="times" :size="12" />
        </button>
      </div>
      <div class="ed-find-row">
        <input
          v-model="replaceText"
          class="ed-find-input"
          type="text"
          placeholder="替换为"
          @keydown.enter.prevent="replaceCurrent"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Icon } from '../common'
import { highlightLine } from './highlight'
import type { MarkRange } from './highlight'
import type { EditorFile } from '../../data/editorFiles'

const props = defineProps<{
  file: EditorFile
}>()

const emit = defineEmits<{
  /** 内容变更（父级持有数据，负责标记未保存） */
  update: [content: string]
  /** 光标/选区变化：行/列/选中字符数 */
  cursor: [{ line: number; col: number; selected: number }]
}>()

const content = computed(() => props.file.content)
const lineCount = computed(() => (content.value === '' ? 1 : content.value.split('\n').length))

/* =================== 行号 / 高亮 =================== */

const taRef = ref<HTMLTextAreaElement | null>(null)
const hlRef = ref<HTMLPreElement | null>(null)
const scrollTop = ref(0)
const activeLine = ref(1)

/** 每行起始偏移（字符序号 → 行列换算用） */
const lineOffsets = computed(() => {
  const offs: number[] = []
  let acc = 0
  for (const line of content.value.split('\n')) {
    offs.push(acc)
    acc += line.length + 1
  }
  return offs
})

const highlightedLines = computed(() => {
  const marksByLine = new Map<number, MarkRange[]>()
  for (const m of matches.value) {
    const arr = marksByLine.get(m.line) ?? []
    arr.push({ start: m.start, end: m.end, current: m === matches.value[activeIndex.value] })
    marksByLine.set(m.line, arr)
  }
  return content.value
    .split('\n')
    .map((ln, i) => `<div class="ed-hl-line"${i + 1 === activeLine.value ? ' is-active' : ''}>${highlightLine(ln, marksByLine.get(i))}</div>`)
    .join('\n')
})

/* =================== 光标 / 选区 =================== */

function cursorPos(): { line: number; col: number; selected: number } {
  const ta = taRef.value
  if (!ta) return { line: 1, col: 1, selected: 0 }
  const selStart = ta.selectionStart
  const selEnd = ta.selectionEnd
  const offs = lineOffsets.value
  let line = 1
  for (let i = 0; i < offs.length; i++) {
    if (offs[i] > selStart) break
    line = i + 1
  }
  const col = selStart - (offs[line - 1] ?? 0) + 1
  return { line, col, selected: selEnd - selStart }
}

function onCursorChange() {
  const p = cursorPos()
  activeLine.value = p.line
  emit('cursor', p)
}

/* =================== 滚动同步 =================== */

function onScroll() {
  const ta = taRef.value
  if (!ta) return
  scrollTop.value = ta.scrollTop
  const hl = hlRef.value
  if (hl) {
    hl.scrollTop = ta.scrollTop
    hl.scrollLeft = ta.scrollLeft
  }
}

/* =================== 编辑 =================== */

function onInput() {
  const ta = taRef.value
  if (!ta) return
  emit('update', ta.value)
  onScroll()
  onCursorChange()
}

function onKeydown(e: KeyboardEvent) {
  // 焦点在查找面板内时不处理编辑快捷键
  if ((e.target as HTMLElement | null)?.closest?.('.ed-find')) return
  if (e.key === 'Tab') {
    e.preventDefault()
    insertText('  ')
  } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    openFind()
  }
}

function onGlobalKeydown(e: KeyboardEvent) {
  // 输入框里按 Ctrl+F 由 onKeydown 处理，这里只兜底全局（如焦点在状态栏）
  if ((e.target as HTMLElement | null)?.closest?.('textarea, input')) return
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    openFind()
  }
}

/** Tab 键插入两个空格（VS Code 默认 tabSize=2） */
function insertText(text: string) {
  const ta = taRef.value
  if (!ta) return
  const s = ta.selectionStart
  const e = ta.selectionEnd
  emit('update', content.value.slice(0, s) + text + content.value.slice(e))
  nextTick(() => {
    ta.focus()
    const pos = s + text.length
    ta.setSelectionRange(pos, pos)
    onCursorChange()
  })
}

/* =================== 查找 / 替换 =================== */

interface Match { line: number; start: number; end: number }

const findOpen = ref(false)
const findQuery = ref('')
const replaceText = ref('')
const matches = ref<Match[]>([])
const activeIndex = ref(0)
const findInputRef = ref<HTMLInputElement | null>(null)

function openFind() {
  findOpen.value = true
  if (!findQuery.value && taRef.value) {
    // 打开时自动带上当前选中词
    const sel = taRef.value.value.slice(taRef.value.selectionStart, taRef.value.selectionEnd)
    findQuery.value = sel
  }
  nextTick(() => {
    findInputRef.value?.focus()
    findInputRef.value?.select()
  })
  onFindInput()
}

function computeMatches(q: string): Match[] {
  const query = q.toLowerCase()
  if (!query) return []
  const res: Match[] = []
  content.value.split('\n').forEach((ln, li) => {
    const low = ln.toLowerCase()
    let idx = low.indexOf(query)
    while (idx !== -1) {
      res.push({ line: li, start: idx, end: idx + query.length })
      idx = low.indexOf(query, idx + query.length)
    }
  })
  return res
}

function onFindInput() {
  matches.value = computeMatches(findQuery.value)
  activeIndex.value = matches.value.length ? 0 : -1
  selectMatch()
}

function findNext() {
  if (!matches.value.length) return
  activeIndex.value = (activeIndex.value + 1) % matches.value.length
  selectMatch()
}

function findPrev() {
  if (!matches.value.length) return
  activeIndex.value = (activeIndex.value - 1 + matches.value.length) % matches.value.length
  selectMatch()
}

function selectMatch() {
  const m = matches.value[activeIndex.value]
  const ta = taRef.value
  if (!m || !ta) return
  const pos = lineOffsets.value[m.line] + m.start
  ta.focus()
  ta.setSelectionRange(pos, pos + (m.end - m.start))
  scrollToMatch(m)
  onCursorChange()
}

function scrollToMatch(m: Match) {
  const ta = taRef.value
  if (!ta) return
  const cs = getComputedStyle(ta)
  const lh = parseFloat(cs.lineHeight) || 21
  const topPad = parseFloat(cs.paddingTop) || 10
  const y = m.line * lh + topPad
  const cur = ta.scrollTop
  const h = ta.clientHeight
  if (y < cur || y + lh > cur + h) ta.scrollTop = Math.max(0, y - lh * 2)
  onScroll()
}

function onFindKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); findPrev() }
  else if (e.key === 'Enter') { e.preventDefault(); findNext() }
  else if (e.key === 'Escape') { e.preventDefault(); findOpen.value = false }
}

function replaceCurrent() {
  const m = matches.value[activeIndex.value]
  if (!m) return
  const pos = lineOffsets.value[m.line] + m.start
  const len = m.end - m.start
  emit('update', content.value.slice(0, pos) + replaceText.value + content.value.slice(pos + len))
  // 内容变化后重算匹配；活动项前进到替换位置之后最近的匹配
  onFindInput()
  const nextPos = lineOffsets.value[m.line] + m.start + replaceText.value.length
  const idx = matches.value.findIndex((x) => lineOffsets.value[x.line] + x.start >= nextPos)
  activeIndex.value = idx >= 0 ? idx : Math.max(0, matches.value.length - 1)
  selectMatch()
}

function replaceAll() {
  if (!matches.value.length) return
  const lines = content.value.split('\n')
  // 从后往前替换，保证行内索引不偏移
  for (let i = matches.value.length - 1; i >= 0; i--) {
    const m = matches.value[i]
    const ln = lines[m.line]
    lines[m.line] = ln.slice(0, m.start) + replaceText.value + ln.slice(m.end)
  }
  emit('update', lines.join('\n'))
  matches.value = computeMatches(findQuery.value)
  activeIndex.value = matches.value.length ? 0 : -1
}

/* =================== 内容外部变化（如 Replace）后重算匹配 =================== */
watch(content, () => {
  if (findQuery.value) {
    matches.value = computeMatches(findQuery.value)
    if (activeIndex.value > matches.value.length - 1) activeIndex.value = matches.value.length - 1
  }
})

onMounted(() => {
  // 进入编辑器自动聚焦，可立即输入
  taRef.value?.focus()
})
</script>

<style scoped>
.ed-code {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: var(--ed-bg);
  color: var(--ed-fg);
  display: flex;
  cursor: text;
}

/* ==================== 行号栏 ==================== */
.ed-gutter {
  flex-shrink: 0;
  width: 56px;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}
.ed-gutter-inner {
  padding: 10px 0 16px;
  will-change: transform;
}
.ed-ln {
  height: var(--ed-line-height);
  line-height: var(--ed-line-height);
  padding-right: 14px;
  text-align: right;
  color: var(--ed-gutter-fg);
  transition: color var(--kn-dur-fast);
}
.ed-gutter:hover .ed-ln { color: var(--ed-gutter-fg-hover); }
.ed-ln.is-active { color: var(--ed-gutter-fg-active); }

/* ==================== 代码区（高亮层 + 编辑层） ==================== */
.ed-body {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

/* 高亮层：垫底，不接收事件；与 textarea 相同的字体/行距/内边距保证逐字对齐 */
.ed-hl {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 10px 0 16px;
  overflow: hidden;
  pointer-events: none;
  font-family: var(--ed-font);
  font-size: var(--ed-font-size);
  line-height: var(--ed-line-height);
  tab-size: 2;
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;
}
.ed-hl code {
  display: block;
  white-space: pre;
}
.ed-hl-line {
  min-height: var(--ed-line-height);
}
.ed-hl-line.is-active {
  background: var(--ed-line-active-bg);
}

/* 编辑层：文字透明 + 可见光标，覆盖整个代码区 */
.ed-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 10px 0 16px;
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  color: transparent;
  caret-color: var(--ed-fg);
  font-family: var(--ed-font);
  font-size: var(--ed-font-size);
  line-height: var(--ed-line-height);
  tab-size: 2;
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;
  overflow: auto;
  box-sizing: content-box;
}
.ed-input::selection {
  background: rgba(99, 102, 241, 0.25);
  color: transparent;
}

/* 空文件提示 */
.ed-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ed-gutter-fg);
  font-family: var(--kn-font-sans);
  pointer-events: none;
}

/* ==================== 查找/替换面板 ==================== */
.ed-find {
  position: absolute;
  right: 12px;
  bottom: 8px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: var(--ed-find-bg);
  border: 1px solid var(--ed-find-border);
  border-radius: var(--kn-radius-lg);
  box-shadow: var(--kn-shadow-lg);
  animation: ed-find-in var(--kn-dur-base) var(--kn-ease-out);
}
@keyframes ed-find-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ed-find-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ed-find-input {
  width: 200px;
  padding: 4px 8px;
  border: 1px solid var(--ed-find-border);
  border-radius: var(--kn-radius-sm);
  background: var(--ed-bg-elev, var(--kn-bg-elev));
  color: var(--ed-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  outline: none;
}
.ed-find-input:focus {
  border-color: var(--kn-brand-500);
}
.ed-find-count {
  min-width: 52px;
  text-align: center;
  font-size: var(--kn-text-xs);
  color: var(--ed-status-fg);
  white-space: nowrap;
}
.ed-find-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--kn-radius-sm);
  background: transparent;
  color: var(--ed-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--kn-dur-fast);
}
.ed-find-btn:hover { background: var(--kn-hover); }
</style>