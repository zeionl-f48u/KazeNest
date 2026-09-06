<!--
  TitlebarChrome：顶栏左右两侧的可交互内容（模块化）
  - part="leading"  → 工作区选择器 + 文字菜单 + 「⋯」溢出菜单（VS Code 风格）
  - part="trailing" → Ask AI + 通知 + 账户
  - 图标统一走 Icon（自包含 SVG），样式走 --tb-* / --kn-* tokens
  - 溢出机制（参考 VS Code menubar.ts）：窗口变窄时，放不下的菜单项
    收进「⋯」下拉菜单（仍然可点），而不是简单隐藏
-->
<template>
  <!-- ============ 左侧：工作区 + 菜单 + ⋯ ============ -->
  <div v-if="part === 'leading'" ref="leadingRef" class="tbc-leading">
    <button
      ref="wsRef"
      type="button"
      class="tb-workspace"
      :class="{ 'is-icon-only': workspaceIconOnly }"
      :aria-label="'切换工作区'"
      @click="$emit('workspace')"
    >
      <Icon name="folder-open" :size="15" class="tb-ws-icon" />
      <span class="tb-ws-name">{{ workspaceName }}</span>
      <Icon name="chevron-down" :size="9" class="tb-ws-caret" />
    </button>

    <span class="tb-sep" aria-hidden="true" />

    <button
      v-for="(m, i) in menus"
      :key="m"
      :ref="(el) => setMenuEl(i, el)"
      type="button"
      class="tb-menu"
      :class="{ 'is-overflowed': hiddenMenus.includes(m) }"
      @click="$emit('menu', m)"
    >
      {{ m }}
    </button>

    <!-- ⋯ 溢出按钮（有溢出时显示，放不下的菜单收进这里） -->
    <button
      ref="moreRef"
      type="button"
      class="tb-more"
      :class="{ 'is-visible': showMore }"
      :aria-label="'更多菜单'"
      @click="openMore"
    >
      <Icon name="ellipsis-h" :size="15" />
    </button>

    <!-- 溢出菜单（Teleport 到 body，避免被 overflow:hidden 裁剪） -->
    <Teleport to="body">
      <div v-if="moreOpen" class="tb-more-overlay" @click="moreOpen = false">
        <div class="tb-more-menu" :style="moreStyle" role="menu" @click.stop>
          <div class="tb-more-head">更多</div>
          <button
            v-for="item in overflowItems"
            :key="item.id"
            type="button"
            class="tb-more-item"
            role="menuitem"
            @click="onOverflowClick(item)"
          >
            <Icon :name="item.icon" :size="13" class="tb-more-item-icon" />
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>

  <!-- ============ 右侧：Ask AI + 通知 + 账户 ============ -->
  <template v-else>
    <button
      type="button"
      class="tb-ai"
      :aria-label="'Ask AI'"
      @click="$emit('askAi')"
    >
      <Icon name="sparkles" :size="15" class="tb-ai-icon" />
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
        <Icon name="bell" :size="15" />
        <span v-if="notifyCount > 0" class="tb-util-badge">{{ notifyCount }}</span>
      </button>
      <button
        type="button"
        class="tb-util-btn"
        aria-label="账户"
        @click="$emit('account')"
      >
        <Icon name="user" :size="15" />
      </button>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Icon } from '../common'

const props = withDefaults(
  defineProps<{
    /** 渲染哪一侧 */
    part: 'leading' | 'trailing'
    /** leading：工作区名称（App.vue 的 workspaceName） */
    workspaceName?: string
    /** leading：文字菜单（来自 data/activityItems.ts 的 topMenus：
     *   在这数组里增删菜单文字即可，放不下的会自动收进 ⋯） */
    menus?: readonly string[]
    /** trailing：通知徽标数（App.vue 的 notifyCount） */
    notifyCount?: number
  }>(),
  {
    workspaceName: '我的工作区',
    menus: () => [],
    notifyCount: 0,
  }
)

const emit = defineEmits<{
  workspace: []
  menu: [string]
  askAi: []
  notify: []
  account: []
}>()

/* ============ 溢出布局（参考 VS Code menubar 的 updateOverflowAction） ============ */

