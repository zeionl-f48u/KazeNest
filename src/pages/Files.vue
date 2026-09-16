<!--
  Files：文件管理页面（仅前端演示，未接入真实文件系统）
  - 三个空间（顶部 Tab，与左侧二级栏目录/入口同步）：
    · 文件夹 —— Windows 资源管理器式：左目录树 / 中文件列表 / 右详情预览
      · 多选（Ctrl 切换 / Shift 范围），可批量"添加到资料空间 / 私有空间"（复制语义）
      · 新建文件夹（演示）；目录与侧栏双向同步；详情带文件预览
    · 资料空间 —— 多格式文件统一管理：标签/注释、#类型 @标签 搜索、标签多选筛选
    · 私有空间 —— 加密存储、密码访问（演示：任意密码解锁）；仅空间内部搜索
  - 页面数据与侧栏共享（useFileManager）
-->
<template>
  <div class="fm">
    <!-- 空间切换：文件夹 / 资料空间 / 私有空间 -->
    <div class="fm-tabs">
      <button type="button" :class="{ 'is-on': space === 'folder' }" @click="setSpace('folder')">
        <Icon name="folder" :size="13" />
        <span>文件夹</span>
        <span class="fm-tabs-count">{{ folderFiles.length }}</span>
      </button>
      <button type="button" :class="{ 'is-on': space === 'library' }" @click="setSpace('library')">
        <Icon name="tag" :size="13" />
        <span>资料空间</span>
        <span class="fm-tabs-count">{{ libraryFiles.length }}</span>
      </button>
      <button type="button" :class="{ 'is-on': space === 'private' }" @click="setSpace('private')">
        <Icon name="lock" :size="13" />
        <span>私有空间</span>
        <span class="fm-tabs-count">{{ privateFiles.length }}</span>
      </button>
    </div>

    <!-- ==================== 文件夹（资源管理器） ==================== -->
    <template v-if="space === 'folder'">
      <!-- 工具行：面包屑 + 新建文件夹 -->
      <div class="fm-tools">
        <div class="fm-crumbs is-tools">
          <button type="button" class="fm-crumb" @click="selectFolder('')">
            <Icon name="th-large" :size="12" />
            全部文件
          </button>
          <template v-for="node in folderPath(activeFolderId)" :key="node.id">
            <Icon name="chevron-right" :size="10" class="fm-crumb-sep" />
            <button type="button" class="fm-crumb" @click="selectFolder(node.id)">{{ node.name }}</button>
          </template>
          <span class="fm-crumbs-count">{{ filteredFolder.length }} 个文件</span>
        </div>
        <button type="button" class="fm-btn" title="演示：新建文件夹" @click="onAddFolder">
          <Icon name="plus" :size="13" />
          <span>新建文件夹</span>
        </button>
      </div>

      <div class="fm-body">
        <!-- 左：目录 -->
        <aside class="fm-folders">
          <div class="fm-folders-head"><span>目录</span></div>

          <button type="button" class="fm-folder-row" :class="{ 'is-on': !activeFolderId }" @click="selectFolder('')">
            <Icon name="th-large" :size="13" class="fm-folder-icon" />
            <span class="fm-folder-name">全部文件</span>
            <span class="fm-folder-count">{{ folderFiles.length }}</span>
          </button>

          <SideBarTree
            :nodes="folderItems"
            :selected="activeFolderId"
            :collapsed="collapsedFolders"
            @select="onFolderPick"
          />

          <div class="fm-folders-sep" />

          <button type="button" class="fm-folder-row is-private" @click="setSpace('private')">
            <Icon name="lock" :size="13" class="fm-folder-icon" />
            <span class="fm-folder-name">私有空间</span>
            <span class="fm-folder-count">{{ privateFiles.length }}</span>
          </button>
        </aside>

        <!-- 中：文件列表（多选） -->
        <div class="fm-main">
          <FileTable
            :files="filteredFolder"
            :selected-ids="selectedIds"
            empty-hint="该目录下暂无文件"
            @select="onFolderSelect"
          />
        </div>

        <!-- 右：详情预览 / 多选操作 -->
        <FileDetail
          v-if="singleSelected"
          :file="singleSelected"
          :available-tags="availableTags"
          @close="clearSelection"
          @update-tags="onUpdateTags"
          @update-note="onUpdateNote"
        />
        <aside v-else-if="selectedIds.length > 1" class="fm-multi">
          <div class="fm-multi-head">
            <span>已选 {{ selectedIds.length }} 项</span>
            <div class="fm-multi-head-actions">
              <button type="button" class="fm-link" @click="setSelection(folderOrder)">全选</button>
              <button type="button" class="fm-link" @click="clearSelection">清除</button>
            </div>
          </div>

          <div class="fm-multi-list">
            <div v-for="f in selectedFiles" :key="f.id" class="fm-multi-item">
              <Icon :name="kindMeta(f.kind).icon" :size="12" :style="{ color: kindMeta(f.kind).color }" />
              <span class="fm-multi-name">{{ f.name }}</span>
            </div>
          </div>

          <button type="button" class="fm-btn is-primary fm-multi-btn" @click="batchAdd('library')">
            <Icon name="tag" :size="13" />
            <span>添加到资料空间</span>
          </button>
          <button type="button" class="fm-btn fm-multi-btn" @click="batchAdd('private')">
            <Icon name="lock" :size="13" />
            <span>添加到私有空间</span>
          </button>

          <p v-if="batchMsg" class="fm-multi-hint is-ok">{{ batchMsg }}</p>
          <p v-else class="fm-multi-hint">"添加"为复制语义：原文件保留在文件夹中</p>
        </aside>
      </div>
    </template>

    <!-- ==================== 资料空间 ==================== -->
    <template v-else-if="space === 'library'">
      <!-- 工具行：统一搜索 + 导入 -->
      <div class="fm-tools">
        <div class="fm-search">
          <Icon name="search" :size="14" class="fm-search-icon" />
          <input
            v-model="query"
            class="fm-search-input"
            placeholder="搜索名称 / 注释，支持 #类型 @标签"
            title="示例：报告 #docx @报表（# 可搜扩展名/类别，条件可叠加）"
            spellcheck="false"
          />
          <button v-if="query" type="button" class="fm-search-x" aria-label="清空搜索" @click="query = ''">
            <Icon name="times" :size="11" />
          </button>
        </div>
        <button type="button" class="fm-btn is-primary" title="演示：暂未接入实际文件系统" @click="onImport">
          <Icon name="upload" :size="13" />
          <span>{{ importing ? '演示：未接入' : '导入文件' }}</span>
        </button>
      </div>

      <!-- 标签筛选（多选：需包含全部选中的标签） -->
      <div class="fm-tagbar">
        <button type="button" class="fm-tagchip" :class="{ 'is-on': !activeTags.length }" @click="activeTags = []">全部</button>
        <button
          v-for="t in libraryTags"
          :key="t"
          type="button"
          class="fm-tagchip"
          :class="{ 'is-on': activeTags.includes(t) }"
          @click="toggleTag(t)"
        >
          {{ t }}
        </button>
        <span v-if="activeTags.length" class="fm-tagbar-hint">
          <Icon name="check" :size="10" />
          文件需含全部 {{ activeTags.length }} 个选中标签
        </span>
      </div>

      <div class="fm-body">
        <div class="fm-main">
          <div class="fm-crumbs is-tools">
            <span class="fm-crumb is-static"><Icon name="tag" :size="12" /> 资料空间</span>
            <span class="fm-crumbs-count">{{ filteredLibrary.length }} 个文件</span>
          </div>

          <FileTable
            :files="filteredLibrary"
            :selected-ids="selectedIds"
            empty-hint="试试 #类型（如 #docx）或 @标签（如 @报表）组合筛选"
            @select="onSingleSelect"
          />
        </div>

        <FileDetail
          v-if="singleSelected"
          :file="singleSelected"
          :available-tags="availableTags"
          @close="clearSelection"
          @update-tags="onUpdateTags"
          @update-note="onUpdateNote"
        />
      </div>
    </template>

    <!-- ==================== 私有空间 ==================== -->
    <template v-else>
      <!-- 锁定态：密码解锁卡片 -->
      <div v-if="locked" class="fm-lock">
        <div class="fm-lock-card">
          <div class="fm-lock-icon">
            <Icon name="lock" :size="26" />
          </div>
          <h2 class="fm-lock-title">私有空间已锁定</h2>
          <p class="fm-lock-desc">
            空间内文件以加密方式存储，输入密码后访问；为保护隐私，私有空间不参与全局统一搜索
          </p>

          <form class="fm-lock-form" @submit.prevent="unlock">
            <div class="fm-lock-field">
              <Icon name="lock" :size="13" class="fm-lock-field-icon" />
              <input
                v-model="password"
                type="password"
                class="fm-lock-input"
                placeholder="输入访问密码"
                autocomplete="off"
              />
            </div>
            <button type="submit" class="fm-btn is-primary fm-lock-btn" :disabled="!password || unlocking">
              {{ unlocking ? '验证中…' : '解锁' }}
            </button>
          </form>

          <p class="fm-lock-hint">演示模式：输入任意密码即可解锁（未接入真实加密）</p>
        </div>
      </div>

      <!-- 解锁态：内部搜索 + 列表 + 详情 -->
      <template v-else>
        <div class="fm-tools">
          <div class="fm-vault-badge">
            <Icon name="shield" :size="12" />
            <span>私有空间 · 加密</span>
          </div>
          <div class="fm-search is-private">
            <Icon name="search" :size="14" class="fm-search-icon" />
            <input
              v-model="privateQuery"
              class="fm-search-input"
              placeholder="私有空间内搜索，支持 #类型 @标签"
              title="示例：合同 #pdf @合同（# 可搜扩展名/类别，条件可叠加）"
              spellcheck="false"
            />
            <button v-if="privateQuery" type="button" class="fm-search-x" aria-label="清空搜索" @click="privateQuery = ''">
              <Icon name="times" :size="11" />
            </button>
          </div>
          <button type="button" class="fm-btn" @click="lockVault">
            <Icon name="unlock" :size="13" />
            <span>锁定</span>
          </button>
        </div>

        <div class="fm-body">
          <div class="fm-main">
            <div class="fm-crumbs is-tools">
              <span class="fm-crumb is-static"><Icon name="shield" :size="12" /> 私有空间</span>
              <span class="fm-crumbs-count">{{ filteredPrivate.length }} 个文件</span>
            </div>

            <FileTable
              :files="filteredPrivate"
              :selected-ids="selectedIds"
              empty-hint="试试 #类型（如 #pdf）或 @标签（如 @合同）组合筛选"
              @select="onSingleSelect"
            />
          </div>

          <FileDetail
            v-if="singleSelected"
            :file="singleSelected"
            :available-tags="availableTags"
            @close="clearSelection"
            @update-tags="onUpdateTags"
            @update-note="onUpdateNote"
          />
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { Icon } from '../component/common'
import { FileTable, FileDetail, kindMeta } from '../component/files'
import type { FolderNode, ManagedFile } from '../component/files'
import { SideBarTree } from '../component/sidebar'
import type { TreeItem } from '../component/sidebar'
import { useFileManager } from '../composables'

