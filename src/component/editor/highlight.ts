/**
 * 轻量语法高亮（仅用于编辑器示例页展示）
 * 基于正则分词，输出 HTML 字符串；类名对应 editor/tokens.css 里的 .hl-*
 * 支持：注释、字符串、数字、关键字、函数调用、CSS 选择器/属性
 * 可选 marks 参数：把命中区段包进 <mark class="hl-find">（查找高亮用）
 *
 * 调节指南：
 *  - 想高亮更多语言的关键字：往 KEYWORDS 字符串里加词（用 | 分隔）
 *  - 想改高亮颜色：改 editor/tokens.css 的 --ed-hl-*（亮色/暗色两套）
 *  - 想支持更多语法种类：在 RE 数组里加一个捕获组，并在下面加一个 else if 分支
 */

const KEYWORDS =
  'const|let|var|function|return|import|from|export|default|if|else|for|while|class|interface|type|new|async|await|extends|implements|of|in|as|readonly|public|private'

const RE = new RegExp(
  [
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/.source, // 1 注释
    /('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)/.source, // 2 字符串
    /\b(\d+(?:\.\d+)?)\b/.source, // 3 数字
    new RegExp('\\b(' + KEYWORDS + ')\\b').source, // 4 关键字
    /\b([A-Za-z_$][\w$]*)(?=\()/.source, // 5 函数调用
    /(::?[\w-]+|\.[\w-]+)/.source, // 6 CSS 选择器 / 属性
  ].join('|'),
  'g'
)

/** 查找高亮的行内区段（start/end 相对该行，current 标记当前匹配） */
export interface MarkRange {
  start: number
  end: number
  current?: boolean
  /** 高亮类型：find = 查找命中（黄底）/ bracket = 括号配对（浅蓝底） */
  kind?: 'find' | 'bracket'
}

/**
 * 把一段代码渲染成带高亮 span 的 HTML
 * @param code  单行代码（不含换行）
 * @param marks 可选查找匹配区段
 */
export function highlightLine(code: string, marks?: MarkRange[]): string {
  let out = ''
  let last = 0
  RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE.exec(code)) !== null) {
    out += emitSegment(code.slice(last, m.index), last, marks, null)
    const cls = m[1] ? 'hl-comment'
      : m[2] ? 'hl-string'
      : m[3] ? 'hl-number'
      : m[4] ? 'hl-keyword'
      : m[5] ? 'hl-fn'
      : m[6] ? 'hl-selector'
      : null
    out += emitSegment(m[0], m.index, marks, cls)
    last = m.index + m[0].length
  }
  out += emitSegment(code.slice(last), last, marks, null)
  return out || '&nbsp;'
}

/**
 * 输出一段文本：无查找标记时整段一个 span；有标记时按覆盖区间拆成多个片段，
 * 被命中的片段包 <mark class="hl-find">（保留外层 token 颜色类）。
 */
function emitSegment(text: string, offset: number, marks: MarkRange[] | undefined, cls: string | null): string {
  if (!text) return ''
  if (!marks || marks.length === 0) {
    return cls ? `<span class="${cls}">${escapeHtml(text)}</span>` : escapeHtml(text)
  }
  // 逐字符覆盖率：null=未命中，'f'=查找命中，'fc'=当前查找匹配，'b'=括号配对
  const cover: (string | null)[] = new Array(text.length).fill(null)
  for (const r of marks) {
    const s = Math.max(r.start - offset, 0)
    const e = Math.min(r.end - offset, text.length)
    for (let i = s; i < e; i++) cover[i] = r.kind === 'bracket' ? 'b' : r.current ? 'fc' : 'f'
  }
  let out = ''
  let i = 0
  while (i < text.length) {
    let j = i + 1
    while (j < text.length && cover[j] === cover[i]) j++
    const piece = escapeHtml(text.slice(i, j))
    if (cover[i] !== null) {
      const inner =
        cover[i] === 'b'
          ? `<mark class="hl-bracket">${piece}</mark>`
          : `<mark class="hl-find ${cover[i] === 'fc' ? 'is-current' : ''}">${piece}</mark>`
      out += cls ? `<span class="${cls}">${inner}</span>` : inner
    } else {
      out += cls ? `<span class="${cls}">${piece}</span>` : piece
    }
    i = j
  }
  return out
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
