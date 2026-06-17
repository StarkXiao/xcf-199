<template>
  <div class="admin-party-transfer">
    <div class="page-header">
      <h2 class="page-title">🔄 组织关系转接审批</h2>
    </div>

    <div class="stats-row">
      <div class="stat-card card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">总申请</div>
      </div>
      <div class="stat-card card">
        <div class="stat-value processing">{{ stats.processing }}</div>
        <div class="stat-label">处理中</div>
      </div>
      <div class="stat-card card">
        <div class="stat-value completed">{{ stats.completed }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-card card">
        <div class="stat-value rejected">{{ stats.rejected }}</div>
        <div class="stat-label">已驳回</div>
      </div>
      <div class="stat-card card">
        <div class="stat-value cancelled">{{ stats.cancelled }}</div>
        <div class="stat-label">已撤销</div>
      </div>
      <div class="stat-card card">
        <div class="stat-value pending">{{ pendingCount }}</div>
        <div class="stat-label">待我审批</div>
      </div>
    </div>

    <div class="stats-row stage-stats" v-if="stats.by_stage && stats.by_stage.length > 0">
      <div
        v-for="s in stats.by_stage"
        :key="s.stage"
        class="stage-stat-card card"
        :class="{ highlight: s.count > 0 }"
      >
        <div class="stage-icon">{{ getStageIcon(s.stage) }}</div>
        <div class="stage-info">
          <div class="stage-count">{{ s.count }}</div>
          <div class="stage-label">{{ s.name }}</div>
        </div>
      </div>
    </div>

    <div class="filter-section card">
      <div class="filter-row">
        <div class="filter-item">
          <label>当前阶段</label>
          <select v-model="filters.stage" @change="loadList">
            <option value="">全部阶段</option>
            <option v-for="s in stageConfigs" :key="s.code" :value="s.code">{{ s.name }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label>转接状态</label>
          <select v-model="filters.status" @change="loadList">
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
            <option value="rejected">已驳回</option>
            <option value="cancelled">已撤销</option>
          </select>
        </div>
        <div class="filter-item">
          <label>转接类型</label>
          <select v-model="filters.type" @change="loadList">
            <option value="">全部类型</option>
            <option value="internal">省内转接</option>
            <option value="external">跨省转接</option>
          </select>
        </div>
        <div class="filter-item search-item">
          <label>搜索</label>
          <input v-model="filters.keyword" type="text" placeholder="姓名/支部" @keyup.enter="loadList" />
        </div>
        <div class="filter-actions">
          <button class="btn btn-sm btn-outline" @click="resetFilters">重置</button>
          <button class="btn btn-sm btn-primary" @click="loadList">查询</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div v-if="listLoading" class="loading">
        <div class="spinner"></div>
      </div>

      <div v-else-if="list.length === 0" class="empty-state">
        暂无转接申请
      </div>

      <div v-else class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>申请人</th>
              <th>所属支部</th>
              <th>转接路径</th>
              <th>类型</th>
              <th>当前阶段</th>
              <th>整体状态</th>
              <th>申请时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>
                <div class="user-cell">
                  <span class="user-name">{{ item.real_name || '-' }}</span>
                  <span class="user-phone">{{ item.phone || '-' }}</span>
                </div>
              </td>
              <td>{{ item.user_branch || '-' }}</td>
              <td>
                <div class="transfer-path">
                  <span class="path-from">{{ item.from_branch }}</span>
                  <span class="path-arrow">→</span>
                  <span class="path-to">{{ item.to_branch }}</span>
                </div>
              </td>
              <td>
                <span class="type-tag" :class="item.transfer_type">
                  {{ item.transfer_type === 'internal' ? '省内' : '跨省' }}
                </span>
              </td>
              <td>
                <span class="stage-tag" :class="item.current_stage">
                  {{ getStageName(item.current_stage) }}
                </span>
              </td>
              <td>
                <span class="status-tag" :class="item.overall_status">
                  {{ getStatusText(item.overall_status) }}
                </span>
              </td>
              <td>{{ formatDateTime(item.created_at) }}</td>
              <td>
                <div class="table-actions">
                  <button class="btn btn-sm btn-primary" @click="viewDetail(item.id)">详情</button>
                  <button
                    v-if="canReview(item)"
                    class="btn btn-sm btn-success"
                    @click="openReviewModal(item)"
                  >审批</button>
                </div>
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
      <div class="modal xlarge">
        <div class="modal-header">
          <h3>转接申请详情 - {{ detailData?.real_name || detailData?.user?.real_name }}</h3>
          <button class="btn-icon" @click="closeDetail">×</button>
        </div>
        <div class="modal-body scrollable">
          <div v-if="detailLoading" class="loading">
            <div class="spinner"></div>
          </div>
          <div v-else-if="detailData" class="detail-content">
            <div class="detail-summary card-inner">
              <div class="summary-top">
                <h4 class="sub-title">📋 基本信息</h4>
                <div class="summary-badges">
                  <span class="badge stage">{{ getStageName(detailData.current_stage) }}</span>
                  <span class="badge overall" :class="detailData.overall_status">
                    {{ getStatusText(detailData.overall_status) }}
                  </span>
                  <span class="badge type" :class="detailData.transfer_type">
                    {{ detailData.transfer_type === 'internal' ? '省内转接' : '跨省转接' }}
                  </span>
                </div>
              </div>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">申请人</span>
                  <span class="info-value">{{ detailData.user?.real_name || '-' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">联系电话</span>
                  <span class="info-value">{{ detailData.user?.phone || '-' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">所属支部</span>
                  <span class="info-value">{{ detailData.user?.branch || '-' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">申请时间</span>
                  <span class="info-value">{{ formatDateTime(detailData.submit_date) }}</span>
                </div>
                <div class="info-item wide">
                  <span class="info-label">转接路径</span>
                  <span class="info-value highlight">
                    {{ detailData.from_branch }} → {{ detailData.to_branch }}
                  </span>
                </div>
                <div v-if="detailData.transfer_type === 'external'" class="info-item wide">
                  <span class="info-label">跨省单位</span>
                  <span class="info-value">
                    转出：{{ detailData.from_organization || '-' }}
                    &nbsp;&nbsp;|&nbsp;&nbsp;
                    转入：{{ detailData.to_organization || '-' }}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">预计完成</span>
                  <span class="info-value">{{ formatDate(detailData.expected_date) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">完成时间</span>
                  <span class="info-value">{{ detailData.completed_date ? formatDateTime(detailData.completed_date) : '-' }}</span>
                </div>
              </div>
              <div v-if="detailData.reason" class="reason-box">
                <span class="reason-label">转接原因：</span>
                <span>{{ detailData.reason }}</span>
              </div>
              <div v-if="detailData.remarks" class="reason-box">
                <span class="reason-label">备注：</span>
                <span>{{ detailData.remarks }}</span>
              </div>
            </div>

            <div class="timeline-section card-inner">
              <div class="section-header">
                <h4 class="sub-title">🔄 审批流程时间轴</h4>
                <button
                  v-if="canReview(detailData)"
                  class="btn btn-sm btn-success"
                  @click="openReviewModal(detailData)"
                >立即审批</button>
              </div>
              <div class="timeline">
                <div
                  v-for="(stage, index) in detailData.stages"
                  :key="stage.id"
                  class="timeline-item"
                  :class="[stage.status, { active: stage.stage_code === detailData.current_stage }]"
                >
                  <div class="timeline-connector">
                    <div class="timeline-node">
                      <span class="node-icon">{{ getStageIcon(stage.stage_code) }}</span>
                    </div>
                    <div v-if="index < detailData.stages!.length - 1" class="timeline-line"></div>
                  </div>
                  <div class="timeline-content">
                    <div class="timeline-header">
                      <div class="timeline-title-wrap">
                        <h5 class="stage-name">{{ stage.stage_name }}</h5>
                        <span class="status-tag" :class="stage.status">
                          {{ getStageStatusText(stage.status) }}
                        </span>
                      </div>
                      <div class="stage-handler">
                        <span class="handler-icon">👤</span>
                        {{ stage.handler || '-' }}
                      </div>
                    </div>
                    <p class="stage-description">{{ stage.description }}</p>
                    <div class="stage-meta">
                      <span v-if="stage.handle_date" class="meta-item">
                        📅 {{ formatDateTime(stage.handle_date) }}
                      </span>
                      <span v-if="stage.deadline_date && stage.status !== 'completed'" class="meta-item deadline">
                        ⏰ 截止：{{ formatDate(stage.deadline_date) }}
                      </span>
                    </div>
                    <div v-if="stage.opinion" class="review-opinion">
                      <span class="review-label">审批意见：</span>
                      <span>{{ stage.opinion }}</span>
                    </div>

                    <div
                      v-if="stage.stage_code === 'material_check' && (stage.status === 'in_progress' || stage.status === 'completed')"
                      class="materials-section"
                    >
                      <h6 class="materials-title">📁 转接材料校验</h6>
                      <div v-if="stageMaterials.length === 0" class="empty-materials">暂无材料</div>
                      <table v-else class="materials-table">
                        <thead>
                          <tr>
                            <th>材料名称</th>
                            <th>必需</th>
                            <th>大小</th>
                            <th>上传时间</th>
                            <th>校验状态</th>
                            <th>校验意见</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="mat in stageMaterials" :key="mat.id">
                            <td>
                              <span class="file-icon">{{ getFileIcon(mat.material_name, mat.material_type) }}</span>
                              <a
                                v-if="mat.file_url"
                                :href="getMaterialPreviewUrl(mat.file_url)"
                                target="_blank"
                                class="file-link"
                              >{{ mat.material_name }}</a>
                              <span v-else>{{ mat.material_name }}</span>
                            </td>
                            <td>
                              <span v-if="mat.is_required" class="required-badge">必需</span>
                              <span v-else class="optional-badge">可选</span>
                            </td>
                            <td>{{ mat.file_size ? formatFileSize(mat.file_size) : '-' }}</td>
                            <td>{{ mat.file_url ? formatDateTime(mat.created_at) : '-' }}</td>
                            <td>
                              <span class="verify-tag" :class="mat.verify_status">
                                {{ getVerifyStatusText(mat.verify_status) }}
                              </span>
                            </td>
                            <td>{{ mat.verify_opinion || '-' }}</td>
                            <td>
                              <div class="table-actions">
                                <a
                                  v-if="mat.file_url"
                                  :href="getMaterialPreviewUrl(mat.file_url)"
                                  target="_blank"
                                  class="link-btn"
                                >预览</a>
                                <a
                                  v-if="mat.file_url"
                                  :href="getMaterialDownloadUrl(mat.id)"
                                  class="link-btn primary"
                                >下载</a>
                                <button
                                  v-if="mat.file_url && mat.verify_status === 'pending'"
                                  class="link-btn"
                                  @click="openVerifyModal(mat)"
                                >校验</button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="history-section card-inner">
              <h4 class="sub-title">📋 操作历史记录</h4>
              <div v-if="detailData.history!.length === 0" class="empty-state">暂无操作记录</div>
              <div v-else class="history-list">
                <div v-for="record in detailData.history" :key="record.id" class="history-item">
                  <div class="history-dot"></div>
                  <div class="history-content">
                    <div class="history-header">
                      <span class="history-action">{{ getActionText(record.action_type) }}</span>
                      <span class="history-stage">{{ getStageName(record.stage_code as any) }}</span>
                    </div>
                    <p v-if="record.action_detail" class="history-detail">{{ record.action_detail }}</p>
                    <div class="history-meta">
                      <span>操作人：{{ record.operator_name || '系统' }}</span>
                      <span>角色：{{ getRoleText(record.operator_role) }}</span>
                      <span>{{ formatDateTime(record.created_at) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeDetail">关闭</button>
          <button
            v-if="canReview(detailData)"
            class="btn btn-success"
            @click="openReviewModal(detailData)"
          >执行审批</button>
        </div>
      </div>
    </div>

    <div v-if="showReviewModal" class="modal-overlay" @click.self="closeReviewModal">
      <div class="modal">
        <div class="modal-header">
          <h3>审批 - {{ getStageName(currentReviewStage) }}</h3>
          <button class="btn-icon" @click="closeReviewModal">×</button>
        </div>
        <div class="modal-body">
          <div class="review-info-box">
            <div class="review-info-row">
              <span class="info-label">申请人：</span>
              <span class="info-value">{{ reviewItem?.real_name || reviewItem?.user?.real_name }}</span>
            </div>
            <div class="review-info-row">
              <span class="info-label">转接路径：</span>
              <span class="info-value">{{ reviewItem?.from_branch }} → {{ reviewItem?.to_branch }}</span>
            </div>
            <div class="review-info-row">
              <span class="info-label">当前阶段：</span>
              <span class="info-value highlight">{{ getStageName(currentReviewStage) }}</span>
            </div>
          </div>
          <div class="form-group">
            <label>审批操作 *</label>
            <div class="action-radio-group">
              <label class="action-radio approve">
                <input type="radio" v-model="reviewForm.action" value="approve" />
                <span class="radio-icon">✓</span>
                <span class="radio-label">审批通过</span>
              </label>
              <label class="action-radio reject">
                <input type="radio" v-model="reviewForm.action" value="reject" />
                <span class="radio-icon">✗</span>
                <span class="radio-label">驳回申请</span>
              </label>
            </div>
          </div>
          <div class="form-group">
            <label>审批意见</label>
            <textarea
              v-model="reviewForm.opinion"
              :placeholder="reviewForm.action === 'reject' ? '请填写驳回原因（必填）' : '请输入审批意见（选填）'"
              rows="4"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeReviewModal" :disabled="reviewing">取消</button>
          <button
            class="btn"
            :class="reviewForm.action === 'reject' ? 'btn-danger' : 'btn-success'"
            @click="submitReview"
            :disabled="!isReviewValid || reviewing"
          >
            {{ reviewing ? '提交中...' : (reviewForm.action === 'reject' ? '确认驳回' : '确认通过') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showVerifyModal" class="modal-overlay" @click.self="closeVerifyModal">
      <div class="modal">
        <div class="modal-header">
          <h3>材料校验 - {{ verifyMaterial?.material_name }}</h3>
          <button class="btn-icon" @click="closeVerifyModal">×</button>
        </div>
        <div class="modal-body">
          <div class="verify-info-box">
            <div class="verify-info-row">
              <span class="info-label">材料：</span>
              <span class="info-value">
                <a
                  v-if="verifyMaterial?.file_url"
                  :href="getMaterialPreviewUrl(verifyMaterial.file_url)"
                  target="_blank"
                  class="file-link"
                >{{ verifyMaterial?.material_name }}</a>
                <span v-else>{{ verifyMaterial?.material_name }}</span>
                <span v-if="verifyMaterial?.is_required" class="required-badge" style="margin-left: 8px;">必需</span>
              </span>
            </div>
            <div class="verify-info-row">
              <span class="info-label">大小：</span>
              <span class="info-value">{{ verifyMaterial?.file_size ? formatFileSize(verifyMaterial.file_size) : '-' }}</span>
            </div>
          </div>
          <div class="form-group">
            <label>校验结果 *</label>
            <div class="action-radio-group">
              <label class="action-radio approve">
                <input type="radio" v-model="verifyForm.verify_status" value="passed" />
                <span class="radio-icon">✓</span>
                <span class="radio-label">校验通过</span>
              </label>
              <label class="action-radio reject">
                <input type="radio" v-model="verifyForm.verify_status" value="rejected" />
                <span class="radio-icon">✗</span>
                <span class="radio-label">校验不通过</span>
              </label>
            </div>
          </div>
          <div class="form-group">
            <label>校验意见</label>
            <textarea
              v-model="verifyForm.verify_opinion"
              :placeholder="verifyForm.verify_status === 'rejected' ? '请填写不通过原因（必填）' : '请输入校验意见（选填）'"
              rows="4"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeVerifyModal" :disabled="verifying">取消</button>
          <button
            class="btn"
            :class="verifyForm.verify_status === 'rejected' ? 'btn-danger' : 'btn-success'"
            @click="submitVerify"
            :disabled="!isVerifyValid || verifying"
          >
            {{ verifying ? '提交中...' : (verifyForm.verify_status === 'rejected' ? '确认不通过' : '确认通过') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  getAdminTransferList,
  getAdminTransferDetail,
  getStageConfig,
  reviewStage,
  verifyMaterial,
  getMaterialDownloadUrl,
  getMaterialPreviewUrl,
  getTransferStats
} from '@/api/partyTransfer'
import type {
  PartyTransfer,
  PartyTransferStageConfig,
  PartyTransferMaterial,
  PartyTransferStats,
  TransferStageCode
} from '@/types'
import type { ReviewStageData, VerifyMaterialData } from '@/api/partyTransfer'

const listLoading = ref(false)
const detailLoading = ref(false)
const reviewing = ref(false)
const verifying = ref(false)

const list = ref<PartyTransfer[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10

const stats = ref<PartyTransferStats>({
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
  rejected: 0,
  cancelled: 0,
  by_stage: [],
  by_month: []
})
const stageConfigs = ref<PartyTransferStageConfig[]>([])

const filters = reactive({
  stage: '',
  status: '',
  type: '',
  keyword: ''
})

const showDetail = ref(false)
const detailData = ref<PartyTransfer | null>(null)

const showReviewModal = ref(false)
const reviewItem = ref<PartyTransfer | null>(null)
const currentReviewStage = ref<TransferStageCode>('submit')
const reviewForm = reactive<ReviewStageData>({
  action: 'approve',
  opinion: ''
})

const showVerifyModal = ref(false)
const verifyMaterial = ref<PartyTransferMaterial | null>(null)
const verifyForm = reactive<VerifyMaterialData>({
  verify_status: 'passed',
  verify_opinion: ''
})

const totalPages = computed(() => Math.ceil(total.value / pageSize))
const pendingCount = computed(() => {
  return (stats.value.by_stage || []).reduce((sum, s) => sum + s.count, 0)
})

const stageIcons: Record<string, string> = {
  submit: '📝',
  branch_out: '🏢',
  material_check: '📋',
  committee_out: '⚖️',
  branch_in: '🏛️',
  committee_in: '🔖',
  complete: '✅'
}
const stageNames: Record<string, string> = {
  submit: '提交申请',
  branch_out: '转出支部审核',
  material_check: '材料校验',
  committee_out: '上级党委审批(转出)',
  branch_in: '转入支部接收',
  committee_in: '上级党委审批(转入)',
  complete: '转接完成'
}

const stageMaterials = computed(() => {
  if (!detailData.value?.materials) return []
  return detailData.value.materials.filter(m => m.stage_code === 'material_check')
})

const isReviewValid = computed(() => {
  if (!reviewForm.action) return false
  if (reviewForm.action === 'reject' && !reviewForm.opinion.trim()) return false
  return true
})

const isVerifyValid = computed(() => {
  if (!verifyForm.verify_status) return false
  if (verifyForm.verify_status === 'rejected' && !verifyForm.verify_opinion.trim()) return false
  return true
})

const getStageIcon = (code?: string) => code ? (stageIcons[code] || '📋') : '📋'
const getStageName = (code?: string) => code ? (stageNames[code] || '-') : '-'

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    rejected: '已驳回',
    cancelled: '已撤销'
  }
  return map[status] || status
}

const getStageStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待开始',
    in_progress: '进行中',
    completed: '已完成',
    rejected: '已驳回'
  }
  return map[status] || status
}

const getVerifyStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待校验',
    passed: '通过',
    rejected: '不通过'
  }
  return map[status] || status
}

const getActionText = (action: string) => {
  const map: Record<string, string> = {
    submit: '提交申请',
    approve: '审批通过',
    reject: '审批驳回',
    start_stage: '启动阶段',
    complete: '流程完成',
    cancel: '撤销申请',
    upload_material: '上传材料',
    verify_material: '校验材料'
  }
  return map[action] || action
}

const getRoleText = (role?: string) => {
  const map: Record<string, string> = {
    user: '申请人',
    admin: '管理员',
    system: '系统'
  }
  return role ? (map[role] || role) : '-'
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (name?: string, type?: string): string => {
  const ext = ((name || '').split('.').pop() || (type || '')).toLowerCase()
  const map: Record<string, string> = {
    pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗',
    ppt: '📙', pptx: '📙', txt: '📄',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', bmp: '🖼️', webp: '🖼️',
    zip: '📦', rar: '📦', '7z': '📦',
    introduction_letter: '📨', party_certificate: '📜',
    application_copy: '📋', performance_review: '📊',
    party_fee_proof: '💰'
  }
  return map[ext] || map[type || ''] || '📎'
}

const canReview = (item: PartyTransfer | null | undefined) => {
  if (!item) return false
  if (item.overall_status !== 'processing') return false
  if (item.current_stage === 'submit' || item.current_stage === 'complete') return false
  return true
}

const loadStats = async () => {
  try {
    const res = await getTransferStats()
    stats.value = res.data
  } catch (error) {
    console.error('加载统计失败', error)
  }
}

const loadStageConfigs = async () => {
  try {
    const res = await getStageConfig()
    stageConfigs.value = res.data
  } catch (error) {
    console.error('加载阶段配置失败', error)
  }
}

const loadList = async () => {
  listLoading.value = true
  try {
    const res = await getAdminTransferList({
      page: page.value,
      page_size: pageSize,
      keyword: filters.keyword,
      stage: filters.stage,
      status: filters.status
    })
    list.value = res.data.items || res.data.list || res.data || []
    total.value = res.data.total || 0
  } catch (error) {
    console.error('加载列表失败', error)
  } finally {
    listLoading.value = false
  }
}

const resetFilters = () => {
  filters.stage = ''
  filters.status = ''
  filters.type = ''
  filters.keyword = ''
  page.value = 1
  loadList()
}

const goPage = (p: number) => {
  page.value = p
  loadList()
}

const viewDetail = async (id: number) => {
  detailLoading.value = true
  showDetail.value = true
  try {
    const res = await getAdminTransferDetail(id)
    detailData.value = res.data
  } catch (error) {
    console.error('加载详情失败', error)
    alert('加载详情失败')
  } finally {
    detailLoading.value = false
  }
}

const closeDetail = () => {
  showDetail.value = false
  detailData.value = null
}

const openReviewModal = (item: PartyTransfer) => {
  reviewItem.value = item
  currentReviewStage.value = item.current_stage
  reviewForm.action = 'approve'
  reviewForm.opinion = ''
  showReviewModal.value = true
}

const closeReviewModal = () => {
  if (reviewing.value) return
  showReviewModal.value = false
  reviewItem.value = null
}

const submitReview = async () => {
  if (!reviewItem.value || !isReviewValid.value) return
  reviewing.value = true
  try {
    await reviewStage(reviewItem.value.id, currentReviewStage.value, {
      action: reviewForm.action,
      opinion: reviewForm.opinion
    })
    alert(reviewForm.action === 'approve' ? '审批通过成功' : '驳回成功')
    closeReviewModal()
    if (detailData.value?.id === reviewItem.value.id) {
      await viewDetail(reviewItem.value.id)
    }
    await loadList()
    await loadStats()
  } catch (error: any) {
    console.error('审批失败', error)
    const msg = error?.response?.data?.message || error?.message || '审批失败'
    alert(msg)
  } finally {
    reviewing.value = false
  }
}

const openVerifyModal = (mat: PartyTransferMaterial) => {
  verifyMaterial.value = mat
  verifyForm.verify_status = 'passed'
  verifyForm.verify_opinion = ''
  showVerifyModal.value = true
}

const closeVerifyModal = () => {
  if (verifying.value) return
  showVerifyModal.value = false
  verifyMaterial.value = null
}

const submitVerify = async () => {
  if (!verifyMaterial.value || !isVerifyValid.value) return
  verifying.value = true
  try {
    await verifyMaterial(verifyMaterial.value.id, {
      verify_status: verifyForm.verify_status,
      verify_opinion: verifyForm.verify_opinion
    })
    alert(verifyForm.verify_status === 'passed' ? '材料校验通过' : '材料校验不通过')
    closeVerifyModal()
    if (detailData.value) {
      await viewDetail(detailData.value.id)
    }
  } catch (error: any) {
    console.error('校验失败', error)
    const msg = error?.response?.data?.message || error?.message || '校验失败'
    alert(msg)
  } finally {
    verifying.value = false
  }
}

onMounted(() => {
  loadStats()
  loadStageConfigs()
  loadList()
})
</script>

<style scoped>
.admin-party-transfer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  margin-bottom: 4px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.card {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}

.stat-card {
  padding: 16px 20px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-value.processing { color: #1890ff; }
.stat-value.completed { color: #52c41a; }
.stat-value.rejected { color: #ff4d4f; }
.stat-value.cancelled { color: #8c8c8c; }
.stat-value.pending { color: var(--primary-color); }

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.stage-stats {
  grid-template-columns: repeat(7, 1fr);
  margin-top: 4px;
}

.stage-stat-card {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;
}

.stage-stat-card.highlight {
  background: linear-gradient(135deg, #fff1f0, #ffe7e6);
  border: 1px solid #ffccc7;
}

.stage-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.stage-count {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-color);
}

.stage-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.filter-section {
  padding: 16px 20px;
}

.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 160px;
}

.filter-item.search-item {
  flex: 2;
}

.filter-item label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.filter-item select,
.filter-item input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: white;
  font-family: inherit;
}

.filter-item select:focus,
.filter-item input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-sm { padding: 6px 12px; font-size: 13px; }
.btn-primary { background: var(--primary-color); color: white; }
.btn-primary:hover:not(:disabled) { background: var(--primary-dark); }
.btn-success { background: #52c41a; color: white; }
.btn-success:hover:not(:disabled) { background: #389e0d; }
.btn-danger { background: #ff4d4f; color: white; }
.btn-danger:hover:not(:disabled) { background: #d9363e; }
.btn-outline { background: white; color: var(--text-primary); border: 1px solid var(--border-color); }
.btn-outline:hover { border-color: var(--primary-color); color: var(--primary-color); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f0f0f0;
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
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
  font-size: 12px;
  white-space: nowrap;
}

.data-table tr:hover td {
  background: #fafafa;
}

.user-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: 500;
  color: var(--text-primary);
}

.user-phone {
  font-size: 11px;
  color: var(--text-secondary);
}

.transfer-path {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  max-width: 280px;
}

.path-from, .path-to {
  font-size: 12px;
  padding: 2px 8px;
  background: var(--bg-light);
  border-radius: 4px;
}

.path-arrow {
  color: var(--primary-color);
  font-weight: 700;
}

.type-tag, .stage-tag, .status-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.type-tag.internal { background: #e6f7ff; color: #1890ff; }
.type-tag.external { background: #f9f0ff; color: #722ed1; }

.stage-tag { background: #fff1f0; color: var(--primary-color); }

.status-tag.pending { background: #fff1f0; color: var(--primary-color); }
.status-tag.processing { background: #e6f7ff; color: #1890ff; }
.status-tag.completed { background: #f6ffed; color: #52c41a; }
.status-tag.rejected { background: #fff2f0; color: #ff4d4f; }
.status-tag.cancelled { background: #f5f5f5; color: #8c8c8c; }

.table-actions {
  display: flex;
  gap: 8px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.page-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
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

.modal.large { max-width: 800px; }
.modal.xlarge { max-width: 960px; }

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-icon {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover { background: #ff4d4f; color: white; }

.modal-body.scrollable {
  overflow-y: auto;
  padding: 24px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-inner {
  background: var(--bg-light);
  border-radius: var(--radius-md);
  padding: 20px;
}

.sub-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  padding-left: 10px;
  border-left: 4px solid var(--primary-color);
}

.summary-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.summary-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.badge.stage { background: var(--primary-color); color: white; }
.badge.overall { background: #e6f7ff; color: #1890ff; }
.badge.overall.completed { background: #f6ffed; color: #52c41a; }
.badge.overall.rejected { background: #fff2f0; color: #ff4d4f; }
.badge.overall.cancelled { background: #f5f5f5; color: #8c8c8c; }
.badge.type { background: #f9f0ff; color: #722ed1; }
.badge.type.external { background: #fff7e6; color: #fa8c16; }

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 16px;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.wide { grid-column: span 4; }

.info-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.info-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.info-value.highlight {
  color: var(--primary-color);
}

.reason-box {
  padding: 10px 14px;
  background: white;
  border-radius: var(--radius-sm);
  font-size: 14px;
  margin-bottom: 8px;
  line-height: 1.7;
}

.reason-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.timeline {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  gap: 14px;
}

.timeline-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 44px;
  flex-shrink: 0;
}

.timeline-node {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border: 3px solid #e0e0e0;
  font-size: 20px;
  transition: all 0.3s;
}

.timeline-item.active .timeline-node {
  background: #fff1f0;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px rgba(197, 49, 50, 0.1);
}

.timeline-item.completed .timeline-node {
  background: #f6ffed;
  border-color: #52c41a;
}

.timeline-item.rejected .timeline-node {
  background: #fff2f0;
  border-color: #ff4d4f;
}

.timeline-line {
  width: 3px;
  flex: 1;
  min-height: 32px;
  background: #e0e0e0;
  margin: 6px 0;
}

.timeline-item.completed .timeline-line {
  background: #52c41a;
}

.timeline-content {
  flex: 1;
  padding-bottom: 24px;
  min-width: 0;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
  gap: 12px;
  flex-wrap: wrap;
}

.timeline-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stage-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.stage-handler {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.stage-description {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.stage-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 6px;
}

.meta-item {
  font-size: 12px;
  color: var(--text-secondary);
}

.meta-item.deadline {
  color: #fa8c16;
  font-weight: 500;
}

.review-opinion {
  padding: 8px 12px;
  background: white;
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-bottom: 10px;
  line-height: 1.6;
}

.review-label {
  color: var(--text-secondary);
  margin-right: 4px;
}

.materials-section {
  margin-top: 10px;
  padding: 14px;
  background: white;
  border-radius: var(--radius-md);
}

.materials-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.empty-materials {
  text-align: center;
  padding: 16px;
  color: var(--text-secondary);
  font-size: 13px;
}

.materials-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: white;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.materials-table th,
.materials-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.materials-table th {
  background: var(--bg-light);
  font-weight: 600;
  font-size: 11px;
}

.materials-table tr:last-child td {
  border-bottom: none;
}

.file-icon {
  margin-right: 6px;
}

.file-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.file-link:hover { text-decoration: underline; }

.required-badge, .optional-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.required-badge { background: #fff2f0; color: #ff4d4f; }
.optional-badge { background: #f5f5f5; color: #8c8c8c; }

.verify-tag {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.verify-tag.pending { background: #fff7e6; color: #fa8c16; }
.verify-tag.passed { background: #f6ffed; color: #52c41a; }
.verify-tag.rejected { background: #fff2f0; color: #ff4d4f; }

.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  text-decoration: none;
}

.link-btn:hover { color: var(--text-primary); text-decoration: underline; }
.link-btn.primary { color: var(--primary-color); }

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  gap: 10px;
  padding-left: 6px;
}

.history-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--primary-color);
  margin-top: 6px;
  flex-shrink: 0;
}

.history-content { flex: 1; }

.history-header {
  display: flex;
  gap: 8px;
  margin-bottom: 3px;
}

.history-action {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.history-stage {
  font-size: 12px;
  padding: 2px 8px;
  background: white;
  border-radius: 10px;
  color: var(--text-secondary);
}

.history-detail {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 3px;
  line-height: 1.5;
}

.history-meta {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: var(--text-light);
  flex-wrap: wrap;
}

.review-info-box, .verify-info-box {
  background: var(--bg-light);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 20px;
}

.review-info-row, .verify-info-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.8;
}

.review-info-row:last-child, .verify-info-row:last-child { margin-bottom: 0; }

.review-info-row .info-label,
.verify-info-row .info-label {
  width: 90px;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.review-info-row .info-value,
.verify-info-row .info-value {
  flex: 1;
  color: var(--text-primary);
  font-weight: 500;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  box-sizing: border-box;
}

.form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.action-radio-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.action-radio {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.action-radio input[type="radio"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.action-radio.approve:has(input:checked) {
  border-color: #52c41a;
  background: #f6ffed;
}

.action-radio.reject:has(input:checked) {
  border-color: #ff4d4f;
  background: #fff2f0;
}

.radio-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: #8c8c8c;
  transition: all 0.2s;
  flex-shrink: 0;
}

.action-radio.approve input:checked ~ .radio-icon {
  background: #52c41a;
  color: white;
}

.action-radio.reject input:checked ~ .radio-icon {
  background: #ff4d4f;
  color: white;
}

.radio-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

@media (max-width: 1024px) {
  .stats-row { grid-template-columns: repeat(3, 1fr); }
  .stage-stats { grid-template-columns: repeat(4, 1fr); }
  .info-grid { grid-template-columns: repeat(2, 1fr); }
  .info-item.wide { grid-column: span 2; }
}

@media (max-width: 640px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .stage-stats { grid-template-columns: repeat(2, 1fr); }
  .info-grid { grid-template-columns: 1fr; }
  .info-item.wide { grid-column: span 1; }
}
</style>
