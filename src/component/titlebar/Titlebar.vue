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
    :class="{ 'is-inactive': isInactive, 'is-mac': isMac }"
    data-tauri-drag-region="deep"
  >
    <!-- 最左端：应用图标 + 应用名（KazeNest）+ 菜单栏 -->
    <div ref="leftRef" class="tb-left">
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
        <Icon v-else :name="appIcon" :size="17" class="tb-icon-fallback" />
      </button>

      <span ref="titleRef" class="tb-title">{{ title }}</span>

      <div
        ref="leadingSlotRef"
        v-if="$slots.leading"
        class="tb-slot tb-slot--leading"
      >
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
import { isMac } from '../../utils'

withDefaults(
  defineProps<{
    /** 顶栏左侧应用名（App.vue 传入 "KazeNest"） */
    title?: string
    /** 应用图标名（走 Icon 组件，缺省云端 logo） */
    appIcon?: string
    /** 自定义图标地址（传了就用 <img> 替代 Icon） */
    iconUrl?: string
    /** 是否显示最左端应用图标按钮 */
    showIcon?: boolean
    /** 窗口失焦时顶栏半透明（is-inactive） */
    isInactive?: boolean
    /** 搜索面板的候选项（来自 data/searchItems.ts） */
    searchItems?: SearchItem[]
    /** 是否启用搜索功能（false 时中央不渲染 trigger，面板也不会出现） */
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

/* =================== 溢出布局：leading slot 固定 flex-basis ===================
 *
 * 背景：TitlebarChrome 会按「可用宽度」把放不下的菜单收进 ⋯。
 * 若 leading slot 用 flex-basis:auto，一旦菜单被 display:none，
 * 它的 max-content 变小 → flex 把 slot 宽度压缩 → 触发 ResizeObserver
 * → 又隐藏更多菜单……形成「坍缩反馈循环」，窗口变宽后也无法恢复。
 *
 * 解法：把 slot 的 flex-basis 固定为「全部内容自然宽度」（scrollWidth
 * 即使被裁剪也返回完整内容宽度），使 slot 宽度只由 flex 分配决定，
 * 与可见内容无关，从而打破循环；恢复时 slot 也会回到自然宽度。
 */
const leadingSlotRef = ref<HTMLElement>()
function syncLeadingBasis() {
  const el = leadingSlotRef.value
  if (!el) return
  /* 子组件 TitlebarChrome 会先挂载并立即 layout() 折叠放不下的菜单，
   * 若此时直接量 scrollWidth 会得到"折叠后"的宽度并固化（窄窗口启动时
   * 的 bug：放大后永远恢复不了）。所以测量前先临时还原所有折叠项：
   * 强制显示菜单 + 还原工作区图标化，量到真实自然宽度再还原。 */
  const menus = Array.from(el.querySelectorAll<HTMLElement>('.tb-menu'))
  const ws = el.querySelector<HTMLElement>('.tb-workspace')
  const wsIconOnly = ws?.classList.contains('is-icon-only') ?? false
  const prevDisplays: (string | null)[] = []
  menus.forEach((m, i) => {
    prevDisplays[i] = m.style.display
    m.style.display = 'inline-flex' // 覆盖 .is-overflowed 的 display:none
  })
  if (ws && wsIconOnly) ws.classList.remove('is-icon-only')
  const natural = el.scrollWidth
  menus.forEach((m, i) => { m.style.display = prevDisplays[i] ?? '' })
  if (ws && wsIconOnly) ws.classList.add('is-icon-only')
  if (natural > 0) {
    const current = parseFloat(el.style.flexBasis || '0')
    if (Math.abs(current - natural) > 1) el.style.flexBasis = `${natural}px`
  }
}

/* .tb-left 也需要固定 flex-basis：它若用 auto，隐藏菜单会让它的
 * max-content 变小 → 宽度不再恢复 → ResizeObserver 不再触发 → 菜单卡在 ⋯。
 * 这里用「真实自然宽度」= 图标 + 标题内容宽（scrollWidth 不受截断影响）
 * + slot 固定 basis + 间距，状态无关，窄→宽可恢复。
 */
const leftRef = ref<HTMLElement>()

/* =================== 应用名完全收缩 ===================
 * 让位顺序：菜单收进 ⋯（TitlebarChrome）→ 应用名收缩（本段）→ 搜索框（.tb-center min-width 兜底）。
 * 应用名宽度由脚本管理（不参与 flex 收缩）：空间不足时逐渐收窄（省略号），
 * 完全放不下时隐藏（display:none）—— 即 "KazeNest 可以被完全收缩"。
 */

const titleRef = ref<HTMLElement>()

/** 应用名自然宽度（缓存；隐藏状态下 scrollWidth 为 0，避免污染左区 basis 计算） */
let titleNatural = 0

/** 测量应用名自然宽度（隐藏状态下临时展开测量） */
function measureTitleNatural() {
  const title = titleRef.value
  if (!title) return
  const wasCollapsed = title.classList.contains('is-collapsed')
  if (wasCollapsed) title.classList.remove('is-collapsed')
  titleNatural = title.scrollWidth
  if (wasCollapsed) title.classList.add('is-collapsed')
}

/** 应用名可用宽度 = 左区宽 − 应用图标 − leading slot − 间距；据此收窄/隐藏 */
function updateTitleWidth() {
  const left = leftRef.value
  const title = titleRef.value
  const slot = leadingSlotRef.value
  if (!left || !title || !slot) return
  const gap = parseFloat(getComputedStyle(left).gap) || 0
  const icon = left.querySelector<HTMLElement>('.tb-icon-btn')
  const iconW = icon ? icon.offsetWidth : 0
  const avail = Math.max(0, left.clientWidth - iconW - slot.offsetWidth - gap * 2)

  if (avail <= 1) {
    /* 完全收缩：隐藏（宽度归零会留下省略号残影） */
    title.classList.add('is-collapsed')
    title.style.width = ''
    return
  }
  title.classList.remove('is-collapsed')
  title.style.width = avail < titleNatural ? `${Math.floor(avail)}px` : ''
}

function computeLeftNatural(): number {
  const left = leftRef.value
  if (!left) return 0
  const icon = left.querySelector<HTMLElement>('.tb-icon-btn')
  const title = left.querySelector<HTMLElement>('.tb-title')
  const slot = leadingSlotRef.value
  if (!icon || !title || !slot) return 0
  const gap = parseFloat(getComputedStyle(left).gap) || 0
  const iconW = icon.getBoundingClientRect().width
  const titleW = titleNatural || title.scrollWidth // 内容宽，与收窄/隐藏状态无关
  const slotW = parseFloat(slot.style.flexBasis) || slot.getBoundingClientRect().width
  return Math.ceil(iconW + titleW + slotW + gap * 2)
}

function syncLeftBasis() {
  const left = leftRef.value
  const natural = computeLeftNatural()
  if (left && natural > 0) {
    const current = parseFloat(left.style.flexBasis || '0')
    if (Math.abs(current - natural) > 1) left.style.flexBasis = `${natural}px`
  }
}

/** 左区宽度观察器：宽度变化时刷新应用名收缩 */
let leftObserver: ResizeObserver | undefined

onMounted(() => {
  window.addEventListener('titlebar:search-toggle', onGlobalToggle)
  measureTitleNatural()
  syncLeadingBasis()
  syncLeftBasis()
  updateTitleWidth()
  // 字体加载完成后自然宽度可能变化，重新校准
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
  if (fonts?.ready) fonts.ready.then(() => {
    measureTitleNatural()
    syncLeadingBasis()
    syncLeftBasis()
    updateTitleWidth()
  })
  /* 窗口缩放 / 菜单溢出 / 搜索框让位都会改变左区宽度 → 实时刷新应用名 */
  if (leftRef.value && typeof ResizeObserver !== 'undefined') {
    leftObserver = new ResizeObserver(() => updateTitleWidth())
    leftObserver.observe(leftRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('titlebar:search-toggle', onGlobalToggle)
  leftObserver?.disconnect()
})

/* =================== caption 区域宽度 =================== */

/**
 * 窗口控制区让位：
 * - Windows / Linux：右侧给原生 caption 控件（─ ☐ ✕）留空间
 *   （插件注入 --tauri-plugin-decoration-right-clearance，未注入时兜底 139px）
 * - macOS：控制按钮（交通灯）在左上角，右侧只需极小留白
 */
const captionSpacerWidth = computed(() =>
  isMac
    ? '8px'
    : 'max(8px, var(--tauri-plugin-decoration-right-clearance, 139px))'
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

/* ============ macOS：为左上角交通灯让位 ============
 * 交通灯由插件原生渲染在左上角，WebView 内容需右移避开：
 * 优先用插件注入的 clearance（若存在），否则用 --tb-traffic-lights 兜底。
 * 宽度调节：tokens.css 的 --tb-traffic-lights（默认 78px） */
.tb.is-mac {
  padding-left: max(
    var(--tb-pad-x),
    var(--tauri-plugin-decoration-left-clearance, var(--tb-traffic-lights, 78px))
  );
}

/* ============ 最左端（应用名 + 菜单栏） ============ */
.tb-left {
  display: flex;
  align-items: center;
  gap: var(--tb-gap);
  flex-shrink: 1;      /* 允许收缩，优先让中央搜索区保持可用 */
  min-width: 0;
  overflow: hidden;
}

/* 窗口较窄：应用名省略号截断（VS Code 的 .window-title 行为），不再隐藏 */

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
  flex-shrink: 0;
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
  /* 宽度由脚本管理（updateTitleWidth）：空间不足时逐渐收窄，收不下时完全隐藏
   * （不参与 flex 收缩，保证能收缩到 0）。让位顺序：菜单 → 应用名 → 搜索框。 */
  flex-shrink: 0;
  min-width: 0;
  user-select: none;
  pointer-events: none;       /* 让事件穿透，点击落在 header 上触发拖动 */
  opacity: 0.92;
}
/* 完全收缩态：空间不足时应用名整体隐藏 */
.tb-title.is-collapsed {
  display: none;
}

/* ============ 中央（命令中心） ============ */
.tb-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  /* 搜索区硬性下限（220px）：空间不足时由左侧菜单（收进 ⋯）先让位，
   * 搜索框保持完整；仅当极窄、菜单已全部折叠仍不够时才缩小 */
  min-width: 220px;
  height: 100%;
}
/* 极窄（与 SearchTrigger 的图标化下限同步，低于 tauri minWidth 800 仅兜底） */
@media (max-width: 640px) {
  .tb-center { min-width: 36px; }
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
/* 左侧 slot 允许收缩，驱动 TitlebarChrome 的 ⋯ 溢出测量 */
.tb-slot--leading {
  flex-shrink: 1;
  min-width: 0;
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
