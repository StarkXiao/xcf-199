<template>
  <div class="survey-fill-page">
    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <div v-else-if="!survey" class="empty-state card">
      <p>问卷不存在或已截止</p>
      <button class="btn btn-secondary" @click="$router.push({ name: 'surveys' })">返回列表</button>
    </div>

    <div v-else class="survey-container">
      <div class="survey-header card">
        <h1 class="survey-title">{{ survey.title }}</h1>
        <p class="survey-desc">{{ survey.description }}</p>
        <div class="survey-meta">
          <span class="meta-item">
            <span class="meta-icon">{{ survey.is_anonymous ? '🔒' : '👤' }}</span>
            {{ survey.is_anonymous ? '匿名填写' : '实名填写' }}
          </span>
          <span class="meta-item">
            <span class="meta-icon">📋</span>
            {{ survey.questions?.length || 0 }} 题
          </span>
          <span v-if="survey.end_date" class="meta-item">
            <span class="meta-icon">⏰</span>
            截止：{{ formatDate(survey.end_date) }}
          </span>
        </div>
      </div>

      <div class="questions-list">
        <div v-for="(q, idx) in survey.questions" :key="q.id" class="question-card card">
          <div class="question-header">
            <span class="question-number">{{ idx + 1 }}</span>
            <span class="question-type-badge">{{ getQuestionTypeText(q.question_type) }}</span>
            <span v-if="q.required" class="required-mark">*</span>
          </div>
          <h3 class="question-title">{{ q.title }}</h3>

          <div v-if="q.question_type === 'single_choice'" class="options-list">
            <label v-for="(opt, oi) in parseOptions(q.options)" :key="oi" class="option-item" :class="{ selected: answers[q.id] === opt }">
              <input type="radio" :name="'q_' + q.id" :value="opt" v-model="answers[q.id]" />
              <span class="radio-dot"></span>
              <span class="option-text">{{ opt }}</span>
            </label>
          </div>

          <div v-if="q.question_type === 'multiple_choice'" class="options-list">
            <label v-for="(opt, oi) in parseOptions(q.options)" :key="oi" class="option-item" :class="{ selected: (answers[q.id] || []).includes(opt) }">
              <input type="checkbox" :value="opt" v-model="answers[q.id]" />
              <span class="checkbox-dot"></span>
              <span class="option-text">{{ opt }}</span>
            </label>
          </div>

          <div v-if="q.question_type === 'text'" class="text-input">
            <textarea v-model="answers[q.id]" rows="3" placeholder="请输入您的回答..."></textarea>
          </div>

          <div v-if="q.question_type === 'rating'" class="rating-input">
            <div class="rating-labels">
              <span class="rating-min">{{ q.min_label || '1' }}</span>
              <span class="rating-max">{{ q.max_label || q.max_rating }}</span>
            </div>
            <div class="rating-stars">
              <button
                v-for="i in q.max_rating"
                :key="i"
                class="star-btn"
                :class="{ active: answers[q.id] >= i }"
                @click="answers[q.id] = i"
              >
                {{ answers[q.id] >= i ? '★' : '☆' }}
              </button>
            </div>
            <div class="rating-value" v-if="answers[q.id]">
              当前评分：{{ answers[q.id] }} / {{ q.max_rating }}
            </div>
          </div>
        </div>
      </div>

      <div class="submit-section card">
        <button class="btn btn-primary btn-submit" @click="submitAnswers" :disabled="submitting">
          {{ submitting ? '提交中...' : '提交问卷' }}
        </button>
        <button class="btn btn-secondary" @click="$router.push({ name: 'surveys' })">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSurveyDetail, submitSurvey } from '@/api/surveys'
import type { Survey } from '@/types'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const survey = ref<Survey | null>(null)
const answers = reactive<Record<string, any>>({})

const loadSurvey = async () => {
  loading.value = true
  try {
    const id = parseInt(route.params.id as string)
    const res = await getSurveyDetail(id)
    survey.value = res.data

    if (survey.value?.has_responded) {
      alert('您已填写过该问卷')
      router.push({ name: 'surveys' })
      return
    }

    if (survey.value?.questions) {
      for (const q of survey.value.questions) {
        if (q.question_type === 'multiple_choice') {
          answers[q.id] = []
        } else if (q.question_type === 'rating') {
          answers[q.id] = 0
        } else {
          answers[q.id] = ''
        }
      }
    }
  } catch (error) {
    console.error('加载问卷失败', error)
  } finally {
    loading.value = false
  }
}

const parseOptions = (optionsStr: string): string[] => {
  try {
    return JSON.parse(optionsStr || '[]')
  } catch {
    return []
  }
}

