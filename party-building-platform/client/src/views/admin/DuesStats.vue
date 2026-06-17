<template>
  <div class="admin-dues-stats">
    <div class="page-header">
      <h2 class="page-title">党费台账统计</h2>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="loadAllStats">
          🔄 刷新
        </button>
        <button class="btn btn-primary" @click="exportLedger">
          📥 导出台账
        </button>
      </div>
    </div>

    <div class="time-filter card">
      <div class="filter-row">
        <div class="filter-item">
          <label>统计年份</label>
          <select v-model="yearFilter" @change="loadAllStats">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
          </select>
        </div>
        <div class="filter-item">
          <label>统计维度</label>
          <select v-model="dimension" @change="loadAllStats">
            <option value="month">按月统计</option>
            <option value="branch">按支部统计</option>
            <option value="user">按人员统计</option>
          </select>
        </div>
        <div class="filter-item" v-if="dimension === 'branch' || dimension === 'user'">
          <label>支部</label>
          <select v-model="branchFilter" @change="loadAllStats">
            <option value="">全部支部</option>
            <option v-for="b in branches" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="overview-cards">
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-info">
          <div class="stat-value">¥{{ overview?.total_paid?.toFixed(2) || overview?.payment_total?.toFixed(2) || '0.00' }}</div>
          <div class="stat-label">本年缴费总额</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-info">
          <div class="stat-value">{{ overview?.paid_bills || 0 }}</div>
          <div class="stat-label">已缴费账单</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚠️</div>
        <div class="stat-info">
          <div class="stat-value" :class="{ danger: overview?.overdue_bills && overview.overdue_bills > 0 }">
            {{ overview?.overdue_bills || 0 }}
          </div>
          <div class="stat-label">逾期账单</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <div class="stat-value">{{ overview?.payment_rate ? overview.payment_rate.toFixed(1) : '0' }}%</div>
          <div class="stat-label">缴费完成率</div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else>
      <div class="card" v-if="dimension === 'month'">
        <h3 class="section-title">{{ yearFilter }}年 按月统计</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 100px;">月份</th>
              <th style="width: 120px;">应缴人数</th>
              <th style="width: 120px;">已缴人数</th>
              <th style="width: 120px;">未缴人数</th>
              <th style="width: 140px;">应缴总额</th>
              <th style="width: 140px;">已缴总额</th>
              <th style="width: 140px;">未缴总额</th>
              <th style="width: 100px;">完成率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in monthlyStats" :key="item.bill_month || item.month">
              <td class="month-cell">{{ (item.bill_month || item.month) }}月</td>
              <td>{{ item.total_bills || item.total_users }}</td>
              <td class="success">{{ item.paid_bills || item.paid_users }}</td>
              <td class="danger">{{ item.overdue_bills || item.unpaid_users }}</td>
              <td>¥{{ item.total_dues.toFixed(2) }}</td>
              <td class="success">¥{{ item.paid_amount.toFixed(2) }}</td>
              <td class="danger">¥{{ item.unpaid_amount.toFixed(2) }}</td>
              <td>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: (item.payment_rate || item.completion_rate || 0) + '%' }"></div>
                  <span class="progress-text">{{ (item.payment_rate || item.completion_rate || 0).toFixed(1) }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td><strong>合计</strong></td>
              <td><strong>{{ monthlyTotal.total_users }}</strong></td>
              <td class="success"><strong>{{ monthlyTotal.paid_users }}</strong></td>
              <td class="danger"><strong>{{ monthlyTotal.unpaid_users }}</strong></td>
              <td><strong>¥{{ monthlyTotal.total_amount.toFixed(2) }}</strong></td>
              <td class="success"><strong>¥{{ monthlyTotal.paid_amount.toFixed(2) }}</strong></td>
              <td class="danger"><strong>¥{{ monthlyTotal.unpaid_amount.toFixed(2) }}</strong></td>
              <td><strong>{{ monthlyTotal.completion_rate.toFixed(1) }}%</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="card" v-if="dimension === 'branch'">
        <h3 class="section-title">{{ yearFilter }}年 按支部统计</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>支部名称</th>
              <th style="width: 120px;">党员人数</th>
              <th style="width: 120px;">已缴人数</th>
              <th style="width: 120px;">未缴人数</th>
              <th style="width: 140px;">应缴总额</th>
              <th style="width: 140px;">已缴总额</th>
              <th style="width: 140px;">未缴总额</th>
              <th style="width: 100px;">完成率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in branchStats" :key="item.branch">
              <td class="branch-cell">
                <span class="branch-icon">🏢</span>
                {{ item.branch || '未分配' }}
              </td>
              <td>{{ item.member_count || item.total_users }}</td>
              <td class="success">{{ item.paid_bills || item.paid_users }}</td>
              <td class="danger">{{ item.overdue_bills || item.unpaid_users }}</td>
              <td>¥{{ item.total_dues.toFixed(2) }}</td>
              <td class="success">¥{{ item.paid_amount.toFixed(2) }}</td>
              <td class="danger">¥{{ item.unpaid_amount.toFixed(2) }}</td>
              <td>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: (item.payment_rate || item.completion_rate || 0) + '%' }"></div>
                  <span class="progress-text">{{ (item.payment_rate || item.completion_rate || 0).toFixed(1) }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td><strong>合计</strong></td>
              <td><strong>{{ branchTotal.total_users }}</strong></td>
              <td class="success"><strong>{{ branchTotal.paid_users }}</strong></td>
              <td class="danger"><strong>{{ branchTotal.unpaid_users }}</strong></td>
              <td><strong>¥{{ branchTotal.total_amount.toFixed(2) }}</strong></td>
              <td class="success"><strong>¥{{ branchTotal.paid_amount.toFixed(2) }}</strong></td>
              <td class="danger"><strong>¥{{ branchTotal.unpaid_amount.toFixed(2) }}</strong></td>
              <td><strong>{{ branchTotal.completion_rate.toFixed(1) }}%</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="card" v-if="dimension === 'user'">
        <h3 class="section-title">{{ yearFilter }}年 按人员统计</h3>
        <div class="user-filter">
          <input
            v-model="userKeyword"
            type="text"
            class="form-input"
            placeholder="搜索党员姓名..."
            style="width: 200px;"
          >
          <div class="status-filter">
            <label><input type="checkbox" v-model="showUnpaidOnly"> 仅显示未缴</label>
          </div>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 60px;">ID</th>
                <th>党员姓名</th>
                <th style="width: 120px;">所属支部</th>
                <th style="width: 100px;">月收入</th>
                <th style="width: 100px;">月缴费</th>
                <th style="width: 100px;">应缴月数</th>
                <th style="width: 100px;">已缴月数</th>
                <th style="width: 100px;">未缴月数</th>
                <th style="width: 130px;">应缴总额</th>
                <th style="width: 130px;">已缴总额</th>
                <th style="width: 130px;">未缴总额</th>
                <th style="width: 100px;">完成率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredUserStats" :key="item.id || item.user_id">
                <td>{{ item.id || item.user_id }}</td>
                <td>
                  <div class="user-info">
                    <img :src="item.avatar || item.user?.avatar || '/default-avatar.png'" class="user-avatar" alt="avatar">
                    <span>{{ item.real_name || item.user?.real_name }}</span>
                  </div>
                </td>
                <td>{{ item.branch || item.user?.branch || '-' }}</td>
                <td>¥{{ item.total_dues ? (item.total_dues / (item.total_bills || 12)).toFixed(2) : '-' }}</td>
                <td>¥{{ item.total_dues ? (item.total_dues / (item.total_bills || 12)).toFixed(2) : '-' }}</td>
                <td>{{ item.total_bills || item.total_months }}</td>
                <td class="success">{{ item.paid_bills || item.paid_months }}</td>
                <td class="danger">{{ item.overdue_bills || item.unpaid_months }}</td>
                <td>¥{{ item.total_dues.toFixed(2) }}</td>
                <td class="success">¥{{ item.paid_amount.toFixed(2) }}</td>
                <td class="danger">¥{{ item.unpaid_amount.toFixed(2) }}</td>
                <td>
                  <div class="progress-bar small">
                    <div class="progress-fill" :style="{ width: (item.payment_rate || item.completion_rate || 0) + '%' }"></div>
                    <span class="progress-text">{{ (item.payment_rate || item.completion_rate || 0).toFixed(1) }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="filteredUserStats.length === 0" class="empty-state">
          <p>暂无数据</p>
        </div>

        <div v-if="userStats.length > pageSize" class="pagination">
          <button :disabled="userPage <= 1" @click="changeUserPage(userPage - 1)">上一页</button>
          <span class="page-info">第 {{ userPage }} 页 / 共 {{ userTotalPages }} 页</span>
          <button :disabled="userPage >= userTotalPages" @click="changeUserPage(userPage + 1)">下一页</button>
        </div>
      </div>

      <div class="card">
        <h3 class="section-title">未缴费人员明细</h3>
        <div v-if="unpaidList.length === 0" class="empty-state">
          <p>🎉 所有党员均已按时缴费！</p>
        </div>
        <div v-else class="unpaid-list">
          <div v-for="item in unpaidList" :key="item.id" class="unpaid-item">
            <div class="unpaid-user">
              <img :src="item.avatar || item.user?.avatar || '/default-avatar.png'" class="user-avatar" alt="avatar">
              <div class="user-detail">
                <div class="user-name">{{ item.real_name || item.user?.real_name }}</div>
                <div class="user-branch">{{ item.branch || item.user?.branch || '未分配支部' }}</div>
              </div>
            </div>
            <div class="unpaid-info">
              <span class="unpaid-months">
                欠缴 {{ (item.overdue_bills || 1) }} 个月
                <span class="unpaid-amount">¥{{ (item.unpaid_amount || item.total_amount).toFixed(2) }}</span>
              </span>
              <span class="unpaid-bills">
                {{ item.bill_year }}年{{ item.bill_month }}月
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getDuesStatsOverview, getDuesStatsMonthly, getDuesStatsByBranch, getDuesStatsByUser, getDuesUnpaidList } from '@/api/partyDues'
import type { 
  DuesStatsOverview, 
  DuesMonthlyStats, 
  DuesBranchStats, 
  DuesUserStats,
  DuesUnpaidItem,
  PartyDuesMonthStats,
  PartyDuesBranchStats,
  PartyDuesUserStats
} from '@/types'

const loading = ref(false)
const yearFilter = ref(new Date().getFullYear())
const dimension = ref('month')
const branchFilter = ref('')
const userKeyword = ref('')
const showUnpaidOnly = ref(false)
const userPage = ref(1)
const pageSize = 10

const branches = ref<string[]>(['第一支部', '第二支部', '第三支部'])
const yearOptions = computed(() => {
  const years = []
  const current = new Date().getFullYear()
  for (let y = current; y >= current - 2; y--) {
    years.push(y)
  }
  return years
})

const overview = ref<any>(null)
const monthlyStats = ref<any[]>([])
const branchStats = ref<any[]>([])
const userStats = ref<any[]>([])
const unpaidList = ref<any[]>([])

const userTotalPages = computed(() => Math.ceil(filteredUserStats.value.length / pageSize))

const paginatedUserStats = computed(() => {
  const start = (userPage.value - 1) * pageSize
  return filteredUserStats.value.slice(start, start + pageSize)
})

const filteredUserStats = computed(() => {
  let list = userStats.value
  if (userKeyword.value) {
    const keyword = userKeyword.value.toLowerCase()
    list = list.filter(item => {
      const name = (item.real_name || item.user?.real_name || '').toLowerCase()
      return name.includes(keyword)
    })
  }
  if (showUnpaidOnly.value) {
    list = list.filter(item => item.unpaid_amount > 0)
  }
  return list
})

const monthlyTotal = computed(() => {
  return monthlyStats.value.reduce((acc: any, item: any) => ({
    total_users: acc.total_users + (item.total_bills || item.total_users || 0),
    paid_users: acc.paid_users + (item.paid_bills || item.paid_users || 0),
    unpaid_users: acc.unpaid_users + (item.overdue_bills || item.unpaid_users || 0),
    total_amount: acc.total_amount + (item.total_dues || item.total_amount || 0),
    paid_amount: acc.paid_amount + (item.paid_amount || 0),
    unpaid_amount: acc.unpaid_amount + (item.unpaid_amount || 0),
    completion_rate: (acc.total_amount + (item.total_dues || item.total_amount || 0)) > 0 
      ? (acc.paid_amount + (item.paid_amount || 0)) / (acc.total_amount + (item.total_dues || item.total_amount || 0)) * 100 
      : 0
  }), {
    total_users: 0,
    paid_users: 0,
    unpaid_users: 0,
    total_amount: 0,
    paid_amount: 0,
    unpaid_amount: 0,
    completion_rate: 0
  })
})

const branchTotal = computed(() => {
  return branchStats.value.reduce((acc: any, item: any) => ({
    total_users: acc.total_users + (item.member_count || item.total_users || 0),
    paid_users: acc.paid_users + (item.paid_bills || item.paid_users || 0),
    unpaid_users: acc.unpaid_users + (item.overdue_bills || item.unpaid_users || 0),
    total_amount: acc.total_amount + (item.total_dues || item.total_amount || 0),
    paid_amount: acc.paid_amount + (item.paid_amount || 0),
    unpaid_amount: acc.unpaid_amount + (item.unpaid_amount || 0),
    completion_rate: (acc.total_amount + (item.total_dues || item.total_amount || 0)) > 0 
      ? (acc.paid_amount + (item.paid_amount || 0)) / (acc.total_amount + (item.total_dues || item.total_amount || 0)) * 100 
      : 0
  }), {
    total_users: 0,
    paid_users: 0,
    unpaid_users: 0,
    total_amount: 0,
    paid_amount: 0,
    unpaid_amount: 0,
    completion_rate: 0
  })
})

const loadAllStats = async () => {
  loading.value = true
  try {
    const params = { year: yearFilter.value }
    const [overviewRes, monthlyRes, branchRes, userRes, unpaidRes] = await Promise.all([
      getDuesStatsOverview(),
      getDuesStatsMonthly(params),
      getDuesStatsByBranch(params),
      getDuesStatsByUser(params),
      getDuesUnpaidList(params)
    ])
    overview.value = overviewRes.data
    monthlyStats.value = monthlyRes.data
    branchStats.value = branchRes.data
    
    const userData = userRes.data as any
    userStats.value = userData.list || userData
    
    const unpaidData = unpaidRes.data as any
    unpaidList.value = unpaidData.list || unpaidData
  } catch (error) {
    console.error('加载统计数据失败', error)
  } finally {
    loading.value = false
  }
}

const changeUserPage = (newPage: number) => {
  userPage.value = newPage
}

const exportLedger = () => {
  alert('导出功能开发中...')
}

onMounted(() => {
  loadAllStats()
})
</script>

<style scoped>
.admin-dues-stats {
  max-width: 1400px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item label {
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.filter-item select {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: white;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.stat-value.danger {
  color: var(--danger-color);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.user-filter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.status-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-secondary);
}

.status-filter input {
  width: 16px;
  height: 16px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 12px 16px;
  background: var(--bg-light);
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border-color);
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
}

.data-table tr:hover {
  background: var(--bg-light);
}

.data-table tfoot .total-row {
  background: var(--primary-light);
  font-weight: 600;
}

.data-table tfoot .total-row:hover {
  background: var(--primary-light);
}

.success {
  color: var(--success-color);
  font-weight: 500;
}

.danger {
  color: var(--danger-color);
  font-weight: 500;
}

.month-cell {
  font-weight: 600;
  color: var(--primary-color);
}

.branch-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.branch-icon {
  font-size: 18px;
}

.progress-bar {
  position: relative;
  width: 100%;
  height: 24px;
  background: var(--bg-light);
  border-radius: 12px;
  overflow: hidden;
}

.progress-bar.small {
  height: 20px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), var(--success-color));
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.user-detail .user-name {
  font-weight: 500;
}

.user-detail .user-branch {
  font-size: 12px;
  color: var(--text-secondary);
}

.unpaid-list {
  max-height: 400px;
  overflow-y: auto;
}

.unpaid-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: 12px;
  background: rgba(239, 68, 68, 0.02);
}

.unpaid-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.unpaid-info {
  text-align: right;
}

.unpaid-months {
  display: block;
  font-weight: 600;
  color: var(--danger-color);
  margin-bottom: 4px;
}

.unpaid-amount {
  font-size: 18px;
  margin-left: 8px;
}

.unpaid-bills {
  font-size: 12px;
  color: var(--text-secondary);
}

.card {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 20px;
  margin-bottom: 20px;
}

.table-container {
  overflow-x: auto;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
}

.page-info {
  font-size: 14px;
  color: var(--text-secondary);
}

.btn {
  padding: 6px 16px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-secondary {
  background: var(--bg-light);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--border-color);
}

.form-input {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-family: inherit;
}

.pagination button {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
