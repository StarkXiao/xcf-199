<template>
  <div class="party-transfer-page container">
    <div class="page-header">
      <h1 class="page-title">🔄 组织关系转接</h1>
      <p class="page-subtitle">申请和查询您的党组织关系转接流程</p>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="viewMode === 'list'">
      <div class="list-header card">
        <div class="list-header-left">
          <h2 class="section-title">我的转接申请</h2>
          <span class="list-count">共 {{ transfers.length }} 条记录</span>
        </div>
        <button class="btn btn-primary" @click="startNewApplication">
          + 发起转接申请
        </button>
      </div>

      <div v-if="transfers.length === 0" class="empty-card card">
        <div class="empty-icon">📋</div>
        <h3 class="empty-title">暂无转接申请</h3>
        <p class="empty-desc">您还没有提交过组织关系转接申请，点击上方按钮发起新申请</p>
      </div>

      <div v-else class="transfer-list">
        <div
          v-for="item in transfers"
          :key="item.id"
          class="transfer-card card"
          @click="viewDetail(item.id)"
        >
          <div class="card-header">
            <div class="card-title-wrap">
              <h3 class="card-title">{{ item.from_branch }} → {{ item.to_branch }}</h3>
              <span class="status-tag" :class="item.overall_status">
                {{ getStatusText(item.overall_status) }}
              </span>
            </div>
            <span class="card-date">申请时间：{{ formatDateTime(item.created_at) }}</span>
          </div>
          <div class="card-body">
            <div class="info-row">
              <div class="info-item">
                <span class="info-label">当前阶段</span>
                <span class="info-value highlight">{{ getStageName(item.current_stage) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">转接类型</span>
                <span class="info-value">{{ item.transfer_type === 'internal' ? '省内转接' : '跨省转接' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">预计完成</span>
                <span class="info-value">{{ formatDate(item.expected_date) }}</span>
              </div>
            </div>
            <div class="reason-text">
              <span class="reason-label">转接原因：</span>{{ item.reason }}
            </div>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar">
              <div
                class="progress-bar-inner"
                :style="{ width: getProgressPercent(item) + '%' }"
              ></div>
            </div>
            <span class="progress-text">{{ getProgressPercent(item) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="viewMode === 'apply'" class="apply-form-card card">
      <div class="form-header">
        <button class="btn btn-outline btn-sm" @click="viewMode = 'list'">← 返回列表</button>
        <h2 class="section-title">发起组织关系转接申请</h2>
      </div>

      <div class="form-body">
        <div class="form-grid">
          <div class="form-group">
            <label>转接类型 *</label>
            <select v-model="applyForm.transfer_type">
              <option value="internal">省内转接</option>
              <option value="external">跨省转接</option>
            </select>
          </div>
          <div class="form-group">
            <label>转出所在党支部 *</label>
            <input
              v-model="applyForm.from_branch"
              type="text"
              placeholder="请输入当前所在党支部名称"
            />
          </div>
          <div class="form-group">
            <label>转入目标党支部 *</label>
            <input
              v-model="applyForm.to_branch"
              type="text"
              placeholder="请输入目标党支部名称"
            />
          </div>
          <div v-if="applyForm.transfer_type === 'external'" class="form-group">
            <label>转出单位（跨省）</label>
            <input
              v-model="applyForm.from_organization"
              type="text"
              placeholder="请输入转出单位党委名称"
            />
          </div>
          <div v-if="applyForm.transfer_type === 'external'" class="form-group">
            <label>转入单位（跨省）</label>
            <input
              v-model="applyForm.to_organization"
              type="text"
              placeholder="请输入转入单位党委名称"
            />
          </div>
        </div>

        <div class="form-group">
          <label>转接原因 *</label>
          <textarea
            v-model="applyForm.reason"
            placeholder="请详细说明转接原因，如工作调动、学习、居住迁移等"
            rows="4"
          ></textarea>
        </div>

        <div class="form-group">
          <label>备注说明</label>
          <textarea
            v-model="applyForm.remarks"
            placeholder="其他需要说明的情况（选填）"
            rows="3"
          ></textarea>
        </div>

        <div class="materials-notice card info">
          <div class="notice-icon">📎</div>
          <div class="notice-content">
            <strong>所需材料清单：</strong>
            <ul class="materials-list">
              <li v-for="(mat, idx) in requiredMaterials" :key="idx">
                <span v-if="mat.required" class="required-mark">*</span>
                {{ mat.name }}
              </li>
            </ul>
            <p class="notice-tip">提交申请后，请在详情页上传上述材料</p>
          </div>
        </div>
      </div>

      <div class="form-footer">
        <button class="btn btn-outline" @click="viewMode = 'list'">取消</button>
        <button
          class="btn btn-primary"
          @click="submitApplication"
          :disabled="applying || !isFormValid"
        >
          {{ applying ? '提交中...' : '提交申请' }}
        </button>
      </div>
    </div>

    <div v-else-if="viewMode === 'detail' && selectedTransfer" class="detail-page">
      <div class="detail-header card">
        <div class="detail-header-top">
          <button class="btn btn-outline btn-sm" @click="viewMode = 'list'">← 返回列表</button>
          <div class="detail-actions">
            <button
              v-if="canCancel(selectedTransfer)"
              class="btn btn-danger btn-sm"
              @click="handleCancel(selectedTransfer.id)"
            >
              撤销申请
            </button>
          </div>
        </div>

        <div class="status-summary">
          <div class="summary-left">
            <h2 class="detail-title">
              {{ selectedTransfer.from_branch }}
              <span class="arrow">→</span>
              {{ selectedTransfer.to_branch }}
            </h2>
            <div class="summary-badges">
              <span class="badge stage">{{ getStageName(selectedTransfer.current_stage) }}</span>
              <span class="badge overall" :class="selectedTransfer.overall_status">
                {{ getStatusText(selectedTransfer.overall_status) }}
              </span>
              <span class="badge type">
                {{ selectedTransfer.transfer_type === 'internal' ? '省内转接' : '跨省转接' }}
              </span>
            </div>
          </div>
          <div class="progress-ring">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" class="progress-bg" />
              <circle
                cx="50"
                cy="50"
                r="42"
                class="progress-fg"
                :stroke-dashoffset="264 - (264 * detailProgressPercent / 100)"
              />
            </svg>
            <span class="progress-text">{{ detailProgressPercent }}%</span>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">申请人</span>
            <span class="info-value">{{ selectedTransfer.user?.real_name || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">联系电话</span>
            <span class="info-value">{{ selectedTransfer.user?.phone || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">申请时间</span>
            <span class="info-value">{{ formatDateTime(selectedTransfer.submit_date) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">预计完成</span>
            <span class="info-value">{{ formatDate(selectedTransfer.expected_date) }}</span>
          </div>
          <div v-if="selectedTransfer.completed_date" class="info-item">
            <span class="info-label">完成时间</span>
            <span class="info-value">{{ formatDateTime(selectedTransfer.completed_date) }}</span>
          </div>
        </div>

        <div v-if="selectedTransfer.reason" class="reason-box">
          <span class="reason-label">转接原因：</span>
          <span class="reason-content">{{ selectedTransfer.reason }}</span>
        </div>
        <div v-if="selectedTransfer.remarks" class="reason-box">
          <span class="reason-label">备注：</span>
          <span class="reason-content">{{ selectedTransfer.remarks }}</span>
        </div>
      </div>

      <div class="timeline-card card">
        <h3 class="section-title">审批流程时间轴</h3>
        <div class="timeline">
          <div
            v-for="(stage, index) in selectedTransfer.stages"
            :key="stage.id"
            class="timeline-item"
            :class="[stage.status, { active: stage.stage_code === selectedTransfer.current_stage }]"
          >
            <div class="timeline-connector">
              <div class="timeline-node">
                <span class="node-icon">{{ getStageIcon(stage.stage_code) }}</span>
              </div>
              <div v-if="index < selectedTransfer.stages!.length - 1" class="timeline-line"></div>
            </div>
            <div class="timeline-content">
              <div class="timeline-header">
                <div class="timeline-title-wrap">
                  <h4 class="stage-name">{{ stage.stage_name }}</h4>
                  <span class="status-tag" :class="stage.status">
                    {{ getStageStatusText(stage.status) }}
                  </span>
                </div>
                <div class="stage-handler">
                  <span class="handler-icon">👤</span>
                  {{ stage.handler }}
                </div>
              </div>
              <p class="stage-description">{{ stage.description }}</p>
              <div class="stage-meta">
                <span v-if="stage.handle_date" class="meta-item">
                  📅 处理时间：{{ formatDateTime(stage.handle_date) }}
                </span>
                <span v-if="stage.deadline_date && (stage.status === 'in_progress' || stage.status === 'pending')" class="meta-item deadline">
                  ⏰ 截止：{{ formatDate(stage.deadline_date) }}
                </span>
                <span v-if="stage.handler && stage.status === 'completed'" class="meta-item">
                  ✍️ 经办人：{{ stage.handler }}
                </span>
              </div>
              <div v-if="stage.opinion" class="review-opinion">
                <span class="review-label">审批意见：</span>
                <span>{{ stage.opinion }}</span>
              </div>

              <div v-if="stage.stage_code === 'material_check' && (stage.status === 'in_progress' || stage.status === 'completed')" class="materials-section">
                <div class="materials-header">
                  <h5 class="materials-title">📁 转接材料校验</h5>
                  <button
                    v-if="canUploadMaterial(selectedTransfer)"
                    class="btn btn-sm btn-outline"
                    @click="openUploadModal(null)"
                  >
                    + 上传材料
                  </button>
                </div>
                <div v-if="stageMaterials.length === 0" class="empty-materials">
                  暂无材料
                </div>
                <div v-else class="materials-table-wrapper">
                  <table class="materials-table">
                    <thead>
                      <tr>
                        <th>材料名称</th>
                        <th>是否必需</th>
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
                          <span class="file-cell-icon">{{ getFileIcon(mat.material_name, mat.material_type) }}</span>
                          <a
                            v-if="mat.file_url"
                            :href="getMaterialPreviewUrl(mat.file_url)"
                            target="_blank"
                            class="file-cell-link"
                          >{{ mat.material_name }}</a>
                          <span v-else class="material-name">{{ mat.material_name }}</span>
                          <span v-if="!mat.file_url" class="pending-badge">待上传</span>
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
                              v-if="canUploadMaterial(selectedTransfer) && !mat.file_url"
                              class="link-btn"
                              @click="openUploadModal(mat.id)"
                            >上传</button>
                            <button
                              v-if="canUploadMaterial(selectedTransfer) && mat.file_url && mat.verify_status === 'rejected'"
                              class="link-btn"
                              @click="openUploadModal(mat.id)"
                            >重新上传</button>
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
      </div>

      <div class="all-materials card">
        <h3 class="section-title">📚 全部材料归档</h3>
        <div v-if="selectedTransfer.materials!.length === 0" class="empty-state">
          暂无归档材料
        </div>
        <div v-else class="materials-table-wrapper">
          <table class="materials-table">
            <thead>
              <tr>
                <th>材料名称</th>
                <th>是否必需</th>
                <th>大小</th>
                <th>上传时间</th>
                <th>校验状态</th>
                <th>说明</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="mat in selectedTransfer.materials" :key="mat.id">
                <td>
                  <span class="file-cell-icon">{{ getFileIcon(mat.material_name, mat.material_type) }}</span>
                  <a
                    v-if="mat.file_url"
                    :href="getMaterialPreviewUrl(mat.file_url)"
                    target="_blank"
                    class="file-cell-link"
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
                <td>{{ mat.description || '-' }}</td>
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
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="history-card card">
        <h3 class="section-title">📋 操作历史记录</h3>
        <div v-if="selectedTransfer.history!.length === 0" class="empty-state">
          暂无操作记录
        </div>
        <div v-else class="history-list">
          <div v-for="record in selectedTransfer.history" :key="record.id" class="history-item">
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

    <div v-if="showUploadModal" class="modal-overlay" @click.self="closeUploadModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ uploadMaterialId ? '上传/更新材料' : '上传材料' }}</h3>
          <button class="btn-icon" @click="closeUploadModal">×</button>
        </div>
        <div class="modal-body">
          <div
            class="file-upload-area real"
            :class="{ drag: isDragging, selected: selectedFile }"
            @click="triggerFileInput"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop.prevent="handleFileDrop"
          >
            <input
              ref="fileInputRef"
              type="file"
              style="display: none"
              :accept="acceptFileTypes"
              @change="handleFileSelect"
            />
            <div v-if="!selectedFile">
              <span class="file-icon">📤</span>
              <p class="file-text">{{ isDragging ? '松开鼠标上传文件' : '点击或拖拽文件到此区域上传' }}</p>
              <p class="file-hint">支持 PDF、Word、Excel、PPT、图片、压缩包等，单个文件不超过 50MB</p>
            </div>
            <div v-else class="selected-file">
              <span class="sf-icon">{{ getFileIcon(selectedFile.name) }}</span>
              <div class="sf-info">
                <span class="sf-name">{{ selectedFile.name }}</span>
                <span class="sf-size">{{ formatFileSize(selectedFile.size) }}</span>
              </div>
              <button class="btn-icon remove-file" @click.stop="clearSelectedFile">×</button>
            </div>
          </div>
          <div class="form-group">
            <label>材料名称 *</label>
            <input
              v-model="uploadForm.material_name"
              type="text"
              placeholder="默认取文件名，可手动修改"
            />
          </div>
          <div class="form-group">
            <label>材料类型</label>
            <select v-model="uploadForm.material_type">
              <option value="">请选择</option>
              <option value="introduction_letter">党员组织关系介绍信</option>
              <option value="party_certificate">党员证明材料</option>
              <option value="application_copy">入党志愿书复印件</option>
              <option value="performance_review">现实表现鉴定材料</option>
              <option value="party_fee_proof">党费缴纳证明</option>
              <option value="pdf">PDF文档</option>
              <option value="doc">Word文档</option>
              <option value="image">图片</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label>说明</label>
            <textarea v-model="uploadForm.description" placeholder="请输入材料说明（选填）"></textarea>
          </div>
          <div v-if="uploadProgress > 0 && uploadProgress < 100" class="progress-bar-wrap">
            <div class="progress-bar">
              <div class="progress-bar-inner" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <span class="progress-text">{{ uploadProgress }}%</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeUploadModal" :disabled="uploading">取消</button>
          <button
            class="btn btn-primary"
            @click="handleUpload"
            :disabled="!selectedFile || uploading || !uploadForm.material_name"
          >
            {{ uploading ? `上传中 ${uploadProgress}%` : '确认上传' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import {
  getMyTransfers,
  getMyTransferDetail,
  applyTransfer,
  getRequiredMaterials,
  uploadMaterialFile,
  getMaterialDownloadUrl,
  getMaterialPreviewUrl,
  cancelTransfer
} from '@/api/partyTransfer'
import type {
  PartyTransfer,
  PartyTransferRequiredMaterial,
  TransferStageCode,
  TransferOverallStatus
} from '@/types'

const loading = ref(false)
const transfers = ref<PartyTransfer[]>([])
const selectedTransfer = ref<PartyTransfer | null>(null)
const viewMode = ref<'list' | 'apply' | 'detail'>('list')
const applying = ref(false)
const requiredMaterials = ref<PartyTransferRequiredMaterial[]>([])

const stageIcons: Record<TransferStageCode, string> = {
  submit: '📝',
  branch_out: '🏢',
  material_check: '📋',
  committee_out: '⚖️',
  branch_in: '🏛️',
  committee_in: '🔖',
  complete: '✅'
}

const stageNames: Record<TransferStageCode, string> = {
  submit: '提交申请',
  branch_out: '转出支部审核',
  material_check: '材料校验',
  committee_out: '上级党委审批(转出)',
  branch_in: '转入支部接收',
  committee_in: '上级党委审批(转入)',
  complete: '转接完成'
}

const applyForm = ref({
  transfer_type: 'internal',
  from_branch: '',
  to_branch: '',
  from_organization: '',
  to_organization: '',
  reason: '',
  remarks: ''
})

const showUploadModal = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const acceptFileTypes = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.webp,.txt,.zip,.rar'
const uploadMaterialId = ref<number | null>(null)
const uploadForm = ref({
  material_name: '',
  material_type: '',
  description: ''
})

const isFormValid = computed(() => {
  return applyForm.value.from_branch.trim() !== '' &&
         applyForm.value.to_branch.trim() !== '' &&
         applyForm.value.reason.trim() !== ''
})

const detailProgressPercent = computed(() => {
  if (!selectedTransfer.value?.stages) return 0
  const completed = selectedTransfer.value.stages.filter(s => s.status === 'completed').length
  return Math.round((completed / selectedTransfer.value.stages.length) * 100)
})

const stageMaterials = computed(() => {
  if (!selectedTransfer.value?.materials) return []
  return selectedTransfer.value.materials.filter(m => m.stage_code === 'material_check')
})

const getStageIcon = (code?: TransferStageCode) => code ? stageIcons[code] || '📋' : '📋'
const getStageName = (code?: TransferStageCode) => code ? stageNames[code] || '-' : '-'

const getStatusText = (status: TransferOverallStatus) => {
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

const getProgressPercent = (item: PartyTransfer) => {
  if (!item.stages) {
    const order = ['submit', 'branch_out', 'material_check', 'committee_out', 'branch_in', 'committee_in', 'complete']
    const idx = order.indexOf(item.current_stage) + 1
    return Math.round((idx / order.length) * 100)
  }
  const completed = item.stages.filter(s => s.status === 'completed').length
  return Math.round((completed / item.stages.length) * 100)
}

const canCancel = (item: PartyTransfer) => {
  return item.overall_status === 'processing' || item.overall_status === 'pending'
}

const canUploadMaterial = (item: PartyTransfer) => {
  return item.overall_status === 'processing'
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

const loadTransfers = async () => {
  loading.value = true
  try {
    const res = await getMyTransfers()
    transfers.value = res.data
  } catch (error) {
    console.error('加载转接列表失败', error)
  } finally {
    loading.value = false
  }
}

const loadRequiredMaterials = async () => {
  try {
    const res = await getRequiredMaterials()
    requiredMaterials.value = res.data
  } catch (error) {
    console.error('加载必需材料失败', error)
  }
}

const startNewApplication = () => {
  applyForm.value = {
    transfer_type: 'internal',
    from_branch: '',
    to_branch: '',
    from_organization: '',
    to_organization: '',
    reason: '',
    remarks: ''
  }
  viewMode.value = 'apply'
}

const submitApplication = async () => {
  if (!isFormValid.value) return
  applying.value = true
  try {
    const res = await applyTransfer(applyForm.value)
    alert('申请提交成功！')
    await loadTransfers()
    if (res.data?.id) {
      await viewDetail(res.data.id)
    } else {
      viewMode.value = 'list'
    }
  } catch (error: any) {
    console.error('提交申请失败', error)
    const msg = error?.response?.data?.message || error?.message || '提交失败，请稍后重试'
    alert(msg)
  } finally {
    applying.value = false
  }
}

const viewDetail = async (id: number) => {
  loading.value = true
  try {
    const res = await getMyTransferDetail(id)
    selectedTransfer.value = res.data
    viewMode.value = 'detail'
  } catch (error) {
    console.error('加载详情失败', error)
    alert('加载详情失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = async (id: number) => {
  if (!confirm('确定要撤销该转接申请吗？撤销后无法恢复。')) return
  try {
    await cancelTransfer(id)
    alert('申请已撤销')
    if (selectedTransfer.value?.id === id) {
      await viewDetail(id)
    }
    await loadTransfers()
  } catch (error: any) {
    console.error('撤销失败', error)
    const msg = error?.response?.data?.message || error?.message || '撤销失败'
    alert(msg)
  }
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    setSelectedFile(file)
  }
}

const handleFileDrop = (e: DragEvent) => {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    setSelectedFile(file)
  }
}

const setSelectedFile = (file: File) => {
  if (file.size > 50 * 1024 * 1024) {
    alert('文件大小不能超过50MB')
    return
  }
  selectedFile.value = file
  if (!uploadForm.value.material_name) {
    const dotIdx = file.name.lastIndexOf('.')
    uploadForm.value.material_name = dotIdx > 0 ? file.name.substring(0, dotIdx) : file.name
  }
}

const clearSelectedFile = () => {
  selectedFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const openUploadModal = (materialId: number | null) => {
  uploadMaterialId.value = materialId
  showUploadModal.value = true
  uploadProgress.value = 0
  selectedFile.value = null
  uploadForm.value = { material_name: '', material_type: '', description: '' }
}

const closeUploadModal = () => {
  if (uploading.value) return
  showUploadModal.value = false
  clearSelectedFile()
  uploadForm.value = { material_name: '', material_type: '', description: '' }
  uploadProgress.value = 0
  uploadMaterialId.value = null
}

watch(showUploadModal, (val) => {
  if (val) {
    nextTick(() => {
      uploadProgress.value = 0
    })
  }
})

const handleUpload = async () => {
  if (!selectedTransfer.value || !selectedFile.value || !uploadForm.value.material_name) return
  uploading.value = true
  uploadProgress.value = 0
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('transfer_id', String(selectedTransfer.value.id))
    formData.append('material_name', uploadForm.value.material_name)
    if (uploadForm.value.material_type) {
      formData.append('material_type', uploadForm.value.material_type)
    }
    if (uploadForm.value.description) {
      formData.append('description', uploadForm.value.description)
    }
    if (uploadMaterialId.value) {
      formData.append('material_id', String(uploadMaterialId.value))
    }

    await uploadMaterialFile(formData, (progress) => {
      uploadProgress.value = progress
    })

    uploadProgress.value = 100
    setTimeout(async () => {
      closeUploadModal()
      if (selectedTransfer.value) {
        await viewDetail(selectedTransfer.value.id)
      }
    }, 300)
  } catch (error: any) {
    console.error('上传材料失败', error)
    const msg = error?.response?.data?.message || error?.message || '上传失败，请稍后重试'
    alert(msg)
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  loadTransfers()
  loadRequiredMaterials()
})
</script>

<style scoped>
.party-transfer-page {
  max-width: 1100px;
  padding-bottom: 40px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

.card {
  margin-bottom: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
}

.list-header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  padding-left: 10px;
  border-left: 4px solid var(--primary-color);
}

.list-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.empty-card {
  text-align: center;
  padding: 60px 32px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-desc {
  color: var(--text-secondary);
  font-size: 14px;
}

.transfer-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.transfer-card {
  cursor: pointer;
  transition: all 0.2s;
}

.transfer-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border-color);
}

.card-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.card-date {
  font-size: 12px;
  color: var(--text-light);
}

.card-body {
  padding: 16px 24px;
}

.info-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 12px;
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

.info-value.highlight {
  color: var(--primary-color);
}

.reason-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  padding: 10px 12px;
  background: var(--bg-light);
  border-radius: var(--radius-sm);
}

.reason-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.progress-bar-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px 20px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-inner {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), var(--primary-dark));
  border-radius: 4px;
  transition: width 0.5s;
}

.progress-text {
  font-size: 13px;
  color: var(--primary-color);
  font-weight: 600;
  min-width: 42px;
  text-align: right;
}

.status-tag {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-tag.pending,
.status-tag.in_progress {
  background: #fff1f0;
  color: var(--primary-color);
}

.status-tag.processing {
  background: #e6f7ff;
  color: #1890ff;
}

.status-tag.completed {
  background: #f6ffed;
  color: #52c41a;
}

.status-tag.rejected {
  background: #fff2f0;
  color: #ff4d4f;
}

.status-tag.cancelled {
  background: #f5f5f5;
  color: #8c8c8c;
}

.form-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.form-body {
  padding: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
  margin-bottom: 18px;
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

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-primary);
  background: white;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
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

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  background: white;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-outline:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-danger {
  background: #ff4d4f;
  color: white;
}

.btn-danger:hover {
  background: #d9363e;
}

.materials-notice {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: #f0f9ff;
  border: 1px solid #91d5ff;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}

.notice-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.notice-content {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.notice-content strong {
  display: block;
  margin-bottom: 8px;
}

.materials-list {
  margin: 8px 0;
  padding-left: 20px;
}

.materials-list li {
  margin: 4px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.required-mark {
  color: #ff4d4f;
  margin-right: 2px;
}

.notice-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #8c8c8c;
  font-style: italic;
}

.detail-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-header {
  padding: 24px;
}

.detail-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.detail-actions {
  display: flex;
  gap: 8px;
}

.status-summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.detail-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.arrow {
  color: var(--primary-color);
  font-weight: 700;
}

.summary-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.badge.stage {
  background: var(--primary-color);
  color: white;
}

.badge.overall {
  background: #e6f7ff;
  color: #1890ff;
}

.badge.overall.completed {
  background: #f6ffed;
  color: #52c41a;
}

.badge.overall.rejected {
  background: #fff2f0;
  color: #ff4d4f;
}

.badge.overall.cancelled {
  background: #f5f5f5;
  color: #8c8c8c;
}

.badge.type {
  background: #f9f0ff;
  color: #722ed1;
}

.progress-ring {
  position: relative;
  width: 90px;
  height: 90px;
  flex-shrink: 0;
}

.progress-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-ring circle {
  fill: none;
  stroke-width: 8;
}

.progress-bg {
  stroke: #f0f0f0;
}

.progress-fg {
  stroke: var(--primary-color);
  stroke-dasharray: 264;
  transition: stroke-dashoffset 0.5s;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-color);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.reason-box {
  padding: 12px 16px;
  background: var(--bg-light);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.7;
}

.reason-label {
  color: var(--text-secondary);
  font-weight: 500;
  margin-right: 6px;
}

.reason-content {
  color: var(--text-primary);
}

.timeline-card {
  padding: 24px;
}

.timeline-card .section-title {
  margin-bottom: 24px;
}

.timeline {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  gap: 16px;
}

.timeline-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 52px;
}

.timeline-node {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border: 3px solid #e0e0e0;
  font-size: 22px;
  flex-shrink: 0;
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
  min-height: 40px;
  background: #e0e0e0;
  margin: 8px 0;
}

.timeline-item.completed .timeline-line {
  background: #52c41a;
}

.timeline-content {
  flex: 1;
  padding-bottom: 32px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 16px;
}

.timeline-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stage-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.stage-handler {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.handler-icon {
  font-size: 14px;
}

.stage-description {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 10px;
}

.stage-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 8px;
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
  padding: 10px 12px;
  background: var(--bg-light);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 12px;
  line-height: 1.6;
}

.review-label {
  color: var(--text-secondary);
  margin-right: 6px;
}

.materials-section {
  margin-top: 12px;
  padding: 16px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
}

.materials-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.materials-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.empty-materials {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  padding: 20px;
}

.materials-table-wrapper {
  overflow-x: auto;
}

.materials-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: white;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.materials-table th,
.materials-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.materials-table th {
  background: var(--bg-light);
  font-weight: 600;
  color: var(--text-primary);
  font-size: 12px;
}

.materials-table tr:last-child td {
  border-bottom: none;
}

.materials-table tr:hover td {
  background: #fafafa;
}

.file-cell-icon {
  margin-right: 8px;
  font-size: 16px;
}

.file-cell-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.file-cell-link:hover {
  text-decoration: underline;
}

.required-badge {
  background: #fff2f0;
  color: #ff4d4f;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.optional-badge {
  background: #f5f5f5;
  color: #8c8c8c;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.pending-badge {
  background: #fff7e6;
  color: #fa8c16;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  margin-left: 6px;
}

.verify-tag {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.verify-tag.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.verify-tag.passed {
  background: #f6ffed;
  color: #52c41a;
}

.verify-tag.rejected {
  background: #fff2f0;
  color: #ff4d4f;
}

.table-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  text-decoration: none;
}

.link-btn:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

.link-btn.primary {
  color: var(--primary-color);
}

.link-btn.danger {
  color: #ff4d4f;
}

.all-materials,
.history-card {
  padding: 24px;
}

.all-materials .section-title,
.history-card .section-title {
  margin-bottom: 20px;
}

.empty-state {
  text-align: center;
  padding: 30px;
  color: var(--text-secondary);
  font-size: 14px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-item {
  display: flex;
  gap: 12px;
  padding-left: 8px;
}

.history-dot {
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

.history-header {
  display: flex;
  gap: 10px;
  margin-bottom: 4px;
}

.history-action {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.history-stage {
  font-size: 12px;
  padding: 2px 8px;
  background: var(--bg-light);
  border-radius: 10px;
  color: var(--text-secondary);
}

.history-detail {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  line-height: 1.5;
}

.history-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-light);
  flex-wrap: wrap;
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
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.btn-icon {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #ff4d4f;
  color: white;
}

.file-upload-area {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-md);
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 20px;
}

.file-upload-area:hover {
  border-color: var(--primary-color);
  background: var(--bg-light);
}

.file-upload-area.real.drag {
  border-color: var(--primary-color);
  background: rgba(197, 49, 50, 0.05);
}

.file-upload-area.real.selected {
  background: var(--bg-light);
  padding: 16px 20px;
  text-align: left;
  cursor: default;
}

.file-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 12px;
}

.file-text {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.file-hint {
  font-size: 12px;
  color: var(--text-light);
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sf-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.sf-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.sf-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sf-size {
  font-size: 12px;
  color: var(--text-secondary);
}

.remove-file {
  flex-shrink: 0;
  background: #f5f5f5;
  color: var(--text-secondary);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.remove-file:hover {
  background: #ff4d4f;
  color: white;
}

@media (max-width: 768px) {
  .info-row {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .status-summary {
    flex-direction: column;
  }

  .progress-ring {
    align-self: center;
  }

  .history-meta {
    flex-direction: column;
    gap: 4px;
  }

  .timeline-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .table-actions {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
