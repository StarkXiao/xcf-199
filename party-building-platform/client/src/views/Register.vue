<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-header">
        <div class="logo">
          <span class="logo-icon">☭</span>
        </div>
        <h1 class="title">注册账号</h1>
        <p class="subtitle">创建您的党建平台账号</p>
      </div>

      <form class="register-form" @submit.prevent="handleRegister">
        <div class="form-group">
          <label class="form-label">用户名 *</label>
          <input
            v-model="form.username"
            type="text"
            class="form-input"
            placeholder="请输入用户名"
            required
          >
        </div>

        <div class="form-group">
          <label class="form-label">密码 *</label>
          <input
            v-model="form.password"
            type="password"
            class="form-input"
            placeholder="请输入密码"
            required
          >
        </div>

        <div class="form-group">
          <label class="form-label">真实姓名 *</label>
          <input
            v-model="form.real_name"
            type="text"
            class="form-input"
            placeholder="请输入真实姓名"
            required
          >
        </div>

        <div class="form-group">
          <label class="form-label">手机号</label>
          <input
            v-model="form.phone"
            type="tel"
            class="form-input"
            placeholder="请输入手机号"
          >
        </div>

        <div class="form-group">
          <label class="form-label">所属支部</label>
          <input
            v-model="form.branch"
            type="text"
            class="form-input"
            placeholder="请输入所属支部"
          >
        </div>

        <button type="submit" class="btn btn-primary btn-lg btn-block" :disabled="loading">
          {{ loading ? '注册中...' : '注 册' }}
        </button>
      </form>

      <div class="register-footer">
        <p>已有账号？<router-link to="/login">立即登录</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const form = reactive({
  username: '',
  password: '',
  real_name: '',
  phone: '',
  branch: ''
})

const loading = ref(false)

const handleRegister = async () => {
  loading.value = true
  try {
    const res = await userStore.register(form)
    if (res.code === 200) {
      router.push('/')
    }
  } catch (error: any) {
    alert(error.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  padding: 20px;
}

.register-container {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: var(--radius-lg);
  padding: 36px 32px;
  box-shadow: var(--shadow-lg);
}

.register-header {
  text-align: center;
  margin-bottom: 28px;
}

.logo {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.logo-icon {
  font-size: 28px;
  color: var(--secondary-color);
}

.title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

.register-form {
  margin-bottom: 20px;
}

.btn-block {
  width: 100%;
  margin-top: 20px;
}

.register-footer {
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
