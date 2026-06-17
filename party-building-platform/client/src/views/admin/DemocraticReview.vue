<template>
  <div class="admin-democratic-review">
    <div class="page-header">
      <h2 class="page-title">民主评议管理</h2>
      <button class="btn btn-primary" @click="showCreateModal = true">+ 新建评议</button>
    </div>

    <div class="filter-bar">
      <select v-model="filterStatus" @change="loadReviews" class="filter-select">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="published">待开始</option>
        <option value="in_progress">进行中</option>
        <option value="completed">已完成</option>
        <option value="archived">已归档</option>
      </select>
      <select v-model="filterYear" @change="loadReviews" class="filter-select">
        <option value="">全部年份</option>
        <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
      </select>
      <input v-model="keyword" type="text" placeholder="搜索标题..." @keyup.enter="loadReviews" class="filter-input" />
      <button class="btn btn-secondary" @click="loadReviews">搜索</button>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>年度</th>
            <th>支部</th>
            <th>状态</th>
            <th>评议时间</th>
            <th>参与人数</th>
            <th>创建人</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="review in reviews" :key="review.id">
            <td>{{ review.id }}</td>
            <td>{{ review.title }}</td>
            <td>{{ review.year }}</td>
            <td>{{ review.branch }}</td>
            <td><span class="status-tag" :class="review.status">{{ getStatusText(review.status) }}</span></td>
            <td>{{ formatDate(review.start_date) }} ~ {{ formatDate(review.end_date) }}</td>
            <td>{{ review.participant_count || 0 }}</td>
            <td>{{ (review as any).creator_name || '-' }}</td>
            <td class="action-cell">
              <button class="btn btn-sm" @click="editReview(review)">编辑</button>
              <button v-if="review.status === 'draft'" class="btn btn-sm btn-primary" @click="changeStatus(review, 'published')">发布</button>
              <button v-if="review.status === 'published'" class="btn btn-sm btn-info" @click="changeStatus(review, 'in_progress')">开始</button>
              <button v-if="review.status === 'in_progress'" class="btn btn-sm btn-success" @click="changeStatus(review, 'completed')">完成</button>
              <button v-if="review.status === 'completed'" class="btn btn-sm btn-warning" @click="changeStatus(review, 'archived')">归档</button>
              <button class="btn btn-sm btn-danger" @click="deleteReview(review)">删除</button>
            </td>
          </tr>
          <tr v-if="reviews.length === 0">
            <td colspan="9" class="empty-row">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="total > 0" class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <button v-for="p in totalPages" :key="p" :class="{ active: p === page }" @click="changePage(p)">{{ p }}</button>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
    </div>

    <div v-if="showCreateModal || editingReview" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingReview ? '编辑评议' : '新建评议' }}</h3>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>评议标题 *</label>
            <input v-model="form.title" type="text" class="form-input" placeholder="如：2025年度党员民主评议" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>年度 *</label>
              <input v-model.number="form.year" type="number" class="form-input" />
            </div>
            <div class="form-group">
              <label>支部 *</label>
              <select v-model="form.branch" class="form-input">
                <option value="">请选择支部</option>
                <option value="第一党支部">第一党支部</option>
                <option value="第二党支部">第二党支部</option>
                <option value="第三党支部">第三党支部</option>
                <option value="机关第一党支部">机关第一党支部</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>开始时间</label>
              <input v-model="form.start_date" type="datetime-local" class="form-input" />
            </div>
            <div class="form-group">
              <label>结束时间</label>
              <input v-model="form.end_date" type="datetime-local" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label>评议说明</label>
            <textarea v-model="form.description" class="form-input" rows="3" placeholder="评议说明..."></textarea>
          </div>
          <div class="form-group">
            <label>评议表项目配置</label>
            <div class="form-items-config">
              <div v-for="(item, index) in form.form_items" :key="index" class="form-item-row">
                <input v-model="item.item_name" type="text" class="form-input item-name" placeholder="项目名称" />
                <select v-model="item.item_type" class="form-input item-type">
                  <option value="score">评分项</option>
                  <option value="text">文本项</option>
                </select>
                <input v-if="item.item_type === 'score'" v-model.number="item.max_score" type="number" class="form-input item-score" placeholder="满分" min="1" />
                <input v-if="item.item_type === 'score'" v-model.number="item.weight" type="number" class="form-input item-weight" placeholder="权重" step="0.1" min="0" />
                <button class="btn btn-sm btn-danger" @click="removeFormItem(index)">删除</button>
              </div>
              <button class="btn btn-secondary btn-sm" @click="addFormItem">+ 添加项目</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveReview" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getAdminDemocraticReviews,
  createDemocraticReview,
  updateDemocraticReview,
  deleteDemocraticReview
} from '@/api/democraticReview'
import type { DemocraticReview } from '@/types'

const reviews = ref<DemocraticReview[]>([])
const loading = ref(false)
const saving = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filterStatus = ref('')
const filterYear = ref('')
const keyword = ref('')
const showCreateModal = ref(false)
const editingReview = ref<DemocraticReview | null>(null)

