<!--
  AISidebar：AI 工作助手（Workbuddy 风格对话流）
  - 顶部工具条：新对话 + 模型切换
  - 对话流：问候卡片（含 8 种工作模式速选，均衡覆盖常见开发工作）+ 气泡消息
  - 底部输入框：
    · 附件：回形针按钮选文件，附件以芯片显示在输入框上方（可移除）
    · 粘贴智能识别：多行内容自动包成 ```代码块``` 并猜语言
    · 自动增高：粘贴多行也能平滑撑开（最多 8 行）
    · 表情选择器 + 上下文引用（@当前文件/@选中代码/@工作区）
  - 纯前端演示：发送后模拟助手回复（接后端后替换为真实模型调用）
-->
<template>
  <div class="ai">
    <!-- 工具条：新对话 + 模型 -->
    <div class="ai-toolbar">
      <button type="button" class="ai-new" title="新对话" aria-label="新对话" @click="startNewChat">
        <Icon name="plus" :size="12" />
      </button>
      <div class="ai-model">
        <Icon name="sparkles" :size="11" class="ai-model-icon" />
        <select v-model="activeModel" class="ai-model-select" aria-label="选择模型">
          <option v-for="m in models" :key="m.id" :value="m.id">{{ m.label }}</option>
        </select>
      </div>
    </div>

    <!-- 对话流 -->
    <div class="ai-chat" ref="chatRef">
      <!-- 问候卡片（工作模式速选：多工作均衡设计） -->
      <div class="ai-bubble is-assistant">
        <p class="ai-greet">我是你的开发工作助手，可以在编码、重构、测试、评审、文档、分析等工作间切换。选一个开始：</p>
        <div class="ai-work-grid">
          <button
            v-for="w in workModes"
            :key="w.kind"
            type="button"
            class="ai-work-card"
            :style="{ '--tint': w.color }"
            @click="pickWork(w)"
          >
            <Icon :name="w.icon" :size="14" class="ai-work-icon" />
            <span class="ai-work-label">{{ w.label }}</span>
          </button>
        </div>
      </div>

      <!-- 消息流 -->
      <div
        v-for="m in messages"
        :key="m.id"
        class="ai-bubble"
        :class="`is-${m.role}`"
      >
        <span v-if="m.work" class="ai-work-tag" :style="{ '--tint': workByKind(m.work)?.color }">
          {{ workByKind(m.work)?.label }}
        </span>
        <p class="ai-msg-text">{{ m.text }}</p>
        <span class="ai-msg-time">{{ m.time }}</span>
      </div>

      <!-- 正在思考 -->
      <div v-if="typing" class="ai-bubble is-assistant">
        <span class="ai-typing"><i /><i /><i /></span>
      </div>
    </div>

    <!-- 输入框 -->
    <div ref="inputBarRef" class="ai-input-bar">
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
          v-model="inputText"
          class="ai-input"
          rows="1"
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          spellcheck="false"
          @keydown.enter.exact.prevent="send"
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
          @click="send"
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
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '../../common'
import { useAppSession } from '../../../composables'

/* =================== 工作模式（均衡覆盖常见开发工作） =================== */

type WorkKind =
  | 'coding' | 'explain' | 'refactor' | 'test'
  | 'review' | 'doc' | 'data' | 'translate'

interface WorkMode {
  kind: WorkKind
  label: string
  icon: string
  color: string
  /** 点击工作卡片后自动填充的提示词前缀 */
  prompt: string
}

const workModes: WorkMode[] = [
  { kind: 'coding',    label: '编写代码', icon: 'file-plus',  color: 'var(--kn-sky-500)',     prompt: '请帮我编写：' },
  { kind: 'explain',   label: '解释代码', icon: 'file-text',  color: 'var(--kn-emerald-500)', prompt: '请帮我解释这段代码：' },
  { kind: 'refactor',  label: '代码重构', icon: 'refresh',    color: 'var(--kn-brand-500)',   prompt: '请帮我重构这段代码：' },
  { kind: 'test',      label: '写测试',   icon: 'terminal',   color: 'var(--kn-amber-500)',   prompt: '请为这段代码写单元测试：' },
  { kind: 'review',    label: '代码评审', icon: 'check',      color: 'var(--kn-rose-500)',    prompt: '请评审这段代码：' },
  { kind: 'doc',       label: '写文档',   icon: 'file-text',  color: 'var(--kn-magenta-500)', prompt: '请帮我撰写文档：' },
  { kind: 'data',      label: '数据分析', icon: 'chart-line', color: 'var(--kn-brand-400)',   prompt: '请帮我分析这些数据：' },
  { kind: 'translate', label: '翻译',     icon: 'globe',      color: 'var(--kn-sky-400)',     prompt: '请帮我翻译：' },
]

