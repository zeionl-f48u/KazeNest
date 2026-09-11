<!--
  CodeView：代码编辑区（逐行编辑，VS Code 风格，前端演示版）
  - 每行 = 高亮 <span> + 透明 textarea 完全重叠，天然逐字对齐（无需任何字体/滚动同步）
  - 行操作：Enter 分行、行首 Backspace 合并、↑/↓ 跨行移光标、Tab 插 2 空格
  - 查找/替换（Ctrl+F，Enter 下一个，Shift+Enter 上一个，Esc 关闭）
  - 内容通过 update 事件回传父级（Editor.vue 持有数据与未保存标记）
-->
<template>
  <div class="ed-code" @keydown.stop="onEditorKeydown">
    <!-- 行号栏（固定不横滚，垂直随 scroller 同步） -->
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

    <!-- 滚动容器：行内容一起滚动，行内高亮与输入框自动同步 -->
    <div class="ed-scroll" ref="scrollRef" @scroll="onScroll">
      <div class="ed-lines">
        <div
          v-for="(line, i) in lines"
          :key="i"
          class="ed-line"
          :class="{ 'is-active': i + 1 === activeLine }"
        >
          <!-- 高亮层（不接收事件；v-html 每敲键重渲，不影响输入框光标） -->
          <span class="ed-hl-text" v-html="highlightLine(line, marksForLine(i))" />
          <!-- 编辑层：透明文字 + 可见光标，单行原生编辑 -->
          <textarea
            :ref="(el) => setLineRef(i, el)"
            class="ed-line-input"
            rows="1"
            :value="line"
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            wrap="off"
            @input="onLineInput(i, $event)"
            @keydown="onLineKeydown(i, $event)"
            @keyup="(e) => onCursorEvent(i, e)"
            @mouseup="(e) => onCursorEvent(i, e)"
            @select="(e) => onCursorEvent(i, e)"
            @focus="(e) => onCursorEvent(i, e)"
          ></textarea>
        </div>

        <div v-if="content === ''" class="ed-empty">空文件</div>
      </div>
    </div>

    <!-- 查找/替换面板 -->
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
/** 数据模型：逐行数组，改动时以 \n 拼回整体 emit */
const lines = computed(() => content.value.split('\n'))
const lineCount = computed(() => Math.max(1, lines.value.length))

/* =================== 滚动 / 行号 =================== */

const scrollRef = ref<HTMLElement>()
const scrollTop = ref(0)
const activeLine = ref(1)

/** 行高（px，滚动计算用；运行时从 --ed-line-height 读取，避免与 token 漂移） */
let LINE_H = 21

function onScroll() {
  const sc = scrollRef.value
  if (sc) scrollTop.value = sc.scrollTop
}

/* =================== 行 refs =================== */

const lineRefs: (HTMLTextAreaElement | null)[] = []
function setLineRef(i: number, el: unknown) {
  lineRefs[i] = el ? (el as HTMLTextAreaElement) : null
}

/* =================== 光标 / 选区 =================== */

function onCursorEvent(i: number, e: Event) {
  emitCursor(i, e.target as HTMLTextAreaElement)
}

function emitCursor(i: number, ta: HTMLTextAreaElement) {
  if (!ta) return
  activeLine.value = i + 1
  emit('cursor', {
    line: i + 1,
    col: ta.selectionStart + 1,
    selected: ta.selectionEnd - ta.selectionStart,
  })
}

/* =================== 编辑 =================== */

function onLineInput(i: number, e: Event) {
  const ta = e.target as HTMLTextAreaElement
  const next = lines.value.slice()
  next[i] = ta.value
  emit('update', next.join('\n'))
  emitCursor(i, ta)
}

