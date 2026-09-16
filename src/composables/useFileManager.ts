/**
 * 文件管理共享状态（useFileManager）
 * - 三个空间（顶部 Tab）：文件夹（资源管理器）/ 资料空间 / 私有空间
 * - 数据关系：
 *   · folderFiles —— 文件系统原始文件（目录树 folders，按 folderId 归属）
 *   · libraryFiles —— 资料空间文件（带标签/注释；由"从文件夹添加"或内置演示数据而来）
 *   · privateFiles —— 私有空间文件（encrypted 标识；同样由"添加"而来）
 *   · "添加"是复制语义：同一 id 可同时存在于文件夹与资料/私有空间（用 id 判断已存在）
 * - 页面与 FilesSidebar（左侧二级栏目录）共享同一份状态：
 *   侧栏目录树与文件夹模式的 activeFolderId 双向同步
 * - 演示操作：多选添加、新建文件夹；接真实文件系统后替换实现
 */
import { ref } from 'vue'
import type { FolderNode, ManagedFile } from '../component/files'

/** 空间类型：文件夹（资源管理器）/ 资料空间 / 私有空间 */
export type FileSpace = 'folder' | 'library' | 'private'

/* =================== 文件夹模式：目录树 =================== */

const folders = ref<FolderNode[]>([
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
])

/* =================== 文件夹模式：文件系统文件（演示） =================== */

const folderFiles = ref<ManagedFile[]>([
  { id: 'l1',  name: '产品需求文档.docx', kind: 'doc',   size: '2.4 MB', modified: '2 小时前', tags: [], note: '', folderId: 'fld-docs-req' },
  { id: 'l7',  name: '用户反馈汇总.txt',  kind: 'doc',   size: '46 KB',  modified: '昨天',     tags: [], note: '', folderId: 'fld-docs-req' },
  { id: 'f11', name: '会议纪要.docx',     kind: 'doc',   size: '68 KB',  modified: '今天',     tags: [], note: '', folderId: 'fld-docs-req' },
  { id: 'l2',  name: '架构设计图.png',    kind: 'image', size: '1.8 MB', modified: '昨天',     tags: [], note: '', folderId: 'fld-docs-design' },
  { id: 'l10', name: 'theme.config.ts',   kind: 'code',  size: '4 KB',   modified: '3 天前',   tags: [], note: '', folderId: 'fld-docs-design' },
  { id: 'l4',  name: '运营数据报表.xlsx', kind: 'sheet', size: '856 KB', modified: '昨天',     tags: [], note: '', folderId: 'fld-docs' },
  { id: 'l5',  name: '发布计划.pptx',     kind: 'ppt',   size: '5.2 MB', modified: '4 小时前', tags: [], note: '', folderId: 'fld-docs' },
  { id: 'f12', name: '产品原型图.png',    kind: 'image', size: '3.4 MB', modified: '今天',     tags: [], note: '', folderId: 'fld-assets-img' },
  { id: 'l3',  name: '功能演示视频.mp4',  kind: 'video', size: '128 MB', modified: '3 天前',   tags: [], note: '', folderId: 'fld-assets-media' },
  { id: 'l8',  name: '宣传片配乐.mp3',    kind: 'audio', size: '8.6 MB', modified: '上周',     tags: [], note: '', folderId: 'fld-assets-media' },
  { id: 'l6',  name: 'API 文档.pdf',      kind: 'pdf',   size: '3.1 MB', modified: '上周',     tags: [], note: '', folderId: 'fld-archive' },
  { id: 'l9',  name: '构建脚本合集.zip',  kind: 'archive', size: '12 MB', modified: '2 周前',  tags: [], note: '', folderId: 'fld-archive' },
])

/* =================== 资料空间（标签 / 注释） =================== */
/* 内置演示数据：与 folderFiles 中同 id 的文件即"已添加到资料空间"（用于去重判断） */

const libraryFiles = ref<ManagedFile[]>([
  { id: 'l1',  name: '产品需求文档.docx', kind: 'doc',   size: '2.4 MB', modified: '2 小时前', tags: ['需求', '产品'], note: 'Q3 迭代需求汇总，含评审结论', folderId: 'fld-docs-req' },
  { id: 'l7',  name: '用户反馈汇总.txt',  kind: 'doc',   size: '46 KB',  modified: '昨天',     tags: ['反馈'],         note: '客服渠道收集的 32 条反馈', folderId: 'fld-docs-req' },
  { id: 'l2',  name: '架构设计图.png',    kind: 'image', size: '1.8 MB', modified: '昨天',     tags: ['架构', '图示'], note: '微服务分层与部署拓扑', folderId: 'fld-docs-design' },
  { id: 'l10', name: 'theme.config.ts',   kind: 'code',  size: '4 KB',   modified: '3 天前',   tags: ['配置', '主题'], note: '设计令牌与主题变量', folderId: 'fld-docs-design' },
  { id: 'l4',  name: '运营数据报表.xlsx', kind: 'sheet', size: '856 KB', modified: '昨天',     tags: ['数据', '报表'], note: '8 月运营数据，含同比环比', folderId: 'fld-docs' },
  { id: 'l5',  name: '发布计划.pptx',     kind: 'ppt',   size: '5.2 MB', modified: '4 小时前', tags: ['计划'],         note: '1.4.0 发布节奏与负责人', folderId: 'fld-docs' },
  { id: 'l3',  name: '功能演示视频.mp4',  kind: 'video', size: '128 MB', modified: '3 天前',   tags: ['演示'],         note: 'V2 功能演示录制，用于对外展示', folderId: 'fld-assets-media' },
  { id: 'l8',  name: '宣传片配乐.mp3',    kind: 'audio', size: '8.6 MB', modified: '上周',     tags: ['素材'],         note: '宣传片背景音乐候选', folderId: 'fld-assets-media' },
  { id: 'l6',  name: 'API 文档.pdf',      kind: 'pdf',   size: '3.1 MB', modified: '上周',     tags: ['文档', 'API'],  note: '对外开放接口说明 v2', folderId: 'fld-archive' },
  { id: 'l9',  name: '构建脚本合集.zip',  kind: 'archive', size: '12 MB', modified: '2 周前',  tags: ['工具'],         note: '构建辅助脚本集合', folderId: 'fld-archive' },
])

