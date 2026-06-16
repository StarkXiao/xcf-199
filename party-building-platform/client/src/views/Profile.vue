<template>
  <div class="profile-page container">
    <div class="page-header">
      <h1 class="page-title">👤 个人中心</h1>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="userStore.user" class="profile-content">
      <div class="profile-card card">
        <div class="profile-header">
          <img :src="userStore.user.avatar" class="avatar" alt="avatar">
          <div class="profile-info">
            <h2 class="username">{{ userStore.user.real_name }}</h2>
            <p class="user-branch">{{ userStore.user.branch }}</p>
            <div class="user-role" :class="userStore.user.role">
              {{ userStore.user.role === 'admin' ? '管理员' : '普通党员' }}
            </div>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-item">
            <div class="stat-value">{{ userStore.user.points }}</div>
            <div class="stat-label">当前积分</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ articlesRead }}</div>
            <div class="stat-label">学习文章</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ activitiesJoined }}</div>
            <div class="stat-label">参与活动</div>
          </div>
        </div>
      </div>

      <div class="profile-section card">
        <h3 class="section-title">基本信息</h3>
        <div class="info-row">
          <span class="info-label">用户名</span>
          <span class="info-value">{{ userStore.user.username }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">真实姓名</span>
          <span class="info-value">{{ userStore.user.real_name }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">手机号</span>
          <span class="info-value">{{ userStore.user.phone || '未设置' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">所属支部</span>
          <span class="info-value">{{ userStore.user.branch || '未设置' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">注册时间</span>
          <span class="info-value">{{ formatDate(userStore.user.created_at) }}</span>
        </div>
      </div>

      <div class="profile-section card">
        <h3 class="section-title">积分记录</h3>
        <div v-if="recordsLoading" class="loading" style="padding: 20px;">
          <div class="spinner"></div>
        </div>
        <div v-else-if="pointsRecords.length === 0" class="empty-state" style="padding: 30px;">
          <p>暂无积分记录</p>
        </div>
        <div v-else class="records-list">
          <div v-for="record in pointsRecords" :key="record.id" class="record-item">
            <div class="record-info">
              <span class="record-reason">{{ record.reason }}</span>
              <span class="record-date">{{ formatDateTime(record.created_at) }}</span>
            </div>
            <span class="record-points" :class="record.type">
              {{ record.type === 'earn' ? '+' : '' }}{{ record.points }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="userStore.isAdmin" class="profile-actions">
        <router-link to="/admin" class="btn btn-primary">进入管理后台</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { getMyPointsRecords } from '@/api/points'
import type { PointsRecord } from '@/types'

const userStore = useUserStore()

const loading = ref(false)
const recordsLoading = ref(false)
const articlesRead = ref(0)
const activitiesJoined = ref(0)
const pointsRecords = ref<PointsRecord[]>([])

const loadProfile = async () => {
  loading.value = true
  try {
    await userStore.fetchProfile()
  } catch (error) {
    console.error('加载用户信息失败', error)
  } finally {
    loading.value = false
  }
}

const loadPointsRecords = async () => {
  recordsLoading.value = true
  try {
    const res = await getMyPointsRecords({ page: 1, page_size: 10 })
    pointsRecords.value = res.data.list
    activitiesJoined.value = res.data.list.filter(r => r.reason.includes('活动')).length
    articlesRead.value = res.data.list.filter(r => r.reason.includes('学习')).length
  } catch (error) {
    console.error('加载积分记录失败', error)
  } finally {
    recordsLoading.value = false
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadProfile()
  loadPointsRecords()
})
</script>

<style scoped>
.profile-page {
  max-width: 800px;
  padding-bottom: 40px;
}

.profile-card {
  margin-bottom: 20px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 20px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid var(--primary-color);
}

.profile-info {
  flex: 1;
}

.username {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
}

.user-branch {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.user-role {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  background: var(--bg-light);
  color: var(--text-secondary);
}

.user-role.admin {
  background: #ffe0e3;
  color: var(--primary-color);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.profile-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-left: 10px;
  border-left: 4px solid var(--primary-color);
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: var(--text-secondary);
}

.info-value {
  color: var(--text-primary);
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-light);
  border-radius: var(--radius-sm);
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-reason {
  font-size: 14px;
  color: var(--text-primary);
}

.record-date {
  font-size: 12px;
  color: var(--text-light);
}

.record-points {
  font-size: 18px;
  font-weight: 700;
}

.record-points.earn {
  color: var(--success-color);
}

.record-points.deduct {
  color: var(--danger-color);
}

.profile-actions {
  text-align: center;
  margin-top: 20px;
}

.profile-actions .btn {
  min-width: 200px;
}

@media (max-width: 576px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .stat-value {
    font-size: 20px;
  }

  .avatar {
    width: 60px;
    height: 60px;
  }

  .username {
    font-size: 18px;
  }
}
</style>
