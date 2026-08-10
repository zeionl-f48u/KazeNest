<!--
  ActivityBar：VS Code 活动栏
  - 48px 宽，满高，顶部视图切换 + 底部全局动作
  - 活动项：左侧 2px 指示条 + 纯白图标；非活动项 40% 白
  - 徽标：#007ACC 蓝底白字，右上角
  - 点击活动项再次点击可折叠侧边栏（emit toggle）
-->
<template>
  <nav class="ab" :aria-label="'活动栏'">
    <!-- 顶部：视图切换 -->
    <div class="ab-group">
      <button
        v-for="item in topItems"
        :key="item.id"
        type="button"
        class="ab-item"
        :class="{ 'is-active': modelValue === item.id }"
        :aria-label="item.label"
        :aria-pressed="modelValue === item.id"
        :title="item.label"
        @click="onClick(item)"
      >
        <span class="ab-indicator" aria-hidden="true" />
        <Icon :name="item.icon" :size="22" class="ab-icon" />
        <span v-if="item.badge" class="ab-badge">{{ item.badge }}</span>
      </button>
    </div>

    <!-- 底部：设置 / 账户等 -->
    <div class="ab-group">
      <button
        v-for="item in bottomItems"
        :key="item.id"
        type="button"
        class="ab-item"
        :class="{ 'is-active': modelValue === item.id }"
        :aria-label="item.label"
        :aria-pressed="modelValue === item.id"
        :title="item.label"
        @click="onClick(item)"
      >
        <span class="ab-indicator" aria-hidden="true" />
        <Icon :name="item.icon" :size="22" class="ab-icon" />
        <span v-if="item.badge" class="ab-badge">{{ item.badge }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '../common'
import type { ActivityItem } from './types'

const props = withDefaults(
  defineProps<{
    /** 全部活动栏条目 */
    items: ActivityItem[]
    /** 当前活动 id */
    modelValue?: string
  }>(),
  { modelValue: '' }
)

const emit = defineEmits<{
  'update:modelValue': [string]
  /** 点击了当前已激活的条目（用于折叠侧边栏，VS Code 行为） */
  toggle: [ActivityItem]
}>()

const topItems = computed(() => props.items.filter((i) => i.position !== 'bottom'))
const bottomItems = computed(() => props.items.filter((i) => i.position === 'bottom'))

function onClick(item: ActivityItem) {
  if (props.modelValue === item.id) {
    emit('toggle', item)
  } else {
    emit('update:modelValue', item.id)
  }
}
</script>

<style scoped>
.ab {
  width: var(--ab-width);
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: var(--ab-bg);
  color: var(--ab-fg);
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
}

.ab-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 2px 0;
}

/* ============ 活动项 ============ */
.ab-item {
  position: relative;
  width: var(--ab-width);
  height: var(--ab-action-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  border-radius: 8px;   /* Win11 风格：圆角悬停 / 按压底 */
  padding: 0;
  cursor: pointer;
  color: var(--ab-inactive-fg);
  transition:
    color var(--sb-transition-fast),
    background var(--sb-transition-fast);
}
.ab-item:hover {
  color: var(--ab-fg);
  background: var(--ab-hover);
}
.ab-item.is-active {
  color: var(--ab-fg);
  background: transparent;
}
/* Win11 按压：背景加深 + 图标轻微缩小（任务栏式反馈） */
.ab-item:active {
  color: var(--ab-fg);
  background: var(--ab-press);
}
.ab-item:active .ab-icon {
  transform: scale(0.88);
}
.ab-item:focus-visible {
  outline: 1px solid var(--ab-fg);
  outline-offset: -1px;
}

.ab-icon {
  font-size: var(--ab-icon-size);
  line-height: 1;
  transform-origin: center;
  transition: transform var(--sb-transition-fast);
}

/* ============ 紫色指示条（活动项左侧 2px）============ */
.ab-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: transparent;
  transform: scaleY(0);
  transform-origin: center;   /* 从中间向上下扩展 */
  transition:
    transform var(--kn-dur-slow) var(--kn-ease-out),
    background var(--sb-transition-fast);
}
/* 激活态：动画结束后保持 scaleY(1) 常驻可见（不消失）；
   取消激活时经 transition 平滑收缩回中间 */
.ab-item.is-active .ab-indicator {
  transform: scaleY(1);
  background: var(--ab-active-border);
  box-shadow: 0 0 6px color-mix(in srgb, var(--ab-active-border) 55%, transparent);
  animation: ab-edge 0.32s var(--kn-ease-out);
}
@keyframes ab-edge {
  0%   { transform: scaleY(0); }
  55%  { transform: scaleY(1.08); }
  100% { transform: scaleY(1); }
}

/* 徽标：右上角蓝色圆点 */
.ab-badge {
  position: absolute;
  top: 5px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ab-badge-bg);
  color: var(--ab-badge-fg);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  border-radius: 999px;
  border: 1.5px solid var(--ab-bg);
  box-sizing: border-box;
}
</style>
