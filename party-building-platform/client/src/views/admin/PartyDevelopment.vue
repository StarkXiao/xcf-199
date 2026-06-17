<template>
  <div class="admin-party-development">
    <div class="page-header">
      <h2 class="page-title">党员发展管理</h2>
    </div>

    <div v-if="reminders.length > 0" class="reminders-section card">
      <h3 class="section-title">⏰ 节点到期提醒（7天内）</h3>
      <div class="reminders-list">
        <div v-for="r in reminders" :key="r.id" class="reminder-item warning">
          <span class="reminder-icon">⚠️</span>
          <div class="reminder-info">
            <span class="reminder-user">{{ r.real_name }} ({{ r.branch }})</span>
            <span class="reminder-stage">{{ r.stage_name }} - 截止：{{ formatDate(r.deadline_date) }}</span>
          </div>
          <button class="btn btn-sm btn-outline" @click="viewDetail(r.development_id)">查看</button>
        </div>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">总人数</div>
      </div>
      <div class="stat-card card">
        <div class="stat-value application">{{ stats.application }}</div>
        <div class="stat-label">入党申请</div>
      </div>
      <div class="stat-card card">
        <div class="stat-value activist">{{ stats.activist }}</div>
        <div class="stat-label">积极分子</div>
      </div>
      <div class="stat-card card">
        <div class="stat-value candidate">{{ stats.candidate }}</div>
        <div class="stat-label">发展对象</div>
      </div>
      <div class="stat-card card">
        <div class="stat-value probation">{{ stats.probation }}</div>
        <div class="stat-label">预备期</div>
      </div>
      <div class="stat-card card">
        <div class="stat-value formal">{{ stats.completed }}</div>
        <div class="stat-label">已转正</div>
      </div>
    </div>

    <div class="filter-section card">
      <div class="filter-row">
        <div class="filter-item">
          <label>当前阶段</label>
          <select v-model="filters.stage" @change="loadList">
            <option value="">全部</option>
            <option value="application">入党申请</option>
            <option value="activist">积极分子培养</option>
            <option value="candidate">发展对象考察</option>
            <option value="probationary">预备党员接收</option>
            <option value="probation">预备期管理</option>
            <option value="formal">转正审批</option>
          </select>
        </div>
        <div class="filter-item">
          <label>发展状态</label>
          <select v-model="filters.status" @change="loadList">
            <option value="">全部</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <div v-if="listLoading" class="loading">
        <div class="spinner"></div>
      </div>

      <div v-else-if="list.length === 0" class="empty-state">
        暂无数据
      </div>

      <div v-else class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>所属支部</th>
              <th>手机号</th>
              <th>当前阶段</th>
              <th>整体状态</th>
              <th>申请时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>{{ item.real_name }}</td>
              <td>{{ item.branch }}</td>
              <td>{{ item.phone }}</td>
              <td>
                <span class="stage-tag" :class="item.current_stage">
                  {{ getStageName(item.current_stage) }}
                </span>
              </td>
              <td>
                <span class="status-tag" :class="item.overall_status">
                  {{ item.overall_status === 'completed' ? '已完成' : '进行中' }}
                </span>
              </td>
              <td>{{ formatDate(item.application_date) }}</td>
              <td>
                <button class="btn btn-sm btn-primary" @click="viewDetail(item.id)">详情</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="total > pageSize" class="pagination">
        <button class="btn btn-outline btn-sm" :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 页，共 {{ total }} 条</span>
        <button class="btn btn-outline btn-sm" :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
      </div>
    </div>

    <div v-if="showDetail" class="modal-overlay" @click.self="closeDetail">
      <div class="modal large">
        <div class="modal-header">
          <h3>党员发展详情 - {{ detailData?.user?.real_name }}</h3>
          <button class="btn-icon" @click="closeDetail">×</button>
        </div>
        <div class="modal-body scrollable">
          <div v-if="detailLoading" class="loading">
            <div class="spinner"></div>
          </div>
          <div v-else-if="detailData" class="detail-content">
            <div class="info-section card-inner">
              <h4 class="sub-title">基本信息</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">姓名</span>
                  <span class="info-value">{{ detailData.user?.real_name }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">所属支部</span>
                  <span class="info-value">{{ detailData.user?.branch }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">手机号</span>
                  <span class="info-value">{{ detailData.user?.phone }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">当前阶段</span>
                  <span class="info-value">{{ getStageName(detailData.current_stage) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">支部书记</span>
                  <span class="info-value">{{ detailData.branch_secretary || '-' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">培养联系人</span>
                  <span class="info-value">
                    {{ [detailData.introducer1, detailData.introducer2].filter(Boolean).join('、') || '-' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="info-section card-inner">
              <div class="section-header-row">
                <h4 class="sub-title">阶段进度管理</h4>
                <button class="btn btn-sm btn-outline" @click="showEditInfo = true">编辑信息</button>
              </div>
              <div class="stages-manager">
                <div
                  v-for="stage in detailData.stages"
                  :key="stage.id"
                  class="stage-manager-item"
                  :class="[stage.status, { active: stage.stage_code === detailData.current_stage }]"
                >
                  <div class="stage-head">
                    <div class="stage-title">
                      <span class="stage-icon">{{ getStageIcon(stage.stage_code) }}</span>
                      <span class="stage-name">{{ stage.stage_name }}</span>
                      <span class="status-tag" :class="stage.status">
                        {{ getStatusText(stage.status) }}
                      </span>
                    </div>
                    <button
                      v-if="stage.status !== 'pending'"
                      class="btn btn-sm btn-outline"
                      @click="openStageModal(stage)"
                    >
                      审核/编辑
                    </button>
                  </div>
                  <div class="stage-body">
                    <div class="stage-desc">{{ stage.description }}</div>
                    <div class="stage-meta">
                      <span v-if="stage.start_date">开始：{{ formatDate(stage.start_date) }}</span>
                      <span v-if="stage.end_date">完成：{{ formatDate(stage.end_date) }}</span>
                      <span v-if="stage.deadline_date" class="deadline">截止：{{ formatDate(stage.deadline_date) }}</span>
                    </div>
                    <div v-if="stage.review_opinion" class="review-box">
                      <span class="review-label">{{ stage.reviewer }} 审核意见：</span>
                      <span>{{ stage.review_opinion }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="info-section card-inner">
              <h4 class="sub-title">材料归档</h4>
              <div v-if="!detailData.materials || detailData.materials.length === 0" class="empty-state small">
                暂无材料
              </div>
              <div v-else class="materials-grid">
                <div v-for="mat in detailData.materials" :key="mat.id" class="material-card">
                  <span class="material-icon">📄</span>
                  <div class="material-info">
                    <span class="material-name">{{ mat.material_name }}</span>
                    <span class="material-meta">
                      {{ getStageName(mat.stage_code) }} · {{ formatDateTime(mat.created_at) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="info-section card-inner">
              <h4 class="sub-title">操作历史</h4>
              <div class="history-timeline">
                <div v-for="h in detailData.history" :key="h.id" class="history-item">
                  <div class="history-timeline-dot"></div>
                  <div class="history-content">
                    <div class="history-top">
                      <span class="history-action">{{ getActionText(h.action_type) }}</span>
                      <span class="history-stage-tag">{{ getStageName(h.stage_code) }}</span>
                    </div>
                    <p v-if="h.action_detail" class="history-desc">{{ h.action_detail }}</p>
                    <div class="history-foot">
                      <span>{{ h.operator_name || '系统' }}</span>
                      <span>{{ formatDateTime(h.created_at) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showStageModal && currentEditingStage" class="modal-overlay" @click.self="showStageModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>阶段审核 - {{ currentEditingStage.stage_name }}</h3>
          <button class="btn-icon" @click="showStageModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>阶段状态</label>
            <select v-model="stageForm.status">
              <option value="in_progress">进行中</option>
              <option value="completed">已完成（通过）</option>
              <option value="rejected">已驳回</option>
            </select>
          </div>
          <div class="form-group">
            <label>审核意见</label>
            <textarea v-model="stageForm.review_opinion" placeholder="请输入审核意见（选填）"></textarea>
          </div>
          <div class="form-group">
            <label>开始日期</label>
            <input v-model="stageForm.start_date" type="date" />
          </div>
          <div class="form-group">
            <label>截止日期</label>
            <input v-model="stageForm.deadline_date" type="date" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showStageModal = false">取消</button>
          <button class="btn btn-primary" @click="submitStageUpdate">确认提交</button>
        </div>
      </div>
    </div>

    <div v-if="showEditInfo" class="modal-overlay" @click.self="showEditInfo = false">
      <div class="modal">
        <div class="modal-header">
          <h3>编辑基本信息</h3>
          <button class="btn-icon" @click="showEditInfo = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>支部书记</label>
            <input v-model="editForm.branch_secretary" type="text" placeholder="请输入支部书记姓名" />
          </div>
          <div class="form-group">
            <label>培养联系人1</label>
            <input v-model="editForm.introducer1" type="text" placeholder="请输入培养联系人1姓名" />
          </div>
          <div class="form-group">
            <label>培养联系人2</label>
            <input v-model="editForm.introducer2" type="text" placeholder="请输入培养联系人2姓名" />
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="editForm.remarks" placeholder="请输入备注信息（选填）"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showEditInfo = false">取消</button>
          <button class="btn btn-primary" @click="submitEditInfo">确认保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getAdminDevList,
  getAdminDevDetail,
  getReminders,
  updateStage,
  updateDevInfo
} from '@/api/partyDevelopment'
import type {
  PartyDevelopment,
  PartyDevelopmentListItem,
  PartyDevelopmentStage,
  PartyReminder,
  PartyStageCode
} from '@/types'

const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const list = ref<PartyDevelopmentListItem[]>([])
const listLoading = ref(false)
const reminders = ref<PartyReminder[]>([])

const filters = ref({
  stage: '',
  status: ''
})

const stats = computed(() => {
  const result = {
    total: 0,
    application: 0,
    activist: 0,
    candidate: 0,
    probation: 0,
    completed: 0
  }
  result.total = total.value
  list.value.forEach(item => {
    if (item.current_stage === 'application') result.application++
    else if (item.current_stage === 'activist') result.activist++
    else if (item.current_stage === 'candidate' || item.current_stage === 'probationary') result.candidate++
    else if (item.current_stage === 'probation') result.probation++
    if (item.overall_status === 'completed') result.completed++
  })
  return result
})

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const showDetail = ref(false)
const detailLoading = ref(false)
const detailData = ref<PartyDevelopment | null>(null)

const showStageModal = ref(false)
const currentEditingStage = ref<PartyDevelopmentStage | null>(null)
const stageForm = ref({
  status: '',
  review_opinion: '',
  start_date: '',
  deadline_date: ''
})

const showEditInfo = ref(false)
const editForm = ref({
  branch_secretary: '',
  introducer1: '',
  introducer2: '',
  remarks: ''
})

const stageIcons: Record<PartyStageCode, string> = {
  application: '📝',
  activist: '🌱',
  candidate: '🔍',
  probationary: '🎉',
  probation: '⏳',
  formal: '🎖️'
}

const stageNames: Record<PartyStageCode, string> = {
  application: '入党申请',
  activist: '积极分子培养',
  candidate: '发展对象考察',
  probationary: '预备党员接收',
  probation: '预备期管理',
  formal: '转正审批'
}

const getStageIcon = (code?: PartyStageCode) => code ? stageIcons[code] : '📋'
const getStageName = (code?: PartyStageCode) => code ? stageNames[code] || '-' : '-'

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待开始',
    in_progress: '进行中',
    completed: '已完成',
    rejected: '已驳回'
  }
  return map[status] || status
}

const getActionText = (action: string) => {
  const map: Record<string, string> = {
    submit: '提交申请',
    review: '审核',
    start: '阶段启动',
    upload: '材料上传',
    delete_material: '材料删除',
    update_info: '信息更新'
  }
  return map[action] || action
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDateInput = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const loadList = async () => {
  listLoading.value = true
  try {
    const res = await getAdminDevList({
      page: page.value,
      page_size: pageSize.value,
      stage: filters.value.stage,
      status: filters.value.status
    })
    list.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载列表失败', error)
  } finally {
    listLoading.value = false
  }
}

const loadReminders = async () => {
  try {
    const res = await getReminders()
    reminders.value = res.data
  } catch (error) {
    console.error('加载提醒失败', error)
  }
}

const goPage = (p: number) => {
  page.value = p
  loadList()
}

const viewDetail = async (id: number) => {
  showDetail.value = true
  detailLoading.value = true
  try {
    const res = await getAdminDevDetail(id)
    detailData.value = res.data
  } catch (error) {
    console.error('加载详情失败', error)
  } finally {
    detailLoading.value = false
  }
}

const closeDetail = () => {
  showDetail.value = false
  detailData.value = null
}

const openStageModal = (stage: PartyDevelopmentStage) => {
  currentEditingStage.value = stage
  stageForm.value = {
    status: stage.status,
    review_opinion: stage.review_opinion || '',
    start_date: formatDateInput(stage.start_date),
    deadline_date: formatDateInput(stage.deadline_date)
  }
  showStageModal.value = true
}

const submitStageUpdate = async () => {
  if (!detailData.value || !currentEditingStage.value) return
  try {
    const res = await updateStage(detailData.value.id, currentEditingStage.value.stage_code, {
      status: stageForm.value.status as any,
      review_opinion: stageForm.value.review_opinion || undefined,
      start_date: stageForm.value.start_date ? new Date(stageForm.value.start_date).toISOString() : undefined,
      deadline_date: stageForm.value.deadline_date ? new Date(stageForm.value.deadline_date).toISOString() : undefined
    })
    detailData.value = res.data
    showStageModal.value = false
    currentEditingStage.value = null
    await loadList()
    await loadReminders()
  } catch (error) {
    console.error('更新阶段失败', error)
    alert('更新失败，请稍后重试')
  }
}

const openEditInfo = () => {
  if (!detailData.value) return
  editForm.value = {
    branch_secretary: detailData.value.branch_secretary || '',
    introducer1: detailData.value.introducer1 || '',
    introducer2: detailData.value.introducer2 || '',
    remarks: detailData.value.remarks || ''
  }
  showEditInfo.value = true
}

const submitEditInfo = async () => {
  if (!detailData.value) return
  try {
    const res = await updateDevInfo(detailData.value.id, {
      branch_secretary: editForm.value.branch_secretary || undefined,
      introducer1: editForm.value.introducer1 || undefined,
      introducer2: editForm.value.introducer2 || undefined,
      remarks: editForm.value.remarks || undefined
    })
    detailData.value = res.data
    showEditInfo.value = false
    await loadList()
  } catch (error) {
    console.error('更新信息失败', error)
    alert('更新失败，请稍后重试')
  }
}

onMounted(() => {
  loadList()
  loadReminders()
})
</script>

<style scoped>
.admin-party-development {
  max-width: 1200px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
}

.card {
  margin-bottom: 16px;
  padding: 20px;
}

.card-inner {
  background: var(--bg-light);
  padding: 16px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.reminders-section {
  background: #fffbe6;
  border: 1px solid #ffe58f;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 14px;
}

.sub-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 14px;
  padding-left: 10px;
  border-left: 3px solid var(--primary-color);
}

.reminders-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reminder-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-radius: var(--radius-sm);
}

.reminder-icon {
  font-size: 20px;
}

.reminder-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reminder-user {
  font-weight: 600;
  color: var(--text-primary);
}

.reminder-stage {
  font-size: 13px;
  color: var(--text-secondary);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;
  padding: 16px 12px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-value.application { color: #1890ff; }
.stat-value.activist { color: #52c41a; }
.stat-value.candidate { color: #fa8c16; }
.stat-value.probation { color: #722ed1; }
.stat-value.formal { color: var(--primary-color); }

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.filter-section {
  padding: 16px 20px;
}

.filter-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 10px;
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
  background: white;
  font-size: 14px;
  min-width: 140px;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.empty-state.small {
  padding: 20px;
  font-size: 13px;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.data-table th {
  background: var(--bg-light);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.data-table tr:hover td {
  background: var(--bg-light);
}

.stage-tag {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.stage-tag.application { background: #e6f7ff; color: #1890ff; }
.stage-tag.activist { background: #f6ffed; color: #52c41a; }
.stage-tag.candidate { background: #fff7e6; color: #fa8c16; }
.stage-tag.probationary { background: #fff1f0; color: #f5222d; }
.stage-tag.probation { background: #f9f0ff; color: #722ed1; }
.stage-tag.formal { background: #ffe0e3; color: var(--primary-color); }

.status-tag {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.status-tag.in_progress { background: #fff1f0; color: var(--primary-color); }
.status-tag.completed { background: #f6ffed; color: #52c41a; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding-top: 16px;
}

.page-info {
  font-size: 13px;
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
  padding: 20px;
}

.modal {
  background: white;
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal.large {
  max-width: 880px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.modal-body.scrollable {
  max-height: calc(90vh - 120px);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 24px;
  border-top: 1px solid var(--border-color);
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.btn-icon:hover {
  background: var(--bg-light);
  color: var(--text-primary);
}

.info-section {
  margin-bottom: 20px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.info-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.stages-manager {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stage-manager-item {
  padding: 14px;
  background: white;
  border-radius: var(--radius-sm);
  border: 2px solid transparent;
}

.stage-manager-item.active {
  border-color: var(--primary-color);
  background: #fff1f0;
}

.stage-manager-item.completed {
  opacity: 0.85;
}

.stage-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.stage-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stage-icon {
  font-size: 20px;
}

.stage-name {
  font-weight: 600;
  color: var(--text-primary);
}

.stage-body {
  padding-left: 30px;
}

.stage-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.stage-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.stage-meta .deadline {
  color: var(--warning-color, #fa8c16);
  font-weight: 500;
}

.review-box {
  padding: 8px 12px;
  background: var(--bg-light);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.review-label {
  color: var(--text-secondary);
  margin-right: 6px;
}

.materials-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.material-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: white;
  border-radius: var(--radius-sm);
}

.material-icon {
  font-size: 24px;
}

.material-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.material-name {
  font-size: 14px;
  font-weight: 500;
}

.material-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.history-timeline {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.history-item {
  display: flex;
  gap: 12px;
}

.history-timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--primary-color);
  margin-top: 6px;
  flex-shrink: 0;
}

.history-content {
  flex: 1;
}

.history-top {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 4px;
}

.history-action {
  font-weight: 600;
  color: var(--text-primary);
}

.history-stage-tag {
  padding: 1px 8px;
  background: var(--bg-light);
  border-radius: 8px;
  font-size: 11px;
  color: var(--text-secondary);
}

.history-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 4px;
}

.history-foot {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-light);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: white;
  font-family: inherit;
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

@media (max-width: 992px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
  }

  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .materials-grid {
    grid-template-columns: 1fr;
  }

  .filter-row {
    flex-direction: column;
  }
}
</style>
