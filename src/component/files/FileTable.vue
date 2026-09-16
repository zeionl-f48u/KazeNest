<!--
  FileTable：统一文件列表（多格式）
  - 列：名称（图标按格式着色）+ 格式 + 大小 + 修改时间 + 标签 + 注释摘要
  - 点击行选中（父级 Files.vue 展示右侧详情面板）
  - 空态：搜索/筛选无结果时提示
-->
<template>
  <div class="ft">
    <!-- 表头 -->
    <div class="ft-head">
      <span>名称</span>
      <span>格式</span>
      <span>大小</span>
      <span>修改时间</span>
      <span>标签</span>
      <span>注释</span>
    </div>

    <!-- 空态 -->
    <div v-if="!files.length" class="ft-empty">
      <Icon name="search" :size="18" />
      <span>没有匹配的文件</span>
      <span v-if="emptyHint" class="ft-empty-hint">{{ emptyHint }}</span>
    </div>

    <!-- 文件行 -->
    <button
      v-for="f in files"
      :key="f.id"
      type="button"
      class="ft-row"
      :class="{ 'is-on': f.id === selectedId }"
      @click="emit('select', f.id)"
    >
      <span class="ft-name">
        <span class="ft-icon" :style="{ '--tint': kindMeta(f.kind).color }">
          <Icon :name="kindMeta(f.kind).icon" :size="14" />
        </span>
        <span class="ft-name-text">{{ f.name }}</span>
        <Icon v-if="f.encrypted" name="lock" :size="11" class="ft-lock" />
      </span>

      <span class="ft-kind">{{ kindMeta(f.kind).label }}</span>
      <span class="ft-size">{{ f.size }}</span>
      <span class="ft-time">{{ f.modified }}</span>

      <span class="ft-tags">
        <span v-for="t in f.tags.slice(0, 2)" :key="t" class="ft-tag">{{ t }}</span>
        <span v-if="f.tags.length > 2" class="ft-tag-more">+{{ f.tags.length - 2 }}</span>
      </span>

      <span class="ft-note" :class="{ 'is-empty': !f.note }">{{ f.note || '—' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '../common'
import { kindMeta } from './types'
import type { ManagedFile } from './types'

defineProps<{
  /** 当前要展示的文件（已由父级完成搜索/筛选） */
  files: ManagedFile[]
  /** 选中文件 id（行高亮） */
  selectedId?: string
  /** 空态补充提示（如搜索语法示例） */
  emptyHint?: string
}>()

const emit = defineEmits<{ select: [id: string] }>()
</script>

<style scoped>
.ft {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 列布局：与数据行共用同一套 grid 模板 */
.ft-head,
.ft-row {
  display: grid;
  grid-template-columns: minmax(0, 2.2fr) 52px 68px 84px minmax(0, 1.3fr) minmax(0, 1.8fr);
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  box-sizing: border-box;
}

/* ==================== 表头 ==================== */
.ft-head {
  height: 32px;
  font-size: var(--kn-text-xs);
  font-weight: 600;
  letter-spacing: 0.2px;
  color: var(--kn-fg-muted);
  border-bottom: 1px solid var(--kn-border);
}

/* ==================== 行 ==================== */
.ft-row {
  position: relative;
  height: 44px;
  border: 0;
  border-radius: var(--kn-radius-md);
  background: transparent;
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  text-align: left;
  cursor: pointer;
  transition: background var(--kn-dur-fast);
}
.ft-row:hover {
  background: var(--kn-hover);
}
.ft-row.is-on {
  background: color-mix(in srgb, var(--kn-brand-500) 10%, transparent);
}
.ft-row.is-on::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  border-radius: 1px;
  background: var(--kn-brand-500);
}

/* 名称列：格式图标 + 文本截断 + 加密锁 */
.ft-name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.ft-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--kn-radius-sm);
  background: color-mix(in srgb, var(--tint) 14%, transparent);
  color: var(--tint);
  flex-shrink: 0;
}
.ft-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ft-lock {
  color: var(--kn-amber-500);
  flex-shrink: 0;
}

.ft-kind,
.ft-size,
.ft-time {
  font-size: var(--kn-text-xs);
  color: var(--kn-fg-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 标签 chips */
.ft-tags {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
}
.ft-tag {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 7px;
  border-radius: var(--kn-radius-pill);
  background: color-mix(in srgb, var(--kn-brand-500) 12%, transparent);
  color: var(--kn-brand-500);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
.ft-tag-more {
  font-size: 10px;
  color: var(--kn-fg-subtle);
  flex-shrink: 0;
}

/* 注释列：单行摘要 */
.ft-note {
  font-size: var(--kn-text-xs);
  color: var(--kn-fg-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ft-note.is-empty {
  color: var(--kn-fg-subtle);
  opacity: 0.6;
}

/* ==================== 空态 ==================== */
.ft-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 0;
  color: var(--kn-fg-subtle);
  font-size: var(--kn-text-sm);
}
.ft-empty-hint {
  font-size: var(--kn-text-2xs);
  opacity: 0.85;
}
</style>
