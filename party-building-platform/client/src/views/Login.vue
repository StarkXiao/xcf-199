<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <div class="logo">
          <span class="logo-icon">☭</span>
        </div>
        <h1 class="title">党建平台</h1>
        <p class="subtitle">欢迎回来，请登录您的账号</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input
            v-model="form.username"
            type="text"
            class="form-input"
            placeholder="请输入用户名"
            required
          >
        </div>

        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="form.password"
            type="password"
            class="form-input"
            placeholder="请输入密码"
            required
          >
        </div>

        <button type="submit" class="btn btn-primary btn-lg btn-block" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>

      <div class="login-footer">
        <p>还没有账号？<router-link to="/register">立即注册</router-link></p>
      </div>

      <div class="demo-accounts">
        <p class="demo-title">演示账号</p>
        <p>管理员：admin / admin123</p>
        <p>普通用户：zhangsan / user123</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const form = reactive({
  username: '',
  password: ''
})

const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  try {
    const res = await userStore.login(form.username, form.password)
    if (res.code === 200) {
      const redirect = route.query.redirect as string || '/'
      router.push(redirect)
    }
  } catch (error: any) {
    alert(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: var(--radius-lg);
  padding: 40px 32px;
  box-shadow: var(--shadow-lg);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.logo-icon {
  font-size: 32px;
  color: var(--secondary-color);
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

.login-form {
  margin-bottom: 24px;
}

.btn-block {
  width: 100%;
  margin-top: 24px;
}

.login-footer {
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
}

.demo-accounts {
  margin-top: 24px;
  padding: 16px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-secondary);
}

.demo-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.demo-accounts p {
  margin-bottom: 4px;
}
</style>
