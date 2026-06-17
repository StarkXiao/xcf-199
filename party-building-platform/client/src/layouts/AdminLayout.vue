<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="logo-icon">☭</span>
        <span class="logo-text">管理后台</span>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/admin" class="nav-item" :class="{ active: $route.name === 'admin-dashboard' }">
          <span class="nav-icon">📊</span>
          <span class="nav-text">仪表盘</span>
        </router-link>
        <router-link to="/admin/articles" class="nav-item" :class="{ active: $route.name === 'admin-articles' }">
          <span class="nav-icon">📚</span>
          <span class="nav-text">文章管理</span>
        </router-link>
        <router-link to="/admin/activities" class="nav-item" :class="{ active: $route.name === 'admin-activities' }">
          <span class="nav-icon">🎯</span>
          <span class="nav-text">活动管理</span>
        </router-link>
        <router-link to="/admin/notices" class="nav-item" :class="{ active: $route.name === 'admin-notices' }">
          <span class="nav-icon">📢</span>
          <span class="nav-text">通知管理</span>
        </router-link>
        <router-link to="/admin/users" class="nav-item" :class="{ active: $route.name === 'admin-users' }">
          <span class="nav-icon">👥</span>
          <span class="nav-text">用户管理</span>
        </router-link>
        <router-link to="/admin/party-development" class="nav-item" :class="{ active: $route.name === 'admin-party-development' }">
          <span class="nav-icon">🎖️</span>
          <span class="nav-text">党员发展</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <router-link to="/" class="back-link">← 返回前台</router-link>
      </div>
    </aside>

    <div class="main-area">
      <header class="admin-header">
        <div class="header-title">{{ $route.meta.title || '管理后台' }}</div>
        <div class="header-user">
          <img :src="userStore.user?.avatar" class="avatar" alt="avatar">
          <span class="username">{{ userStore.user?.real_name }}</span>
          <button class="logout-btn" @click="handleLogout">退出</button>
        </div>
      </header>
      <main class="admin-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const handleLogout = async () => {
  await userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-secondary);
}

.sidebar {
  width: 220px;
  background: linear-gradient(180deg, var(--primary-color), var(--primary-dark));
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
}

.sidebar-header {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-icon {
  font-size: 24px;
  color: var(--secondary-color);
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.2s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  font-weight: 500;
  border-left: 3px solid var(--secondary-color);
}

.nav-icon {
  font-size: 18px;
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.back-link {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.back-link:hover {
  color: white;
}

.main-area {
  flex: 1;
  margin-left: 220px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.admin-header {
  background: white;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.username {
  font-size: 14px;
  color: var(--text-primary);
}

.logout-btn {
  padding: 4px 12px;
  background: var(--bg-light);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: var(--primary-color);
  color: white;
}

.admin-content {
  flex: 1;
  padding: 24px;
}

@media (max-width: 768px) {
  .sidebar {
    width: 60px;
  }

  .logo-text,
  .nav-text {
    display: none;
  }

  .sidebar-header {
    justify-content: center;
    padding: 16px;
  }

  .nav-item {
    justify-content: center;
    padding: 12px;
  }

  .main-area {
    margin-left: 60px;
  }

  .header-title {
    font-size: 16px;
  }
}
</style>
