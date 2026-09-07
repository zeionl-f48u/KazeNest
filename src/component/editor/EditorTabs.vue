<!--
  EditorTabs：编辑器标签页栏
  - 展示打开的文件；点击切换，× / 中键关闭，修改点（·）提示未保存
  - ⋯ 菜单：关闭其他 / 关闭全部 / 关闭已保存
  - 纯受控组件：files / modelValue / close 及批操作事件
-->
<template>
  <div class="ed-tabs" role="tablist">
    <button
      v-for="f in files"
      :key="f.id"
      type="button"
      class="ed-tab"
      :class="{ 'is-active': f.id === modelValue }"
      role="tab"
      :aria-selected="f.id === modelValue"
      @click="$emit('update:modelValue', f.id)"
      @mousedown.middle.prevent="$emit('close', f.id)"
    >
      <Icon
        :name="f.icon"
        :size="13"
        class="ed-tab-icon"
        :style="f.color ? { color: f.color } : undefined"
      />
      <span class="ed-tab-name">{{ f.name }}</span>
      <!-- 未保存：显示修改点；悬停换成 × -->
      <span v-if="f.modified" class="ed-tab-dot" title="有未保存的修改" />
      <button
        type="button"
        class="ed-tab-close"
        :aria-label="`关闭 ${f.name}`"
        @click.stop="$emit('close', f.id)"
      >
        <Icon name="times" :size="10" />
      </button>
    </button>

    <!-- ⋯ 批量关闭菜单 -->
    <div class="ed-tabs-more" ref="moreRef" title="更多标签" @click.stop="toggleMore">
      <Icon name="ellipsis-h" :size="13" />
    </div>

    <Teleport to="body">
      <div v-if="moreOpen" class="ed-more-overlay" @click="moreOpen = false">
        <div class="ed-more-menu" :style="moreStyle" role="menu">
          <button
            class="ed-more-item"
            role="menuitem"
            :disabled="files.length === 0"
            @click="onItem('closeOthers')"
          >关闭其他</button>
          <button
            class="ed-more-item"
            role="menuitem"
            :disabled="files.length === 0"
            @click="onItem('closeAll')"
          >关闭全部</button>
          <button
            class="ed-more-item"
            role="menuitem"
            @click="onItem('closeSaved')"
          >关闭已保存</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { Icon } from '../common'
import type { EditorFile } from '../../data/editorFiles'

defineProps<{
  files: EditorFile[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [string]
  close: [string]
  closeOthers: []
  closeAll: []
  closeSaved: []
}>()

const moreOpen = ref(false)
const moreRef = ref<HTMLElement>()
const moreStyle = ref<Record<string, string>>({})

function toggleMore() {
  moreOpen.value = !moreOpen.value
  if (moreOpen.value) {
    nextTick(() => {
      const btn = moreRef.value
      if (!btn) return
      const r = btn.getBoundingClientRect()
      const width = 150
      moreStyle.value = {
        top: `${r.bottom + 6}px`,
        right: `${Math.max(8, window.innerWidth - r.right - 8)}px`,
        minWidth: `${width}px`,
      }
    })
  }
}

function onItem(action: 'closeOthers' | 'closeAll' | 'closeSaved') {
  moreOpen.value = false
  // emit 是重载函数，直接传联合类型无法匹配，这里显式分发
  if (action === 'closeOthers') emit('closeOthers')
  else if (action === 'closeAll') emit('closeAll')
  else emit('closeSaved')
}
</script>

<style scoped>
.ed-tabs {
  display: flex;
  align-items: stretch;
  gap: 2px;
  height: var(--ed-tab-height);
  background: var(--ed-tabbar-bg);
  border-bottom: 1px solid var(--ed-tabbar-border);
  padding: 4px 8px 0;
  box-sizing: border-box;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  flex-shrink: 0;
  position: relative;
}
.ed-tabs::-webkit-scrollbar { display: none; }

.ed-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: calc(var(--ed-tab-height) - 4px);
  padding: 0 8px 0 10px;
  border: 0;
  border-radius: 0;   /* VS Code：标签直角 */
  background: var(--ed-tab-bg);
  color: var(--ed-tab-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background var(--kn-dur-fast) var(--kn-ease-out), color var(--kn-dur-fast);
}
.ed-tab:hover { background: var(--ed-tab-hover); }
.ed-tab:active { background: var(--kn-active); }

.ed-tab.is-active {
  background: var(--ed-tab-active-bg);
  color: var(--ed-tab-active-fg);
}
/* 活动标签顶部一条品牌色 */
.ed-tab.is-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 10px;
  right: 10px;
  height: 2px;
  border-radius: 2px;
  background: var(--ed-tab-active-border);
}

.ed-tab-icon { flex-shrink: 0; }
.ed-tab-name { max-width: 160px; overflow: hidden; text-overflow: ellipsis; } /* 调节：标签文字最长宽度 */

/* 修改点：悬停时隐藏，露出 × */
.ed-tab-dot {
  display: inline-flex;
  width: 8px;
  height: 8px;
  margin-left: 2px;
  border-radius: 50%;
  background: var(--ed-tab-dot);
  flex-shrink: 0;
}
.ed-tab:hover .ed-tab-dot,
.ed-tab.is-active:hover .ed-tab-dot { display: none; }

.ed-tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 2px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  opacity: 0;
  cursor: pointer;
  transition: opacity var(--kn-dur-fast), background var(--kn-dur-fast);
}
.ed-tab:hover .ed-tab-close,
.ed-tab.is-active .ed-tab-close { opacity: 0.7; }
.ed-tab-close:hover { background: var(--kn-active); opacity: 1 !important; }

.ed-tabs-more {
  display: inline-flex;
  align-items: center;
  padding: 0 6px;
  color: var(--ed-tab-fg);
  opacity: 0.6;
  flex-shrink: 0;
  cursor: pointer;
  transition: opacity var(--kn-dur-fast), background var(--kn-dur-fast);
}
.ed-tabs-more:hover {
  opacity: 1;
  background: var(--kn-hover);
  border-radius: 4px;
}

/* ⋯ 下拉菜单 */
.ed-more-overlay {
  position: fixed;
  inset: 0;
  z-index: 2900;
}
.ed-more-menu {
  position: fixed;
  z-index: 3000;
  padding: 6px;
  background: var(--tb-panel-bg);
  border: 1px solid var(--tb-panel-border);
  border-radius: var(--kn-radius-lg);
  box-shadow: var(--tb-panel-shadow);
  display: flex;
  flex-direction: column;
  animation: ed-more-in var(--kn-dur-fast) var(--kn-ease-out);
}
@keyframes ed-more-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ed-more-item {
  display: flex;
  align-items: center;
  padding: 7px 10px;
  border: 0;
  border-radius: var(--kn-radius-sm);
  background: transparent;
  color: var(--ed-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--kn-dur-fast);
}
.ed-more-item:hover:not(:disabled) { background: var(--kn-hover); }
.ed-more-item:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>