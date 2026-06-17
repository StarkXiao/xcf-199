<template>
  <div class="party-development-page container">
    <div class="page-header">
      <h1 class="page-title">🎖️ 党员发展</h1>
      <p class="page-subtitle">跟踪您的党员发展全流程</p>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="!development" class="apply-section card">
      <div class="apply-content">
        <div class="apply-icon">📝</div>
        <h2 class="apply-title">开启您的入党之旅</h2>
        <p class="apply-desc">
          加入中国共产党是每个有志青年的光荣选择。党员发展过程包括入党申请、积极分子培养、发展对象考察、预备党员接收、预备期管理和转正审批六个阶段。
        </p>
        <ul class="stage-overview">
          <li><span class="stage-dot"></span>入党申请</li>
          <li><span class="stage-dot"></span>积极分子培养</li>
          <li><span class="stage-dot"></span>发展对象考察</li>
          <li><span class="stage-dot"></span>预备党员接收</li>
          <li><span class="stage-dot"></span>预备期管理</li>
          <li><span class="stage-dot"></span>转正审批</li>
        </ul>
        <button class="btn btn-primary btn-lg" @click="handleApply" :disabled="applying">
          {{ applying ? '提交中...' : '提交入党申请' }}
        </button>
      </div>
    </div>

    <div v-else class="development-content">
      <div v-if="hasDeadlineReminder" class="deadline-alert card warning">
        <span class="alert-icon">⚠️</span>
        <div class="alert-content">
          <strong>节点到期提醒：</strong>
          <span>{{ currentStage?.stage_name }}阶段将于 {{ formatDate(currentStage?.deadline_date) }} 截止，请及时准备相关材料。</span>
        </div>
      </div>

      <div class="status-card card">
        <div class="status-header">
          <div class="status-info">
            <h2 class="status-title">发展进度</h2>
            <div class="status-badges">
              <span class="badge current">{{ getStageName(development.current_stage) }}</span>
              <span class="badge overall" :class="development.overall_status">
                {{ development.overall_status === 'completed' ? '已完成' : '进行中' }}
              </span>
            </div>
          </div>
          <div class="progress-ring">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" class="progress-bg" />
              <circle cx="50" cy="50" r="42" class="progress-fg" :stroke-dashoffset="264 - (264 * progressPercent / 100)" />
            </svg>
            <span class="progress-text">{{ progressPercent }}%</span>
          </div>
        </div>
        <div v-if="development.remarks" class="remarks-section">
          <span class="remarks-label">备注：</span>
          <span class="remarks-text">{{ development.remarks }}</span>
        </div>
        <div class="info-grid">
          <div v-if="development.branch_secretary" class="info-item">
            <span class="info-label">支部书记</span>
            <span class="info-value">{{ development.branch_secretary }}</span>
          </div>
          <div v-if="development.introducer1" class="info-item">
            <span class="info-label">培养联系人1</span>
            <span class="info-value">{{ development.introducer1 }}</span>
          </div>
          <div v-if="development.introducer2" class="info-item">
            <span class="info-label">培养联系人2</span>
            <span class="info-value">{{ development.introducer2 }}</span>
          </div>
        </div>
      </div>

      <div class="timeline-card card">
        <h3 class="section-title">发展流程时间轴</h3>
        <div class="timeline">
          <div
            v-for="(stage, index) in development.stages"
            :key="stage.id"
            class="timeline-item"
            :class="[stage.status, { active: stage.stage_code === development.current_stage }]"
          >
            <div class="timeline-connector">
              <div class="timeline-node">
                <span class="node-icon">{{ getStageIcon(stage.stage_code) }}</span>
              </div>
              <div v-if="index < development.stages!.length - 1" class="timeline-line"></div>
            </div>
            <div class="timeline-content">
              <div class="timeline-header">
                <h4 class="stage-name">{{ stage.stage_name }}</h4>
                <span class="status-tag" :class="stage.status">
                  {{ getStatusText(stage.status) }}
                </span>
              </div>
              <p class="stage-description">{{ stage.description }}</p>
              <div class="stage-meta">
                <span v-if="stage.start_date" class="meta-item">
                  📅 开始：{{ formatDate(stage.start_date) }}
                </span>
                <span v-if="stage.end_date" class="meta-item">
                  ✅ 完成：{{ formatDate(stage.end_date) }}
                </span>
                <span v-if="stage.deadline_date && stage.status === 'in_progress'" class="meta-item deadline">
                  ⏰ 截止：{{ formatDate(stage.deadline_date) }}
                </span>
                <span v-if="stage.reviewer" class="meta-item">
                  👤 审核人：{{ stage.reviewer }}
                </span>
              </div>
              <div v-if="stage.review_opinion" class="review-opinion">
                <span class="review-label">审核意见：</span>
                <span>{{ stage.review_opinion }}</span>
              </div>

              <div v-if="stage.stage_code === development.current_stage" class="materials-section">
                <div class="materials-header">
                  <h5 class="materials-title">📎 本阶段材料</h5>
                  <button class="btn btn-sm btn-outline" @click="showUploadModal = true">
                    + 上传材料
                  </button>
                </div>
                <div v-if="stageMaterials.length === 0" class="empty-materials">
                  暂无材料，请及时上传相关材料
                </div>
                <div v-else class="materials-list">
                  <div v-for="mat in stageMaterials" :key="mat.id" class="material-item">
                    <span class="material-icon">{{ getFileIcon(mat.material_name, mat.material_type) }}</span>
                    <div class="material-info">
                      <a
                        v-if="mat.file_url"
                        :href="getMaterialPreviewUrl(mat.file_url)"
                        target="_blank"
                        class="material-name-link"
                      >{{ mat.material_name }}</a>
                      <span v-else class="material-name">{{ mat.material_name }}</span>
                      <span v-if="mat.description" class="material-desc">{{ mat.description }}</span>
                      <span class="material-date">
                        {{ formatDateTime(mat.created_at) }}
                        <span v-if="mat.file_size"> · {{ formatFileSize(mat.file_size) }}</span>
                      </span>
                    </div>
                    <div class="material-actions">
                      <a
                        v-if="mat.file_url"
                        :href="getMaterialDownloadUrl(mat.id)"
                        class="btn-icon action"
                        title="下载"
                        @click.stop
                      >⬇️</a>
                      <button class="btn-icon" @click="handleDeleteMaterial(mat.id)" title="删除">
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="all-materials card">
        <h3 class="section-title">📚 全部材料归档</h3>
        <div v-if="development.materials!.length === 0" class="empty-state">
          暂无归档材料
        </div>
        <div v-else class="materials-table-wrapper">
          <table class="materials-table">
            <thead>
              <tr>
                <th>材料名称</th>
                <th>所属阶段</th>
                <th>大小</th>
                <th>上传时间</th>
                <th>说明</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="mat in development.materials" :key="mat.id">
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
                <td>{{ getStageName(mat.stage_code) }}</td>
                <td>{{ mat.file_size ? formatFileSize(mat.file_size) : '-' }}</td>
                <td>{{ formatDateTime(mat.created_at) }}</td>
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
                    <button class="link-btn danger" @click="handleDeleteMaterial(mat.id)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="history-card card">
        <h3 class="section-title">📋 操作历史记录</h3>
        <div v-if="development.history!.length === 0" class="empty-state">
          暂无操作记录
        </div>
        <div v-else class="history-list">
          <div v-for="record in development.history" :key="record.id" class="history-item">
            <div class="history-dot"></div>
            <div class="history-content">
              <div class="history-header">
                <span class="history-action">{{ getActionText(record.action_type) }}</span>
                <span class="history-stage">{{ getStageName(record.stage_code) }}</span>
              </div>
              <p v-if="record.action_detail" class="history-detail">{{ record.action_detail }}</p>
              <div class="history-meta">
                <span>操作人：{{ record.operator_name || '系统' }}</span>
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
          <h3>上传材料</h3>
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
              <option value="application">入党申请书</option>
              <option value="thought_report">思想汇报</option>
              <option value="certificate">培训证书</option>
              <option value="political_review">政审材料</option>
              <option value="application_form">入党志愿书</option>
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
  getMyDevelopment,
  applyForParty,
  uploadMaterialFile,
  deleteMaterial,
  getMaterialDownloadUrl,
  getMaterialPreviewUrl
} from '@/api/partyDevelopment'
import type { PartyDevelopment, PartyDevelopmentMaterial, PartyStageCode } from '@/types'