const form = ref({
  title: '',
  year: new Date().getFullYear(),
  branch: '',
  description: '',
  start_date: '',
  end_date: '',
  form_items: [
    { item_name: '思想政治素质', item_type: 'score', max_score: 25, weight: 0.3, required: 1, options: '' },
    { item_name: '业务工作表现', item_type: 'score', max_score: 25, weight: 0.3, required: 1, options: '' },
    { item_name: '组织纪律观念', item_type: 'score', max_score: 25, weight: 0.2, required: 1, options: '' },
    { item_name: '先锋模范作用', item_type: 'score', max_score: 25, weight: 0.2, required: 1, options: '' }
  ] as { item_name: string; item_type: string; max_score: number; weight: number; required: number; options: string }[]
})

const availableYears = computed(() => {
  const currentYearVal = new Date().getFullYear()
  const years = []
  for (let y = currentYearVal; y >= currentYearVal - 5; y--) {
    years.push(y)
  }
  return years
})

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const loadReviews = async () => {
  loading.value = true
  try {
    const res = await getAdminDemocraticReviews({
      page: page.value,
      page_size: pageSize.value,
      status: filterStatus.value || undefined,
      year: filterYear.value || undefined,
      keyword: keyword.value || undefined
    })
    reviews.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载评议列表失败', error)
  } finally {
    loading.value = false
  }
}

const changePage = (p: number) => {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadReviews()
  }
}

const editReview = (review: DemocraticReview) => {
  editingReview.value = review
  form.value = {
    title: review.title,
    year: review.year,
    branch: review.branch,
    description: review.description || '',
    start_date: review.start_date ? review.start_date.slice(0, 16) : '',
    end_date: review.end_date ? review.end_date.slice(0, 16) : '',
    form_items: (review.form_items || []).map(fi => ({
      item_name: fi.item_name,
      item_type: fi.item_type,
      max_score: fi.max_score,
      weight: fi.weight,
      required: fi.required,
      options: fi.options || ''
    }))
  }
}

const closeModal = () => {
  showCreateModal.value = false
  editingReview.value = null
  form.value = {
    title: '',
    year: new Date().getFullYear(),
    branch: '',
    description: '',
    start_date: '',
    end_date: '',
    form_items: [
      { item_name: '思想政治素质', item_type: 'score', max_score: 25, weight: 0.3, required: 1, options: '' },
      { item_name: '业务工作表现', item_type: 'score', max_score: 25, weight: 0.3, required: 1, options: '' },
      { item_name: '组织纪律观念', item_type: 'score', max_score: 25, weight: 0.2, required: 1, options: '' },
      { item_name: '先锋模范作用', item_type: 'score', max_score: 25, weight: 0.2, required: 1, options: '' }
    ]
  }
}

const addFormItem = () => {
  form.value.form_items.push({
    item_name: '',
    item_type: 'score',
    max_score: 10,
    weight: 1.0,
    required: 1,
    options: ''
  })
}

const removeFormItem = (index: number) => {
  form.value.form_items.splice(index, 1)
}

const saveReview = async () => {
  if (!form.value.title || !form.value.year || !form.value.branch) {
    alert('请填写标题、年份和支部')
    return
  }
  saving.value = true
  try {
    if (editingReview.value) {
      await updateDemocraticReview(editingReview.value.id, form.value as any)
    } else {
      await createDemocraticReview(form.value)
    }
    closeModal()
    loadReviews()
  } catch (error: any) {
    alert(error?.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const changeStatus = async (review: DemocraticReview, status: string) => {
  try {
    await updateDemocraticReview(review.id, { status } as any)
    loadReviews()
  } catch (error: any) {
    alert(error?.response?.data?.message || '操作失败')
  }
}

const deleteReview = async (review: DemocraticReview) => {
  if (!confirm(`确定删除"${review.title}"吗？`)) return
  try {
    await deleteDemocraticReview(review.id)
    loadReviews()
  } catch (error) {
    console.error('删除失败', error)
  }
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    published: '待开始',
    in_progress: '进行中',
    completed: '已完成',
    archived: '已归档'
  }
  return map[status] || status
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

onMounted(() => {
  loadReviews()
})
</script>

<style scoped>
.admin-democratic-review {
  padding-bottom: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover {
  opacity: 0.85;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.btn-info {
  background: #17a2b8;
  color: white;
  border-color: #17a2b8;
}

.btn-success {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
  border-color: #ffc107;
}

.btn-danger {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-select,
.filter-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.filter-input {
  width: 200px;
}

.table-wrap {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
}

.data-table th {
  background: var(--bg-light);
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
}

.action-cell {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.status-tag {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-tag.draft { background: #f8f9fa; color: #6c757d; }
.status-tag.published { background: #fff3cd; color: #856404; }
.status-tag.in_progress { background: #d1ecf1; color: #0c5460; }
.status-tag.completed { background: #d4edda; color: #155724; }
.status-tag.archived { background: #e2e3e5; color: #383d41; }

.empty-row {
  text-align: center;
  color: var(--text-secondary);
  padding: 40px;
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
  font-size: 14px;
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 700px;
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

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  box-sizing: border-box;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-items-config {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-item-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.item-name { flex: 2; }
.item-type { flex: 1; }
.item-score { width: 70px; flex: none; }
.item-weight { width: 70px; flex: none; }

.loading {
  display: flex;
  justify-content: center;
  padding: 60px 0;
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
</style>
