<template>
  <div class="meeting-detail-page container">
    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <template v-else-if="meeting">
      <div class="detail-header">
        <button class="btn btn-secondary btn-sm" @click="goBack">← 返回列表</button>
      </div>

      <div class="detail-main card">
        <div class="detail-top">
          <div class="detail-badges">
            <span class="tag tag-primary">{{ getTypeName(meeting.meeting_type) }}</span>
            <span class="badge" :class="getStatusClass(meeting.status)">{{ getStatusName(meeting.status) }}</span>
          </div>
          <h1 class="detail-title">{{ meeting.title }}</h1>
          <div class="detail-meta">
            <span>📍 {{ meeting.branch }}</span>
            <span>🕐 {{ formatDateTime(meeting.meeting_time) }}</span>
            <span v-if="meeting.end_time">至 {{ formatDateTime(meeting.end_time) }}</span>
            <span v-if="meeting.location">🏢 {{ meeting.location }}</span>
          </div>
        </div>

        <div class="detail-tabs">
          <button class="tab-btn" :class="{ active: tab === 'info' }" @click="tab = 'info'">会议信息</button>
          <button class="tab-btn" :class="{ active: tab === 'agendas' }" @click="tab = 'agendas'">会议议题</button>
          <button class="tab-btn" :class="{ active: tab === 'attendees' }" @click="tab = 'attendees'">参会名单</button>
          <button class="tab-btn" :class="{ active: tab === 'resolutions' }" @click="tab = 'resolutions'">决议留痕</button>
        </div>

        <div v-if="tab === 'info'" class="tab-content">
          <div v-if="meeting.notification_content" class="info-section">
            <h3 class="section-title">会议通知</h3>
            <p class="section-text">{{ meeting.notification_content }}</p>
          </div>
          <div v-if="meeting.minutes_content" class="info-section">
            <h3 class="section-title">会议纪要</h3>
            <p class="section-text">{{ meeting.minutes_content }}</p>
          </div>
          <div v-if="!meeting.notification_content && !meeting.minutes_content" class="empty-state">
            <p>暂无会议内容</p>
          </div>
          <div class="checkin-section" v-if="meeting.status !== 'cancelled'">
            <button class="btn btn-primary" @click="handleCheckin('onsite')" :disabled="checkinLoading || hasCheckedIn">
              {{ hasCheckedIn ? '已签到' : '现场签到' }}
            </button>
            <button class="btn btn-outline" @click="handleCheckin('online')" :disabled="checkinLoading || hasCheckedIn" style="margin-left:8px">
              {{ hasCheckedIn ? '已签到' : '线上签到' }}
            </button>
          </div>
        </div>

        <div v-if="tab === 'agendas'" class="tab-content">
          <div v-for="a in meeting.agendas" :key="a.id" class="agenda-card">
            <div class="agenda-header">
              <span class="agenda-order">{{ a.sort_order }}.</span>
              <span class="agenda-title">{{ a.title }}</span>
              <span class="badge" :class="getAgendaStatusClass(a.status)">{{ getAgendaStatusName(a.status) }}</span>
            </div>
            <p class="agenda-content" v-if="a.content">{{ a.content }}</p>
            <p class="agenda-result" v-if="a.discussion_result"><strong>讨论结果：</strong>{{ a.discussion_result }}</p>
          </div>
          <div v-if="!meeting.agendas?.length" class="empty-state"><p>暂无议题</p></div>
        </div>

        <div v-if="tab === 'attendees'" class="tab-content">
          <div class="stats-row">
            <div class="stat-item">
              <span class="stat-value">{{ meeting.attendees?.length || 0 }}</span>
              <span class="stat-label">参会人数</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ meeting.checkins?.length || 0 }}</span>
              <span class="stat-label">签到人数</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ attendanceRate }}%</span>
              <span class="stat-label">出勤率</span>
            </div>
          </div>
          <div class="attendee-grid">
            <div v-for="a in meeting.attendees" :key="a.id" class="attendee-card">
              <div class="attendee-avatar">{{ (a.real_name || '?').charAt(0) }}</div>
              <div class="attendee-info">
                <span class="attendee-name">{{ a.real_name || '-' }}</span>
                <span class="attendee-branch">{{ a.branch || '' }}</span>
              </div>
              <span class="badge" :class="a.status === 'confirmed' ? 'badge-success' : a.status === 'leave' ? 'badge-warning' : 'badge-info'">
                {{ a.status === 'confirmed' ? '已确认' : a.status === 'leave' ? '已请假' : a.status === 'unresponsive' ? '未响应' : '待确认' }}
              </span>
              <span v-if="meeting.checkins?.some(c => c.user_id === a.user_id)" class="checkin-mark">✓ 已签到</span>
            </div>
          </div>
          <div v-if="!meeting.attendees?.length" class="empty-state"><p>暂无参会人员</p></div>
        </div>

        <div v-if="tab === 'resolutions'" class="tab-content">
          <div v-for="r in meeting.resolutions" :key="r.id" class="resolution-card">
            <div class="resolution-header">
              <h4 class="resolution-title">{{ r.title }}</h4>
              <span class="badge" :class="r.result === 'passed' ? 'badge-success' : r.result === 'rejected' ? 'badge-danger' : 'badge-warning'">
                {{ r.result === 'passed' ? '通过' : r.result === 'rejected' ? '未通过' : '待表决' }}
              </span>
            </div>
            <p class="resolution-content" v-if="r.content">{{ r.content }}</p>
            <div class="resolution-votes" v-if="r.result !== 'pending'">
              <span class="vote-item vote-for">赞成 {{ r.vote_for }}</span>
              <span class="vote-item vote-against">反对 {{ r.vote_against }}</span>
              <span class="vote-item vote-abstain">弃权 {{ r.vote_abstain }}</span>
            </div>
            <p class="resolution-meta" v-if="r.agenda_title">关联议题：{{ r.agenda_title }}</p>
            <p class="resolution-time" v-if="r.resolved_at">决议时间：{{ formatDateTime(r.resolved_at) }}</p>
          </div>
          <div v-if="!meeting.resolutions?.length" class="empty-state"><p>暂无决议记录</p></div>
        </div>
      </div>
    </template>

    <div v-else class="empty-state"><p>会议不存在</p></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBranchMeetingDetail, checkinMeeting } from '@/api/branchMeetings'
