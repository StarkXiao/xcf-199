<template>
  <div class="my-certificates-page container">
    <div class="page-header">
      <h1 class="page-title">🏆 证书荣誉</h1>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else class="certificates-content">
      <div class="stats-row">
        <div class="stat-card card">
          <div class="stat-icon certificate">📜</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats?.total_certificates || 0 }}</div>
            <div class="stat-label">学习证书</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon honor">🏅</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats?.total_honors || 0 }}</div>
            <div class="stat-label">活动荣誉</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon points">⭐</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats?.total_points || 0 }}</div>
            <div class="stat-label">获得积分</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon achievement">🎯</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats?.total_achievements || 0 }}</div>
            <div class="stat-label">个人成果</div>
          </div>
        </div>
      </div>

      <div class="tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'certificates' }"
          @click="activeTab = 'certificates'"
        >
          📜 我的证书
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'achievements' }"
          @click="activeTab = 'achievements'; loadAchievements()"
        >
          🎯 个人成果
        </button>
      </div>

      <div v-if="activeTab === 'certificates'">
        <div class="filter-bar card">
          <div class="filter-group">
            <label>类型：</label>
            <select v-model="filterType" @change="loadCertificates(1)">
              <option value="">全部</option>
              <option value="certificate">学习证书</option>
              <option value="honor">活动荣誉</option>
            </select>
          </div>
          <div class="filter-group">
            <label>分类：</label>
            <select v-model="filterCategory" @change="loadCertificates(1)">
              <option value="">全部</option>
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
        </div>

        <div v-if="certificatesLoading" class="loading" style="padding: 40px;">
          <div class="spinner"></div>
        </div>

        <div v-else-if="certificates.length === 0" class="empty-state card">
          <p>暂无证书记录</p>
        </div>

        <div v-else class="certificates-grid">
          <div
            v-for="cert in certificates"
            :key="cert.id"
            class="certificate-card card"
          >
            <div class="cert-image">
              <img :src="cert.cover_image || 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400'" :alt="cert.title">
              <div class="cert-type-badge" :class="cert.type">
                {{ cert.type === 'certificate' ? '证书' : '荣誉' }}
              </div>
            </div>
            <div class="cert-info">
              <h3 class="cert-title">{{ cert.title }}</h3>
              <div class="cert-meta">
                <span class="cert-category">{{ cert.category }}</span>
                <span class="cert-issuer">{{ cert.issuer }}</span>
              </div>
              <p class="cert-description">{{ cert.description }}</p>
              <div class="cert-footer">
                <span class="cert-date">
                  📅 {{ formatDate(cert.issue_date) }}
                </span>
                <span class="cert-points">
                  ⭐ +{{ cert.points_reward }}
                </span>
              </div>
              <div v-if="cert.certificate_number" class="cert-number">
                证书编号：{{ cert.certificate_number }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="certificates.length > 0" class="pagination">
          <button
            class="btn btn-secondary"
            :disabled="currentPage <= 1"
            @click="loadCertificates(currentPage - 1)"
          >
            上一页
          </button>
          <span class="page-info">第 {{ currentPage }} 页 / 共 {{ totalPages }} 页</span>
          <button
            class="btn btn-secondary"
            :disabled="currentPage >= totalPages"
            @click="loadCertificates(currentPage + 1)"
          >
            下一页
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'achievements'">
        <div class="achievements-header">
          <button class="btn btn-primary" @click="showAchievementModal()">
            + 添加成果
          </button>
        </div>

        <div v-if="achievementsLoading" class="loading" style="padding: 40px;">
          <div class="spinner"></div>
        </div>

        <div v-else-if="achievements.length === 0" class="empty-state card">
          <p>暂无个人成果，点击上方按钮添加您的第一个成果吧！</p>
        </div>

        <div v-else class="achievements-list">
          <div
            v-for="achievement in achievements"
            :key="achievement.id"
            class="achievement-item card"
          >
            <div class="achievement-icon" :class="achievement.type">
              {{ getAchievementIcon(achievement.type) }}
            </div>
            <div class="achievement-content">
              <div class="achievement-header">
                <h4 class="achievement-title">{{ achievement.title }}</h4>
                <div class="achievement-actions">
                  <button class="btn-icon" @click="showAchievementModal(achievement)" title="编辑">
                    ✏️
                  </button>
                  <button class="btn-icon" @click="deleteAchievement(achievement.id)" title="删除">
                    🗑️
                  </button>
                </div>
              </div>
              <p class="achievement-description">{{ achievement.description }}</p>
              <div class="achievement-meta">
                <span v-if="achievement.achievement_date" class="achievement-date">
                  📅 {{ formatDate(achievement.achievement_date) }}
                </span>
                <span class="achievement-type">
                  {{ getAchievementTypeText(achievement.type) }}
                </span>
                <span class="achievement-public" :class="{ public: achievement.is_public }">
                  {{ achievement.is_public ? '🌐 公开' : '🔒 私密' }}
                </span>
              </div>
              <div v-if="achievement.attachment_url" class="achievement-attachment">
                <a :href="achievement.attachment_url" target="_blank">
                  📎 查看附件
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal card">
        <div class="modal-header">
          <h3>{{ editingAchievement ? '编辑成果' : '添加成果' }}</h3>
          <button class="btn-close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>成果标题 *</label>
            <input
              v-model="achievementForm.title"
              type="text"
              placeholder="请输入成果标题"
            />
          </div>
          <div class="form-group">
            <label>成果类型 *</label>
            <select v-model="achievementForm.type">
              <option value="learning">学习成果</option>
              <option value="honor">荣誉奖项</option>
              <option value="volunteer">志愿服务</option>
              <option value="work">工作成果</option>
              <option value="other">其他成果</option>
            </select>
          </div>
          <div class="form-group">
            <label>成果描述</label>
            <textarea
              v-model="achievementForm.description"
              rows="3"
              placeholder="请输入成果描述"
            ></textarea>
          </div>
          <div class="form-group">
            <label>获得日期</label>
            <input
              v-model="achievementForm.achievement_date"
              type="date"
            />
          </div>
          <div class="form-group">
            <label>封面图片</label>
            <div class="upload-field">
              <div class="upload-preview small" v-if="achievementForm.cover_image">
                <img :src="achievementForm.cover_image.startsWith('/') ? 'http://localhost:3000' + achievementForm.cover_image : achievementForm.cover_image" alt="封面预览">
              </div>
              <div class="upload-controls">
                <input v-model="achievementForm.cover_image" type="text" placeholder="输入图片URL或选择文件上传" />
                <label class="btn btn-secondary upload-btn" :class="{ disabled: uploadingCover }">
                  <span v-if="uploadingCover">上传中...</span>
                  <span v-else>📁 选择图片</span>
                  <input type="file" accept="image/*" :disabled="uploadingCover" @change="handleAchievementCoverUpload" style="display:none;" />
                </label>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>附件链接</label>
            <div class="upload-field">
              <div class="upload-controls">
                <input v-model="achievementForm.attachment_url" type="text" placeholder="输入附件URL或选择文件上传" />
                <label class="btn btn-secondary upload-btn" :class="{ disabled: uploadingAttachment }">
                  <span v-if="uploadingAttachment">上传中...</span>
                  <span v-else>📎 上传附件</span>
                  <input type="file" :disabled="uploadingAttachment" @change="handleAttachmentUpload" style="display:none;" />
                </label>
              </div>
              <div v-if="achievementForm.attachment_url" class="attachment-link">
                <a :href="achievementForm.attachment_url.startsWith('/') ? 'http://localhost:3000' + achievementForm.attachment_url : achievementForm.attachment_url" target="_blank">
                  🔗 查看已上传附件
                </a>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="achievementForm.is_public"
                type="checkbox"
                :true-value="1"
                :false-value="0"
              />
              公开此成果
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModal = false">取消</button>
          <button class="btn btn-primary" @click="saveAchievement">
            {{ editingAchievement ? '保存修改' : '添加成果' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getMyCertificates,
  getMyCertificateStats,
  getCertificateCategories,
  getAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement as delAchievement,
  uploadCertificateImage,
  uploadAchievementAttachment
} from '@/api/certificates'
import type { CertificateIssuance, UserAchievement, CertificateStats } from '@/types'

const loading = ref(false)
const certificatesLoading = ref(false)
const achievementsLoading = ref(false)
const activeTab = ref('certificates')
const stats = ref<CertificateStats | null>(null)
const certificates = ref<CertificateIssuance[]>([])
const achievements = ref<UserAchievement[]>([])
const categories = ref<string[]>([])

const filterType = ref('')
const filterCategory = ref('')
const currentPage = ref(1)
const pageSize = ref(8)
const total = ref(0)
const totalPages = ref(1)

const showModal = ref(false)
const editingAchievement = ref<UserAchievement | null>(null)
const achievementForm = ref({
  title: '',
  type: 'learning',
  description: '',
  achievement_date: '',
  cover_image: '',
  attachment_url: '',
  is_public: 1
})

const uploadingCover = ref(false)
const uploadingAttachment = ref(false)

const handleAchievementCoverUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingCover.value = true
  try {
    const res = await uploadCertificateImage(file)
    achievementForm.value.cover_image = res.data.url
    alert('封面图片上传成功')
  } catch (error: any) {
    console.error('上传失败', error)
    alert(error.response?.data?.message || '封面图片上传失败')
  } finally {
    uploadingCover.value = false
    if (input) input.value = ''
  }
}

const handleAttachmentUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingAttachment.value = true
  try {
    const res = await uploadAchievementAttachment(file)
    achievementForm.value.attachment_url = res.data.url
    alert('附件上传成功')
  } catch (error: any) {
    console.error('上传失败', error)
    alert(error.response?.data?.message || '附件上传失败')
  } finally {
    uploadingAttachment.value = false
    if (input) input.value = ''
  }
}

