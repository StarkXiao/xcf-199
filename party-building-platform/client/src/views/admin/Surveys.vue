<template>
  <div class="admin-surveys-page">
    <div class="page-header">
      <h1 class="page-title">📋 调研问卷管理</h1>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <div v-else>
      <div class="stats-row">
        <div class="stat-card card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">📋</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats?.total_surveys || 0 }}</div>
            <div class="stat-label">问卷总数</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats?.published_surveys || 0 }}</div>
            <div class="stat-label">进行中</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">🔒</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats?.closed_surveys || 0 }}</div>
            <div class="stat-label">已截止</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">📝</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats?.total_responses || 0 }}</div>
            <div class="stat-label">填写总量</div>
          </div>
        </div>
      </div>

      <div class="toolbar card">
        <div class="toolbar-left">
          <div class="filter-group">
            <label>状态：</label>
            <select v-model="filterStatus" @change="loadSurveys(1)">
              <option value="">全部</option>
              <option value="draft">草稿</option>
              <option value="published">进行中</option>
              <option value="closed">已截止</option>
              <option value="archived">已归档</option>
            </select>
          </div>
          <div class="filter-group">
            <input v-model="keyword" type="text" placeholder="搜索问卷标题..." @keyup.enter="loadSurveys(1)" />
          </div>
        </div>
        <button class="btn btn-primary" @click="showSurveyModal()">+ 新建问卷</button>
      </div>

      <div v-if="surveysLoading" class="loading" style="padding: 40px;"><div class="spinner"></div></div>

      <div v-else-if="surveys.length === 0" class="empty-state card">
        <p>暂无问卷数据</p>
      </div>

      <div v-else class="surveys-table-container card">
        <table class="data-table">
          <thead>
            <tr>
              <th>问卷标题</th>
              <th>状态</th>
              <th>填写方式</th>
              <th>投放范围</th>
              <th>填写量</th>
              <th>开始时间</th>
              <th>截止时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="survey in surveys" :key="survey.id">
              <td>
                <div class="survey-title">{{ survey.title }}</div>
                <div class="survey-desc">{{ survey.description?.substring(0, 40) }}{{ survey.description?.length > 40 ? '...' : '' }}</div>
              </td>
              <td>
                <span class="status-badge" :class="survey.status">{{ getStatusText(survey.status) }}</span>
              </td>
              <td>
                <span class="badge" :class="survey.is_anonymous ? 'anonymous' : 'realname'">
                  {{ survey.is_anonymous ? '匿名' : '实名' }}
                </span>
              </td>
              <td>{{ getTargetTypeText(survey.target_type) }}</td>
              <td>{{ survey.response_count || 0 }}</td>
              <td>{{ formatDate(survey.start_date) }}</td>
              <td>{{ formatDate(survey.end_date) }}</td>
              <td>
                <div class="table-actions">
                  <button class="btn-link" @click="viewStats(survey)">统计</button>
                  <button class="btn-link" @click="showSurveyModal(survey)">编辑</button>
                  <button v-if="survey.status === 'draft'" class="btn-link text-success" @click="publishSurvey(survey)">发布</button>
                  <button v-if="survey.status === 'published'" class="btn-link text-warning" @click="closeSurvey(survey)">截止</button>
                  <button class="btn-link text-danger" @click="deleteSurvey(survey)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="surveys.length > 0" class="pagination">
        <button class="btn btn-secondary" :disabled="currentPage <= 1" @click="loadSurveys(currentPage - 1)">上一页</button>
        <span class="page-info">第 {{ currentPage }} 页 / 共 {{ totalPages }} 页 ({{ total }} 条)</span>
        <button class="btn btn-secondary" :disabled="currentPage >= totalPages" @click="loadSurveys(currentPage + 1)">下一页</button>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal card modal-large">
        <div class="modal-header">
          <h3>{{ editingSurvey ? '编辑问卷' : '新建问卷' }}</h3>
          <button class="btn-close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>问卷标题 *</label>
            <input v-model="form.title" type="text" placeholder="请输入问卷标题" />
          </div>
          <div class="form-group">
            <label>问卷描述</label>
            <textarea v-model="form.description" rows="3" placeholder="请输入问卷描述"></textarea>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>填写方式 *</label>
              <select v-model="form.is_anonymous">
                <option :value="0">实名填写</option>
                <option :value="1">匿名填写</option>
              </select>
            </div>
            <div class="form-group">
              <label>投放范围 *</label>
              <select v-model="form.target_type" @change="onTargetTypeChange">
                <option value="all">全部人员</option>
                <option value="branch">指定支部</option>
                <option value="specific">指定人员</option>
              </select>
            </div>
          </div>
          <div v-if="form.target_type === 'branch'" class="form-group">
            <label>选择支部</label>
            <div class="checkbox-group">
              <label v-for="branch in branches" :key="branch" class="checkbox-item">
                <input type="checkbox" :value="branch" v-model="selectedBranches" />
                {{ branch }}
              </label>
            </div>
          </div>
          <div v-if="form.target_type === 'specific'" class="form-group">
            <label>选择人员</label>
            <div class="checkbox-group user-checkbox-group">
              <label v-for="user in users" :key="user.id" class="checkbox-item">
                <input type="checkbox" :value="user.id" v-model="selectedUserIds" />
                {{ user.real_name }} ({{ user.branch }})
              </label>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>开始时间</label>
              <input v-model="form.start_date" type="datetime-local" />
            </div>
            <div class="form-group">
              <label>截止时间</label>
              <input v-model="form.end_date" type="datetime-local" />
            </div>
          </div>

          <div class="questions-section">
            <div class="section-header">
              <h4>题目配置</h4>
              <div class="question-type-buttons">
                <button class="btn btn-secondary btn-sm" @click="addQuestion('single_choice')">+ 单选题</button>
                <button class="btn btn-secondary btn-sm" @click="addQuestion('multiple_choice')">+ 多选题</button>
                <button class="btn btn-secondary btn-sm" @click="addQuestion('text')">+ 填空题</button>
                <button class="btn btn-secondary btn-sm" @click="addQuestion('rating')">+ 评分题</button>
              </div>
            </div>

            <div v-if="form.questions.length === 0" class="empty-questions">
              暂未添加题目，请点击上方按钮添加
            </div>

            <div v-for="(q, idx) in form.questions" :key="idx" class="question-item card">
              <div class="question-header">
                <span class="question-number">第 {{ idx + 1 }} 题</span>
                <span class="question-type-badge">{{ getQuestionTypeText(q.question_type) }}</span>
                <label class="required-toggle">
                  <input type="checkbox" v-model="q.required" :true-value="1" :false-value="0" />
                  必填
                </label>
                <div class="question-actions">
                  <button v-if="idx > 0" class="btn-icon" @click="moveQuestion(idx, -1)">↑</button>
                  <button v-if="idx < form.questions.length - 1" class="btn-icon" @click="moveQuestion(idx, 1)">↓</button>
                  <button class="btn-icon text-danger" @click="removeQuestion(idx)">✕</button>
                </div>
              </div>
              <div class="form-group">
                <input v-model="q.title" type="text" :placeholder="`请输入第${idx + 1}题题目`" />
              </div>
              <div v-if="q.question_type === 'single_choice' || q.question_type === 'multiple_choice'" class="options-section">
                <div v-for="(opt, oi) in q.parsedOptions" :key="oi" class="option-item">
                  <span class="option-label">{{ String.fromCharCode(65 + oi) }}.</span>
                  <input v-model="q.parsedOptions[oi]" type="text" :placeholder="`选项${String.fromCharCode(65 + oi)}`" @input="syncOptions(q)" />
                  <button v-if="q.parsedOptions.length > 2" class="btn-icon text-danger" @click="removeOption(q, oi)">✕</button>
                </div>
                <button class="btn btn-secondary btn-sm" @click="addOption(q)">+ 添加选项</button>
              </div>
              <div v-if="q.question_type === 'rating'" class="rating-config">
                <div class="form-grid">
                  <div class="form-group">
                    <label>最大分值</label>
                    <input v-model.number="q.max_rating" type="number" min="2" max="10" />
                  </div>
                  <div class="form-group">
                    <label>最低分描述</label>
                    <input v-model="q.min_label" type="text" placeholder="如：非常不满意" />
                  </div>
                  <div class="form-group">
                    <label>最高分描述</label>
                    <input v-model="q.max_label" type="text" placeholder="如：非常满意" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModal = false">取消</button>
          <button class="btn btn-primary" @click="saveSurvey">{{ editingSurvey ? '保存修改' : '创建问卷' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getSurveys as getSurveysApi,
  getSurveyStats,
  createSurvey,
  updateSurvey,
  deleteSurvey as delSurvey,
  updateSurveyStatus
} from '@/api/surveys'
import { getUsers } from '@/api/users'
import type { Survey, SurveyStats as SurveyStatsType, User } from '@/types'

const router = useRouter()
const loading = ref(false)
const surveysLoading = ref(false)
const surveys = ref<Survey[]>([])
const stats = ref<SurveyStatsType | null>(null)
const users = ref<User[]>([])
const branches = ref<string[]>([])

const filterStatus = ref('')
const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const totalPages = ref(1)

const showModal = ref(false)
const editingSurvey = ref<Survey | null>(null)

const selectedBranches = ref<string[]>([])
const selectedUserIds = ref<number[]>([])

const form = ref({
  title: '',
  description: '',
  is_anonymous: 0,
  target_type: 'all',
  start_date: '',
  end_date: '',
  questions: [] as any[]
})

const loadStats = async () => {
  try {
    const res = await getSurveyStats()
    stats.value = res.data
  } catch (error) {
    console.error('加载统计数据失败', error)
  }
}

const loadSurveys = async (page: number = 1) => {
  surveysLoading.value = true
  try {
    const params: any = { page, page_size: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    if (keyword.value) params.keyword = keyword.value
    const res = await getSurveysApi(params)
    surveys.value = res.data.list
    total.value = res.data.total
    currentPage.value = page
    totalPages.value = Math.ceil(total.value / pageSize.value)
  } catch (error) {
    console.error('加载问卷失败', error)
  } finally {
    surveysLoading.value = false
  }
}

const loadUsers = async () => {
  try {
    const res = await getUsers({ page_size: 1000 })
    users.value = res.data.list
    const branchSet = new Set<string>()
    users.value.forEach(u => { if (u.branch) branchSet.add(u.branch) })
    branches.value = Array.from(branchSet)
  } catch (error) {
    console.error('加载用户列表失败', error)
  }
}

const showSurveyModal = (survey?: Survey) => {
  if (survey) {
    editingSurvey.value = survey
    form.value = {
      title: survey.title,
      description: survey.description || '',
      is_anonymous: survey.is_anonymous,
      target_type: survey.target_type || 'all',
      start_date: survey.start_date ? survey.start_date.slice(0, 16) : '',
      end_date: survey.end_date ? survey.end_date.slice(0, 16) : '',
      questions: (survey.questions || []).map(q => ({
        ...q,
        parsedOptions: JSON.parse(q.options || '[]')
      }))
    }
    selectedBranches.value = JSON.parse(survey.target_branches || '[]')
    selectedUserIds.value = JSON.parse(survey.target_user_ids || '[]').map((id: any) => parseInt(id))
  } else {
    editingSurvey.value = null
    form.value = {
      title: '',
      description: '',
      is_anonymous: 0,
      target_type: 'all',
      start_date: '',
      end_date: '',
      questions: []
    }
    selectedBranches.value = []
    selectedUserIds.value = []
  }
  loadUsers()
  showModal.value = true
}

const onTargetTypeChange = () => {
  selectedBranches.value = []
  selectedUserIds.value = []
}

const addQuestion = (type: string) => {
  form.value.questions.push({
    title: '',
    question_type: type,
    parsedOptions: type === 'single_choice' || type === 'multiple_choice' ? ['', ''] : [],
    required: 1,
    sort_order: form.value.questions.length + 1,
    max_rating: 5,
    min_label: '',
    max_label: ''
  })
}

const removeQuestion = (idx: number) => {
  form.value.questions.splice(idx, 1)
}

const moveQuestion = (idx: number, dir: number) => {
  const arr = form.value.questions
  const target = idx + dir
  if (target < 0 || target >= arr.length) return
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
}

const addOption = (q: any) => {
  q.parsedOptions.push('')
}

const removeOption = (q: any, oi: number) => {
  q.parsedOptions.splice(oi, 1)
}

const syncOptions = (q: any) => {
  q.options = JSON.stringify(q.parsedOptions)
}

const saveSurvey = async () => {
  if (!form.value.title.trim()) {
    alert('请输入问卷标题')
    return
  }

  for (let i = 0; i < form.value.questions.length; i++) {
    const q = form.value.questions[i]
    if (!q.title.trim()) {
      alert(`请输入第${i + 1}题的题目`)
      return
    }
    if (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') {
      const validOpts = q.parsedOptions.filter((o: string) => o.trim())
      if (validOpts.length < 2) {
        alert(`第${i + 1}题至少需要2个有效选项`)
        return
      }
      q.options = JSON.stringify(q.parsedOptions)
    }
  }

  const data: any = {
    title: form.value.title,
    description: form.value.description,
    is_anonymous: form.value.is_anonymous,
    target_type: form.value.target_type,
    target_branches: JSON.stringify(selectedBranches.value),
    target_user_ids: JSON.stringify(selectedUserIds.value),
    start_date: form.value.start_date || null,
    end_date: form.value.end_date || null,
    questions: form.value.questions.map((q, i) => ({
      title: q.title,
      question_type: q.question_type,
      options: q.question_type === 'single_choice' || q.question_type === 'multiple_choice' ? JSON.stringify(q.parsedOptions) : '[]',
      required: q.required,
      sort_order: i + 1,
      max_rating: q.max_rating || 5,
      min_label: q.min_label || '',
      max_label: q.max_label || ''
    }))
  }

  try {
    if (editingSurvey.value) {
      await updateSurvey(editingSurvey.value.id, data)
      alert('更新成功')
    } else {
      await createSurvey(data)
      alert('创建成功')
    }
    showModal.value = false
    loadSurveys(currentPage.value)
    loadStats()
  } catch (error: any) {
    console.error('保存失败', error)
    alert(error.message || '保存失败')
  }
}

const publishSurvey = async (survey: Survey) => {
  if (!confirm(`确定要发布问卷"${survey.title}"吗？`)) return
  try {
    await updateSurveyStatus(survey.id, 'published')
    alert('发布成功')
    loadSurveys(currentPage.value)
    loadStats()
  } catch (error: any) {
    alert(error.message || '发布失败')
  }
}

const closeSurvey = async (survey: Survey) => {
  if (!confirm(`确定要截止问卷"${survey.title}"吗？`)) return
  try {
    await updateSurveyStatus(survey.id, 'closed')
    alert('已截止')
    loadSurveys(currentPage.value)
    loadStats()
  } catch (error: any) {
    alert(error.message || '操作失败')
  }
}

const deleteSurvey = async (survey: Survey) => {
  if (!confirm(`确定要删除问卷"${survey.title}"吗？此操作不可恢复。`)) return
  try {
    await delSurvey(survey.id)
    alert('删除成功')
    loadSurveys(currentPage.value)
    loadStats()
  } catch (error: any) {
    alert(error.message || '删除失败')
  }
}

const viewStats = (survey: Survey) => {
  router.push({ name: 'admin-survey-stats', params: { id: survey.id } })
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = { draft: '草稿', published: '进行中', closed: '已截止', archived: '已归档' }
  return texts[status] || status
}

const getTargetTypeText = (type: string) => {
  const texts: Record<string, string> = { all: '全部人员', branch: '指定支部', specific: '指定人员' }
  return texts[type] || type
}

const getQuestionTypeText = (type: string) => {
  const texts: Record<string, string> = { single_choice: '单选题', multiple_choice: '多选题', text: '填空题', rating: '评分题', scale: '量表题' }
  return texts[type] || type
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loading.value = true
  Promise.all([loadStats(), loadSurveys()]).catch(err => console.error(err)).finally(() => { loading.value = false })
})
</script>

<style scoped>
.admin-surveys-page { padding: 20px; }
.page-header { margin-bottom: 20px; }
.page-title { font-size: 24px; font-weight: 700; }
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { display: flex; align-items: center; gap: 12px; padding: 16px; }
.stat-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.stat-value { font-size: 24px; font-weight: 700; color: var(--primary-color); }
.stat-label { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.toolbar-left { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.filter-group { display: flex; align-items: center; gap: 6px; }
.filter-group label { font-size: 13px; color: var(--text-secondary); white-space: nowrap; }
.filter-group select, .filter-group input { padding: 6px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: white; font-size: 13px; }
.surveys-table-container { padding: 16px; margin-bottom: 16px; overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border-color); }
.data-table th { background: var(--bg-light); font-weight: 600; font-size: 13px; color: var(--text-secondary); }
.data-table tr:hover { background: var(--bg-light); }
.survey-title { font-weight: 600; font-size: 14px; }
.survey-desc { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.status-badge { padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 500; }
.status-badge.draft { background: #f5f5f5; color: #616161; }
.status-badge.published { background: #e8f5e9; color: #388e3c; }
.status-badge.closed { background: #ffebee; color: #d32f2f; }
.status-badge.archived { background: #e3f2fd; color: #1976d2; }
.badge { padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 500; }
.badge.anonymous { background: #fff3e0; color: #e65100; }
.badge.realname { background: #e3f2fd; color: #1976d2; }
.table-actions { display: flex; gap: 8px; }
.btn-link { background: none; border: none; color: var(--primary-color); cursor: pointer; font-size: 13px; padding: 4px 6px; border-radius: 4px; }
.btn-link:hover { background: var(--bg-light); }
.btn-link.text-danger { color: var(--danger-color); }
.btn-link.text-success { color: #388e3c; }
.btn-link.text-warning { color: #f57c00; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 16px; }
.page-info { font-size: 13px; color: var(--text-secondary); }
.empty-state { padding: 60px; text-align: center; color: var(--text-secondary); }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto; }
.modal-large { max-width: 800px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-color); }
.modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
.btn-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-secondary); line-height: 1; }
.modal-body { padding: 20px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--border-color); }
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: var(--text-primary); }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 13px; background: white; }
.form-group textarea { resize: vertical; min-height: 80px; }
.checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; max-height: 200px; overflow-y: auto; padding: 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: #fafafa; }
.checkbox-item { display: flex; align-items: center; gap: 4px; font-size: 13px; cursor: pointer; }
.questions-section { margin-top: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-header h4 { margin: 0; font-size: 16px; }
.question-type-buttons { display: flex; gap: 8px; }
.btn-sm { padding: 4px 12px; font-size: 12px; }
.empty-questions { padding: 30px; text-align: center; color: var(--text-secondary); border: 2px dashed var(--border-color); border-radius: var(--radius-md); }
.question-item { padding: 16px; margin-bottom: 12px; }
.question-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.question-number { font-weight: 600; font-size: 14px; }
.question-type-badge { padding: 2px 8px; border-radius: 8px; font-size: 11px; background: #e3f2fd; color: #1976d2; }
.required-toggle { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-secondary); cursor: pointer; margin-left: auto; }
.question-actions { display: flex; gap: 4px; }
.btn-icon { background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 4px; font-size: 14px; }
.btn-icon:hover { background: var(--bg-light); }
.options-section { margin-top: 8px; }
.option-item { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.option-label { font-weight: 600; font-size: 13px; min-width: 20px; }
.option-item input { flex: 1; padding: 6px 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 13px; }
.rating-config { margin-top: 8px; }
.loading { display: flex; justify-content: center; padding: 60px 0; }
.spinner { width: 40px; height: 40px; border: 3px solid var(--bg-light); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 768px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .toolbar-left { flex-direction: column; align-items: stretch; }
  .filter-group { width: 100%; }
  .filter-group select, .filter-group input { flex: 1; }
  .form-grid { grid-template-columns: 1fr; }
  .section-header { flex-direction: column; align-items: flex-start; gap: 10px; }
  .question-type-buttons { flex-wrap: wrap; }
}
</style>
