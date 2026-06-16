<template>
  <div class="admin-notices">
    <div class="page-header">
      <h2 class="page-title">通知管理</h2>
      <button class="btn btn-primary" @click="showCreateModal = true">+ 新建通知</button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else class="table-container card">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 50px;">ID</th>
            <th>标题</th>
            <th style="width: 100px;">类型</th>
            <th style="width: 70px;">优先级</th>
            <th style="width: 70px;">状态</th>
            <th style="width: 150px;">创建时间</th>
            <th style="width: 120px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="notice in notices" :key="notice.id">
            <td>{{ notice.id }}</td>
            <td class="title-cell">{{ notice.title }}</td>
            <td>{{ notice.type }}</td>
            <td>
              <span class="badge" :class="getPriorityClass(notice.priority)">
                {{ getPriorityText(notice.priority) }}
              </span>
            </td>
            <td>
              <span class="badge" :class="notice.status === 'published' ? 'badge-success' : 'badge-warning'">
                {{ notice.status === 'published' ? '已发布' : '草稿' }}
              </span>
            </td>
            <td>{{ formatDate(notice.created_at) }}</td>
            <td>
              <button class="btn btn-sm btn-secondary" @click="handleEdit(notice)">编辑</button>
              <button class="btn btn-sm btn-danger" @click="handleDelete(notice)" style="margin-left: 6px;">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="notices.length === 0" class="empty-state">
        <p>暂无通知</p>
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
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingNotice ? '编辑通知' : '新建通知' }}</h3>
          <button class="close-btn" @click="showCreateModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">通知标题 *</label>
            <input v-model="form.title" type="text" class="form-input" placeholder="请输入标题">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">类型</label>
              <input v-model="form.type" type="text" class="form-input" placeholder="如：工作通知">
            </div>
            <div class="form-group">
              <label class="form-label">优先级</label>
              <select v-model.number="form.priority" class="form-select">
                <option :value="0">普通</option>
                <option :value="1">一般</option>
                <option :value="2">重要</option>
                <option :value="3">紧急</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">状态</label>
            <select v-model="form.status" class="form-select">
              <option value="published">已发布</option>
              <option value="draft">草稿</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">通知内容 *</label>
            <textarea v-model="form.content" class="form-textarea" rows="6" placeholder="请输入通知内容"></textarea>
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
import { getAdminNotices, createNotice, updateNotice, deleteNotice } from '@/api/notices'
import type { Notice } from '@/types'

const notices = ref<Notice[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const submitting = ref(false)
const showCreateModal = ref(false)
const editingNotice = ref<Notice | null>(null)

const form = reactive({
  title: '',
  content: '',
  type: 'general',
  priority: 0,
  status: 'published'
})

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const loadNotices = async () => {
  loading.value = true
  try {
    const res = await getAdminNotices({
      page: page.value,
      page_size: pageSize.value
    })
    notices.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载通知失败', error)
  } finally {
    loading.value = false
  }
}

const changePage = (p: number) => {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadNotices()
  }
}

const getPriorityText = (priority: number) => {
  const texts = ['普通', '一般', '重要', '紧急']
  return texts[priority] || '普通'
}

const getPriorityClass = (priority: number) => {
  if (priority >= 3) return 'badge-danger'
  if (priority >= 2) return 'badge-warning'
  return 'badge-info'
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const handleEdit = (notice: Notice) => {
  editingNotice.value = notice
  form.title = notice.title
  form.content = notice.content
  form.type = notice.type
  form.priority = notice.priority
  form.status = notice.status
  showCreateModal.value = true
}

const handleDelete = async (notice: Notice) => {
  if (!confirm(`确定要删除通知"${notice.title}"吗？`)) return

  try {
    await deleteNotice(notice.id)
    alert('删除成功')
    loadNotices()
  } catch (error: any) {
    alert(error.message || '删除失败')
  }
}

const handleSubmit = async () => {
  if (!form.title.trim() || !form.content.trim()) {
    alert('标题和内容不能为空')
    return
  }

  submitting.value = true
  try {
    if (editingNotice.value) {
      await updateNotice(editingNotice.value.id, form)
      alert('更新成功')
    } else {
      await createNotice(form)
      alert('创建成功')
    }
    showCreateModal.value = false
    loadNotices()
    resetForm()
  } catch (error: any) {
    alert(error.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  form.title = ''
  form.content = ''
  form.type = 'general'
  form.priority = 0
  form.status = 'published'
  editingNotice.value = null
}

onMounted(() => {
  loadNotices()
})
</script>

<style scoped>
.admin-notices {
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
  max-width: 300px;
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

@media (max-width: 768px) {
  .data-table th:nth-child(5),
  .data-table td:nth-child(5),
  .data-table th:nth-child(6),
  .data-table td:nth-child(6) {
    display: none;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