/* =================== 共享状态（与左侧二级栏同步） =================== */

const {
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
} = useFileManager()

/* ---------- 文件夹模式：目录树 / 面包屑 / 过滤 ---------- */

/** 文件夹树 → SideBarTree 节点（叶子文件夹补 folder 图标） */
function toTreeItems(nodes: FolderNode[]): TreeItem[] {
  return nodes.map((n) => ({
    id: n.id,
    label: n.name,
    icon: n.children?.length ? undefined : 'folder',
    children: n.children?.length ? toTreeItems(n.children) : undefined,
  }))
}

const folderItems = computed(() => toTreeItems(folders.value))

/** 页面目录树折叠状态（本地维护） */
const collapsedFolders = ref<Set<string>>(new Set())

function onFolderPick(item: TreeItem) {
  selectFolder(item.id)
}

function onAddFolder() {
  /* 演示：选中目录时建到该目录内，否则建到根 */
  addFolder(activeFolderId.value)
}

/** 当前目录范围（含子孙）；null = 全部文件 */
const folderScope = computed(() => (activeFolderId.value ? folderScopeIds(activeFolderId.value) : null))

const filteredFolder = computed(() =>
  folderFiles.value.filter((f) => !folderScope.value || (f.folderId && folderScope.value.has(f.folderId)))
)

