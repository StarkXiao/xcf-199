<template>
  <div class="admin-articles">
    <div class="page-header">
      <h2 class="page-title">文章管理</h2>
      <button class="btn btn-primary" @click="showCreateModal = true">+ 新建文章</button>
    </div>

    <div class="search-bar">
      <input
        v-model="keyword"
        type="text"
        class="form-input"
        placeholder="搜索文章..."
        @keyup.enter="loadArticles"
      >
      <button class="btn btn-secondary" @click="loadArticles">搜索</button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else class="table-container card">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 60px;">ID</th>
            <th>标题</th>
            <th style="width: 100px;">分类</th>
            <th style="width: 80px;">阅读量</th>
            <th style="width: 80px;">状态</th>
            <th style="width: 150px;">创建时间</th>
            <th style="width: 120px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="article in articles" :key="article.id">
            <td>{{ article.id }}</td>
            <td class="title-cell">{{ article.title }}</td>
            <td>{{ article.category }}</td>
            <td>{{ article.views }}</td>
            <td>
              <span class="badge" :class="article.status === 'published' ? 'badge-success' : 'badge-warning'">
                {{ article.status === 'published' ? '已发布' : '草稿' }}
              </span>
            </td>
            <td>{{ formatDate(article.created_at) }}</td>
            <td>
              <button class="btn btn-sm btn-secondary" @click="handleEdit(article)">编辑</button>
              <button class="btn btn-sm btn-danger" @click="handleDelete(article)" style="margin-left: 6px;">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="articles.length === 0" class="empty-state">
        <p>暂无文章</p>
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

    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingArticle ? '编辑文章' : '新建文章' }}</h3>
          <button class="close-btn" @click="showCreateModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">标题 *</label>
            <input v-model="form.title" type="text" class="form-input" placeholder="请输入标题">
          </div>
          <div class="form-group">
            <label class="form-label">分类</label>
            <input v-model="form.category" type="text" class="form-input" placeholder="请输入分类">
          </div>
          <div class="form-group">
            <label class="form-label">作者</label>
            <input v-model="form.author" type="text" class="form-input" placeholder="请输入作者">
          </div>
          <div class="form-group">
            <label class="form-label">封面图片URL</label>
            <input v-model="form.cover_image" type="text" class="form-input" placeholder="请输入封面图片地址">
          </div>
          <div class="form-group">
            <label class="form-label">状态</label>
            <select v-model="form.status" class="form-select">
              <option value="published">已发布</option>
              <option value="draft">草稿</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">内容 *</label>
            <textarea v-model="form.content" class="form-textarea" rows="8" placeholder="请输入文章内容"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCreateModal = false">取消</button>
          <button class="btn btn-primary" @click="handleSubmit" :disabled="submitting">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { getAdminArticles, createArticle, updateArticle, deleteArticle } from '@/api/articles'
import type { Article } from '@/types'

const articles = ref<Article[]>([])
const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const submitting = ref(false)
const showCreateModal = ref(false)
const editingArticle = ref<Article | null>(null)

const form = reactive({
  title: '',
  content: '',
  category: '',
  cover_image: '',
  author: '',
  status: 'published'
})

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const loadArticles = async () => {
  loading.value = true
  try {
    const res = await getAdminArticles({
      page: page.value,
      page_size: pageSize.value,
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

const changePage = (p: number) => {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadArticles()
  }
}

const handleEdit = (article: Article) => {
  editingArticle.value = article
  form.title = article.title
  form.content = article.content
  form.category = article.category || ''
  form.cover_image = article.cover_image || ''
  form.author = article.author || ''
  form.status = article.status
  showCreateModal.value = true
}

const handleDelete = async (article: Article) => {
  if (!confirm(`确定要删除文章"${article.title}"吗？`)) return

  try {
    await deleteArticle(article.id)
    alert('删除成功')
    loadArticles()
  } catch (error: any) {
    alert(error.message || '删除失败')
  }
}

const handleSubmit = async () => {
  if (!form.title.trim() || !form.content.trim()) {
    alert('标题和内容不能为空')
    return
  }

  submitting.value = true
  try {
    if (editingArticle.value) {
      await updateArticle(editingArticle.value.id, form)
      alert('更新成功')
    } else {
      await createArticle(form)
      alert('创建成功')
    }
    showCreateModal.value = false
    loadArticles()
    resetForm()
  } catch (error: any) {
    alert(error.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  form.title = ''
  form.content = ''
  form.category = ''
  form.cover_image = ''
  form.author = ''
  form.status = 'published'
  editingArticle.value = null
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadArticles()
})
</script>

<style scoped>
.admin-articles {
  padding-bottom: 20px;
}

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  max-width: 400px;
}

.search-bar .form-input {
  flex: 1;
}

.table-container {
  padding: 0;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: var(--bg-light);
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
}

.data-table tbody tr:hover {
  background: var(--bg-light);
}

.title-cell {
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-light);
}

.close-btn:hover {
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .data-table th:nth-child(4),
  .data-table td:nth-child(4),
  .data-table th:nth-child(6),
  .data-table td:nth-child(6) {
    display: none;
  }
}
</style>
