<template>
  <div class="branch-meeting-stats">
    <div class="page-header">
      <h2 class="page-title">支部会议统计分析</h2>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else>
      <div class="stats-overview">
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.total_meetings || 0 }}</div>
            <div class="stat-label">会议总量</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.total_resolutions || 0 }}</div>
            <div class="stat-label">决议总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.passed_resolutions || 0 }}</div>
            <div class="stat-label">通过决议</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.passed_resolutions && stats.total_resolutions ? Math.round(stats.passed_resolutions / stats.total_resolutions * 100) : 0 }}%</div>
            <div class="stat-label">决议通过率</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.avg_attendance_rate || 0 }}%</div>
            <div class="stat-label">平均签到率</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏷️</div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.by_type?.length || 0 }}</div>
            <div class="stat-label">会议类型</div>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stats-card card">
          <h3 class="card-title">会议类型分布</h3>
          <div v-if="stats.by_type?.length === 0" class="empty-inline">
            暂无数据
          </div>
          <div v-else class="type-list">
            <div
              v-for="(item, index) in sortedByType"
              :key="item.type"
              class="type-item"
            >
              <div class="type-info">
                <span class="type-rank">{{ index + 1 }}</span>
                <span class="type-name">{{ getTypeName(item.type) }}</span>
              </div>
              <div class="type-bar">
                <div
                  class="type-bar-fill"
                  :style="{ width: getTypeBarWidth(item.count) }"
                ></div>
              </div>
              <div class="type-count">
                {{ item.count }} 次
              </div>
            </div>
          </div>
        </div>

        <div class="stats-card card">
          <h3 class="card-title">各支部会议统计</h3>
          <div v-if="stats.by_branch?.length === 0" class="empty-inline">
            暂无数据
          </div>
          <div v-else class="branch-list">
            <div
              v-for="(item, index) in sortedByBranch"
              :key="item.branch"
              class="branch-item"
            >
              <div class="branch-info">
                <span class="branch-rank">{{ index + 1 }}</span>
                <span class="branch-name">{{ item.branch }}</span>
              </div>
              <div class="branch-bar">
                <div
                  class="branch-bar-fill"
                  :style="{ width: getBranchBarWidth(item.count) }"
                ></div>
              </div>
              <div class="branch-count">
                {{ item.count }} 次
              </div>
            </div>
          </div>
        </div>

        <div class="stats-card card full-width">
          <h3 class="card-title">月度会议趋势</h3>
          <div v-if="stats.by_month?.length === 0" class="empty-inline">
            暂无数据
          </div>
          <div v-else class="monthly-chart">
            <div class="chart-container">
              <div
                v-for="item in stats.by_month"
                :key="item.month"
                class="chart-bar-container"
              >
                <div class="chart-bar-wrapper">
                  <div
                    class="chart-bar"
                    :style="{ height: getMonthBarHeight(item.count) }"
                  >
                    <span class="chart-bar-label">{{ item.count }}</span>
                  </div>
                </div>
                <div class="chart-month-label">{{ formatMonth(item.month) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="stats-card card">
          <h3 class="card-title">签到率分析</h3>
          <div class="attendance-display">
            <div class="attendance-circle">
              <svg viewBox="0 0 100 100" class="progress-ring">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e9ecef"
                  stroke-width="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  :stroke="getAttendanceColor(stats.avg_attendance_rate)"
                  stroke-width="8"
                  stroke-linecap="round"
                  :stroke-dasharray="getCircumference()"
                  :stroke-dashoffset="getStrokeDashoffset(stats.avg_attendance_rate)"
                  transform="rotate(-90 50 50)"
                  class="progress-ring-circle"
                />
              </svg>
              <div class="attendance-text">
                <span class="attendance-number">{{ stats.avg_attendance_rate || 0 }}%</span>
                <span class="attendance-label">平均签到率</span>
              </div>
            </div>
            <div class="attendance-description">
              <p>数据统计范围包含所有已完成的会议</p>
              <p>签到率 = 实际签到人数 / 应参会人数 × 100%</p>
              <div class="attendance-tips">
                <span class="tip-good">≥90% 优秀</span>
                <span class="tip-medium">70%-90% 良好</span>
                <span class="tip-poor">&lt;70% 待提升</span>
              </div>
            </div>
          </div>
        </div>

        <div class="stats-card card">
          <h3 class="card-title">决议通过情况</h3>
          <div class="resolution-stats">
            <div class="resolution-numbers">
              <div class="resolution-number-item">
                <span class="resolution-total">{{ stats.total_resolutions || 0 }}</span>
                <span class="resolution-label">决议总数</span>
              </div>
              <div class="resolution-number-item">
                <span class="resolution-passed">{{ stats.passed_resolutions || 0 }}</span>
                <span class="resolution-label">已通过</span>
              </div>
              <div class="resolution-number-item">
                <span class="resolution-failed">{{ (stats.total_resolutions || 0) - (stats.passed_resolutions || 0) }}</span>
                <span class="resolution-label">未通过</span>
              </div>
            </div>
            <div class="resolution-bar">
              <div
                class="resolution-bar-passed"
                :style="{ width: getPassedWidth() }"
              >
                <span v-if="stats.passed_resolutions">{{ Math.round(stats.passed_resolutions / stats.total_resolutions * 100) }}%</span>
              </div>
              <div
                class="resolution-bar-failed"
                :style="{ width: getFailedWidth() }"
              >
                <span v-if="(stats.total_resolutions || 0) - (stats.passed_resolutions || 0)">{{ Math.round(((stats.total_resolutions || 0) - (stats.passed_resolutions || 0)) / (stats.total_resolutions || 1) * 100) }}%</span>
              </div>
            </div>
            <div class="resolution-legend">
              <span class="legend-item"><span class="legend-color passed"></span> 通过</span>
              <span class="legend-item"><span class="legend-color failed"></span> 未通过</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getBranchMeetingStats } from '@/api/branchMeetings'
import type { BranchMeetingStats, BranchMeetingType } from '@/types'

const loading = ref(false)
const stats = ref<BranchMeetingStats>({
  total_meetings: 0,
  by_type: [],
  by_branch: [],
  by_month: [],
  avg_attendance_rate: 0,
  total_resolutions: 0,
  passed_resolutions: 0
})

const sortedByType = computed(() => {
  return [...(stats.value.by_type || [])].sort((a, b) => b.count - a.count)
})

const sortedByBranch = computed(() => {
  return [...(stats.value.by_branch || [])].sort((a, b) => b.count - a.count)
})

const maxTypeCount = computed(() => {
  const counts = sortedByType.value.map(t => t.count)
  return Math.max(...counts, 1)
})

const maxBranchCount = computed(() => {
  const counts = sortedByBranch.value.map(b => b.count)
  return Math.max(...counts, 1)
})

const maxMonthCount = computed(() => {
  const counts = (stats.value.by_month || []).map(m => m.count)
  return Math.max(...counts, 1)
})

const getTypeName = (type: string): string => {
  const typeMap: Record<string, string> = {
    branch_committee: '支委会',
    member_congress: '党员大会',
    group_meeting: '党小组会',
    party_lesson: '党课'
  }
  return typeMap[type] || type
}

const getTypeBarWidth = (count: number): string => {
  return `${(count / maxTypeCount.value) * 100}%`
}

const getBranchBarWidth = (count: number): string => {
  return `${(count / maxBranchCount.value) * 100}%`
}

const getMonthBarHeight = (count: number): string => {
  return `${(count / maxMonthCount.value) * 100}%`
}

const formatMonth = (month: string): string => {
  if (month.includes('-')) {
    const parts = month.split('-')
    return `${parts[1]}月`
  }
  return month
}

const getCircumference = (): number => {
  return 2 * Math.PI * 40
}

const getStrokeDashoffset = (rate: number): number => {
  const circumference = getCircumference()
  return circumference - (rate / 100) * circumference
}

const getAttendanceColor = (rate: number): string => {
  if (rate >= 90) return '#28a745'
  if (rate >= 70) return '#ffc107'
  return '#dc3545'
}

const getPassedWidth = (): string => {
  const total = stats.value.total_resolutions || 0
  const passed = stats.value.passed_resolutions || 0
  if (total === 0) return '0%'
  return `${(passed / total) * 100}%`
}

const getFailedWidth = (): string => {
  const total = stats.value.total_resolutions || 0
  const failed = (total || 0) - (stats.value.passed_resolutions || 0)
  if (total === 0) return '0%'
  return `${(failed / total) * 100}%`
}

const loadStats = async () => {
  try {
    loading.value = true
    const res = await getBranchMeetingStats()
    stats.value = res.data
  } catch (error) {
    console.error('加载会议统计失败', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.branch-meeting-stats {
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

.stats-card.full-width {
  grid-column: span 2;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.type-list,
.branch-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-item,
.branch-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.type-info,
.branch-info {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 110px;
  flex-shrink: 0;
}

.type-rank,
.branch-rank {
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
  flex-shrink: 0;
}

.type-name,
.branch-name {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-bar,
.branch-bar {
  flex: 1;
  height: 24px;
  background: var(--bg-light);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.type-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), #5bc0de);
  border-radius: var(--radius-sm);
  transition: width 0.5s ease;
}

.branch-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745, #6fbf73);
  border-radius: var(--radius-sm);
  transition: width 0.5s ease;
}

.type-count,
.branch-count {
  font-size: 13px;
  color: var(--text-secondary);
  width: 50px;
  text-align: right;
  flex-shrink: 0;
}

.monthly-chart {
  padding: 10px 0;
}

.chart-container {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 200px;
  padding: 0 20px;
  gap: 10px;
}

.chart-bar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 60px;
}

.chart-bar-wrapper {
  width: 100%;
  height: 160px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.chart-bar {
  width: 70%;
  background: linear-gradient(180deg, var(--primary-color), #4a90e2);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  position: relative;
  min-height: 5px;
  transition: height 0.5s ease;
}

.chart-bar-label {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-color);
}

.chart-month-label {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.attendance-display {
  display: flex;
  align-items: center;
  gap: 30px;
}

.attendance-circle {
  position: relative;
  width: 140px;
  height: 140px;
  flex-shrink: 0;
}

.progress-ring {
  width: 100%;
  height: 100%;
}

.progress-ring-circle {
  transition: stroke-dashoffset 0.5s ease;
}

.attendance-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.attendance-number {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
}

.attendance-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.attendance-description {
  flex: 1;
}

.attendance-description p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
  line-height: 1.6;
}

.attendance-tips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.attendance-tips span {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.tip-good {
  background: #d4edda;
  color: #155724;
}

.tip-medium {
  background: #fff3cd;
  color: #856404;
}

.tip-poor {
  background: #f8d7da;
  color: #721c24;
}

.resolution-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.resolution-numbers {
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.resolution-number-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resolution-total {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
}

.resolution-passed {
  font-size: 28px;
  font-weight: 700;
  color: #28a745;
}

.resolution-failed {
  font-size: 28px;
  font-weight: 700;
  color: #dc3545;
}

.resolution-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.resolution-bar {
  display: flex;
  height: 32px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-light);
}

.resolution-bar-passed {
  background: #28a745;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 600;
  transition: width 0.5s ease;
  min-width: 40px;
}

.resolution-bar-failed {
  background: #dc3545;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 600;
  transition: width 0.5s ease;
  min-width: 40px;
}

.resolution-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-color.passed {
  background: #28a745;
}

.legend-color.failed {
  background: #dc3545;
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

  .stats-card.full-width {
    grid-column: span 1;
  }

  .attendance-display {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .type-info,
  .branch-info {
    width: 90px;
  }

  .type-name,
  .branch-name {
    font-size: 12px;
  }
}
</style>