const loading = ref(false)
const applying = ref(false)
const development = ref<PartyDevelopment | null>(null)
const showUploadModal = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const acceptFileTypes = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.webp,.txt,.zip,.rar'
const uploadForm = ref({
  material_name: '',
  material_type: '',
  description: ''
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

const currentStage = computed(() => {
  if (!development.value?.stages) return null
  return development.value.stages.find(s => s.stage_code === development.value!.current_stage)
})

const progressPercent = computed(() => {
  if (!development.value?.stages) return 0
  const completed = development.value.stages.filter(s => s.status === 'completed').length
  return Math.round((completed / development.value.stages.length) * 100)
})

const stageMaterials = computed(() => {
  if (!development.value?.materials || !development.value?.current_stage) return []
  return development.value.materials.filter(m => m.stage_code === development.value!.current_stage)
})

const hasDeadlineReminder = computed(() => {
  if (!currentStage.value?.deadline_date) return false
  const deadline = new Date(currentStage.value.deadline_date)
  const now = new Date()
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= 7 && diffDays >= 0
})

const getStageIcon = (code?: PartyStageCode) => code ? stageIcons[code] || '📋' : '📋'
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

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const loadDevelopment = async () => {
  loading.value = true
  try {
    const res = await getMyDevelopment()
    development.value = res.data
  } catch (error) {
    console.error('加载党员发展信息失败', error)
  } finally {
    loading.value = false
  }
}

const handleApply = async () => {
  applying.value = true
  try {
    const res = await applyForParty()
    development.value = res.data
  } catch (error) {
    console.error('提交入党申请失败', error)
    alert('提交申请失败，请稍后重试')
  } finally {
    applying.value = false
  }
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
    application: '📝', thought_report: '✍️', certificate: '🏆',
    political_review: '📋', application_form: '📑'
  }
  return map[ext] || map[type || ''] || '📎'
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

const closeUploadModal = () => {
  if (uploading.value) return
  showUploadModal.value = false
  clearSelectedFile()
  uploadForm.value = { material_name: '', material_type: '', description: '' }
  uploadProgress.value = 0
}

watch(showUploadModal, (val) => {
  if (val) {
    nextTick(() => {
      uploadProgress.value = 0
    })
  }
})

const handleUpload = async () => {
  if (!development.value || !selectedFile.value || !uploadForm.value.material_name) return
  uploading.value = true
  uploadProgress.value = 0
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('development_id', String(development.value.id))
    formData.append('stage_code', development.value.current_stage)
    formData.append('material_name', uploadForm.value.material_name)
    if (uploadForm.value.material_type) {
      formData.append('material_type', uploadForm.value.material_type)
    }
    if (uploadForm.value.description) {
      formData.append('description', uploadForm.value.description)
    }

    await uploadMaterialFile(formData, (progress) => {
      uploadProgress.value = progress
    })

    uploadProgress.value = 100
    setTimeout(() => {
      closeUploadModal()
      loadDevelopment()
    }, 300)
  } catch (error: any) {
    console.error('上传材料失败', error)
    const msg = error?.response?.data?.message || error?.message || '上传失败，请稍后重试'
    alert(msg)
  } finally {
    uploading.value = false
  }
}

const handleDeleteMaterial = async (id: number) => {
  if (!confirm('确定删除该材料吗？删除后文件无法恢复。')) return
  try {
    await deleteMaterial(id)
    await loadDevelopment()
  } catch (error) {
    console.error('删除材料失败', error)
    alert('删除失败，请稍后重试')
  }
}

onMounted(() => {
  loadDevelopment()
})
</script>

<style scoped>
.party-development-page {
  max-width: 960px;
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

.apply-section {
  text-align: center;
  padding: 48px 32px;
}

.apply-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.apply-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.apply-desc {
  color: var(--text-secondary);
  line-height: 1.7;
  max-width: 600px;
  margin: 0 auto 24px;
}

.stage-overview {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px 24px;
  padding: 20px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
  margin-bottom: 28px;
  list-style: none;
}

.stage-overview li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-primary);
}

