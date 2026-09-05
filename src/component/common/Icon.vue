<!--
  Icon：统一的内联 SVG 图标系统（完全自包含，不依赖 primeicons 字体）
  - 所有图标都以 24x24 viewBox + 描边风格（Feather 系）绘制
  - 接受 :name（不含 "pi " 前缀，也兼容 "pi pi-x" / "pi-x"）
  - 支持 size / color
  - 未知图标名会回退到可见的占位圆点，保证「永远可见」
  - 新增图标：只需往 ICONS 表里加一个 name -> SVG 内部标记 即可
-->
<template>
  <svg
    class="kn-icon"
    :style="style"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    v-html="path"
    :aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * 图标表：name -> SVG 内部标记（path / line / polyline / circle / rect）
 * 全部为 24x24 viewBox，随容器 currentColor 着色。
 */
const ICONS: Record<string, string> = {
  /* ============ 应用 / 导航 ============ */
  'cloud':        '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  'th-large':     '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  'layout':       '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/>',
  'side-bar':     '<rect x="3" y="3" width="6" height="18" rx="1"/><rect x="11" y="3" width="10" height="18" rx="1"/>',
  'panel-left':   '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>',
  'panel-right':  '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/>',
  'home':         '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  'dashboard':    '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  'chart-line':   '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>',
  'chart-bar':    '<line x1="6" y1="20" x2="6" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="13"/>',

  /* ============ 文件系统 ============ */
  'folder':       '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  'folder-open':  '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1"/><path d="M3 9l2 10a2 2 0 0 0 2 1h11a2 2 0 0 0 2-1l2-8h-8a2 2 0 0 0-2-2H3z"/>',
  'file':         '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/>',
  'file-plus':    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>',
  'file-text':    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
  'search':       '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>',

  /* ============ 功能 ============ */
  'sparkles':     '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
  'globe':        '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
  'cog':          '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  'user':         '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'bell':         '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  'inbox':        '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  'moon':         '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  'keyboard':     '<rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6.01" y2="10"/><line x1="10" y1="10" x2="10.01" y2="10"/><line x1="14" y1="10" x2="14.01" y2="10"/><line x1="18" y1="10" x2="18.01" y2="10"/><line x1="6" y1="14" x2="18" y2="14"/>',
  'palette':      '<circle cx="12" cy="12" r="9"/><circle cx="7.5" cy="10.5" r="1.2"/><circle cx="11.5" cy="7.5" r="1.2"/><circle cx="16.5" cy="9.5" r="1.2"/><circle cx="15" cy="14" r="1.2"/>',
  'terminal':     '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
  'extensions':   '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
  'run':          '<polygon points="6 4 20 12 6 20 6 4"/>',
  'debug':        '<circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="7.05" y2="7.05"/><line x1="16.95" y1="16.95" x2="19.07" y2="19.07"/><line x1="4.93" y1="19.07" x2="7.05" y2="16.95"/><line x1="16.95" y1="7.05" x2="19.07" y2="4.93"/>',

  /* ============ 方向 / 箭头 ============ */
  'chevron-down':  '<polyline points="6 9 12 15 18 9"/>',
  'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
  'chevron-left':  '<polyline points="15 18 9 12 15 6"/>',
  'chevron-up':    '<polyline points="18 15 12 9 6 15"/>',
  'angle-double-up':    '<polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/>',
  'angle-double-left':  '<polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>',
  'angle-double-right': '<polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>',

  /* ============ 操作 ============ */
  'plus':          '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  'minus':         '<line x1="5" y1="12" x2="19" y2="12"/>',
  'times':         '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  'check':         '<polyline points="20 6 9 17 4 12"/>',
  'ellipsis-h':    '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  'ellipsis-v':    '<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
  'menu':          '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  'refresh':       '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  'clock':         '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  'branch':        '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  'indent':        '<polyline points="6 3 21 3 21 21 6 21"/><polyline points="14 17 9 12 14 7"/><line x1="3" y1="12" x2="10" y2="12"/>',
  'minimize':      '<line x1="5" y1="12" x2="19" y2="12"/>',
  'maximize':      '<rect x="5" y="5" width="14" height="14" rx="1.5"/>',
  'restore':       '<rect x="3" y="7" width="14" height="14" rx="1.5"/><polyline points="7 3 21 3 21 17"/>',
  'close':         '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',

  /* ============ 工作区（自定义） ============ */
  'workspace':     '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',

  /* 树节点占位 / 未知图标回退：永远可见的小圆点 */
  'dot':           '<circle cx="12" cy="12" r="3"/>',
}

const props = withDefaults(
  defineProps<{
    /**
     * 图标名，接受任一格式：
     *   - 'folder'             （推荐）
     *   - 'pi pi-folder'       （兼容现有代码）
     *   - 'pi-folder'          （兼容）
     */
    name: string
    /** 像素尺寸 */
    size?: number | string
    /** 文字色（color / hex / var） */
    color?: string
  }>(),
  { size: 16, color: '' }
)

/* 归一化：去掉 'pi ' 前缀和 'pi-' 前缀 */
const bareName = computed(() => props.name.replace(/^(pi\s+)?pi-?/, ''))

/* 同义图标别名：与 chevron-* 完全同路径的旧名（back/forward/arrow-*）在此映射，
 * 避免在 ICONS 表里重复维护同一份 SVG 路径 */
const ALIASES: Record<string, string> = {
  'back':         'chevron-right',
  'forward':      'chevron-left',
  'arrow-right':  'chevron-right',
  'arrow-left':   'chevron-left',
  'arrow-up':     'chevron-up',
  'arrow-down':   'chevron-down',
}

/** 未知图标回退到可见的占位圆点 */
const path = computed(() => ICONS[ALIASES[bareName.value] ?? bareName.value] ?? ICONS['dot'])

const style = computed(() => {
  const s: Record<string, string> = {}
  const v = typeof props.size === 'number' ? `${props.size}px` : props.size
  s.width = v
  s.height = v
  if (props.color) s.color = props.color
  return s
})
</script>

<style scoped>
.kn-icon {
  display: inline-block;
  vertical-align: -2px;
  flex-shrink: 0;
}
</style>
