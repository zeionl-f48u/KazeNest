<!--
  AiWorkspace：AI 工作台（DeepSeek Harness 风格）
  - 主内容区对话工作台，与侧栏 AISidebar 共享同一份聊天状态（useAiChat）
  - 布局：消息流居中窄列（760px），大屏两侧留白；输入区同宽居中
  - 空态（DeepSeek 同款欢迎页）：大 Logo + 欢迎语 + 居中的输入卡片 + 建议卡片；
    开始对话后输入框落到底部
  - 对话主体：思考过程折叠块（默认收起）→ 流式打字机回复 → 消息卡片
    · 消息悬停操作：复制 / 重新生成
    · 流式输出中显示"停止"键，可中断生成
    · 用户上滚查看历史时停止自动跟随，显示"回到底部"按钮
  - 底部输入区：一体化输入卡片 + 免责小字
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
        <button type="button" class="aw-btn" aria-label="新对话" @click="onNewChat">
          <Icon name="plus" :size="13" />
          <span>新对话</span>
        </button>
        <button type="button" class="aw-btn is-icon" aria-label="清空当前对话" @click="onClear">
          <Icon name="refresh" :size="13" />
        </button>
      </div>
    </div>

    <!-- 对话主体（滚动容器 + 居中窄列） -->
    <div class="aw-chat" ref="chatRef" @scroll="onChatScroll">
      <div class="aw-thread" :class="{ 'is-hero': !messages.length }">
        <!-- 空态：DeepSeek 风格欢迎页（输入框居中） -->
        <div v-if="!messages.length" class="aw-hero">
          <div class="aw-hero-logo">
            <Icon name="cloud" :size="34" />
          </div>
          <h2 class="aw-hero-title">你好，我是 KazeNest 开发工作助手</h2>
          <p class="aw-hero-sub">写代码 · 解释代码 · 重构 · 写测试 · 评审 · 文档 · 数据分析 · 翻译</p>

          <!-- 居中输入卡片（开始对话后落到底部） -->
          <div class="aw-hero-input">
            <AiInputBar @send="onSend" @stop="onStop" />
          </div>

          <!-- 建议卡片（点击即发送） -->
          <div class="aw-suggests">
            <button
              v-for="s in suggests"
              :key="s.work"
              type="button"
              class="aw-suggest"
              :style="{ '--tint': s.color }"
              @click="onSuggest(s)"
            >
              <Icon :name="s.icon" :size="14" class="aw-suggest-icon" />
              <span class="aw-suggest-body">
                <span class="aw-suggest-label">{{ s.label }}</span>
                <span class="aw-suggest-desc">{{ s.desc }}</span>
              </span>
            </button>
          </div>
        </div>

        <AiMessageView
          v-else
          :messages="messages"
          :thinking="thinking"
          :streaming="streaming"
          :model-label="activeModelInfo?.label ?? ''"
          :last-assistant-id="lastAssistantId"
          @toggle-thinking="toggleThinking"
          @regenerate="onRegenerate"
        />
      </div>
    </div>

    <!-- 回到底部（用户上滚查看历史时显示） -->
    <button
      v-if="showScrollBtn"
      type="button"
      class="aw-scroll-btn"
      aria-label="回到底部"
      @click="scrollToBottom(true)"
    >
      <Icon name="chevron-down" :size="14" />
    </button>

    <!-- 底部输入区（对话开始后显示）：输入卡片 + 免责小字 -->
    <div v-if="messages.length" class="aw-input-area">
      <AiInputBar
        class="aw-input-bar"
        :streaming="!!streaming"
        @send="onSend"
        @stop="onStop"
      />
      <p class="aw-disclaimer">内容由 AI 生成，请仔细甄别</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Icon } from '../common'
import { AiMessageView, AiInputBar } from './index'
import { useAiChat } from '../../composables'
import type { WorkKind } from '../../composables'

const { activeSession, activeSessionId, messages, activeModel, activeModelInfo, models, thinking, streaming, workModes, newChat, send, pickWork, toggleThinking, stopStreaming, regenerate, restore, flush } = useAiChat()

const chatRef = ref<HTMLElement | null>(null)

/* =================== 空态建议卡片（点击即发送） =================== */

interface EmptySuggest {
  label: string
  desc: string
  icon: string
  color: string
  work: WorkKind
}

const suggests: EmptySuggest[] = [
  { label: '解释代码', desc: '按 思路 → 要点 → 风险 拆解', icon: 'file-text', color: 'var(--kn-emerald-500)', work: 'explain' },
  { label: '编写代码', desc: '生成可直接使用的实现', icon: 'file-plus', color: 'var(--kn-sky-500)', work: 'coding' },
  { label: '代码评审', desc: '正确性 / 健壮性 / 可读性', icon: 'check', color: 'var(--kn-rose-500)', work: 'review' },
  { label: '写单元测试', desc: '正常路径 → 边界 → 异常', icon: 'terminal', color: 'var(--kn-amber-500)', work: 'test' },
]

function onSuggest(s: EmptySuggest) {
  const w = workModes.find((x) => x.kind === s.work)
  if (!w) return
  pickWork(w)
  scrollToBottom(true)
}

/* =================== 滚动跟随 =================== */

/** 是否显示"回到底部"按钮（离底部超过 80px） */
const showScrollBtn = ref(false)

