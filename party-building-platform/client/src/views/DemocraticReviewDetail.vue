<template>
  <div class="review-detail container" v-if="review">
    <div class="detail-header">
      <button class="back-btn" @click="$router.back()">← 返回</button>
      <div class="header-content">
        <h1 class="detail-title">{{ review.title }}</h1>
        <div class="header-meta">
          <span class="status-badge" :class="review.status">{{ getStatusText(review.status) }}</span>
          <span class="meta-item">📅 {{ review.year }}年度</span>
          <span class="meta-item">🏢 {{ review.branch }}</span>
          <span class="meta-item">👥 {{ review.participant_count || 0 }}人参与</span>
        </div>
      </div>
    </div>

    <div class="detail-body">
      <div class="info-section card">
        <h3 class="section-title">评议信息</h3>
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">评议时间</span>
            <span class="info-value">{{ formatDate(review.start_date) }} ~ {{ formatDate(review.end_date) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">评议说明</span>
            <span class="info-value">{{ review.description || '暂无' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">评议项目</span>
            <span class="info-value">{{ review.form_items?.filter(i => i.item_type === 'score').length || 0 }} 个评分项</span>
          </div>
        </div>
      </div>

      <div v-if="review.status === 'in_progress' || review.status === 'completed' || review.status === 'archived'" class="results-section card">
        <h3 class="section-title">评议结果</h3>
        <div v-if="results.length === 0" class="empty-inline">暂无评议结果</div>
        <div v-else class="results-table-wrap">
          <table class="results-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>姓名</th>
                <th>支部</th>
                <th>互评均分</th>
                <th>组织评价</th>
                <th>综合得分</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in results" :key="r.user_id">
                <td>
                  <span class="rank-badge" :class="getRankClass(r.rank)">{{ r.rank }}</span>
                </td>
                <td>{{ r.real_name }}</td>
                <td>{{ r.branch }}</td>
                <td>{{ r.mutual_avg_score.toFixed(1) }}</td>
                <td>{{ r.organization_score.toFixed(1) }}</td>
                <td class="total-score">{{ r.total_score.toFixed(1) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="review.status === 'in_progress'" class="review-section card">
        <h3 class="section-title">党员互评</h3>
        <p class="section-desc">请对同支部其他党员进行评议打分</p>
        <div v-if="!isLoggedIn" class="login-hint">
          <p>请先 <router-link to="/login">登录</router-link> 后参与评议</p>
        </div>
        <div v-else>
          <div class="target-select">
            <label>选择被评议人：</label>
            <select v-model="selectedTargetId" class="target-select-input">
              <option value="">请选择</option>
              <option v-for="u in targetUsers" :key="u.user_id" :value="u.user_id">{{ u.real_name }}</option>
            </select>
          </div>
          <div v-if="selectedTargetId" class="score-form">
            <div v-for="item in scoreFormItems" :key="item.id" class="score-item">
              <div class="score-item-header">
                <span class="score-item-name">{{ item.item_name }}</span>
                <span class="score-item-max">（满分{{ item.max_score }}分，权重{{ (item.weight * 100).toFixed(0) }}%）</span>
              </div>
              <div class="score-input-wrap">
                <input
                  type="range"
                  :min="0"
                  :max="item.max_score"
                  v-model.number="mutualScores[item.id]"
                  class="score-range"
                />
                <input
                  type="number"
                  :min="0"
                  :max="item.max_score"
                  v-model.number="mutualScores[item.id]"
                  class="score-number"
                />
                <span class="score-max-label">/{{ item.max_score }}</span>
              </div>
            </div>
            <div v-for="item in textFormItems" :key="item.id" class="score-item">
              <div class="score-item-header">
                <span class="score-item-name">{{ item.item_name }}</span>
              </div>
              <textarea
                v-model="mutualTexts[item.id]"
                class="score-textarea"
                placeholder="请输入评价意见..."
                rows="3"
              ></textarea>
            </div>
            <button class="submit-btn" @click="submitMutual" :disabled="submitting">
              {{ submitting ? '提交中...' : '提交互评' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="history.length > 0" class="history-section card">
        <h3 class="section-title">操作记录</h3>
        <div class="history-list">
          <div v-for="h in history" :key="h.id" class="history-item">
            <div class="history-dot"></div>
            <div class="history-content">
              <div class="history-action">{{ h.action_detail }}</div>
              <div class="history-meta">
                <span v-if="h.operator_name">{{ h.operator_name }}</span>
                <span>{{ formatDateTime(h.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getDemocraticReviewDetail, getDemocraticReviewResults, submitMutualReview } from '@/api/democraticReview'
import type { DemocraticReview, DemocraticReviewResult, DemocraticReviewHistory } from '@/types'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()

const review = ref<DemocraticReview | null>(null)
const results = ref<DemocraticReviewResult[]>([])
const history = ref<DemocraticReviewHistory[]>([])
const loading = ref(false)
const submitting = ref(false)
const selectedTargetId = ref<number | ''>('')
const mutualScores = ref<Record<number, number>>({})
const mutualTexts = ref<Record<number, string>>({})

const isLoggedIn = computed(() => userStore.isLoggedIn)

const scoreFormItems = computed(() => {
  return review.value?.form_items?.filter(i => i.item_type === 'score') || []
})

const textFormItems = computed(() => {
  return review.value?.form_items?.filter(i => i.item_type === 'text') || []
})

const targetUsers = computed(() => {
  return results.value.filter(r => r.user_id !== userStore.user?.id)
})

const loadDetail = async () => {
  loading.value = true
  try {
    const id = parseInt(route.params.id as string)
    const res = await getDemocraticReviewDetail(id)
    review.value = res.data

    if (res.data.form_items) {
      for (const item of res.data.form_items) {
        if (item.item_type === 'score') {
          mutualScores.value[item.id] = 0
        } else {
          mutualTexts.value[item.id] = ''
        }
      }
    }

    if (res.data.status === 'in_progress' || res.data.status === 'completed' || res.data.status === 'archived') {
      await loadResults(id)
    }

    history.value = (res.data as any).history || []
  } catch (error) {
    console.error('加载评议详情失败', error)
  } finally {
    loading.value = false
  }
}

const loadResults = async (id: number) => {
  try {
    const res = await getDemocraticReviewResults(id)
    results.value = res.data
  } catch (error) {
    console.error('加载评议结果失败', error)
  }
}

const submitMutual = async () => {
  if (!selectedTargetId.value) return
  submitting.value = true
  try {
    const scores: { form_item_id: number; score: number; content?: string }[] = scoreFormItems.value.map(item => ({
      form_item_id: item.id,
      score: mutualScores.value[item.id] || 0
    }))
    textFormItems.value.forEach(item => {
      if (mutualTexts.value[item.id]) {
        scores.push({
          form_item_id: item.id,
          score: 0,
          content: mutualTexts.value[item.id]
        })
      }
    })

    await submitMutualReview(parseInt(route.params.id as string), {
      target_user_id: selectedTargetId.value as number,
      scores
    })

    alert('互评提交成功！')
    mutualScores.value = {}
    mutualTexts.value = {}
    for (const item of scoreFormItems.value) {
      mutualScores.value[item.id] = 0
    }
    selectedTargetId.value = ''
    await loadResults(parseInt(route.params.id as string))
  } catch (error: any) {
    alert(error?.response?.data?.message || '提交失败')
  } finally {
    submitting.value = false
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

const getRankClass = (rank: number) => {
  if (rank === 1) return 'rank-gold'
  if (rank === 2) return 'rank-silver'
  if (rank === 3) return 'rank-bronze'
  return ''
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '待定'
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadDetail()
})
</script>

<style scoped>
.review-detail {
  padding-bottom: 40px;
}

.detail-header {
  margin-bottom: 24px;
}

.back-btn {
  background: none;
  border: none;
  color: var(--primary-color);
  font-size: 14px;
  cursor: pointer;
  padding: 8px 0;
  margin-bottom: 12px;
}

.back-btn:hover {
  text-decoration: underline;
}

.header-content {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  border-radius: var(--radius-lg);
  padding: 30px;
}

.detail-title {
  font-size: 24px;
  margin: 0 0 12px;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 14px;
  opacity: 0.9;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(255,255,255,0.2);
  color: white;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card {
  background: white;
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.section-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 16px;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  gap: 16px;
}

.info-label {
  width: 100px;
  flex-shrink: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.info-value {
  font-size: 14px;
  color: var(--text-primary);
  flex: 1;
}

.results-table-wrap {
  overflow-x: auto;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.results-table th,
.results-table td {
  padding: 12px 16px;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
}

.results-table th {
  background: var(--bg-light);
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
}

.results-table td {
  font-size: 14px;
}

.total-score {
  font-weight: 700;
  color: var(--primary-color);
  font-size: 16px;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #dee2e6;
  color: #495057;
  font-size: 13px;
  font-weight: 700;
}

.rank-badge.rank-gold {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #7a5d00;
}

.rank-badge.rank-silver {
  background: linear-gradient(135deg, #e8e8e8, #c0c0c0);
  color: #666;
}

.rank-badge.rank-bronze {
  background: linear-gradient(135deg, #cd7f32, #a0522d);
  color: #fff;
}

.target-select {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.target-select label {
  font-size: 14px;
  font-weight: 500;
}

.target-select-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  max-width: 300px;
}

.score-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.score-item {
  padding: 16px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
}

.score-item-header {
  margin-bottom: 10px;
}

.score-item-name {
  font-size: 14px;
  font-weight: 600;
}

.score-item-max {
  font-size: 12px;
  color: var(--text-secondary);
}

.score-input-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.score-range {
  flex: 1;
  accent-color: var(--primary-color);
}

.score-number {
  width: 60px;
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  text-align: center;
  font-size: 14px;
  font-weight: 600;
}

.score-max-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.score-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.submit-btn {
  padding: 12px 40px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  align-self: center;
}

.submit-btn:hover:not(:disabled) {
  background: var(--primary-dark);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-hint {
  text-align: center;
  padding: 30px;
  color: var(--text-secondary);
}

.login-hint a {
  color: var(--primary-color);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.history-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  position: relative;
}

.history-item:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
}

.history-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--primary-color);
  flex-shrink: 0;
  margin-top: 5px;
}

.history-content {
  flex: 1;
}

.history-action {
  font-size: 14px;
  margin-bottom: 4px;
}

.history-meta {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  gap: 12px;
}

.empty-inline {
  text-align: center;
  padding: 30px;
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .header-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .results-table {
    font-size: 12px;
  }

  .results-table th,
  .results-table td {
    padding: 8px;
  }

  .info-row {
    flex-direction: column;
    gap: 4px;
  }

  .info-label {
    width: auto;
  }

  .target-select {
    flex-direction: column;
    align-items: stretch;
  }

  .target-select-input {
    max-width: none;
  }
}
</style>
