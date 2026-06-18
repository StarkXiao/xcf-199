<template>
  <div class="survey-stats-page">
    <div class="page-header">
      <div class="header-left">
        <button class="btn btn-secondary" @click="$router.push({ name: 'admin-surveys' })">← 返回列表</button>
        <h2 class="page-title">📊 {{ survey?.title }} - 统计分析</h2>
      </div>
      <button class="btn btn-primary" @click="handleExport">📥 导出数据</button>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <div v-else>
      <div class="overview-row">
        <div class="overview-card card">
          <div class="overview-icon">📝</div>
          <div class="overview-info">
            <div class="overview-value">{{ statsData.responses?.length || 0 }}</div>
            <div class="overview-label">填写人数</div>
          </div>
        </div>
        <div class="overview-card card">
          <div class="overview-icon">📋</div>
          <div class="overview-info">
            <div class="overview-value">{{ statsData.questions?.length || 0 }}</div>
            <div class="overview-label">题目数量</div>
          </div>
        </div>
        <div class="overview-card card">
          <div class="overview-icon">{{ survey?.is_anonymous ? '🔒' : '👤' }}</div>
          <div class="overview-info">
            <div class="overview-value">{{ survey?.is_anonymous ? '匿名' : '实名' }}</div>
            <div class="overview-label">填写方式</div>
          </div>
        </div>
        <div class="overview-card card">
          <div class="overview-icon">{{ getStatusEmoji(survey?.status) }}</div>
          <div class="overview-info">
            <div class="overview-value">{{ getStatusText(survey?.status) }}</div>
            <div class="overview-label">当前状态</div>
          </div>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'charts' }" @click="activeTab = 'charts'">📊 图表分析</button>
        <button class="tab-btn" :class="{ active: activeTab === 'responses' }" @click="activeTab = 'responses'">📋 填写记录</button>
      </div>

      <div v-if="activeTab === 'charts'">
        <div v-if="statsData.question_stats?.length === 0" class="empty-state card">
          <p>暂无填写数据</p>
        </div>

        <div v-for="(qs, idx) in statsData.question_stats" :key="qs.question_id" class="question-stats-card card">
          <div class="qs-header">
            <span class="qs-number">第 {{ idx + 1 }} 题</span>
            <span class="qs-type-badge">{{ getQuestionTypeText(qs.question_type) }}</span>
            <span class="qs-count">{{ qs.response_count }} 人填写</span>
          </div>
          <h4 class="qs-title">{{ qs.question_title }}</h4>

          <div v-if="qs.question_type === 'single_choice'" class="chart-section">
            <div v-for="(opt, oi) in qs.option_counts" :key="oi" class="bar-item">
              <div class="bar-label">{{ opt.option }}</div>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: getBarWidth(opt.count, qs.response_count) }"></div>
              </div>
              <div class="bar-value">{{ opt.count }} ({{ qs.response_count > 0 ? Math.round(opt.count / qs.response_count * 100) : 0 }}%)</div>
            </div>
          </div>

          <div v-if="qs.question_type === 'multiple_choice'" class="chart-section">
            <div v-for="(opt, oi) in qs.option_counts" :key="oi" class="bar-item">
              <div class="bar-label">{{ opt.option }}</div>
              <div class="bar-track">
                <div class="bar-fill multiple" :style="{ width: getBarWidth(opt.count, qs.response_count) }"></div>
              </div>
              <div class="bar-value">{{ opt.count }} ({{ qs.response_count > 0 ? Math.round(opt.count / qs.response_count * 100) : 0 }}%)</div>
            </div>
          </div>

          <div v-if="qs.question_type === 'rating'" class="rating-section">
            <div class="rating-avg">
              <span class="rating-score">{{ qs.avg_rating }}</span>
              <span class="rating-max">/ {{ getMaxRating(qs.question_id) }}</span>
            </div>
            <div class="rating-bar-section">
              <div v-for="i in getMaxRating(qs.question_id)" :key="i" class="rating-bar-item">
                <span class="rating-label">{{ i }}分</span>
                <div class="rating-track">
                  <div class="rating-fill" :style="{ width: getBarWidth(getRatingCount(qs, i), qs.response_count) }"></div>
                </div>
                <span class="rating-count">{{ getRatingCount(qs, i) }}</span>
              </div>
            </div>
          </div>

          <div v-if="qs.question_type === 'text'" class="text-section">
            <div v-if="qs.text_answers?.length === 0" class="empty-inline">暂无回答</div>
            <div v-else class="text-answers">
              <div v-for="(ans, ai) in qs.text_answers" :key="ai" class="text-answer-item">
                <span class="answer-index">{{ ai + 1 }}.</span>
                <span class="answer-content">{{ ans }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'responses'">
        <div v-if="statsData.responses?.length === 0" class="empty-state card">
          <p>暂无填写记录</p>
        </div>

        <div v-else class="responses-table card">
          <table class="data-table">
            <thead>
              <tr>
                <th>序号</th>
                <th v-if="!survey?.is_anonymous">填写人</th>
                <th v-if="!survey?.is_anonymous">支部</th>
                <th>提交时间</th>
                <th v-for="q in statsData.questions" :key="q.id">{{ q.title }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(resp, ri) in statsData.responses" :key="resp.id">
                <td>{{ ri + 1 }}</td>
                <td v-if="!survey?.is_anonymous">{{ resp.real_name || '匿名' }}</td>
                <td v-if="!survey?.is_anonymous">{{ resp.branch || '-' }}</td>
                <td>{{ formatDate(resp.submitted_at) }}</td>
                <td v-for="q in statsData.questions" :key="q.id">
                  {{ getAnswerText(resp.id, q.id) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getSurveyDetailStats, exportSurveyData } from '@/api/surveys'
import type { Survey, SurveyQuestionStats } from '@/types'

const route = useRoute()
const loading = ref(false)
const survey = ref<Survey | null>(null)
const activeTab = ref('charts')

const statsData = ref<{
  questions: any[]
  responses: any[]
  answers: any[]
  question_stats: SurveyQuestionStats[]
}>({
  questions: [],
  responses: [],
  answers: [],
  question_stats: []
})

const loadStats = async () => {
  loading.value = true
  try {
    const id = parseInt(route.params.id as string)
    const res = await getSurveyDetailStats(id)
    survey.value = res.data.survey
    statsData.value = {
      questions: res.data.questions || [],
      responses: res.data.responses || [],
      answers: res.data.answers || [],
      question_stats: res.data.question_stats || []
    }
  } catch (error) {
    console.error('加载统计数据失败', error)
  } finally {
    loading.value = false
  }
}

const handleExport = async () => {
  try {
    const id = parseInt(route.params.id as string)
    const response = await exportSurveyData(id) as any
    const blob = new Blob([response], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `survey_${id}_export.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('导出失败', error)
    alert('导出失败，请重试')
  }
}

const getBarWidth = (count: number, total: number) => {
  if (total === 0) return '0%'
  return Math.max(Math.round(count / total * 100), 2) + '%'
}

const getMaxRating = (questionId: number) => {
  const q = statsData.value.questions.find(q => q.id === questionId)
  return q?.max_rating || 5
}

const getRatingCount = (qs: SurveyQuestionStats, score: number) => {
  const answers = statsData.value.answers.filter(a => a.question_id === qs.question_id && a.answer_text === String(score))
  return answers.length
}

const getAnswerText = (responseId: number, questionId: number) => {
  const answer = statsData.value.answers.find(a => a.response_id === responseId && a.question_id === questionId)
  return answer?.answer_text || '-'
}

const getStatusText = (status?: string) => {
  const texts: Record<string, string> = { draft: '草稿', published: '进行中', closed: '已截止', archived: '已归档' }
  return texts[status || ''] || status || '-'
}

const getStatusEmoji = (status?: string) => {
  const emojis: Record<string, string> = { draft: '📝', published: '✅', closed: '🔒', archived: '📁' }
  return emojis[status || ''] || '📋'
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

onMounted(loadStats)
</script>

<style scoped>
.survey-stats-page { padding: 20px; }
.page-header { margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 20px; font-weight: 700; margin: 0; }
.overview-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.overview-card { display: flex; align-items: center; gap: 12px; padding: 16px; }
.overview-icon { font-size: 28px; }
.overview-value { font-size: 22px; font-weight: 700; color: var(--primary-color); }
.overview-label { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab-btn { padding: 10px 20px; border: none; background: var(--bg-light); color: var(--text-secondary); border-radius: var(--radius-md); cursor: pointer; font-size: 14px; font-weight: 500; }
.tab-btn.active { background: var(--primary-color); color: white; }
.question-stats-card { padding: 20px; margin-bottom: 16px; }
.qs-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.qs-number { font-weight: 600; font-size: 13px; color: var(--primary-color); }
.qs-type-badge { padding: 2px 8px; border-radius: 8px; font-size: 11px; background: #e3f2fd; color: #1976d2; }
.qs-count { font-size: 12px; color: var(--text-secondary); margin-left: auto; }
.qs-title { font-size: 15px; font-weight: 600; margin: 0 0 16px 0; }
.chart-section { display: flex; flex-direction: column; gap: 10px; }
.bar-item { display: flex; align-items: center; gap: 10px; }
.bar-label { min-width: 80px; font-size: 13px; text-align: right; }
.bar-track { flex: 1; height: 24px; background: var(--bg-light); border-radius: 12px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 12px; transition: width 0.5s ease; min-width: 2px; }
.bar-fill.multiple { background: linear-gradient(90deg, #43e97b, #38f9d7); }
.bar-value { min-width: 80px; font-size: 12px; color: var(--text-secondary); }
.rating-section { display: flex; gap: 30px; align-items: center; }
.rating-avg { text-align: center; flex-shrink: 0; }
.rating-score { font-size: 36px; font-weight: 700; color: var(--primary-color); }
.rating-max { font-size: 16px; color: var(--text-secondary); }
.rating-bar-section { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.rating-bar-item { display: flex; align-items: center; gap: 8px; }
.rating-label { min-width: 32px; font-size: 12px; color: var(--text-secondary); text-align: right; }
.rating-track { flex: 1; height: 16px; background: var(--bg-light); border-radius: 8px; overflow: hidden; }
.rating-fill { height: 100%; background: linear-gradient(90deg, #fa709a, #fee140); border-radius: 8px; min-width: 2px; }
.rating-count { min-width: 24px; font-size: 12px; color: var(--text-secondary); }
.text-section { max-height: 300px; overflow-y: auto; }
.text-answers { display: flex; flex-direction: column; gap: 8px; }
.text-answer-item { padding: 8px 12px; background: var(--bg-light); border-radius: var(--radius-sm); font-size: 13px; line-height: 1.5; }
.answer-index { font-weight: 600; color: var(--primary-color); margin-right: 6px; }
.empty-state { padding: 60px; text-align: center; color: var(--text-secondary); }
.empty-inline { text-align: center; padding: 20px; color: var(--text-secondary); font-size: 14px; }
.responses-table { padding: 16px; overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 10px; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 13px; white-space: nowrap; }
.data-table th { background: var(--bg-light); font-weight: 600; color: var(--text-secondary); }
.loading { display: flex; justify-content: center; padding: 60px 0; }
.spinner { width: 40px; height: 40px; border: 3px solid var(--bg-light); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 768px) {
  .overview-row { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-left { flex-direction: column; align-items: flex-start; }
  .rating-section { flex-direction: column; align-items: stretch; }
}
</style>