const folderOrder = computed(() => filteredFolder.value.map((f) => f.id))

/** 文件夹模式选择：普通单选 / Ctrl 切换 / Shift 范围 */
let lastAnchor = ''

function onFolderSelect(id: string, e: MouseEvent) {
  const order = folderOrder.value
  if (e.shiftKey && lastAnchor && order.includes(lastAnchor)) {
    const a = order.indexOf(lastAnchor)
    const b = order.indexOf(id)
    setSelection(order.slice(Math.min(a, b), Math.max(a, b) + 1))
  } else if (e.ctrlKey || e.metaKey) {
    toggleSelection(id)
  } else {
    setSelection([id])
  }
  lastAnchor = id
}

/** 资料/私有空间选择：单选 */
function onSingleSelect(id: string) {
  setSelection([id])
}

/* ---------- 批量添加到空间（复制语义 + 反馈） ---------- */

const batchMsg = ref('')
let batchTimer: number | undefined

function batchAdd(target: 'library' | 'private') {
  const { added, skipped } = addSelectionTo(target)
  const name = target === 'library' ? '资料空间' : '私有空间'
  batchMsg.value = `已添加 ${added} 项到${name}${skipped ? `（${skipped} 项已存在，跳过）` : ''}`
  window.clearTimeout(batchTimer)
  batchTimer = window.setTimeout(() => {
    batchMsg.value = ''
  }, 2600)
}