const models = [
  { id: 'model-r1',    label: 'DeepSeek-R1' },
  { id: 'model-chat',  label: 'DeepSeek-Chat' },
  { id: 'model-coder', label: 'DeepSeek-Coder' },
]

const activeModel = ref('model-chat')
const workByKind = (kind: WorkKind | undefined) => workModes.find((w) => w.kind === kind)

/* =================== 对话状态 =================== */

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  work?: WorkKind
  time: string
}

let seq = 0
const messages = ref<ChatMessage[]>([])
const typing = ref(false)
const inputText = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const chatRef = ref<HTMLElement | null>(null)

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function startNewChat() {
  messages.value = []
  typing.value = false
  inputText.value = ''
  attachments.value = []
  autoGrow()
}

/** 点击工作卡片：作为用户消息发出（带工作类型标签），并模拟助手回复 */
function pickWork(w: WorkMode) {
  pushMessage('user', w.prompt, w.kind)
  simulateReply(w)
}

const canSend = computed(() => inputText.value.trim().length > 0 || attachments.value.length > 0)

function send() {
  const text = inputText.value.trim()
  if (!canSend.value) return
  // 附件以说明文本拼进消息（演示；接后端后走二进制上传）
  const attachNote =
    attachments.value.length > 0
      ? `\n[附件: ${attachments.value.map((a) => a.name).join(', ')}]`
      : ''
  attachments.value = []
  inputText.value = ''
  autoGrow()
  pushMessage('user', text + attachNote)
  simulateReply()
}

function pushMessage(role: 'user' | 'assistant', text: string, work?: WorkKind) {
  messages.value.push({ id: ++seq, role, text, work, time: nowTime() })
  scrollToBottom()
}

/** 模拟助手回复（演示用；接后端后改为真实流式输出） */
function simulateReply(w?: WorkMode) {
  typing.value = true
  scrollToBottom()
  const replies: Record<WorkKind, string> = {
    coding:    '好的，告诉我更多需求细节（语言、输入输出、边界条件），我帮你写出代码。',
    explain:   '把代码贴给我，我会按"思路 → 关键点 → 风险"的结构给你解释。',
    refactor:  '把代码贴给我，我会给出重构建议（拆分、命名、复用、性能），并说明理由。',
    test:      '把代码贴给我，我会按"正常路径 → 边界 → 异常"列出测试用例并生成测试代码。',
    review:    '把代码贴给我，我会从正确性、健壮性、可读性三个维度评审。',
    doc:       '告诉我文档主题和目标读者，我按"概述 → 用法 → 示例 → FAQ"组织内容。',
    data:      '把数据贴给我（或说明来源），我会先做探索性分析再给结论。',
    translate: '把原文贴给我，我会保留语境与语气做翻译，并标注不确定处。',
  }
  const reply = w
    ? replies[w.kind]
    : `已收到（模型：${models.find((m) => m.id === activeModel.value)?.label ?? ''}）。接后端后这里会返回真实模型回复，当前为演示回复。`
  window.setTimeout(() => {
    typing.value = false
    pushMessage('assistant', reply, w?.kind)
  }, 700)
}

