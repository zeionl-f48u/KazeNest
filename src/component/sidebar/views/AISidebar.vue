<!--
  AISidebar：AI 助手侧栏（DeepSeek harness 风格）
  - 顶部"新对话"主按钮（渐变胶囊，突出主操作）
  - 对话列表（选中态高亮）+ 模型选择（选中打勾）+ 提示词库（默认折叠）
  - 数据接真实后端后从会话/模型接口返回
-->
<template>
  <div class="vs">
    <!-- 新对话：主操作，独占一行 -->
    <div class="vs-actions">
      <button type="button" class="ai-new" @click="newChat">
        <Icon name="plus" :size="12" />
        新对话
      </button>
    </div>

    <SidebarSection title="对话" :count="sessions.length">
      <SidebarRow
        v-for="s in sessions"
        :key="s.id"
        icon="sparkles"
        :color="s.color"
        :selected="activeSession === s.id"
        @click="activeSession = s.id"
      >
        {{ s.label }}
        <template #meta><span class="vs-meta">{{ s.meta }}</span></template>
      </SidebarRow>
    </SidebarSection>

    <SidebarSection title="模型" icon="cog">
      <SidebarRow
        v-for="m in models"
        :key="m.id"
        icon="sparkles"
        :color="m.color"
        :selected="activeModel === m.id"
        @click="activeModel = m.id"
      >
        {{ m.label }}
        <template #meta>
          <Icon v-if="activeModel === m.id" name="check" :size="11" class="vs-check" />
        </template>
      </SidebarRow>
    </SidebarSection>

    <SidebarSection title="提示词库" icon="menu" collapsed>
      <SidebarRow v-for="p in prompts" :key="p.id" :icon="p.icon" @click="usePrompt(p)">
        {{ p.label }}
      </SidebarRow>
    </SidebarSection>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SidebarSection from './SidebarSection.vue'
import SidebarRow from './SidebarRow.vue'
import { Icon } from '../../common'

const sessions = [
  { id: 'ses-1', label: '重构顶栏为 VS Code 风格', color: 'var(--kn-brand-500)',   meta: '2m' },
  { id: 'ses-2', label: '解释设计 token 系统',     color: 'var(--kn-magenta-500)', meta: '1h' },
  { id: 'ses-3', label: '帮我写查找替换',          color: 'var(--kn-sky-500)',     meta: '3h' },
  { id: 'ses-4', label: '逐行编辑器对齐方案',      color: 'var(--kn-emerald-500)', meta: '昨天' },
  { id: 'ses-5', label: 'Store 插件接入',          color: 'var(--kn-amber-500)',   meta: '昨天' },
  { id: 'ses-6', label: '前端模块化建议',          color: 'var(--kn-rose-500)',    meta: '2 天前' },
]

const models = [
  { id: 'model-r1',     label: 'DeepSeek-R1',    color: 'var(--kn-brand-500)',   meta: '推理' },
  { id: 'model-chat',   label: 'DeepSeek-Chat',  color: 'var(--kn-magenta-500)', meta: '通用' },
  { id: 'model-coder',  label: 'DeepSeek-Coder', color: 'var(--kn-emerald-500)', meta: '代码' },
]

const prompts = [
  { id: 'p-review',   label: '代码评审',   icon: 'check' },
  { id: 'p-refactor', label: '重构建议',   icon: 'refresh' },
  { id: 'p-explain',  label: '解释代码',   icon: 'file-text' },
  { id: 'p-test',     label: '写单元测试', icon: 'terminal' },
]

const activeSession = ref('ses-1')
const activeModel = ref('model-chat')

function newChat() {
  activeSession.value = ''
  // TODO: 接后端后创建新会话并聚焦输入框
}

function usePrompt(p: { id: string; label: string }) {
  activeSession.value = `prompt:${p.id}`
  // TODO: 接后端后把提示词填入聊天输入框
}
</script>

<style scoped>
.vs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 8px;
}

/* 新对话主按钮：渐变胶囊，满宽 */
.vs-actions {
  padding: 10px 10px 8px;
}
.ai-new {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 28px;
  border: 0;
  border-radius: var(--tb-btn-radius);
  font: inherit;
  font-size: var(--kn-text-sm);
  font-weight: 600;
  letter-spacing: 0.1px;
  color: #fff;
  background: linear-gradient(135deg, var(--kn-brand-500), var(--kn-magenta-500));
  box-shadow: 0 1px 3px color-mix(in srgb, var(--kn-brand-500) 35%, transparent);
  cursor: pointer;
  transition:
    filter var(--kn-dur-fast),
    transform var(--kn-dur-fast),
    box-shadow var(--kn-dur-fast);
}
.ai-new:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--kn-brand-500) 45%, transparent);
}
.ai-new:active {
  filter: brightness(0.95);
  transform: translateY(0);
}

.vs-meta {
  font-size: 10px;
  opacity: 0.5;
  flex-shrink: 0;
  margin-left: 6px;
}

.vs-check {
  color: var(--kn-emerald-500);
  flex-shrink: 0;
  margin-left: 6px;
}
</style>