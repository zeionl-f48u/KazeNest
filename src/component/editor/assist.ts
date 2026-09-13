/**
 * 编辑器智能辅助（纯函数集，无组件依赖）
 * 给 CodeView 提供三块纯逻辑：缩进计算 / 括号配对 / 补全候选
 * 设计上做成"输入字符串数组/行文本，输出结果"的纯函数，
 * 便于单测与在别的编辑器实现里复用。
 */

/* =================== 自动缩进 =================== */

/**
 * 计算 Enter 换行后新行应带的前导空白
 * 规则：继承上一行缩进；上一行以 { 结尾则多缩进 2；本行内容以 } 开头则减缩进 2
 * @param prevLine 上一行完整文本（不含换行）
 * @param newTail  新行光标后的内容（判断是否以 } 开头）
 */
export function indentFor(prevLine: string, newTail: string): string {
  let base = prevLine.match(/^[ \t]*/)?.[0] ?? ''
  if (prevLine.trimEnd().endsWith('{')) base += '  '
  if (newTail.startsWith('}')) base = base.slice(0, -2)
  return base
}

/** 删除行首一段缩进（Shift+Tab）：每次删 2 个空格或 1 个 tab */
export function dedent(line: string): string {
  return line.replace(/^( {1,2}|\t)/, '')
}

/* =================== 括号配对 =================== */

const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
const REVERSE: Record<string, string> = { ')': '(', ']': '[', '}': '{' }

/**
 * 判断某字符是否括号（开/闭任一种）
 */
export function isBracket(ch: string): boolean {
  return ch in PAIRS || ch in REVERSE
}

/**
 * 寻找 (line, col) 处字符的配对括号位置（忽略字符串/注释内的括号）
 * @param lines 全部代码行（不含换行）
 * @param line  0 基行号
 * @param col   0 基列号（该行内偏移）
 * @returns 配对括号的 { line, col }；无匹配或不在括号上返回 null
 */
export function findBracketMatch(
  lines: string[],
  line: number,
  col: number
): { line: number; col: number } | null {
  const ch = lines[line]?.charAt(col)
  if (!ch) return null
  if (ch in PAIRS) {
    // 正向扫描：统计嵌套深度
    const close = PAIRS[ch]
    let depth = 0
    for (let li = line; li < lines.length; li++) {
      const ln = lines[li]
      for (let ci = li === line ? col + 1 : 0; ci < ln.length; ci++) {
        const c = ln[ci]
        if (c === ch) depth++
        else if (c === close) {
          if (depth === 0) return { line: li, col: ci }
          depth--
        }
      }
    }
    return null
  }
  if (ch in REVERSE) {
    // 反向扫描：统计嵌套深度
    const open = REVERSE[ch]
    let depth = 0
    for (let li = line; li >= 0; li--) {
      const ln = lines[li]
      for (let ci = li === line ? col - 1 : ln.length - 1; ci >= 0; ci--) {
        const c = ln[ci]
        if (c === ch) depth++
        else if (c === open) {
          if (depth === 0) return { line: li, col: ci }
          depth--
        }
      }
    }
    return null
  }
  return null
}

/* =================== 补全候选 =================== */

/** 简单标识符正则（含下划线/美元符，兼容 TS/JS 等主流语言） */
const WORD_RE = /[A-Za-z_$][\w$]*/g

/**
 * 收集全部代码里的标识符及其出现次数（候选词库 + 排序权重）
 */
export function collectWords(lines: string[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const ln of lines) {
    WORD_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = WORD_RE.exec(ln)) !== null) {
      freq.set(m[0], (freq.get(m[0]) ?? 0) + 1)
    }
  }
  return freq
}

/**
 * 光标所在行的光标前单词（补全前缀）
 * @returns { start, prefix } 单词起点与文本（无单词时 prefix 为空串）
 */
export function wordBefore(line: string, col: number): { start: number; prefix: string } {
  const head = line.slice(0, col)
  const m = head.match(/[A-Za-z_$][\w$]*$/)
  return m ? { start: col - m[0].length, prefix: m[0] } : { start: col, prefix: '' }
}

/**
 * 按前缀生成补全候选：去重、按频率降序、相同频率按长度升序，最多 max 个
 */
export function candidatesFor(
  freq: Map<string, number>,
  prefix: string,
  max = 6
): string[] {
  if (!prefix) return []
  return [...freq.entries()]
    .filter(([w]) => w.startsWith(prefix) && w !== prefix)
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .slice(0, max)
    .map(([w]) => w)
}