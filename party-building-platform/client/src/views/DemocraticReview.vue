<template>
  <div class="review-page container">
    <div class="page-header">
      <h1 class="page-title">📊 民主评议</h1>
      <p class="page-subtitle">党员互评、组织评价、结果汇总</p>
    </div>

    <div class="filter-bar">
      <div class="status-tabs">
        <span class="tab" :class="{ active: currentStatus === '' }" @click="selectStatus('')">全部</span>
        <span class="tab" :class="{ active: currentStatus === 'published' }" @click="selectStatus('published')">待开始</span>
        <span class="tab" :class="{ active: currentStatus === 'in_progress' }" @click="selectStatus('in_progress')">进行中</span>
        <span class="tab" :class="{ active: currentStatus === 'completed' }" @click="selectStatus('completed')">已完成</span>
        <span class="tab" :class="{ active: currentStatus === 'archived' }" @click="selectStatus('archived')">已归档</span>
      </div>
      <div class="year-filter">
        <span class="filter-label">年份：</span>
        <select v-model="currentYear" @change="handleYearChange" class="year-select">
          <option value="">全部年份</option>
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="reviews.length === 0" class="empty-state">
      <div class="empty-state-icon">📋</div>
      <p>暂无民主评议</p>
    </div>

    <div v-else class="review-list">
      <div
        v-for="review in reviews"
        :key="review.id"
        class="review-card"
        @click="goDetail(review.id)"
      >
        <div class="review-card-header">
          <div class="review-title-row">
            <h3 class="review-title">{{ review.title }}</h3>
            <span class="status-badge" :class="review.status">{{ getStatusText(review.status) }}</span>
          </div>
          <p class="review-desc">{{ review.description || '暂无描述' }}</p>
        </div>
        <div class="review-card-body">
          <div class="review-info-grid">
            <div class="info-item">
              <span class="info-icon">📅</span>
              <span>{{ review.year }}年度</span>
            </div>
            <div class="info-item">
              <span class="info-icon">🏢</span>
              <span>{{ review.branch }}</span>
            </div>
            <div class="info-item">
              <span class="info-icon">⏰</span>
              <span>{{ formatDate(review.start_date) }} ~ {{ formatDate(review.end_date) }}</span>
            </div>
            <div class="info-item">
              <span class="info-icon">👥</span>
              <span>{{ review.participant_count || 0 }}人参与</span>
            </div>
          </div>
          <div class="review-meta" v-if="review.status === 'completed' || review.status === 'archived'">
            <div class="score-display">
              <span class="score-label">平均分</span>
              <span class="score-value">{{ (review.avg_score || 0).toFixed(1) }}</span>
            </div>
          </div>
        </div>
        <div class="review-card-footer" v-if="review.form_items && review.form_items.length > 0">
          <div class="form-items-preview">
            <span class="form-item-tag" v-for="item in review.form_items.filter(i => i.item_type === 'score').slice(0, 4)" :key="item.id">
              {{ item.item_name }}
            </span>
            <span class="form-item-more" v-if="review.form_items.filter(i => i.item_type === 'score').length > 4">
              +{{ review.form_items.filter(i => i.item_type === 'score').length - 4 }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="total > 0" class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <button v-for="p in totalPages" :key="p" :class="{ active: p === page }" @click="changePage(p)">{{ p }}</button>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getDemocraticReviews } from '@/api/democraticReview'
import type { DemocraticReview } from '@/types'

const router = useRouter()

const reviews = ref<DemocraticReview[]>([])
const currentStatus = ref('')
const currentYear = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)

const availableYears = computed(() => {
  const currentYearVal = new Date().getFullYear()
  const years = []
  for (let y = currentYearVal; y >= currentYearVal - 5; y--) {
    years.push(y)
  }
  return years
})

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const loadReviews = async () => {
  loading.value = true
  try {
    const res = await getDemocraticReviews({
      page: page.value,
      page_size: pageSize.value,
      status: currentStatus.value || undefined,
      year: currentYear.value || undefined
    })
    reviews.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载民主评议失败', error)
  } finally {
    loading.value = false
  }
}

const selectStatus = (status: string) => {
  currentStatus.value = status
  page.value = 1
  loadReviews()
}

const handleYearChange = () => {
  page.value = 1
  loadReviews()
}

const changePage = (p: number) => {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadReviews()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const goDetail = (id: number) => {
  router.push(`/democratic-review/${id}`)
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    published: '待开始',
    in_progress: '进行中',
    completed: '已完成',
    archived: '已归档'
  }
  return map[status] || status
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '待定'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

onMounted(() => {
  loadReviews()
})
</script>

<style scoped>
.review-page {
  padding-bottom: 40px;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
  padding: 40px 20px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  border-radius: var(--radius-lg);
}

.page-title {
  font-size: 28px;
  margin-bottom: 8px;
}

.page-subtitle {
  font-size: 14px;
  opacity: 0.9;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.status-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab {
  padding: 8px 20px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tab:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.tab.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.year-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.year-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-card {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: hidden;
}

.review-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.review-card-header {
  padding: 20px 20px 12px;
}

.review-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.review-title {
  font-size: 18px;
  font-weight: 600;
  flex: 1;
  margin: 0;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
  margin-left: 12px;
}

.status-badge.published {
  background: #fff3cd;
  color: #856404;
}

.status-badge.in_progress {
  background: #d1ecf1;
  color: #0c5460;
}

.status-badge.completed {
  background: #d4edda;
  color: #155724;
}

.status-badge.archived {
  background: #e2e3e5;
  color: #383d41;
}

.status-badge.draft {
  background: #f8f9fa;
  color: #6c757d;
}

.review-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.review-card-body {
  padding: 0 20px 12px;
}

.review-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.info-icon {
  font-size: 14px;
}

.review-meta {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.score-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.score-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-color);
}

.review-card-footer {
  padding: 12px 20px;
  background: var(--bg-light);
  border-top: 1px solid var(--border-color);
}

.form-items-preview {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.form-item-tag {
  padding: 4px 10px;
  background: white;
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
}

.form-item-more {
  font-size: 12px;
  color: var(--text-secondary);
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

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 32px;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.pagination button:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.pagination button.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .review-info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