/* =================== 搜索语法（资料空间 / 私有空间内搜） ===================
 * - 普通词：匹配 名称 / 注释（多个词需全部命中）
 * - #类型：匹配 文件名称（含扩展名，如 #docx/#xlsx）与 格式类别（#图/#文档/#doc）
 * - @标签：匹配 标签（多个 @ 需全部命中）
 * - 三种条件可叠加；标签多选筛选为"必须全含" */

const query = ref('')
const privateQuery = ref('')
const activeTags = ref<string[]>([])

interface SearchQuery {
  words: string[]
  kinds: string[]
  tags: string[]
}

function parseQuery(raw: string): SearchQuery {
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
function matchKind(f: ManagedFile, keys: string[]): boolean {
  if (!keys.length) return true
  const name = f.name.toLowerCase()
  const label = kindMeta(f.kind).label.toLowerCase()
  const kindKey = f.kind.toLowerCase()
  return keys.some((k) => name.includes(k) || label.startsWith(k) || kindKey.startsWith(k))
}

/** 统一匹配：标签多选（全含）+ # 类型 + @ 标签（全含）+ 关键词（名称/注释） */
function matchFile(f: ManagedFile, q: SearchQuery, requiredTags: string[]): boolean {
  if (requiredTags.length && !requiredTags.every((t) => f.tags.includes(t))) return false
  if (!matchKind(f, q.kinds)) return false
  if (q.tags.length && !q.tags.every((k) => f.tags.some((t) => t.toLowerCase().includes(k)))) return false
  if (q.words.length) {
    const hay = `${f.name} ${f.note}`.toLowerCase()
    if (!q.words.every((w) => hay.includes(w))) return false
  }
  return true
}

function toggleTag(tag: string) {
  const i = activeTags.value.indexOf(tag)
  if (i >= 0) activeTags.value.splice(i, 1)
  else activeTags.value.push(tag)
}

const libraryParsed = computed(() => parseQuery(query.value))
const filteredLibrary = computed(() => libraryFiles.value.filter((f) => matchFile(f, libraryParsed.value, activeTags.value)))

const privateParsed = computed(() => parseQuery(privateQuery.value))
const filteredPrivate = computed(() => privateFiles.value.filter((f) => matchFile(f, privateParsed.value, [])))

/* =================== 选中对象 / 标签集合 =================== */

/** 单选时的详情文件（从当前空间取，避免同 id 文件串数据） */
const singleSelected = computed(() => {
  if (selectedIds.value.length !== 1) return null
  const id = selectedIds.value[0]
  const list =
    space.value === 'folder' ? folderFiles.value : space.value === 'library' ? libraryFiles.value : privateFiles.value
  return list.find((f) => f.id === id) ?? null
})

/** 多选文件列表（文件夹模式批量面板展示） */
const selectedFiles = computed(() => {
  const ids = new Set(selectedIds.value)
  return folderFiles.value.filter((f) => ids.has(f.id))
})

function onUpdateTags(tags: string[]) {
  const f = singleSelected.value
  if (f) f.tags = tags
}

function onUpdateNote(note: string) {
  const f = singleSelected.value
  if (f) f.note = note
}

/** 标签集合（筛选 chips / 详情下拉）：按空间取 */
function collectTags(list: ManagedFile[]): string[] {
  const set = new Set<string>()
  for (const f of list) for (const t of f.tags) set.add(t)
  return [...set]
}

const libraryTags = computed(() => collectTags(libraryFiles.value))
const availableTags = computed(() =>
  space.value === 'folder'
    ? collectTags(folderFiles.value)
    : space.value === 'library'
      ? libraryTags.value
      : collectTags(privateFiles.value)
)

/* =================== 私有空间：锁定 / 解锁 =================== */

const locked = ref(true)
const password = ref('')
const unlocking = ref(false)

/** 解锁（演示：任意非空密码；接真实加密后替换为校验流程） */
function unlock() {
  if (!password.value || unlocking.value) return
  unlocking.value = true
  window.setTimeout(() => {
    unlocking.value = false
    locked.value = false
    password.value = ''
  }, 400)
}

/** 重新锁定：清空内部搜索与选择（锁定态不保留任何访问痕迹） */
function lockVault() {
  locked.value = true
  privateQuery.value = ''
  clearSelection()
}

/* =================== 导入（演示反馈） =================== */

const importing = ref(false)
let importTimer: number | undefined

function onImport() {
  importing.value = true
  window.clearTimeout(importTimer)
  importTimer = window.setTimeout(() => {
    importing.value = false
  }, 900)
}

onUnmounted(() => {
  window.clearTimeout(importTimer)
  window.clearTimeout(batchTimer)
})
</script>

<style scoped>
.fm {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ==================== 空间切换（分段控件） ==================== */
.fm-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg-sunken);
  align-self: flex-start;
}
.fm-tabs button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--kn-radius-md);
  background: transparent;
  color: var(--kn-fg-muted);
  font: inherit;
  font-size: var(--kn-text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--kn-dur-fast), color var(--kn-dur-fast);
}
.fm-tabs button:hover {
  color: var(--kn-fg);
}
.fm-tabs button.is-on {
  background: var(--kn-bg-elev);
  color: var(--kn-fg);
  box-shadow: var(--kn-shadow-md);
}
.fm-tabs-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 16px;
  padding: 0 5px;
  border-radius: var(--kn-radius-pill);
  background: color-mix(in srgb, var(--kn-fg) 8%, transparent);
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ==================== 工具行（搜索 / 面包屑 / 操作） ==================== */
.fm-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 搜索框 */
.fm-search {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg-elev);
  transition: border-color var(--kn-dur-fast), box-shadow var(--kn-dur-fast);
}
.fm-search:focus-within {
  border-color: color-mix(in srgb, var(--kn-brand-500) 55%, transparent);
  box-shadow: var(--kn-shadow-focus);
}
.fm-search.is-private:focus-within {
  border-color: color-mix(in srgb, var(--kn-amber-500) 55%, transparent);
}
.fm-search-icon {
  color: var(--kn-fg-muted);
  flex-shrink: 0;
}
.fm-search-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
}
.fm-search-input::placeholder {
  color: var(--kn-fg-subtle);
}
.fm-search-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--kn-fg-subtle);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--kn-dur-fast), color var(--kn-dur-fast);
}
.fm-search-x:hover {
  background: var(--kn-hover);
  color: var(--kn-fg);
}

