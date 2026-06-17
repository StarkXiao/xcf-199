<template>
  <div class="volunteer-stats">
    <div class="page-header">
      <h2 class="page-title">志愿服务统计</h2>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else>
      <div class="stats-overview">
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-content">
            <div class="stat-number">{{ overview.total_projects || 0 }}</div>
            <div class="stat-label">项目总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-number">{{ overview.recruiting_projects || 0 }}</div>
            <div class="stat-label">招募中</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <div class="stat-number">{{ overview.completed_projects || 0 }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <div class="stat-number">{{ overview.total_volunteers || 0 }}</div>
            <div class="stat-label">志愿者人数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-content">
            <div class="stat-number">{{ overview.total_service_hours || 0 }}</div>
            <div class="stat-label">总服务时长(小时)</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-content">
            <div class="stat-number">{{ overview.total_points_awarded || 0 }}</div>
            <div class="stat-label">发放积分总数</div>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stats-card card">
          <h3 class="card-title">项目分类统计</h3>
          <div v-if="categoryStats.length === 0" class="empty-inline">
            暂无数据
          </div>
          <div v-else class="category-list">
            <div
              v-for="(item, index) in categoryStats"
              :key="item.category"
              class="category-item"
            >
              <div class="category-info">
                <span class="category-rank">{{ index + 1 }}</span>
                <span class="category-name">{{ item.category }}</span>
              </div>
              <div class="category-count">
                {{ item.project_count }} 个项目
              </div>
            </div>
          </div>
        </div>

        <div class="stats-card card">
          <h3 class="card-title">服务时长排行榜</h3>
          <div v-if="ranking.length === 0" class="empty-inline">
            暂无数据
          </div>
          <div v-else class="ranking-list">
            <div
              v-for="(user, index) in ranking"
              :key="user.id"
              class="ranking-item"
            >
              <div class="ranking-rank" :class="getRankClass(index)">
                {{ index + 1 }}
              </div>
              <img v-if="user.avatar" :src="user.avatar" class="ranking-avatar" alt="avatar">
              <div v-else class="ranking-avatar placeholder">👤</div>
              <div class="ranking-info">
                <div class="ranking-name">{{ user.real_name }}</div>
                <div class="ranking-branch">{{ user.branch }}</div>
              </div>
              <div class="ranking-hours">
                <span class="hours-number">{{ user.total_hours }}</span>
                <span class="hours-unit">小时</span>
                <div class="points-info">+{{ user.total_points }}积分</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getVolunteerStatsOverview,
  getVolunteerStatsByCategory,
  getVolunteerRanking
} from '@/api/volunteerService'
import type { VolunteerStats, VolunteerCategoryStats, VolunteerRanking } from '@/types'

const loading = ref(false)
const overview = ref<VolunteerStats>({
  total_projects: 0,
  recruiting_projects: 0,
  completed_projects: 0,
  total_volunteers: 0,
  total_service_hours: 0,
  total_points_awarded: 0
})

const categoryStats = ref<VolunteerCategoryStats[]>([])
const ranking = ref<VolunteerRanking[]>([])

const loadOverview = async () => {
  try {
    const res = await getVolunteerStatsOverview()
    overview.value = res.data
  } catch (error) {
    console.error('加载概览统计失败', error)
  }
}

const loadCategoryStats = async () => {
  try {
    const res = await getVolunteerStatsByCategory()
    categoryStats.value = res.data
  } catch (error) {
    console.error('加载分类统计失败', error)
  }
}

const loadRanking = async () => {
  try {
    const res = await getVolunteerRanking({ limit: 10 })
    ranking.value = res.data
  } catch (error) {
    console.error('加载排行榜失败', error)
  }
}

const getRankClass = (index: number) => {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
}

onMounted(() => {
  loading.value = true
  Promise.all([loadOverview(), loadCategoryStats(), loadRanking()]).finally(() => {
    loading.value = false
  })
})
</script>

<style scoped>
.volunteer-stats {
  padding-bottom: 20px;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  font-size: 32px;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.stats-card {
  padding: 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--bg-light);
  border-radius: var(--radius-sm);
}

.category-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-rank {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.category-name {
  font-size: 14px;
  font-weight: 500;
}

.category-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
}

.ranking-rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dee2e6;
  color: #495057;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.ranking-rank.rank-gold {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #7a5d00;
}

.ranking-rank.rank-silver {
  background: linear-gradient(135deg, #e8e8e8, #c0c0c0);
  color: #666;
}

.ranking-rank.rank-bronze {
  background: linear-gradient(135deg, #cd7f32, #a0522d);
  color: #fff;
}

.ranking-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.ranking-avatar.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  font-size: 20px;
}

.ranking-info {
  flex: 1;
}

.ranking-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
}

.ranking-branch {
  font-size: 12px;
  color: var(--text-secondary);
}

.ranking-hours {
  text-align: right;
  flex-shrink: 0;
}

.hours-number {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-color);
}

.hours-unit {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 2px;
}

.points-info {
  font-size: 12px;
  color: #28a745;
  margin-top: 2px;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--bg-light);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-inline {
  text-align: center;
  padding: 30px;
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 1200px) {
  .stats-overview {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
