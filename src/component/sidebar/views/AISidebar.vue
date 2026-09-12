<!--
  AISidebar：AI 工作助手（Workbuddy 风格对话流）
  - 顶部工具条：新对话 + 模型切换
  - 对话流：问候卡片（含 8 种工作模式速选，均衡覆盖常见开发工作）+ 气泡消息
  - 底部输入框：Enter 发送、Shift+Enter 换行、自动增高
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
    <div class="ai-input-bar">
      <textarea
        ref="inputRef"
        v-model="inputText"
        class="ai-input"
        rows="1"
        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
        spellcheck="false"
        @keydown.enter.exact.prevent="send"
        @input="autoGrow"
      ></textarea>
      <button
        type="button"
        class="ai-send"
        title="发送 (Enter)"
        aria-label="发送"
        :disabled="!inputText.trim()"
        @click="send"
      >
        <Icon name="arrow-up" :size="13" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { Icon } from '../../common'

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
}

/** 点击工作卡片：作为用户消息发出（带工作类型标签），并模拟助手回复 */
function pickWork(w: WorkMode) {
  pushMessage('user', w.prompt, w.kind)
  simulateReply(w)
}

function send() {
  const text = inputText.value.trim()
  if (!text) return
  inputText.value = ''
  autoGrow()
  pushMessage('user', text)
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

/** 输入框随内容自动增高（最多 6 行） */
function autoGrow() {
  const ta = inputRef.value
  if (!ta) return
  ta.style.height = 'auto'
  ta.style.height = `${Math.min(ta.scrollHeight, 6 * 20 + 12)}px`
}
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
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid var(--sb-border);
  flex-shrink: 0;
}
.ai-input {
  flex: 1;
  min-height: 28px;
  max-height: 120px;
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
}
.ai-input:focus {
  border-color: var(--kn-brand-500);
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
</style>