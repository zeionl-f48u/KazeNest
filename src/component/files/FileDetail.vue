<!--
  FileDetail：文件详情面板（右侧）
  - 元信息：格式 / 大小 / 修改时间 / 存储方式（私有空间显示加密）
  - 标签编辑：chips 删除 + 输入新增（Enter 或 + 按钮）
  - 注释编辑：多行文本（即时写回，仅页面演示）
-->
<template>
  <aside class="fd">
    <!-- 头部：格式图标 + 名称 + 关闭 -->
    <div class="fd-head">
      <span class="fd-icon" :style="{ '--tint': kindMeta(file.kind).color }">
        <Icon :name="kindMeta(file.kind).icon" :size="18" />
      </span>
      <div class="fd-title">
        <div class="fd-name" :title="file.name">{{ file.name }}</div>
        <div class="fd-badges">
          <span class="fd-badge">{{ kindMeta(file.kind).label }}</span>
          <span v-if="file.encrypted" class="fd-badge is-encrypted">
            <Icon name="lock" :size="9" /> 加密
          </span>
        </div>
      </div>
      <button type="button" class="fd-close" aria-label="关闭详情" title="关闭详情" @click="emit('close')">
        <Icon name="times" :size="13" />
      </button>
    </div>

    <!-- 元信息 -->
    <div class="fd-meta">
      <div class="fd-meta-row"><span>大小</span><span>{{ file.size }}</span></div>
      <div class="fd-meta-row"><span>修改时间</span><span>{{ file.modified }}</span></div>
      <div class="fd-meta-row">
        <span>存储方式</span>
        <span>{{ file.encrypted ? '加密存储' : '普通存储' }}</span>
      </div>
    </div>

    <!-- 标签 -->
    <div class="fd-section">
      <div class="fd-section-title">
        <Icon name="tag" :size="12" />
        <span>标签</span>
      </div>
      <div class="fd-tags">
        <span v-for="t in file.tags" :key="t" class="fd-tag">
          {{ t }}
          <button type="button" class="fd-tag-x" :aria-label="`移除标签 ${t}`" @click="removeTag(t)">
            <Icon name="times" :size="9" />
          </button>
        </span>
        <span v-if="!file.tags.length" class="fd-tags-empty">暂无标签</span>
      </div>
      <div class="fd-tag-add">
        <input
          v-model="tagDraft"
          class="fd-tag-input"
          placeholder="添加标签，Enter 确认"
          spellcheck="false"
          @keydown.enter.prevent="addTag"
        />
        <button type="button" class="fd-tag-btn" :disabled="!tagDraft.trim()" aria-label="添加标签" title="添加标签" @click="addTag">
          <Icon name="plus" :size="12" />
        </button>

        <!-- 选择已有标签（下拉） -->
        <div ref="tagPickRef" class="fd-tag-picker">
          <button
            type="button"
            class="fd-tag-btn"
            :class="{ 'is-on': tagPopOpen }"
            aria-label="选择已有标签"
            title="选择已有标签"
            @click="toggleTagPop"
          >
            <Icon name="tag" :size="12" />
          </button>

          <div v-if="tagPopOpen" class="fd-tagpop">
            <div class="fd-tagpop-title">已有标签</div>
            <button
              v-for="t in selectableTags"
              :key="t"
              type="button"
              class="fd-tagpop-item"
              @click="pickTag(t)"
            >
              <Icon name="tag" :size="11" class="fd-tagpop-icon" />
              <span>{{ t }}</span>
            </button>
            <div v-if="!selectableTags.length" class="fd-tagpop-empty">暂无可选标签</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 注释 -->
    <div class="fd-section">
      <div class="fd-section-title">
        <Icon name="message-square" :size="12" />
        <span>注释</span>
      </div>
      <textarea
        class="fd-note"
        rows="5"
        placeholder="写点说明，便于以后检索…"
        spellcheck="false"
        :value="file.note"
        @input="emit('update-note', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>

      <!-- AI 一键批注（演示：模拟生成注释；接 AI 后替换为真实调用） -->
      <button type="button" class="fd-ai-btn" :disabled="aiBusy" title="演示：模拟 AI 生成注释" @click="aiAnnotate">
        <Icon name="sparkles" :size="12" />
        <span>{{ aiBusy ? 'AI 批注生成中…' : 'AI 一键批注' }}</span>
      </button>
    </div>

    <p class="fd-hint">标签与注释会被统一搜索命中（演示：即时保存在当前会话）</p>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from '../common'
