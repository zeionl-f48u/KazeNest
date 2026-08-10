<!--
  Titlebar：顶栏骨架（macOS 风格布局）
  - 纯布局：left(应用名+菜单栏) | center(命令中心) | trailing(动作) | caption-spacer
  - 搜索功能由 SearchTrigger + SearchPanel 子组件承担
  - 所有视觉 token 来自 ./tokens.css
  - 配色 / 尺寸 / 间距修改只动 tokens.css
-->
<template>
  <!--
    data-tauri-drag-region="deep"：由 Tauri 的 drag.js 处理拖动，
    它会自动跳过按钮等可点击元素（只让空白区域触发拖动），
    因此不再需要 -webkit-app-region（后者在 WebView2 上会吞掉子元素点击）。
  -->
  <header
    class="tb"
    :class="{ 'is-inactive': isInactive }"
    data-tauri-drag-region="deep"
  >
    <!-- 最左端：应用图标 + 应用名（KazeNest）+ 菜单栏 -->
    <div class="tb-left">
      <button
        v-if="showIcon"
        class="tb-icon-btn"
        :aria-label="`${title} 菜单`"
        @click="emit('iconClick')"
        @contextmenu.prevent="emit('iconContextMenu', $event)"
      >
        <img
          v-if="iconUrl"
          :src="iconUrl"
          :alt="title"
          class="tb-icon-img"
        />
        <Icon v-else :name="appIcon" :size="15" class="tb-icon-fallback" />
      </button>

      <span class="tb-title">{{ title }}</span>

      <div v-if="$slots.leading" class="tb-slot tb-slot--leading">
        <slot name="leading" />
      </div>
    </div>

    <!-- 中央：命令中心搜索 -->
    <div class="tb-center">
      <slot name="center" :open="openSearch" :close="closeSearch" :open-state="searchOpen">
        <SearchTrigger :model-value="searchOpen" @open="openSearch" />
      </slot>
    </div>

    <!-- 右侧扩展位 -->
    <div v-if="$slots.trailing" class="tb-slot tb-slot--trailing">
      <slot name="trailing" />
    </div>

    <!-- 右侧 padding（让出 caption 控件区域） -->
    <div
      class="tb-caption-spacer"
      :style="{ width: captionSpacerWidth }"
    />

    <!-- 搜索面板（独立组件，Teleport 到 body） -->
    <SearchPanel
      v-if="searchEnabled"
      v-model="searchOpen"
      :items="searchItems"
      @select="onSearchSelect"
    />
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '../common'
import SearchTrigger from './SearchTrigger.vue'
import SearchPanel from './SearchPanel.vue'
import type { SearchItem } from './types'

withDefaults(
  defineProps<{
    title?: string
    /** 应用图标名（走 Icon 组件，缺省云端 logo） */
    appIcon?: string
    iconUrl?: string
    showIcon?: boolean
    isInactive?: boolean
    /** 搜索面板的候选项 */
    searchItems?: SearchItem[]
    /** 是否启用搜索功能（false 时中央不渲染 trigger，面板也不会出现）*/
    searchEnabled?: boolean
  }>(),
  {
    title: 'KazeNest',
    appIcon: 'cloud',
    iconUrl: '',
    showIcon: true,
    isInactive: false,
    searchItems: () => [],
    searchEnabled: true,
  }
)

const emit = defineEmits<{
  iconClick: []
  iconContextMenu: [MouseEvent]
  searchSelect: [SearchItem]
}>()

/* =================== 搜索功能 =================== */

const searchOpen = ref(false)

function openSearch() {
  if (searchOpen.value) return
  searchOpen.value = true
}

function closeSearch() {
  searchOpen.value = false
}

function onSearchSelect(item: SearchItem) {
  emit('searchSelect', item)
}

/**
 * 监听 SearchTrigger 派发的全局 ⌘K / Ctrl+K 事件
 * SearchTrigger 组件内部已经屏蔽了事件，所以这里负责 toggle
 */
function onGlobalToggle() {
  searchOpen.value = !searchOpen.value
}

onMounted(() => window.addEventListener('titlebar:search-toggle', onGlobalToggle))
onBeforeUnmount(() => window.removeEventListener('titlebar:search-toggle', onGlobalToggle))

/* =================== caption 区域宽度 =================== */