function onLineKeydown(i: number, e: KeyboardEvent) {
  const ta = lineRefs[i]
  if (!ta) return
  const len = lines.value.length
  const s = ta.selectionStart
  const eSel = ta.selectionEnd

  // 查找面板内的按键由面板自己处理，不走到这里（面板已 @keydown.stop）
  if (e.key === 'Tab') {
    e.preventDefault()
    insertIntoLine(i, '  ', s, eSel)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    splitLine(i, s, eSel)
  } else if (e.key === 'Backspace' && s === 0 && eSel === 0 && i > 0) {
    e.preventDefault()
    mergeLines(i)
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const target = i + (e.key === 'ArrowUp' ? -1 : 1)
    if (target < 0 || target >= len) return
    e.preventDefault()
    const col = s
    nextTick(() => {
      const tta = lineRefs[target]
      if (!tta) return
      const pos = Math.min(col, tta.value.length)
      tta.focus()
      tta.setSelectionRange(pos, pos)
      emitCursor(target, tta)
      scrollLineIntoView(target)
    })
  }
}

/** 在行内指定区间插入文本（Tab 用） */
function insertIntoLine(i: number, text: string, s: number, e: number) {
  const next = lines.value.slice()
  next[i] = next[i].slice(0, s) + text + next[i].slice(e)
  emit('update', next.join('\n'))
  nextTick(() => {
    const ta = lineRefs[i]
    if (!ta) return
    const pos = s + text.length
    ta.focus()
    ta.setSelectionRange(pos, pos)
    emitCursor(i, ta)
  })
}

/** Enter：把当前行从光标处拆成两行 */
function splitLine(i: number, s: number, e: number) {
  const next = lines.value.slice()
  const head = next[i].slice(0, s)
  const tail = next[i].slice(e)
  next[i] = head
  next.splice(i + 1, 0, tail)
  emit('update', next.join('\n'))
  nextTick(() => {
    const nta = lineRefs[i + 1]
    if (!nta) return
    nta.focus()
    nta.setSelectionRange(0, 0)
    emitCursor(i + 1, nta)
  })
}

/** 行首 Backspace：与上一行合并 */
function mergeLines(i: number) {
  const next = lines.value.slice()
  const cur = next[i]
  next[i - 1] += cur
  next.splice(i, 1)
  // 光标落在合并后行的前段末尾（= 上一行原长度），必须在 emit 前算好
  const mergePos = next[i - 1].length - cur.length
  emit('update', next.join('\n'))
  nextTick(() => {
    const pta = lineRefs[i - 1]
    if (!pta) return
    pta.focus()
    pta.setSelectionRange(mergePos, mergePos)
    emitCursor(i - 1, pta)
  })
}

/** 编辑器级按键（冒泡到外层）：Ctrl+F 打开查找 */
function onEditorKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    openFind()
  } else if (e.key === 'Escape') {
    findOpen.value = false
  }
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
  if (!findQuery.value) {
    // 打开时自动带上当前选中词（取焦点行的选区）
    for (const ta of lineRefs) {
      if (ta && document.activeElement === ta && ta.selectionStart !== ta.selectionEnd) {
        findQuery.value = ta.value.slice(ta.selectionStart, ta.selectionEnd)
        break
      }
    }
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
  lines.value.forEach((ln, li) => {
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
  if (!m) return
  const ta = lineRefs[m.line]
  if (!ta) return
  ta.focus()
  ta.setSelectionRange(m.start, m.end)
  scrollLineIntoView(m.line)
  emitCursor(m.line, ta)
}

/** 让某行滚入可视区（行高固定，纯数学计算，无需字体度量） */
function scrollLineIntoView(li: number) {
  const sc = scrollRef.value
  if (!sc) return
  const y = li * LINE_H
  if (y < sc.scrollTop || y + LINE_H > sc.scrollTop + sc.clientHeight) {
    sc.scrollTop = Math.max(0, y - LINE_H * 2)
  }
  onScroll()
}

function onFindKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); findPrev() }
  else if (e.key === 'Enter') { e.preventDefault(); findNext() }
  else if (e.key === 'Escape') { e.preventDefault(); findOpen.value = false }
}

