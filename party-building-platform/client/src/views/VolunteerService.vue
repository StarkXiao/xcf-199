<template>
  <div class="volunteer-page container">
    <div class="page-header">
      <h1 class="page-title">🤝 志愿服务</h1>
      <p class="page-subtitle">参与志愿服务，奉献爱心，收获成长</p>
    </div>

    <div class="volunteer-stats">
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-content">
          <div class="stat-number">{{ myStats.total_projects || 0 }}</div>
          <div class="stat-label">参与项目</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏱️</div>
        <div class="stat-content">
          <div class="stat-number">{{ myStats.total_hours || 0 }}</div>
          <div class="stat-label">服务时长(小时)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-content">
          <div class="stat-number">{{ myStats.total_points || 0 }}</div>
          <div class="stat-label">获得积分</div>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="status-tabs">
        <span
          class="tab"
          :class="{ active: currentStatus === '' }"
          @click="selectStatus('')"
        >全部项目</span>
        <span
          class="tab"
          :class="{ active: currentStatus === 'recruiting' }"
          @click="selectStatus('recruiting')"
        >招募中</span>
        <span
          class="tab"
          :class="{ active: currentStatus === 'ongoing' }"
          @click="selectStatus('ongoing')"
        >进行中</span>
        <span
          class="tab"
          :class="{ active: currentStatus === 'completed' }"
          @click="selectStatus('completed')"
        >已结束</span>
      </div>

      <div class="category-filter">
        <span class="filter-label">分类：</span>
        <select v-model="currentCategory" @change="handleCategoryChange" class="category-select">
          <option value="">全部分类</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>

      <div class="search-box">
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索项目..."
          @keyup.enter="handleSearch"
          class="search-input"
        >
        <button class="search-btn" @click="handleSearch">🔍</button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="projects.length === 0" class="empty-state">
      <div class="empty-state-icon">📭</div>
      <p>暂无志愿服务项目</p>
    </div>

    <div v-else class="project-grid">
      <div
        v-for="project in projects"
        :key="project.id"
        class="project-card"
        @click="goDetail(project.id)"
      >
        <div
          class="project-cover"
          :style="{ backgroundImage: `url(${project.cover_image})` }"
        >
          <div class="status-badge" :class="project.status">
            {{ getStatusText(project.status) }}
          </div>
          <div class="category-tag">{{ project.category || '志愿服务' }}</div>
        </div>
        <div class="project-body">
          <h3 class="project-title">{{ project.title }}</h3>
          <p class="project-desc">{{ project.description.slice(0, 80) }}...</p>
          <div class="project-info">
            <div class="info-item">
              <span class="info-icon">📍</span>
              <span>{{ project.location }}</span>
            </div>
            <div class="info-item">
              <span class="info-icon">📅</span>
              <span>{{ formatDate(project.start_time) }}</span>
            </div>
            <div class="info-item">
              <span class="info-icon">⏱️</span>
              <span>{{ project.service_hours || 0 }}小时</span>
            </div>
            <div class="info-item">
              <span class="info-icon">⭐</span>
              <span>{{ project.points_per_hour }} 积分/小时</span>
            </div>
          </div>
          <div class="project-meta">
            <div class="rating">
              <span class="star">★</span>
              <span class="rating-score">{{ (project.avg_rating || 0).toFixed(1) }}</span>
              <span class="review-count">({{ project.review_count || 0 }}条评价)</span>
            </div>
            <div class="signup-info">
              <span class="signup-count">
                {{ project.signup_count }}/{{ project.max_participants || '不限' }}人
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="total > 0" class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <button
        v-for="p in totalPages"
        :key="p"
        :class="{ active: p === page }"
        @click="changePage(p)"
      >{{ p }}</button>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getVolunteerProjects,
  getVolunteerCategories,
  getMyVolunteerStats
} from '@/api/volunteerService'
import type { VolunteerProject, VolunteerMyStats } from '@/types'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const projects = ref<VolunteerProject[]>([])
const categories = ref<string[]>([])
const currentStatus = ref('')
const currentCategory = ref('')
const keyword = ref('')
const page = ref(1)
const pageSize = ref(9)
const total = ref(0)
const loading = ref(false)
const myStats = ref<VolunteerMyStats>({
  total_projects: 0,
  total_hours: 0,
  total_points: 0
})

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const loadMyStats = async () => {
  if (!userStore.isLoggedIn) return
  try {
    const res = await getMyVolunteerStats()
    myStats.value = res.data
  } catch (error) {
    console.error('加载我的统计失败', error)
  }
}

const loadCategories = async () => {
  try {
    const res = await getVolunteerCategories()
    categories.value = res.data
  } catch (error) {
    console.error('加载分类失败', error)
  }
}

const loadProjects = async () => {
  loading.value = true
  try {
    const res = await getVolunteerProjects({
      page: page.value,
      page_size: pageSize.value,
      status: currentStatus.value || undefined,
      category: currentCategory.value || undefined,
      keyword: keyword.value || undefined
    })
    projects.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载志愿项目失败', error)
  } finally {
    loading.value = false
  }
}

const selectStatus = (status: string) => {
  currentStatus.value = status
  page.value = 1
  loadProjects()
}

const handleCategoryChange = () => {
  page.value = 1
  loadProjects()
}

const handleSearch = () => {
  page.value = 1
  loadProjects()
}

const changePage = (p: number) => {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadProjects()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const goDetail = (id: number) => {
  router.push(`/volunteer-service/${id}`)
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    recruiting: '招募中',
    ongoing: '进行中',
    completed: '已结束',
    cancelled: '已取消'
  }
  return map[status] || status
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '待定'
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`
}

onMounted(() => {
  loadCategories()
  loadProjects()
  loadMyStats()
})
</script>

<style scoped>
.volunteer-page {
  padding-bottom: 40px;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
  padding: 40px 20px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  border-radius: var(--radius-lg);
  margin-bottom: 30px;
}

.page-title {
  font-size: 28px;
  margin-bottom: 8px;
}

.page-subtitle {
  font-size: 14px;
  opacity: 0.9;
}

.volunteer-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  font-size: 36px;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
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

.category-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.category-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.search-box {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: white;
}

.search-input {
  padding: 8px 12px;
  border: none;
  outline: none;
  font-size: 14px;
  width: 200px;
}

.search-btn {
  padding: 8px 16px;
  border: none;
  background: var(--primary-color);
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.project-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.project-cover {
  height: 180px;
  background-size: cover;
  background-position: center;
  position: relative;
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.6);
  color: white;
}

.status-badge.recruiting {
  background: #28a745;
}

.status-badge.ongoing {
  background: #007bff;
}

.status-badge.completed {
  background: #6c757d;
}

.status-badge.cancelled {
  background: #dc3545;
}

.category-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--primary-color);
  font-weight: 500;
}

.project-body {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.project-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  flex: 1;
  line-height: 1.5;
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
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

.project-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.star {
  color: #ffc107;
}

.rating-score {
  font-weight: 600;
  color: var(--text-primary);
}

.review-count {
  color: var(--text-light);
}

.signup-count {
  font-size: 12px;
  color: var(--text-light);
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

@media (max-width: 992px) {
  .project-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .volunteer-stats {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .volunteer-stats {
    grid-template-columns: 1fr;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    width: 100%;
  }

  .search-input {
    flex: 1;
    width: auto;
  }
}

@media (max-width: 576px) {
  .project-grid {
    grid-template-columns: 1fr;
  }
}
</style>
