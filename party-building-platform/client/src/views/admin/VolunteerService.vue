<template>
  <div class="admin-volunteer">
    <div class="page-header">
      <h2 class="page-title">志愿服务管理</h2>
      <div class="header-actions">
        <button class="btn btn-primary" @click="showCreateModal = true">+ 新建项目</button>
      </div>
    </div>

    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-label">项目总数</div>
        <div class="stat-value">{{ stats.total_projects || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">招募中</div>
        <div class="stat-value" style="color: #28a745;">{{ stats.recruiting_projects || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">志愿者总数</div>
        <div class="stat-value" style="color: #007bff;">{{ stats.total_volunteers || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总服务时长</div>
        <div class="stat-value" style="color: #ffc107;">{{ stats.total_service_hours || 0 }}h</div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-group">
        <span class="filter-label">状态：</span>
        <select v-model="statusFilter" class="form-select form-select-sm" @change="loadProjects">
          <option value="">全部状态</option>
          <option value="recruiting">招募中</option>
          <option value="ongoing">进行中</option>
          <option value="completed">已结束</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>
      <div class="filter-group">
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索项目名称..."
          class="form-input form-input-sm"
          @keyup.enter="loadProjects"
        >
        <button class="btn btn-sm btn-primary" @click="loadProjects">搜索</button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else class="table-container card">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 50px;">ID</th>
            <th>项目名称</th>
            <th style="width: 80px;">分类</th>
            <th style="width: 100px;">地点</th>
            <th style="width: 140px;">开始时间</th>
            <th style="width: 80px;">报名人数</th>
            <th style="width: 80px;">积分/小时</th>
            <th style="width: 70px;">状态</th>
            <th style="width: 200px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="project in projects" :key="project.id">
            <td>{{ project.id }}</td>
            <td class="title-cell">{{ project.title }}</td>
            <td>{{ project.category || '-' }}</td>
            <td>{{ project.location || '-' }}</td>
            <td>{{ formatDateTime(project.start_time) }}</td>
            <td>{{ project.signup_count }}/{{ project.max_participants || '不限' }}</td>
            <td>{{ project.points_per_hour }}</td>
            <td>
              <span class="badge" :class="getStatusClass(project.status)">
                {{ getStatusText(project.status) }}
              </span>
            </td>
            <td>
              <button class="btn btn-sm btn-info" @click="viewSignups(project)">报名管理</button>
              <button class="btn btn-sm btn-success" @click="viewRecords(project)" style="margin-left: 4px;">时长登记</button>
              <button class="btn btn-sm btn-secondary" @click="handleEdit(project)" style="margin-left: 4px;">编辑</button>
              <button class="btn btn-sm btn-danger" @click="handleDelete(project)" style="margin-left: 4px;">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="projects.length === 0" class="empty-state">
        <p>暂无项目</p>
      </div>
    </div>

    <div v-if="total > pageSize" class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <button
        v-for="p in totalPages"
        :key="p"
        :class="{ active: p === page }"
        @click="changePage(p)"
      >{{ p }}</button>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
    </div>

    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingProject ? '编辑项目' : '新建项目' }}</h3>
          <button class="close-btn" @click="showCreateModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">项目名称 *</label>
              <input v-model="form.title" type="text" class="form-input" placeholder="请输入项目名称">
            </div>
            <div class="form-group">
              <label class="form-label">项目分类</label>
              <input v-model="form.category" type="text" class="form-input" placeholder="如：环境保护、敬老爱老等">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">服务地点</label>
              <input v-model="form.location" type="text" class="form-input" placeholder="请输入地点">
            </div>
            <div class="form-group">
              <label class="form-label">主办方</label>
              <input v-model="form.organizer" type="text" class="form-input" placeholder="请输入主办方">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">开始时间</label>
              <input v-model="form.start_time" type="datetime-local" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">结束时间</label>
              <input v-model="form.end_time" type="datetime-local" class="form-input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">报名截止</label>
              <input v-model="form.signup_deadline" type="datetime-local" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">最大人数</label>
              <input v-model.number="form.max_participants" type="number" class="form-input" placeholder="0为不限">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">积分/小时</label>
              <input v-model.number="form.points_per_hour" type="number" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">预计服务时长(小时)</label>
              <input v-model.number="form.service_hours" type="number" class="form-input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">联系人</label>
              <input v-model="form.contact_person" type="text" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">联系电话</label>
              <input v-model="form.contact_phone" type="text" class="form-input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="form.status" class="form-select">
                <option value="recruiting">招募中</option>
                <option value="ongoing">进行中</option>
                <option value="completed">已结束</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">封面图片URL</label>
              <input v-model="form.cover_image" type="text" class="form-input" placeholder="请输入封面图片地址">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">项目描述 *</label>
            <textarea v-model="form.description" class="form-textarea" rows="4" placeholder="请输入项目描述"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCreateModal = false">取消</button>
          <button class="btn btn-primary" @click="handleSubmit" :disabled="submitting">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showSignupModal" class="modal-overlay" @click.self="showSignupModal = false">
      <div class="modal-content modal-xl">
        <div class="modal-header">
          <h3 class="modal-title">报名管理 - {{ currentProject?.title }}</h3>
          <button class="close-btn" @click="showSignupModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="filter-bar-sm">
            <div class="filter-group">
              <span class="filter-label">状态：</span>
              <button
                class="btn btn-sm"
                :class="{ 'btn-primary': signupStatusFilter === '' }"
                @click="setSignupStatusFilter('')"
              >全部</button>
              <button
                class="btn btn-sm"
                :class="{ 'btn-warning': signupStatusFilter === 'pending' }"
                @click="setSignupStatusFilter('pending')"
              >待审核</button>
              <button
                class="btn btn-sm"
                :class="{ 'btn-success': signupStatusFilter === 'approved' }"
                @click="setSignupStatusFilter('approved')"
              >已通过</button>
              <button
                class="btn btn-sm"
                :class="{ 'btn-danger': signupStatusFilter === 'rejected' }"
                @click="setSignupStatusFilter('rejected')"
              >未通过</button>
            </div>
          </div>

          <div v-if="signupsLoading" class="loading">
            <div class="spinner"></div>
          </div>

          <div v-else-if="signups.length === 0" class="empty-state">
            <p>暂无报名记录</p>
          </div>

          <div v-else class="signup-list">
            <div
              v-for="signup in signups"
              :key="signup.id"
              class="signup-item"
            >
              <img v-if="signup.avatar" :src="signup.avatar" class="signup-avatar" alt="avatar">
              <div v-else class="signup-avatar placeholder">👤</div>
              <div class="signup-info">
                <div class="signup-name">{{ signup.real_name }}
                  <span class="signup-branch">({{ signup.branch }})</span>
                </div>
                <div class="signup-detail">
                  <span>报名理由：{{ signup.signup_reason || '无' }}</span>
                </div>
                <div class="signup-detail">
                  <span>个人技能：{{ signup.skills || '无' }}</span>
                </div>
                <div class="signup-time">
                  报名时间：{{ formatDateTime(signup.signed_up_at) }}
                </div>
              </div>
              <div class="signup-status">
                <span class="badge" :class="getSignupStatusClass(signup.status)">
                  {{ getSignupStatusText(signup.status) }}
                </span>
                <div v-if="signup.status === 'pending'" class="status-actions">
                  <button class="btn btn-sm btn-success" @click="handleApprove(signup)">通过</button>
                  <button class="btn btn-sm btn-danger" @click="handleReject(signup)" style="margin-left: 4px;">拒绝</button>
                </div>
                <div v-if="signup.review_opinion" class="review-opinion">
                  审核意见：{{ signup.review_opinion }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showRecordModal" class="modal-overlay" @click.self="showRecordModal = false">
      <div class="modal-content modal-xl">
        <div class="modal-header">
          <h3 class="modal-title">服务时长登记 - {{ currentProject?.title }}</h3>
          <button class="close-btn" @click="showRecordModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="record-actions">
            <button class="btn btn-primary btn-sm" @click="showAddRecordModal = true">+ 登记时长</button>
          </div>

          <div v-if="recordsLoading" class="loading">
            <div class="spinner"></div>
          </div>

          <div v-else-if="records.length === 0" class="empty-state">
            <p>暂无服务时长记录</p>
          </div>

          <div v-else class="record-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>志愿者</th>
                  <th style="width: 100px;">服务日期</th>
                  <th style="width: 150px;">服务时间</th>
                  <th style="width: 80px;">时长(小时)</th>
                  <th style="width: 80px;">积分</th>
                  <th>工作内容</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in records" :key="record.id">
                  <td>{{ record.real_name }}</td>
                  <td>{{ formatDate(record.service_date) }}</td>
                  <td>{{ formatTime(record.start_time) }} - {{ formatTime(record.end_time) }}</td>
                  <td>{{ record.actual_hours }}</td>
                  <td class="text-success">+{{ record.points_awarded }}</td>
                  <td class="text-ellipsis">{{ record.task_description || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddRecordModal" class="modal-overlay" @click.self="showAddRecordModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">登记服务时长</h3>
          <button class="close-btn" @click="showAddRecordModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">选择志愿者 *</label>
            <select v-model="recordForm.signup_id" class="form-select">
              <option value="">请选择志愿者</option>
              <option
                v-for="signup in approvedSignups"
                :key="signup.id"
                :value="signup.id"
              >
                {{ signup.real_name }} ({{ signup.branch }})
              </option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">服务日期 *</label>
              <input v-model="recordForm.service_date" type="date" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">积分/小时</label>
              <input :value="currentProject?.points_per_hour || 5" type="number" class="form-input" disabled>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">开始时间 *</label>
              <input v-model="recordForm.start_time" type="time" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">结束时间 *</label>
              <input v-model="recordForm.end_time" type="time" class="form-input">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">工作内容</label>
            <textarea v-model="recordForm.task_description" class="form-textarea" rows="3" placeholder="请输入工作内容"></textarea>
          </div>
          <div v-if="calculatedHours > 0" class="calculated-info">
            预计时长：<strong>{{ calculatedHours }}</strong> 小时，
            预计积分：<strong class="text-success">+{{ calculatedPoints }}</strong> 分
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAddRecordModal = false">取消</button>
          <button class="btn btn-primary" @click="handleAddRecord" :disabled="addingRecord">
            {{ addingRecord ? '登记中...' : '确认登记' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">拒绝报名</h3>
          <button class="close-btn" @click="showRejectModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">拒绝原因</label>
            <textarea v-model="rejectReason" class="form-textarea" rows="3" placeholder="请输入拒绝原因"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showRejectModal = false">取消</button>
          <button class="btn btn-danger" @click="confirmReject">确认拒绝</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  getAdminVolunteerProjects,
  createVolunteerProject,
  updateVolunteerProject,
  deleteVolunteerProject,
  getAdminVolunteerSignups,
  updateVolunteerSignupStatus,
  getAdminServiceRecords,
  createServiceRecord,
  getVolunteerStatsOverview
} from '@/api/volunteerService'
import type { VolunteerProject, VolunteerSignup, VolunteerServiceRecord, VolunteerStats } from '@/types'

const projects = ref<VolunteerProject[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const submitting = ref(false)
const statusFilter = ref('')
const keyword = ref('')

const stats = ref<VolunteerStats>({
  total_projects: 0,
  recruiting_projects: 0,
  completed_projects: 0,
  total_volunteers: 0,
  total_service_hours: 0,
  total_points_awarded: 0
})

const showCreateModal = ref(false)
const editingProject = ref<VolunteerProject | null>(null)

const form = reactive({
  title: '',
  description: '',
  cover_image: '',
  category: '',
  location: '',
  start_time: '',
  end_time: '',
  signup_deadline: '',
  max_participants: 0,
  points_per_hour: 5,
  service_hours: 0,
  organizer: '',
  contact_person: '',
  contact_phone: '',
  status: 'recruiting'
})

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const showSignupModal = ref(false)
const currentProject = ref<VolunteerProject | null>(null)
const signups = ref<VolunteerSignup[]>([])
const signupsLoading = ref(false)
const signupStatusFilter = ref('')
const signupPage = ref(1)
const signupPageSize = ref(20)
const signupTotal = ref(0)

const showRecordModal = ref(false)
const records = ref<VolunteerServiceRecord[]>([])
const recordsLoading = ref(false)
const recordPage = ref(1)
const recordPageSize = ref(20)
const recordTotal = ref(0)

const showAddRecordModal = ref(false)
const addingRecord = ref(false)
const approvedSignups = ref<VolunteerSignup[]>([])
const recordForm = reactive({
  signup_id: 0,
  service_date: '',
  start_time: '',
  end_time: '',
  task_description: ''
})

const showRejectModal = ref(false)
const currentRejectSignup = ref<VolunteerSignup | null>(null)
const rejectReason = ref('')

const calculatedHours = computed(() => {
  if (!recordForm.start_time || !recordForm.end_time) return 0
  const [startH, startM] = recordForm.start_time.split(':').map(Number)
  const [endH, endM] = recordForm.end_time.split(':').map(Number)
  const hours = (endH - startH) + (endM - startM) / 60
  return Math.max(0, Math.round(hours * 10) / 10)
})

const calculatedPoints = computed(() => {
  if (!currentProject.value) return 0
  return Math.floor(calculatedHours.value * currentProject.value.points_per_hour)
})

const loadStats = async () => {
  try {
    const res = await getVolunteerStatsOverview()
    stats.value = res.data
  } catch (error) {
    console.error('加载统计数据失败', error)
  }
}

const loadProjects = async () => {
  loading.value = true
  try {
    const res = await getAdminVolunteerProjects({
      page: page.value,
      page_size: pageSize.value,
      status: statusFilter.value || undefined,
      keyword: keyword.value || undefined
    })
    projects.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载项目失败', error)
  } finally {
    loading.value = false
  }
}

const changePage = (p: number) => {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadProjects()
  }
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    recruiting: '招募中',
    ongoing: '进行中',
    completed: '已结束',
    cancelled: '已取消'
  }
  return map[status] || status
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    recruiting: 'badge-success',
    ongoing: 'badge-info',
    completed: 'badge-warning',
    cancelled: 'badge-danger'
  }
  return map[status] || ''
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const handleEdit = (project: VolunteerProject) => {
  editingProject.value = project
  form.title = project.title
  form.description = project.description
  form.cover_image = project.cover_image || ''
  form.category = project.category || ''
  form.location = project.location || ''
  form.start_time = project.start_time ? project.start_time.slice(0, 16).replace(' ', 'T') : ''
  form.end_time = project.end_time ? project.end_time.slice(0, 16).replace(' ', 'T') : ''
  form.signup_deadline = project.signup_deadline ? project.signup_deadline.slice(0, 16).replace(' ', 'T') : ''
  form.max_participants = project.max_participants || 0
  form.points_per_hour = project.points_per_hour
  form.service_hours = project.service_hours || 0
  form.organizer = project.organizer || ''
  form.contact_person = project.contact_person || ''
  form.contact_phone = project.contact_phone || ''
  form.status = project.status
  showCreateModal.value = true
}

const handleDelete = async (project: VolunteerProject) => {
  if (!confirm(`确定要删除项目"${project.title}"吗？`)) return

  try {
    await deleteVolunteerProject(project.id)
    alert('删除成功')
    loadProjects()
    loadStats()
  } catch (error: any) {
    alert(error.message || '删除失败')
  }
}

const handleSubmit = async () => {
  if (!form.title.trim() || !form.description.trim()) {
    alert('标题和描述不能为空')
    return
  }

  submitting.value = true
  try {
    const data = { ...form }
    if (data.max_participants === 0) {
      data.max_participants = undefined as any
    }

    if (editingProject.value) {
      await updateVolunteerProject(editingProject.value.id, data)
      alert('更新成功')
    } else {
      await createVolunteerProject(data)
      alert('创建成功')
    }
    showCreateModal.value = false
    loadProjects()
    loadStats()
    resetForm()
  } catch (error: any) {
    alert(error.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  form.title = ''
  form.description = ''
  form.cover_image = ''
  form.category = ''
  form.location = ''
  form.start_time = ''
  form.end_time = ''
  form.signup_deadline = ''
  form.max_participants = 0
  form.points_per_hour = 5
  form.service_hours = 0
  form.organizer = ''
  form.contact_person = ''
  form.contact_phone = ''
  form.status = 'recruiting'
  editingProject.value = null
}

const viewSignups = async (project: VolunteerProject) => {
  currentProject.value = project
  signupStatusFilter.value = ''
  showSignupModal.value = true
  loadSignups()
}

const setSignupStatusFilter = (status: string) => {
  signupStatusFilter.value = status
  signupPage.value = 1
  loadSignups()
}

const loadSignups = async () => {
  if (!currentProject.value) return

  signupsLoading.value = true
  try {
    const res = await getAdminVolunteerSignups(currentProject.value.id, {
      page: signupPage.value,
      page_size: signupPageSize.value,
      status: signupStatusFilter.value || undefined
    })
    signups.value = res.data.list
    signupTotal.value = res.data.total
  } catch (error) {
    console.error('加载报名记录失败', error)
  } finally {
    signupsLoading.value = false
  }
}

const getSignupStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '未通过',
    cancelled: '已取消'
  }
  return map[status] || status
}

const getSignupStatusClass = (status: string) => {
  const map: Record<string, string> = {
    pending: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-danger',
    cancelled: 'badge-secondary'
  }
  return map[status] || ''
}

const handleApprove = async (signup: VolunteerSignup) => {
  if (!confirm(`确定要通过 ${signup.real_name} 的报名申请吗？`)) return

  try {
    await updateVolunteerSignupStatus(signup.id, { status: 'approved', review_opinion: '审核通过' })
    alert('审核通过')
    loadSignups()
  } catch (error: any) {
    alert(error.message || '操作失败')
  }
}

const handleReject = (signup: VolunteerSignup) => {
  currentRejectSignup.value = signup
  rejectReason.value = ''
  showRejectModal.value = true
}

const confirmReject = async () => {
  if (!currentRejectSignup.value) return

  try {
    await updateVolunteerSignupStatus(currentRejectSignup.value.id, {
      status: 'rejected',
      review_opinion: rejectReason.value
    })
    alert('已拒绝')
    showRejectModal.value = false
    loadSignups()
  } catch (error: any) {
    alert(error.message || '操作失败')
  }
}

const viewRecords = async (project: VolunteerProject) => {
  currentProject.value = project
  showRecordModal.value = true
  loadRecords()
  loadApprovedSignups()
}

const loadRecords = async () => {
  if (!currentProject.value) return

  recordsLoading.value = true
  try {
    const res = await getAdminServiceRecords(currentProject.value.id, {
      page: recordPage.value,
      page_size: recordPageSize.value
    })
    records.value = res.data.list
    recordTotal.value = res.data.total
  } catch (error) {
    console.error('加载服务记录失败', error)
  } finally {
    recordsLoading.value = false
  }
}

const loadApprovedSignups = async () => {
  if (!currentProject.value) return

  try {
    const res = await getAdminVolunteerSignups(currentProject.value.id, {
      page: 1,
      page_size: 100,
      status: 'approved'
    })
    approvedSignups.value = res.data.list
  } catch (error) {
    console.error('加载审核通过的报名失败', error)
  }
}

const handleAddRecord = async () => {
  if (!recordForm.signup_id) {
    alert('请选择志愿者')
    return
  }
  if (!recordForm.service_date) {
    alert('请选择服务日期')
    return
  }
  if (!recordForm.start_time || !recordForm.end_time) {
    alert('请选择开始和结束时间')
    return
  }

  const startDateTime = `${recordForm.service_date} ${recordForm.start_time}:00`
  const endDateTime = `${recordForm.service_date} ${recordForm.end_time}:00`

  addingRecord.value = true
  try {
    await createServiceRecord({
      signup_id: recordForm.signup_id,
      service_date: recordForm.service_date,
      start_time: startDateTime,
      end_time: endDateTime,
      task_description: recordForm.task_description
    })
    alert('登记成功，积分已发放')
    showAddRecordModal.value = false
    loadRecords()
    loadStats()
    resetRecordForm()
  } catch (error: any) {
    alert(error.message || '登记失败')
  } finally {
    addingRecord.value = false
  }
}

const resetRecordForm = () => {
  recordForm.signup_id = 0
  recordForm.service_date = ''
  recordForm.start_time = ''
  recordForm.end_time = ''
  recordForm.task_description = ''
}

onMounted(() => {
  loadStats()
  loadProjects()
})
</script>

<style scoped>
.admin-volunteer {
  padding-bottom: 20px;
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
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.filter-bar-sm {
  margin-bottom: 16px;
}

.table-container {
  padding: 0;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: var(--bg-light);
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
}

.data-table tbody tr:hover {
  background: var(--bg-light);
}

.title-cell {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-success {
  color: #28a745;
}

.text-ellipsis {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modal-lg {
  max-width: 700px;
}

.modal-xl {
  max-width: 900px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-light);
}

.close-btn:hover {
  color: var(--text-primary);
}

.signup-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.signup-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
  gap: 16px;
}

.signup-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.signup-avatar.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  font-size: 24px;
}

.signup-info {
  flex: 1;
}

.signup-name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.signup-branch {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: normal;
}

.signup-detail {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.signup-time {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 6px;
}

.signup-status {
  text-align: right;
  flex-shrink: 0;
}

.status-actions {
  margin-top: 8px;
  display: flex;
  gap: 4px;
}

.review-opinion {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
  max-width: 200px;
}

.record-actions {
  margin-bottom: 16px;
}

.record-table-wrap {
  max-height: 400px;
  overflow-y: auto;
}

.calculated-info {
  margin-top: 12px;
  padding: 12px;
  background: #e6f7ff;
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
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

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
}

.pagination button {
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.pagination button:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.pagination button.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 992px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
