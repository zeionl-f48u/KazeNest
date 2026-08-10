<!--
  Home：首页（欢迎页 / 启动台）
  - 顶部欢迎区（品牌 + 标语 + 主操作）
  - 快速开始：玻璃卡片网格（GlassCard 统一渲染，数据来自 data/homeCards）
  - 最近打开：文件列表
  - 导航通过全局事件 'kn:navigate' 派发（App.vue 监听后切换视图）
-->
<template>
  <div class="home">
    <!-- ============ 欢迎区 ============ -->
    <header class="home-hero">
      <div class="home-logo">
        <Icon name="cloud" :size="34" />
      </div>
      <h1 class="home-title">KazeNest</h1>
      <p class="home-subtitle">Where Clouds Rest · 一个现代的云原生开发工作台</p>

      <div class="home-actions">
        <button type="button" class="home-btn is-primary" @click="go('editor')">
          <Icon name="file-text" :size="14" />
          <span>进入编辑器</span>
        </button>
        <button type="button" class="home-btn" @click="go('files')">
          <Icon name="folder-open" :size="14" />
          <span>打开工作区</span>
        </button>
      </div>
    </header>

    <!-- ============ 快速开始 ============ -->
    <section class="home-section">
      <h2 class="home-section-title">
        <Icon name="sparkles" :size="14" />
        快速开始
      </h2>
      <div class="home-grid">
        <GlassCard
          v-for="card in cards"
          :key="card.id"
          :title="card.title"
          :desc="card.desc"
          :icon="card.icon"
          :color="card.color"
          interactive
          @click="go(card.target)"
        >
          <template #footer>
            <button type="button" class="gc-link" @click.stop="go(card.target)">
              <span>打开</span>
              <Icon name="arrow-right" :size="12" />
            </button>
          </template>
        </GlassCard>
      </div>
    </section>

    <!-- ============ 最近打开 ============ -->
    <section class="home-section">
      <h2 class="home-section-title">
        <Icon name="clock" :size="14" />
        最近打开
      </h2>
      <div class="home-recent">
        <button
          v-for="item in recent"
          :key="item.id"
          type="button"
          class="home-recent-item"
          @click="go('editor')"
        >
          <Icon :name="item.icon" :size="14" class="home-recent-icon" :style="item.color ? { color: item.color } : undefined" />
          <span class="home-recent-name">{{ item.name }}</span>
          <span class="home-recent-time">{{ item.time }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { GlassCard, Icon } from '../component/common'
import { homeCards } from '../data/homeCards'

const cards = homeCards

/** 最近打开（示例数据，后续接 Tauri 历史记录） */
const recent = [
  { id: 'r1', name: 'src/App.vue',        icon: 'file-text', color: 'var(--kn-emerald-500)', time: '2 分钟前' },
  { id: 'r2', name: 'src/data/homeCards.ts', icon: 'file-text', color: 'var(--kn-sky-500)',   time: '1 小时前' },
  { id: 'r3', name: 'README.md',          icon: 'file-text', color: 'var(--kn-fg-muted)',    time: '昨天' },
]

/**
 * 导航：向 App.vue 派发全局导航事件（页面与外壳解耦）
 */
function go(target: string) {
  window.dispatchEvent(new CustomEvent('kn:navigate', { detail: target }))
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--kn-space-8);
  animation: home-fade var(--kn-dur-slow) var(--kn-ease-out);
}
@keyframes home-fade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ============ 欢迎区 ============ */
.home-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--kn-space-3);
  padding: var(--kn-space-10) 0 var(--kn-space-6);
  text-align: center;
}

.home-logo {
  width: 72px;
  height: 72px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--kn-radius-2xl);
  background: linear-gradient(135deg, var(--kn-brand-500), var(--kn-magenta-500));
  color: #fff;
  box-shadow: var(--kn-shadow-lg);
}

.home-title {
  margin: 0;
  font-size: var(--kn-text-3xl);
  font-weight: 700;
  letter-spacing: 0.5px;
}

.home-subtitle {
  margin: 0;
  font-size: var(--kn-text-md);
  color: var(--kn-fg-muted);
}

.home-actions {
  display: inline-flex;
  gap: var(--kn-space-3);
  margin-top: var(--kn-space-2);
}

.home-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 16px;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-pill);
  background: var(--kn-bg-elev);
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  font-weight: 500;
  cursor: pointer;
  transition:
    transform var(--kn-dur-fast) var(--kn-ease-out),
    box-shadow var(--kn-dur-fast),
    background var(--kn-dur-fast);
}
.home-btn:hover { box-shadow: var(--kn-shadow-sm); transform: translateY(-1px); }
.home-btn:active { transform: translateY(0); }

.home-btn.is-primary {
  border-color: transparent;
  background: linear-gradient(135deg, var(--kn-brand-500), var(--kn-accent-500));
  color: #fff;
  box-shadow: var(--kn-shadow-md);
}

/* ============ 分区 ============ */
.home-section {
  display: flex;
  flex-direction: column;
  gap: var(--kn-space-4);
}

.home-section-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--kn-text-lg);
  font-weight: 600;
  color: var(--kn-fg);
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--kn-space-4);
}

.gc-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 0;
  padding: 0;
  font: inherit;
  font-size: var(--kn-text-sm);
  font-weight: 500;
  color: var(--kn-brand-500);
  cursor: pointer;
  transition: gap var(--kn-dur-fast) var(--kn-ease-out);
}
.gc-link:hover { gap: 6px; }

/* ============ 最近打开 ============ */
.home-recent {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--kn-border);
  border-radius: var(--kn-radius-xl);
  background: var(--kn-bg-elev);
  overflow: hidden;
}

.home-recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 0;
  border-bottom: 1px solid var(--kn-border);
  background: transparent;
  color: var(--kn-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
  text-align: left;
  cursor: pointer;
  transition: background var(--kn-dur-fast);
}
.home-recent-item:last-child { border-bottom: 0; }
.home-recent-item:hover { background: var(--kn-hover); }

.home-recent-icon { opacity: 0.85; }
.home-recent-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--kn-font-mono);
  font-size: var(--kn-text-sm);
}
.home-recent-time {
  font-size: var(--kn-text-xs);
  color: var(--kn-fg-subtle);
  flex-shrink: 0;
}
</style>
