<!--
  BrowserViewport：浏览器内容区
  - 新标签页（url 为空）：Logo + 搜索框 + 快捷入口卡片 + 最近访问
  - 模拟网页（url 非空）：假站点头（favicon/域名/菜单）+ 加载进度条 + 骨架内容 + 演示提示
    （接 Tauri WebView 后替换为真实网页渲染）
-->
<template>
  <!-- ==================== 新标签页 ==================== -->
  <div v-if="!url" class="bv-start">
    <div class="bv-start-logo">
      <Icon name="globe" :size="30" />
    </div>
    <h1 class="bv-start-title">KazeNest 浏览器</h1>
    <p class="bv-start-sub">搜索或输入网址开始浏览</p>

    <!-- 搜索框（Enter 后作为地址/搜索交给父级导航） -->
    <form class="bv-start-search" @submit.prevent="submitSearch">
      <Icon name="search" :size="14" class="bv-start-search-icon" />
      <input
        v-model="draft"
        class="bv-start-search-input"
        placeholder="搜索或输入网址"
        spellcheck="false"
      />
      <button type="submit" class="bv-start-search-btn" :disabled="!draft.trim()">打开</button>
    </form>

    <!-- 快捷入口 -->
    <div class="bv-quick">
      <button
        v-for="q in QUICK_LINKS"
        :key="q.url"
        type="button"
        class="bv-quick-card"
        :style="{ '--tint': q.color }"
        @click="emit('navigate', q.url)"
      >
        <span class="bv-quick-fav">{{ q.letter }}</span>
        <span class="bv-quick-name">{{ q.name }}</span>
        <span class="bv-quick-url">{{ q.host }}</span>
      </button>
    </div>

    <!-- 最近访问 -->
    <div v-if="recent.length" class="bv-recent">
      <div class="bv-recent-title">
        <Icon name="clock" :size="11" />
        <span>最近访问</span>
      </div>
      <button v-for="r in recent" :key="r" type="button" class="bv-recent-item" @click="emit('navigate', r)">
        <span class="bv-recent-fav" :style="{ '--tint': faviconOf(r).color }">{{ faviconOf(r).letter }}</span>
        <span class="bv-recent-host">{{ domainOf(r) }}</span>
        <span class="bv-recent-url">{{ r }}</span>
      </button>
    </div>
  </div>

  <!-- ==================== 模拟网页 ==================== -->
  <div v-else class="bv-page">
    <!-- 加载进度条 -->
    <div class="bv-progress" :class="{ 'is-loading': loading }"><i /></div>

    <!-- 假站点头 -->
    <header class="bv-page-head">
      <span class="bv-page-fav" :style="{ '--tint': fav.color }">{{ fav.letter }}</span>
      <span class="bv-page-domain">{{ domainOf(url) }}</span>
      <nav class="bv-page-nav">
        <span>首页</span>
        <span>文档</span>
        <span>博客</span>
        <span>关于</span>
      </nav>
      <span class="bv-page-secure">
        <Icon name="lock" :size="10" />
        https
      </span>
    </header>

    <!-- 页面骨架 -->
    <div class="bv-page-body">
      <div class="bv-notice" :style="{ '--tint': fav.color }">
        <Icon name="globe" :size="14" />
        <span>演示模式：这里将嵌入真实网页（接 Tauri WebView 后渲染 <b>{{ url }}</b>）</span>
      </div>

      <div class="bv-skeleton">
        <div class="bv-sk-hero" :style="{ '--tint': fav.color }">
          <span class="bv-sk-hero-tag">{{ fav.letter }}</span>
          <span class="bv-sk-hero-line is-main" />
          <span class="bv-sk-hero-line is-sub" />
        </div>
        <div class="bv-sk-lines">
          <i /><i /><i class="is-short" />
        </div>
        <div class="bv-sk-cards">
          <span v-for="n in 3" :key="n">
            <i class="bv-sk-card-bar" />
            <i class="bv-sk-card-line" />
            <i class="bv-sk-card-line is-short" />
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '../common'
import { domainOf, faviconOf } from './favicon'

