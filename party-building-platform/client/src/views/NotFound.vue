<template>
  <div class="not-found">
    <div class="content">
      <h1 class="code">404</h1>
      <p class="message">页面不存在</p>
      <p class="description">您访问的页面可能已被删除或不存在</p>
      <router-link to="/" class="btn btn-primary">返回首页</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
}

.content {
  text-align: center;
  padding: 40px;
}

.code {
  font-size: 120px;
  font-weight: 700;
  color: var(--primary-color);
  line-height: 1;
  margin-bottom: 20px;
}

.message {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.description {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 30px;
}
</style>