/**
 * 右侧让给 caption 控件（─ ☐ ✕）的空间。
 * 插件会写入 --tauri-plugin-decoration-right-clearance；
 * 未注入时用 139px（3 个 46px 按钮 + 1px 缝隙）兜底。
 */
const captionSpacerWidth = computed(
  () => `max(8px, var(--tauri-plugin-decoration-right-clearance, 139px))`
)
</script>

<style scoped>
.tb {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--tb-height);
  z-index: 50;

  /* 整条不可选中；拖动由 data-tauri-drag-region="deep" 的 drag.js 处理 */
  user-select: none;
  -webkit-user-select: none;
  cursor: default;
  box-sizing: border-box;

  display: flex;
  align-items: center;
  padding: 0 var(--tb-pad-x);
  gap: var(--tb-gap);

  /* macOS 毛玻璃：半透明底 + backdrop blur + 发丝分隔线 + 顶光 */
  background: var(--tb-bg);
  backdrop-filter: saturate(var(--tb-saturation)) blur(var(--tb-blur));
  -webkit-backdrop-filter: saturate(var(--tb-saturation)) blur(var(--tb-blur));
  border-bottom: 1px solid var(--tb-divider);
  box-shadow: var(--tb-shadow);
  color: var(--tb-fg);
  font-family: var(--kn-font-sans);
  font-size: var(--tb-title-font-size);
  font-weight: 400;
  letter-spacing: 0.1px;
  transition: opacity var(--tb-transition-fast), background var(--tb-transition-fast);
  /* 兜底：窗口缩小时不重叠，溢出内容裁剪而非挤压重叠 */
  overflow: hidden;
}

.tb.is-inactive { opacity: 0.6; }

/* ============ 最左端（应用名 + 菜单栏） ============ */
.tb-left {
  display: flex;
  align-items: center;
  gap: var(--tb-gap);
  flex-shrink: 1;      /* 允许收缩，优先让中央搜索区保持可用 */
  min-width: 0;
  overflow: hidden;
}

/* 窗口较窄：隐藏应用名（保留应用图标） */
@media (max-width: 900px) {
  .tb-title { display: none; }
}

.tb-icon-btn {
  width: var(--tb-btn-size);
  height: var(--tb-btn-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  border-radius: var(--tb-btn-radius);
  cursor: pointer;
  pointer-events: auto;
  color: inherit;
  padding: 0;
  transition: background var(--tb-transition-fast);
}
.tb-icon-btn:hover  { background: var(--tb-hover); }
.tb-icon-btn:active { background: var(--tb-active); }

.tb-icon-img {
  width: var(--tb-icon-size);
  height: var(--tb-icon-size);
  display: block;
}
.tb-icon-fallback { line-height: 1; }

/* 应用名：最左端、加粗、可拖动 */
.tb-title {
  font-size: var(--tb-title-font-size);
  font-weight: 600;
  letter-spacing: 0.1px;
  color: var(--tb-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
  pointer-events: none;       /* 让事件穿透，点击落在 header 上触发拖动 */
  opacity: 0.92;
}

/* ============ 中央（命令中心） ============ */
.tb-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 0;
  height: 100%;
}

/* ============ 扩展 slot ============ */
.tb-slot {
  display: flex;
  align-items: center;
  gap: var(--tb-toolbar-gap);
  pointer-events: auto;     /* 显式开启，确保事件落在 slot */
  flex-shrink: 0;
  position: relative;
  z-index: 2;               /* 盖过 .tb 的 stacking context，确保事件落在 slot */
  isolation: isolate;       /* 创建独立 stacking context，防止外部 transform 影响 */
}
/* 所有后代都保持可交互（拖动由 drag.js 按元素类型智能判断） */
.tb-slot :deep(*) {
  pointer-events: auto !important;
}
/* button / input 显式指针样式 + 允许文本选择（如果有） */
.tb-slot :deep(button),
.tb-slot :deep(input) {
  user-select: text;
  pointer-events: auto;
  cursor: pointer;
}

/* ============ caption 让位 ============ */
.tb-caption-spacer {
  flex-shrink: 0;
  height: 100%;
  /* 这是给原生 caption 控件留的安全区，不接收 WebView 事件 */
  pointer-events: none;
}
</style>
