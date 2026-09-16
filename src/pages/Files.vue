<!--
  Files：文件管理页面（仅前端演示，未接入真实文件系统）
  - 两个空间：
    · 资料空间：多格式文件统一管理，可为每个文件加标签/注释；
      顶部统一搜索框按 名称/标签/注释 查找，支持标签筛选
    · 私有空间：文件加密存储、密码访问（演示：任意密码解锁）；
      安全约束 —— 仅提供空间内部搜索，不参与统一搜索（锁定态连搜索入口都没有）
  - 列表选中 → 右侧详情面板编辑标签/注释（内存即时生效，搜索立刻可命中）
  - 接真实文件系统后：替换演示数据来源 + 加密改为真实加解密
-->
<template>
  <div class="fm">
    <!-- 空间切换 -->
    <div class="fm-tabs">
      <button type="button" :class="{ 'is-on': space === 'library' }" @click="switchSpace('library')">
        <Icon name="folder" :size="13" />
        <span>资料空间</span>
        <span class="fm-tabs-count">{{ libraryFiles.length }}</span>
      </button>
      <button type="button" :class="{ 'is-on': space === 'private' }" @click="switchSpace('private')">
        <Icon name="lock" :size="13" />
        <span>私有空间</span>
        <span class="fm-tabs-count">{{ privateFiles.length }}</span>
      </button>
    </div>

    <!-- ==================== 资料空间 ==================== -->
    <template v-if="space === 'library'">
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
          v-for="t in allTags"
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

      <!-- 列表 + 详情 -->
      <div class="fm-body">
        <div class="fm-main">
          <FileTable
            :files="filteredLibrary"
            :selected-id="selectedId"
            empty-hint="试试 #类型（如 #文档）或 @标签（如 @报表）组合筛选"
            @select="selectedId = $event"
          />
        </div>
        <FileDetail
          v-if="selected"
          :file="selected"
          :available-tags="availableTags"
          @close="selectedId = ''"
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

      <!-- 解锁态：内部搜索（仅此一处）+ 列表 -->
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
            <FileTable
              :files="filteredPrivate"
              :selected-id="selectedId"
              empty-hint="试试 #类型（如 #PDF）或 @标签（如 @合同）组合筛选"
              @select="selectedId = $event"
            />
          </div>
          <FileDetail
            v-if="selected"
            :file="selected"
            :available-tags="availableTags"
            @close="selectedId = ''"
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
import type { ManagedFile } from '../component/files'

/* =================== 空间 / 搜索状态 =================== */

const space = ref<'library' | 'private'>('library')
/** 资料空间统一搜索关键字（语法见 parseQuery） */
const query = ref('')
/** 私有空间内部搜索关键字（仅作用于私有文件，不与其他空间互通） */
const privateQuery = ref('')
/** 标签筛选（多选：文件必须包含全部选中的标签，缺一不可；空数组 = 全部） */
const activeTags = ref<string[]>([])
/** 当前选中文件（详情面板） */
const selectedId = ref('')

function switchSpace(next: 'library' | 'private') {
  if (space.value === next) return
  space.value = next
  selectedId.value = ''
}

/** 标签筛选开关（多选切换） */
function toggleTag(tag: string) {
  const i = activeTags.value.indexOf(tag)
  if (i >= 0) activeTags.value.splice(i, 1)
  else activeTags.value.push(tag)
}

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

/** 重新锁定：清空内部搜索与选中（锁定态不保留任何访问痕迹） */
function lockVault() {
  locked.value = true
  privateQuery.value = ''
  selectedId.value = ''
}

/* =================== 演示数据（接真实文件系统后替换） =================== */

const libraryFiles = ref<ManagedFile[]>([
  { id: 'l1',  name: '产品需求文档.docx', kind: 'doc',   size: '2.4 MB', modified: '2 小时前', tags: ['需求', '产品'], note: 'Q3 迭代需求汇总，含评审结论' },
  { id: 'l2',  name: '架构设计图.png',    kind: 'image', size: '1.8 MB', modified: '昨天',     tags: ['架构', '图示'], note: '微服务分层与部署拓扑' },
  { id: 'l3',  name: '功能演示视频.mp4',  kind: 'video', size: '128 MB', modified: '3 天前',   tags: ['演示'],         note: 'V2 功能演示录制，用于对外展示' },
  { id: 'l4',  name: '运营数据报表.xlsx', kind: 'sheet', size: '856 KB', modified: '昨天',     tags: ['数据', '报表'], note: '8 月运营数据，含同比环比' },
  { id: 'l5',  name: '发布计划.pptx',     kind: 'ppt',   size: '5.2 MB', modified: '4 小时前', tags: ['计划'],         note: '1.4.0 发布节奏与负责人' },
  { id: 'l6',  name: 'API 文档.pdf',      kind: 'pdf',   size: '3.1 MB', modified: '上周',     tags: ['文档', 'API'],  note: '对外开放接口说明 v2' },
  { id: 'l7',  name: '用户反馈汇总.txt',  kind: 'doc',   size: '46 KB',  modified: '昨天',     tags: ['反馈'],         note: '客服渠道收集的 32 条反馈' },
  { id: 'l8',  name: '宣传片配乐.mp3',    kind: 'audio', size: '8.6 MB', modified: '上周',     tags: ['素材'],         note: '宣传片背景音乐候选' },
  { id: 'l9',  name: '构建脚本合集.zip',  kind: 'archive', size: '12 MB', modified: '2 周前',  tags: ['工具'],         note: '构建辅助脚本集合' },
  { id: 'l10', name: 'theme.config.ts',   kind: 'code',  size: '4 KB',   modified: '3 天前',   tags: ['配置', '主题'], note: '设计令牌与主题变量' },
])

