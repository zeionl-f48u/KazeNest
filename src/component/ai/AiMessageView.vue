<!--
  AiMessageView：消息流渲染（DeepSeek Harness 风格）
  - 思考过程：回复前显示可折叠思考块（默认收起，点击展开查看推理要点）
  - 用户消息：右对齐浅色卡片；助手消息：左对齐面板卡片（平铺，非渐变气泡）
  - 消息头：角色/模型名 + 工作类型标签 + 时间
  - 流式输出：打字机进行中的消息尾部显示闪烁光标
  - 代码块复制：点击复制按钮写入剪贴板
-->
<template>
  <!-- 思考过程（默认收起；text 为空表示仍在思考中） -->
  <div v-if="thinking" class="ai-think">
    <button type="button" class="ai-think-head" @click="$emit('toggle-thinking')">
      <Icon name="chevron-right" :size="12" class="ai-think-arrow" :class="{ 'is-open': thinking.open }" />
      <span class="ai-think-title">思考过程</span>
      <span class="ai-think-model">{{ modelLabel }}</span>
      <span v-if="!thinking.text" class="ai-typing"><i /><i /><i /></span>
    </button>
    <div v-if="thinking.open && thinking.text" class="ai-think-body">{{ thinking.text }}</div>
  </div>

  <!-- 消息 -->
  <div
    v-for="m in messages"
    :key="m.id"
    class="ai-msg"
    :class="`is-${m.role}`"
  >
    <div class="ai-msg-head">
      <Icon :name="m.role === 'user' ? 'user' : 'sparkles'" :size="11" class="ai-msg-role-icon" />
      <span class="ai-msg-role">{{ m.role === 'user' ? '你' : modelLabel }}</span>
      <span v-if="m.work" class="ai-work-tag" :style="{ '--tint': workByKind(m.work)?.color }">
        {{ workByKind(m.work)?.label }}
      </span>
      <span class="ai-msg-time">{{ m.time }}</span>
    </div>
    <!-- 助手消息：渲染 Markdown/代码块；用户消息：纯文本 -->
    <div v-if="m.role === 'assistant'" class="ai-msg-markdown" v-html="renderMessage(m.text)" @click="onMarkdownClick" />
    <p v-else class="ai-msg-text">{{ m.text }}</p>
    <!-- 流式输出光标（正在逐字打印的这条消息） -->
    <span v-if="streaming && streaming.messageId === m.id" class="ai-caret" />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '../common'
import { renderMessage } from './render'
import type { AiMessage } from '../../composables/useAiChat'
import { workByKind } from '../../composables/useAiChat'

defineProps<{
  messages: AiMessage[]
  /** 思考过程（null = 无；text 为空表示思考中） */
  thinking: { open: boolean; text: string } | null
  /** 流式输出状态（null = 未在输出） */
  streaming: { messageId: number; length: number } | null
  /** 当前模型名（消息头展示） */
  modelLabel: string
}>()

defineEmits<{ 'toggle-thinking': [] }>()

/** 点击复制按钮：把代码写入剪贴板（按钮 data-copy 存的是代码原文） */
function onMarkdownClick(e: MouseEvent) {
  const btn = (e.target as HTMLElement).closest('.ai-code-copy') as HTMLButtonElement | null
  if (!btn) return
  const code = btn.dataset.copy ?? ''
  navigator.clipboard?.writeText(code).then(() => {
    const label = btn.textContent
    btn.textContent = '已复制'
    setTimeout(() => { btn.textContent = label }, 1200)
  })
}
</script>

<style scoped>
/* ==================== 思考过程折叠块 ==================== */
.ai-think {
  width: 100%;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-lg);
  background: color-mix(in srgb, var(--kn-bg-sunken) 55%, transparent);
  overflow: hidden;
  flex-shrink: 0;
}
.ai-think-head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 10px;
  border: 0;
  background: transparent;
  color: var(--kn-fg-muted);
  font: inherit;
  font-size: var(--kn-text-xs);
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background var(--kn-dur-fast);
}
.ai-think-head:hover {
  background: var(--kn-hover);
}
.ai-think-arrow {
  flex-shrink: 0;
  transition: transform var(--kn-dur-fast) var(--kn-ease-out);
}
.ai-think-arrow.is-open {
  transform: rotate(90deg);
}
.ai-think-model {
  font-weight: 400;
  color: var(--kn-fg-subtle);
}
.ai-think-body {
  padding: 8px 12px 10px 26px;
  border-top: 1px dashed var(--kn-border);
  font-size: var(--kn-text-xs);
  line-height: 1.75;
  color: var(--kn-fg-muted);
  white-space: pre-line;
}

/* ==================== 消息卡片（平铺，非气泡） ==================== */
.ai-msg {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: var(--kn-radius-lg);
  font-size: var(--kn-text-sm);
  line-height: 1.6;
  flex-shrink: 0;
}
.ai-msg.is-user {
  align-self: flex-end;
  max-width: 85%;
  background: color-mix(in srgb, var(--kn-brand-500) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--kn-brand-500) 18%, transparent);
  color: var(--kn-fg);
}
.ai-msg.is-assistant {
  align-self: flex-start;
  width: 100%;
  max-width: 100%;
  background: var(--kn-bg-elev);
  border: 1px solid var(--kn-border);
  color: var(--kn-fg);
}

/* 消息头：角色 + 工作标签 + 时间 */
.ai-msg-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--kn-text-2xs);
  color: var(--kn-fg-subtle);
}
.ai-msg.is-user .ai-msg-head {
  justify-content: flex-end;
}
.ai-msg-role-icon {
  color: var(--kn-brand-500);
}
.ai-msg-role {
  font-weight: 600;
  color: var(--kn-fg-muted);
}
.ai-msg-time {
  margin-left: auto;
  opacity: 0.7;
}

.ai-msg-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 工作类型标签（消息头小胶囊） */
.ai-work-tag {
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

/* 助手消息：Markdown 渲染内容（render.ts 输出的类名不在 scoped 作用域，样式放全局）
  这里仅处理布局容器 */
.ai-msg-markdown {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
}

/* 流式输出光标（打字机尾部闪烁竖线） */
.ai-caret {
  display: inline-block;
  width: 2px;
  height: 14px;
  margin-top: 2px;
  border-radius: 1px;
  background: var(--kn-brand-500);
  animation: ai-caret-blink 0.9s steps(2, start) infinite;
}
@keyframes ai-caret-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0; }
}

/* 思考中：三点跳动 */
.ai-typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 2px;
}
.ai-typing i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--kn-fg-subtle);
  animation: ai-blink 1s infinite ease-in-out;
}
.ai-typing i:nth-child(2) { animation-delay: 0.15s; }
.ai-typing i:nth-child(3) { animation-delay: 0.3s; }
@keyframes ai-blink {
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40%          { opacity: 1; transform: translateY(-2px); }
}
</style>
