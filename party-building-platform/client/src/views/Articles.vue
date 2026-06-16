<template>
  <div class="articles-page container">
    <div class="page-header">
      <h1 class="page-title">📚 学习专栏</h1>
      <div class="search-bar">
        <input
          v-model="keyword"
          type="text"
          class="form-input"
          placeholder="搜索文章..."
          @keyup.enter="handleSearch"
        >
        <button class="btn btn-primary" @click="handleSearch">搜索</button>
      </div>
    </div>

    <div class="category-tabs">
      <span
        class="tab"
        :class="{ active: !currentCategory }"
        @click="selectCategory('')"
      >全部</span>
      <span
        v-for="cat in categories"
        :key="cat"
        class="tab"
        :class="{ active: currentCategory === cat }"
        @click="selectCategory(cat)"
      >{{ cat }}</span>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="articles.length === 0" class="empty-state">
      <div class="empty-state-icon">📭</div>
      <p>暂无文章</p>
    </div>

    <div v-else class="article-list">
      <div
        v-for="article in articles"
        :key="article.id"
        class="article-item"
        @click="goDetail(article.id)"
      >
        <div
          class="article-cover"
          :style="{ backgroundImage: `url(${article.cover_image})` }"
        >
          <div class="article-category">{{ article.category }}</div>
        </div>
        <div class="article-content">
          <h3 class="article-title">{{ article.title }}</h3>
          <p class="article-excerpt">{{ article.excerpt }}</p>
          <div class="article-footer">
            <div class="article-meta">
              <span>✍️ {{ article.author }}</span>
              <span>👁️ {{ article.views }} 阅读</span>
              <span>📅 {{ formatDate(article.created_at) }}</span>
            </div>
            <span class="read-more">阅读全文 →</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="total > 0" class="pagination">
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
import { getArticles, getArticleCategories } from '@/api/articles'
import type { Article } from '@/types'

const router = useRouter()

const articles = ref<Article[]>([])
const categories = ref<string[]>([])
const currentCategory = ref('')
const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const loadArticles = async () => {
  loading.value = true
  try {
    const res = await getArticles({
      page: page.value,
      page_size: pageSize.value,
      category: currentCategory.value || undefined,
      keyword: keyword.value || undefined
    })
    articles.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载文章失败', error)
  } finally {
    loading.value = false
  }
}

const loadCategories = async () => {
  try {
    const res = await getArticleCategories()
    categories.value = res.data
  } catch (error) {
    console.error('加载分类失败', error)
  }
}

const selectCategory = (cat: string) => {
  currentCategory.value = cat
  page.value = 1
  loadArticles()
}

const handleSearch = () => {
  page.value = 1
  loadArticles()
}

const changePage = (p: number) => {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadArticles()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const goDetail = (id: number) => {
  router.push(`/articles/${id}`)
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

onMounted(() => {
  loadCategories()
  loadArticles()
})
</script>

<style scoped>
.articles-page {
  padding-bottom: 40px;
}

.search-bar {
  display: flex;
  gap: 10px;
  min-width: 300px;
}

.search-bar .form-input {
  flex: 1;
}

.category-tabs {
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

.article-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.article-item {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.article-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.article-cover {
  width: 240px;
  height: 180px;
  background-size: cover;
  background-position: center;
  position: relative;
  flex-shrink: 0;
}

.article-category {
  position: absolute;
  top: 12px;
  left: 12px;
  background: var(--primary-color);
  color: white;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.article-content {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.article-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
  line-height: 1.4;
}

.article-excerpt {
  flex: 1;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.article-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-light);
}

.read-more {
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .search-bar {
    width: 100%;
    min-width: auto;
  }

  .article-item {
    flex-direction: column;
  }

  .article-cover {
    width: 100%;
    height: 180px;
  }
}
</style>
