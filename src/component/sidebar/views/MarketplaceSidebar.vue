<!--
  MarketplaceSidebar：插件市场侧栏（占位骨架，内容后续填充）
  - 现在：搜索框 + 已安装 / 推荐两个分组（空态提示）
  - 接插件源后：搜索走本地过滤，分组换成 已安装 / 热门 / 分类列表
-->
<template>
  <div class="mp">
    <!-- 搜索（占位：接插件源后启用本地过滤） -->
    <div class="mp-search">
      <Icon name="search" :size="13" class="mp-search-icon" />
      <input
        v-model="keyword"
        class="mp-search-input"
        placeholder="搜索插件"
        spellcheck="false"
      />
    </div>

    <SidebarSection title="已安装">
      <div class="mp-empty">还没有安装插件</div>
    </SidebarSection>

    <SidebarSection title="推荐" icon="sparkles">
      <div class="mp-empty">插件市场内容建设中</div>
    </SidebarSection>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '../../common'
import SidebarSection from './SidebarSection.vue'

/** 搜索关键字（接插件源后用于本地过滤） */
const keyword = ref('')
</script>

<style scoped>
.mp {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 8px;
}

/* 搜索框：侧栏密度的小尺寸输入 */
.mp-search {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  margin: 8px 8px 4px;
  padding: 0 8px;
  border: 1px solid var(--sb-border);
  border-radius: var(--kn-radius-md);
  background: var(--sb-bg-elev, var(--kn-bg-elev));
  transition: border-color var(--kn-dur-fast);
}
.mp-search:focus-within {
  border-color: color-mix(in srgb, var(--kn-brand-500) 55%, transparent);
}
.mp-search-icon {
  color: var(--sb-fg-muted);
  flex-shrink: 0;
}
.mp-search-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--sb-fg);
  font: inherit;
  font-size: var(--kn-text-sm);
}
.mp-search-input::placeholder {
  color: var(--kn-fg-subtle);
}

/* 空态提示 */
.mp-empty {
  padding: 6px 10px 8px;
  font-size: var(--kn-text-xs);
  color: var(--kn-fg-subtle);
}
</style>
