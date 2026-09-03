<!--
  CodeView：代码阅读区
  - 左侧行号 + 右侧语法高亮代码（highlight.ts 轻量分词）
  - 点击代码可更新光标位置（Ln / Col，供状态栏显示）
-->
<template>
  <div class="ed-code" @click="onCodeClick">
    <div
      v-for="(line, i) in lines"
      :key="i"
      class="ed-line"
      :class="{ 'is-active': i + 1 === activeLine }"
      :data-line="i + 1"
    >
      <span class="ed-ln">{{ i + 1 }}</span>
      <span class="ed-txt" v-html="highlightLine(line)"></span>
    </div>
    <div v-if="lines.length === 0" class="ed-empty">空文件</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { highlightLine } from '../../utils/highlight'
import type { EditorFile } from '../../data/editorFiles'

const props = defineProps<{
  file: EditorFile
}>()

const emit = defineEmits<{
  cursor: [{ line: number; col: number }]
}>()

const lines = computed(() => props.file.content.split('\n'))

/** 当前活动行（点击后高亮，VS Code 风格） */
const activeLine = ref(1)

function onCodeClick(e: MouseEvent) {
  const lineEl = (e.target as HTMLElement).closest<HTMLElement>('.ed-line')
  if (!lineEl) return
  const line = Number(lineEl.dataset.line) || 1
  activeLine.value = line
  let col = 1
  // 通过 caret 定位计算列
  const sel = window.getSelection?.()
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0)
    if (range.collapsed) {
      col = range.startOffset + 1
    }
  }
  emit('cursor', { line, col })
}
</script>

<style scoped>
.ed-code {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--ed-bg);
  color: var(--ed-fg);
  font-family: var(--ed-font);
  font-size: var(--ed-font-size);
  line-height: var(--ed-line-height);
  padding: 10px 0 16px;
  cursor: text;
}

.ed-line {
  display: flex;
  white-space: pre;
  transition: background var(--kn-dur-fast);
}

/* 当前活动行高亮（VS Code 风格） */
.ed-line.is-active {
  background: var(--ed-line-active-bg);
}

.ed-ln {
  flex-shrink: 0;
  width: 56px;
  padding-right: 14px;
  text-align: right;
  color: var(--ed-gutter-fg);
  user-select: none;
  -webkit-user-select: none;
  transition: color var(--kn-dur-fast);
}
.ed-line:hover .ed-ln { color: var(--ed-gutter-fg-hover); }
.ed-line.is-active .ed-ln { color: var(--ed-gutter-fg-active); }

.ed-txt {
  padding-right: 24px;
  min-width: 0;
  white-space: pre;
}

.ed-empty {
  padding: 24px 24px;
  color: var(--ed-gutter-fg);
  font-family: var(--kn-font-sans);
}
</style>
