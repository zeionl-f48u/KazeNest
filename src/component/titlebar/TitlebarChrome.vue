<!--
  TitlebarChrome：顶栏左右两侧的可交互内容（模块化）
  - part="leading"  → 工作区选择器 + 文字菜单
  - part="trailing" → Ask AI + 通知 + 账户
  - 图标统一走 Icon（自包含 SVG），样式走 --tb-* / --kn-* tokens
  - 想改按钮文案 / 增加按钮：只改这里 + data/ 配置即可
-->
<template>
  <!-- ============ 左侧：工作区 + 菜单 ============ -->
  <template v-if="part === 'leading'">
    <button
      type="button"
      class="tb-workspace"
      :aria-label="'切换工作区'"
      @click="$emit('workspace')"
    >
      <Icon name="folder-open" :size="13" class="tb-ws-icon" />
      <span class="tb-ws-name">{{ workspaceName }}</span>
      <Icon name="chevron-down" :size="8" class="tb-ws-caret" />
    </button>

    <span class="tb-sep" aria-hidden="true" />

    <button
      v-for="m in menus"
      :key="m"
      type="button"
      class="tb-menu"
      @click="$emit('menu', m)"
    >
      {{ m }}
    </button>
  </template>

  <!-- ============ 右侧：Ask AI + 通知 + 账户 ============ -->
  <template v-else>
    <button
      type="button"
      class="tb-ai"
      :aria-label="'Ask AI'"
      @click="$emit('askAi')"
    >
      <Icon name="sparkles" :size="13" class="tb-ai-icon" />
      <span class="tb-ai-text">Ask AI</span>
      <kbd class="tb-ai-kbd">⌘ I</kbd>
    </button>

    <span class="tb-sep" aria-hidden="true" />

    <div class="tb-util">
      <button
        type="button"
        class="tb-util-btn"
        aria-label="通知"
        @click="$emit('notify')"
      >
        <Icon name="bell" :size="14" />
        <span v-if="notifyCount > 0" class="tb-util-badge">{{ notifyCount }}</span>
      </button>
      <button
        type="button"
        class="tb-util-btn"
        aria-label="账户"
        @click="$emit('account')"
      >
        <Icon name="user" :size="14" />
      </button>
    </div>
  </template>
</template>

<script setup lang="ts">
import { Icon } from '../common'

withDefaults(
  defineProps<{
    /** 渲染哪一侧 */
    part: 'leading' | 'trailing'
    /** leading：工作区名称 */
    workspaceName?: string
    /** leading：文字菜单 */
    menus?: readonly string[]
    /** trailing：通知徽标数 */
    notifyCount?: number
  }>(),
  {
    workspaceName: '我的工作区',
    menus: () => [],
    notifyCount: 0,
  }
)

defineEmits<{
  workspace: []
  menu: [string]
  askAi: []
  notify: []
  account: []
}>()
</script>

<style scoped>
/* —— 通用按钮基础：无默认样式、可交互 —— */
.tb-workspace,
.tb-menu,
.tb-ai,
.tb-util-btn {
  pointer-events: auto;
  user-select: none;
  font: inherit;
  cursor: pointer;
  color: inherit;
  background: transparent;
  border: 0;
  padding: 0;
}

/* —— 工作区选择器（macOS 胶囊） —— */
.tb-workspace {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border-radius: var(--tb-btn-radius);
  font-size: var(--kn-text-sm);
  font-weight: 500;
  letter-spacing: 0.1px;
  transition: background var(--tb-transition-fast);
}
.tb-workspace:hover  { background: var(--tb-hover); }
.tb-workspace:active { background: var(--tb-active); }
.tb-ws-icon  { opacity: 0.75; }
.tb-ws-name  { white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; }
.tb-ws-caret { opacity: 0.5; margin-left: 2px; }

/* —— 垂直分隔线 —— */
.tb-sep {
  display: inline-block;
  width: 1px;
  height: 16px;
  background: var(--tb-divider);
  margin: 0 4px;
  flex-shrink: 0;
  pointer-events: none;
  -webkit-user-select: none;
  user-select: none;
}

/* —— 文字菜单（macOS 胶囊 hover） —— */
.tb-menu {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 8px;
  border-radius: var(--tb-btn-radius);
  font-size: var(--kn-text-sm);
  letter-spacing: 0.1px;
  color: var(--tb-fg);
  transition: background var(--tb-transition-fast);
}
.tb-menu:hover  { background: var(--tb-hover); }
.tb-menu:active { background: var(--tb-active); }

/* —— Ask AI（柔和胶囊） —— */
.tb-ai {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border-radius: var(--tb-btn-radius);
  font-size: var(--kn-text-sm);
  font-weight: 500;
  letter-spacing: 0.1px;
  color: var(--tb-fg);
  background: var(--tb-search-bg);
  border: 1px solid var(--tb-search-border);
  transition:
    background var(--tb-transition-fast),
    border-color var(--tb-transition-fast);
}
.tb-ai:hover  { background: var(--tb-search-bg-hover); border-color: var(--tb-search-border-focus); }
.tb-ai:active { background: var(--tb-active); }
.tb-ai-icon { color: var(--kn-magenta-500); }
.tb-ai-text { line-height: 1; }

.tb-ai-kbd {
  font-family: inherit;
  font-size: var(--kn-text-2xs);
  padding: 1px 5px;
  margin-left: 2px;
  border: 1px solid var(--tb-kbd-border);
  border-radius: var(--kn-radius-xs);
  background: var(--tb-kbd-bg);
  color: var(--tb-kbd-fg);
}

/* —— 工具按钮（通知 / 账户） —— */
.tb-util {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.tb-util-btn {
  position: relative;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--tb-btn-radius);
  color: var(--tb-fg);
  transition: background var(--tb-transition-fast);
}
.tb-util-btn:hover  { background: var(--tb-hover); }
.tb-util-btn:active { background: var(--tb-active); }

.tb-util-badge {
  position: absolute;
  top: 1px;
  right: 1px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
  color: #fff;
  background: var(--kn-rose-500);
  border: 1.5px solid var(--kn-bg-elev);
  border-radius: var(--kn-radius-pill);
  box-sizing: border-box;
}

/* ============ 响应式：窗口缩小时逐级隐藏次要元素 ============ */
/* 较窄：隐藏文字菜单（文件/编辑/视图/窗口/帮助） */
@media (max-width: 1150px) {
  .tb-menu { display: none; }
}
/* 更窄：工作区只留图标，Ask AI 只留图标 */
@media (max-width: 950px) {
  .tb-ws-name,
  .tb-ws-caret { display: none; }
  .tb-ai-text,
  .tb-ai-kbd { display: none; }
}
</style>
