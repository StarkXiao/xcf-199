<template>
  <div class="my-volunteer-page container">
    <div class="page-header">
      <h1 class="page-title">📋 我的志愿服务</h1>
    </div>

    <div class="stats-row">
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

    <div class="tab-nav">
      <span
        class="tab-item"
        :class="{ active: activeTab === 'signups' }"
        @click="activeTab = 'signups'"
      >报名记录</span>
      <span
        class="tab-item"
        :class="{ active: activeTab === 'records' }"
        @click="activeTab = 'records'"
      >服务时长</span>
    </div>

    <div v-if="activeTab === 'signups'">
      <div class="status-filter">
        <span
          class="filter-tag"
          :class="{ active: signupStatus === '' }"
          @click="selectSignupStatus('')"
        >全部</span>
        <span
          class="filter-tag"
          :class="{ active: signupStatus === 'pending' }"
          @click="selectSignupStatus('pending')"
        >待审核</span>
        <span
          class="filter-tag"
          :class="{ active: signupStatus === 'approved' }"
          @click="selectSignupStatus('approved')"
        >已通过</span>
        <span
          class="filter-tag"
          :class="{ active: signupStatus === 'rejected' }"
          @click="selectSignupStatus('rejected')"
        >未通过</span>
      </div>

      <div v-if="signupsLoading" class="loading">
        <div class="spinner"></div>
      </div>

      <div v-else-if="signups.length === 0" class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>暂无报名记录</p>
        <router-link to="/volunteer-service" class="btn btn-primary">去报名</router-link>
      </div>

      <div v-else class="signup-list">
        <div
          v-for="signup in signups"
          :key="signup.id"
          class="signup-card"
          @click="goProjectDetail(signup.project_id)"
        >
          <img :src="signup.cover_image" class="signup-cover" alt="cover">
          <div class="signup-info">
            <h3 class="signup-title">{{ signup.title }}</h3>
            <div class="signup-meta">
              <span class="meta-item">
                <span class="meta-icon">📍</span>
                {{ signup.location }}
              </span>
              <span class="meta-item">
                <span class="meta-icon">📅</span>
                {{ formatDate(signup.start_time) }}
              </span>
            </div>
            <div class="signup-bottom">
              <span class="status-badge" :class="signup.status">
                {{ getSignupStatusText(signup.status) }}
              </span>
              <span class="signup-time">报名时间：{{ formatDateTime(signup.signed_up_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="signupTotal > 0" class="pagination">
        <button :disabled="signupPage <= 1" @click="changeSignupPage(signupPage - 1)">上一页</button>
        <button :disabled="signupPage >= signupTotalPages" @click="changeSignupPage(signupPage + 1)">下一页</button>
      </div>
    </div>

    <div v-else-if="activeTab === 'records'">
      <div v-if="recordsLoading" class="loading">
        <div class="spinner"></div>
      </div>

      <div v-else-if="records.length === 0" class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>暂无服务时长记录</p>
      </div>

      <div v-else class="record-list">
        <div
          v-for="record in records"
          :key="record.id"
          class="record-card"
        >
          <div class="record-date">
            <div class="date-day">{{ formatDay(record.service_date) }}</div>
            <div class="date-month">{{ formatMonth(record.service_date) }}</div>
          </div>
          <div class="record-info">
            <h4 class="record-project">{{ record.project_title }}</h4>
            <p class="record-task">{{ record.task_description || '志愿服务' }}</p>
            <div class="record-time">
              {{ formatTime(record.start_time) }} - {{ formatTime(record.end_time) }}
            </div>
          </div>
          <div class="record-stats">
            <div class="hours">
              <span class="hours-number">{{ record.actual_hours }}</span>
              <span class="hours-unit">小时</span>
            </div>
            <div class="points">+{{ record.points_awarded }} 积分</div>
          </div>
        </div>
      </div>

      <div v-if="recordTotal > 0" class="pagination">
        <button :disabled="recordPage <= 1" @click="changeRecordPage(recordPage - 1)">上一页</button>
        <button :disabled="recordPage >= recordTotalPages" @click="changeRecordPage(recordPage + 1)">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  getMyVolunteerSignups,
  getMyVolunteerServiceRecords,
  getMyVolunteerStats
} from '@/api/volunteerService'
import type { VolunteerSignup, VolunteerServiceRecord, VolunteerMyStats } from '@/types'

const router = useRouter()

const activeTab = ref('signups')

const myStats = ref<VolunteerMyStats>({
  total_projects: 0,
  total_hours: 0,
  total_points: 0
})

const signups = ref<VolunteerSignup[]>([])
const signupsLoading = ref(false)
const signupStatus = ref('')
const signupPage = ref(1)
const signupPageSize = ref(10)
const signupTotal = ref(0)

const records = ref<VolunteerServiceRecord[]>([])
const recordsLoading = ref(false)
const recordPage = ref(1)
const recordPageSize = ref(10)
const recordTotal = ref(0)

const signupTotalPages = computed(() => Math.ceil(signupTotal.value / signupPageSize.value))
const recordTotalPages = computed(() => Math.ceil(recordTotal.value / recordPageSize.value))

const loadMyStats = async () => {
  try {
    const res = await getMyVolunteerStats()
    myStats.value = res.data
  } catch (error) {
    console.error('加载我的统计失败', error)
  }
}

const loadSignups = async () => {
  signupsLoading.value = true
  try {
    const res = await getMyVolunteerSignups({
      page: signupPage.value,
      page_size: signupPageSize.value,
      status: signupStatus.value || undefined
    })
    signups.value = res.data.list
    signupTotal.value = res.data.total
  } catch (error) {
    console.error('加载报名记录失败', error)
  } finally {
    signupsLoading.value = false
  }
}

const loadRecords = async () => {
  recordsLoading.value = true
  try {
    const res = await getMyVolunteerServiceRecords({
      page: recordPage.value,
      page_size: recordPageSize.value
    })
    records.value = res.data.list
    recordTotal.value = res.data.total
  } catch (error) {
    console.error('加载服务记录失败', error)
  } finally {
    recordsLoading.value = false
  }
}

const selectSignupStatus = (status: string) => {
  signupStatus.value = status
  signupPage.value = 1
  loadSignups()
}

const changeSignupPage = (page: number) => {
  if (page >= 1 && page <= signupTotalPages.value) {
    signupPage.value = page
    loadSignups()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const changeRecordPage = (page: number) => {
  if (page >= 1 && page <= recordTotalPages.value) {
    recordPage.value = page
    loadRecords()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const goProjectDetail = (projectId: number) => {
  router.push(`/volunteer-service/${projectId}`)
}

const getSignupStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '未通过',
    cancelled: '已取消'
  }
  return map[status] || status
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '待定'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const formatDay = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.getDate()
}

const formatMonth = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月`
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

watch(activeTab, (newVal) => {
  if (newVal === 'records' && records.value.length === 0) {
    loadRecords()
  }
})

onMounted(() => {
  loadMyStats()
  loadSignups()
})
</script>

<style scoped>
.my-volunteer-page {
  max-width: 900px;
  padding-bottom: 40px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
}

.stats-row {
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

.tab-nav {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  border-bottom: 2px solid var(--border-color);
}

.tab-item {
  padding: 12px 24px;
  font-size: 15px;
  cursor: pointer;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.tab-item:hover {
  color: var(--primary-color);
}

.tab-item.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  font-weight: 600;
}

.status-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-tag {
  padding: 6px 16px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tag:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.filter-tag.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.signup-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.signup-card {
  display: flex;
  background: white;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.signup-card:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-md);
}

.signup-cover {
  width: 160px;
  height: 120px;
  object-fit: cover;
  flex-shrink: 0;
}

.signup-info {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.signup-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.signup-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.meta-icon {
  font-size: 14px;
}

.signup-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.pending {
  background: #fff3cd;
  color: #856404;
}

.status-badge.approved {
  background: #d4edda;
  color: #155724;
}

.status-badge.rejected {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.cancelled {
  background: #e2e3e5;
  color: #383d41;
}

.signup-time {
  font-size: 12px;
  color: var(--text-light);
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-card {
  display: flex;
  align-items: center;
  background: white;
  border-radius: var(--radius-md);
  padding: 16px 20px;
  box-shadow: var(--shadow-sm);
  gap: 20px;
}

.record-date {
  text-align: center;
  min-width: 50px;
}

.date-day {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
}

.date-month {
  font-size: 13px;
  color: var(--text-secondary);
}

.record-info {
  flex: 1;
}

.record-project {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.record-task {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.record-time {
  font-size: 12px;
  color: var(--text-light);
}

.record-stats {
  text-align: right;
}

.hours {
  margin-bottom: 4px;
}

.hours-number {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.hours-unit {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 2px;
}

.points {
  font-size: 13px;
  color: #28a745;
  font-weight: 500;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
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
  background: white;
  border-radius: var(--radius-md);
}

.empty-state-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state p {
  margin-bottom: 20px;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
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

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr;
  }

  .signup-card {
    flex-direction: column;
  }

  .signup-cover {
    width: 100%;
    height: 150px;
  }

  .record-card {
    flex-direction: column;
    text-align: center;
  }

  .record-stats {
    text-align: center;
  }
}
</style>