import { useUserStore } from '@/stores/user'
import type { BranchMeeting } from '@/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const meeting = ref<BranchMeeting | null>(null)
const loading = ref(true)
const tab = ref('info')
const checkinLoading = ref(false)

const hasCheckedIn = computed(() => {
  if (!meeting.value?.checkins || !userStore.user) return false
  return meeting.value.checkins.some(c => c.user_id === userStore.user?.id)
})

const attendanceRate = computed(() => {
  if (!meeting.value?.attendees?.length) return 0
  return Math.round(((meeting.value.checkins?.length || 0) / meeting.value.attendees.length) * 100)
})

const loadDetail = async () => {
  loading.value = true
  try {
    const id = parseInt(route.params.id as string)
    const res = await getBranchMeetingDetail(id)
    meeting.value = res.data
  } catch (error) {
    console.error('加载会议详情失败', error)
  } finally {
    loading.value = false
  }
}

const handleCheckin = async (type: string) => {
  if (!meeting.value || hasCheckedIn.value) return
  checkinLoading.value = true
  try {
    await checkinMeeting(meeting.value.id, type)
    alert('签到成功')
    await loadDetail()
  } catch (error: any) {
    alert(error.message || '签到失败')
  } finally {
    checkinLoading.value = false
  }
}

const goBack = () => {
  router.push({ name: 'branch-meetings' })
}

const getTypeName = (type: string) => {
  const map: Record<string, string> = { branch_committee: '支委会', member_congress: '党员大会', group_meeting: '党小组会', party_lesson: '党课' }
  return map[type] || type
}