const props = defineProps<{
  /** 当前地址（'' = 新标签页） */
  url: string
  /** 是否加载中（顶部进度条动画） */
  loading: boolean
  /** 最近访问（新标签页展示） */
  recent: string[]
}>()

const emit = defineEmits<{ navigate: [url: string] }>()

const draft = ref('')

function submitSearch() {
  const v = draft.value.trim()
  if (!v) return
  draft.value = ''
  emit('navigate', v)
}

/** 当前页 favicon 占位 */
const fav = { get letter() { return faviconOf(props.url).letter }, get color() { return faviconOf(props.url).color } }

/** 快捷入口（演示数据；接真实偏好后可从配置读取） */
const QUICK_LINKS = [
  { name: 'GitHub',  url: 'https://github.com',            host: 'github.com',            color: 'var(--kn-fg)',          letter: 'G' },
  { name: 'Tauri',   url: 'https://tauri.app',             host: 'tauri.app',             color: 'var(--kn-amber-500)',   letter: 'T' },
  { name: 'Vue 3',   url: 'https://cn.vuejs.org',          host: 'cn.vuejs.org',          color: 'var(--kn-emerald-500)', letter: 'V' },
  { name: 'MDN',     url: 'https://developer.mozilla.org', host: 'developer.mozilla.org', color: 'var(--kn-sky-500)',     letter: 'M' },
  { name: '掘金',    url: 'https://juejin.cn',             host: 'juejin.cn',             color: 'var(--kn-brand-500)',   letter: '掘' },
  { name: 'Bilibili',url: 'https://www.bilibili.com',      host: 'bilibili.com',          color: 'var(--kn-rose-500)',    letter: 'B' },
]
</script>

<style scoped>
/* ==================== 新标签页 ==================== */
.bv-start {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 24px;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  overflow-y: auto;
}
.bv-start-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--kn-radius-2xl);
  background: linear-gradient(135deg, var(--kn-brand-500), var(--kn-magenta-500));
  color: #fff;
  box-shadow: var(--kn-shadow-lg);
}
.bv-start-title {
  margin: 6px 0 0;
  font-size: var(--kn-text-2xl);
  font-weight: 700;
}
.bv-start-sub {
  margin: 0;
  font-size: var(--kn-text-sm);
  color: var(--kn-fg-muted);
}

/* 搜索框 */
.bv-start-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 520px;
  height: 40px;
  margin-top: 8px;
  padding: 0 6px 0 14px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-pill);
  background: var(--kn-bg-elev);
  transition: border-color var(--kn-dur-fast), box-shadow var(--kn-dur-fast);
}
.bv-start-search:focus-within {
  border-color: color-mix(in srgb, var(--kn-brand-500) 55%, transparent);
  box-shadow: var(--kn-shadow-focus);
}
.bv-start-search-icon {
  color: var(--kn-fg-subtle);
  flex-shrink: 0;
}
.bv-start-search-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
}
.bv-start-search-input::placeholder {
  color: var(--kn-fg-subtle);
}
.bv-start-search-btn {
  height: 28px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--kn-radius-pill);
  background: linear-gradient(135deg, var(--kn-brand-500), var(--kn-magenta-500));
  color: #fff;
  font: inherit;
  font-size: var(--kn-text-xs);
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}
.bv-start-search-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* 快捷入口 */
.bv-quick {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  max-width: 560px;
  margin-top: 12px;
}
.bv-quick-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px 12px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg-elev);
  color: var(--kn-fg);
  font: inherit;
  cursor: pointer;
  transition: background var(--kn-dur-fast), border-color var(--kn-dur-fast), transform var(--kn-dur-fast);
}
.bv-quick-card:hover {
  background: color-mix(in srgb, var(--tint) 6%, transparent);
  border-color: color-mix(in srgb, var(--tint) 35%, transparent);
  transform: translateY(-1px);
}
.bv-quick-fav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--kn-radius-md);
  background: color-mix(in srgb, var(--tint) 16%, transparent);
  color: var(--tint);
  font-size: var(--kn-text-md);
  font-weight: 700;
}
.bv-quick-name {
  font-size: var(--kn-text-sm);
  font-weight: 600;
}
.bv-quick-url {
  font-size: 10px;
  color: var(--kn-fg-subtle);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 最近访问 */
.bv-recent {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  max-width: 560px;
  margin-top: 14px;
}
.bv-recent-title {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 4px 4px;
  font-size: var(--kn-text-2xs);
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--kn-fg-subtle);
  text-transform: uppercase;
}
.bv-recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--kn-radius-md);
  background: transparent;
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-xs);
  cursor: pointer;
  text-align: left;
  transition: background var(--kn-dur-fast);
}
.bv-recent-item:hover {
  background: var(--kn-hover);
}
.bv-recent-fav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--kn-radius-xs);
  background: color-mix(in srgb, var(--tint) 16%, transparent);
  color: var(--tint);
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
.bv-recent-host {
  font-weight: 600;
  flex-shrink: 0;
}
.bv-recent-url {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--kn-fg-subtle);
  font-size: 10px;
}

