<!--
  AiMessageView：单条 AI 消息渲染
  - 用户消息：右对齐渐变气泡（带工作类型标签）
  - 助手消息：左对齐卡片（Markdown/代码块渲染 + 复制按钮）
  - 工具卡片：模拟 agent 执行过程（读取上下文 → 分析 → 生成）
  - 打字效果：助手回复中显示三点跳动
  - 代码块复制：点击复制按钮写入剪贴板
-->
<template>
  <!-- 工具执行卡片（助手回复前显示） -->
  <div v-if="toolActivity" class="ai-msg is-assistant">
    <div class="ai-tool-card">
      <span class="ai-tool-icon" :class="`is-${toolActivity.status}`">
        <Icon :name="toolIcon(toolActivity.name)" :size="13" />
      </span>
      <div class="ai-tool-body">
        <div class="ai-tool-title">
          {{ toolActivity.name }}
          <span v-if="toolActivity.status === 'done'" class="ai-tool-done">完成</span>
        </div>
        <div class="ai-tool-detail">{{ toolActivity.detail }}</div>
      </div>
    </div>
  </div>

  <!-- 正常消息 -->
  <div
    v-for="m in messages"
    :key="m.id"
    class="ai-msg"
    :class="`is-${m.role}`"
  >
    <span v-if="m.work" class="ai-work-tag" :style="{ '--tint': workByKind(m.work)?.color }">
      {{ workByKind(m.work)?.label }}
    </span>
    <!-- 助手消息：渲染 Markdown/代码块；用户消息：纯文本 -->
    <div v-if="m.role === 'assistant'" class="ai-msg-markdown" v-html="renderMessage(m.text)" @click="onMarkdownClick" />
    <p v-else class="ai-msg-text">{{ m.text }}</p>
    <span class="ai-msg-time">{{ m.time }}</span>
  </div>

  <!-- 正在思考 -->
  <div v-if="typing && !toolActivity" class="ai-msg is-assistant">
    <span class="ai-typing"><i /><i /><i /></span>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '../common'
import { renderMessage, toolIcon } from './render'
import type { AiMessage } from '../../composables/useAiChat'
import { workByKind } from '../../composables/useAiChat'

defineProps<{
  messages: AiMessage[]
  typing: boolean
  toolActivity: { name: string; status: 'running' | 'done'; detail: string } | null
}>()

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
.ai-msg {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 92%;
  padding: 8px 10px;
  border-radius: var(--kn-radius-lg);
  font-size: var(--kn-text-sm);
  line-height: 1.5;
}
.ai-msg.is-user {
  align-self: flex-end;
  align-items: flex-end;
  background: linear-gradient(135deg, var(--kn-brand-500), var(--kn-magenta-500));
  color: #fff;
  border-bottom-right-radius: 4px;
}
.ai-msg.is-assistant {
  align-self: flex-start;
  align-items: flex-start;
  background: var(--sb-bg-elev, var(--kn-bg-elev));
  border: 1px solid var(--sb-border);
  color: var(--sb-fg);
  border-bottom-left-radius: 4px;
  max-width: 100%;
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

/* 助手消息：Markdown 渲染内容（render.ts 输出的类名不在 scoped 作用域，样式放全局）
  这里仅处理布局容器 */
.ai-msg-markdown {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
}

/* 工具卡片（模拟 agent 执行过程） */
.ai-tool-card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 220px;
}
.ai-tool-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--kn-radius-md);
  background: var(--sb-hover);
  color: var(--sb-fg-muted);
  flex-shrink: 0;
}
.ai-tool-icon.is-running {
  animation: ai-tool-pulse 1.2s infinite ease-in-out;
}
.ai-tool-icon.is-done {
  background: color-mix(in srgb, var(--kn-emerald-500) 15%, transparent);
  color: var(--kn-emerald-500);
}
@keyframes ai-tool-pulse {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}
.ai-tool-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ai-tool-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--kn-text-sm);
  font-weight: 600;
}
.ai-tool-done {
  font-size: 10px;
  font-weight: 500;
  color: var(--kn-emerald-500);
}
.ai-tool-detail {
  font-size: var(--kn-text-xs);
  color: var(--sb-fg-muted);
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
</style>