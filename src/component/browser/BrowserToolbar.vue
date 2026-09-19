<!--
  BrowserToolbar：浏览器工具栏（导航 + 地址栏 + 操作）
  - 导航：后退 / 前进 / 刷新（加载中旋转） / 主页
  - 地址栏：安全锁 + 输入框（聚焦全选；Enter 导航/搜索）
  - 操作：收藏星标（激活填充） / 更多（演示）
-->
<template>
  <div class="bt">
    <div class="bt-nav">
      <button type="button" class="bt-btn" :disabled="!canBack" title="后退" @click="emit('back')">
        <Icon name="arrow-left" :size="14" />
      </button>
      <button type="button" class="bt-btn" :disabled="!canForward" title="前进" @click="emit('forward')">
        <Icon name="arrow-right" :size="14" />
      </button>
      <button
        type="button"
        class="bt-btn"
        :class="{ 'is-spin': loading }"
        :disabled="!url"
        title="刷新"
        @click="emit('refresh')"
      >
        <Icon name="refresh" :size="14" />
      </button>
      <button type="button" class="bt-btn" title="主页（新标签页）" @click="emit('home')">
        <Icon name="home" :size="14" />
      </button>
    </div>

    <form class="bt-addr" @submit.prevent="onSubmit">
      <Icon :name="url ? 'lock' : 'search'" :size="11" class="bt-addr-icon" />
      <input
        ref="inputRef"
        v-model="draft"
        class="bt-addr-input"
        :placeholder="'搜索或输入网址'"
        spellcheck="false"
        @focus="onFocus"
      />
    </form>

    <div class="bt-actions">
      <button
        type="button"
        class="bt-btn"
        :class="{ 'is-starred': bookmarked }"
        :disabled="!url"
        :title="bookmarked ? '取消收藏' : '收藏此页'"
        @click="emit('toggle-bookmark')"
      >
        <Icon :name="bookmarked ? 'star-fill' : 'star'" :size="14" />
      </button>
      <button type="button" class="bt-btn" title="更多（演示）" @click="onMore">
        <Icon name="ellipsis-h" :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '../common'
import { showDemo } from '../../utils'

const props = defineProps<{
  /** 当前地址（'' = 新标签页） */
  url: string
  /** 是否加载中（刷新按钮旋转） */
  loading: boolean
  canBack: boolean
  canForward: boolean
  /** 当前页是否已收藏 */
  bookmarked: boolean
}>()

const emit = defineEmits<{
  back: []
  forward: []
  refresh: []
  home: []
  navigate: [url: string]
  'toggle-bookmark': []
}>()

/** 地址栏草稿：显示时去掉协议前缀（主流浏览器行为） */
const draft = ref(display(props.url))
const inputRef = ref<HTMLInputElement | null>(null)

function display(url: string) {
  return url.replace(/^https?:\/\//, '')
}

watch(() => props.url, (v) => {
  draft.value = display(v)
})

function onFocus() {
  inputRef.value?.select()
}

function onSubmit() {
  emit('navigate', draft.value)
}

/** 更多（演示）：还没有真实菜单，给点击画面反馈 */
function onMore() {
  showDemo({ title: '更多', desc: '演示模式：浏览器更多菜单尚未接入', icon: 'globe' })
}
</script>

<style scoped>
.bt {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 10px;
  background: var(--kn-bg-elev);
  border-bottom: 1px solid var(--kn-border);
  flex-shrink: 0;
}

/* 导航与操作按钮 */
.bt-nav,
.bt-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.bt-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--kn-fg-muted);
  cursor: pointer;
  transition: background var(--kn-dur-fast), color var(--kn-dur-fast);
}
.bt-btn:hover:not(:disabled) {
  background: var(--kn-hover);
  color: var(--kn-fg);
}
.bt-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
/* 刷新加载中：图标旋转 */
.bt-btn.is-spin {
  animation: bt-spin 0.9s linear infinite;
}
@keyframes bt-spin {
  to { transform: rotate(360deg); }
}
/* 收藏激活态：金色填充 */
.bt-btn.is-starred {
  color: var(--kn-amber-500);
}
.bt-btn.is-starred:hover:not(:disabled) {
  color: var(--kn-amber-500);
}

/* 地址栏 */
.bt-addr {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-pill);
  background: var(--kn-bg-sunken);
  transition: border-color var(--kn-dur-fast), box-shadow var(--kn-dur-fast), background var(--kn-dur-fast);
}
.bt-addr:focus-within {
  background: var(--kn-bg-elev);
  border-color: color-mix(in srgb, var(--kn-brand-500) 55%, transparent);
  box-shadow: var(--kn-shadow-focus);
}
.bt-addr-icon {
  color: var(--kn-fg-subtle);
  flex-shrink: 0;
}
.bt-addr-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
}
.bt-addr-input::placeholder {
  color: var(--kn-fg-subtle);
}
</style>
