/**
 * 文件管理数据类型与格式元信息
 * - ManagedFile：页面演示用的文件条目（接真实文件系统后替换数据来源）
 * - KIND_META：多格式的图标/颜色/名称映射（FileTable 与 FileDetail 共用）
 */

/** 支持统一管理的文件格式类别 */
export type FileKind =
  | 'image' | 'video' | 'audio' | 'doc' | 'sheet' | 'ppt' | 'pdf' | 'code' | 'archive'

/** 文件条目（仅页面演示：字段对应真实的元数据 + 用户标签/注释） */
export interface ManagedFile {
  id: string
  name: string
  kind: FileKind
  /** 展示用大小文本（接真实文件系统后改为字节数 + 格式化） */
  size: string
  /** 展示用修改时间文本（如"2 小时前"） */
  modified: string
  /** 自定义标签（统一搜索可命中） */
  tags: string[]
  /** 注释（统一搜索可命中） */
  note: string
  /** 是否加密存储（私有空间文件） */
  encrypted?: boolean
}

/** 格式 → 图标/颜色/显示名 */
export const KIND_META: Record<FileKind, { icon: string; color: string; label: string }> = {
  image:   { icon: 'image',        color: 'var(--kn-emerald-500)', label: '图片' },
  video:   { icon: 'video',        color: 'var(--kn-rose-500)',    label: '视频' },
  audio:   { icon: 'music',        color: 'var(--kn-magenta-500)', label: '音频' },
  doc:     { icon: 'file-text',    color: 'var(--kn-sky-500)',     label: '文档' },
  sheet:   { icon: 'table',        color: 'var(--kn-emerald-500)', label: '表格' },
  ppt:     { icon: 'presentation', color: 'var(--kn-amber-500)',   label: '演示' },
  pdf:     { icon: 'file-text',    color: 'var(--kn-rose-500)',    label: 'PDF' },
  code:    { icon: 'terminal',     color: 'var(--kn-brand-500)',   label: '代码' },
  archive: { icon: 'archive',      color: 'var(--kn-fg-muted)',    label: '压缩包' },
}

/** 取格式元信息（未知格式回退为文档样式） */
export function kindMeta(kind: FileKind) {
  return KIND_META[kind] ?? KIND_META.doc
}
