<!--
  Browser：浏览器页面（仅前端演示，未嵌入真实网页）
  - 多标签：新建 / 关闭 / 切换；favicon 字母占位；加载中图标旋转
  - 工具栏：后退 / 前进 / 刷新 / 主页 + 地址栏（域名或关键词）+ 收藏星标
  - 书签栏：收藏站点 chips，点击导航
  - 内容区：新标签页（搜索 + 快捷入口 + 最近访问）/ 模拟网页（骨架 + 演示提示）
  - 接 Tauri WebView 后：内容区替换为真实网页渲染，书签/历史接持久化
-->
<template>
  <div class="bw">
    <BrowserTabBar
      :tabs="tabs"
      :active-id="activeId"
      @activate="activateTab"
      @close="closeTab"
      @new="newTab"
    />

    <BrowserToolbar
      :url="activeTab?.url ?? ''"
      :loading="!!activeTab?.loading"
      :can-back="canBack"
      :can-forward="canForward"
      :bookmarked="isBookmarked"
      @back="go(-1)"
      @forward="go(1)"
      @refresh="refresh"
      @home="goHome"
      @navigate="navigate"
      @toggle-bookmark="toggleBookmark"
    />

    <!-- 书签栏 -->
    <div v-if="bookmarks.length" class="bw-bookmarks">
      <button
        v-for="b in bookmarks"
        :key="b.url"
        type="button"
        class="bw-bookmark"
        :title="b.url"
        @click="navigate(b.url)"
      >
        <span class="bw-bookmark-fav" :style="{ '--tint': faviconOf(b.url).color }">{{ faviconOf(b.url).letter }}</span>
        <span class="bw-bookmark-title">{{ b.title }}</span>
      </button>
    </div>

    <BrowserViewport
      :url="activeTab?.url ?? ''"
      :loading="!!activeTab?.loading"
      :recent="recent"
      @navigate="navigate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { BrowserTabBar, BrowserToolbar, BrowserViewport } from '../component/browser'
import { domainOf, faviconOf, normalizeUrl } from '../component/browser'

/* =================== 标签页状态 =================== */

interface BrowserTab {
  id: number
  /** 标签标题（新标签页 / 域名） */
  title: string
  /** 当前地址（'' = 新标签页） */
  url: string
  /** favicon 占位色/字母 */
  color: string
  letter: string
  loading: boolean
  /** 前进后退历史（url 数组） */
  history: string[]
  histIndex: number
}

let tabSeq = 0
let loadTimer: number | undefined

function createTab(): BrowserTab {
  return {
    id: ++tabSeq,
    title: '新标签页',
    url: '',
    color: 'var(--kn-brand-500)',
    letter: '',
    loading: false,
    history: [],
    histIndex: -1,
  }
}

const tabs = ref<BrowserTab[]>([createTab()])
const activeId = ref(tabs.value[0].id)

const activeTab = computed(() => tabs.value.find((t) => t.id === activeId.value) ?? null)

const canBack = computed(() => !!activeTab.value && activeTab.value.histIndex > 0)
const canForward = computed(
  () => !!activeTab.value && activeTab.value.histIndex < activeTab.value.history.length - 1
)

/* =================== 最近访问 / 书签（演示数据） =================== */

const recent = ref<string[]>([
  'https://github.com/zeionl-f48u/KazeNest',
  'https://tauri.app',
  'https://vite.dev',
])

const bookmarks = ref<{ url: string; title: string }[]>([
  { url: 'https://tauri.app', title: 'Tauri 文档' },
  { url: 'https://cn.vuejs.org', title: 'Vue 3 文档' },
  { url: 'https://github.com', title: 'GitHub' },
])

const isBookmarked = computed(
  () => !!activeTab.value?.url && bookmarks.value.some((b) => b.url === activeTab.value!.url)
)

/* =================== 导航操作 =================== */

