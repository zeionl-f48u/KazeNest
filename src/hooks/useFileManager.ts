/**
 * 文件管理共享状态（React 版 useFileManager）
 * - 三个空间：文件夹（资源管理器）/ 资料空间 / 私有空间
 * - 与 Vue 版语义一致：folderFiles 为原始文件；libraryFiles/privateFiles 为「添加」后的副本（同 id 判断已存在）
 * - 实现：模块级可变状态 + 版本号驱动 useSyncExternalStore（贴近 Vue 响应式，代码紧凑）
 * - 持久化：写回 AppSessionSnapshot.files（useAppSession.update）
 */
import { useSyncExternalStore } from 'react'
import type { FolderNode, ManagedFile } from '@/component/files'
import { appSession } from '@/hooks/useAppSession'

/** 空间类型 */
export type FileSpace = 'folder' | 'library' | 'private'

/* =================== 模块级状态 =================== */

const folders: FolderNode[] = [
  {
    id: 'fld-docs',
    name: '项目文档',
    children: [
      { id: 'fld-docs-req', name: '需求' },
      { id: 'fld-docs-design', name: '设计' },
    ],
  },
  {
    id: 'fld-assets',
    name: '素材',
    children: [
      { id: 'fld-assets-img', name: '图片' },
      { id: 'fld-assets-media', name: '音视频' },
    ],
  },
  { id: 'fld-archive', name: '归档' },
]

let folderFiles: ManagedFile[] = [
  { id: 'l1', name: '产品需求文档.docx', kind: 'doc', size: '2.4 MB', modified: '2 小时前', tags: [], note: '', folderId: 'fld-docs-req' },
  { id: 'l7', name: '用户反馈汇总.txt', kind: 'doc', size: '46 KB', modified: '昨天', tags: [], note: '', folderId: 'fld-docs-req' },
  { id: 'f11', name: '会议纪要.docx', kind: 'doc', size: '68 KB', modified: '今天', tags: [], note: '', folderId: 'fld-docs-req' },
  { id: 'l2', name: '架构设计图.png', kind: 'image', size: '1.8 MB', modified: '昨天', tags: [], note: '', folderId: 'fld-docs-design' },
  { id: 'l10', name: 'theme.config.ts', kind: 'code', size: '4 KB', modified: '3 天前', tags: [], note: '', folderId: 'fld-docs-design' },
  { id: 'l4', name: '运营数据报表.xlsx', kind: 'sheet', size: '856 KB', modified: '昨天', tags: [], note: '', folderId: 'fld-docs' },
  { id: 'l5', name: '发布计划.pptx', kind: 'ppt', size: '5.2 MB', modified: '4 小时前', tags: [], note: '', folderId: 'fld-docs' },
  { id: 'f12', name: '产品原型图.png', kind: 'image', size: '3.4 MB', modified: '今天', tags: [], note: '', folderId: 'fld-assets-img' },
  { id: 'l3', name: '功能演示视频.mp4', kind: 'video', size: '128 MB', modified: '3 天前', tags: [], note: '', folderId: 'fld-assets-media' },
  { id: 'l8', name: '宣传片配乐.mp3', kind: 'audio', size: '8.6 MB', modified: '上周', tags: [], note: '', folderId: 'fld-assets-media' },
  { id: 'l6', name: 'API 文档.pdf', kind: 'pdf', size: '3.1 MB', modified: '上周', tags: [], note: '', folderId: 'fld-archive' },
  { id: 'l9', name: '构建脚本合集.zip', kind: 'archive', size: '12 MB', modified: '2 周前', tags: [], note: '', folderId: 'fld-archive' },
]

