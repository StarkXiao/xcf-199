<template>
  <div class="activity-detail-page container">
    <div class="back-btn" @click="goBack">← 返回列表</div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="activity" class="activity-detail">
      <div class="activity-cover">
        <img :src="activity.cover_image" alt="cover">
        <div class="status-badge" :class="activity.status">
          {{ getStatusText(activity.status) }}
        </div>
      </div>

      <div class="activity-body">
        <h1 class="activity-title">{{ activity.title }}</h1>

        <div class="activity-meta">
          <div class="meta-item">
            <span class="meta-icon">📍</span>
            <span class="meta-label">活动地点</span>
            <span class="meta-value">{{ activity.location || '待定' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">📅</span>
            <span class="meta-label">开始时间</span>
            <span class="meta-value">{{ formatDateTime(activity.start_time) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">⏰</span>
            <span class="meta-label">结束时间</span>
            <span class="meta-value">{{ formatDateTime(activity.end_time) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">📝</span>
            <span class="meta-label">报名截止</span>
            <span class="meta-value">{{ formatDateTime(activity.signup_deadline) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">👥</span>
            <span class="meta-label">报名人数</span>
            <span class="meta-value">{{ activity.signup_count }}/{{ activity.max_participants || '不限' }}人</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">⭐</span>
            <span class="meta-label">积分奖励</span>
            <span class="meta-value highlight">{{ activity.points_reward }} 积分</span>
          </div>
        </div>

        <div class="activity-section">
          <h3 class="section-title">活动介绍</h3>
          <div class="activity-content">
            <p v-for="(para, index) in paragraphs" :key="index" class="paragraph">
              {{ para }}
            </p>
          </div>
        </div>

        <div class="activity-actions">
          <template v-if="!userStore.isLoggedIn">
            <button class="btn btn-primary btn-lg" @click="goLogin">
              登录后报名
            </button>
          </template>
          <template v-else>
            <template v-if="activity.is_signed_up && activity.signup_status !== 'cancelled'">
              <button class="btn btn-secondary btn-lg" disabled>
                已报名
              </button>
              <button class="btn btn-outline btn-lg" @click="handleCancel">
                取消报名
              </button>
            </template>
            <template v-else-if="activity.status !== 'upcoming'">
              <button class="btn btn-secondary btn-lg" disabled>
              {{ activity.status === 'completed' ? '活动已结束' : '报名已截止' }}
              </button>
            </template>
            <template v-else>
              <button class="btn btn-primary btn-lg" @click="handleSignup" :disabled="signingUp">
                {{ signingUp ? '报名中...' : '立即报名' }}
              </button>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getActivityDetail, signupActivity, cancelSignup } from '@/api/activities'
import type { Activity } from '@/types'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activity = ref<Activity | null>(null)
const loading = ref(false)
const signingUp = ref(false)

const paragraphs = computed(() => {
  if (!activity.value) return []
  return activity.value.description.split('\n').filter(p => p.trim())
})

const loadActivity = async () => {
  const id = Number(route.params.id)
  if (!id) return

  loading.value = true
  try {
    const res = await getActivityDetail(id)
    activity.value = res.data
  } catch (error) {
    console.error('加载活动详情失败', error)
  } finally {
    loading.value = false
  }
}

const handleSignup = async () => {
  if (!activity.value) return

  signingUp.value = true
  try {
    await signupActivity(activity.value.id)
    alert('报名成功！')
    loadActivity()
    userStore.fetchProfile()
  } catch (error: any) {
    alert(error.message || '报名失败')
  } finally {
    signingUp.value = false
  }
}

const handleCancel = async () => {
  if (!activity.value) return

  if (!confirm('确定要取消报名吗？')) return

  try {
    await cancelSignup(activity.value.id)
    alert('取消报名成功')
    loadActivity()
  } catch (error: any) {
    alert(error.message || '取消失败')
  }
}

const goLogin = () => {
  router.push('/login')
}

const goBack = () => {
  router.push('/activities')
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

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '待定'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadActivity()
})
</script>

<style scoped>
.activity-detail-page {
  max-width: 900px;
  padding-bottom: 40px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  color: var(--text-secondary);
  cursor: pointer;
  margin-bottom: 20px;
  font-size: 14px;
  transition: color 0.2s;
}

.back-btn:hover {
  color: var(--primary-color);
}

.activity-detail {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.activity-cover {
  position: relative;
  height: 300px;
  overflow: hidden;
}

.activity-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-badge {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.6);
  color: white;
}

.status-badge.upcoming {
  background: #28a745;
}

.status-badge.ongoing {
  background: #007bff;
}

.status-badge.completed {
  background: #6c757d;
}

.status-badge.cancelled {
  background: #dc3545;
}

.activity-body {
  padding: 30px;
}

.activity-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  line-height: 1.4;
}

.activity-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 20px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
  margin-bottom: 30px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-icon {
  font-size: 18px;
}

.meta-label {
  font-size: 12px;
  color: var(--text-light);
}

.meta-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.meta-value.highlight {
  color: var(--primary-color);
  font-size: 16px;
}

.activity-section {
  margin-bottom: 30px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 4px solid var(--primary-color);
}

.activity-content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-primary);
}

.paragraph {
  margin-bottom: 16px;
  text-indent: 2em;
}

.activity-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.activity-actions .btn {
  min-width: 160px;
}

@media (max-width: 768px) {
  .activity-cover {
    height: 200px;
  }

  .activity-body {
    padding: 20px;
  }

  .activity-title {
    font-size: 22px;
  }

  .activity-meta {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