/** 在当前标签导航（规范化地址 → 更新标题/favicon/历史/最近访问 → 模拟加载） */
function navigate(input: string) {
  const tab = activeTab.value
  if (!tab) return
  const url = normalizeUrl(input)
  if (!url) return

  tab.url = url
  tab.title = domainOf(url)
  const fav = faviconOf(url)
  tab.color = fav.color
  tab.letter = fav.letter

  /* 截断前进历史后入栈 */
  tab.history = [...tab.history.slice(0, tab.histIndex + 1), url]
  tab.histIndex = tab.history.length - 1

  recent.value = [url, ...recent.value.filter((u) => u !== url)].slice(0, 6)

  tab.loading = true
  window.clearTimeout(loadTimer)
  loadTimer = window.setTimeout(() => {
    tab.loading = false
  }, 650)
}

/** 前进/后退（delta = -1 / 1） */
function go(delta: number) {
  const tab = activeTab.value
  if (!tab) return
  const next = tab.histIndex + delta
  if (next < 0 || next >= tab.history.length) return
  tab.histIndex = next
  const url = tab.history[next]
  tab.url = url
  tab.title = domainOf(url)
  const fav = faviconOf(url)
  tab.color = fav.color
  tab.letter = fav.letter
  tab.loading = true
  window.clearTimeout(loadTimer)
  loadTimer = window.setTimeout(() => {
    tab.loading = false
  }, 450)
}

/** 刷新当前页（模拟加载动画） */
function refresh() {
  const tab = activeTab.value
  if (!tab?.url) return
  tab.loading = true
  window.clearTimeout(loadTimer)
  loadTimer = window.setTimeout(() => {
    tab.loading = false
  }, 650)
}

/** 回到主页（新标签页，不写入历史） */
function goHome() {
  const tab = activeTab.value
  if (!tab) return
  tab.url = ''
  tab.title = '新标签页'
  tab.loading = false
}

/** 收藏/取消收藏当前页 */
function toggleBookmark() {
  const tab = activeTab.value
  if (!tab?.url) return
  const i = bookmarks.value.findIndex((b) => b.url === tab.url)
  if (i >= 0) bookmarks.value.splice(i, 1)
  else bookmarks.value.push({ url: tab.url, title: tab.title })
}

/* =================== 标签操作 =================== */

function activateTab(id: number) {
  activeId.value = id
}

function newTab() {
  const tab = createTab()
  tabs.value.push(tab)
  activeId.value = tab.id
}

function closeTab(id: number) {
  const i = tabs.value.findIndex((t) => t.id === id)
  if (i === -1) return
  tabs.value.splice(i, 1)
  /* 关闭最后一个：自动新开一个，保持浏览器常驻 */
  if (!tabs.value.length) {
    const tab = createTab()
    tabs.value.push(tab)
    activeId.value = tab.id
    return
  }
  if (activeId.value === id) {
    const next = tabs.value[Math.min(i, tabs.value.length - 1)]
    activeId.value = next.id
  }
}

onUnmounted(() => window.clearTimeout(loadTimer))
</script>

<style scoped>
.bw {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--kn-bg);
}

/* 书签栏 */
.bw-bookmarks {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 34px;
  padding: 0 10px;
  border-bottom: 1px solid var(--kn-border);
  background: var(--kn-bg-elev);
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}
.bw-bookmarks::-webkit-scrollbar {
  display: none;
}
.bw-bookmark {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--kn-radius-md);
  background: transparent;
  color: var(--kn-fg-muted);
  font: inherit;
  font-size: var(--kn-text-xs);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background var(--kn-dur-fast), color var(--kn-dur-fast);
}
.bw-bookmark:hover {
  background: var(--kn-hover);
  color: var(--kn-fg);
}
.bw-bookmark-fav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: var(--kn-radius-xs);
  background: color-mix(in srgb, var(--tint) 18%, transparent);
  color: var(--tint);
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
</style>