import { kindMeta } from './types'
import type { ManagedFile } from './types'

const props = defineProps<{
  /** 当前选中的文件 */
  file: ManagedFile
  /** 当前空间已有的标签集合（供"选择已有标签"下拉） */
  availableTags?: string[]
}>()

const emit = defineEmits<{
  close: []
  'update-tags': [tags: string[]]
  'update-note': [note: string]
}>()

/* =================== 标签编辑 =================== */

const tagDraft = ref('')

function addTag() {
  const t = tagDraft.value.trim()
  if (!t || props.file.tags.includes(t)) {
    tagDraft.value = ''
    return
  }
  emit('update-tags', [...props.file.tags, t])
  tagDraft.value = ''
}

function removeTag(tag: string) {
  emit('update-tags', props.file.tags.filter((t) => t !== tag))
}

/* =================== 选择已有标签（下拉） =================== */

const tagPopOpen = ref(false)
const tagPickRef = ref<HTMLElement | null>(null)

/** 可选项 = 空间已有标签 − 当前文件已有（避免重复） */
const selectableTags = computed(() =>
  (props.availableTags ?? []).filter((t) => !props.file.tags.includes(t))
)

function toggleTagPop() {
  tagPopOpen.value = !tagPopOpen.value
}

function pickTag(tag: string) {
  emit('update-tags', [...props.file.tags, tag])
  tagPopOpen.value = false
}

/** 点击下拉以外区域关闭 */
function onClickOutside(e: MouseEvent) {
  if (!tagPopOpen.value) return
  if (tagPickRef.value?.contains(e.target as Node)) return
  tagPopOpen.value = false
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))

/* =================== AI 一键批注（演示） =================== */
/* 模拟生成一段注释；接 AI 后替换为真实调用（把文件元信息/内容摘要发给模型） */

const aiBusy = ref(false)
let aiTimer: number | undefined

function aiAnnotate() {
  if (aiBusy.value) return
  aiBusy.value = true
  const targetId = props.file.id

  aiTimer = window.setTimeout(() => {
    aiBusy.value = false
    /* 生成期间切换了文件：丢弃本次结果 */
    if (props.file.id !== targetId) return

    const kind = kindMeta(props.file.kind).label
    const parts = [`AI 批注：这是一份${kind}文件「${props.file.name}」`]
    if (props.file.tags.length) parts.push(`涉及 ${props.file.tags.join('、')} 等主题`)
    parts.push('建议关注内容要点与时效性，归档时补充来源与版本信息')
    emit('update-note', `${parts.join('，')}。`)
  }, 900)
}

onUnmounted(() => window.clearTimeout(aiTimer))
</script>

<style scoped>
.fd {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 300px;
  flex-shrink: 0;
  padding: 14px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg-elev);
  position: sticky;
  top: 0;
  box-sizing: border-box;
}

/* ==================== 头部 ==================== */
.fd-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.fd-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--kn-radius-md);
  background: color-mix(in srgb, var(--tint) 14%, transparent);
  color: var(--tint);
  flex-shrink: 0;
}
.fd-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.fd-name {
  font-size: var(--kn-text-sm);
  font-weight: 600;
  line-height: 1.4;
  word-break: break-all;
}
.fd-badges {
  display: flex;
  align-items: center;
  gap: 4px;
}
.fd-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 16px;
  padding: 0 6px;
  border-radius: var(--kn-radius-pill);
  background: var(--kn-bg-sunken);
  color: var(--kn-fg-muted);
  font-size: 10px;
  font-weight: 600;
}
.fd-badge.is-encrypted {
  background: color-mix(in srgb, var(--kn-amber-500) 14%, transparent);
  color: var(--kn-amber-500);
}
.fd-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: var(--kn-radius-sm);
  background: transparent;
  color: var(--kn-fg-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--kn-dur-fast), color var(--kn-dur-fast);
}
.fd-close:hover {
  background: var(--kn-hover);
  color: var(--kn-fg);
}

