<template>
  <div class="notice-detail-page container">
    <div class="back-btn" @click="goBack">← 返回列表</div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="notice" class="notice-detail card">
      <header class="notice-header">
        <div class="notice-tags">
          <span class="notice-tag" :class="getPriorityClass(notice.priority)">
            {{ notice.type }}
          </span>
          <span v-if="notice.priority >= 3" class="hot-badge">重要</span>
        </div>
        <h1 class="notice-title">{{ notice.title }}</h1>
        <div class="notice-meta">
          <span>📅 {{ formatDate(notice.created_at) }}</span>
        </div>
      </header>

      <div class="notice-content">
        <p v-for="(para, index) in paragraphs" :key="index" class="paragraph">
          {{ para }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getNoticeDetail } from '@/api/notices'
import type { Notice } from '@/types'

const route = useRoute()
const router = useRouter()

const notice = ref<Notice | null>(null)
const loading = ref(false)

const paragraphs = computed(() => {
  if (!notice.value) return []
  return notice.value.content.split('\n').filter(p => p.trim())
})

const loadNotice = async () => {
  const id = Number(route.params.id)
  if (!id) return

  loading.value = true
  try {
    const res = await getNoticeDetail(id)
    notice.value = res.data
  } catch (error) {
    console.error('加载通知失败', error)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/notices')
}

const getPriorityClass = (priority: number) => {
  if (priority >= 3) return 'high'
  if (priority >= 2) return 'medium'
  return ''
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadNotice()
})
</script>

<style scoped>
.notice-detail-page {
  max-width: 800px;
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

.notice-detail {
  padding: 40px;
}

.notice-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.notice-tags {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.notice-tag {
  padding: 4px 12px;
  background: var(--bg-light);
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 13px;
}

.notice-tag.high {
  background: #f8d7da;
  color: #721c24;
}

.notice-tag.medium {
  background: #fff3cd;
  color: #856404;
}

.hot-badge {
  padding: 3px 8px;
  background: var(--primary-color);
  color: white;
  font-size: 12px;
  border-radius: 4px;
  font-weight: 500;
}

.notice-title {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 16px;
}

.notice-meta {
  font-size: 14px;
  color: var(--text-secondary);
}

.notice-content {
  font-size: 15px;
  line-height: 2;
  color: var(--text-primary);
}

.paragraph {
  margin-bottom: 20px;
  text-indent: 2em;
  text-align: justify;
}

@media (max-width: 768px) {
  .notice-detail {
    padding: 20px;
  }

  .notice-title {
    font-size: 20px;
  }
}
</style>
