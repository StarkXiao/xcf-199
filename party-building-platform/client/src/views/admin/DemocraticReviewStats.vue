<template>
  <div class="democratic-review-stats">
    <div class="page-header">
      <h2 class="page-title">民主评议统计</h2>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <div v-else>
      <div class="stats-overview">
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.total_reviews || 0 }}</div>
            <div class="stat-label">评议总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🔄</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.in_progress_reviews || 0 }}</div>
            <div class="stat-label">进行中</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.completed_reviews || 0 }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.archived_reviews || 0 }}</div>
            <div class="stat-label">已归档</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.total_participants || 0 }}</div>
            <div class="stat-label">参与总人数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-content">
            <div class="stat-number">{{ (stats.avg_score || 0).toFixed(1) }}</div>
            <div class="stat-label">平均分</div>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stats-card card">
          <h3 class="card-title">按年份统计</h3>
          <div v-if="!stats.by_year || stats.by_year.length === 0" class="empty-inline">暂无数据</div>
          <div v-else class="category-list">
            <div v-for="item in stats.by_year" :key="item.year" class="category-item">
              <div class="category-info">
                <span class="category-rank">{{ item.year }}</span>
                <span class="category-name">年度</span>
              </div>
              <div class="category-count">{{ item.count }} 次</div>
            </div>
          </div>
        </div>

        <div class="stats-card card">
          <h3 class="card-title">按支部统计</h3>
          <div v-if="!stats.by_branch || stats.by_branch.length === 0" class="empty-inline">暂无数据</div>
          <div v-else class="category-list">
            <div v-for="item in stats.by_branch" :key="item.branch" class="category-item">
              <div class="category-info">
                <span class="category-rank">{{ item.branch.charAt(0) }}</span>
                <span class="category-name">{{ item.branch }}</span>
              </div>
              <div class="category-count">{{ item.count }} 次</div>
            </div>
          </div>
        </div>
      </div>

      <div class="export-section card">
        <h3 class="card-title">归档导出</h3>
        <p class="export-desc">选择已完成的评议导出为 CSV 文件，包含互评均分、组织评价和综合得分。</p>
        <div v-if="completedReviews.length === 0" class="empty-inline">暂无可导出的评议</div>
        <div v-else class="export-list">
          <div v-for="review in completedReviews" :key="review.id" class="export-item">
            <div class="export-info">
              <span class="export-title">{{ review.title }}</span>
              <span class="export-meta">{{ review.branch }} · {{ review.year }}年度 · {{ review.participant_count || 0 }}人参与</span>
            </div>
            <a :href="exportUrl(review.id)" class="btn btn-primary btn-sm" download>导出 CSV</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getDemocraticReviewStats, getAdminDemocraticReviews, exportDemocraticReview } from '@/api/democraticReview'
import type { DemocraticReviewStats, DemocraticReview } from '@/types'

const loading = ref(false)
const stats = ref<DemocraticReviewStats>({
  total_reviews: 0,
  in_progress_reviews: 0,
  completed_reviews: 0,
  archived_reviews: 0,
  total_participants: 0,
  avg_score: 0,
  by_year: [],
  by_branch: []
})

const completedReviews = ref<DemocraticReview[]>([])

const loadStats = async () => {
  try {
    const res = await getDemocraticReviewStats()
    stats.value = res.data
  } catch (error) {
    console.error('加载统计失败', error)
  }
}

const loadCompletedReviews = async () => {
  try {
    const res = await getAdminDemocraticReviews({ status: 'completed', page_size: 50 })
    completedReviews.value = res.data.list
    const archivedRes = await getAdminDemocraticReviews({ status: 'archived', page_size: 50 })
    completedReviews.value = [...completedReviews.value, ...archivedRes.data.list]
  } catch (error) {
    console.error('加载评议列表失败', error)
  }
}

const exportUrl = (id: number) => {
  const token = localStorage.getItem('token')
  return `${exportDemocraticReview(id)}?token=${token}`
}

onMounted(() => {
  loading.value = true
  Promise.all([loadStats(), loadCompletedReviews()]).finally(() => {
    loading.value = false
  })
})
</script>

<style scoped>
.democratic-review-stats {
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
  margin-bottom: 24px;
}

.card {
  background: white;
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
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

.export-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 16px;
}

.export-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.export-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
}

.export-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.export-title {
  font-size: 14px;
  font-weight: 600;
}

.export-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.empty-inline {
  text-align: center;
  padding: 30px;
  color: var(--text-secondary);
  font-size: 14px;
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
