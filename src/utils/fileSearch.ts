/**
 * 文件搜索语法（纯函数，React/Vue 共用）
 * - 普通词：匹配 名称 / 注释（多个词需全部命中）
 * - #类型：匹配 文件名称（含扩展名，如 #docx/#xlsx）与 格式类别（#图/#文档/#doc）
 * - @标签：匹配 标签（多个 @ 需全部命中）
 * - 三种条件可叠加（同时满足）；标签多选筛选为"必须全含"
 */
import { kindMeta } from '@/component/files/types'
import type { ManagedFile } from '@/component/files/types'

export interface SearchQuery {
  words: string[]
  kinds: string[]
  tags: string[]
}

export function parseQuery(raw: string): SearchQuery {
  const words: string[] = []
  const kinds: string[] = []
  const tags: string[] = []
  for (const token of raw.trim().split(/\s+/)) {
    if (!token) continue
    if (token.startsWith('#')) {
      const k = token.slice(1).toLowerCase()
      if (k) kinds.push(k)
    } else if (token.startsWith('@')) {
      const t = token.slice(1).toLowerCase()
      if (t) tags.push(t)
    } else {
      words.push(token.toLowerCase())
    }
  }
  return { words, kinds, tags }
}

/** # 类型匹配：文件名（含扩展名）/ 类别名（前缀）/ 类别 key（前缀），多个取并集 */
export function matchKind(f: ManagedFile, keys: string[]): boolean {
  if (!keys.length) return true
  const name = f.name.toLowerCase()
  const label = kindMeta(f.kind).label.toLowerCase()
  const kindKey = f.kind.toLowerCase()
  return keys.some((k) => name.includes(k) || label.startsWith(k) || kindKey.startsWith(k))
}

/** 统一匹配：标签多选（全含）+ # 类型 + @ 标签（全含）+ 关键词（名称/注释） */
export function matchFile(f: ManagedFile, q: SearchQuery, requiredTags: string[]): boolean {
  if (requiredTags.length && !requiredTags.every((t) => f.tags.includes(t))) return false
  if (!matchKind(f, q.kinds)) return false
  if (q.tags.length && !q.tags.every((k) => f.tags.some((t) => t.toLowerCase().includes(k)))) {
    return false
  }
  if (q.words.length) {
    const hay = `${f.name} ${f.note}`.toLowerCase()
    if (!q.words.every((w) => hay.includes(w))) return false
  }
  return true
}