.stage-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary-color);
}

.btn-lg {
  padding: 12px 40px;
  font-size: 16px;
}

.deadline-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fff9e6;
  border: 1px solid #ffe58f;
  padding: 16px;
}

.alert-icon {
  font-size: 20px;
}

.alert-content {
  flex: 1;
  font-size: 14px;
  color: #8c6d1f;
}

.alert-content strong {
  margin-right: 6px;
}

.status-card {
  padding: 24px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 16px;
}

.status-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 10px;
}

.status-badges {
  display: flex;
  gap: 8px;
}

.badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.badge.current {
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

.progress-ring {
  position: relative;
  width: 80px;
  height: 80px;
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
  font-size: 16px;
  font-weight: 700;
  color: var(--primary-color);
}

.remarks-section {
  padding: 12px;
  background: var(--bg-light);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  font-size: 14px;
}

.remarks-label {
  color: var(--text-secondary);
  margin-right: 6px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
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

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  padding-left: 10px;
  border-left: 4px solid var(--primary-color);
}

.timeline-card {
  padding: 24px;
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
  width: 48px;
}

.timeline-node {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border: 3px solid #e0e0e0;
  font-size: 20px;
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
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.stage-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-tag {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.status-tag.pending {
  background: #f5f5f5;
  color: #8c8c8c;
}

.status-tag.in_progress {
  background: #fff1f0;
  color: var(--primary-color);
}

.status-tag.completed {
  background: #f6ffed;
  color: #52c41a;
}

.status-tag.rejected {
  background: #fff2f0;
  color: #ff4d4f;
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
  gap: 12px;
  margin-bottom: 8px;
}

.meta-item {
  font-size: 12px;
  color: var(--text-secondary);
}

.meta-item.deadline {
  color: var(--warning-color, #fa8c16);
  font-weight: 500;
}

.review-opinion {
  padding: 10px 12px;
  background: var(--bg-light);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 12px;
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
  margin-bottom: 12px;
}

.materials-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.empty-materials {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  padding: 12px;
}

.materials-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.material-item {
  display: flex;
  align-items: center;
  gap: 12px;
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
  color: var(--text-primary);
}

.material-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.material-date {
  font-size: 11px;
  color: var(--text-light);
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

.all-materials {
  padding: 24px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.materials-table-wrapper {
  overflow-x: auto;
}

.materials-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.materials-table th,
.materials-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.materials-table th {
  background: var(--bg-light);
  font-weight: 600;
  color: var(--text-primary);
}

.materials-table tr:hover td {
  background: var(--bg-light);
}

.history-card {
  padding: 24px;
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

.file-upload-area {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-md);
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.file-upload-area:hover {
  border-color: var(--primary-color);
  background: var(--bg-light);
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

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .status-header {
    flex-direction: column;
  }

  .progress-ring {
    align-self: center;
  }

  .timeline-content {
    padding-bottom: 24px;
  }

  .history-meta {
    flex-direction: column;
    gap: 4px;
  }
}

.material-item .material-name-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
}

.material-item .material-name-link:hover {
  text-decoration: underline;
}

.material-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.material-actions .btn-icon.action {
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  text-decoration: none;
}

.material-actions .btn-icon.action:hover {
  background: var(--primary-color);
  color: white;
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

.link-btn.danger:hover {
  color: #d9363e;
}

.file-upload-area.real {
  user-select: none;
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
}

.remove-file:hover {
  background: #ff4d4f;
  color: white;
}

.progress-bar-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
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
  background: var(--primary-color);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-bar-wrap .progress-text {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 42px;
  text-align: right;
}
</style>
