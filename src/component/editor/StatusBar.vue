<!--
  StatusBar：编辑器底部状态栏
  - 左：分支 / 诊断计数
  - 右：光标位置 / 编码 / 语言 / 保存状态
-->
<template>
  <footer class="ed-status">
    <div class="ed-status-left">
      <span class="ed-status-item">
        <Icon name="branch" :size="12" />
        main
      </span>
      <span class="ed-status-item" title="0 个错误，0 个警告">
        <i class="ed-status-dot is-error" />0
        <i class="ed-status-dot is-warn" />0
      </span>
    </div>

    <div class="ed-status-right">
      <span class="ed-status-item">Ln {{ line }}, Col {{ col }}</span>
      <span class="ed-status-item">UTF-8</span>
      <span class="ed-status-item">{{ file.language }}</span>
      <span class="ed-status-item">
        <Icon name="check" :size="11" class="ed-status-saved" />
        已保存
      </span>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { Icon } from '../common'
import type { EditorFile } from '../../data/editorFiles'

defineProps<{
  file: EditorFile
  line: number
  col: number
}>()
</script>

<style scoped>
.ed-status {
  height: var(--ed-status-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  background: var(--ed-status-bg);
  border-top: 1px solid var(--ed-tabbar-border);
  color: var(--ed-status-fg);
  font-size: var(--kn-text-xs);
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
}

.ed-status-left,
.ed-status-right {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.ed-status-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 18px;
  padding: 0 6px;
  border-radius: 4px;
  white-space: nowrap;
  transition: background var(--kn-dur-fast);
}
.ed-status-item:hover { background: var(--ed-status-hover); }

.ed-status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin: 0 1px 0 4px;
}
.ed-status-dot.is-error { background: var(--kn-rose-500); }
.ed-status-dot.is-warn  { background: var(--kn-amber-500); }

.ed-status-saved { color: var(--kn-emerald-500); }
</style>
