<template>
  <div class="surveys-page">
    <div class="page-header">
      <h1 class="page-title">📋 调研问卷</h1>
      <p class="page-desc">参与调研，表达您的意见与建议</p>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <div v-else-if="surveys.length === 0" class="empty-state card">
      <div class="empty-icon">📋</div>
      <p>暂无可参与的问卷</p>
    </div>

    <div v-else class="surveys-grid">
      <div v-for="survey in surveys" :key="survey.id" class="survey-card card" @click="goToFill(survey)">
        <div class="card-header">
          <h3 class="survey-title">{{ survey.title }}</h3>
          <span class="status-badge" :class="survey.has_responded ? 'completed' : 'open'">
            {{ survey.has_responded ? '已填写' : '待填写' }}
          </span>
        </div>
        <p class="survey-desc">{{ survey.description || '暂无描述' }}</p>
        <div class="card-meta">
          <span class="meta-item">
            <span class="meta-icon">📝</span>
            {{ survey.questions?.length || 0 }} 题
          </span>
          <span class="meta-item">
            <span class="meta-icon">{{ survey.is_anonymous ? '🔒' : '👤' }}</span>
            {{ survey.is_anonymous ? '匿名' : '实名' }}
          </span>
          <span class="meta-item">
            <span class="meta-icon">👥</span>
            {{ survey.response_count || 0 }} 人已填
          </span>
        </div>
        <div v-if="survey.end_date" class="card-deadline">
          截止时间：{{ formatDate(survey.end_date) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAvailableSurveys } from '@/api/surveys'
import type { Survey } from '@/types'

const router = useRouter()
const loading = ref(false)
const surveys = ref<Survey[]>([])

const loadSurveys = async () => {
  loading.value = true
  try {
    const res = await getAvailableSurveys()
    surveys.value = res.data
  } catch (error) {
    console.error('加载问卷失败', error)
  } finally {
    loading.value = false
  }
}

const goToFill = (survey: Survey) => {
  if (survey.has_responded) {
    alert('您已填写过该问卷')
    return
  }
  router.push({ name: 'survey-fill', params: { id: survey.id } })
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

onMounted(loadSurveys)
</script>

<style scoped>
.surveys-page { padding-bottom: 20px; }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 700; margin: 0 0 8px 0; }
.page-desc { font-size: 14px; color: var(--text-secondary); margin: 0; }
.surveys-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.survey-card { padding: 20px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
.survey-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.survey-title { font-size: 16px; font-weight: 600; margin: 0; flex: 1; }
.status-badge { padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 500; flex-shrink: 0; margin-left: 10px; }
.status-badge.open { background: #e8f5e9; color: #388e3c; }
.status-badge.completed { background: #f5f5f5; color: #616161; }
.survey-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 12px 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-meta { display: flex; gap: 16px; margin-bottom: 8px; }
.meta-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-secondary); }
.meta-icon { font-size: 14px; }
.card-deadline { font-size: 12px; color: #e65100; }
.empty-state { padding: 60px; text-align: center; color: var(--text-secondary); }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.loading { display: flex; justify-content: center; padding: 60px 0; }
.spinner { width: 40px; height: 40px; border: 3px solid var(--bg-light); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 768px) {
  .surveys-grid { grid-template-columns: 1fr; }
}
</style>
