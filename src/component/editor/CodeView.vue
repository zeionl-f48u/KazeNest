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

    <!-- 行内补全提示（光标下方；Tab/Enter 接受，Esc 关闭） -->
    <div
      v-if="suggestion.active"
      class="ed-suggest"
      :style="suggestPos"
      @mousedown.prevent
    >
      <div
        v-for="(c, idx) in suggestion.candidates"
        :key="c"
        class="ed-suggest-item"
        :class="{ 'is-active': idx === suggestion.index }"
        @mousedown.prevent="() => acceptIndex(idx)"
      >{{ c }}</div>
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
import { indentFor, dedent, findBracketMatch, collectWords, wordBefore, candidatesFor } from './assist'
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
  // 智能辅助跟随光标：括号配对高亮 + 补全候选
  refreshAssist(i, ta)
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
  const ln = lines.value[i]

  // 补全弹层打开时：Tab/Enter 接受候选，↑/↓ 切换候选，Esc 关闭（优先于普通 Tab 缩进/行移动）
  if (suggestion.value.active) {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      acceptSuggestion()
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      cycleSuggestion(e.key === 'ArrowDown' ? 1 : -1)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      closeSuggestion()
      return
    }
  }

  // 括号自动补全：输入开括号 → 成对插入，光标居中
  if (s === eSel && OPEN[e.key]) {
    e.preventDefault()
    insertIntoLine(i, e.key + OPEN[e.key], s, eSel)
    nextTick(() => {
      const t = lineRefs[i]
      if (t) t.setSelectionRange(s + 1, s + 1)
    })
    return
  }
  // 光标紧跟同类型右括号：输入时跳过（不重复插入）
  if (s === eSel && CLOSE[e.key] && ln.charAt(s) === e.key) {
    e.preventDefault()
    ta.setSelectionRange(s + 1, s + 1)
    return
  }
  // Backspace 删除左括号且后随配对右括号：成对删除
  if (e.key === 'Backspace' && s > 0 && s === eSel && OPEN[ln.charAt(s - 1)] && ln.charAt(s) === OPEN[ln.charAt(s - 1)]) {
    e.preventDefault()
    const next = lines.value.slice()
    next[i] = ln.slice(0, s - 1) + ln.slice(s + 1)
    emit('update', next.join('\n'))
    nextTick(() => {
      const t = lineRefs[i]
      if (t) {
        t.focus()
        t.setSelectionRange(s - 1, s - 1)
        emitCursor(i, t)
      }
    })
    return
  }

  // 查找面板内的按键由面板自己处理，不走到这里（面板已 @keydown.stop）
  if (e.key === 'Tab') {
    e.preventDefault()
    if (e.shiftKey) {
      // Shift+Tab：删除行首一段缩进（自动缩进功能的"反缩进"配套）
      const next = lines.value.slice()
      const orig = next[i]
      next[i] = dedent(orig)
      const diff = orig.length - next[i].length
      emit('update', next.join('\n'))
      nextTick(() => {
        const t = lineRefs[i]
        if (t) {
          t.focus()
          t.setSelectionRange(Math.max(0, s - diff), Math.max(0, s - diff))
        }
      })
    } else {
      insertIntoLine(i, '  ', s, eSel)
    }
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

/** Enter：把当前行从光标处拆成两行（自动继承缩进） */
function splitLine(i: number, s: number, e: number) {
  const next = lines.value.slice()
  const head = next[i].slice(0, s)
  const tail = next[i].slice(e)
  const indent = indentFor(lines.value[i - 1] ?? '', tail)
  next[i] = head
  next.splice(i + 1, 0, indent + tail)
  emit('update', next.join('\n'))
  nextTick(() => {
    const nta = lineRefs[i + 1]
    if (!nta) return
    nta.focus()
    nta.setSelectionRange(indent.length, indent.length)
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

/** 当前行的查找命中区段 + 括号配对区段（current 标记当前匹配） */
function marksForLine(li: number): MarkRange[] | undefined {
  const arr: MarkRange[] = []
  for (const m of matches.value.filter((x) => x.line === li)) {
    arr.push({ start: m.start, end: m.end, current: m === matches.value[activeIndex.value], kind: 'find' })
  }
  if (activeBracket.value) {
    if (activeBracket.value.open.line === li) {
      arr.push({ start: activeBracket.value.open.col, end: activeBracket.value.open.col + 1, kind: 'bracket' })
    }
    if (activeBracket.value.close.line === li) {
      arr.push({ start: activeBracket.value.close.col, end: activeBracket.value.close.col + 1, kind: 'bracket' })
    }
  }
  return arr.length ? arr : undefined
}

/* =================== 智能辅助：括号配对 + 补全 =================== */

const OPEN: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
const CLOSE: Record<string, string> = { ')': '(', ']': '[', '}': '{' }

/** 当前光标处的括号配对（open/close 的 0 基行列位置；光标不在括号上为 null） */
const activeBracket = ref<{ open: { line: number; col: number }; close: { line: number; col: number } } | null>(null)

/** 补全候选词库：内容变化时重建（文件级词频） */
const wordFreq = ref<Map<string, number>>(new Map())

/** 补全弹层状态（active 时显示在光标下方；index 为高亮候选项） */
const suggestion = ref<{ active: boolean; line: number; start: number; prefix: string; candidates: string[]; index: number }>({
  active: false,
  line: 0,
  start: 0,
  prefix: '',
  candidates: [],
  index: 0,
})

/** 光标事件后刷新：括号配对高亮 + 补全候选 */
function refreshAssist(i: number, ta: HTMLTextAreaElement) {
  const col = ta.selectionStart
  const ln = lines.value[i] ?? ''

  // 括号配对：光标停在括号字符上（无选区时）才找配对
  if (ta.selectionStart === ta.selectionEnd) {
    const hit = findBracketMatch(lines.value, i, col)
    activeBracket.value = hit ? { open: { line: i, col }, close: hit } : null
  } else {
    activeBracket.value = null
  }

  // 补全候选：光标前有 1+ 字符的单词前缀 且 未打开查找面板
  if (!findOpen.value) {
    const { start, prefix } = wordBefore(ln, col)
    const cands = prefix ? candidatesFor(wordFreq.value, prefix) : []
    if (cands.length) {
      suggestion.value = { active: true, line: i, start, prefix, candidates: cands, index: 0 }
    } else {
      closeSuggestion()
    }
  } else {
    closeSuggestion()
  }
}

/** 关闭补全弹层 */
function closeSuggestion() {
  suggestion.value = { active: false, line: 0, start: 0, prefix: '', candidates: [], index: 0 }
}

/** 接受当前高亮候选项：把前缀替换为完整词 */
function acceptSuggestion() {
  const sug = suggestion.value
  if (!sug.active) return
  const cand = sug.candidates[sug.index]
  if (!cand) return
  const next = lines.value.slice()
  const ln = next[sug.line]
  next[sug.line] = ln.slice(0, sug.start) + cand + ln.slice(sug.start + sug.prefix.length)
  emit('update', next.join('\n'))
  const caret = sug.start + cand.length
  closeSuggestion()
  nextTick(() => {
    const t = lineRefs[sug.line]
    if (t) {
      t.focus()
      t.setSelectionRange(caret, caret)
      emitCursor(sug.line, t)
    }
  })
}

/** 切换补全候选（↑/↓；循环） */
function cycleSuggestion(dir: number) {
  const n = suggestion.value.candidates.length
  if (!n) return
  suggestion.value.index = (suggestion.value.index + dir + n) % n
}

/** 补全弹层在滚动容器内的定位（基于高亮 span 的真实像素宽度） */
function suggestPosition() {
  const sug = suggestion.value
  const sc = scrollRef.value
  if (!sug.active || !sc) return { left: 0, top: 0 }
  // 测量前缀文本宽度：临时 span 复用 .ed-hl-text 的字体度量
  const meas = document.createElement('span')
  meas.className = 'ed-hl-text'
  meas.style.position = 'absolute'
  meas.style.visibility = 'hidden'
  sc.appendChild(meas)
  meas.textContent = lines.value[sug.line].slice(0, sug.start)
  const w = meas.offsetWidth
  meas.remove()
  return { left: w - sc.scrollLeft, top: (sug.line + 1) * LINE_H - sc.scrollTop }
}

/** 弹层定位（模板用） */
const suggestPos = computed(() => suggestPosition())

/** 鼠标点选某个候选项（模板用） */
function acceptIndex(idx: number) {
  suggestion.value.index = idx
  acceptSuggestion()
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
    wordFreq.value = collectWords(lines.value)
    activeBracket.value = null
    closeSuggestion()
  }
)

/** 内容变化：重建补全词库 + 失效括号配对/补全（编辑后位置会错位） */
watch(
  lines,
  () => {
    wordFreq.value = collectWords(lines.value)
    activeBracket.value = null
    if (!findQuery.value) closeSuggestion()
  },
  { deep: true }
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

/* 行内补全弹层：跟随光标（定位在光标下方），VS Code 风格候选列表 */
.ed-suggest {
  position: absolute;
  z-index: 30;
  min-width: 160px;
  max-width: 280px;
  max-height: 180px;
  overflow-y: auto;
  padding: 4px;
  background: var(--kn-bg-elev);
  border: 1px solid var(--kn-border-strong);
  border-radius: var(--kn-radius-lg);
  box-shadow: var(--kn-shadow-lg);
  font-family: var(--kn-font-sans);
  font-size: var(--kn-text-sm);
  animation: ed-suggest-in var(--kn-dur-base) var(--kn-ease-out);
}
@keyframes ed-suggest-in {
  from { opacity: 0; transform: translateY(-2px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ed-suggest-item {
  padding: 4px 8px;
  border-radius: var(--kn-radius-sm);
  color: var(--ed-fg);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--kn-font-mono);
}
.ed-suggest-item.is-active {
  background: var(--kn-selected);
  color: var(--kn-fg);
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