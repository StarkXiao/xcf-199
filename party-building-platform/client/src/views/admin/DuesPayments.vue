<template>
  <div class="admin-dues-payments">
    <div class="page-header">
      <h2 class="page-title">党费缴纳管理</h2>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="loadPayments">
          🔄 刷新
        </button>
        <button class="btn btn-primary" @click="exportData">
          📥 导出数据
        </button>
      </div>
    </div>

    <div class="card">
      <h3 class="section-title">补缴申请管理</h3>
      <div class="remediation-section">
        <div class="remediation-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: remediationTab === 'pending' }"
            @click="remediationTab = 'pending'"
          >
            待审核 <span class="tab-badge" v-if="remediationStats && remediationStats.pending > 0">{{ remediationStats.pending }}</span>
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: remediationTab === 'approved' }"
            @click="remediationTab = 'approved'"
          >
            已通过
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: remediationTab === 'rejected' }"
            @click="remediationTab = 'rejected'"
          >
            已拒绝
          </button>
        </div>

        <div v-if="remediationLoading" class="loading" style="padding: 30px;">
          <div class="spinner"></div>
        </div>

        <div v-else>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 60px;">ID</th>
                <th>申请人</th>
                <th style="width: 120px;">所属支部</th>
                <th style="width: 180px;">补缴时间段</th>
                <th style="width: 100px;">月数</th>
                <th>补缴原因</th>
                <th style="width: 100px;">状态</th>
                <th style="width: 140px;">申请时间</th>
                <th style="width: 180px;">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in remediationList" :key="item.id">
                <td>{{ item.id }}</td>
                <td>
                  <div class="user-info">
                    <img :src="item.avatar || item.user?.avatar || '/default-avatar.png'" class="user-avatar" alt="avatar">
                    <span>{{ item.real_name || item.user?.real_name }}</span>
                  </div>
                </td>
                <td>{{ item.branch || item.user?.branch || '-' }}</td>
                <td>{{ item.start_year }}年{{ item.start_month }}月 - {{ item.end_year }}年{{ item.end_month }}月</td>
                <td>{{ item.months_count || item.total_months }} 个月</td>
                <td class="reason-cell">{{ item.reason }}</td>
                <td>
                  <span class="status-tag" :class="item.status">
                    {{ statusText[item.status] }}
                  </span>
                </td>
                <td>{{ formatDateTime(item.created_at) }}</td>
                <td>
                  <button 
                    v-if="item.status === 'pending'" 
                    class="btn btn-sm btn-success" 
                    @click="handleApprove(item)"
                  >
                    通过
                  </button>
                  <button 
                    v-if="item.status === 'pending'" 
                    class="btn btn-sm btn-danger" 
                    @click="handleReject(item)"
                    style="margin-left: 6px;"
                  >
                    拒绝
                  </button>
                  <button 
                    class="btn btn-sm btn-secondary" 
                    @click="viewRemediationDetail(item)"
                  >
                    详情
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="remediationList.length === 0" class="empty-state">
            <p>暂无补缴申请</p>
          </div>
        </div>
      </div>
    </div>

    <div class="filter-section card">
      <h3 class="section-title">缴费记录查询</h3>
      <div class="filter-row">
        <div class="filter-item">
          <label>年份</label>
          <select v-model="filter.year" @change="loadPayments">
            <option :value="null">全部</option>
            <option :value="currentYear">{{ currentYear }}年</option>
            <option :value="currentYear - 1">{{ currentYear - 1 }}年</option>
          </select>
        </div>
        <div class="filter-item">
          <label>月份</label>
          <select v-model="filter.month" @change="loadPayments">
            <option :value="null">全部</option>
            <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
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
            <option value="true">补缴</option>
            <option value="false">正常缴纳</option>
          </select>
        </div>
        <div class="filter-item">
          <input
            v-model="filter.keyword"
            type="text"
            class="form-input"
            placeholder="搜索党员姓名..."
            @keyup.enter="loadPayments"
            style="width: 180px;"
          >
        </div>
        <button class="btn btn-secondary" @click="loadPayments">搜索</button>
      </div>
    </div>

    <div v-if="paymentsLoading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else class="table-container card">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 60px;">ID</th>
            <th>党员信息</th>
            <th style="width: 100px;">所属支部</th>
            <th style="width: 100px;">缴费月份</th>
            <th style="width: 120px;">缴费金额</th>
            <th style="width: 120px;">支付方式</th>
            <th style="width: 80px;">类型</th>
            <th style="width: 100px;">状态</th>
            <th style="width: 160px;">缴费时间</th>
            <th style="width: 120px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="payment in payments" :key="payment.id">
            <td>{{ payment.id }}</td>
            <td>
              <div class="user-info">
                <img :src="payment.avatar || payment.user?.avatar || '/default-avatar.png'" class="user-avatar" alt="avatar">
                <div class="user-detail">
                  <div class="user-name">{{ payment.real_name || payment.user?.real_name }}</div>
                  <div class="user-username">{{ payment.phone || payment.user?.username }}</div>
                </div>
              </div>
            </td>
            <td>{{ payment.branch || payment.user?.branch || '-' }}</td>
            <td>{{ payment.bill_year }}年{{ payment.bill_month }}月</td>
            <td class="amount">¥{{ (payment.amount || payment.payment_amount).toFixed(2) }}</td>
            <td>{{ paymentMethodText[payment.payment_method] || payment.payment_method }}</td>
            <td>
              <span class="type-tag" :class="{ remediation: payment.is_remediation }">
                {{ payment.is_remediation ? '补缴' : '正常' }}
              </span>
            </td>
            <td>
              <span class="status-tag" :class="payment.status">
                {{ paymentStatusText[payment.status] || payment.status }}
              </span>
            </td>
            <td>{{ formatDateTime(payment.created_at) }}</td>
            <td>
              <button class="btn btn-sm btn-secondary" @click="viewPaymentDetail(payment)">详情</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="payments.length === 0" class="empty-state">
        <p>暂无缴费记录</p>
      </div>
    </div>

    <div v-if="payments.length > 0" class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <span class="page-info">第 {{ page }} 页 / 共 {{ totalPages }} 页，共 {{ total }} 条</span>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
    </div>

    <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
      <div class="modal-content" style="max-width: 450px;">
        <div class="modal-header">
          <h3 class="modal-title">拒绝补缴申请</h3>
          <button class="close-btn" @click="showRejectModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">拒绝原因 *</label>
            <textarea 
              v-model="rejectReason" 
              class="form-input" 
              rows="3" 
              placeholder="请输入拒绝原因..."
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showRejectModal = false">取消</button>
          <button class="btn btn-danger" @click="confirmReject" :disabled="submitting">
            {{ submitting ? '提交中...' : '确认拒绝' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { 
  getDuesPayments,
  getDuesRemediations,
  getDuesRemediationStats,
  approveRemediation,
  rejectRemediation
} from '@/api/partyDues'
import type { PartyDuesPayment, PartyDuesRemediation } from '@/types'

const paymentsLoading = ref(false)
const remediationLoading = ref(false)
const submitting = ref(false)
const payments = ref<PartyDuesPayment[]>([])
const remediationList = ref<PartyDuesRemediation[]>([])
const remediationStats = ref<{ pending: number; approved: number; rejected: number } | null>(null)
const page = ref(1)
const pageSize = 15
const total = ref(0)
const currentYear = new Date().getFullYear()

const filter = ref({
  year: null as number | null,
  month: null as number | null,
  payment_method: '',
  is_remediation: '',
  keyword: ''
})

const remediationTab = ref('pending')
const showRejectModal = ref(false)
const selectedRemediation = ref<PartyDuesRemediation | null>(null)
const rejectReason = ref('')

const statusText: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已取消'
}

const paymentMethodText: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信支付',
  bank_transfer: '银行转账',
  cash: '现金'
}

