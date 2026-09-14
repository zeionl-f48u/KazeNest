<!--
  AiWorkspace：AI 工作台（harness 设计）
  - 主内容区大屏对话工作台，与侧栏 AISidebar 共享同一份聊天状态（useAiChat）
  - 工具栏：模型选择 + 新对话 + 清空当前对话
  - 工作模式条：8 种工作速选（编码/解释/重构/测试/评审/文档/分析/翻译）
  - 对话主体：消息流（Markdown/代码块渲染 + 复制 + 工具卡片 + 打字效果）
  - 底部输入区：AiInputBar 通用输入条（附件/表情/引用/粘贴识别）
  - 纯前端演示：发送后模拟 agent 工作流（接后端后替换为真实流式输出）
-->
<template>
  <div class="ai-workspace">
    <!-- 工具栏 -->
    <div class="aw-top">
      <div class="aw-title">
        <Icon name="sparkles" :size="15" class="aw-title-icon" />
        <span>AI 工作台</span>
        <span v-if="activeSession" class="aw-session-name">{{ activeSession.label }}</span>
      </div>

      <div class="aw-actions">
        <div class="aw-model">
          <Icon name="sparkles" :size="11" class="aw-model-icon" />
          <select v-model="activeModel" class="aw-model-select" aria-label="选择模型">
            <option v-for="m in models" :key="m.id" :value="m.id">{{ m.label }} · {{ m.desc }}</option>
          </select>
        </div>
        <button type="button" class="aw-btn" title="新对话" aria-label="新对话" @click="onNewChat">
          <Icon name="plus" :size="13" />
          <span>新对话</span>
        </button>
        <button type="button" class="aw-btn is-icon" title="清空当前对话" aria-label="清空当前对话" @click="onClear">
          <Icon name="refresh" :size="13" />
        </button>
      </div>
    </div>

    <!-- 工作模式条 -->
    <div class="aw-modes">
      <button
        v-for="w in workModes"
        :key="w.kind"
        type="button"
        class="aw-mode-chip"
        :style="{ '--tint': w.color }"
        @click="onPickWork(w)"
      >
        <Icon :name="w.icon" :size="12" />
        {{ w.label }}
      </button>
    </div>

    <!-- 对话主体 -->
    <div class="aw-chat" ref="chatRef">
      <!-- 空态：首次进入时的引导 -->
      <div v-if="!messages.length" class="aw-empty">
        <div class="aw-empty-icon">
          <Icon name="sparkles" :size="32" />
        </div>
        <h3>你好，我是 KazeNest 的开发工作助手</h3>
        <p>选择上方的工作模式，或直接在下方输入需求。<br />我可以写代码、解释代码、重构、写测试、评审、文档、数据分析、翻译。</p>
      </div>

      <AiMessageView :messages="messages" :typing="typing" :tool-activity="toolActivity" />
    </div>

    <!-- 输入区 -->
    <AiInputBar class="aw-input-bar" @send="onSend" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { Icon } from '../common'
import { AiMessageView, AiInputBar } from './index'
import { useAiChat } from '../../composables'
import type { WorkMode } from '../../composables'

const { activeSession, activeSessionId, messages, activeModel, models, workModes, typing, toolActivity, newChat, send, pickWork, restore, flush } = useAiChat()

const chatRef = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    const el = chatRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function onNewChat() {
  newChat()
  scrollToBottom()
}

function onClear() {
  const sess = activeSession.value
  if (sess) sess.messages = []
}

function onPickWork(w: WorkMode) {
  pickWork(w)
  scrollToBottom()
}

function onSend(payload: { text: string; attachments: string[] }) {
  send(payload)
  scrollToBottom()
}

/* 切换会话/消息更新：滚到底部 */
watch([activeSessionId, messages], scrollToBottom)

onMounted(async () => {
  await restore()
  scrollToBottom()
  window.addEventListener('beforeunload', flush)
})
</script>

<style scoped>
.ai-workspace {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--kn-bg);
}

/* ============ 工具栏 ============ */
.aw-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--kn-border);
  background: var(--kn-bg-elev);
  flex-shrink: 0;
}
.aw-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--kn-text-lg);
  font-weight: 600;
}
.aw-title-icon {
  color: var(--kn-brand-500);
}
.aw-session-name {
  font-size: var(--kn-text-sm);
  font-weight: 400;
  color: var(--kn-fg-muted);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.aw-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.aw-model {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-md);
  background: var(--kn-bg-elev);
}
.aw-model-icon {
  color: var(--kn-brand-500);
}
.aw-model-select {
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  font-weight: 500;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}
.aw-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-md);
  background: var(--kn-bg-elev);
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--kn-dur-fast), border-color var(--kn-dur-fast);
}
.aw-btn:hover {
  background: var(--kn-hover);
}
.aw-btn.is-icon {
  width: 28px;
  padding: 0;
  justify-content: center;
}

