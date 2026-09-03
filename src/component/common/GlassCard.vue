<!--
  GlassCard：玻璃风格卡片（顶栏之外的"可悬浮表面"统一用这个）
  - 三个槽位：title / default / footer
  - 内置 hover 微抬 + 阴影加深
  - 主题色通过 prop 注入（图标背景色 / 顶部色条等）
-->
<template>
  <article class="gc" :class="{ 'is-interactive': interactive }">
    <div v-if="$slots.media || icon" class="gc-media">
      <slot name="media">
        <span class="gc-icon" :style="iconStyle">
          <Icon :name="icon ?? 'sparkles'" />
        </span>
      </slot>
    </div>

    <div class="gc-body">
      <header v-if="$slots.title || title" class="gc-title">
        <slot name="title">
          <h3 class="gc-title-text">{{ title }}</h3>
        </slot>
      </header>

      <div v-if="$slots.default || desc" class="gc-content">
        <slot>
          <p class="gc-desc">{{ desc }}</p>
        </slot>
      </div>

      <footer v-if="$slots.footer" class="gc-footer">
        <slot name="footer" />
      </footer>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps<{
  title?: string
  desc?: string
  icon?: string
  /** 主题色，作用于图标底色 / 顶部色条；缺省走品牌色 */
  color?: string
  /** hover 时是否微抬 + 加深阴影（卡片网格场景下用 true） */
  interactive?: boolean
}>()

const iconStyle = computed(() => {
  if (!props.color) return undefined
  return {
    background: `color-mix(in srgb, ${props.color} 18%, transparent)`,
    color: props.color,
  }
})
</script>

<style scoped>
.gc {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--kn-space-3);
  padding: var(--kn-space-5);
  border-radius: var(--kn-radius-2xl);
  background: var(--kn-glass-bg);
  backdrop-filter: saturate(var(--kn-glass-saturation)) blur(var(--kn-glass-blur));
  -webkit-backdrop-filter: saturate(var(--kn-glass-saturation)) blur(var(--kn-glass-blur));
  border: 1px solid var(--kn-glass-border);
  box-shadow: var(--kn-glass-shadow);
  color: var(--kn-fg);
  font-family: var(--kn-font-sans);
  transition:
    transform var(--kn-dur-base) var(--kn-ease-out),
    box-shadow var(--kn-dur-base) var(--kn-ease-out);
}

.gc.is-interactive {
  cursor: pointer;
}
.gc.is-interactive:hover {
  transform: translateY(-3px);
  box-shadow: var(--kn-shadow-lg);
  border-color: color-mix(in srgb, var(--kn-brand-500) 22%, var(--kn-glass-border));
}
.gc.is-interactive:hover .gc-icon {
  transform: scale(1.08) rotate(-3deg);
}

.gc-media {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.gc-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--kn-radius-lg);
  background: color-mix(in srgb, var(--kn-brand-500) 18%, transparent);
  color: var(--kn-brand-500);
  font-size: 20px;
  transition: transform var(--kn-dur-base) var(--kn-ease-out);
}

.gc-body {
  display: flex;
  flex-direction: column;
  gap: var(--kn-space-2);
  min-width: 0;
}

.gc-title-text {
  margin: 0;
  font-size: var(--kn-text-lg);
  font-weight: 600;
  letter-spacing: 0.1px;
}

.gc-content {
  font-size: var(--kn-text-sm);
  line-height: 1.55;
  color: var(--kn-fg-muted);
}

.gc-desc {
  margin: 0;
}

.gc-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--kn-space-2);
  padding-top: var(--kn-space-2);
  border-top: 1px solid var(--kn-border);
}
</style>
