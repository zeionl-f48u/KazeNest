/**
 * 轻量语法高亮（仅用于编辑器示例页展示）
 * 基于正则分词，输出 HTML 字符串；类名对应 editor/tokens.css 里的 .hl-*
 * 支持：注释、字符串、数字、关键字、函数调用、CSS 选择器/属性
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

/**
 * 把一段代码渲染成带高亮 span 的 HTML
 */
export function highlightLine(code: string): string {
  let out = ''
  let last = 0
  RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE.exec(code)) !== null) {
    out += escapeHtml(code.slice(last, m.index))
    if (m[1]) out += `<span class="hl-comment">${m[1]}</span>`
    else if (m[2]) out += `<span class="hl-string">${m[2]}</span>`
    else if (m[3]) out += `<span class="hl-number">${m[3]}</span>`
    else if (m[4]) out += `<span class="hl-keyword">${m[4]}</span>`
    else if (m[5]) out += `<span class="hl-fn">${m[5]}</span>`
    else if (m[6]) out += `<span class="hl-selector">${m[6]}</span>`
    last = m.index + m[0].length
  }
  out += escapeHtml(code.slice(last))
  return out || '&nbsp;'
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