/* 通用按钮 / 链接 */
.fm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg-elev);
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--kn-dur-fast), border-color var(--kn-dur-fast), opacity var(--kn-dur-fast);
}
.fm-btn:hover {
  background: var(--kn-hover);
}
.fm-btn.is-primary {
  border-color: transparent;
  background: linear-gradient(135deg, var(--kn-brand-500), var(--kn-magenta-500));
  color: #fff;
  font-weight: 600;
}
.fm-btn.is-primary:hover {
  filter: brightness(1.08);
}
.fm-btn:disabled {
  opacity: 0.45;
  cursor: default;
  filter: none;
}
.fm-link {
  border: 0;
  background: transparent;
  color: var(--kn-brand-500);
  font: inherit;
  font-size: var(--kn-text-2xs);
  cursor: pointer;
  padding: 0 2px;
}
.fm-link:hover {
  text-decoration: underline;
}

/* 私有空间标识胶囊 */
.fm-vault-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--kn-amber-500) 30%, transparent);
  border-radius: var(--kn-radius-lg);
  background: color-mix(in srgb, var(--kn-amber-500) 10%, transparent);
  color: var(--kn-amber-500);
  font-size: var(--kn-text-xs);
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ==================== 标签筛选 ==================== */
.fm-tagbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.fm-tagchip {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-pill);
  background: transparent;
  color: var(--kn-fg-muted);
  font: inherit;
  font-size: var(--kn-text-xs);
  cursor: pointer;
  transition: background var(--kn-dur-fast), color var(--kn-dur-fast), border-color var(--kn-dur-fast);
}
.fm-tagchip:hover {
  color: var(--kn-fg);
  background: var(--kn-hover);
}
.fm-tagchip.is-on {
  border-color: color-mix(in srgb, var(--kn-brand-500) 40%, transparent);
  background: color-mix(in srgb, var(--kn-brand-500) 12%, transparent);
  color: var(--kn-brand-500);
  font-weight: 600;
}
.fm-tagbar-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 2px;
  font-size: var(--kn-text-2xs);
  color: var(--kn-brand-500);
}