const loadStats = async () => {
  try {
    const res = await getMyCertificateStats()
    stats.value = res.data
  } catch (error) {
    console.error('加载统计数据失败', error)
  }
}

const loadCategories = async () => {
  try {
    const res = await getCertificateCategories()
    categories.value = res.data
  } catch (error) {
    console.error('加载分类失败', error)
  }
}

const loadCertificates = async (page: number = 1) => {
  certificatesLoading.value = true
  try {
    const params: any = { page, page_size: pageSize.value }
    if (filterType.value) params.type = filterType.value
    if (filterCategory.value) params.category = filterCategory.value

    const res = await getMyCertificates(params)
    certificates.value = res.data.list
    total.value = res.data.total
    currentPage.value = page
    totalPages.value = Math.ceil(total.value / pageSize.value)
  } catch (error) {
    console.error('加载证书失败', error)
  } finally {
    certificatesLoading.value = false
  }
}

const loadAchievements = async () => {
  achievementsLoading.value = true
  try {
    const res = await getAchievements()
    achievements.value = res.data.list
  } catch (error) {
    console.error('加载成果失败', error)
  } finally {
    achievementsLoading.value = false
  }
}

const showAchievementModal = (achievement?: UserAchievement) => {
  if (achievement) {
    editingAchievement.value = achievement
    achievementForm.value = {
      title: achievement.title,
      type: achievement.type,
      description: achievement.description,
      achievement_date: achievement.achievement_date || '',
      cover_image: achievement.cover_image,
      attachment_url: achievement.attachment_url,
      is_public: achievement.is_public
    }
  } else {
    editingAchievement.value = null
    achievementForm.value = {
      title: '',
      type: 'learning',
      description: '',
      achievement_date: '',
      cover_image: '',
      attachment_url: '',
      is_public: 1
    }
  }
  showModal.value = true
}

