<template>
  <div class="activities-page container">
    <div class="page-header">
      <h1 class="page-title">🎯 活动报名</h1>
    </div>

    <div class="status-tabs">
      <span
        class="tab"
        :class="{ active: currentStatus === '' }"
        @click="selectStatus('')"
      >全部活动</span>
      <span
        class="tab"
        :class="{ active: currentStatus === 'upcoming' }"
        @click="selectStatus('upcoming')"
      >即将开始</span>
      <span
        class="tab"
        :class="{ active: currentStatus === 'completed' }"
        @click="selectStatus('completed')"
      >已结束</span>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="activities.length === 0" class="empty-state">
      <div class="empty-state-icon">📭</div>
      <p>暂无活动</p>
    </div>

    <div v-else class="activity-grid">
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="activity-card"
        @click="goDetail(activity.id)"
      >
        <div
          class="activity-cover"
          :style="{ backgroundImage: `url(${activity.cover_image})` }"
        >
          <div class="status-badge" :class="activity.status">
            {{ getStatusText(activity.status) }}
          </div>
        </div>
        <div class="activity-body">
          <h3 class="activity-title">{{ activity.title }}</h3>
          <p class="activity-desc">{{ activity.description.slice(0, 60) }}...</p>
          <div class="activity-info">
            <div class="info-item">
              <span class="info-icon">📍</span>
              <span>{{ activity.location }}</span>
            </div>
            <div class="info-item">
              <span class="info-icon">📅</span>
              <span>{{ formatDate(activity.start_time) }}</span>
            </div>
            <div class="info-item">
              <span class="info-icon">⭐</span>
              <span>{{ activity.points_reward }} 积分</span>
            </div>
          </div>
          <div class="activity-footer">
            <div class="signup-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: getProgress(activity) + '%' }"
                ></div>
              </div>
              <span class="signup-count">
                {{ activity.signup_count }}/{{ activity.max_participants || '不限' }}人
              </span>
            </div>
            <button class="btn btn-primary btn-sm" @click.stop="goDetail(activity.id)">
              查看详情
            </button>
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
import { getActivities } from '@/api/activities'
import type { Activity } from '@/types'

const router = useRouter()

const activities = ref<Activity[]>([])
const currentStatus = ref('')
const page = ref(1)
const pageSize = ref(9)
const total = ref(0)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const loadActivities = async () => {
  loading.value = true
  try {
    const res = await getActivities({
      page: page.value,
      page_size: pageSize.value,
      status: currentStatus.value || undefined
    })
    activities.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载活动失败', error)
  } finally {
    loading.value = false
  }
}

const selectStatus = (status: string) => {
  currentStatus.value = status
  page.value = 1
  loadActivities()
}

const changePage = (p: number) => {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadActivities()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const goDetail = (id: number) => {
  router.push(`/activities/${id}`)
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    upcoming: '报名中',
    ongoing: '进行中',
    completed: '已结束',
    cancelled: '已取消'
  }
  return map[status] || status
}

const getProgress = (activity: Activity) => {
  if (!activity.max_participants) return 30
  return Math.min((activity.signup_count! / activity.max_participants) * 100, 100)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '待定'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

onMounted(() => {
  loadActivities()
})
</script>

<style scoped>
.activities-page {
  padding-bottom: 40px;
}

.status-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
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

.activity-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.activity-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}

.activity-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.activity-cover {
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

.status-badge.upcoming {
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

.activity-body {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.activity-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.activity-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  flex: 1;
}

.activity-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
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

.activity-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.signup-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  margin-right: 12px;
}

.progress-bar {
  height: 6px;
  background: var(--bg-light);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 3px;
  transition: width 0.3s;
}

.signup-count {
  font-size: 12px;
  color: var(--text-light);
}

@media (max-width: 992px) {
  .activity-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .activity-grid {
    grid-template-columns: 1fr;
  }
}
</style>
