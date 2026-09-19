<!--
  TbDropdown：顶栏通用下拉（Teleport 到 body，避免被顶栏 overflow 裁剪）
  - 使用场景：文字菜单 / 工作区 / 通知中心 / 账户 的点击画面
  - 定位：接收锚点位置（x/y），自动限制在窗口内
  - 条目：图标 + 文案 + 右侧 meta（快捷键/时间）；支持分隔线、勾选态
-->
<template>
  <Teleport to="body">
    <div class="tbdd-overlay" @click="emit('close')">
      <div ref="panelRef" class="tbdd" :style="style" role="menu" @click.stop>
        <div v-if="title" class="tbdd-head">{{ title }}</div>
        <template v-for="it in items" :key="it.id">
          <div v-if="it.separator" class="tbdd-sep" />
          <button v-else type="button" class="tbdd-item" role="menuitem" @click="emit('select', it)">
            <span class="tbdd-check">
              <Icon v-if="it.checked" name="check" :size="11" />
            </span>
            <Icon
              v-if="it.icon"
              :name="it.icon"
              :size="13"
              class="tbdd-icon"
              :style="it.color ? { color: it.color } : undefined"
            />
            <span class="tbdd-label">{{ it.label }}</span>
            <span v-if="it.meta" class="tbdd-meta">{{ it.meta }}</span>
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '../common'

/** 下拉条目（separator = 分隔线，其余字段忽略） */
export interface DropdownItem {
  id: string
  label: string
  icon?: string
  /** 图标颜色（可选，如通知的类型色） */
  color?: string
  /** 右侧提示（快捷键 / 时间等） */
  meta?: string
  /** 勾选态（工作区当前项等） */
  checked?: boolean
  /** 分隔线 */
  separator?: boolean
}

const props = defineProps<{
  items: DropdownItem[]
  /** 面板标题（可选） */
  title?: string
  /** 锚点位置（视口坐标；面板出现在 y 下方、贴近 x） */
  x: number
  y: number
}>()

const emit = defineEmits<{
  select: [item: DropdownItem]
  close: []
}>()

/** 面板定位：限制在窗口内 */
const style = computed(() => {
  const width = 230
  const left = Math.max(8, Math.min(props.x, window.innerWidth - width - 8))
  return { top: `${props.y}px`, left: `${left}px` }
})

/** Esc 关闭 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.tbdd-overlay {
  position: fixed;
  inset: 0;
  z-index: 2900;
}

.tbdd {
  position: fixed;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  min-width: 230px;
  max-height: min(420px, calc(100vh - 80px));
  overflow-y: auto;
  padding: 6px;
  background: var(--tb-panel-bg);
  border: 1px solid var(--tb-panel-border);
  border-radius: var(--kn-radius-lg);
  box-shadow: var(--tb-panel-shadow);
  animation: tbdd-in var(--kn-dur-fast) var(--kn-ease-out);
}
@keyframes tbdd-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.tbdd-head {
  padding: 6px 10px 4px;
  font-size: var(--kn-text-2xs);
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--tb-fg-muted);
  text-transform: uppercase;
}

.tbdd-sep {
  height: 1px;
  margin: 4px 8px;
  background: var(--kn-border);
}

.tbdd-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 0;
  border-radius: var(--kn-radius-sm);
  background: transparent;
  color: var(--tb-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--tb-transition-fast);
}
.tbdd-item:hover {
  background: var(--tb-item-hover);
}

/* 勾选位（工作区当前项） */
.tbdd-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  flex-shrink: 0;
  color: var(--kn-brand-500);
}

.tbdd-icon {
  opacity: 0.75;
  flex-shrink: 0;
}

.tbdd-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tbdd-meta {
  font-size: var(--kn-text-2xs);
  color: var(--tb-fg-muted);
  flex-shrink: 0;
}
</style>
