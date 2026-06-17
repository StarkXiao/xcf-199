<template>
  <div class="party-dues-page container">
    <div class="page-header">
      <h1 class="page-title">💰 党费缴纳</h1>
      <router-link to="/party-dues/payments" class="btn btn-outline">
        📋 查看缴纳记录
      </router-link>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else class="dues-content">
      <div class="summary-card card">
        <h3 class="section-title">缴费概览</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-value paid">{{ summary?.year_paid?.toFixed(2) || '0.00' }} 元</div>
            <div class="summary-label">{{ summary?.current_year }}年已缴</div>
          </div>
          <div class="summary-item">
            <div class="summary-value unpaid">{{ summary?.year_unpaid?.toFixed(2) || '0.00' }} 元</div>
            <div class="summary-label">{{ summary?.current_year }}年待缴</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">{{ summary?.total_paid?.toFixed(2) || '0.00' }} 元</div>
            <div class="summary-label">累计已缴</div>
          </div>
          <div class="summary-item">
            <div class="summary-value" :class="{ 'overdue': summary?.overdue_count && summary.overdue_count > 0 }">
              {{ summary?.overdue_count || 0 }} 笔
            </div>
            <div class="summary-label">逾期账单</div>
          </div>
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
            <label>状态</label>
            <select v-model="filter.status" @change="loadBills">
              <option value="">全部</option>
              <option value="unpaid">待缴纳</option>
              <option value="paid">已缴纳</option>
              <option value="overdue">已逾期</option>
            </select>
          </div>
          <button class="btn btn-primary" @click="showRemediationModal = true" v-if="summary?.overdue_count && summary.overdue_count > 0">
            📝 申请补缴
          </button>
        </div>
      </div>

      <div class="bills-section card">
        <h3 class="section-title">
          账单列表
          <span class="badge" v-if="unpaidCount > 0">{{ unpaidCount }} 笔待缴</span>
        </h3>
        <div v-if="billsLoading" class="loading" style="padding: 30px;">
          <div class="spinner"></div>
        </div>
        <div v-else-if="bills.length === 0" class="empty-state" style="padding: 40px;">
          <p>暂无账单记录</p>
        </div>
        <div v-else class="bills-list">
          <div class="bill-header">
            <div class="bill-select">
              <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" :disabled="!hasUnpaidBills">
              <span>全选待缴</span>
            </div>
            <div class="bill-actions" v-if="selectedIds.length > 0">
              <span>已选 {{ selectedIds.length }} 笔，合计 {{ selectedTotal.toFixed(2) }} 元</span>
              <button class="btn btn-primary btn-sm" @click="handlePay">立即缴纳</button>
            </div>
          </div>
          <div v-for="bill in bills" :key="bill.id" class="bill-item" :class="bill.status">
            <div class="bill-checkbox">
              <input 
                type="checkbox" 
                v-model="selectedIds" 
                :value="bill.id"
                :disabled="bill.status === 'paid'"
              >
            </div>
            <div class="bill-info">
              <div class="bill-title">
                <span class="bill-period">{{ bill.bill_year }}年{{ bill.bill_month }}月党费</span>
                <span class="bill-status" :class="bill.status">{{ bill.status_text }}</span>
              </div>
              <div class="bill-detail">
                <span>缴费基数: {{ bill.base_amount.toFixed(2) }} 元</span>
                <span>应缴: {{ bill.dues_amount.toFixed(2) }} 元</span>
                <span v-if="bill.late_fee > 0" class="late-fee">滞纳金: {{ bill.late_fee.toFixed(2) }} 元</span>
              </div>
              <div class="bill-deadline">
                缴费截止: {{ bill.payment_deadline }}
              </div>
            </div>
            <div class="bill-amount">
              <div class="amount-total">
                {{ bill.status === 'paid' ? '已缴' : '应缴' }}: 
                <span class="amount-value">{{ bill.total_amount.toFixed(2) }} 元</span>
              </div>
              <button 
                v-if="bill.status !== 'paid'" 
                class="btn btn-primary btn-sm" 
                @click="handleSinglePay(bill)"
              >
                立即缴纳
              </button>
              <span v-else class="paid-time">
                缴纳时间: {{ formatDate(bill.paid_at!) }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="bills.length > 0" class="pagination">
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

    <div v-if="showPayModal" class="modal-overlay" @click.self="showPayModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>党费缴纳</h3>
          <button class="close-btn" @click="showPayModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="pay-summary">
            <div class="pay-row">
              <span>缴费笔数</span>
              <span>{{ payingBills.length }} 笔</span>
            </div>
            <div class="pay-row">
              <span>缴费月份</span>
              <span>{{ payingBills.map(b => `${b.bill_year}年${b.bill_month}月`).join('、') }}</span>
            </div>
            <div class="pay-row">
              <span>党费合计</span>
              <span>{{ payingBills.reduce((sum, b) => sum + b.dues_amount, 0).toFixed(2) }} 元</span>
            </div>
            <div class="pay-row" v-if="payingBills.some(b => b.late_fee > 0)">
              <span>滞纳金</span>
              <span class="late-fee">{{ payingBills.reduce((sum, b) => sum + b.late_fee, 0).toFixed(2) }} 元</span>
            </div>
            <div class="pay-row total">
              <span>应付总额</span>
              <span class="total-amount">{{ payingTotal.toFixed(2) }} 元</span>
            </div>
          </div>
          <div class="form-group">
            <label>支付方式 *</label>
            <select v-model="payForm.payment_method">
              <option value="">请选择支付方式</option>
              <option value="alipay">支付宝</option>
              <option value="wechat">微信支付</option>
              <option value="bank_transfer">银行转账</option>
              <option value="cash">现金</option>
            </select>
          </div>
          <div class="form-group">
            <label>支付凭证号</label>
            <input type="text" v-model="payForm.payment_reference" placeholder="请输入交易流水号（选填）">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showPayModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmPay" :disabled="paying || !payForm.payment_method">
            {{ paying ? '缴纳中...' : '确认缴纳' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showRemediationModal" class="modal-overlay" @click.self="showRemediationModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>补缴申请</h3>
          <button class="close-btn" @click="showRemediationModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>起始年月 *</label>
              <div class="date-inputs">
                <select v-model="remediationForm.start_year">
                  <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
                </select>
                <select v-model="remediationForm.start_month">
                  <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>结束年月 *</label>
              <div class="date-inputs">
                <select v-model="remediationForm.end_year">
                  <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
                </select>
                <select v-model="remediationForm.end_month">
                  <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
                </select>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>补缴原因 *</label>
            <textarea 
              v-model="remediationForm.reason" 
              rows="3" 
              placeholder="请说明补缴原因（如：外出学习、工作调动等）"
            ></textarea>
          </div>
          <div class="remediation-preview" v-if="remediationMonths > 0">
            <div class="preview-row">
              <span>补缴月数</span>
              <span>{{ remediationMonths }} 个月</span>
            </div>
            <div class="preview-row">
              <span>预估金额</span>
              <span>约 {{ estimatedAmount.toFixed(2) }} 元（含滞纳金1%）</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showRemediationModal = false">取消</button>
          <button 
            class="btn btn-primary" 
            @click="handleSubmitRemediation" 
            :disabled="submitting || !remediationForm.reason"
          >
            {{ submitting ? '提交中...' : '提交申请' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getMyDuesBills, getMyDuesSummary, payDues, submitRemediation as submitRemediationApi } from '@/api/partyDues'
import type { PartyDuesBill, PartyDuesSummary } from '@/types'

const loading = ref(false)
const billsLoading = ref(false)
const summary = ref<PartyDuesSummary | null>(null)
const bills = ref<PartyDuesBill[]>([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const currentYear = new Date().getFullYear()

const filter = ref({
  year: null as number | null,
  status: ''
})

const selectedIds = ref<number[]>([])
const selectAll = ref(false)
const showPayModal = ref(false)
const showRemediationModal = ref(false)
const payingBills = ref<PartyDuesBill[]>([])
const paying = ref(false)
const submitting = ref(false)

const payForm = ref({
  payment_method: '',
  payment_reference: ''
})

const remediationForm = ref({
  start_year: currentYear,
  start_month: 1,
  end_year: currentYear,
  end_month: new Date().getMonth(),
  reason: ''
})

const yearOptions = computed(() => {
  const years = []
  for (let y = currentYear - 2; y <= currentYear; y++) {
    years.push(y)
  }
  return years
})

const totalPages = computed(() => Math.ceil(total.value / pageSize))

const unpaidCount = computed(() => bills.value.filter(b => b.status !== 'paid').length)

const hasUnpaidBills = computed(() => bills.value.some(b => b.status !== 'paid'))

const selectedTotal = computed(() => {
  return bills.value
    .filter(b => selectedIds.value.includes(b.id))
    .reduce((sum, b) => sum + b.total_amount, 0)
})

const payingTotal = computed(() => {
  return payingBills.value.reduce((sum, b) => sum + b.total_amount, 0)
})

const remediationMonths = computed(() => {
  const start = new Date(remediationForm.value.start_year, remediationForm.value.start_month - 1)
  const end = new Date(remediationForm.value.end_year, remediationForm.value.end_month - 1)
  if (end < start) return 0
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
  return months
})

const estimatedAmount = computed(() => {
  if (!summary.value?.user_config?.monthly_income) return 0
  const income = summary.value.user_config.monthly_income
  let rate = 0.005
  if (income > 3000) rate = 0.01
  if (income > 5000) rate = 0.015
  if (income > 10000) rate = 0.02
  const base = income * rate * remediationMonths.value
  return base * 1.01
})

const loadSummary = async () => {
  loading.value = true
  try {
    const res = await getMyDuesSummary()
    summary.value = res.data
  } catch (error) {
    console.error('加载概览失败', error)
  } finally {
    loading.value = false
  }
}

const loadBills = async () => {
  billsLoading.value = true
  try {
    const params: any = { page: page.value, page_size: pageSize }
    if (filter.value.year) params.year = filter.value.year
    if (filter.value.status) params.status = filter.value.status
    const res = await getMyDuesBills(params)
    bills.value = res.data.list
    total.value = res.data.total
    selectedIds.value = []
    selectAll.value = false
  } catch (error) {
    console.error('加载账单失败', error)
  } finally {
    billsLoading.value = false
  }
}

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedIds.value = bills.value.filter(b => b.status !== 'paid').map(b => b.id)
  } else {
    selectedIds.value = []
  }
}

const changePage = (newPage: number) => {
  page.value = newPage
  loadBills()
}

const handleSinglePay = (bill: PartyDuesBill) => {
  payingBills.value = [bill]
  payForm.value = { payment_method: '', payment_reference: '' }
  showPayModal.value = true
}

const handlePay = () => {
  if (selectedIds.value.length === 0) {
    alert('请选择要缴纳的账单')
    return
  }
  payingBills.value = bills.value.filter(b => selectedIds.value.includes(b.id))
  payForm.value = { payment_method: '', payment_reference: '' }
  showPayModal.value = true
}

const confirmPay = async () => {
  if (!payForm.value.payment_method) {
    alert('请选择支付方式')
    return
  }
  paying.value = true
  try {
    await payDues({
      bill_ids: payingBills.value.map(b => b.id),
      payment_method: payForm.value.payment_method,
      payment_reference: payForm.value.payment_reference
    })
    alert('缴纳成功')
    showPayModal.value = false
    loadSummary()
    loadBills()
  } catch (error: any) {
    alert(error.response?.data?.message || '缴纳失败')
  } finally {
    paying.value = false
  }
}

const handleSubmitRemediation = async () => {
  if (!remediationForm.value.reason) {
    alert('请填写补缴原因')
    return
  }
  if (remediationMonths.value <= 0) {
    alert('请选择有效的补缴时间段')
    return
  }
  submitting.value = true
  try {
    await submitRemediationApi({
      start_year: remediationForm.value.start_year,
      start_month: remediationForm.value.start_month,
      end_year: remediationForm.value.end_year,
      end_month: remediationForm.value.end_month,
      reason: remediationForm.value.reason
    })
    alert('补缴申请已提交，请等待管理员审核')
    showRemediationModal.value = false
  } catch (error: any) {
    alert(error.response?.data?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadSummary()
  loadBills()
})
</script>

<style scoped>
.party-dues-page {
  max-width: 900px;
  padding-bottom: 40px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.summary-item {
  text-align: center;
  padding: 15px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.summary-value.paid {
  color: var(--success-color);
}

.summary-value.unpaid {
  color: var(--warning-color);
}

.summary-value.overdue {
  color: var(--danger-color);
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
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge {
  background: var(--danger-color);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 400;
}

.bill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-light);
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
}

.bill-select {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.bill-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.bill-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: 12px;
  transition: all 0.2s;
}

.bill-item:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.bill-item.paid {
  opacity: 0.7;
}

.bill-item.overdue {
  border-color: var(--danger-color);
  background: rgba(239, 68, 68, 0.03);
}

.bill-checkbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.bill-info {
  flex: 1;
}

.bill-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.bill-period {
  font-size: 15px;
  font-weight: 600;
}

.bill-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.bill-status.paid {
  background: rgba(34, 197, 94, 0.1);
  color: var(--success-color);
}

.bill-status.unpaid {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning-color);
}

.bill-status.overdue {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
}

.bill-detail {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.bill-detail .late-fee {
  color: var(--danger-color);
}

.bill-deadline {
  font-size: 12px;
  color: var(--text-muted);
}

.bill-amount {
  text-align: right;
  min-width: 140px;
}

.amount-total {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.amount-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.paid-time {
  font-size: 12px;
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

.modal {
  background: white;
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
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

.modal-header h3 {
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

.pay-summary {
  background: var(--bg-light);
  padding: 16px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}

.pay-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}

.pay-row.total {
  border-top: 1px solid var(--border-color);
  margin-top: 8px;
  padding-top: 12px;
  font-weight: 600;
}

.total-amount {
  font-size: 20px;
  color: var(--primary-color);
}

.late-fee {
  color: var(--danger-color);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--text-secondary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-family: inherit;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.date-inputs {
  display: flex;
  gap: 8px;
}

.date-inputs select {
  flex: 1;
}

.remediation-preview {
  background: var(--primary-light);
  padding: 12px;
  border-radius: var(--radius-sm);
  margin-top: 12px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
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
