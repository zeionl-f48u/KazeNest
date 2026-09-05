<!--
  SearchTrigger：VS Code 命令中心（Command Center）风格搜索触发器
  - 静态时显示「搜索 + 快捷键」的胶囊输入框
  - 悬停 / focus 时背景与描边加深（commandCenter.active*）
  - 点击触发 openSearch
-->
<template>
  <button
    type="button"
    class="st-trigger"
    :class="{ 'is-open': modelValue }"
    :aria-label="'打开搜索'"
    @click="$emit('open')"
  >
    <Icon name="search" :size="14" class="st-icon" />
    <span class="st-text">搜索</span>
    <kbd class="st-kbd">{{ shortcutHint }}</kbd>
  </button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '../common'

defineProps<{
  /** 搜索面板是否打开（用于切换 "is-open" 态）*/
  modelValue: boolean
}>()

defineEmits<{
  open: []
}>()

const isMac = ref(false)
/* 快捷键提示文案：改这里可换快捷键显示（实际绑定在 onGlobalKeydown） */
const shortcutHint = computed(() => (isMac.value ? '⌘ K' : 'Ctrl K'))

onMounted(() => {
  isMac.value = /Mac|iPhone|iPad/.test(navigator.platform)
  window.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
})

/**
 * ⌘K / Ctrl+K 全局快捷键。
 * 注意：实际开关面板的逻辑由父组件持有面板状态，
 * 这里只发 open 事件；如果父组件想切换"开关"语义，
 * 可以监听此事件并 toggle 自己的 modelValue。
 */
function onGlobalKeydown(e: KeyboardEvent) {
  const meta = isMac.value ? e.metaKey : e.ctrlKey
  if (meta && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    // 注意：这里不直接 emit，因为可能从关闭态触发"打开"
    // 父组件会通过监听 'open' 来 toggle
    window.dispatchEvent(new CustomEvent('titlebar:search-toggle'))
  }
}
</script>

<style scoped>
/* macOS 命令中心：22px 高、胶囊圆角、柔和凹陷底 + 描边 */
/* 搜索框尺寸调节：
 * - min-width 220 / max-width 600 / width 34vw → 中央命令中心的常态宽度
 * - focus 时 width 80% → 打开面板时的拉宽效果
 * - 极窄 640px 以下会缩成 36px 图标按钮 */
.st-trigger {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 24px;
  padding: 0 8px 0 10px;
  background: var(--tb-search-bg);
  border: 1px solid var(--tb-search-border);
  border-radius: var(--tb-search-radius);
  color: inherit;
  font-size: var(--kn-text-sm);
  cursor: text;
  min-width: 220px;
  max-width: 600px;
  width: 34vw;
  transition:
    background var(--tb-transition-fast),
    border-color var(--tb-transition-fast),
    width var(--tb-transition-slow);
}
.st-trigger:hover {
  background: var(--tb-search-bg-hover);
  border-color: var(--tb-search-border-focus);
}
.st-trigger:focus-visible,
.st-trigger.is-open {
  background: var(--tb-search-bg-focus);
  border-color: var(--tb-search-border-focus);
  outline: none;
  width: 80%;
}

.st-icon { opacity: 0.8; }

.st-text {
  flex: 1;
  text-align: left;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.st-kbd {
  font-family: inherit;
  font-size: 10px;
  padding: 1px 5px;
  border: 1px solid var(--tb-kbd-border);
  border-radius: 3px;
  background: var(--tb-kbd-bg);
  color: var(--tb-kbd-fg);
}

/* ============ 响应式：搜索框最后才缩小 ============ */
/* 窗口变窄时优先折叠左侧菜单（文件/编辑/… 收进 ⋯），搜索框保持完整；
 * 仅当极窄、菜单已全部折叠仍不够时才缩小搜索框。 */
/* 较窄：只隐藏快捷键（搜索框宽度不变） */
@media (max-width: 800px) {
  .st-kbd { display: none; }
}
/* 极窄（低于 tauri minWidth 800，仅兜底）：搜索变为图标按钮 */
@media (max-width: 640px) {
  .st-trigger {
    width: 36px;
    min-width: 36px;
    max-width: 36px;
    padding: 0;
    justify-content: center;
  }
  .st-text { display: none; }
}
</style>
