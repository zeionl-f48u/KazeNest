/**
 * CodeView：代码编辑区（React 版，逐行编辑）
 * - 每行 = 高亮 span + 透明 textarea 完全重叠（天然逐字对齐）
 * - Enter 分行（自动缩进）/ 行首 Backspace 合并 / ↑↓ 跨行光标 / Tab 缩进与跳转
 * - 括号自动配对、括号匹配高亮、文件级词频补全（Tab/Enter 接受）
 * - 查找替换（Ctrl+F）：Enter 下一个 / Shift+Enter 上一个 / Esc 关闭
 * - 内容经 onUpdate 回传父级（父级持有数据与未保存标记）
 *
 * React 版要点：编辑操作只 emit 内容 + 记录「待恢复的光标位置」，
 * 等父级内容回流后由 useLayoutEffect 统一恢复焦点/选区（等价于 Vue 的 nextTick）
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../common/Icon'
import { highlightLine } from './highlight'
import type { MarkRange } from './highlight'
import { indentFor, dedent, findBracketMatch, collectWords, wordBefore, candidatesFor } from './assist'
import type { EditorFile } from '@/data/editorFiles'
import './tokens.css'
import './editor.css'

const OPEN: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
const CLOSE: Record<string, string> = { ')': '(', ']': '[', '}': '{' }

interface Match {
  line: number
  start: number
  end: number
}

interface Suggestion {
  active: boolean
  line: number
  start: number
  prefix: string
  candidates: string[]
  index: number
}

const EMPTY_SUGGESTION: Suggestion = {
  active: false,
  line: 0,
  start: 0,
  prefix: '',
  candidates: [],
  index: 0,
}

export interface CodeViewProps {
  file: EditorFile
  onUpdate: (content: string) => void
  onCursor: (pos: { line: number; col: number; selected: number }) => void
}

export function CodeView({ file, onUpdate, onCursor }: CodeViewProps) {
  const content = file.content
  const lines = useMemo(() => content.split('\n'), [content])
  const lineCount = Math.max(1, lines.length)
  const wordFreq = useMemo(() => collectWords(lines), [lines])

  /* ==================== 滚动 / 行号 ==================== */

  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [activeLine, setActiveLine] = useState(1)

  /** 行高（px；挂载时从 --ed-line-height 读取，保证与渲染一致） */
  const lineHRef = useRef(21)
  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--ed-line-height')
    const n = parseFloat(v)
    if (n > 0) lineHRef.current = n
  }, [])

  const onScroll = () => {
    const sc = scrollRef.current
    if (sc) setScrollTop(sc.scrollTop)
  }

  /* ==================== 行 textarea refs ==================== */

  const lineRefs = useRef<(HTMLTextAreaElement | null)[]>([])

  /**
   * 待恢复的光标：编辑后父级内容回流，再由 layout effect 统一设置焦点与选区。
   * focus: 是否需要重新聚焦该行（Enter/合并等跨行操作）
   */
  const pendingCaret = useRef<{ line: number; start: number; focus: boolean } | null>(null)

  /* ==================== 智能辅助：括号配对 + 补全 ==================== */

  const [activeBracket, setActiveBracket] = useState<{
    open: { line: number; col: number }
    close: { line: number; col: number }
  } | null>(null)
  const [suggestion, setSuggestion] = useState<Suggestion>(EMPTY_SUGGESTION)

  const closeSuggestion = useCallback(() => setSuggestion(EMPTY_SUGGESTION), [])

  const refreshAssist = useCallback(
    (i: number, ta: HTMLTextAreaElement) => {
      const col = ta.selectionStart
      const ln = lines[i] ?? ''

      /* 括号配对：光标停在括号字符上（无选区）才找配对 */
      if (ta.selectionStart === ta.selectionEnd) {
        const hit = findBracketMatch(lines, i, col)
        setActiveBracket(hit ? { open: { line: i, col }, close: hit } : null)
      } else {
        setActiveBracket(null)
      }

      /* 补全候选：光标前有单词前缀 且 未打开查找面板 */
      if (!findOpenRef.current) {
        const { start, prefix } = wordBefore(ln, col)
        const cands = prefix ? candidatesFor(wordFreq, prefix) : []
        if (cands.length) {
          setSuggestion({ active: true, line: i, start, prefix, candidates: cands, index: 0 })
        } else {
          closeSuggestion()
        }
      } else {
        closeSuggestion()
      }
    },
    [lines, wordFreq, closeSuggestion]
  )

  /** emitCursor 的 ref 实现（供稳定回调使用；总是引用最新实现） */
  const emitCursorRef = useRef<(i: number, ta: HTMLTextAreaElement) => void>(() => {})
  useEffect(() => {
    emitCursorRef.current = (i, ta) => {
      setActiveLine(i + 1)
      onCursor({
        line: i + 1,
        col: ta.selectionStart + 1,
        selected: ta.selectionEnd - ta.selectionStart,
      })
      refreshAssist(i, ta)
    }
  }, [onCursor, refreshAssist])

  const emitCursorStable = useCallback((i: number, ta: HTMLTextAreaElement) => {
    emitCursorRef.current(i, ta)
  }, [])

  /* ==================== 编辑操作（emit 内容 + 记录待恢复光标） ==================== */

  const commitLines = useCallback(
    (next: string[], caret?: { line: number; start: number; focus?: boolean }) => {
      if (caret) pendingCaret.current = { line: caret.line, start: caret.start, focus: caret.focus ?? true }
      onUpdate(next.join('\n'))
    },
    [onUpdate]
  )

  const insertIntoLine = useCallback(
    (i: number, text: string, s: number, e: number) => {
      const next = lines.slice()
      next[i] = next[i].slice(0, s) + text + next[i].slice(e)
      commitLines(next, { line: i, start: s + text.length })
    },
    [lines, commitLines]
  )

  const splitLine = useCallback(
    (i: number, s: number, e: number) => {
      const next = lines.slice()
      const head = next[i].slice(0, s)
      const tail = next[i].slice(e)
      const indent = indentFor(lines[i - 1] ?? '', tail)
      next[i] = head
      next.splice(i + 1, 0, indent + tail)
      commitLines(next, { line: i + 1, start: indent.length })
    },
    [lines, commitLines]
  )

  const mergeLines = useCallback(
    (i: number) => {
      const next = lines.slice()
      const cur = next[i]
      next[i - 1] += cur
      const mergePos = next[i - 1].length - cur.length
      next.splice(i, 1)
      commitLines(next, { line: i - 1, start: mergePos })
    },
    [lines, commitLines]
  )

  /** 内容回流后恢复焦点/选区（等价 Vue nextTick） */
  useLayoutEffect(() => {
    const p = pendingCaret.current
    if (!p) return
    pendingCaret.current = null
    const ta = lineRefs.current[p.line]
    if (!ta) return
    if (p.focus) ta.focus()
    const pos = Math.min(p.start, ta.value.length)
    ta.setSelectionRange(pos, pos)
    emitCursorStable(p.line, ta)
  }, [content, emitCursorStable])

  /* ==================== 键盘处理 ==================== */

  const acceptSuggestion = useCallback(() => {
    const sug = suggestion
    if (!sug.active) return
    const cand = sug.candidates[sug.index]
    if (!cand) return
    const next = lines.slice()
    const ln = next[sug.line]
    next[sug.line] = ln.slice(0, sug.start) + cand + ln.slice(sug.start + sug.prefix.length)
    closeSuggestion()
    commitLines(next, { line: sug.line, start: sug.start + cand.length })
  }, [suggestion, lines, closeSuggestion, commitLines])

  const acceptIndex = (idx: number) => {
    const sug = suggestion
    if (!sug.active) return
    const cand = sug.candidates[idx]
    if (!cand) return
    const next = lines.slice()
    const ln = next[sug.line]
    next[sug.line] = ln.slice(0, sug.start) + cand + ln.slice(sug.start + sug.prefix.length)
    closeSuggestion()
    commitLines(next, { line: sug.line, start: sug.start + cand.length })
  }

  const cycleSuggestion = (dir: number) => {
    setSuggestion((s) => {
      const n = s.candidates.length
      if (!n) return s
      return { ...s, index: (s.index + dir + n) % n }
    })
  }

  const onLineKeydown = (i: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    const len = lines.length
    const s = ta.selectionStart
    const eSel = ta.selectionEnd
    const ln = lines[i]

    /* 补全弹层优先 */
    if (suggestion.active) {
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

    /* 括号自动补全 */
    if (s === eSel && OPEN[e.key]) {
      e.preventDefault()
      insertIntoLine(i, e.key + OPEN[e.key], s, eSel)
      return
    }
    /* 跳过后随的同类右括号 */
    if (s === eSel && CLOSE[e.key] && ln.charAt(s) === e.key) {
      e.preventDefault()
      ta.setSelectionRange(s + 1, s + 1)
      return
    }
    /* 成对删除 */
    if (
      e.key === 'Backspace' &&
      s > 0 &&
      s === eSel &&
      OPEN[ln.charAt(s - 1)] &&
      ln.charAt(s) === OPEN[ln.charAt(s - 1)]
    ) {
      e.preventDefault()
      const next = lines.slice()
      next[i] = ln.slice(0, s - 1) + ln.slice(s + 1)
      commitLines(next, { line: i, start: s - 1 })
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        const next = lines.slice()
        const orig = next[i]
        next[i] = dedent(orig)
        const diff = orig.length - next[i].length
        commitLines(next, { line: i, start: Math.max(0, s - diff) })
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
      const tta = lineRefs.current[target]
      if (!tta) return
      const pos = Math.min(col, tta.value.length)
      tta.focus()
      tta.setSelectionRange(pos, pos)
      emitCursorStable(target, tta)
      scrollLineIntoView(target)
    }
  }

  /* ==================== 查找 / 替换 ==================== */

  const [findOpen, setFindOpen] = useState(false)
  const findOpenRef = useRef(false)
  useEffect(() => {
    findOpenRef.current = findOpen
  }, [findOpen])
  const [findQuery, setFindQuery] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const findInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  const computeMatches = useCallback(
    (q: string): Match[] => {
      const query = q.toLowerCase()
      if (!query) return []
      const res: Match[] = []
      lines.forEach((ln, li) => {
        const low = ln.toLowerCase()
        let idx = low.indexOf(query)
        while (idx !== -1) {
          res.push({ line: li, start: idx, end: idx + query.length })
          idx = low.indexOf(query, idx + query.length)
        }
      })
      return res
    },
    [lines]
  )

  const scrollLineIntoView = useCallback((li: number) => {
    const sc = scrollRef.current
    if (!sc) return
    const LINE_H = lineHRef.current
    const y = li * LINE_H
    if (y < sc.scrollTop || y + LINE_H > sc.scrollTop + sc.clientHeight) {
      sc.scrollTop = Math.max(0, y - LINE_H * 2)
    }
    setScrollTop(sc.scrollTop)
  }, [])

  const selectMatch = useCallback(
    (list: Match[], index: number) => {
      const m = list[index]
      if (!m) return
      const ta = lineRefs.current[m.line]
      if (!ta) return
      ta.focus()
      ta.setSelectionRange(m.start, m.end)
      scrollLineIntoView(m.line)
      emitCursorStable(m.line, ta)
    },
    [scrollLineIntoView, emitCursorStable]
  )

  const openFind = useCallback(() => {
    setFindOpen(true)
    /* 带上当前选中词 */
    setFindQuery((q) => {
      if (q) return q
      for (const ta of lineRefs.current) {
        if (ta && document.activeElement === ta && ta.selectionStart !== ta.selectionEnd) {
          return ta.value.slice(ta.selectionStart, ta.selectionEnd)
        }
      }
      return q
    })
  }, [])

  /* 打开查找后聚焦输入框 */
  useEffect(() => {
    if (findOpen) {
      const t = window.setTimeout(() => {
        findInputRef.current?.focus()
        findInputRef.current?.select()
      }, 20)
      return () => window.clearTimeout(t)
    }
  }, [findOpen])

  /* 查询词变化 → 重算命中并选中第一个 */
  useEffect(() => {
    if (!findOpen) return
    const list = computeMatches(findQuery)
    setMatches(list)
    const idx = list.length ? 0 : -1
    setActiveIndex(idx)
    if (idx >= 0) selectMatch(list, idx)
  }, [findQuery, findOpen, computeMatches, selectMatch])

  /* 内容变化（编辑后）：重算命中位置，避免高亮/跳转错位 */
  useEffect(() => {
    if (!findQuery) return
    const list = computeMatches(findQuery)
    setMatches(list)
    setActiveIndex((i) => Math.min(Math.max(i, 0), list.length - 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  const findNext = () => {
    if (!matches.length) return
    const next = (activeIndex + 1) % matches.length
    setActiveIndex(next)
    selectMatch(matches, next)
  }

  const findPrev = () => {
    if (!matches.length) return
    const prev = (activeIndex - 1 + matches.length) % matches.length
    setActiveIndex(prev)
    selectMatch(matches, prev)
  }

  const replaceCurrent = () => {
    const m = matches[activeIndex]
    if (!m) return
    const next = lines.slice()
    const ln = next[m.line]
    next[m.line] = ln.slice(0, m.start) + replaceText + ln.slice(m.end)
    commitLines(next, { line: m.line, start: m.start, focus: false })
    const list = computeMatches(findQuery)
    setMatches(list)
    const after = m.start + replaceText.length
    const idx = list.findIndex(
      (x) => x.line > m.line || (x.line === m.line && x.start >= after)
    )
    const nextIdx = idx >= 0 ? idx : Math.max(0, list.length - 1)
    setActiveIndex(nextIdx)
    window.setTimeout(() => selectMatch(list, nextIdx), 0)
  }

  const replaceAll = () => {
    if (!matches.length) return
    const next = lines.slice()
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i]
      next[m.line] = next[m.line].slice(0, m.start) + replaceText + next[m.line].slice(m.end)
    }
    commitLines(next)
    const list = computeMatches(findQuery)
    setMatches(list)
    setActiveIndex(list.length ? 0 : -1)
  }

  /* ==================== 高亮标记 ==================== */

  const marksForLine = (li: number): MarkRange[] | undefined => {
    const arr: MarkRange[] = []
    for (const m of matches) {
      if (m.line === li) {
        arr.push({
          start: m.start,
          end: m.end,
          current: m === matches[activeIndex],
          kind: 'find',
        })
      }
    }
    if (activeBracket) {
      if (activeBracket.open.line === li) {
        arr.push({
          start: activeBracket.open.col,
          end: activeBracket.open.col + 1,
          kind: 'bracket',
        })
      }
      if (activeBracket.close.line === li) {
        arr.push({
          start: activeBracket.close.col,
          end: activeBracket.close.col + 1,
          kind: 'bracket',
        })
      }
    }
    return arr.length ? arr : undefined
  }

  /* ==================== 补全弹层定位 ==================== */

  const suggestPos = useMemo(() => {
    const sug = suggestion
    const sc = scrollRef.current
    if (!sug.active || !sc) return { left: 0, top: 0 }
    const meas = document.createElement('span')
    meas.className = 'ed-hl-text'
    meas.style.position = 'absolute'
    meas.style.visibility = 'hidden'
    sc.appendChild(meas)
    meas.textContent = (lines[sug.line] ?? '').slice(0, sug.start)
    const w = meas.offsetWidth
    meas.remove()
    return {
      left: w - sc.scrollLeft,
      top: (sug.line + 1) * lineHRef.current - sc.scrollTop,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion, scrollTop, lines])

  /* ==================== 全局快捷键（Ctrl+F / Esc） ==================== */

  const onEditorKeydown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault()
      openFind()
    } else if (e.key === 'Escape') {
      setFindOpen(false)
    }
  }

  /* 切换文件：重置滚动与焦点 */
  useEffect(() => {
    setActiveLine(1)
    setScrollTop(0)
    const sc = scrollRef.current
    if (sc) sc.scrollTop = 0
    lineRefs.current[0]?.focus()
    setActiveBracket(null)
    closeSuggestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id])

  useEffect(() => {
    lineRefs.current[0]?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* 内容变化：括号配对/补全位置会失效，清除 */
  useEffect(() => {
    setActiveBracket(null)
    if (!findOpenRef.current) closeSuggestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  /* ==================== 渲染 ==================== */

  return (
    <div className="ed-code" onKeyDown={onEditorKeydown}>
      {/* 行号栏（跟随滚动） */}
      <div className="ed-gutter" aria-hidden="true">
        <div className="ed-gutter-inner" style={{ transform: `translateY(${-scrollTop}px)` }}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} className={`ed-ln${i + 1 === activeLine ? ' is-active' : ''}`}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* 滚动容器 */}
      <div className="ed-scroll" ref={scrollRef} onScroll={onScroll}>
        <div className="ed-lines">
          {lines.map((line, i) => (
            <div key={i} className={`ed-line${i + 1 === activeLine ? ' is-active' : ''}`}>
              <span
                className="ed-hl-text"
                dangerouslySetInnerHTML={{ __html: highlightLine(line, marksForLine(i)) }}
              />
              <textarea
                ref={(el) => {
                  lineRefs.current[i] = el
                }}
                className="ed-line-input"
                rows={1}
                value={line}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                wrap="off"
                onChange={(e) => {
                  const next = lines.slice()
                  next[i] = e.target.value
                  onUpdate(next.join('\n'))
                  queueMicrotask(() => emitCursorStable(i, e.target))
                }}
                onKeyDown={(e) => onLineKeydown(i, e)}
                onKeyUp={(e) => emitCursorStable(i, e.currentTarget)}
                onMouseUp={(e) => emitCursorStable(i, e.currentTarget)}
                onSelect={(e) => emitCursorStable(i, e.currentTarget)}
                onFocus={(e) => emitCursorStable(i, e.currentTarget)}
              />
            </div>
          ))}

          {content === '' && <div className="ed-empty">空文件</div>}
        </div>
      </div>

      {/* 补全弹层 */}
      {suggestion.active && (
        <div className="ed-suggest" style={suggestPos} onMouseDown={(e) => e.preventDefault()}>
          {suggestion.candidates.map((c, idx) => (
            <div
              key={c}
              className={`ed-suggest-item${idx === suggestion.index ? ' is-active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                acceptIndex(idx)
              }}
            >
              {c}
            </div>
          ))}
        </div>
      )}

      {/* 查找/替换 */}
      {findOpen && (
        <div
          className="ed-find"
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter' && e.shiftKey) {
              e.preventDefault()
              findPrev()
            } else if (e.key === 'Enter') {
              e.preventDefault()
              findNext()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setFindOpen(false)
            }
          }}
        >
          <div className="ed-find-row">
            <input
              ref={findInputRef}
              className="ed-find-input"
              type="text"
              placeholder="查找"
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
            />
            <span className="ed-find-count">
              {matches.length > 0 ? `${activeIndex + 1}/${matches.length}` : '无结果'}
            </span>
            <button className="ed-find-btn" title="上一个 (Shift+Enter)" onClick={findPrev}>
              <Icon name="chevron-up" size={12} />
            </button>
            <button className="ed-find-btn" title="下一个 (Enter)" onClick={findNext}>
              <Icon name="chevron-down" size={12} />
            </button>
            <button className="ed-find-btn" title="替换" onClick={replaceCurrent}>
              替换
            </button>
            <button className="ed-find-btn" title="全部替换" onClick={replaceAll}>
              全部替换
            </button>
            <button className="ed-find-btn" title="关闭 (Esc)" onClick={() => setFindOpen(false)}>
              <Icon name="times" size={12} />
            </button>
          </div>
          <div className="ed-find-row">
            <input
              ref={replaceInputRef}
              className="ed-find-input"
              type="text"
              placeholder="替换为"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  replaceCurrent()
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