let libraryFiles: ManagedFile[] = [
  { id: 'l1', name: '产品需求文档.docx', kind: 'doc', size: '2.4 MB', modified: '2 小时前', tags: ['需求', '产品'], note: 'Q3 迭代需求汇总，含评审结论', folderId: 'fld-docs-req' },
  { id: 'l7', name: '用户反馈汇总.txt', kind: 'doc', size: '46 KB', modified: '昨天', tags: ['反馈'], note: '客服渠道收集的 32 条反馈', folderId: 'fld-docs-req' },
  { id: 'l2', name: '架构设计图.png', kind: 'image', size: '1.8 MB', modified: '昨天', tags: ['架构', '图示'], note: '微服务分层与部署拓扑', folderId: 'fld-docs-design' },
  { id: 'l10', name: 'theme.config.ts', kind: 'code', size: '4 KB', modified: '3 天前', tags: ['配置', '主题'], note: '设计令牌与主题变量', folderId: 'fld-docs-design' },
  { id: 'l4', name: '运营数据报表.xlsx', kind: 'sheet', size: '856 KB', modified: '昨天', tags: ['数据', '报表'], note: '8 月运营数据，含同比环比', folderId: 'fld-docs' },
  { id: 'l5', name: '发布计划.pptx', kind: 'ppt', size: '5.2 MB', modified: '4 小时前', tags: ['计划'], note: '1.4.0 发布节奏与负责人', folderId: 'fld-docs' },
  { id: 'l3', name: '功能演示视频.mp4', kind: 'video', size: '128 MB', modified: '3 天前', tags: ['演示'], note: 'V2 功能演示录制，用于对外展示', folderId: 'fld-assets-media' },
  { id: 'l8', name: '宣传片配乐.mp3', kind: 'audio', size: '8.6 MB', modified: '上周', tags: ['素材'], note: '宣传片背景音乐候选', folderId: 'fld-assets-media' },
  { id: 'l6', name: 'API 文档.pdf', kind: 'pdf', size: '3.1 MB', modified: '上周', tags: ['文档', 'API'], note: '对外开放接口说明 v2', folderId: 'fld-archive' },
  { id: 'l9', name: '构建脚本合集.zip', kind: 'archive', size: '12 MB', modified: '2 周前', tags: ['工具'], note: '构建辅助脚本集合', folderId: 'fld-archive' },
]

let privateFiles: ManagedFile[] = [
  { id: 'p1', name: '个人简历-终版.pdf', kind: 'pdf', size: '1.2 MB', modified: '上周', tags: ['个人'], note: '更新至 2026-08', encrypted: true },
  { id: 'p2', name: '证件照.png', kind: 'image', size: '620 KB', modified: '上周', tags: ['证件'], note: '白底一寸', encrypted: true },
  { id: 'p3', name: '合同扫描件.pdf', kind: 'pdf', size: '4.8 MB', modified: '2 周前', tags: ['合同'], note: '已签署，勿外传', encrypted: true },
  { id: 'p4', name: '口令备份.txt', kind: 'doc', size: '2 KB', modified: '3 天前', tags: ['重要'], note: '离线备份口令（加密存储）', encrypted: true },
  { id: 'p5', name: '个人作品集.pptx', kind: 'ppt', size: '22 MB', modified: '1 个月前', tags: ['作品'], note: '作品集 2026', encrypted: true },
]

let space: FileSpace = 'folder'
let activeFolderId = ''
let selectedIds: string[] = []
let folderOpened = false
let rootFolderName = ''
let opening = false

/* =================== 订阅（版本号驱动） =================== */

let version = 0
const listeners = new Set<() => void>()