/** 当前行的查找命中区段（current 标记当前匹配） */
function marksForLine(li: number): MarkRange[] | undefined {
  const arr = matches.value.filter((m) => m.line === li)
  if (!arr.length) return undefined
  return arr.map((m) => ({
    start: m.start,
    end: m.end,
    current: m === matches.value[activeIndex.value],
  }))
}

function replaceCurrent() {
  const m = matches.value[activeIndex.value]
  if (!m) return
  const next = lines.value.slice()
  const ln = next[m.line]
  next[m.line] = ln.slice(0, m.start) + replaceText.value + ln.slice(m.end)
  emit('update', next.join('\n'))
  onFindInput()
  // 活动项前进到替换位置之后最近的匹配
  const after = m.start + replaceText.value.length
  const idx = matches.value.findIndex((x) => x.line > m.line || (x.line === m.line && x.start >= after))
  activeIndex.value = idx >= 0 ? idx : Math.max(0, matches.value.length - 1)
  selectMatch()
}

function replaceAll() {
  if (!matches.value.length) return
  const next = lines.value.slice()
  // 从后往前替换，保证行内索引不偏移
  for (let i = matches.value.length - 1; i >= 0; i--) {
    const m = matches.value[i]
    next[m.line] = next[m.line].slice(0, m.start) + replaceText.value + next[m.line].slice(m.end)
  }
  emit('update', next.join('\n'))
  matches.value = computeMatches(findQuery.value)
  activeIndex.value = matches.value.length ? 0 : -1
}

onMounted(() => {
  // 行高从 token 读取（--ed-line-height），保证滚动计算与渲染一致
  const v = getComputedStyle(document.documentElement).getPropertyValue('--ed-line-height')
  const n = parseFloat(v)
  if (n > 0) LINE_H = n
  lineRefs[0]?.focus()
})

/* =================== 内容/文件变化 =================== */

/** 编辑代码后，查找命中的行内位置会失效，需要重算（否则高亮/跳转错位） */
watch(lines, () => {
  if (findQuery.value) {
    matches.value = computeMatches(findQuery.value)
    if (activeIndex.value > matches.value.length - 1) activeIndex.value = matches.value.length - 1
  }
})

/** 切换文件（KeepAlive 下组件常驻）：重置滚动与焦点 */
watch(
  () => props.file.id,
  () => {
    activeLine.value = 1
    scrollTop.value = 0
    const sc = scrollRef.value
    if (sc) sc.scrollTop = 0
    lineRefs[0]?.focus()
  }
)
</script>

<style scoped>
.ed-code {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
  background: var(--ed-bg);
  color: var(--ed-fg);
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

/* ==================== 滚动容器 / 行 ==================== */
.ed-scroll {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
.ed-lines {
  width: max-content;
  min-width: 100%;
}
.ed-line {
  position: relative;
  height: var(--ed-line-height);
}
.ed-line.is-active {
  background: var(--ed-line-active-bg);
}

/* 高亮层：留在文档流内（inline-block），让行的固有宽度=文本宽度，
   这样长行能被外层容器横向滚动；textarea 绝对定位覆盖它 */
.ed-hl-text {
  display: inline-block;
  height: var(--ed-line-height);
  line-height: var(--ed-line-height);
  font-family: var(--ed-font);
  font-size: var(--ed-font-size);
  font-variant-ligatures: none;
  letter-spacing: normal;
  tab-size: 2;
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;
  pointer-events: none;
}

/* 编辑层：透明文字 + 可见光标，单行、不内滚（滚动交给外层容器） */
.ed-line-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--ed-line-height);
  padding: 0;
  border: 0;
  outline: 0;
  margin: 0;
  resize: none;
  overflow: hidden;
  background: transparent;
  color: transparent;
  caret-color: var(--ed-fg);
  font-family: var(--ed-font);
  font-size: var(--ed-font-size);
  line-height: var(--ed-line-height);
  font-variant-ligatures: none;
  letter-spacing: normal;
  tab-size: 2;
  white-space: pre;
  box-sizing: border-box;
}
.ed-line-input::selection {
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
  background: var(--kn-bg-elev);
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