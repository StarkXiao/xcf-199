<template>
  <div class="dashboard-page">
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon blue">👥</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.user_count }}</div>
          <div class="stat-label">用户总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">📚</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.article_count }}</div>
          <div class="stat-label">文章总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">🎯</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.activity_count }}</div>
          <div class="stat-label">活动总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">📢</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.notice_count }}</div>
          <div class="stat-label">通知总数</div>
        </div>
      </div>
    </div>

    <div class="dashboard-content">
      <div class="card">
        <h3 class="card-title">📋 最近报名</h3>
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
        </div>
        <div v-else-if="stats.recent_signups?.length === 0" class="empty-state" style="padding: 30px;">
          <p>暂无报名记录</p>
        </div>
        <div v-else class="signup-list">
          <div v-for="(item, index) in stats.recent_signups" :key="index" class="signup-item">
            <div class="signup-user">{{ item.real_name }}</div>
            <div class="signup-activity">{{ item.title }}</div>
            <div class="signup-time">{{ formatTime(item.signed_up_at) }}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">⭐ 总积分统计</h3>
        <div class="points-total">
          <div class="points-value">{{ stats.total_points }}</div>
          <div class="points-label">用户总积分</div>
        </div>
        <div class="points-avg">
          人均积分：{{ stats.user_count > 0 ? Math.round(stats.total_points / stats.user_count) : 0 }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getAdminStats } from '@/api/points'

const loading = ref(false)
const stats = reactive({
  user_count: 0,
  article_count: 0,
  activity_count: 0,
  notice_count: 0,
  total_points: 0,
  recent_signups: [] as any[]
})

const loadStats = async () => {
  loading.value = true
  try {
    const res = await getAdminStats()
    Object.assign(stats, res.data)
  } catch (error) {
    console.error('加载统计数据失败', error)
  } finally {
    loading.value = false
  }
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.dashboard-page {
  padding-bottom: 20px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-icon.blue {
  background: #e3f2fd;
}

.stat-icon.green {
  background: #e8f5e9;
}

.stat-icon.orange {
  background: #fff3e0;
}

.stat-icon.red {
  background: #ffebee;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.dashboard-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.signup-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.signup-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-light);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.signup-user {
  font-weight: 500;
  flex-shrink: 0;
  width: 80px;
}

.signup-activity {
  flex: 1;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.signup-time {
  flex-shrink: 0;
  color: var(--text-light);
  font-size: 13px;
}

.points-total {
  text-align: center;
  padding: 20px 0;
}

.points-value {
  font-size: 48px;
  font-weight: 700;
  color: var(--primary-color);
  line-height: 1;
}

.points-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 8px;
}

.points-avg {
  text-align: center;
  padding: 12px;
  background: var(--bg-light);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
}

@media (max-width: 992px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 576px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
}
</style>
