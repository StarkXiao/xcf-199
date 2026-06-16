<template>
  <div class="admin-activities">
    <div class="page-header">
      <h2 class="page-title">活动管理</h2>
      <button class="btn btn-primary" @click="showCreateModal = true">+ 新建活动</button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else class="table-container card">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 50px;">ID</th>
            <th>活动标题</th>
            <th style="width: 100px;">地点</th>
            <th style="width: 140px;">开始时间</th>
            <th style="width: 80px;">报名人数</th>
            <th style="width: 70px;">积分</th>
            <th style="width: 70px;">状态</th>
            <th style="width: 120px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="activity in activities" :key="activity.id">
            <td>{{ activity.id }}</td>
            <td class="title-cell">{{ activity.title }}</td>
            <td>{{ activity.location || '-' }}</td>
            <td>{{ formatDateTime(activity.start_time) }}</td>
            <td>{{ activity.signup_count }}/{{ activity.max_participants || '不限' }}</td>
            <td>{{ activity.points_reward }}</td>
            <td>
              <span class="badge" :class="getStatusClass(activity.status)">
                {{ getStatusText(activity.status) }}
              </span>
            </td>
            <td>
              <button class="btn btn-sm btn-secondary" @click="handleEdit(activity)">编辑</button>
              <button class="btn btn-sm btn-danger" @click="handleDelete(activity)" style="margin-left: 6px;">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="activities.length === 0" class="empty-state">
        <p>暂无活动</p>
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
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingActivity ? '编辑活动' : '新建活动' }}</h3>
          <button class="close-btn" @click="showCreateModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">活动标题 *</label>
              <input v-model="form.title" type="text" class="form-input" placeholder="请输入标题">
            </div>
            <div class="form-group">
              <label class="form-label">活动地点</label>
              <input v-model="form.location" type="text" class="form-input" placeholder="请输入地点">
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
              <label class="form-label">积分奖励</label>
              <input v-model.number="form.points_reward" type="number" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="form.status" class="form-select">
                <option value="upcoming">报名中</option>
                <option value="ongoing">进行中</option>
                <option value="completed">已结束</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">封面图片URL</label>
            <input v-model="form.cover_image" type="text" class="form-input" placeholder="请输入封面图片地址">
          </div>
          <div class="form-group">
            <label class="form-label">活动描述 *</label>
            <textarea v-model="form.description" class="form-textarea" rows="5" placeholder="请输入活动描述"></textarea>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { getAdminActivities, createActivity, updateActivity, deleteActivity } from '@/api/activities'
import type { Activity } from '@/types'

const activities = ref<Activity[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const submitting = ref(false)
const showCreateModal = ref(false)
const editingActivity = ref<Activity | null>(null)

const form = reactive({
  title: '',
  description: '',
  cover_image: '',
  location: '',
  start_time: '',
  end_time: '',
  signup_deadline: '',
  max_participants: 0,
  points_reward: 10,
  status: 'upcoming'
})

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const loadActivities = async () => {
  loading.value = true
  try {
    const res = await getAdminActivities({
      page: page.value,
      page_size: pageSize.value
    })
    activities.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载活动失败', error)
  } finally {
    loading.value = false
  }
}

const changePage = (p: number) => {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadActivities()
  }
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    upcoming: '报名中',
    ongoing: '进行中',
    completed: '已结束',
    cancelled: '已取消'
  }
  return map[status] || status
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    upcoming: 'badge-success',
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

const handleEdit = (activity: Activity) => {
  editingActivity.value = activity
  form.title = activity.title
  form.description = activity.description
  form.cover_image = activity.cover_image || ''
  form.location = activity.location || ''
  form.start_time = activity.start_time ? activity.start_time.slice(0, 16).replace(' ', 'T') : ''
  form.end_time = activity.end_time ? activity.end_time.slice(0, 16).replace(' ', 'T') : ''
  form.signup_deadline = activity.signup_deadline ? activity.signup_deadline.slice(0, 16).replace(' ', 'T') : ''
  form.max_participants = activity.max_participants || 0
  form.points_reward = activity.points_reward
  form.status = activity.status
  showCreateModal.value = true
}

const handleDelete = async (activity: Activity) => {
  if (!confirm(`确定要删除活动"${activity.title}"吗？`)) return

  try {
    await deleteActivity(activity.id)
    alert('删除成功')
    loadActivities()
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

    if (editingActivity.value) {
      await updateActivity(editingActivity.value.id, data)
      alert('更新成功')
    } else {
      await createActivity(data)
      alert('创建成功')
    }
    showCreateModal.value = false
    loadActivities()
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
  form.location = ''
  form.start_time = ''
  form.end_time = ''
  form.signup_deadline = ''
  form.max_participants = 0
  form.points_reward = 10
  form.status = 'upcoming'
  editingActivity.value = null
}

onMounted(() => {
  loadActivities()
})
</script>

<style scoped>
.admin-activities {
  padding-bottom: 20px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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

@media (max-width: 992px) {
  .data-table th:nth-child(3),
  .data-table td:nth-child(3),
  .data-table th:nth-child(4),
  .data-table td:nth-child(4) {
    display: none;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
