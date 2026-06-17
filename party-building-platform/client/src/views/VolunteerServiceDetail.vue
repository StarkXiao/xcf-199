<template>
  <div class="volunteer-detail-page container">
    <div class="back-btn" @click="goBack">← 返回列表</div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="project" class="project-detail">
      <div class="project-cover">
        <img :src="project.cover_image" alt="cover">
        <div class="status-badge" :class="project.status">
          {{ getStatusText(project.status) }}
        </div>
        <div class="category-tag">{{ project.category || '志愿服务' }}</div>
      </div>

      <div class="project-body">
        <h1 class="project-title">{{ project.title }}</h1>

        <div class="project-meta">
          <div class="meta-item">
            <span class="meta-icon">📍</span>
            <span class="meta-label">服务地点</span>
            <span class="meta-value">{{ project.location || '待定' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">📅</span>
            <span class="meta-label">开始时间</span>
            <span class="meta-value">{{ formatDateTime(project.start_time) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">⏰</span>
            <span class="meta-label">结束时间</span>
            <span class="meta-value">{{ formatDateTime(project.end_time) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">📝</span>
            <span class="meta-label">报名截止</span>
            <span class="meta-value">{{ formatDateTime(project.signup_deadline) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">👥</span>
            <span class="meta-label">报名人数</span>
            <span class="meta-value">{{ project.signup_count }}/{{ project.max_participants || '不限' }}人</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">⭐</span>
            <span class="meta-label">积分标准</span>
            <span class="meta-value highlight">{{ project.points_per_hour }} 积分/小时</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">⏱️</span>
            <span class="meta-label">服务时长</span>
            <span class="meta-value">{{ project.service_hours || 0 }} 小时</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">🏢</span>
            <span class="meta-label">主办方</span>
            <span class="meta-value">{{ project.organizer || '未知' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">👤</span>
            <span class="meta-label">联系人</span>
            <span class="meta-value">{{ project.contact_person || '未知' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">📞</span>
            <span class="meta-label">联系电话</span>
            <span class="meta-value">{{ project.contact_phone || '未知' }}</span>
          </div>
        </div>

        <div class="project-section">
          <h3 class="section-title">项目介绍</h3>
          <div class="project-content">
            <p v-for="(para, index) in paragraphs" :key="index" class="paragraph">
              {{ para }}
            </p>
          </div>
        </div>

        <div v-if="project.is_signed_up && project.signup_status === 'approved'" class="project-section">
          <h3 class="section-title">我的服务记录</h3>
          <div v-if="myRecordsLoading" class="loading-inline">
            <div class="spinner-sm"></div>
          </div>
          <div v-else-if="myRecords.length === 0" class="empty-inline">
            暂无服务记录
          </div>
          <div v-else class="service-record-list">
            <div v-for="record in myRecords" :key="record.id" class="record-item">
              <div class="record-date">
                <div class="date-day">{{ formatDay(record.service_date) }}</div>
                <div class="date-month">{{ formatMonth(record.service_date) }}</div>
              </div>
              <div class="record-info">
                <div class="record-task">{{ record.task_description || '志愿服务' }}</div>
                <div class="record-time">
                  {{ formatTime(record.start_time) }} - {{ formatTime(record.end_time) }}
                </div>
              </div>
              <div class="record-hours">
                <span class="hours-number">{{ record.actual_hours }}</span>
                <span class="hours-unit">小时</span>
                <div class="points-earned">+{{ record.points_awarded }}积分</div>
              </div>
            </div>
          </div>
          <div v-if="project.total_service_hours" class="total-hours">
            累计服务：<strong>{{ project.total_service_hours }}</strong> 小时，
            获得积分：<strong>{{ project.total_points_awarded }}</strong> 分
          </div>
        </div>

        <div class="project-section">
          <h3 class="section-title">志愿者评价 ({{ project.review_count || 0 }})</h3>
          <div class="rating-summary">
            <div class="avg-rating">
              <span class="rating-big">{{ (project.avg_rating || 0).toFixed(1) }}</span>
              <div class="stars">
                <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= Math.round(project.avg_rating || 0) }">★</span>
              </div>
              <span class="rating-count">{{ project.review_count || 0 }}条评价</span>
            </div>
          </div>

          <div v-if="reviewsLoading" class="loading-inline">
            <div class="spinner-sm"></div>
          </div>
          <div v-else class="review-list">
            <div v-for="review in reviews" :key="review.id" class="review-item">
              <div class="review-header">
                <img v-if="review.avatar" :src="review.avatar" class="review-avatar" alt="avatar">
                <div v-else class="review-avatar placeholder">👤</div>
                <div class="review-info">
                  <div class="review-name">{{ review.real_name }}</div>
                  <div class="review-stars">
                    <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= review.rating }">★</span>
                  </div>
                </div>
                <div class="review-date">{{ formatDate(review.created_at) }}</div>
              </div>
              <div class="review-content">{{ review.content }}</div>
            </div>
          </div>

          <div v-if="canReview" class="review-form">
            <h4 class="form-title">发表评价</h4>
            <div class="form-group">
              <label>评分：</label>
              <div class="star-rating">
                <span
                  v-for="i in 5"
                  :key="i"
                  class="star"
                  :class="{ filled: i <= reviewForm.rating, hover: i <= hoverRating }"
                  @click="reviewForm.rating = i"
                  @mouseenter="hoverRating = i"
                  @mouseleave="hoverRating = 0"
                >★</span>
              </div>
            </div>
            <div class="form-group">
              <label>评价内容：</label>
              <textarea
                v-model="reviewForm.content"
                rows="4"
                placeholder="分享您的志愿服务体验..."
                class="form-textarea"
              ></textarea>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="reviewForm.is_anonymous">
                匿名评价
              </label>
            </div>
            <button class="btn btn-primary" @click="submitReview" :disabled="submittingReview">
              {{ submittingReview ? '提交中...' : '提交评价' }}
            </button>
          </div>
        </div>

        <div class="project-actions">
          <template v-if="!userStore.isLoggedIn">
            <button class="btn btn-primary btn-lg" @click="goLogin">
              登录后报名
            </button>
          </template>
          <template v-else>
            <template v-if="project.is_signed_up">
              <template v-if="project.signup_status === 'pending'">
                <button class="btn btn-warning btn-lg" disabled>
                  审核中
                </button>
                <button class="btn btn-outline btn-lg" @click="handleCancel">
                  取消报名
                </button>
              </template>
              <template v-else-if="project.signup_status === 'approved'">
                <button class="btn btn-success btn-lg" disabled>
                  ✓ 已通过
                </button>
              </template>
              <template v-else-if="project.signup_status === 'rejected'">
                <button class="btn btn-danger btn-lg" disabled>
                  未通过
                </button>
                <button class="btn btn-primary btn-lg" @click="showSignupDialog = true">
                  重新报名
                </button>
              </template>
              <template v-else-if="project.signup_status === 'cancelled'">
                <button class="btn btn-secondary btn-lg" disabled>
                  已取消
                </button>
                <button class="btn btn-primary btn-lg" @click="showSignupDialog = true">
                  重新报名
                </button>
              </template>
            </template>
            <template v-else-if="project.status !== 'recruiting'">
              <button class="btn btn-secondary btn-lg" disabled>
                {{ project.status === 'completed' ? '项目已结束' : '报名已截止' }}
              </button>
            </template>
            <template v-else>
              <button class="btn btn-primary btn-lg" @click="showSignupDialog = true">
                立即报名
              </button>
            </template>
          </template>
        </div>
      </div>
    </div>

    <div v-if="showSignupDialog" class="modal-overlay" @click.self="showSignupDialog = false">
      <div class="modal">
        <div class="modal-header">
          <h3>志愿服务报名</h3>
          <button class="close-btn" @click="showSignupDialog = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>报名理由 <span class="required">*</span></label>
            <textarea
              v-model="signupForm.apply_reason"
              rows="3"
              placeholder="请简要说明您的报名理由..."
              class="form-textarea"
            ></textarea>
          </div>
          <div class="form-group">
            <label>个人技能/特长</label>
            <input
              v-model="signupForm.skills"
              type="text"
              placeholder="如：沟通能力强、有医疗背景等"
              class="form-input"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showSignupDialog = false">取消</button>
          <button class="btn btn-primary" @click="handleSignup" :disabled="signingUp">
            {{ signingUp ? '提交中...' : '确认报名' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getVolunteerProjectDetail,
  signupVolunteerProject,
  cancelVolunteerSignup,
  getVolunteerReviews,
  submitVolunteerReview,
  getMyVolunteerServiceRecords
} from '@/api/volunteerService'
import type { VolunteerProject, VolunteerReview, VolunteerServiceRecord } from '@/types'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const project = ref<VolunteerProject | null>(null)
const loading = ref(false)
const signingUp = ref(false)
const showSignupDialog = ref(false)
const signupForm = ref({
  apply_reason: '',
  skills: ''
})

const reviews = ref<VolunteerReview[]>([])
const reviewsLoading = ref(false)
const reviewPage = ref(1)
const reviewTotal = ref(0)
const submittingReview = ref(false)
const hoverRating = ref(0)
const reviewForm = ref({
  rating: 5,
  content: '',
  is_anonymous: false
})

const myRecords = ref<VolunteerServiceRecord[]>([])
const myRecordsLoading = ref(false)

const paragraphs = computed(() => {
  if (!project.value) return []
  return project.value.description.split('\n').filter(p => p.trim())
})

const canReview = computed(() => {
  if (!userStore.isLoggedIn || !project.value) return false
  if (!project.value.is_signed_up || project.value.signup_status !== 'approved') return false
  if (project.value.has_reviewed) return false
  if (!project.value.total_service_hours || project.value.total_service_hours <= 0) return false
  return true
})

const loadProject = async () => {
  const id = Number(route.params.id)
  if (!id) return

  loading.value = true
  try {
    const res = await getVolunteerProjectDetail(id)
    project.value = res.data
  } catch (error) {
    console.error('加载项目详情失败', error)
  } finally {
    loading.value = false
  }
}

const loadReviews = async () => {
  const id = Number(route.params.id)
  if (!id) return

  reviewsLoading.value = true
  try {
    const res = await getVolunteerReviews(id, { page: reviewPage.value, page_size: 10 })
    reviews.value = res.data.list
    reviewTotal.value = res.data.total
  } catch (error) {
    console.error('加载评价失败', error)
  } finally {
    reviewsLoading.value = false
  }
}

const loadMyRecords = async () => {
  if (!userStore.isLoggedIn) return
  myRecordsLoading.value = true
  try {
    const res = await getMyVolunteerServiceRecords({ page: 1, page_size: 20 })
    const projectId = Number(route.params.id)
    myRecords.value = res.data.list.filter(r => r.project_id === projectId)
  } catch (error) {
    console.error('加载我的服务记录失败', error)
  } finally {
    myRecordsLoading.value = false
  }
}

const handleSignup = async () => {
  if (!project.value) return
  if (!signupForm.value.apply_reason.trim()) {
    alert('请填写报名理由')
    return
  }

  signingUp.value = true
  try {
    await signupVolunteerProject(project.value.id, {
      apply_reason: signupForm.value.apply_reason,
      skills: signupForm.value.skills
    })
    alert('报名成功，等待审核！')
    showSignupDialog.value = false
    loadProject()
  } catch (error: any) {
    alert(error.message || '报名失败')
  } finally {
    signingUp.value = false
  }
}

const handleCancel = async () => {
  if (!project.value) return

  if (!confirm('确定要取消报名吗？')) return

  try {
    await cancelVolunteerSignup(project.value.id)
    alert('取消报名成功')
    loadProject()
  } catch (error: any) {
    alert(error.message || '取消失败')
  }
}

const submitReview = async () => {
  if (!project.value) return
  if (!reviewForm.value.content.trim()) {
    alert('请填写评价内容')
    return
  }

  submittingReview.value = true
  try {
    await submitVolunteerReview(project.value.id, {
      rating: reviewForm.value.rating,
      content: reviewForm.value.content,
      is_anonymous: reviewForm.value.is_anonymous
    })
    alert('评价提交成功！')
    loadProject()
    loadReviews()
  } catch (error: any) {
    alert(error.message || '提交失败')
  } finally {
    submittingReview.value = false
  }
}

const goLogin = () => {
  router.push('/login')
}

const goBack = () => {
  router.push('/volunteer-service')
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    recruiting: '招募中',
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

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDay = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.getDate()
}

const formatMonth = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月`
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadProject()
  loadReviews()
  if (userStore.isLoggedIn) {
    loadMyRecords()
  }
})
</script>

<style scoped>
.volunteer-detail-page {
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

.project-detail {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.project-cover {
  position: relative;
  height: 300px;
  overflow: hidden;
}

.project-cover img {
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

.status-badge.recruiting {
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

.category-tag {
  position: absolute;
  top: 20px;
  left: 20px;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--primary-color);
  font-weight: 500;
}

.project-body {
  padding: 30px;
}

.project-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  line-height: 1.4;
}

.project-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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

.project-section {
  margin-bottom: 30px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 4px solid var(--primary-color);
}

.project-content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-primary);
}

.paragraph {
  margin-bottom: 16px;
  text-indent: 2em;
}

.service-record-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
  gap: 16px;
}

.record-date {
  text-align: center;
  min-width: 50px;
}

.date-day {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.date-month {
  font-size: 12px;
  color: var(--text-secondary);
}

.record-info {
  flex: 1;
}

.record-task {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.record-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.record-hours {
  text-align: right;
}

.hours-number {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.hours-unit {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 2px;
}

.points-earned {
  font-size: 12px;
  color: #28a745;
  margin-top: 4px;
}

.total-hours {
  margin-top: 16px;
  padding: 12px 16px;
  background: #e6f7ff;
  border-radius: var(--radius-sm);
  font-size: 14px;
  text-align: center;
}

.total-hours strong {
  color: var(--primary-color);
  font-size: 16px;
}

.rating-summary {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}

.avg-rating {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rating-big {
  font-size: 36px;
  font-weight: 700;
  color: #ffc107;
}

.stars {
  display: flex;
  gap: 2px;
}

.star {
  color: #ddd;
  font-size: 18px;
  cursor: pointer;
  transition: color 0.2s;
}

.star.filled {
  color: #ffc107;
}

.star.hover {
  color: #ffc107;
}

.rating-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-item {
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.review-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.review-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.review-avatar.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-light);
  font-size: 20px;
}

.review-info {
  flex: 1;
}

.review-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.review-stars {
  display: flex;
  gap: 2px;
}

.review-stars .star {
  font-size: 14px;
}

.review-date {
  font-size: 12px;
  color: var(--text-light);
}

.review-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
}

.review-form {
  margin-top: 24px;
  padding: 20px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
}

.form-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.star-rating {
  display: flex;
  gap: 4px;
}

.star-rating .star {
  font-size: 24px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.required {
  color: #dc3545;
}

.project-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.project-actions .btn {
  min-width: 160px;
}

.loading-inline,
.empty-inline {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.spinner-sm {
  width: 24px;
  height: 24px;
  border: 2px solid var(--bg-light);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
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

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
  line-height: 1;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .project-cover {
    height: 200px;
  }

  .project-body {
    padding: 20px;
  }

  .project-title {
    font-size: 22px;
  }

  .project-meta {
    grid-template-columns: 1fr;
  }
}
</style>
