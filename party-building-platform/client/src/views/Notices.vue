<template>
  <div class="notices-page container">
    <div class="page-header">
      <h1 class="page-title">📢 支部通知</h1>
    </div>

    <div class="type-tabs">
      <span
        class="tab"
        :class="{ active: !currentType }"
        @click="selectType('')"
      >全部</span>
      <span
        v-for="type in types"
        :key="type"
        class="tab"
        :class="{ active: currentType === type }"
        @click="selectType(type)"
      >{{ type }}</span>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="notices.length === 0" class="empty-state">
      <div class="empty-state-icon">📭</div>
      <p>暂无通知</p>
    </div>

    <div v-else class="notice-list card">
      <div
        v-for="notice in notices"
        :key="notice.id"
        class="notice-item"
        @click="goDetail(notice.id)"
      >
        <div class="notice-left">
          <div class="notice-tag" :class="getPriorityClass(notice.priority)">
            {{ notice.type }}
          </div>
          <div class="notice-info">
            <h3 class="notice-title">
              <span v-if="notice.priority >= 3" class="hot-tag">重要</span>
              {{ notice.title }}
            </h3>
            <p class="notice-excerpt">{{ notice.excerpt }}</p>
          </div>
        </div>
        <div class="notice-date">{{ formatDate(notice.created_at) }}</div>
      </div>
    </div>

    <div v-if="total > pageSize" class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <button
        v-for="p in totalPages"
        :key="p"
        :class="{ active: p === page }"
        @click="changePage(p)"
      >{{ p }}</button>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getNotices, getNoticeTypes } from '@/api/notices'
import type { Notice } from '@/types'

const router = useRouter()

const notices = ref<Notice[]>([])
const types = ref<string[]>([])
const currentType = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const loadNotices = async () => {
  loading.value = true
  try {
    const res = await getNotices({
      page: page.value,
      page_size: pageSize.value,
      type: currentType.value || undefined
    })
    notices.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载通知失败', error)
  } finally {
    loading.value = false
  }
}

const loadTypes = async () => {
  try {
    const res = await getNoticeTypes()
    types.value = res.data
  } catch (error) {
    console.error('加载通知类型失败', error)
  }
}

const selectType = (type: string) => {
  currentType.value = type
  page.value = 1
  loadNotices()
}

const changePage = (p: number) => {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadNotices()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const goDetail = (id: number) => {
  router.push(`/notices/${id}`)
}

const getPriorityClass = (priority: number) => {
  if (priority >= 3) return 'high'
  if (priority >= 2) return 'medium'
  return ''
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

onMounted(() => {
  loadTypes()
  loadNotices()
})
</script>

<style scoped>
.notices-page {
  padding-bottom: 40px;
}

.type-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.tab {
  padding: 6px 16px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tab:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.tab.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.notice-list {
  padding: 0;
  overflow: hidden;
}

.notice-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background-color 0.2s;
}

.notice-item:last-child {
  border-bottom: none;
}

.notice-item:hover {
  background-color: var(--bg-light);
}

.notice-left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.notice-tag {
  padding: 3px 10px;
  background: var(--bg-light);
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 12px;
  flex-shrink: 0;
}

.notice-tag.high {
  background: #f8d7da;
  color: #721c24;
}

.notice-tag.medium {
  background: #fff3cd;
  color: #856404;
}

.notice-info {
  flex: 1;
  min-width: 0;
}

.notice-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.hot-tag {
  display: inline-block;
  padding: 1px 6px;
  background: var(--primary-color);
  color: white;
  font-size: 11px;
  border-radius: 3px;
  flex-shrink: 0;
}

.notice-excerpt {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notice-date {
  font-size: 13px;
  color: var(--text-light);
  flex-shrink: 0;
  margin-left: 20px;
}

@media (max-width: 768px) {
  .notice-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .notice-date {
    margin-left: 0;
  }
}
</style>
