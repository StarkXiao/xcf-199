<template>
  <div class="branch-meetings-page container">
    <h2 class="page-title">支部会议</h2>

    <div class="filter-bar">
      <div class="filter-row">
        <select v-model="filters.meeting_type" class="form-select" @change="loadMeetings">
          <option value="">全部类型</option>
          <option value="branch_committee">支委会</option>
          <option value="member_congress">党员大会</option>
          <option value="group_meeting">党小组会</option>
          <option value="party_lesson">党课</option>
        </select>
        <select v-model="filters.status" class="form-select" @change="loadMeetings">
          <option value="">全部状态</option>
          <option value="notified">通知中</option>
          <option value="ongoing">进行中</option>
          <option value="completed">已结束</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <div v-else class="meeting-list">
      <div v-for="m in meetings" :key="m.id" class="meeting-card card" @click="goDetail(m.id)">
        <div class="meeting-card-header">
          <span class="tag tag-primary">{{ getTypeName(m.meeting_type) }}</span>
          <span class="badge" :class="getStatusClass(m.status)">{{ getStatusName(m.status) }}</span>
        </div>
        <h3 class="meeting-title">{{ m.title }}</h3>
        <div class="meeting-meta">
          <span class="meta-item">📍 {{ m.branch }}</span>
          <span class="meta-item">🕐 {{ formatDateTime(m.meeting_time) }}</span>
          <span class="meta-item" v-if="m.location">🏢 {{ m.location }}</span>
        </div>
        <div class="meeting-footer">
          <span class="attendee-info">参会 {{ m.attendee_count || 0 }} 人 · 签到 {{ m.checkin_count || 0 }} 人</span>
          <span class="view-detail">查看详情 →</span>
        </div>
      </div>
      <div v-if="meetings.length === 0" class="empty-state">
        <p>暂无会议记录</p>
      </div>
    </div>

    <div v-if="total > pageSize" class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <button v-for="p in totalPages" :key="p" :class="{ active: p === page }" @click="changePage(p)">{{ p }}</button>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getBranchMeetings } from '@/api/branchMeetings'
import type { BranchMeeting } from '@/types'

const router = useRouter()
const meetings = ref<BranchMeeting[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)

const filters = reactive({ meeting_type: '', status: '' })

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const loadMeetings = async () => {
  loading.value = true
  try {
    const params: any = { page: page.value, page_size: pageSize.value }
    if (filters.meeting_type) params.meeting_type = filters.meeting_type
    if (filters.status) params.status = filters.status
    const res = await getBranchMeetings(params)
    meetings.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载会议失败', error)
  } finally {
    loading.value = false
  }
}

const changePage = (p: number) => {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadMeetings()
  }
}

const goDetail = (id: number) => {
  router.push({ name: 'branch-meeting-detail', params: { id } })
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

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadMeetings()
})
</script>

<style scoped>
.branch-meetings-page { padding-top: 10px; }
.filter-bar { margin-bottom: 20px; }
.filter-row { display: flex; gap: 12px; }
.filter-row .form-select { max-width: 160px; }
.meeting-list { display: flex; flex-direction: column; gap: 12px; }
.meeting-card { cursor: pointer; transition: all 0.2s; }
.meeting-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.meeting-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.meeting-title { font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 10px; }
.meeting-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
.meeting-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--border-color); }
.attendee-info { font-size: 13px; color: var(--text-light); }
.view-detail { font-size: 13px; color: var(--primary-color); font-weight: 500; }
</style>
