<!--
  SidebarSection：可折叠分组（视图侧栏的通用"区段"骨架）
  - 标题 + 可选图标/计数 + 折叠开关 + 内容 slot
  - 各视图侧栏（Home/Editor/Files/AI/Browser）复用
-->
<template>
  <section class="sbsec">
    <button
      v-if="collapsible !== false"
      type="button"
      class="sbsec-header"
      :aria-expanded="!collapsed"
      @click="collapsed = !collapsed"
    >
      <Icon :name="collapsed ? 'chevron-right' : 'chevron-down'" :size="10" class="sbsec-chevron" />
      <Icon v-if="icon" :name="icon" :size="12" class="sbsec-icon" />
      <span class="sbsec-title">{{ title }}</span>
      <span v-if="count" class="sbsec-count">{{ count }}</span>
    </button>
    <div v-show="collapsible === false || !collapsed" class="sbsec-body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '../../common'

const props = withDefaults(
  defineProps<{
    title: string
    /** 分组头图标（Icon 名） */
    icon?: string
    /** 分组头右侧计数（可选） */
    count?: number
    /** 是否可折叠（默认 true） */
    collapsible?: boolean
    /** 初始折叠态（默认展开） */
    collapsed?: boolean
  }>(),
  { collapsible: true, collapsed: false }
)

const collapsed = ref(props.collapsed)
</script>

<style scoped>
.sbsec {
  display: flex;
  flex-direction: column;
}

.sbsec-header {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 24px;
  padding: 0 10px;
  background: transparent;
  border: 0;
  color: var(--sb-section-header-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  font-weight: 600;
  letter-spacing: 0.2px;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background var(--sb-transition-fast),
    color var(--sb-transition-fast);
}
.sbsec-header:hover {
  background: var(--sb-section-header-hover);
  color: var(--sb-fg);
}

.sbsec-chevron {
  font-size: 10px;
  opacity: 0.7;
  flex-shrink: 0;
  width: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sbsec-icon {
  font-size: 12px;
  opacity: 0.7;
}

.sbsec-title {
  overflow: hidden;
  text-overflow: ellipsis;
}

.sbsec-count {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.5;
}

.sbsec-body {
  padding: 2px 0 6px;
}
</style>