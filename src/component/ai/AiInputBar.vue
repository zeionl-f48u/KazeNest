<!--
  AiInputBar：AI 输入条（侧栏 AISidebar 与主区 AiWorkspace 共用）
  - 附件：回形针按钮选文件，附件芯片显示在输入框上方（可移除）
  - 粘贴智能识别：多行内容自动包成 ```代码块``` 并猜语言
  - 自动增高：粘贴多行也能平滑撑开（最多 8 行）
  - 表情选择器 + 上下文引用（@当前文件/@选中代码/@工作区）
  - 发送走 useAiChat.send（主区/侧栏各自持有自己的输入文本）
  - 插槽：顶部工具条（新对话/模型等）由父级通过 #toolbar 传入
-->
<template>
  <div class="ai-input-bar">
    <slot name="toolbar" />

    <!-- 附件按钮：触发隐藏的 file input -->
    <button type="button" class="ai-ibar-btn" title="添加附件" aria-label="添加附件" @click="fileInputRef?.click()">
      <Icon name="paperclip" :size="13" />
    </button>

    <div class="ai-input-wrap">
      <!-- 附件芯片 -->
      <div v-if="attachments.length" class="ai-attach-row">
        <span v-for="a in attachments" :key="a.id" class="ai-attach-chip">
          <Icon name="file" :size="11" class="ai-attach-icon" />
          <span class="ai-attach-name">{{ a.name }}</span>
          <span class="ai-attach-size">{{ formatSize(a.size) }}</span>
          <button type="button" class="ai-attach-x" :title="`移除 ${a.name}`" aria-label="移除附件" @click="removeAttachment(a.id)">
            <Icon name="times" :size="9" />
          </button>
        </span>
      </div>

      <textarea
        ref="inputRef"
        v-model="text"
        class="ai-input"
        rows="1"
        :placeholder="placeholder"
        spellcheck="false"
        @keydown.enter.exact.prevent="doSend"
        @input="autoGrow"
        @paste="onPaste"
      ></textarea>
    </div>

    <div class="ai-ibar-right">
      <button
        type="button"
        class="ai-ibar-btn"
        :class="{ 'is-on': emojiOpen }"
        title="表情"
        aria-label="表情"
        @click="toggleEmoji"
      >
        <Icon name="smile" :size="13" />
      </button>
      <button
        type="button"
        class="ai-ibar-btn"
        :class="{ 'is-on': contextOpen }"
        title="引用上下文"
        aria-label="引用上下文"
        @click="toggleContext"
      >
        <Icon name="at-sign" :size="13" />
      </button>
      <button
        type="button"
        class="ai-send"
        title="发送 (Enter)"
        aria-label="发送"
        :disabled="!canSend"
        @click="doSend"
      >
        <Icon name="arrow-up" :size="13" />
      </button>
    </div>

    <!-- 表情选择器 -->
    <div v-if="emojiOpen" class="ai-pop" @mousedown.stop>
      <div class="ai-pop-title">表情</div>
      <div class="ai-emoji-grid">
        <button v-for="em in emojis" :key="em" type="button" class="ai-emoji" @click="insertAtCursor(em)">
          {{ em }}
        </button>
      </div>
    </div>

    <!-- 上下文引用 -->
    <div v-if="contextOpen" class="ai-pop" @mousedown.stop>
      <div class="ai-pop-title">引用上下文</div>
      <button v-for="c in contextItems" :key="c.id" type="button" class="ai-ctx-item" @click="insertAtCursor(c.text)">
        <Icon :name="c.icon" :size="13" class="ai-ctx-icon" />
        <span class="ai-ctx-label">{{ c.label }}</span>
        <span class="ai-ctx-hint">{{ c.hint }}</span>
      </button>
    </div>

    <!-- 隐藏的附件选择 -->
    <input ref="fileInputRef" type="file" multiple class="ai-file-input" @change="onFilesPicked" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '../common'

const props = withDefaults(defineProps<{
  /** 输入框占位文案（侧栏/主区可各自定制） */
  placeholder?: string
}>(), { placeholder: '输入消息，Enter 发送，Shift+Enter 换行' })

const emit = defineEmits<{ send: [payload: { text: string; attachments: string[] }] }>()

/* =================== 输入文本 =================== */

const text = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)

