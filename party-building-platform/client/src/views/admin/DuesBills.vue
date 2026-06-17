<template>
  <div class="admin-dues-bills">
    <div class="page-header">
      <h2 class="page-title">党费账单管理</h2>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="loadBills">
          🔄 刷新
        </button>
        <button class="btn btn-primary" @click="generateBills" :disabled="generating">
          {{ generating ? '生成中...' : '📅 生成本月账单' }}
        </button>
      </div>
    </div>

    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-value total">{{ stats?.total_bills || 0 }}</div>
        <div class="stat-label">账单总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value paid">{{ stats?.paid_bills || 0 }}</div>
        <div class="stat-label">已缴纳</div>
      </div>
      <div class="stat-card">
        <div class="stat-value unpaid">{{ stats?.unpaid_bills || 0 }}</div>
        <div class="stat-label">待缴纳</div>
      </div>
      <div class="stat-card">
        <div class="stat-value overdue">{{ stats?.overdue_bills || 0 }}</div>
        <div class="stat-label">已逾期</div>
      </div>
    </div>

    <div class="filter-section card">
      <div class="filter-row">
        <div class="filter-item">
          <label>年份</label>
          <select v-model="filter.year" @change="loadBills">
            <option :value="null">全部</option>
            <option :value="currentYear">{{ currentYear }}年</option>
            <option :value="currentYear - 1">{{ currentYear - 1 }}年</option>
          </select>
        </div>
        <div class="filter-item">
          <label>月份</label>
          <select v-model="filter.month" @change="loadBills">
            <option :value="null">全部</option>
            <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
          </select>
        </div>
        <div class="filter-item">
          <label>状态</label>
          <select v-model="filter.status" @change="loadBills">
            <option value="">全部</option>
            <option value="unpaid">待缴纳</option>
            <option value="paid">已缴纳</option>
            <option value="overdue">已逾期</option>
          </select>
        </div>
        <div class="filter-item">
          <label>支部</label>
          <select v-model="filter.branch" @change="loadBills">
            <option value="">全部</option>
            <option v-for="b in branches" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>
        <div class="filter-item">
          <input
            v-model="filter.keyword"
            type="text"
            class="form-input"
            placeholder="搜索党员姓名..."
            @keyup.enter="loadBills"
            style="width: 180px;"
          >
        </div>
        <button class="btn btn-secondary" @click="loadBills">搜索</button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else class="table-container card">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 60px;">ID</th>
            <th>党员信息</th>
            <th style="width: 100px;">所属支部</th>
            <th style="width: 100px;">账单月份</th>
            <th style="width: 120px;">缴费基数</th>
            <th style="width: 100px;">应缴金额</th>
            <th style="width: 100px;">滞纳金</th>
            <th style="width: 110px;">合计</th>
            <th style="width: 100px;">状态</th>
            <th style="width: 140px;">缴费截止</th>
            <th style="width: 180px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bill in bills" :key="bill.id">
            <td>{{ bill.id }}</td>
            <td>
              <div class="user-info">
                <img :src="bill.user?.avatar || '/default-avatar.png'" class="user-avatar" alt="avatar">
                <div class="user-detail">
                  <div class="user-name">{{ bill.real_name || bill.user?.real_name }}</div>
                  <div class="user-username">{{ bill.phone || bill.user?.username }}</div>
                </div>
              </div>
            </td>
            <td>{{ bill.branch || bill.user?.branch || '-' }}</td>
            <td>{{ bill.bill_year }}年{{ bill.bill_month }}月</td>
            <td>¥{{ bill.base_amount.toFixed(2) }}</td>
            <td>¥{{ bill.dues_amount.toFixed(2) }}</td>
            <td class="late-fee" v-if="bill.late_fee > 0">¥{{ bill.late_fee.toFixed(2) }}</td>
            <td v-else>-</td>
            <td class="total-amount">¥{{ bill.total_amount.toFixed(2) }}</td>
            <td>
              <span class="status-tag" :class="bill.status">{{ bill.status_text }}</span>
            </td>
            <td>{{ bill.payment_deadline }}</td>
            <td>
              <button class="btn btn-sm btn-secondary" @click="viewDetail(bill)">详情</button>
              <button 
                v-if="bill.status !== 'paid'" 
                class="btn btn-sm btn-primary" 
                @click="handleMarkPaid(bill)"
                style="margin-left: 6px;"
              >
                标记已缴
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="bills.length === 0" class="empty-state">
        <p>暂无账单记录</p>
      </div>
    </div>

    <div v-if="bills.length > 0" class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <span class="page-info">第 {{ page }} 页 / 共 {{ totalPages }} 页，共 {{ total }} 条</span>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
    </div>

    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="modal-title">账单详情</h3>
          <button class="close-btn" @click="showDetailModal = false">×</button>
        </div>
        <div class="modal-body" v-if="selectedBill">
          <div class="detail-section">
            <h4 class="detail-title">基本信息</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">账单ID</span>
                <span class="detail-value">{{ selectedBill.id }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">账单月份</span>
                <span class="detail-value">{{ selectedBill.bill_year }}年{{ selectedBill.bill_month }}月</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">党员姓名</span>
                <span class="detail-value">{{ selectedBill.real_name || selectedBill.user?.real_name }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">所属支部</span>
                <span class="detail-value">{{ selectedBill.branch || selectedBill.user?.branch || '-' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4 class="detail-title">缴费明细</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">缴费基数</span>
                <span class="detail-value">¥{{ selectedBill.base_amount.toFixed(2) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">缴纳比例</span>
                <span class="detail-value">{{ ((selectedBill.rate || selectedBill.dues_amount / selectedBill.base_amount) * 100).toFixed(1) }}%</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">应缴党费</span>
                <span class="detail-value">¥{{ selectedBill.dues_amount.toFixed(2) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">滞纳金</span>
                <span class="detail-value" :class="{ 'late-fee': selectedBill.late_fee > 0 }">
                  ¥{{ selectedBill.late_fee.toFixed(2) }}
                </span>
              </div>
              <div class="detail-item total">
                <span class="detail-label">合计金额</span>
                <span class="detail-value">¥{{ selectedBill.total_amount.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4 class="detail-title">状态信息</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">当前状态</span>
                <span class="status-tag" :class="selectedBill.status">{{ selectedBill.status_text }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">缴费截止</span>
                <span class="detail-value">{{ selectedBill.payment_deadline }}</span>
              </div>
              <div class="detail-item" v-if="selectedBill.paid_at">
                <span class="detail-label">缴纳时间</span>
                <span class="detail-value">{{ formatDateTime(selectedBill.paid_at) }}</span>
              </div>
              <div class="detail-item" v-if="selectedBill.payment_method">
                <span class="detail-label">支付方式</span>
                <span class="detail-value">{{ paymentMethodText[selectedBill.payment_method] }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section" v-if="selectedBill.payments && selectedBill.payments.length > 0">
            <h4 class="detail-title">缴费记录</h4>
            <div class="payments-list">
              <div v-for="payment in selectedBill.payments" :key="payment.id" class="payment-record">
                <div class="payment-info">
                  <span class="payment-amount">¥{{ (payment.amount || payment.payment_amount).toFixed(2) }}</span>
                  <span class="payment-method">{{ paymentMethodText[payment.payment_method] || payment.payment_method }}</span>
                </div>
                <div class="payment-time">{{ formatDateTime(payment.created_at) }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDetailModal = false">关闭</button>
          <button 
            v-if="selectedBill && selectedBill.status !== 'paid'" 
            class="btn btn-primary" 
            @click="handleMarkPaid(selectedBill)"
          >
            标记已缴纳
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  getDuesBills, 
  getDuesBillsStats, 
  generateMonthlyBills,
  markBillPaid
} from '@/api/partyDues'
import type { PartyDuesBill, PartyDuesBillsStats } from '@/types'

const loading = ref(false)
const generating = ref(false)
const bills = ref<PartyDuesBill[]>([])
const stats = ref<PartyDuesBillsStats | null>(null)
const page = ref(1)
const pageSize = 15
const total = ref(0)
const currentYear = new Date().getFullYear()
const branches = ref<string[]>(['第一支部', '第二支部', '第三支部'])

const filter = ref({
  year: null as number | null,
  month: null as number | null,
  status: '',
  branch: '',
  keyword: ''
})

const showDetailModal = ref(false)
const selectedBill = ref<PartyDuesBill | null>(null)

const paymentMethodText: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信支付',
  bank_transfer: '银行转账',
  cash: '现金'
}

const totalPages = computed(() => Math.ceil(total.value / pageSize))

const loadStats = async () => {
  try {
    const res = await getDuesBillsStats()
    stats.value = res.data
  } catch (error) {
    console.error('加载统计失败', error)
  }
}

const loadBills = async () => {
  loading.value = true
  try {
    const params: any = { page: page.value, page_size: pageSize }
    if (filter.value.year) params.year = filter.value.year
    if (filter.value.month) params.month = filter.value.month
    if (filter.value.status) params.status = filter.value.status
    if (filter.value.branch) params.branch = filter.value.branch
    if (filter.value.keyword) params.keyword = filter.value.keyword
    const res = await getDuesBills(params)
    bills.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载账单失败', error)
  } finally {
    loading.value = false
  }
}

const generateBills = async () => {
  if (!confirm('确定要生成本月所有党员的党费账单吗？')) return
  generating.value = true
  try {
    const now = new Date()
    await generateMonthlyBills({ year: now.getFullYear(), month: now.getMonth() + 1 })
    alert('账单生成成功')
    loadStats()
    loadBills()
  } catch (error: any) {
    alert(error.response?.data?.message || '生成失败')
  } finally {
    generating.value = false
  }
}

const changePage = (newPage: number) => {
  page.value = newPage
  loadBills()
}

const viewDetail = (bill: PartyDuesBill) => {
  selectedBill.value = bill
  showDetailModal.value = true
}

const handleMarkPaid = async (bill: PartyDuesBill) => {
  const userName = bill.real_name || bill.user?.real_name || '该党员'
  if (!confirm(`确定将 ${userName} ${bill.bill_year}年${bill.bill_month}月 的账单标记为已缴纳吗？`)) return
  try {
    await markBillPaid(bill.id, {
      payment_method: 'cash',
      payment_reference: '管理员手动标记'
    })
    alert('标记成功')
    loadStats()
    loadBills()
    if (showDetailModal.value) {
      showDetailModal.value = false
    }
  } catch (error: any) {
    alert(error.response?.data?.message || '操作失败')
  }
}

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadStats()
  loadBills()
})
</script>

<style scoped>
.admin-dues-bills {
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

.stats-cards {
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
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-value.total {
  color: var(--primary-color);
}

.stat-value.paid {
  color: var(--success-color);
}

.stat-value.unpaid {
  color: var(--warning-color);
}

.stat-value.overdue {
  color: var(--danger-color);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-item label {
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.filter-item select {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: white;
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-tag.paid {
  background: rgba(34, 197, 94, 0.1);
  color: var(--success-color);
}

.status-tag.unpaid {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning-color);
}

.status-tag.overdue {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
}

.late-fee {
  color: var(--danger-color);
}

.total-amount {
  font-weight: 600;
  color: var(--primary-color);
}

.detail-section {
  margin-bottom: 20px;
}

.detail-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
}

.detail-item.total {
  grid-column: span 2;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.detail-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.detail-value {
  font-size: 13px;
  font-weight: 500;
}

.payments-list {
  max-height: 150px;
  overflow-y: auto;
}

.payment-record {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.payment-record:last-child {
  border-bottom: none;
}

.payment-info {
  display: flex;
  gap: 12px;
}

.payment-amount {
  font-weight: 600;
  color: var(--success-color);
}

.payment-method {
  font-size: 13px;
  color: var(--text-secondary);
}

.payment-time {
  font-size: 12px;
  color: var(--text-muted);
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: var(--radius-lg);
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
  line-height: 1;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
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

.user-detail .user-username {
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

.btn-danger {
  background: var(--danger-color);
  color: white;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