/* ==================== 模拟网页 ==================== */
.bv-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  background: var(--kn-bg);
}

/* 顶部加载进度条 */
.bv-progress {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  overflow: hidden;
  z-index: 2;
}
.bv-progress i {
  display: block;
  width: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--kn-brand-500), var(--kn-magenta-500));
}
.bv-progress.is-loading i {
  animation: bv-load 0.65s var(--kn-ease-out) forwards;
}
@keyframes bv-load {
  0%   { width: 0; }
  70%  { width: 78%; }
  100% { width: 100%; }
}

/* 假站点头 */
.bv-page-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--kn-border);
  background: var(--kn-bg-elev);
  flex-shrink: 0;
}
.bv-page-fav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--kn-radius-sm);
  background: color-mix(in srgb, var(--tint) 18%, transparent);
  color: var(--tint);
  font-size: var(--kn-text-sm);
  font-weight: 700;
  flex-shrink: 0;
}
.bv-page-domain {
  font-size: var(--kn-text-sm);
  font-weight: 600;
}
.bv-page-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: 12px;
  font-size: var(--kn-text-xs);
  color: var(--kn-fg-muted);
}
.bv-page-nav span {
  cursor: default;
}
.bv-page-secure {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--kn-fg-subtle);
}

/* 页面骨架 */
.bv-page-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}
.bv-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px dashed color-mix(in srgb, var(--tint) 45%, transparent);
  border-radius: var(--kn-radius-md);
  background: color-mix(in srgb, var(--tint) 6%, transparent);
  color: var(--kn-fg-muted);
  font-size: var(--kn-text-xs);
}
.bv-notice b {
  color: var(--kn-fg);
  font-weight: 600;
}
.bv-skeleton {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.bv-sk-hero {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px;
  border-radius: var(--kn-radius-lg);
  background: linear-gradient(135deg, color-mix(in srgb, var(--tint) 14%, transparent), transparent 70%);
  border: 1px solid var(--kn-border);
}
.bv-sk-hero-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--kn-radius-md);
  background: color-mix(in srgb, var(--tint) 20%, transparent);
  color: var(--tint);
  font-size: var(--kn-text-lg);
  font-weight: 700;
}
.bv-sk-hero-line {
  display: block;
  height: 10px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--kn-fg) 12%, transparent);
}
.bv-sk-hero-line.is-main { width: 46%; height: 14px; background: color-mix(in srgb, var(--kn-fg) 18%, transparent); }
.bv-sk-hero-line.is-sub  { width: 64%; }

.bv-sk-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bv-sk-lines i {
  display: block;
  height: 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--kn-fg) 9%, transparent);
}
.bv-sk-lines i.is-short { width: 55%; }

.bv-sk-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.bv-sk-cards > span {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg-elev);
}
.bv-sk-card-bar {
  display: block;
  width: 26px;
  height: 26px;
  border-radius: var(--kn-radius-sm);
  background: color-mix(in srgb, var(--kn-fg) 10%, transparent);
}
.bv-sk-card-line {
  display: block;
  height: 7px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--kn-fg) 9%, transparent);
}
.bv-sk-card-line.is-short { width: 60%; }
</style>