/* ==================== 元信息 ==================== */
.fd-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: var(--kn-radius-md);
  background: var(--kn-bg-sunken);
}
.fd-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: var(--kn-text-xs);
}
.fd-meta-row span:first-child {
  color: var(--kn-fg-muted);
}
.fd-meta-row span:last-child {
  color: var(--kn-fg);
  font-weight: 500;
}

/* ==================== 分区（标签 / 注释） ==================== */
.fd-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fd-section-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--kn-text-xs);
  font-weight: 600;
  letter-spacing: 0.2px;
  color: var(--kn-fg-muted);
}

/* 标签 chips */
.fd-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.fd-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 4px 0 8px;
  border-radius: var(--kn-radius-pill);
  background: color-mix(in srgb, var(--kn-brand-500) 12%, transparent);
  color: var(--kn-brand-500);
  font-size: var(--kn-text-xs);
  font-weight: 600;
}
.fd-tag-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.7;
}
.fd-tag-x:hover {
  background: color-mix(in srgb, var(--kn-brand-500) 20%, transparent);
  opacity: 1;
}
.fd-tags-empty {
  font-size: var(--kn-text-xs);
  color: var(--kn-fg-subtle);
}

/* 标签输入 */
.fd-tag-add {
  display: flex;
  align-items: center;
  gap: 6px;
}
.fd-tag-input {
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-md);
  background: var(--kn-bg);
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-xs);
  outline: 0;
  transition: border-color var(--kn-dur-fast);
}
.fd-tag-input:focus {
  border-color: color-mix(in srgb, var(--kn-brand-500) 55%, transparent);
}
.fd-tag-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-md);
  background: var(--kn-bg);
  color: var(--kn-fg-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--kn-dur-fast), color var(--kn-dur-fast);
}
.fd-tag-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--kn-brand-500) 12%, transparent);
  color: var(--kn-brand-500);
}
.fd-tag-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
/* 选择已有标签按钮：展开态高亮 */
.fd-tag-btn.is-on {
  border-color: color-mix(in srgb, var(--kn-brand-500) 35%, transparent);
  background: color-mix(in srgb, var(--kn-brand-500) 12%, transparent);
  color: var(--kn-brand-500);
}

/* 选择已有标签：下拉弹层 */
.fd-tag-picker {
  position: relative;
  flex-shrink: 0;
}
.fd-tagpop {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 170px;
  max-height: 220px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid var(--kn-border-strong);
  border-radius: var(--kn-radius-lg);
  background: var(--kn-bg-elev);
  box-shadow: var(--kn-shadow-lg);
  animation: fd-pop-in var(--kn-dur-base) var(--kn-ease-out);
}
@keyframes fd-pop-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fd-tagpop-title {
  padding: 2px 8px 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--kn-fg-subtle);
}
.fd-tagpop-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border: 0;
  border-radius: var(--kn-radius-sm);
  background: transparent;
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-xs);
  text-align: left;
  cursor: pointer;
  transition: background var(--kn-dur-fast);
}
.fd-tagpop-item:hover {
  background: var(--kn-hover);
}
.fd-tagpop-icon {
  color: var(--kn-brand-500);
  flex-shrink: 0;
}
.fd-tagpop-empty {
  padding: 6px 8px;
  font-size: var(--kn-text-xs);
  color: var(--kn-fg-subtle);
}

/* AI 一键批注（注释框底部） */
.fd-ai-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  height: 28px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--kn-brand-500) 35%, transparent);
  border-radius: var(--kn-radius-md);
  background: color-mix(in srgb, var(--kn-brand-500) 10%, transparent);
  color: var(--kn-brand-500);
  font: inherit;
  font-size: var(--kn-text-xs);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--kn-dur-fast), opacity var(--kn-dur-fast);
}
.fd-ai-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--kn-brand-500) 18%, transparent);
}
.fd-ai-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

/* 注释 */
.fd-note {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-md);
  background: var(--kn-bg);
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-xs);
  line-height: 1.6;
  resize: vertical;
  outline: 0;
  box-sizing: border-box;
  transition: border-color var(--kn-dur-fast);
}
.fd-note:focus {
  border-color: color-mix(in srgb, var(--kn-brand-500) 55%, transparent);
}

.fd-hint {
  margin: 0;
  font-size: 10px;
  line-height: 1.5;
  color: var(--kn-fg-subtle);
}
</style>
