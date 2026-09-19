<!--
  DemoDialog：全局演示弹窗（无真实功能按钮的统一点击反馈）
  - 挂在 App.vue，监听 'kn:demo' 事件（showDemo() 派发）
  - 画面：图标 + 功能名 + 说明 + "演示模式"标签 + 知道了按钮
  - Esc / 点击遮罩 / 按钮均可关闭
-->
<template>
  <Teleport to="body">
    <Transition name="demo">
      <div v-if="current" class="demo-overlay" @click="close">
        <div class="demo-card" role="dialog" :aria-label="current.title" @click.stop>
          <div class="demo-icon" :style="{ '--tint': current.tint ?? 'var(--kn-brand-500)' }">
            <Icon :name="current.icon ?? 'sparkles'" :size="22" />
          </div>
          <h3 class="demo-title">{{ current.title }}</h3>
          <p class="demo-desc">{{ current.desc ?? '演示模式：该功能尚未接入' }}</p>
          <div class="demo-foot">
            <span class="demo-tag">演示模式</span>
            <button ref="okRef" type="button" class="demo-ok" @click="close">知道了</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from './index'
import type { DemoPayload } from '../../utils/demo'

const current = ref<DemoPayload | null>(null)
const okRef = ref<HTMLButtonElement>()

function onDemo(e: Event) {
  current.value = (e as CustomEvent<DemoPayload>).detail
  /* 打开后聚焦确认键（Enter 可关闭） */
  nextTick(() => okRef.value?.focus())
}

function close() {
  current.value = null
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && current.value) close()
}

onMounted(() => {
  window.addEventListener('kn:demo', onDemo)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('kn:demo', onDemo)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.demo-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, #000 32%, transparent);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.demo-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 340px;
  max-width: 100%;
  padding: 26px 24px 18px;
  border: 1px solid var(--kn-border-strong);
  border-radius: var(--kn-radius-xl);
  background: var(--kn-bg-elev);
  box-shadow: var(--kn-shadow-lg);
  text-align: center;
  box-sizing: border-box;
}

.demo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: var(--kn-radius-xl);
  background: color-mix(in srgb, var(--tint) 14%, transparent);
  color: var(--tint);
}

.demo-title {
  margin: 6px 0 0;
  font-size: var(--kn-text-lg);
  font-weight: 700;
  color: var(--kn-fg);
}

.demo-desc {
  margin: 0;
  font-size: var(--kn-text-xs);
  line-height: 1.7;
  color: var(--kn-fg-muted);
}

.demo-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--kn-border);
}

.demo-tag {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--kn-fg-subtle);
  text-transform: uppercase;
}

.demo-ok {
  height: 28px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--kn-radius-md);
  background: linear-gradient(135deg, var(--kn-brand-500), var(--kn-magenta-500));
  color: #fff;
  font: inherit;
  font-size: var(--kn-text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: filter var(--kn-dur-fast);
}
.demo-ok:hover {
  filter: brightness(1.08);
}

/* 进出场动画 */
.demo-enter-active,
.demo-leave-active {
  transition: opacity 0.16s var(--kn-ease-out);
}
.demo-enter-active .demo-card,
.demo-leave-active .demo-card {
  transition: transform 0.16s var(--kn-ease-out);
}
.demo-enter-from,
.demo-leave-to {
  opacity: 0;
}
.demo-enter-from .demo-card,
.demo-leave-to .demo-card {
  transform: scale(0.94) translateY(6px);
}
</style>