function onChatScroll() {
  const el = chatRef.value
  if (!el) return
  showScrollBtn.value = el.scrollHeight - el.scrollTop - el.clientHeight > 80
}

/** 滚到底部；force=false 时仅在用户贴近底部时跟随（上滚查看历史不打扰） */
function scrollToBottom(force = false) {
  const el = chatRef.value
  if (!el) return
  if (!force && el.scrollHeight - el.scrollTop - el.clientHeight >= 80) return
  nextTick(() => {
    el.scrollTop = el.scrollHeight
    showScrollBtn.value = false
  })
}

/* =================== 操作 =================== */

/** 最后一条助手消息 id（该条显示"重新生成"） */
const lastAssistantId = computed<number | null>(() => {
  const arr = messages.value
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].role === 'assistant') return arr[i].id
  }
  return null
})

function onNewChat() {
  newChat()
  scrollToBottom(true)
}

function onClear() {
  const sess = activeSession.value
  if (sess) sess.messages = []
}

function onSend(payload: { text: string; attachments: string[] }) {
  send(payload)
  scrollToBottom(true)
}

function onStop() {
  stopStreaming()
}

function onRegenerate() {
  regenerate()
  scrollToBottom(true)
}

/* 切换会话 / 新消息：强制滚到底部；流式增量：仅在贴近底部时跟随 */
watch(activeSessionId, () => scrollToBottom(true))
watch(messages, () => scrollToBottom(true))
watch(() => streaming.value?.length, () => scrollToBottom(false))

onMounted(async () => {
  await restore()
  scrollToBottom(true)
  window.addEventListener('beforeunload', flush)
})
</script>

<style scoped>
.ai-workspace {
  position: relative;
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

/* ============ 对话主体（滚动容器） ============ */
.aw-chat {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 居中窄列（DeepSeek Harness：大屏两侧留白，内容列 760px） */
.aw-thread {
  max-width: 760px;
  width: 100%;
  min-height: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  padding: 20px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
/* 空态：内容整体垂直居中（输入框居中，DeepSeek 同款） */
.aw-thread.is-hero {
  justify-content: center;
}

/* ============ 空态：欢迎页 ============ */
.aw-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: center;
  padding-bottom: 7vh; /* 视觉重心略偏上 */
}
.aw-hero-logo {
  width: 72px;
  height: 72px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--kn-radius-2xl);
  background: linear-gradient(135deg, var(--kn-brand-500), var(--kn-magenta-500));
  color: #fff;
  box-shadow: var(--kn-shadow-lg);
  animation: aw-float 3.5s var(--kn-ease-in-out) infinite;
}
@keyframes aw-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}
.aw-hero-title {
  margin: 8px 0 0;
  font-size: var(--kn-text-3xl);
  font-weight: 700;
  color: var(--kn-fg);
}
.aw-hero-sub {
  margin: 0;
  font-size: var(--kn-text-sm);
  color: var(--kn-fg-muted);
}

/* 居中输入卡片（与消息流同宽） */
.aw-hero-input {
  width: 100%;
  max-width: 640px;
  margin-top: 16px;
}
.aw-hero-input :deep(.ai-input-bar) {
  padding: 0;
}

/* 建议卡片（2×2，位于输入框下方） */
.aw-suggests {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  max-width: 640px;
  margin-top: 4px;
}
.aw-suggest {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg-elev);
  color: var(--kn-fg);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--kn-dur-fast), border-color var(--kn-dur-fast), transform var(--kn-dur-fast);
}
.aw-suggest:hover {
  background: color-mix(in srgb, var(--tint) 7%, transparent);
  border-color: color-mix(in srgb, var(--tint) 35%, transparent);
  transform: translateY(-1px);
}
.aw-suggest-icon {
  color: var(--tint);
  flex-shrink: 0;
}
.aw-suggest-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.aw-suggest-label {
  font-size: var(--kn-text-sm);
  font-weight: 600;
}
.aw-suggest-desc {
  font-size: var(--kn-text-2xs);
  color: var(--kn-fg-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ============ 回到底部 ============ */
.aw-scroll-btn {
  position: absolute;
  left: 50%;
  bottom: 84px;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--kn-border);
  border-radius: 50%;
  background: var(--kn-bg-elev);
  color: var(--kn-fg-muted);
  box-shadow: var(--kn-shadow-md);
  cursor: pointer;
  z-index: 5;
  transition: color var(--kn-dur-fast), border-color var(--kn-dur-fast), transform var(--kn-dur-fast);
}
.aw-scroll-btn:hover {
  color: var(--kn-fg);
  border-color: var(--kn-border-strong);
  transform: translateX(-50%) translateY(-1px);
}

/* ============ 底部输入区 ============ */
.aw-input-area {
  border-top: 1px solid var(--kn-border);
  background: var(--kn-bg-elev);
  flex-shrink: 0;
  padding-bottom: 2px;
}
/* 输入卡片与消息流同宽的居中窄列 */
.aw-input-area :deep(.ai-input-bar) {
  max-width: 760px;
  margin: 0 auto;
}
/* 免责小字（DeepSeek 同款） */
.aw-disclaimer {
  margin: 0 0 6px;
  text-align: center;
  font-size: var(--kn-text-2xs);
  color: var(--kn-fg-subtle);
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