const paymentStatusText: Record<string, string> = {
  success: '成功',
  pending: '处理中',
  failed: '失败',
  refunded: '已退款'
}

const totalPages = computed(() => Math.ceil(total.value / pageSize))

const loadRemediationStats = async () => {
  try {
    const res = await getDuesRemediationStats()
    remediationStats.value = res.data
  } catch (error) {
    console.error('加载补缴统计失败', error)
  }
}

const loadRemediations = async () => {
  remediationLoading.value = true
  try {
    const res = await getDuesRemediations({ 
      status: remediationTab.value,
      page: 1,
      page_size: 50
    })
    remediationList.value = res.data.list
  } catch (error) {
    console.error('加载补缴申请失败', error)
  } finally {
    remediationLoading.value = false
  }
}

const loadPayments = async () => {
  paymentsLoading.value = true
  try {
    const params: any = { page: page.value, page_size: pageSize }
    if (filter.value.year) params.year = filter.value.year
    if (filter.value.month) params.month = filter.value.month
    if (filter.value.payment_method) params.payment_method = filter.value.payment_method
    if (filter.value.is_remediation) params.is_remediation = filter.value.is_remediation
    if (filter.value.keyword) params.keyword = filter.value.keyword
    const res = await getDuesPayments(params)
    payments.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载缴费记录失败', error)
  } finally {
    paymentsLoading.value = false
  }
}

