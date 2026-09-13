<!--
  AISidebar：AI 助手侧栏（会话列表视图）
  - 与主区 AiWorkspace 共享同一份聊天状态（useAiChat）
  - 顶部工具条：新对话 + 模型选择
  - 会话列表：切换/删除会话（选中态高亮，最新会话置顶）
  - 模型列表：勾选当前模型
  - 提示词库：点击将提示词作为消息发出
  - 底部输入条：AiInputBar 通用输入组件（与主区共用）
-->
<template>
  <div class="ai">
    <!-- 工具条：新对话 + 模型 -->
    <div class="ai-toolbar">
      <button type="button" class="ai-new" title="新对话" aria-label="新对话" @click="onNewChat">
        <Icon name="plus" :size="12" />
      </button>
      <div class="ai-model">
        <Icon name="sparkles" :size="11" class="ai-model-icon" />
        <select v-model="activeModel" class="ai-model-select" aria-label="选择模型">
          <option v-for="m in models" :key="m.id" :value="m.id">{{ m.label }}</option>
        </select>
      </div>
    </div>

    <!-- 会话列表 -->
    <div class="ai-sessions">
      <div class="ai-section-title">会话</div>
      <SidebarRow
        v-for="s in sessions"
        :key="s.id"
        :icon="s.icon"
        :color="s.color"
        :selected="s.id === activeSessionId"
        @click="selectSession(s.id)"
      >
        <span class="ai-session-label">{{ s.label }}</span>
        <template #meta>
          <span class="ai-session-meta">{{ s.meta }}</span>
          <button
            type="button"
            class="ai-session-x"
            title="删除会话"
            aria-label="删除会话"
            @click.stop="removeSession(s.id)"
          >
            <Icon name="times" :size="9" />
          </button>
        </template>
      </SidebarRow>
    </div>

    <!-- 模型 -->
    <div class="ai-section">
      <div class="ai-section-title">模型</div>
      <SidebarRow
        v-for="m in models"
        :key="m.id"
        icon="sparkles"
        :selected="m.id === activeModel"
        @click="activeModel = m.id"
      >
        {{ m.label }}
        <template #meta>
          <Icon v-if="m.id === activeModel" name="check" :size="11" class="ai-check" />
        </template>
      </SidebarRow>
    </div>

    <!-- 提示词库（默认折叠） -->
    <div class="ai-section">
      <SidebarSection title="提示词库" icon="menu" collapsed>
        <SidebarRow v-for="p in prompts" :key="p.id" :icon="p.icon" @click="onPrompt(p)">
          {{ p.label }}
        </SidebarRow>
      </SidebarSection>
    </div>

    <!-- 输入条 -->
    <AiInputBar class="ai-input" @send="onSend" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Icon } from '../../common'
import { SidebarSection, SidebarRow } from './views'
import { AiInputBar } from '../ai'
import { useAiChat, workByKind } from '../../composables'

const { sessions, activeSessionId, activeModel, models, workModes, newChat, selectSession, removeSession, send, restore, flush } = useAiChat()

const prompts = [
  { id: 'p-review',   label: '代码评审',   icon: 'check' },
  { id: 'p-refactor', label: '重构建议',   icon: 'refresh' },
  { id: 'p-explain',  label: '解释代码',   icon: 'file-text' },
  { id: 'p-test',     label: '写单元测试', icon: 'terminal' },
]

function onNewChat() {
  newChat()
}

function onPrompt(p: { id: string; label: string }) {
  const w = workModes.find((m) => m.prompt.includes(p.label.replace('代码', '')) || m.label === p.label)
  send({ text: p.label, work: w?.kind })
}

function onSend(payload: { text: string; attachments: string[] }) {
  send(payload)
}

onMounted(async () => {
  await restore()
  window.addEventListener('beforeunload', flush)
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

/* ==================== 会话 / 模型列表 ==================== */
.ai-sessions {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 8px 8px;
  border-bottom: 1px solid var(--sb-border);
  overflow-y: auto;
  min-height: 0;
  flex: 1;
}
.ai-section {
  padding: 8px;
}
.ai-section-title {
  padding: 4px 6px;
  font-size: var(--kn-text-xs);
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: var(--sb-fg-muted);
}
.ai-session-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ai-session-meta {
  font-size: 10px;
  opacity: 0.5;
  flex-shrink: 0;
  margin-left: 6px;
}
.ai-session-x {
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
  opacity: 0;
  transition: opacity var(--kn-dur-fast), background var(--kn-dur-fast);
}
.ai-session-x:hover {
  background: var(--sb-hover);
  color: var(--sb-fg);
}
.ai-session-meta:hover + .ai-session-x,
.ai-session-x:hover {
  opacity: 1;
}
.ai-check {
  color: var(--kn-emerald-500);
  flex-shrink: 0;
  margin-left: 6px;
}

/* ==================== 输入条 ==================== */
.ai-input {
  border-top: 1px solid var(--sb-border);
  flex-shrink: 0;
}
</style>