const getStatusName = (status: string) => {
  const map: Record<string, string> = { notified: '通知中', ongoing: '进行中', completed: '已结束', cancelled: '已取消' }
  return map[status] || status
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = { notified: 'badge-info', ongoing: 'badge-success', completed: 'badge-warning', cancelled: 'badge-danger' }
  return map[status] || ''
}

const getAgendaStatusName = (status: string) => {
  const map: Record<string, string> = { pending: '待讨论', discussed: '已讨论', passed: '已通过', rejected: '未通过' }
  return map[status] || status
}

const getAgendaStatusClass = (status: string) => {
  const map: Record<string, string> = { pending: 'badge-info', discussed: 'badge-warning', passed: 'badge-success', rejected: 'badge-danger' }
  return map[status] || ''
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadDetail()
})
</script>

<style scoped>
.meeting-detail-page { padding-top: 10px; }
.detail-header { margin-bottom: 16px; }
.detail-main { padding: 24px; }
.detail-top { margin-bottom: 24px; }
.detail-badges { display: flex; gap: 8px; margin-bottom: 10px; }
.detail-title { font-size: 24px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.detail-meta { display: flex; flex-wrap: wrap; gap: 20px; font-size: 14px; color: var(--text-secondary); }
.detail-tabs { display: flex; gap: 0; border-bottom: 2px solid var(--border-color); margin-bottom: 24px; }
.tab-btn { padding: 10px 20px; background: none; border: none; cursor: pointer; font-size: 14px; color: var(--text-secondary); border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab-btn.active { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 500; }
.tab-content { min-height: 200px; }
.info-section { margin-bottom: 20px; }
.section-title { font-size: 16px; font-weight: 600; margin-bottom: 10px; color: var(--text-primary); padding-bottom: 8px; border-bottom: 1px solid var(--border-color); }
.section-text { font-size: 14px; color: var(--text-secondary); line-height: 1.8; white-space: pre-wrap; }
.checkin-section { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color); }
.agenda-card { padding: 12px 0; border-bottom: 1px solid var(--border-color); }
.agenda-header { display: flex; align-items: center; gap: 8px; }
.agenda-order { font-weight: 600; color: var(--primary-color); }
.agenda-title { font-weight: 500; flex: 1; }
.agenda-content { font-size: 13px; color: var(--text-secondary); margin-top: 6px; }
.agenda-result { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.stats-row { display: flex; gap: 24px; margin-bottom: 20px; }
.stat-item { display: flex; flex-direction: column; align-items: center; padding: 12px 20px; background: var(--bg-light); border-radius: var(--radius-md); }
.stat-value { font-size: 24px; font-weight: 600; color: var(--primary-color); }
.stat-label { font-size: 12px; color: var(--text-light); margin-top: 4px; }
.attendee-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
.attendee-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); }
.attendee-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; }
.attendee-info { flex: 1; display: flex; flex-direction: column; }
.attendee-name { font-size: 14px; font-weight: 500; }
.attendee-branch { font-size: 12px; color: var(--text-light); }
.checkin-mark { font-size: 12px; color: var(--success-color); font-weight: 500; }
.resolution-card { padding: 16px 0; border-bottom: 1px solid var(--border-color); }
.resolution-header { display: flex; align-items: center; gap: 10px; }
.resolution-title { font-size: 16px; font-weight: 500; flex: 1; }
.resolution-content { font-size: 14px; color: var(--text-secondary); margin-top: 8px; line-height: 1.6; }
.resolution-votes { display: flex; gap: 16px; margin-top: 8px; }
.vote-item { font-size: 13px; font-weight: 500; }
.vote-for { color: var(--success-color); }
.vote-against { color: var(--danger-color); }
.vote-abstain { color: var(--text-light); }
.resolution-meta { font-size: 12px; color: var(--text-light); margin-top: 6px; }
.resolution-time { font-size: 12px; color: var(--text-light); margin-top: 4px; }
@media (max-width: 768px) {
  .detail-title { font-size: 20px; }
  .detail-meta { flex-direction: column; gap: 6px; }
  .attendee-grid { grid-template-columns: 1fr; }
}
</style>
