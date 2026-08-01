<template>
  <div class="page">
    <h1>📁 文件管理</h1>
    <p>这里是云盘文件列表。</p>
  </div>
</template>

<script setup lang="ts">
// 文件管理的逻辑以后写在这里
</script>

<style scoped>
.page {
  animation: fadeIn 0.25s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>