/* ==================== 三栏布局 ==================== */
.fm-body {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

/* 左：文件夹目录 */
.fm-folders {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 200px;
  flex-shrink: 0;
  padding: 6px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg-elev);
  box-sizing: border-box;
}
.fm-folders-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 6px 6px;
  font-size: var(--kn-text-xs);
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--kn-fg-muted);
}
.fm-folders-sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--kn-border);
}

/* 目录行（全部文件 / 私有空间入口） */
.fm-folder-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--kn-radius-md);
  background: transparent;
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  text-align: left;
  cursor: pointer;
  transition: background var(--kn-dur-fast);
}
.fm-folder-row:hover {
  background: var(--kn-hover);
}
.fm-folder-row.is-on {
  background: color-mix(in srgb, var(--kn-brand-500) 12%, transparent);
  color: var(--kn-brand-500);
  font-weight: 600;
}
.fm-folder-row.is-private {
  color: var(--kn-amber-500);
}
.fm-folder-icon {
  flex-shrink: 0;
}
.fm-folder-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fm-folder-count {
  font-size: 10px;
  color: var(--kn-fg-subtle);
  font-variant-numeric: tabular-nums;
}
.fm-folder-row.is-on .fm-folder-count {
  color: inherit;
  opacity: 0.8;
}