/* ============ 工作模式条 ============ */
.aw-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 16px 0;
  flex-shrink: 0;
}
.aw-mode-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 10px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-pill);
  background: var(--kn-bg-elev);
  color: var(--kn-fg-muted);
  font: inherit;
  font-size: var(--kn-text-xs);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--kn-dur-fast), border-color var(--kn-dur-fast), color var(--kn-dur-fast);
}
.aw-mode-chip:hover {
  background: color-mix(in srgb, var(--tint) 8%, transparent);
  border-color: color-mix(in srgb, var(--tint) 35%, transparent);
  color: var(--tint);
}

/* ============ 对话主体 ============ */
.aw-chat {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
}

/* 空态引导 */
.aw-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  text-align: center;
  color: var(--kn-fg-muted);
}
.aw-empty-icon {
  width: 72px;
  height: 72px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--kn-radius-2xl);
  background: color-mix(in srgb, var(--kn-brand-500) 12%, transparent);
  color: var(--kn-brand-500);
  box-shadow: var(--kn-shadow-md);
  animation: aw-float 3.5s var(--kn-ease-in-out) infinite;
}
@keyframes aw-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}
.aw-empty h3 {
  margin: 0;
  font-size: var(--kn-text-xl);
  font-weight: 600;
  color: var(--kn-fg);
}
.aw-empty p {
  margin: 0;
  font-size: var(--kn-text-sm);
  line-height: 1.7;
}

/* 输入条 */
.aw-input-bar {
  border-top: 1px solid var(--kn-border);
  background: var(--kn-bg-elev);
  flex-shrink: 0;
}
</style>

<style>
/* AI 消息 Markdown 渲染样式（render.ts 输出的类名不在 scoped 作用域，放全局）
   与 AiMessageView 的 .ai-msg-markdown 配合 */
.ai-msg-markdown > *:first-child {
  margin-top: 0;
}
.ai-msg-markdown > *:last-child {
  margin-bottom: 0;
}
.ai-msg-markdown p {
  margin: 0 0 6px;
}
.ai-msg-markdown code {
  padding: 1px 5px;
  border-radius: var(--kn-radius-xs);
  background: color-mix(in srgb, var(--kn-fg) 8%, transparent);
  font-family: var(--kn-font-mono);
  font-size: 0.92em;
}
.ai-msg-markdown strong {
  font-weight: 600;
}
.ai-msg-markdown blockquote {
  margin: 6px 0;
  padding: 4px 12px;
  border-left: 3px solid var(--kn-brand-500);
  background: color-mix(in srgb, var(--kn-brand-500) 6%, transparent);
  border-radius: 0 var(--kn-radius-sm) var(--kn-radius-sm) 0;
}
.ai-msg-markdown ul,
.ai-msg-markdown ol {
  margin: 6px 0;
  padding-left: 20px;
}
.ai-msg-markdown li {
  margin: 2px 0;
}
.ai-msg-markdown a {
  color: var(--kn-brand-500);
  text-decoration: underline;
}

/* 代码块：头部（语言 + 复制） + 主体（高亮行） */
.ai-code {
  margin: 8px 0;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-md);
  overflow: hidden;
  background: var(--ed-bg);
}
.ai-code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 10px;
  background: var(--kn-bg-sunken);
  border-bottom: 1px solid var(--kn-border);
  font-size: var(--kn-text-2xs);
  color: var(--kn-fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.ai-code-lang {
  font-weight: 600;
}
.ai-code-copy {
  border: 0;
  background: transparent;
  color: var(--kn-fg-muted);
  font: inherit;
  font-size: var(--kn-text-2xs);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--kn-radius-xs);
  text-transform: none;
  letter-spacing: 0;
}
.ai-code-copy:hover {
  background: var(--kn-hover);
  color: var(--kn-fg);
}
.ai-code-body {
  margin: 0;
  padding: 10px 12px;
  overflow-x: auto;
  font-family: var(--kn-font-mono);
  font-size: var(--kn-text-sm);
  line-height: 1.6;
  color: var(--ed-fg);
}
</style>