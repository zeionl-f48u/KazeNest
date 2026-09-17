/**
 * 浏览器辅助：地址规范化 / 域名提取 / favicon 占位（字母 + 主题色）
 * - favicon 按域名哈希取色，保证同一站点颜色稳定（接真实 WebView 后换真实图标）
 */

/** favicon 底色候选（取全局 tokens） */
const FAVICON_COLORS = [
  'var(--kn-brand-500)',
  'var(--kn-magenta-500)',
  'var(--kn-sky-500)',
  'var(--kn-emerald-500)',
  'var(--kn-amber-500)',
  'var(--kn-rose-500)',
]

/** 输入规范化：完整 URL 原样；域名补 https://；其余走搜索 */
export function normalizeUrl(input: string): string {
  const v = input.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  if (/^[\w-]+(\.[\w-]+)+/.test(v)) return `https://${v}`
  return `https://www.bing.com/search?q=${encodeURIComponent(v)}`
}

/** 提取域名（用于标题与展示；非法 URL 回退原文） */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/** favicon 占位：域名首字母 + 稳定主题色 */
export function faviconOf(url: string): { letter: string; color: string } {
  const domain = domainOf(url).replace(/^www\./, '')
  const letter = (domain[0] ?? '?').toUpperCase()
  let hash = 0
  for (const ch of domain) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return { letter, color: FAVICON_COLORS[hash % FAVICON_COLORS.length] }
}