const privateFiles = ref<ManagedFile[]>([
  { id: 'p1', name: '个人简历-终版.pdf', kind: 'pdf',   size: '1.2 MB', modified: '上周',   tags: ['个人'],   note: '更新至 2026-08', encrypted: true },
  { id: 'p2', name: '证件照.png',        kind: 'image', size: '620 KB', modified: '上周',   tags: ['证件'],   note: '白底一寸', encrypted: true },
  { id: 'p3', name: '合同扫描件.pdf',    kind: 'pdf',   size: '4.8 MB', modified: '2 周前', tags: ['合同'],   note: '已签署，勿外传', encrypted: true },
  { id: 'p4', name: '口令备份.txt',      kind: 'doc',   size: '2 KB',   modified: '3 天前', tags: ['重要'],   note: '离线备份口令（加密存储）', encrypted: true },
  { id: 'p5', name: '个人作品集.pptx',   kind: 'ppt',   size: '22 MB',  modified: '1 个月前', tags: ['作品'], note: '作品集 2026', encrypted: true },
])

/* =================== 搜索语法 ===================
 * - 普通词：匹配 名称 / 注释（多个词需全部命中）
 * - #类型：匹配 文件名称（含扩展名，如 #docx/#xlsx）与 格式类别（#图/#文档/#doc）；
 *          只命中真实存在的信息；多个 # 取并集
 * - @标签：匹配 标签（多个 @ 需全部命中）
 * - 三种条件可叠加（同时满足）；标签多选筛选同样为"必须全含" */

interface SearchQuery {
  /** 普通关键词（名称/注释） */
  words: string[]
  /** # 类型关键词（全小写） */
  kinds: string[]
  /** @ 标签关键词（全小写） */
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

/**
 * # 类型匹配（只命中真实存在的信息，不无中生有）：
 * 1) 文件名称（含扩展名）—— `#docx` 命中 *.docx、`#xlsx` 命中 *.xlsx
 * 2) 格式类别名（前缀）—— `#图` 命中"图片"、`#文档` 命中"文档"
 * 3) 格式类别 key（前缀）—— `#doc` 命中 doc 类（同时含 *.doc/*.docx）
 * 多个 # 取并集（命中任一即可）
 */
function matchKind(f: ManagedFile, keys: string[]): boolean {
  if (!keys.length) return true
  const name = f.name.toLowerCase()
  const label = kindMeta(f.kind).label.toLowerCase()
  const kindKey = f.kind.toLowerCase()
  return keys.some((k) => name.includes(k) || label.startsWith(k) || kindKey.startsWith(k))
}

/** 统一匹配：标签多选（全含）+ # 类型（并集）+ @ 标签（全含）+ 关键词（名称/注释） */
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

/** 资料空间标签全集（用于筛选 chips） */
const allTags = computed(() => {
  const set = new Set<string>()
  for (const f of libraryFiles.value) for (const t of f.tags) set.add(t)
  return [...set]
})

/** 私有空间标签全集（详情面板"选择已有标签"用） */
const privateTags = computed(() => {
  const set = new Set<string>()
  for (const f of privateFiles.value) for (const t of f.tags) set.add(t)
  return [...set]
})

/** 当前空间的标签全集（传给详情面板的下拉选择） */
const availableTags = computed(() => (space.value === 'library' ? allTags.value : privateTags.value))

/** 资料空间：搜索语法 + 标签多选（必须全含） */
const libraryParsed = computed(() => parseQuery(query.value))
const filteredLibrary = computed(() =>
  libraryFiles.value.filter((f) => matchFile(f, libraryParsed.value, activeTags.value))
)

/** 私有空间：仅内部搜索（同一套语法，无标签多选入口） */
const privateParsed = computed(() => parseQuery(privateQuery.value))
const filteredPrivate = computed(() =>
  privateFiles.value.filter((f) => matchFile(f, privateParsed.value, []))
)

/** 当前选中文件对象 */
const selected = computed(() =>
  (space.value === 'library' ? libraryFiles.value : privateFiles.value).find((f) => f.id === selectedId.value) ?? null
)

function onUpdateTags(tags: string[]) {
  if (selected.value) selected.value.tags = tags
}

function onUpdateNote(note: string) {
  if (selected.value) selected.value.note = note
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

onUnmounted(() => window.clearTimeout(importTimer))
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

/* ==================== 工具行（搜索 / 操作） ==================== */
.fm-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 搜索框（统一搜索 / 私有空间内搜共用样式） */
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
/* 私有空间内搜：琥珀色聚焦描边（空间主题一致） */
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

/* 通用按钮 */
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
/* 多选提示：明确"必须全含"的筛选语义 */
.fm-tagbar-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 2px;
  font-size: var(--kn-text-2xs);
  color: var(--kn-brand-500);
}

/* ==================== 列表 + 详情 ==================== */
.fm-body {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.fm-main {
  flex: 1;
  min-width: 0;
  padding: 4px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg-elev);
  box-sizing: border-box;
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