const canSend = computed(() => text.value.trim().length > 0 || attachments.value.length > 0)

/** 发送：清空输入与附件，把内容交给父级（父级调 useAiChat.send） */
function doSend() {
  if (!canSend.value) return
  const attachNames = attachments.value.map((a) => a.name)
  const payload = { text: text.value, attachments: attachNames }
  text.value = ''
  attachments.value = []
  autoGrow()
  emit('send', payload)
}

/* =================== 附件 =================== */

interface Attachment {
  id: number
  name: string
  size: number
}

let attachSeq = 0
const attachments = ref<Attachment[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

function onFilesPicked(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (files) {
    for (const f of Array.from(files)) {
      attachments.value.push({ id: ++attachSeq, name: f.name, size: f.size })
    }
  }
  input.value = ''
}

function removeAttachment(id: number) {
  attachments.value = attachments.value.filter((a) => a.id !== id)
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/* =================== 自动增高 =================== */

/** 最大高度：8 行 ≈ 8 × 20px 行高 + 12px 上下 padding */
const MAX_INPUT_H = 172

function autoGrow() {
  const ta = inputRef.value
  if (!ta) return
  ta.style.height = 'auto'
  ta.style.height = `${Math.min(ta.scrollHeight, MAX_INPUT_H)}px`
}

/* =================== 粘贴智能识别 =================== */

/** 按关键词猜编程语言（给粘贴的代码块加标记；猜不到留空） */
function detectLang(text: string): string {
  if (/^\s*(#include|int main|std::)/m.test(text)) return 'cpp'
  if (/^\s*(def |class .*:|import |print\()/m.test(text)) return 'python'
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/im.test(text)) return 'sql'
  if (/^\s*(const|let|var|function|=>|import|export)/m.test(text)) return 'typescript'
  if (/<!DOCTYPE|<html|<div|<style/m.test(text)) return 'html'
  if (/^\s*[\[{]/m.test(text) && /("|\w+):/.test(text)) return 'json'
  return ''
}

function onPaste(e: ClipboardEvent) {
  const paste = e.clipboardData?.getData('text/plain') ?? ''
  if (!paste) return
  e.preventDefault()
  // 已是代码块（``` 开头/结尾）或单行文本：原样插入
  const trimmed = paste.trim()
  if (/^```/.test(trimmed) && /```$/.test(trimmed)) {
    insertAtCursor(paste)
    return
  }
  if (!trimmed.includes('\n')) {
    insertAtCursor(paste)
    return
  }
  // 多行内容：自动包成代码块 + 猜语言
  const lang = detectLang(paste)
  insertAtCursor(`\`\`\`${lang}\n${trimmed}\n\`\`\``)
}

/** 在光标处插入文本并恢复焦点 */
function insertAtCursor(paste: string) {
  const ta = inputRef.value
  if (!ta) return
  const s = ta.selectionStart
  const e = ta.selectionEnd
  text.value = text.value.slice(0, s) + paste + text.value.slice(e)
  nextTick(() => {
    const pos = s + paste.length
    ta.focus()
    ta.setSelectionRange(pos, pos)
    autoGrow()
  })
}

/* =================== 表情 / 上下文引用 =================== */

const emojis = ['😊', '👍', '🎉', '🔥', '💡', '⚡', '✅', '❌', '🔍', '📝', '🎯', '🚀', '💻', '🐛', '📌', '📚']
const emojiOpen = ref(false)
const contextOpen = ref(false)

const contextItems = [
  { id: 'file',      label: '当前文件',   icon: 'file',      text: '@当前文件: ', hint: '插入当前打开的文件' },
  { id: 'selection', label: '选中代码',   icon: 'terminal',  text: '@选中代码: ', hint: '插入编辑器选中片段' },
  { id: 'workspace', label: '工作区',     icon: 'workspace', text: '@工作区: ',   hint: '插入工作区信息' },
]

const inputBarRef = ref<HTMLElement | null>(null)

function toggleEmoji() {
  emojiOpen.value = !emojiOpen.value
  contextOpen.value = false
}

function toggleContext() {
  contextOpen.value = !contextOpen.value
  emojiOpen.value = false
}

/** 点击输入框以外：关闭弹层 */
function onClickOutside(e: MouseEvent) {
  if (!emojiOpen.value && !contextOpen.value) return
  if (inputBarRef.value?.contains(e.target as Node)) return
  emojiOpen.value = false
  contextOpen.value = false
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))

/** 父级切换会话/新建后清空输入（父级 watch chat.activeSessionId 后调用） */
watch(() => props.placeholder, () => {
  text.value = ''
  attachments.value = []
  autoGrow()
})
</script>

<style scoped>
.ai-input-bar {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid var(--sb-border);
  flex-shrink: 0;
}

/* 隐藏的 file input（由回形针按钮触发） */
.ai-file-input {
  display: none;
}

.ai-input-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 附件芯片 */
.ai-attach-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.ai-attach-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  height: 20px;
  padding: 0 6px;
  border: 1px solid color-mix(in srgb, var(--kn-brand-500) 30%, transparent);
  border-radius: var(--kn-radius-pill);
  background: color-mix(in srgb, var(--kn-brand-500) 10%, transparent);
  color: var(--sb-fg);
  font-size: var(--kn-text-xs);
}
.ai-attach-icon {
  color: var(--kn-brand-500);
  flex-shrink: 0;
}
.ai-attach-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ai-attach-size {
  font-size: 10px;
  opacity: 0.5;
  flex-shrink: 0;
}
.ai-attach-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--sb-fg-muted);
  cursor: pointer;
  flex-shrink: 0;
}
.ai-attach-x:hover {
  background: var(--sb-hover);
  color: var(--sb-fg);
}

.ai-input {
  flex: 1;
  min-height: 28px;
  max-height: 172px;
  padding: 6px 10px;
  border: 1px solid var(--sb-border);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg-elev);
  color: var(--sb-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  line-height: 1.5;
  resize: none;
  outline: none;
  box-sizing: border-box;
  overflow-y: auto;
}
.ai-input:focus {
  border-color: var(--kn-brand-500);
}

.ai-ibar-right {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.ai-ibar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: var(--kn-radius-md);
  background: transparent;
  color: var(--sb-fg-muted);
  cursor: pointer;
  transition: background var(--sb-transition-fast), color var(--sb-transition-fast);
}
.ai-ibar-btn:hover {
  background: var(--sb-hover);
  color: var(--sb-fg);
}
.ai-ibar-btn.is-on {
  background: color-mix(in srgb, var(--kn-brand-500) 18%, transparent);
  color: var(--kn-brand-500);
}
.ai-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: var(--kn-radius-md);
  background: linear-gradient(135deg, var(--kn-brand-500), var(--kn-magenta-500));
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  margin-left: 2px;
  transition: filter var(--kn-dur-fast), transform var(--kn-dur-fast);
}
.ai-send:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
.ai-send:disabled {
  opacity: 0.4;
  cursor: default;
}

/* 弹层：表情 / 上下文引用（定位在输入框上方） */
.ai-pop {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 8px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
  padding: 8px;
  background: var(--kn-bg-elev);
  border: 1px solid var(--kn-border-strong);
  border-radius: var(--kn-radius-lg);
  box-shadow: var(--kn-shadow-lg);
  animation: ai-pop-in var(--kn-dur-base) var(--kn-ease-out);
}
@keyframes ai-pop-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ai-pop-title {
  padding: 0 2px 4px;
  font-size: var(--kn-text-xs);
  font-weight: 600;
  color: var(--sb-fg-muted);
  border-bottom: 1px solid var(--kn-border);
}

/* 表情网格 */
.ai-emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}
.ai-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--kn-radius-sm);
  background: transparent;
  font-size: var(--kn-text-lg);
  cursor: pointer;
  transition: background var(--kn-dur-fast);
}
.ai-emoji:hover {
  background: var(--sb-hover);
}

/* 上下文引用项 */
.ai-ctx-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 6px;
  border: 0;
  border-radius: var(--kn-radius-sm);
  background: transparent;
  color: var(--sb-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  cursor: pointer;
  text-align: left;
  transition: background var(--kn-dur-fast);
}
.ai-ctx-item:hover {
  background: var(--sb-hover);
}
.ai-ctx-icon {
  color: var(--kn-brand-500);
  flex-shrink: 0;
}
.ai-ctx-label {
  flex-shrink: 0;
}
.ai-ctx-hint {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--kn-text-xs);
  color: var(--sb-fg-muted);
}
</style>