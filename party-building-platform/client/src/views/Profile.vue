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
          <div class="stat-item">
            <div class="stat-value">{{ certStats?.total_certificates || 0 }}</div>
            <div class="stat-label">学习证书</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ certStats?.total_honors || 0 }}</div>
            <div class="stat-label">活动荣誉</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ certStats?.total_achievements || 0 }}</div>
            <div class="stat-label">个人成果</div>
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

      <div class="profile-section card">
        <div class="section-header">
          <h3 class="section-title">🏆 证书荣誉</h3>
          <button class="btn-link" @click="goToCertificates">查看全部</button>
        </div>
        <div v-if="certificatesLoading" class="loading" style="padding: 20px;">
          <div class="spinner"></div>
        </div>
        <div v-else-if="recentCertificates.length === 0 && recentAchievements.length === 0" class="empty-state" style="padding: 30px;">
          <p>暂无证书荣誉记录，点击右上角查看全部</p>
        </div>
        <div v-else>
          <div v-if="recentCertificates.length > 0" style="margin-bottom: 16px;">
            <h4 class="sub-title">📜 最近获得的证书</h4>
            <div class="cert-mini-list">
              <div v-for="cert in recentCertificates" :key="cert.id" class="cert-mini-item">
                <img class="cert-mini-cover" :src="cert.cover_image || 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=100'" :alt="cert.title">
                <div class="cert-mini-info">
                  <div class="cert-mini-title">{{ cert.title }}</div>
                  <div class="cert-mini-meta">
                    <span class="cert-mini-category">{{ cert.category }}</span>
                    <span class="cert-mini-date">{{ formatDate(cert.issue_date || cert.created_at) }}</span>
                  </div>
                </div>
                <span class="cert-mini-points">+{{ cert.points_reward }}</span>
              </div>
            </div>
          </div>
          <div v-if="recentAchievements.length > 0">
            <h4 class="sub-title">🎯 最近添加的成果</h4>
            <div class="achievement-mini-list">
              <div v-for="ach in recentAchievements" :key="ach.id" class="achievement-mini-item">
                <div class="achievement-mini-icon">{{ getAchievementIcon(ach.type) }}</div>
                <div class="achievement-mini-info">
                  <div class="achievement-mini-title">{{ ach.title }}</div>
                  <div class="achievement-mini-meta">
                    <span>{{ getAchievementTypeText(ach.type) }}</span>
                    <span v-if="ach.achievement_date">{{ formatDate(ach.achievement_date) }}</span>
                  </div>
                </div>
                <span class="achievement-mini-public" :class="{ public: ach.is_public }">
                  {{ ach.is_public ? '公开' : '私密' }}
                </span>
              </div>
            </div>
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
import { useRouter } from 'vue-router'
import { getMyPointsRecords } from '@/api/points'
import { getMyCertificateStats, getMyCertificates, getAchievements } from '@/api/certificates'
import type { PointsRecord, CertificateStats, CertificateIssuance, UserAchievement } from '@/types'

const userStore = useUserStore()
const router = useRouter()

const loading = ref(false)
const recordsLoading = ref(false)
const certificatesLoading = ref(false)
const articlesRead = ref(0)
const activitiesJoined = ref(0)
const pointsRecords = ref<PointsRecord[]>([])
const certStats = ref<CertificateStats | null>(null)
const recentCertificates = ref<CertificateIssuance[]>([])
const recentAchievements = ref<UserAchievement[]>([])

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

const loadCertificateStats = async () => {
  try {
    const res = await getMyCertificateStats()
    certStats.value = res.data
  } catch (error) {
    console.error('加载证书统计失败', error)
  }
}

const loadRecentCertificates = async () => {
  certificatesLoading.value = true
  try {
    const res = await getMyCertificates({ page: 1, page_size: 3 })
    recentCertificates.value = res.data.list
  } catch (error) {
    console.error('加载最近证书失败', error)
  } finally {
    certificatesLoading.value = false
  }
}

const loadRecentAchievements = async () => {
  try {
    const res = await getAchievements()
    recentAchievements.value = res.data.list.slice(0, 3)
  } catch (error) {
    console.error('加载最近成果失败', error)
  }
}

const goToCertificates = () => {
  router.push('/my-certificates')
}

const getAchievementIcon = (type: string) => {
  const icons: Record<string, string> = {
    learning: '📚',
    honor: '🏆',
    volunteer: '🤝',
    work: '💼',
    other: '🎯'
  }
  return icons[type] || '🎯'
}

const getAchievementTypeText = (type: string) => {
  const types: Record<string, string> = {
    learning: '学习成果',
    honor: '荣誉奖项',
    volunteer: '志愿服务',
    work: '工作成果',
    other: '其他成果'
  }
  return types[type] || '其他'
}

onMounted(() => {
  loadProfile()
  loadPointsRecords()
  loadCertificateStats()
  loadRecentCertificates()
  loadRecentAchievements()
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header .section-title {
  margin-bottom: 0;
}

.sub-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.cert-mini-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cert-mini-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
  transition: background 0.2s;
}

.cert-mini-item:hover {
  background: var(--border-color);
}

.cert-mini-cover {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.cert-mini-info {
  flex: 1;
  min-width: 0;
}

.cert-mini-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cert-mini-meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.cert-mini-points {
  font-size: 14px;
  font-weight: 600;
  color: var(--success-color);
  flex-shrink: 0;
}

.achievement-mini-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.achievement-mini-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
  transition: background 0.2s;
}

.achievement-mini-item:hover {
  background: var(--border-color);
}

.achievement-mini-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.achievement-mini-info {
  flex: 1;
  min-width: 0;
}

.achievement-mini-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.achievement-mini-meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.achievement-mini-public {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 12px;
  background: var(--bg-light);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.achievement-mini-public.public {
  background: #e3f2fd;
  color: #1976d2;
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