const saveAchievement = async () => {
  if (!achievementForm.value.title.trim()) {
    alert('请输入成果标题')
    return
  }

  try {
    if (editingAchievement.value) {
      await updateAchievement(editingAchievement.value.id, achievementForm.value)
      alert('更新成功')
    } else {
      await createAchievement(achievementForm.value)
      alert('添加成功')
    }
    showModal.value = false
    loadAchievements()
    loadStats()
  } catch (error: any) {
    console.error('保存失败', error)
    alert(error.response?.data?.message || '保存失败')
  }
}

const deleteAchievement = async (id: number) => {
  if (!confirm('确定要删除这个成果吗？')) return

  try {
    await delAchievement(id)
    alert('删除成功')
    loadAchievements()
    loadStats()
  } catch (error: any) {
    console.error('删除失败', error)
    alert(error.response?.data?.message || '删除失败')
  }
}

const getAchievementIcon = (type: string) => {
  const icons: Record<string, string> = {
    learning: '📚',
    honor: '🏆',
    volunteer: '🤝',
    work: '💼',
    other: '🎯'
  }
  return icons[type] || '🎯'
}

const getAchievementTypeText = (type: string) => {
  const types: Record<string, string> = {
    learning: '学习成果',
    honor: '荣誉奖项',
    volunteer: '志愿服务',
    work: '工作成果',
    other: '其他成果'
  }
  return types[type] || '其他'
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '未设置'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

onMounted(() => {
  loading.value = true
  Promise.all([loadStats(), loadCategories(), loadCertificates()])
    .catch(err => console.error(err))
    .finally(() => {
      loading.value = false
    })
})
</script>

<style scoped>
.my-certificates-page {
  max-width: 1200px;
  padding-bottom: 40px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-icon.certificate {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.honor {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.points {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.achievement {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tab-btn {
  padding: 12px 24px;
  border: none;
  background: var(--bg-light);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: var(--border-color);
}

.tab-btn.active {
  background: var(--primary-color);
  color: white;
}

.filter-bar {
  display: flex;
  gap: 20px;
  padding: 16px 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: white;
  font-size: 14px;
  min-width: 120px;
}

.certificates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.certificate-card {
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.certificate-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.cert-image {
  position: relative;
  height: 160px;
  overflow: hidden;
}

.cert-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cert-type-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: white;
}

.cert-type-badge.certificate {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.cert-type-badge.honor {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.cert-info {
  padding: 16px;
}

.cert-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
  line-height: 1.4;
}

.cert-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.cert-category {
  padding: 2px 8px;
  background: var(--bg-light);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.cert-issuer {
  font-size: 12px;
  color: var(--text-secondary);
}

.cert-description {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cert-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.cert-date {
  font-size: 13px;
  color: var(--text-secondary);
}

.cert-points {
  font-size: 14px;
  font-weight: 600;
  color: var(--success-color);
}

.cert-number {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-light);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
}

.page-info {
  font-size: 14px;
  color: var(--text-secondary);
}

.empty-state {
  padding: 60px;
  text-align: center;
  color: var(--text-secondary);
}

.achievements-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.achievement-item {
  display: flex;
  gap: 16px;
  padding: 20px;
  transition: transform 0.2s;
}

.achievement-item:hover {
  transform: translateX(4px);
}

.achievement-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.achievement-icon.learning {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.achievement-icon.honor {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.achievement-icon.volunteer {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.achievement-icon.work {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.achievement-icon.other {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.achievement-content {
  flex: 1;
  min-width: 0;
}

.achievement-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.achievement-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.achievement-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-light);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: var(--border-color);
}

.achievement-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  line-height: 1.6;
}

.achievement-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-light);
}

.achievement-type {
  padding: 2px 8px;
  background: var(--bg-light);
  border-radius: 8px;
}

.achievement-public {
  padding: 2px 8px;
  background: var(--bg-light);
  border-radius: 8px;
}

.achievement-public.public {
  background: #e3f2fd;
  color: #1976d2;
}

.achievement-attachment {
  margin-top: 12px;
}

.achievement-attachment a {
  color: var(--primary-color);
  text-decoration: none;
  font-size: 13px;
}

.achievement-attachment a:hover {
  text-decoration: underline;
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
  padding: 20px;
}

.modal {
  width: 100%;
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
  font-weight: 600;
}

.btn-close {
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

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: white;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin: 0;
}

.checkbox-label input {
  width: auto;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

.upload-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upload-preview {
  width: 100%;
  max-width: 200px;
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px;
  background: var(--bg-light);
}

.upload-preview.small {
  max-width: 120px;
}

.upload-preview img {
  width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
  display: block;
}

.upload-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.upload-controls input {
  flex: 1;
}

.upload-btn {
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.upload-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.attachment-link {
  font-size: 13px;
}

.attachment-link a {
  color: var(--primary-color);
  text-decoration: none;
}

.attachment-link a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat-card {
    padding: 16px;
    gap: 12px;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }

  .stat-value {
    font-size: 22px;
  }

  .certificates-grid {
    grid-template-columns: 1fr;
  }

  .filter-bar {
    flex-direction: column;
    gap: 12px;
  }

  .filter-group {
    width: 100%;
  }

  .filter-group select {
    flex: 1;
  }

  .achievement-item {
    flex-direction: column;
    gap: 12px;
  }

  .achievement-header {
    flex-direction: column;
    gap: 8px;
  }

  .achievement-actions {
    align-self: flex-end;
  }
}
</style>
