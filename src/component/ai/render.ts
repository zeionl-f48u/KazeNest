/**
 * AI 消息渲染器（纯函数，无组件依赖）
 * 把助手/用户消息文本渲染为安全的 HTML 片段：
 *   - ```lang\n code \n``` 围栏代码块 → 带语言标签的 <pre><code class="lang-xxx">
 *   - `行内代码` → <code>
 *   - **粗体** / *斜体* / ~~删除线~~ / [链接](url) / > 引用 / - 列表
 * 输入输出均为字符串（调用方用 v-html 渲染）。
 *
 * 设计说明：这是为 AI 演示准备的轻量渲染器，只覆盖常见子集。
 * 若需要完整 Markdown 支持，接入 marked + highlight.js 替代本文件即可。
 */
import { highlightLine } from './highlight'

/* =================== 转义 =================== */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/* =================== 行内样式 =================== */

const INLINE_RULES: [RegExp, string][] = [
  [/`([^`]+)`/g, '<code>$1</code>'],
  [/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'],
  [/\*([^*\n]+)\*/g, '<em>$1</em>'],
  [/~~([^~]+)~~/g, '<del>$1</del>'],
  [/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>'],
]

/** 行内格式化：先转义再套规则（安全顺序） */
function inline(text: string): string {
  return INLINE_RULES.reduce((acc, [re, html]) => acc.replace(re, html), escapeHtml(text))
}

/* =================== 块级解析 =================== */

interface Block {
  type: 'code' | 'html' | 'text'
  lang?: string
  code?: string
  /** 文本块按空行分段的段落数组 */
  lines: string[]
}

/** 把消息按代码块/普通文本切块（代码块识别 ``` 围栏） */
function splitBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const re = /```([\w+-]*)\n([\s\S]*?)```/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      blocks.push({ type: 'text', lines: text.slice(last, m.index).split('\n') })
    }
    blocks.push({ type: 'code', lang: m[1], code: m[2].replace(/\n$/, '') })
    last = m.index + m[0].length
  }
  if (last < text.length) {
    blocks.push({ type: 'text', lines: text.slice(last).split('\n') })
  }
  return blocks
}

/** 普通文本段落：空行分段；每段做行内格式化 + 引用/列表渲染 */
function renderParagraphs(lines: string[]): string {
  const paras: string[] = []
  let cur: string[] = []
  const flush = () => {
    if (!cur.length) return
    paras.push(renderPara(cur))
    cur = []
  }
  for (const line of lines) {
    if (!line.trim()) { flush(); continue }
    cur.push(line)
  }
  flush()
  return paras.join('')
}

function renderPara(paraLines: string[]): string {
  const trimmed = paraLines.join('\n').trim()
  // 引用块
  if (trimmed.startsWith('> ')) {
    const quotes = paraLines.filter((l) => l.startsWith('> ')).map((l) => inline(l.slice(2)))
    return `<blockquote>${quotes.join('<br>')}</blockquote>`
  }
  // 无序列表
  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
    const items = paraLines.filter((l) => /^[-*] /.test(l)).map((l) => `<li>${inline(l.replace(/^[-*] /, ''))}</li>`)
    return `<ul>${items.join('')}</ul>`
  }
  // 有序列表
  if (/^\d+\. /.test(trimmed)) {
    const items = paraLines.filter((l) => /^\d+\. /.test(l)).map((l) => `<li>${inline(l.replace(/^\d+\. /, ''))}</li>`)
    return `<ol>${items.join('')}</ol>`
  }
  return `<p>${paraLines.map(inline).join('<br>')}</p>`
}

/**
 * 把消息渲染为 HTML 字符串
 * @param text 原始消息文本
 * @returns 安全 HTML（调用方用 v-html 输出）
 */
export function renderMessage(text: string): string {
  const blocks = splitBlocks(text)
  if (!blocks.length) return '<p></p>'
  let out = ''
  for (const b of blocks) {
    if (b.type === 'code') {
      const hl = highlightLine(b.code ?? '')
      out += `<div class="ai-code"><div class="ai-code-head"><span class="ai-code-lang">${b.lang || 'text'}</span><button type="button" class="ai-code-copy" data-copy="${escapeHtml(b.code ?? '')}">复制</button></div><pre class="ai-code-body">${hl}</pre></div>`
    } else {
      out += renderParagraphs(b.lines)
    }
  }
  return out
}

/* =================== 工具卡片 =================== */

/** 模拟 agent 工具卡片渲染（readFile/search/generate 等） */
export function toolIcon(name: string): string {
  if (/读取|read/i.test(name)) return 'file-text'
  if (/搜索|search/i.test(name)) return 'search'
  if (/生成|generate/i.test(name)) return 'sparkles'
  if (/分析|analy/i.test(name)) return 'chart-line'
  if (/测试|test/i.test(name)) return 'check'
  return 'cog'
}