/* 调节：窗口变窄时如何让位
 * - 顺序：工作区先图标化 → 菜单再收进 ⋯ → 极窄时 Ask AI 隐藏文字
 * - WORKSPACE_ICON_W: 工作区图标化后的宽度（px），改了 .tb-workspace.is-icon-only 的 padding 要同步
 * - MORE_BTN_W: ⋯ 按钮固定宽度（px），与 CSS .tb-more { width: 28px } 保持一致 */
/** 工作区图标化时的宽度（px） */
const WORKSPACE_ICON_W = 33
/** ⋯ 按钮固定宽度（px，与 CSS .tb-more { width: 28px } 保持一致） */
const MORE_BTN_W = 28

const leadingRef = ref<HTMLElement>()
const wsRef = ref<HTMLElement>()
const moreRef = ref<HTMLElement>()

/** 菜单元素集合（按 index 对应 props.menus） */
const menuEls: (HTMLElement | null)[] = []
function setMenuEl(i: number, el: unknown) {
  if (el) menuEls[i] = el as HTMLElement
}

/* —— 缓存的自然宽度（菜单文字固定，只需测量一次） —— */
const wsWidth = ref(0)
const menuWidths = ref<number[]>([])

/** 当前收进 ⋯ 的菜单 */
const hiddenMenus = ref<string[]>([])
const showMore = ref(false)
const workspaceIconOnly = ref(false)

let ro: ResizeObserver | undefined

function measureNatural() {
  // 有元素处于折叠态时保持已有缓存（折叠元素 offsetWidth 为 0，会污染测量）
  if (hiddenMenus.value.length > 0 || workspaceIconOnly.value) return
  wsWidth.value = wsRef.value?.offsetWidth ?? 0
  menuWidths.value = props.menus.map((_, i) => menuEls[i]?.offsetWidth ?? 0)
}

function layout() {
  const container = leadingRef.value
  if (!container) return
  const available = container.clientWidth
  const menus = props.menus

  // 1) 工作区：优先完整显示，空间不足则图标化（仍可点击，非隐藏）
  let used = 0
  if (wsWidth.value > 0 && used + wsWidth.value <= available) {
    used += wsWidth.value
    workspaceIconOnly.value = false
  } else {
    used += WORKSPACE_ICON_W
    workspaceIconOnly.value = true
  }

  const menuTotal = menuWidths.value.reduce((a, b) => a + (b || 0), 0)

  // 2) 全部菜单放得下 → 不需要 ⋯
  if (used + menuTotal <= available) {
    hiddenMenus.value = []
    showMore.value = false
    return
  }

  // 3) 放不下 → 从右往左把菜单收进 ⋯，直到「可见菜单 + ⋯」放得下
  let acc = 0
  let visibleCount = 0
  const rest = available - used
  for (let i = 0; i < menus.length; i++) {
    const w = menuWidths.value[i] ?? 0
    if (acc + w + MORE_BTN_W <= rest) {
      acc += w
      visibleCount++
    } else {
      break
    }
  }
  hiddenMenus.value = menus.slice(visibleCount)
  showMore.value = true
}

/* ============ ⋯ 溢出菜单 ============ */

const moreOpen = ref(false)
const moreStyle = ref<Record<string, string>>({})

const overflowItems = computed(() =>
  hiddenMenus.value.map((m) => ({ id: `menu:${m}`, label: m, icon: 'menu', type: 'menu' as const }))
)

// ⋯ 按钮消失（窗口变宽，菜单重新放得下）时关闭下拉，避免残留遮罩
watch(showMore, (v) => {
  if (!v) moreOpen.value = false
})

function openMore() {
  moreOpen.value = !moreOpen.value
  if (moreOpen.value) {
    nextTick(() => {
      const btn = moreRef.value
      if (!btn) return
      const r = btn.getBoundingClientRect()
      const width = 190
      moreStyle.value = {
        top: `${r.bottom + 6}px`,
        left: `${Math.max(8, Math.min(r.left, window.innerWidth - width - 8))}px`,
        minWidth: `${width}px`,
      }
    })
  }
}

function onOverflowClick(item: { type: 'menu'; label: string }) {
  moreOpen.value = false
  if (item.type === 'menu') emit('menu', item.label)
}

/* ============ 生命周期 ============ */

onMounted(async () => {
  await nextTick()
  measureNatural()
  layout()
  // 字体加载完成后重测，避免字体未就绪导致测量偏差
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
  if (fonts?.ready) {
    fonts.ready.then(() => {
      measureNatural()
      layout()
    })
  }
  if (leadingRef.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(layout)
    ro.observe(leadingRef.value)
  }
  window.addEventListener('resize', layout)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('resize', layout)
})
</script>

