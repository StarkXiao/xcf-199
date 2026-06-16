<template>
  <div class="article-detail-page container">
    <div class="back-btn" @click="goBack">← 返回列表</div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="article" class="article-detail">
      <header class="article-header">
        <h1 class="article-title">{{ article.title }}</h1>
        <div class="article-meta">
          <span class="category-tag">{{ article.category }}</span>
          <span>✍️ {{ article.author }}</span>
          <span>📅 {{ formatDate(article.created_at) }}</span>
          <span>👁️ {{ article.views }} 阅读</span>
        </div>
      </header>

      <div v-if="article.cover_image" class="article-cover">
        <img :src="article.cover_image" alt="cover">
      </div>

      <article class="article-content">
        <p v-for="(para, index) in paragraphs" :key="index" class="paragraph">
          {{ para }}
        </p>
      </article>

      <div class="article-footer">
        <div class="points-tip" v-if="pointsEarned > 0">
          🎉 恭喜获得 {{ pointsEarned }} 积分！
        </div>
        <button class="btn btn-primary" @click="recordRead">
          {{ hasRecorded ? '已记录学习' : '记录学习进度' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArticleDetail, recordArticleRead } from '@/api/articles'
import type { Article } from '@/types'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const article = ref<Article | null>(null)
const loading = ref(false)
const pointsEarned = ref(0)
const hasRecorded = ref(false)

const paragraphs = computed(() => {
  if (!article.value) return []
  return article.value.content.split('\n').filter(p => p.trim())
})

const loadArticle = async () => {
  const id = Number(route.params.id)
  if (!id) return

  loading.value = true
  try {
    const res = await getArticleDetail(id)
    article.value = res.data
  } catch (error) {
    console.error('加载文章失败', error)
  } finally {
    loading.value = false
  }
}

const recordRead = async () => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }

  if (hasRecorded.value) return

  const id = Number(route.params.id)
  try {
    const res = await recordArticleRead(id, 60)
    pointsEarned.value = res.data.points_earned
    hasRecorded.value = true
    if (res.data.points_earned > 0) {
      userStore.fetchProfile()
    }
  } catch (error) {
    console.error('记录学习失败', error)
  }
}

const goBack = () => {
  router.push('/articles')
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

onMounted(() => {
  loadArticle()
})
</script>

<style scoped>
.article-detail-page {
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

.article-detail {
  background: white;
  border-radius: var(--radius-lg);
  padding: 40px;
  box-shadow: var(--shadow-sm);
}

.article-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.article-title {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 16px;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 14px;
  color: var(--text-secondary);
}

.category-tag {
  background: #ffe0e3;
  color: var(--primary-color);
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.article-cover {
  margin-bottom: 30px;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.article-cover img {
  width: 100%;
  height: auto;
  display: block;
}

.article-content {
  font-size: 16px;
  line-height: 2;
  color: var(--text-primary);
}

.paragraph {
  margin-bottom: 20px;
  text-indent: 2em;
  text-align: justify;
}

.article-footer {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.points-tip {
  padding: 8px 16px;
  background-color: #fff3cd;
  color: #856404;
  border-radius: var(--radius-sm);
  font-size: 14px;
}

@media (max-width: 768px) {
  .article-detail {
    padding: 20px;
  }

  .article-title {
    font-size: 22px;
  }

  .article-content {
    font-size: 15px;
    line-height: 1.8;
  }
}
</style>
