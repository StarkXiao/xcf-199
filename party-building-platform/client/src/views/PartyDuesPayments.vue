<template>
  <div class="dues-payments-page container">
    <div class="page-header">
      <h1 class="page-title">📋 我的缴纳记录</h1>
      <router-link to="/party-dues" class="btn btn-outline">
        ← 返回党费缴纳
      </router-link>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else class="payments-content">
      <div class="summary-card card">
        <div class="summary-item">
          <div class="summary-value">{{ (stats?.total_paid || 0) > 0 ? Math.ceil((stats?.total_paid || 0) / 10) : 0 }} 笔</div>
          <div class="summary-label">累计缴纳次数</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">{{ (stats?.total_paid || 0).toFixed(2) }} 元</div>
          <div class="summary-label">累计缴纳金额</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">{{ (stats?.year_paid || 0) > 0 ? Math.ceil((stats?.year_paid || 0) / 10) : 0 }} 笔</div>
          <div class="summary-label">本年缴纳次数</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">{{ (stats?.year_paid || 0).toFixed(2) }} 元</div>
          <div class="summary-label">本年缴纳金额</div>
        </div>
      </div>

      <div class="filter-section card">
        <div class="filter-row">
          <div class="filter-item">
            <label>年份</label>
            <select v-model="filter.year" @change="loadPayments">
              <option :value="null">全部</option>
              <option :value="currentYear">{{ currentYear }}年</option>
              <option :value="currentYear - 1">{{ currentYear - 1 }}年</option>
              <option :value="currentYear - 2">{{ currentYear - 2 }}年</option>
            </select>
          </div>
          <div class="filter-item">
            <label>支付方式</label>
            <select v-model="filter.payment_method" @change="loadPayments">
              <option value="">全部</option>
              <option value="alipay">支付宝</option>
              <option value="wechat">微信支付</option>
              <option value="bank_transfer">银行转账</option>
              <option value="cash">现金</option>
            </select>
          </div>
          <div class="filter-item">
            <label>补缴类型</label>
            <select v-model="filter.is_remediation" @change="loadPayments">
              <option value="">全部</option>
              <option value="false">正常缴纳</option>
              <option value="true">补缴</option>
            </select>
          </div>
        </div>
      </div>

      <div class="payments-section card">
        <h3 class="section-title">缴纳明细</h3>
        <div v-if="paymentsLoading" class="loading" style="padding: 30px;">
          <div class="spinner"></div>
        </div>
        <div v-else-if="payments.length === 0" class="empty-state" style="padding: 40px;">
          <p>暂无缴纳记录</p>
        </div>
        <div v-else class="payments-list">
          <div v-for="payment in payments" :key="payment.id" class="payment-item">
            <div class="payment-left">
              <div class="payment-icon" :class="{ 'remediation': payment.is_remediation }">
                {{ payment.is_remediation ? '🔄' : '💳' }}
              </div>
              <div class="payment-info">
                <div class="payment-title">
                  {{ payment.bill_year }}年{{ payment.bill_month }}月党费
                  <span v-if="payment.is_remediation" class="remediation-tag">补缴</span>
                </div>
                <div class="payment-detail">
                  <span>支付方式: {{ paymentMethodText[payment.payment_method] || payment.payment_method }}</span>
                  <span v-if="payment.payment_reference">凭证号: {{ payment.payment_reference }}</span>
                </div>
                <div class="payment-time">
                  缴纳时间: {{ formatDateTime(payment.created_at) }}
                </div>
              </div>
            </div>
            <div class="payment-right">
              <div class="payment-amount">+{{ (payment.amount || payment.payment_amount || 0).toFixed(2) }} 元</div>
              <div class="payment-status" :class="payment.status">
                {{ paymentStatusText[payment.status] || payment.status }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="payments.length > 0" class="pagination">
          <button 
            class="btn btn-outline btn-sm" 
            @click="changePage(page - 1)" 
            :disabled="page <= 1"
          >
            上一页
          </button>
          <span class="page-info">第 {{ page }} 页 / 共 {{ totalPages }} 页</span>
          <button 
            class="btn btn-outline btn-sm" 
            @click="changePage(page + 1)" 
            :disabled="page >= totalPages"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getMyDuesPayments, getMyDuesSummary } from '@/api/partyDues'
import type { PartyDuesPayment, PartyDuesSummary } from '@/types'

const loading = ref(false)
const paymentsLoading = ref(false)
const stats = ref<PartyDuesSummary | null>(null)
const payments = ref<PartyDuesPayment[]>([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const currentYear = new Date().getFullYear()

const filter = ref({
  year: null as number | null,
  payment_method: '',
  is_remediation: ''
})

const paymentMethodText: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信支付',
  bank_transfer: '银行转账',
  cash: '现金'
}

const paymentStatusText: Record<string, string> = {
  success: '缴纳成功',
  pending: '处理中',
  failed: '缴纳失败',
  refunded: '已退款'
}

const totalPages = computed(() => Math.ceil(total.value / pageSize))

const loadStats = async () => {
  loading.value = true
  try {
    const res = await getMyDuesSummary()
    stats.value = res.data
  } catch (error) {
    console.error('加载统计失败', error)
  } finally {
    loading.value = false
  }
}

const loadPayments = async () => {
  paymentsLoading.value = true
  try {
    const params: any = { page: page.value, page_size: pageSize }
    if (filter.value.year) params.year = filter.value.year
    if (filter.value.payment_method) params.payment_method = filter.value.payment_method
    if (filter.value.is_remediation) params.is_remediation = filter.value.is_remediation
    const res = await getMyDuesPayments(params)
    payments.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载缴纳记录失败', error)
  } finally {
    paymentsLoading.value = false
  }
}

const changePage = (newPage: number) => {
  page.value = newPage
  loadPayments()
}

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

onMounted(() => {
  loadStats()
  loadPayments()
})
</script>

<style scoped>
.dues-payments-page {
  max-width: 900px;
  padding-bottom: 40px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.summary-card {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.summary-item {
  text-align: center;
  padding: 20px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 4px;
}

.summary-label {
  font-size: 13px;
  color: var(--text-secondary);
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

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.payment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s;
}

.payment-item:last-child {
  border-bottom: none;
}

.payment-item:hover {
  background-color: var(--bg-light);
}

.payment-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.payment-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.payment-icon.remediation {
  background: rgba(245, 158, 11, 0.1);
}

.payment-info {
  flex: 1;
}

.payment-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.remediation-tag {
  background: var(--warning-color);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.payment-detail {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.payment-time {
  font-size: 12px;
  color: var(--text-muted);
}

.payment-right {
  text-align: right;
}

.payment-amount {
  font-size: 18px;
  font-weight: 700;
  color: var(--success-color);
  margin-bottom: 4px;
}

.payment-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}

.payment-status.success {
  background: rgba(34, 197, 94, 0.1);
  color: var(--success-color);
}

.payment-status.pending {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning-color);
}

.payment-status.failed {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
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

.empty-state {
  text-align: center;
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
</style>