/* 中：列表 */
.fm-main {
  flex: 1;
  min-width: 0;
  padding: 4px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg-elev);
  box-sizing: border-box;
}

/* 面包屑（工具行内 / 列表卡片内共用） */
.fm-crumbs {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
}
.fm-crumbs.is-tools {
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg-elev);
  box-sizing: border-box;
}
.fm-crumb {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 7px;
  border: 0;
  border-radius: var(--kn-radius-sm);
  background: transparent;
  color: var(--kn-fg-muted);
  font: inherit;
  font-size: var(--kn-text-xs);
  cursor: pointer;
  transition: background var(--kn-dur-fast), color var(--kn-dur-fast);
}
.fm-crumb:hover {
  background: var(--kn-hover);
  color: var(--kn-fg);
}
.fm-crumb.is-static {
  cursor: default;
  font-weight: 600;
  color: var(--kn-fg);
}
.fm-crumb.is-static:hover {
  background: transparent;
}
.fm-crumb-sep {
  color: var(--kn-fg-subtle);
  flex-shrink: 0;
}
.fm-crumbs-count {
  margin-left: auto;
  padding-left: 8px;
  font-size: var(--kn-text-2xs);
  color: var(--kn-fg-subtle);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
/* 列表卡片内的面包屑：底部分隔线 */
.fm-main > .fm-crumbs {
  padding: 2px 8px 6px;
  border-bottom: 1px solid var(--kn-border);
  margin-bottom: 4px;
}

/* 右：多选操作面板 */
.fm-multi {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 300px;
  flex-shrink: 0;
  padding: 14px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg-elev);
  position: sticky;
  top: 0;
  box-sizing: border-box;
}
.fm-multi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: var(--kn-text-sm);
  font-weight: 600;
}
.fm-multi-head-actions {
  display: flex;
  gap: 8px;
}
.fm-multi-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 240px;
  overflow-y: auto;
  padding: 6px;
  border-radius: var(--kn-radius-md);
  background: var(--kn-bg-sunken);
}
.fm-multi-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  font-size: var(--kn-text-xs);
  color: var(--kn-fg);
}
.fm-multi-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fm-multi-btn {
  justify-content: center;
}
.fm-multi-hint {
  margin: 0;
  font-size: 10px;
  line-height: 1.5;
  color: var(--kn-fg-subtle);
}
.fm-multi-hint.is-ok {
  color: var(--kn-emerald-500);
  font-weight: 600;
}

/* ==================== 私有空间：锁定卡片 ==================== */
.fm-lock {
  display: flex;
  justify-content: center;
  padding: 32px 0 56px;
}
.fm-lock-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 440px;
  max-width: 100%;
  padding: 28px 26px 20px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-xl);
  background: var(--kn-bg-elev);
  text-align: center;
  box-sizing: border-box;
}
.fm-lock-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--kn-radius-2xl);
  background: color-mix(in srgb, var(--kn-amber-500) 16%, transparent);
  color: var(--kn-amber-500);
}
.fm-lock-title {
  margin: 6px 0 0;
  font-size: var(--kn-text-lg);
  font-weight: 700;
}
.fm-lock-desc {
  margin: 0;
  max-width: 340px;
  font-size: var(--kn-text-xs);
  line-height: 1.7;
  color: var(--kn-fg-muted);
}
.fm-lock-form {
  display: flex;
  gap: 8px;
  width: 100%;
  margin-top: 8px;
}
.fm-lock-field {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg);
  transition: border-color var(--kn-dur-fast);
}
.fm-lock-field:focus-within {
  border-color: color-mix(in srgb, var(--kn-amber-500) 55%, transparent);
}
.fm-lock-field-icon {
  color: var(--kn-fg-subtle);
  flex-shrink: 0;
}
.fm-lock-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  letter-spacing: 1px;
}
.fm-lock-btn {
  height: 36px;
  min-width: 88px;
  justify-content: center;
}
.fm-lock-hint {
  margin: 4px 0 0;
  font-size: 10px;
  color: var(--kn-fg-subtle);
}
</style>