<style scoped>
/* —— 通用按钮基础：无默认样式、可交互、不收缩（溢出交给 ⋯） —— */
.tb-workspace,
.tb-menu,
.tb-ai,
.tb-util-btn,
.tb-more {
  pointer-events: auto;
  user-select: none;
  font: inherit;
  cursor: pointer;
  color: inherit;
  background: transparent;
  border: 0;
  padding: 0;
  flex-shrink: 0;
}

/* —— 左侧容器（参与宽度测量） ——
 * flex:1 填满 slot：容器宽度始终等于 slot 的 flex 分配宽度，
 * 这样 ResizeObserver 才能感知窗口缩放；内容（隐藏菜单）不会改变容器宽度，
 * 不会触发「坍缩反馈循环」。
 */
.tbc-leading {
  display: flex;
  align-items: center;
  gap: var(--tb-toolbar-gap);
  min-width: 0;
  flex: 1 1 auto;
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
/* 空间不足：只留图标（仍可点击） */
.tb-workspace.is-icon-only { padding: 0 9px; }
.tb-workspace.is-icon-only .tb-ws-name,
.tb-workspace.is-icon-only .tb-ws-caret { display: none; }

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
/* 收进 ⋯ 的菜单：不占布局（仍可通过 ⋯ 菜单访问） */
.tb-menu.is-overflowed { display: none; }

/* —— ⋯ 溢出按钮 —— */
.tb-more {
  width: 28px;
  height: 26px;
  display: none;
  align-items: center;
  justify-content: center;
  border-radius: var(--tb-btn-radius);
  color: var(--tb-fg);
  transition: background var(--tb-transition-fast);
}
.tb-more:hover  { background: var(--tb-hover); }
.tb-more:active { background: var(--tb-active); }
.tb-more.is-visible { display: inline-flex; }

/* —— Ask AI（渐变胶囊，突出主操作） —— */
.tb-ai {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 12px;
  border-radius: var(--tb-btn-radius);
  font-size: var(--kn-text-sm);
  font-weight: 600;
  letter-spacing: 0.1px;
  color: #fff;
  background: linear-gradient(135deg, var(--kn-brand-500), var(--kn-magenta-500));
  border: 1px solid transparent;
  box-shadow: 0 1px 3px color-mix(in srgb, var(--kn-brand-500) 35%, transparent);
  transition:
    filter var(--tb-transition-fast),
    box-shadow var(--tb-transition-fast),
    transform var(--tb-transition-fast);
}
.tb-ai:hover {
  filter: brightness(1.08);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--kn-brand-500) 45%, transparent);
  transform: translateY(-1px);
}
.tb-ai:active {
  filter: brightness(0.95);
  transform: translateY(0);
}
.tb-ai-icon { color: #fff; }
.tb-ai-text { line-height: 1; }
/* 快捷键小标签：主题色 kbd 样式（只保留一份，旧样式已被删除） */
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

/* ============ 溢出下拉菜单 ============ */
.tb-more-overlay {
  position: fixed;
  inset: 0;
  z-index: 2900;
}
.tb-more-menu {
  position: fixed;
  z-index: 3000;
  padding: 6px;
  background: var(--tb-panel-bg);
  border: 1px solid var(--tb-panel-border);
  border-radius: var(--kn-radius-lg);
  box-shadow: var(--tb-panel-shadow);
  display: flex;
  flex-direction: column;
  animation: tb-menu-in var(--kn-dur-fast) var(--kn-ease-out);
}
@keyframes tb-menu-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.tb-more-head {
  padding: 6px 10px 4px;
  font-size: var(--kn-text-2xs);
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--tb-fg-muted);
  text-transform: uppercase;
}
.tb-more-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--kn-radius-sm);
  background: transparent;
  border: 0;
  color: var(--tb-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--tb-transition-fast);
}
.tb-more-item:hover { background: var(--tb-item-hover); }
.tb-more-item-icon { opacity: 0.7; }

/* ============ 响应式：极窄时缩为图标，仍可见可用 ============ */
/* Ask AI 只留图标 */
@media (max-width: 950px) {
  .tb-ai-text,
  .tb-ai-kbd { display: none; }
}
</style>
