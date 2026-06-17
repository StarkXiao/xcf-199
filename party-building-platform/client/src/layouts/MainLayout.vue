<template>
  <div class="main-layout">
    <header class="header">
      <div class="container header-inner">
        <div class="logo" @click="goHome">
          <span class="logo-icon">☭</span>
          <span class="logo-text">党建平台</span>
        </div>
        <nav class="nav">
          <router-link to="/" class="nav-link" :class="{ active: $route.name === 'home' }">首页</router-link>
          <router-link to="/learning-map" class="nav-link" :class="{ active: $route.name === 'learning-map' }">学习地图</router-link>
          <router-link to="/articles" class="nav-link" :class="{ active: $route.name === 'articles' || $route.name === 'article-detail' }">学习专栏</router-link>
          <router-link to="/activities" class="nav-link" :class="{ active: $route.name === 'activities' || $route.name === 'activity-detail' }">活动报名</router-link>
          <router-link to="/points" class="nav-link" :class="{ active: $route.name === 'points' }">积分排行</router-link>
          <router-link to="/volunteer-service" class="nav-link" :class="{ active: $route.name === 'volunteer-service' || $route.name === 'volunteer-service-detail' }">志愿服务</router-link>
          <router-link to="/notices" class="nav-link" :class="{ active: $route.name === 'notices' || $route.name === 'notice-detail' }">支部通知</router-link>
          <router-link to="/branch-meetings" class="nav-link" :class="{ active: $route.name === 'branch-meetings' || $route.name === 'branch-meeting-detail' }">支部会议</router-link>
          <router-link to="/democratic-review" class="nav-link" :class="{ active: $route.name === 'democratic-review' || $route.name === 'democratic-review-detail' }">民主评议</router-link>
          <router-link v-if="userStore.isLoggedIn" to="/party-development" class="nav-link" :class="{ active: $route.name === 'party-development' }">党员发展</router-link>
          <router-link v-if="userStore.isLoggedIn" to="/party-transfer" class="nav-link" :class="{ active: $route.name === 'party-transfer' }">组织转接</router-link>
        </nav>
        <div class="header-right">
          <template v-if="userStore.isLoggedIn">
            <div class="user-menu" @click="toggleUserMenu" ref="userMenuRef">
              <img :src="userStore.user?.avatar" class="avatar" alt="avatar">
              <span class="username">{{ userStore.user?.real_name }}</span>
              <span class="arrow">▼</span>
              <div class="dropdown" v-if="showUserMenu" @click.stop>
                <router-link to="/profile" class="dropdown-item">
                  <span>👤</span> 个人中心
                </router-link>
                <router-link to="/my-volunteer" class="dropdown-item">
                  <span>🤝</span> 我的志愿服务
                </router-link>
                <router-link v-if="userStore.isAdmin" to="/admin" class="dropdown-item">
                  <span>⚙️</span> 管理后台
                </router-link>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item" @click="handleLogout">
                  <span>🚪</span> 退出登录
                </div>
              </div>
            </div>
          </template>
          <template v-else>
            <router-link to="/login" class="btn btn-outline btn-sm">登录</router-link>
            <router-link to="/register" class="btn btn-primary btn-sm" style="margin-left: 10px;">注册</router-link>
          </template>
        </div>
      </div>
    </header>
    <main class="main-content">
      <router-view />
    </main>
    <footer class="footer">
      <div class="container">
        <p>© 2024 党建平台 - 学习与活动管理系统</p>
        <p class="footer-sub">不忘初心，牢记使命</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const showUserMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

const goHome = () => {
  router.push('/')
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const handleClickOutside = (e: MouseEvent) => {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    showUserMenu.value = false
  }
}

const handleLogout = async () => {
  await userStore.logout()
  router.push('/login')
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  box-shadow: var(--shadow-md);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  display: flex;
  align-items: center;
  height: 64px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.logo-icon {
  font-size: 28px;
  color: var(--secondary-color);
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
}

.nav {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.85);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 15px;
  transition: all 0.2s;
}

.nav-link:hover {
  color: white;
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-link.active {
  color: white;
  background-color: rgba(255, 255, 255, 0.15);
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background-color 0.2s;
}

.user-menu:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: white;
}

.username {
  font-size: 14px;
}

.arrow {
  font-size: 10px;
  opacity: 0.8;
}

.dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 160px;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: var(--bg-light);
}

.dropdown-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 4px 0;
}

.main-content {
  flex: 1;
  padding: 24px 0;
}

.footer {
  background-color: var(--text-primary);
  color: rgba(255, 255, 255, 0.7);
  padding: 24px 0;
  text-align: center;
  margin-top: auto;
}

.footer p {
  font-size: 13px;
}

.footer-sub {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.6;
}
</style>