/* =================== 私有空间（加密） =================== */

const privateFiles = ref<ManagedFile[]>([
  { id: 'p1', name: '个人简历-终版.pdf', kind: 'pdf',   size: '1.2 MB', modified: '上周',   tags: ['个人'],   note: '更新至 2026-08', encrypted: true },
  { id: 'p2', name: '证件照.png',        kind: 'image', size: '620 KB', modified: '上周',   tags: ['证件'],   note: '白底一寸', encrypted: true },
  { id: 'p3', name: '合同扫描件.pdf',    kind: 'pdf',   size: '4.8 MB', modified: '2 周前', tags: ['合同'],   note: '已签署，勿外传', encrypted: true },
  { id: 'p4', name: '口令备份.txt',      kind: 'doc',   size: '2 KB',   modified: '3 天前', tags: ['重要'],   note: '离线备份口令（加密存储）', encrypted: true },
  { id: 'p5', name: '个人作品集.pptx',   kind: 'ppt',   size: '22 MB',  modified: '1 个月前', tags: ['作品'], note: '作品集 2026', encrypted: true },
])

/* =================== 界面状态（页面与侧栏共享） =================== */

/** 当前空间（顶部三 Tab） */
const space = ref<FileSpace>('folder')
/** 文件夹模式：当前目录（'' = 全部文件/根） */
const activeFolderId = ref('')
/** 选中文件集合：文件夹模式支持多选；资料/私有空间单选（长度 1 时展开详情） */
const selectedIds = ref<string[]>([])

/** 切换空间（清空选择） */
function setSpace(next: FileSpace) {
  if (space.value === next) return
  space.value = next
  selectedIds.value = []
}

/** 文件夹模式：选中目录（清空文件选择） */
function selectFolder(id: string) {
  activeFolderId.value = id
  selectedIds.value = []
}

/* =================== 选择操作 =================== */

function setSelection(ids: string[]) {
  selectedIds.value = [...new Set(ids)]
}

function toggleSelection(id: string) {
  const i = selectedIds.value.indexOf(id)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(id)
}

function clearSelection() {
  selectedIds.value = []
}

/* =================== 添加到空间（复制语义） =================== */

/** 把文件夹模式选中的文件添加到目标空间（已存在则跳过）；返回统计用于演示反馈 */
function addSelectionTo(target: 'library' | 'private'): { added: number; skipped: number } {
  const targetList = target === 'library' ? libraryFiles.value : privateFiles.value
  const existing = new Set(targetList.map((f) => f.id))
  const picked = folderFiles.value.filter((f) => selectedIds.value.includes(f.id))

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
  clearSelection()
  return { added, skipped }
}

/* =================== 文件夹操作（演示） =================== */

let folderSeq = 0

/** 新建文件夹（演示：加到指定父级或根；接真实文件系统后改为 mkdir） */
function addFolder(parentId = '') {
  const node: FolderNode = { id: `fld-new-${++folderSeq}`, name: `新建文件夹 ${folderSeq}` }
  if (!parentId) {
    folders.value.push(node)
    return
  }
  const parent = findFolder(folders.value, parentId)
  if (!parent) {
    folders.value.push(node)
    return
  }
  if (!parent.children) parent.children = []
  parent.children.push(node)
}

/** 在树中查找文件夹节点 */
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

/** 文件夹路径（根 → 自身；用于面包屑） */
function folderPath(id: string): FolderNode[] {
  if (!id) return []
  const path: FolderNode[] = []
  function walk(nodes: FolderNode[], trail: FolderNode[]): boolean {
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
  walk(folders.value, [])
  return path
}

/** 文件夹自身 + 全部子孙 id 集合（过滤：显示该目录及子目录下的文件） */
function folderScopeIds(id: string): Set<string> {
  const ids = new Set<string>()
  const node = findFolder(folders.value, id)
  if (!node) return ids
  function collect(n: FolderNode) {
    ids.add(n.id)
    for (const c of n.children ?? []) collect(c)
  }
  collect(node)
  return ids
}

export function useFileManager() {
  return {
    folders,
    folderFiles,
    libraryFiles,
    privateFiles,
    space,
    activeFolderId,
    selectedIds,
    setSpace,
    selectFolder,
    setSelection,
    toggleSelection,
    clearSelection,
    addSelectionTo,
    addFolder,
    folderPath,
    folderScopeIds,
  }
}