function bump() {
  version++
  for (const fn of listeners) fn()
  syncSession()
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useFileManager() {
  useSyncExternalStore(subscribe, () => version, () => version)
  return api
}

/* =================== 持久化 =================== */

function syncSession() {
  appSession.update((s) => {
    s.files = {
      folderOpened,
      rootFolderName,
      space,
      activeFolderId,
      folders,
      folderFiles,
      libraryFiles,
      privateFiles,
    }
  })
}

let sessionRestored = false

/** 启动恢复（幂等；页面挂载时调用） */
export async function restoreFiles() {
  if (sessionRestored) return
  sessionRestored = true
  const snap = (await appSession.restore())?.files
  if (!snap) return
  folderOpened = !!snap.folderOpened
  rootFolderName = snap.rootFolderName ?? ''
  space = snap.space ?? 'folder'
  activeFolderId = snap.activeFolderId ?? ''
  if (Array.isArray(snap.folders) && snap.folders.length) {
    folders.length = 0
    folders.push(...snap.folders)
  }
  if (Array.isArray(snap.folderFiles) && snap.folderFiles.length) folderFiles = snap.folderFiles
  if (Array.isArray(snap.libraryFiles) && snap.libraryFiles.length) libraryFiles = snap.libraryFiles
  if (Array.isArray(snap.privateFiles) && snap.privateFiles.length) privateFiles = snap.privateFiles
  bump()
}



/* =================== 操作 =================== */

let openTimer: number | undefined

/** 打开本地文件夹（演示：450ms 后加载内置演示目录） */
function openFolder(name = '我的项目') {
  if (opening) return
  opening = true
  window.clearTimeout(openTimer)
  bump()
  openTimer = window.setTimeout(() => {
    rootFolderName = name
    folderOpened = true
    activeFolderId = ''
    selectedIds = []
    opening = false
    bump()
  }, 450)
}

/** 关闭当前文件夹（回到"打开文件夹"空态） */
function closeFolder() {
  folderOpened = false
  rootFolderName = ''
  activeFolderId = ''
  selectedIds = []
  bump()
}

function setSpace(next: FileSpace) {
  if (space === next) return
  space = next
  selectedIds = []
  bump()
}

function selectFolder(id: string) {
  activeFolderId = id
  selectedIds = []
  bump()
}

function setSelection(ids: string[]) {
  selectedIds = [...new Set(ids)]
  bump()
}

function toggleSelection(id: string) {
  const i = selectedIds.indexOf(id)
  if (i >= 0) selectedIds.splice(i, 1)
  else selectedIds.push(id)
  selectedIds = [...selectedIds]
  bump()
}

function clearSelection() {
  selectedIds = []
  bump()
}

/** 把文件夹模式选中的文件添加到目标空间（复制语义；已存在跳过） */
function addSelectionTo(target: 'library' | 'private'): { added: number; skipped: number } {
  const targetList = target === 'library' ? libraryFiles : privateFiles
  const existing = new Set(targetList.map((f) => f.id))
  const picked = folderFiles.filter((f) => selectedIds.includes(f.id))
  let added = 0
  let skipped = 0
  for (const f of picked) {
    if (existing.has(f.id)) {
      skipped++
      continue
    }
    targetList.push({
      id: f.id,
      name: f.name,
      kind: f.kind,
      size: f.size,
      modified: f.modified,
      tags: [...f.tags],
      note: f.note,
      encrypted: target === 'private',
      folderId: f.folderId,
    })
    added++
  }
  selectedIds = []
  bump()
  return { added, skipped }
}

let folderSeq = 0

/** 新建文件夹（演示；接真实文件系统后改 mkdir） */
function addFolder(parentId = '') {
  const node: FolderNode = { id: `fld-new-${++folderSeq}`, name: `新建文件夹 ${folderSeq}` }
  const parent = parentId ? findFolder(folders, parentId) : null
  if (parent) {
    if (!parent.children) parent.children = []
    parent.children.push(node)
  } else {
    folders.push(node)
  }
  bump()
}

function findFolder(nodes: FolderNode[], id: string): FolderNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const hit = findFolder(n.children, id)
      if (hit) return hit
    }
  }
  return null
}

/** 文件夹路径（根 → 自身；面包屑用） */
function folderPath(id: string): FolderNode[] {
  if (!id) return []
  const path: FolderNode[] = []
  const walk = (nodes: FolderNode[], trail: FolderNode[]): boolean => {
    for (const n of nodes) {
      const next = [...trail, n]
      if (n.id === id) {
        path.push(...next)
        return true
      }
      if (n.children && walk(n.children, next)) return true
    }
    return false
  }
  walk(folders, [])
  return path
}

/** 文件夹自身 + 全部子孙 id 集合 */
function folderScopeIds(id: string): Set<string> {
  const ids = new Set<string>()
  const node = findFolder(folders, id)
  if (!node) return ids
  const collect = (n: FolderNode) => {
    ids.add(n.id)
    for (const c of n.children ?? []) collect(c)
  }
  collect(node)
  return ids
}

/* =================== 对外 API =================== */

const api = {
  get folders() {
    return folders
  },
  get folderFiles() {
    return folderFiles
  },
  get libraryFiles() {
    return libraryFiles
  },
  get privateFiles() {
    return privateFiles
  },
  get space() {
    return space
  },
  get activeFolderId() {
    return activeFolderId
  },
  get selectedIds() {
    return selectedIds
  },
  get folderOpened() {
    return folderOpened
  },
  get rootFolderName() {
    return rootFolderName
  },
  get opening() {
    return opening
  },
  openFolder,
  closeFolder,
  setSpace,
  selectFolder,
  setSelection,
  toggleSelection,
  clearSelection,
  addSelectionTo,
  addFolder,
  folderPath,
  folderScopeIds,
  restore: restoreFiles,
}

export type FileManagerApi = typeof api
