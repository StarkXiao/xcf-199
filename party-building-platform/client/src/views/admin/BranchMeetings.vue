<template>
  <div class="admin-branch-meetings">
    <div class="page-header">
      <h2 class="page-title">支部会议管理</h2>
      <button class="btn btn-primary" @click="handleCreate">+ 新建会议</button>
    </div>

    <div class="filter-bar card">
      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">支部</label>
          <select v-model="filters.branch" class="form-select" @change="loadMeetings">
            <option value="">全部支部</option>
            <option v-for="b in branches" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">会议类型</label>
          <select v-model="filters.meeting_type" class="form-select" @change="loadMeetings">
            <option value="">全部类型</option>
            <option value="branch_committee">支委会</option>
            <option value="member_congress">党员大会</option>
            <option value="group_meeting">党小组会</option>
            <option value="party_lesson">党课</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">状态</label>
          <select v-model="filters.status" class="form-select" @change="loadMeetings">
            <option value="">全部状态</option>
            <option value="notified">通知中</option>
            <option value="ongoing">进行中</option>
            <option value="completed">已结束</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">开始时间</label>
          <input v-model="filters.start_time" type="date" class="form-input" @change="loadMeetings">
        </div>
        <div class="filter-group">
          <label class="filter-label">结束时间</label>
          <input v-model="filters.end_time" type="date" class="form-input" @change="loadMeetings">
        </div>
        <div class="filter-group" style="align-self: flex-end;">
          <button class="btn btn-secondary btn-sm" @click="resetFilters">重置筛选</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <div v-else class="table-container card">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:50px">ID</th>
            <th>会议标题</th>
            <th style="width:100px">支部</th>
            <th style="width:80px">类型</th>
            <th style="width:130px">会议时间</th>
            <th style="width:60px">参会</th>
            <th style="width:60px">签到</th>
            <th style="width:70px">状态</th>
            <th style="width:150px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in meetings" :key="m.id">
            <td>{{ m.id }}</td>
            <td class="title-cell">{{ m.title }}</td>
            <td>{{ m.branch }}</td>
            <td><span class="tag tag-primary">{{ getTypeName(m.meeting_type) }}</span></td>
            <td>{{ formatDateTime(m.meeting_time) }}</td>
            <td>{{ m.attendee_count || 0 }}</td>
            <td>{{ m.checkin_count || 0 }}</td>
            <td>
              <span class="badge" :class="getStatusClass(m.status)">{{ getStatusName(m.status) }}</span>
            </td>
            <td>
              <button class="btn btn-sm btn-secondary" @click="handleDetail(m)">详情</button>
              <button class="btn btn-sm btn-outline" @click="handleEdit(m)" style="margin-left:4px">编辑</button>
              <button class="btn btn-sm btn-danger" @click="handleDelete(m)" style="margin-left:4px">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="meetings.length === 0" class="empty-state"><p>暂无会议记录</p></div>
    </div>

    <div v-if="total > pageSize" class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <button v-for="p in totalPages" :key="p" :class="{ active: p === page }" @click="changePage(p)">{{ p }}</button>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
    </div>

    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content" style="max-width:700px">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingMeeting ? '编辑会议' : '新建会议' }}</h3>
          <button class="close-btn" @click="showCreateModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">会议标题 *</label>
              <input v-model="form.title" type="text" class="form-input" placeholder="请输入会议标题">
            </div>
            <div class="form-group">
              <label class="form-label">所属支部 *</label>
              <select v-model="form.branch" class="form-select">
                <option value="">请选择支部</option>
                <option v-for="b in branches" :key="b" :value="b">{{ b }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">会议类型 *</label>
              <select v-model="form.meeting_type" class="form-select">
                <option value="branch_committee">支委会</option>
                <option value="member_congress">党员大会</option>
                <option value="group_meeting">党小组会</option>
                <option value="party_lesson">党课</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">会议地点</label>
              <input v-model="form.location" type="text" class="form-input" placeholder="请输入会议地点">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">会议时间 *</label>
              <input v-model="form.meeting_time" type="datetime-local" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">结束时间</label>
              <input v-model="form.end_time" type="datetime-local" class="form-input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="form.status" class="form-select">
                <option value="notified">通知中</option>
                <option value="ongoing">进行中</option>
                <option value="completed">已结束</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">会议通知内容</label>
            <textarea v-model="form.notification_content" class="form-textarea" rows="3" placeholder="请输入会议通知内容"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">会议纪要</label>
            <textarea v-model="form.minutes_content" class="form-textarea" rows="3" placeholder="请输入会议纪要"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCreateModal = false">取消</button>
          <button class="btn btn-primary" @click="handleSubmit" :disabled="submitting">{{ submitting ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal-content" style="max-width:900px">
        <div class="modal-header">
          <h3 class="modal-title">会议详情 - {{ detailData?.title }}</h3>
          <button class="close-btn" @click="showDetailModal = false">×</button>
        </div>
        <div class="modal-body" v-if="detailData">
          <div class="detail-tabs">
            <button class="tab-btn" :class="{ active: detailTab === 'info' }" @click="detailTab = 'info'">基本信息</button>
            <button class="tab-btn" :class="{ active: detailTab === 'agendas' }" @click="detailTab = 'agendas'">议题管理</button>
            <button class="tab-btn" :class="{ active: detailTab === 'attendees' }" @click="detailTab = 'attendees'">参会名单</button>
            <button class="tab-btn" :class="{ active: detailTab === 'checkins' }" @click="detailTab = 'checkins'">签到记录</button>
            <button class="tab-btn" :class="{ active: detailTab === 'resolutions' }" @click="detailTab = 'resolutions'">决议留痕</button>
          </div>

          <div v-if="detailTab === 'info'" class="tab-content">
            <div class="info-grid">
              <div class="info-item"><span class="info-label">会议标题</span><span>{{ detailData.title }}</span></div>
              <div class="info-item"><span class="info-label">所属支部</span><span>{{ detailData.branch }}</span></div>
              <div class="info-item"><span class="info-label">会议类型</span><span class="tag tag-primary">{{ getTypeName(detailData.meeting_type) }}</span></div>
              <div class="info-item"><span class="info-label">会议地点</span><span>{{ detailData.location || '-' }}</span></div>
              <div class="info-item"><span class="info-label">会议时间</span><span>{{ formatDateTime(detailData.meeting_time) }}</span></div>
              <div class="info-item"><span class="info-label">结束时间</span><span>{{ formatDateTime(detailData.end_time) }}</span></div>
              <div class="info-item"><span class="info-label">状态</span><span class="badge" :class="getStatusClass(detailData.status)">{{ getStatusName(detailData.status) }}</span></div>
              <div class="info-item"><span class="info-label">创建人</span><span>{{ detailData.creator_name || '-' }}</span></div>
            </div>
            <div class="info-block" v-if="detailData.notification_content">
              <h4 class="info-block-title">会议通知</h4>
              <p class="info-block-text">{{ detailData.notification_content }}</p>
            </div>
            <div class="info-block" v-if="detailData.minutes_content">
              <h4 class="info-block-title">会议纪要</h4>
              <p class="info-block-text">{{ detailData.minutes_content }}</p>
            </div>
          </div>

          <div v-if="detailTab === 'agendas'" class="tab-content">
            <div class="tab-header">
              <h4>议题列表</h4>
              <button class="btn btn-sm btn-primary" @click="showAddAgenda = true">+ 添加议题</button>
            </div>
            <div v-if="showAddAgenda" class="inline-form card">
              <div class="form-row">
                <div class="form-group" style="flex:2">
                  <label class="form-label">议题标题 *</label>
                  <input v-model="agendaForm.title" type="text" class="form-input" placeholder="请输入议题标题">
                </div>
                <div class="form-group" style="flex:1">
                  <label class="form-label">排序</label>
                  <input v-model.number="agendaForm.sort_order" type="number" class="form-input">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">议题内容</label>
                <textarea v-model="agendaForm.content" class="form-textarea" rows="2" placeholder="请输入议题内容"></textarea>
              </div>
              <div class="inline-form-actions">
                <button class="btn btn-sm btn-secondary" @click="showAddAgenda = false">取消</button>
                <button class="btn btn-sm btn-primary" @click="handleAddAgenda">添加</button>
              </div>
            </div>
            <div v-for="a in detailData.agendas" :key="a.id" class="agenda-item card">
              <div class="agenda-header">
                <span class="agenda-order">{{ a.sort_order }}.</span>
                <span class="agenda-title">{{ a.title }}</span>
                <span class="badge" :class="getAgendaStatusClass(a.status)">{{ getAgendaStatusName(a.status) }}</span>
                <div class="agenda-actions">
                  <button class="btn btn-sm btn-secondary" @click="handleEditAgenda(a)">编辑</button>
                  <button class="btn btn-sm btn-danger" @click="handleDeleteAgenda(a)" style="margin-left:4px">删除</button>
                </div>
              </div>
              <p class="agenda-content" v-if="a.content">{{ a.content }}</p>
              <p class="agenda-result" v-if="a.discussion_result"><strong>讨论结果：</strong>{{ a.discussion_result }}</p>
            </div>
            <div v-if="!detailData.agendas?.length" class="empty-state"><p>暂无议题</p></div>
          </div>

          <div v-if="detailTab === 'attendees'" class="tab-content">
            <div class="tab-header">
              <h4>参会名单</h4>
              <button class="btn btn-sm btn-primary" @click="showAddAttendee = true">+ 添加参会人</button>
            </div>
            <div v-if="showAddAttendee" class="inline-form card">
              <div class="form-group">
                <label class="form-label">选择党员（可多选）</label>
                <div class="user-select-grid">
                  <label v-for="u in availableUsers" :key="u.id" class="user-select-item">
                    <input type="checkbox" :value="u.id" v-model="selectedUserIds">
                    <span>{{ u.real_name }} ({{ u.branch }})</span>
                  </label>
                </div>
              </div>
              <div class="inline-form-actions">
                <button class="btn btn-sm btn-secondary" @click="showAddAttendee = false">取消</button>
                <button class="btn btn-sm btn-primary" @click="handleAddAttendees">添加</button>
              </div>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>支部</th>
                  <th>必参</th>
                  <th>状态</th>
                  <th>已签到</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in detailData.attendees" :key="a.id">
                  <td>{{ a.real_name || '-' }}</td>
                  <td>{{ a.branch || '-' }}</td>
                  <td>{{ a.is_required ? '是' : '否' }}</td>
                  <td>
                    <select :value="a.status" class="form-select" style="width:auto" @change="handleUpdateAttendee(a, $event)">
                      <option value="pending">待确认</option>
                      <option value="confirmed">已确认</option>
                      <option value="leave">已请假</option>
                      <option value="unresponsive">未响应</option>
                    </select>
                  </td>
                  <td>{{ detailData.checkins?.some(c => c.user_id === a.user_id) ? '✓' : '-' }}</td>
                  <td><button class="btn btn-sm btn-danger" @click="handleRemoveAttendee(a)">移除</button></td>
                </tr>
              </tbody>
            </table>
            <div v-if="!detailData.attendees?.length" class="empty-state"><p>暂无参会人员</p></div>
          </div>

          <div v-if="detailTab === 'checkins'" class="tab-content">
            <div class="tab-header"><h4>签到记录</h4></div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>签到时间</th>
                  <th>签到方式</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in detailData.checkins" :key="c.id">
                  <td>{{ c.real_name || '-' }}</td>
                  <td>{{ formatDateTime(c.checkin_time) }}</td>
                  <td>{{ c.checkin_type === 'online' ? '线上' : '现场' }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="!detailData.checkins?.length" class="empty-state"><p>暂无签到记录</p></div>
          </div>

          <div v-if="detailTab === 'resolutions'" class="tab-content">
            <div class="tab-header">
              <h4>决议留痕</h4>
              <button class="btn btn-sm btn-primary" @click="showAddResolution = true">+ 添加决议</button>
            </div>
            <div v-if="showAddResolution" class="inline-form card">
              <div class="form-row">
                <div class="form-group" style="flex:2">
                  <label class="form-label">决议标题 *</label>
                  <input v-model="resolutionForm.title" type="text" class="form-input" placeholder="请输入决议标题">
                </div>
                <div class="form-group" style="flex:1">
                  <label class="form-label">关联议题</label>
                  <select v-model="resolutionForm.agenda_id" class="form-select">
                    <option :value="null">无</option>
                    <option v-for="a in detailData.agendas" :key="a.id" :value="a.id">{{ a.title }}</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">决议内容</label>
                <textarea v-model="resolutionForm.content" class="form-textarea" rows="2" placeholder="请输入决议内容"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">表决结果</label>
                  <select v-model="resolutionForm.result" class="form-select">
                    <option value="pending">待表决</option>
                    <option value="passed">通过</option>
                    <option value="rejected">未通过</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">赞成票</label>
                  <input v-model.number="resolutionForm.vote_for" type="number" class="form-input" min="0">
                </div>
                <div class="form-group">
                  <label class="form-label">反对票</label>
                  <input v-model.number="resolutionForm.vote_against" type="number" class="form-input" min="0">
                </div>
                <div class="form-group">
                  <label class="form-label">弃权票</label>
                  <input v-model.number="resolutionForm.vote_abstain" type="number" class="form-input" min="0">
                </div>
              </div>
              <div class="inline-form-actions">
                <button class="btn btn-sm btn-secondary" @click="showAddResolution = false">取消</button>
                <button class="btn btn-sm btn-primary" @click="handleAddResolution">添加</button>
              </div>
            </div>
            <div v-for="r in detailData.resolutions" :key="r.id" class="resolution-item card">
              <div class="resolution-header">
                <span class="resolution-title">{{ r.title }}</span>
                <span class="badge" :class="r.result === 'passed' ? 'badge-success' : r.result === 'rejected' ? 'badge-danger' : 'badge-warning'">{{ r.result === 'passed' ? '通过' : r.result === 'rejected' ? '未通过' : '待表决' }}</span>
                <button class="btn btn-sm btn-danger" @click="handleDeleteResolution(r)" style="margin-left:auto">删除</button>
              </div>
              <p class="resolution-content" v-if="r.content">{{ r.content }}</p>
              <p class="resolution-votes" v-if="r.result !== 'pending'">
                表决：赞成 {{ r.vote_for }} 票 / 反对 {{ r.vote_against }} 票 / 弃权 {{ r.vote_abstain }} 票
              </p>
              <p class="resolution-meta" v-if="r.agenda_title">关联议题：{{ r.agenda_title }}</p>
            </div>
            <div v-if="!detailData.resolutions?.length" class="empty-state"><p>暂无决议记录</p></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showDetailModal = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  getBranchMeetings, getBranchMeetingDetail, createBranchMeeting, updateBranchMeeting, deleteBranchMeeting,
  addAgenda, updateAgenda, deleteAgenda, addAttendees, updateAttendee, removeAttendee,
  addResolution, deleteResolution, getBranches
} from '@/api/branchMeetings'
import { getAdminUsers } from '@/api/points'
import type { BranchMeeting, BranchMeetingAgenda, BranchMeetingAttendee, BranchMeetingResolution } from '@/types'
import type { User } from '@/types'

const meetings = ref<BranchMeeting[]>([])
const branches = ref<string[]>([])
const allUsers = ref<User[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const submitting = ref(false)
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const editingMeeting = ref<BranchMeeting | null>(null)
const detailData = ref<BranchMeeting | null>(null)
const detailTab = ref('info')
const showAddAgenda = ref(false)
const showAddAttendee = ref(false)
const showAddResolution = ref(false)
const selectedUserIds = ref<number[]>([])

const filters = reactive({
  branch: '',
  meeting_type: '',
  status: '',
  start_time: '',
  end_time: ''
})

const form = reactive({
  title: '',
  branch: '',
  meeting_type: 'branch_committee',
  location: '',
  meeting_time: '',
  end_time: '',
  status: 'notified',
  notification_content: '',
  minutes_content: ''
})

const agendaForm = reactive({ title: '', content: '', sort_order: 1 })
const resolutionForm = reactive({
  title: '', content: '', agenda_id: null as number | null,
  result: 'pending' as string, vote_for: 0, vote_against: 0, vote_abstain: 0
})

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const availableUsers = computed(() => {
  if (!detailData.value?.attendees) return allUsers.value
  const attendeeIds = detailData.value.attendees.map(a => a.user_id)
  return allUsers.value.filter(u => !attendeeIds.includes(u.id))
})

const loadMeetings = async () => {
  loading.value = true
  try {
    const params: any = { page: page.value, page_size: pageSize.value }
    if (filters.branch) params.branch = filters.branch
    if (filters.meeting_type) params.meeting_type = filters.meeting_type
    if (filters.status) params.status = filters.status
    if (filters.start_time) params.start_time = filters.start_time
    if (filters.end_time) params.end_time = filters.end_time
    const res = await getBranchMeetings(params)
    meetings.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载会议失败', error)
  } finally {
    loading.value = false
  }
}

const loadBranches = async () => {
  try {
    const res = await getBranches()
    branches.value = res.data
  } catch (error) {
    console.error('加载支部失败', error)
  }
}

const loadUsers = async () => {
  try {
    const res = await getAdminUsers({ page: 1, page_size: 200 })
    allUsers.value = res.data.list
  } catch (error) {
    console.error('加载用户失败', error)
  }
}

const changePage = (p: number) => {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadMeetings()
  }
}

const resetFilters = () => {
  filters.branch = ''
  filters.meeting_type = ''
  filters.status = ''
  filters.start_time = ''
  filters.end_time = ''
  page.value = 1
  loadMeetings()
}

const getTypeName = (type: string) => {
  const map: Record<string, string> = { branch_committee: '支委会', member_congress: '党员大会', group_meeting: '党小组会', party_lesson: '党课' }
  return map[type] || type
}

const getStatusName = (status: string) => {
  const map: Record<string, string> = { notified: '通知中', ongoing: '进行中', completed: '已结束', cancelled: '已取消' }
  return map[status] || status
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = { notified: 'badge-info', ongoing: 'badge-success', completed: 'badge-warning', cancelled: 'badge-danger' }
  return map[status] || ''
}

const getAgendaStatusName = (status: string) => {
  const map: Record<string, string> = { pending: '待讨论', discussed: '已讨论', passed: '已通过', rejected: '未通过' }
  return map[status] || status
}

const getAgendaStatusClass = (status: string) => {
  const map: Record<string, string> = { pending: 'badge-info', discussed: 'badge-warning', passed: 'badge-success', rejected: 'badge-danger' }
  return map[status] || ''
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const handleCreate = () => {
  editingMeeting.value = null
  form.title = ''
  form.branch = ''
  form.meeting_type = 'branch_committee'
  form.location = ''
  form.meeting_time = ''
  form.end_time = ''
  form.status = 'notified'
  form.notification_content = ''
  form.minutes_content = ''
  showCreateModal.value = true
}

const handleEdit = async (m: BranchMeeting) => {
  editingMeeting.value = m
  form.title = m.title
  form.branch = m.branch
  form.meeting_type = m.meeting_type
  form.location = m.location || ''
  form.meeting_time = m.meeting_time ? m.meeting_time.slice(0, 16).replace(' ', 'T') : ''
  form.end_time = m.end_time ? m.end_time.slice(0, 16).replace(' ', 'T') : ''
  form.status = m.status
  form.notification_content = m.notification_content || ''
  form.minutes_content = m.minutes_content || ''
  showCreateModal.value = true
}

const handleDetail = async (m: BranchMeeting) => {
  try {
    const res = await getBranchMeetingDetail(m.id)
    detailData.value = res.data
    detailTab.value = 'info'
    showAddAgenda.value = false
    showAddAttendee.value = false
    showAddResolution.value = false
    showDetailModal.value = true
  } catch (error) {
    console.error('加载会议详情失败', error)
  }
}

const handleDelete = async (m: BranchMeeting) => {
  if (!confirm(`确定要删除会议"${m.title}"吗？`)) return
  try {
    await deleteBranchMeeting(m.id)
    alert('删除成功')
    loadMeetings()
  } catch (error: any) {
    alert(error.message || '删除失败')
  }
}

const handleSubmit = async () => {
  if (!form.title.trim() || !form.branch || !form.meeting_type || !form.meeting_time) {
    alert('请填写必填项')
    return
  }
  submitting.value = true
  try {
    if (editingMeeting.value) {
      await updateBranchMeeting(editingMeeting.value.id, { ...form } as any)
      alert('更新成功')
    } else {
      await createBranchMeeting({ ...form } as any)
      alert('创建成功')
    }
    showCreateModal.value = false
    loadMeetings()
  } catch (error: any) {
    alert(error.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

const handleAddAgenda = async () => {
  if (!agendaForm.title.trim() || !detailData.value) return
  try {
    await addAgenda(detailData.value.id, { ...agendaForm })
    agendaForm.title = ''
    agendaForm.content = ''
    agendaForm.sort_order = (detailData.value.agendas?.length || 0) + 1
    showAddAgenda.value = false
    const res = await getBranchMeetingDetail(detailData.value.id)
    detailData.value = res.data
  } catch (error: any) {
    alert(error.message || '添加议题失败')
  }
}

const handleEditAgenda = async (a: BranchMeetingAgenda) => {
  const result = prompt('请输入讨论结果', a.discussion_result || '')
  if (result === null) return
  try {
    await updateAgenda(detailData.value!.id, a.id, { discussion_result: result, status: result ? 'discussed' : a.status })
    const res = await getBranchMeetingDetail(detailData.value!.id)
    detailData.value = res.data
  } catch (error: any) {
    alert(error.message || '更新议题失败')
  }
}

const handleDeleteAgenda = async (a: BranchMeetingAgenda) => {
  if (!confirm(`确定要删除议题"${a.title}"吗？`)) return
  try {
    await deleteAgenda(detailData.value!.id, a.id)
    const res = await getBranchMeetingDetail(detailData.value!.id)
    detailData.value = res.data
  } catch (error: any) {
    alert(error.message || '删除议题失败')
  }
}

const handleAddAttendees = async () => {
  if (!selectedUserIds.value.length || !detailData.value) return
  try {
    await addAttendees(detailData.value.id, selectedUserIds.value)
    selectedUserIds.value = []
    showAddAttendee.value = false
    const res = await getBranchMeetingDetail(detailData.value.id)
    detailData.value = res.data
  } catch (error: any) {
    alert(error.message || '添加参会人失败')
  }
}

const handleUpdateAttendee = async (a: BranchMeetingAttendee, event: Event) => {
  const status = (event.target as HTMLSelectElement).value
  try {
    await updateAttendee(detailData.value!.id, a.id, { status } as any)
    const res = await getBranchMeetingDetail(detailData.value!.id)
    detailData.value = res.data
  } catch (error: any) {
    alert(error.message || '更新状态失败')
  }
}

const handleRemoveAttendee = async (a: BranchMeetingAttendee) => {
  if (!confirm(`确定要移除"${a.real_name || '该参会人'}"吗？`)) return
  try {
    await removeAttendee(detailData.value!.id, a.id)
    const res = await getBranchMeetingDetail(detailData.value!.id)
    detailData.value = res.data
  } catch (error: any) {
    alert(error.message || '移除参会人失败')
  }
}

const handleAddResolution = async () => {
  if (!resolutionForm.title.trim() || !detailData.value) return
  try {
    await addResolution(detailData.value.id, { ...resolutionForm, agenda_id: resolutionForm.agenda_id || undefined } as any)
    resolutionForm.title = ''
    resolutionForm.content = ''
    resolutionForm.agenda_id = null
    resolutionForm.result = 'pending'
    resolutionForm.vote_for = 0
    resolutionForm.vote_against = 0
    resolutionForm.vote_abstain = 0
    showAddResolution.value = false
    const res = await getBranchMeetingDetail(detailData.value.id)
    detailData.value = res.data
  } catch (error: any) {
    alert(error.message || '添加决议失败')
  }
}

const handleDeleteResolution = async (r: BranchMeetingResolution) => {
  if (!confirm(`确定要删除决议"${r.title}"吗？`)) return
  try {
    await deleteResolution(detailData.value!.id, r.id)
    const res = await getBranchMeetingDetail(detailData.value!.id)
    detailData.value = res.data
  } catch (error: any) {
    alert(error.message || '删除决议失败')
  }
}

onMounted(() => {
  loadMeetings()
  loadBranches()
  loadUsers()
})
</script>

<style scoped>
.admin-branch-meetings { padding-bottom: 20px; }
.filter-bar { margin-bottom: 16px; }
.filter-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.filter-group .form-input, .filter-group .form-select { min-width: 140px; padding: 6px 10px; font-size: 13px; }
.table-container { padding: 0; overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { background: var(--bg-light); padding: 12px 16px; text-align: left; font-weight: 600; font-size: 13px; color: var(--text-secondary); }
.data-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); font-size: 14px; }
.data-table tbody tr:hover { background: var(--bg-light); }
.title-cell { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-light); }
.close-btn:hover { color: var(--text-primary); }
.detail-tabs { display: flex; gap: 0; border-bottom: 2px solid var(--border-color); margin-bottom: 20px; }
.tab-btn { padding: 10px 20px; background: none; border: none; cursor: pointer; font-size: 14px; color: var(--text-secondary); border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab-btn.active { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 500; }
.tab-content { min-height: 200px; }
.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 20px; }
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-label { font-size: 12px; color: var(--text-light); font-weight: 500; }
.info-block { margin-bottom: 16px; }
.info-block-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); }
.info-block-text { font-size: 14px; color: var(--text-secondary); line-height: 1.8; white-space: pre-wrap; }
.agenda-item { margin-bottom: 10px; }
.agenda-header { display: flex; align-items: center; gap: 8px; }
.agenda-order { font-weight: 600; color: var(--primary-color); }
.agenda-title { font-weight: 500; flex: 1; }
.agenda-actions { margin-left: auto; }
.agenda-content { font-size: 13px; color: var(--text-secondary); margin-top: 6px; }
.agenda-result { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.inline-form { margin-bottom: 16px; padding: 16px; }
.inline-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.user-select-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; max-height: 200px; overflow-y: auto; }
.user-select-item { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
.resolution-item { margin-bottom: 10px; }
.resolution-header { display: flex; align-items: center; gap: 8px; }
.resolution-title { font-weight: 500; flex: 1; }
.resolution-content { font-size: 13px; color: var(--text-secondary); margin-top: 6px; }
.resolution-votes { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.resolution-meta { font-size: 12px; color: var(--text-light); margin-top: 4px; }
@media (max-width: 992px) {
  .data-table th:nth-child(4), .data-table td:nth-child(4), .data-table th:nth-child(5), .data-table td:nth-child(5) { display: none; }
  .form-row { grid-template-columns: 1fr; }
  .filter-row { flex-direction: column; }
  .info-grid { grid-template-columns: 1fr; }
}
</style>