const submitAnswers = async () => {
  if (!survey.value) return

  const questions = survey.value.questions || []
  for (const q of questions) {
    if (q.required) {
      const ans = answers[q.id]
      if (!ans || ans === '' || (Array.isArray(ans) && ans.length === 0) || ans === 0) {
        alert(`请填写必填题：${q.title}`)
        return
      }
    }
  }

  submitting.value = true
  try {
    const answersList = Object.entries(answers).map(([questionId, answerText]) => ({
      question_id: parseInt(questionId),
      answer_text: Array.isArray(answerText) ? JSON.stringify(answerText) : String(answerText)
    }))

    await submitSurvey(survey.value.id, { answers: answersList })
    alert('提交成功！感谢您的参与')
    router.push({ name: 'surveys' })
  } catch (error: any) {
    console.error('提交失败', error)
    alert(error.message || '提交失败，请重试')
  } finally {
    submitting.value = false
  }
}

const getQuestionTypeText = (type: string) => {
  const texts: Record<string, string> = { single_choice: '单选题', multiple_choice: '多选题', text: '填空题', rating: '评分题', scale: '量表题' }
  return texts[type] || type
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

onMounted(loadSurvey)
</script>

<style scoped>
.survey-fill-page { padding-bottom: 20px; }
.survey-container { max-width: 720px; margin: 0 auto; }
.survey-header { padding: 24px; margin-bottom: 20px; text-align: center; }
.survey-title { font-size: 22px; font-weight: 700; margin: 0 0 10px 0; }
.survey-desc { font-size: 14px; color: var(--text-secondary); margin: 0 0 14px 0; line-height: 1.6; }
.survey-meta { display: flex; justify-content: center; gap: 20px; }
.meta-item { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.meta-icon { font-size: 16px; }
.questions-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
.question-card { padding: 20px; }
.question-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.question-number { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: var(--primary-color); color: white; border-radius: 50%; font-size: 14px; font-weight: 600; }
.question-type-badge { padding: 2px 8px; border-radius: 8px; font-size: 11px; background: #e3f2fd; color: #1976d2; }
.required-mark { color: #d32f2f; font-size: 18px; font-weight: 700; }
.question-title { font-size: 16px; font-weight: 600; margin: 0 0 14px 0; }
.options-list { display: flex; flex-direction: column; gap: 8px; }
.option-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s; }
.option-item:hover { border-color: var(--primary-color); background: rgba(102, 126, 234, 0.04); }
.option-item.selected { border-color: var(--primary-color); background: rgba(102, 126, 234, 0.08); }
.option-item input { display: none; }
.radio-dot { width: 18px; height: 18px; border: 2px solid #bbb; border-radius: 50%; position: relative; flex-shrink: 0; transition: all 0.2s; }
.option-item.selected .radio-dot { border-color: var(--primary-color); }
.option-item.selected .radio-dot::after { content: ''; position: absolute; top: 3px; left: 3px; width: 8px; height: 8px; background: var(--primary-color); border-radius: 50%; }
.checkbox-dot { width: 18px; height: 18px; border: 2px solid #bbb; border-radius: 4px; position: relative; flex-shrink: 0; transition: all 0.2s; }
.option-item.selected .checkbox-dot { border-color: var(--primary-color); background: var(--primary-color); }
.option-item.selected .checkbox-dot::after { content: '✓'; position: absolute; top: -1px; left: 2px; color: white; font-size: 12px; font-weight: 700; }
.option-text { font-size: 14px; }
.text-input textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px; resize: vertical; min-height: 80px; }
.text-input textarea:focus { outline: none; border-color: var(--primary-color); }
.rating-input { padding: 10px 0; }
.rating-labels { display: flex; justify-content: space-between; margin-bottom: 8px; }
.rating-min, .rating-max { font-size: 12px; color: var(--text-secondary); }
.rating-stars { display: flex; gap: 8px; justify-content: center; }
.star-btn { background: none; border: none; font-size: 32px; cursor: pointer; color: #ddd; transition: all 0.2s; padding: 4px; }
.star-btn.active { color: #ffc107; }
.star-btn:hover { transform: scale(1.1); }
.rating-value { text-align: center; margin-top: 8px; font-size: 14px; color: var(--primary-color); font-weight: 600; }
.submit-section { padding: 20px; display: flex; justify-content: center; gap: 12px; }
.btn-submit { min-width: 160px; }
.empty-state { padding: 60px; text-align: center; color: var(--text-secondary); }
.loading { display: flex; justify-content: center; padding: 60px 0; }
.spinner { width: 40px; height: 40px; border: 3px solid var(--bg-light); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 768px) {
  .survey-container { max-width: 100%; }
  .survey-meta { flex-wrap: wrap; }
  .star-btn { font-size: 28px; }
}
</style>