function scrollToBottom() {
  nextTick(() => {
    const el = chatRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

/* =================== 输入框：附件 =================== */

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

/* =================== 输入框：自动增高 =================== */

/** 最大高度：8 行 ≈ 8 × 20px 行高 + 12px 上下 padding */
const MAX_INPUT_H = 172

function autoGrow() {
  const ta = inputRef.value
  if (!ta) return
  ta.style.height = 'auto'
  ta.style.height = `${Math.min(ta.scrollHeight, MAX_INPUT_H)}px`
}

/* =================== 输入框：粘贴智能识别 =================== */

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
  const text = e.clipboardData?.getData('text/plain') ?? ''
  if (!text) return
  e.preventDefault()
  // 已是代码块（``` 开头/结尾）或单行文本：原样插入
  const trimmed = text.trim()
  if (/^```/.test(trimmed) && /```$/.test(trimmed)) {
    insertAtCursor(text)
    return
  }
  if (!trimmed.includes('\n')) {
    insertAtCursor(text)
    return
  }
  // 多行内容：自动包成代码块 + 猜语言
  const lang = detectLang(text)
  insertAtCursor(`\`\`\`${lang}\n${trimmed}\n\`\`\``)
}

/** 在光标处插入文本并恢复焦点 */
function insertAtCursor(text: string) {
  const ta = inputRef.value
  if (!ta) return
  const s = ta.selectionStart
  const e = ta.selectionEnd
  inputText.value = inputText.value.slice(0, s) + text + inputText.value.slice(e)
  nextTick(() => {
    const pos = s + text.length
    ta.focus()
    ta.setSelectionRange(pos, pos)
    autoGrow()
  })
}

/* =================== 输入框：表情 / 上下文引用 =================== */

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

/* =================== 会话持久化（模型 + 对话历史） =================== */

const { session, restore, save, flush } = useAppSession()

/** 把当前 AI 状态写回共享快照 */
function syncSession() {
  const s = session.value
  if (!s) return
  s.ai = {
    activeModel: activeModel.value,
    messages: messages.value.map(({ id, role, text, work, time }) => ({ id, role, text, work, time })),
  }
}

/** 模型 / 消息任一变化 → 写回快照并防抖落盘 */
watch([activeModel, messages], () => {
  syncSession()
  save()
}, { deep: true })

/** 启动恢复：恢复上次的模型与对话历史 */
async function restoreAI() {
  const ai = (await restore())?.ai
  if (!ai) return
  activeModel.value = ai.activeModel
  messages.value = ai.messages.map((m) => ({
    id: m.id,
    role: m.role,
    text: m.text,
    work: m.work as WorkKind | undefined,
    time: m.time,
  }))
}

/** 点击输入框以外：关闭弹层 */
function onClickOutside(e: MouseEvent) {
  if (!emojiOpen.value && !contextOpen.value) return
  if (inputBarRef.value?.contains(e.target as Node)) return
  emojiOpen.value = false
  contextOpen.value = false
}

onMounted(async () => {
  document.addEventListener('mousedown', onClickOutside)
  /* 恢复上次会话（模型 + 对话历史） */
  await restoreAI()
  /* 关闭窗口前立即落盘 */
  window.addEventListener('beforeunload', flush)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside)
  window.removeEventListener('beforeunload', flush)
})
</script>

<style scoped>
.ai {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* ==================== 工具条 ==================== */
.ai-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--sb-border);
  flex-shrink: 0;
}
.ai-new {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: var(--kn-radius-md);
  background: var(--sb-hover);
  color: var(--sb-fg);
  cursor: pointer;
  transition: background var(--sb-transition-fast), color var(--sb-transition-fast);
}
.ai-new:hover {
  background: color-mix(in srgb, var(--kn-brand-500) 22%, transparent);
  color: var(--kn-brand-500);
}
.ai-model {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.ai-model-icon {
  color: var(--kn-brand-500);
  flex-shrink: 0;
}
.ai-model-select {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--sb-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  font-weight: 600;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}

/* ==================== 对话流 ==================== */
.ai-chat {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}

.ai-bubble {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 88%;
  padding: 8px 10px;
  border-radius: var(--kn-radius-lg);
  font-size: var(--kn-text-sm);
  line-height: 1.5;
}
.ai-bubble.is-user {
  align-self: flex-end;
  align-items: flex-end;
  background: linear-gradient(135deg, var(--kn-brand-500), var(--kn-magenta-500));
  color: #fff;
  border-bottom-right-radius: 4px;
}
.ai-bubble.is-assistant {
  align-self: flex-start;
  align-items: flex-start;
  background: var(--sb-bg-elev, var(--kn-bg-elev));
  border: 1px solid var(--sb-border);
  color: var(--sb-fg);
  border-bottom-left-radius: 4px;
}

.ai-greet {
  margin: 0;
  color: var(--sb-fg);
}

.ai-msg-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.ai-msg-time {
  font-size: 10px;
  opacity: 0.45;
}

/* 工作类型标签（用户消息顶部小胶囊） */
.ai-work-tag {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  height: 16px;
  padding: 0 6px;
  border-radius: var(--kn-radius-pill);
  font-size: 10px;
  font-weight: 600;
  background: color-mix(in srgb, var(--tint) 18%, transparent);
  color: var(--tint);
}

/* 工作模式速选卡片（多工作均衡：8 宫格） */
.ai-work-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-top: 2px;
}
.ai-work-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  border: 1px solid var(--sb-border);
  border-radius: var(--kn-radius-md);
  background: transparent;
  color: var(--sb-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--sb-transition-fast), border-color var(--sb-transition-fast);
}
.ai-work-card:hover {
  background: color-mix(in srgb, var(--tint) 10%, transparent);
  border-color: color-mix(in srgb, var(--tint) 40%, transparent);
}
.ai-work-icon {
  color: var(--tint);
  flex-shrink: 0;
}
.ai-work-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 正在思考：三点跳动 */
.ai-typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
}
.ai-typing i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--sb-fg-muted);
  animation: ai-blink 1s infinite ease-in-out;
}
.ai-typing i:nth-child(2) { animation-delay: 0.15s; }
.ai-typing i:nth-child(3) { animation-delay: 0.3s; }
@keyframes ai-blink {
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40%          { opacity: 1; transform: translateY(-2px); }
}

/* ==================== 输入框 ==================== */
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