const changePage = (newPage: number) => {
  page.value = newPage
  loadPayments()
}

const handleApprove = async (item: PartyDuesRemediation) => {
  const userName = item.real_name || item.user?.real_name || '该党员'
  if (!confirm(`确定通过 ${userName} 的补缴申请吗？`)) return
  try {
    await approveRemediation(item.id)
    alert('已通过')
    loadRemediationStats()
    loadRemediations()
  } catch (error: any) {
    alert(error.response?.data?.message || '操作失败')
  }
}

const handleReject = (item: PartyDuesRemediation) => {
  selectedRemediation.value = item
  rejectReason.value = ''
  showRejectModal.value = true
}

const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    alert('请输入拒绝原因')
    return
  }
  if (!selectedRemediation.value) return
  
  submitting.value = true
  try {
    await rejectRemediation(selectedRemediation.value.id, { reject_reason: rejectReason.value })
    alert('已拒绝')
    showRejectModal.value = false
    loadRemediationStats()
    loadRemediations()
  } catch (error: any) {
    alert(error.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const viewRemediationDetail = (item: PartyDuesRemediation) => {
  const userName = item.real_name || item.user?.real_name || '-'
  const userBranch = item.branch || item.user?.branch || '-'
  const monthsCount = item.months_count || item.total_months || 0
  alert(`
补缴申请详情
============
申请人: ${userName}
支部: ${userBranch}
补缴时间: ${item.start_year}年${item.start_month}月 - ${item.end_year}年${item.end_month}月
补缴月数: ${monthsCount}个月
补缴原因: ${item.reason}
当前状态: ${statusText[item.status]}
${item.reject_reason ? '拒绝原因: ' + item.reject_reason : ''}
申请时间: ${formatDateTime(item.created_at)}
  `.trim())
}

const viewPaymentDetail = (payment: PartyDuesPayment) => {
  const userName = payment.real_name || payment.user?.real_name || '-'
  const userBranch = payment.branch || payment.user?.branch || '-'
  const amount = payment.amount || payment.payment_amount || 0
  alert(`
缴费详情
========
党员: ${userName}
支部: ${userBranch}
缴费月份: ${payment.bill_year}年${payment.bill_month}月
缴费金额: ¥${amount.toFixed(2)}
支付方式: ${paymentMethodText[payment.payment_method] || payment.payment_method}
缴费类型: ${payment.is_remediation ? '补缴' : '正常缴纳'}
${payment.payment_reference ? '支付凭证: ' + payment.payment_reference : ''}
当前状态: ${paymentStatusText[payment.status] || payment.status}
缴费时间: ${formatDateTime(payment.created_at)}
  `.trim())
}

const exportData = () => {
  alert('导出功能开发中...')
}

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

watch(remediationTab, () => {
  loadRemediations()
})

onMounted(() => {
  loadRemediationStats()
  loadRemediations()
  loadPayments()
})
</script>

<style scoped>
.admin-dues-payments {
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

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.remediation-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab-btn {
  padding: 8px 20px;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.tab-btn:hover {
  border-color: var(--primary-color);
}

.tab-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.tab-badge {
  background: var(--danger-color);
  color: white;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 11px;
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-tag.pending {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning-color);
}

.status-tag.approved, .status-tag.success {
  background: rgba(34, 197, 94, 0.1);
  color: var(--success-color);
}

.status-tag.rejected, .status-tag.failed {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
}

.status-tag.cancelled {
  background: rgba(156, 163, 175, 0.2);
  color: var(--text-secondary);
}

.type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: rgba(34, 197, 94, 0.1);
  color: var(--success-color);
}

.type-tag.remediation {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning-color);
}

.amount {
  font-weight: 600;
  color: var(--primary-color);
}

.reason-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.btn-danger:hover {
  background: #dc2626;
}

.btn-success {
  background: var(--success-color);
  color: white;
}

.btn-success:hover {
  background: #16a34a;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
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
