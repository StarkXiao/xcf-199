<template>
  <div class="admin-certificates-page">
    <div class="page-header">
      <h1 class="page-title">🏆 证书荣誉管理</h1>
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
          <div class="stat-icon active">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats?.active_certs || 0 }}</div>
            <div class="stat-label">有效证书</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="stat-icon issuance">📤</div>
          <div class="stat-info">
            <div class="stat-value">{{ stats?.total_issuances || 0 }}</div>
            <div class="stat-label">发放次数</div>
          </div>
        </div>
      </div>

      <div class="tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'list' }"
          @click="activeTab = 'list'"
        >
          📋 证书管理
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'ranking' }"
          @click="activeTab = 'ranking'; loadRanking()"
        >
          🏆 获得排行
        </button>
      </div>

      <div v-if="activeTab === 'list'">
        <div class="toolbar card">
          <div class="toolbar-left">
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
            <div class="filter-group">
              <label>状态：</label>
              <select v-model="filterStatus" @change="loadCertificates(1)">
                <option value="">全部</option>
                <option value="active">有效</option>
                <option value="inactive">无效</option>
                <option value="expired">过期</option>
              </select>
            </div>
            <div class="filter-group">
              <input
                v-model="keyword"
                type="text"
                placeholder="搜索证书名称..."
                @keyup.enter="loadCertificates(1)"
              />
            </div>
          </div>
          <button class="btn btn-primary" @click="showCertificateModal()">
            + 新增证书
          </button>
        </div>

        <div v-if="certificatesLoading" class="loading" style="padding: 40px;">
          <div class="spinner"></div>
        </div>

        <div v-else-if="certificates.length === 0" class="empty-state card">
          <p>暂无证书数据</p>
        </div>

        <div v-else class="certificates-table-container card">
          <table class="data-table">
            <thead>
              <tr>
                <th>证书名称</th>
                <th>类型</th>
                <th>分类</th>
                <th>发证机构</th>
                <th>积分奖励</th>
                <th>发放数量</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cert in certificates" :key="cert.id">
                <td>
                  <div class="cert-name">
                    <div class="cert-avatar">
                      <img :src="cert.cover_image || 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=100'" :alt="cert.title">
                    </div>
                    <span>{{ cert.title }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge" :class="cert.type">
                    {{ cert.type === 'certificate' ? '证书' : '荣誉' }}
                  </span>
                </td>
                <td>{{ cert.category }}</td>
                <td>{{ cert.issuer }}</td>
                <td class="text-success">+{{ cert.points_reward }}</td>
                <td>{{ cert.issuance_count || 0 }}</td>
                <td>
                  <span class="status-badge" :class="cert.status">
                    {{ getStatusText(cert.status) }}
                  </span>
                </td>
                <td>{{ formatDate(cert.created_at) }}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn-link" @click="showIssuanceModal(cert)">
                      发放
                    </button>
                    <button class="btn-link" @click="viewIssuances(cert)">
                      记录
                    </button>
                    <button class="btn-link" @click="showCertificateModal(cert)">
                      编辑
                    </button>
                    <button class="btn-link text-danger" @click="deleteCertificate(cert)">
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="certificates.length > 0" class="pagination">
          <button
            class="btn btn-secondary"
            :disabled="currentPage <= 1"
            @click="loadCertificates(currentPage - 1)"
          >
            上一页
          </button>
          <span class="page-info">第 {{ currentPage }} 页 / 共 {{ totalPages }} 页 ({{ total }} 条)</span>
          <button
            class="btn btn-secondary"
            :disabled="currentPage >= totalPages"
            @click="loadCertificates(currentPage + 1)"
          >
            下一页
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'ranking'">
        <div v-if="rankingLoading" class="loading" style="padding: 40px;">
          <div class="spinner"></div>
        </div>

        <div v-else class="ranking-list card">
          <div class="ranking-header">
            <h3>🏆 证书荣誉获得排行榜</h3>
          </div>
          <div
            v-for="(item, index) in ranking"
            :key="item.id"
            class="ranking-item"
          >
            <div class="ranking-rank">
              <span v-if="index === 0" class="rank-gold">🥇</span>
              <span v-else-if="index === 1" class="rank-silver">🥈</span>
              <span v-else-if="index === 2" class="rank-bronze">🥉</span>
              <span v-else class="rank-number">{{ index + 1 }}</span>
            </div>
            <div class="ranking-avatar">
              <img :src="item.avatar" :alt="item.real_name">
            </div>
            <div class="ranking-info">
              <div class="ranking-name">{{ item.real_name }}</div>
              <div class="ranking-branch">{{ item.branch }}</div>
            </div>
            <div class="ranking-stats">
              <div class="stat-item">
                <span class="stat-label">证书</span>
                <span class="stat-value">{{ item.cert_count }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">积分</span>
                <span class="stat-value text-success">{{ item.total_points }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCertModal" class="modal-overlay" @click.self="showCertModal = false">
      <div class="modal card modal-large">
        <div class="modal-header">
          <h3>{{ editingCertificate ? '编辑证书' : '新增证书' }}</h3>
          <button class="btn-close" @click="showCertModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>证书名称 *</label>
              <input v-model="certForm.title" type="text" placeholder="请输入证书名称" />
            </div>
            <div class="form-group">
              <label>类型 *</label>
              <select v-model="certForm.type">
                <option value="certificate">学习证书</option>
                <option value="honor">活动荣誉</option>
              </select>
            </div>
            <div class="form-group">
              <label>分类 *</label>
              <input v-model="certForm.category" type="text" placeholder="如：理论学习、志愿服务等" />
            </div>
            <div class="form-group">
              <label>发证机构 *</label>
              <input v-model="certForm.issuer" type="text" placeholder="请输入发证机构" />
            </div>
            <div class="form-group">
              <label>积分奖励</label>
              <input v-model.number="certForm.points_reward" type="number" min="0" />
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model="certForm.status">
                <option value="active">有效</option>
                <option value="inactive">无效</option>
                <option value="expired">过期</option>
              </select>
            </div>
            <div class="form-group">
              <label>发证日期</label>
              <input v-model="certForm.issue_date" type="date" />
            </div>
            <div class="form-group">
              <label>有效期至</label>
              <input v-model="certForm.valid_to" type="date" />
            </div>
            <div class="form-group full-width">
              <label>证书描述</label>
              <textarea v-model="certForm.description" rows="3" placeholder="请输入证书描述"></textarea>
            </div>
            <div class="form-group full-width">
              <label>封面图片</label>
              <div class="upload-field">
                <div class="upload-preview" v-if="certForm.cover_image">
                  <img :src="certForm.cover_image.startsWith('/') ? 'http://localhost:3000' + certForm.cover_image : certForm.cover_image" alt="封面预览">
                </div>
                <div class="upload-controls">
                  <input v-model="certForm.cover_image" type="text" placeholder="输入图片URL或选择文件上传" />
                  <label class="btn btn-secondary upload-btn" :class="{ disabled: uploadingCover }">
                    <span v-if="uploadingCover">上传中...</span>
                    <span v-else>📁 选择文件</span>
                    <input type="file" accept="image/*" :disabled="uploadingCover" @change="handleCoverImageUpload" style="display:none;" />
                  </label>
                </div>
              </div>
            </div>
            <div class="form-group full-width">
              <label>证书图片</label>
              <div class="upload-field">
                <div class="upload-preview" v-if="certForm.certificate_image">
                  <img :src="certForm.certificate_image.startsWith('/') ? 'http://localhost:3000' + certForm.certificate_image : certForm.certificate_image" alt="证书预览">
                </div>
                <div class="upload-controls">
                  <input v-model="certForm.certificate_image" type="text" placeholder="输入图片URL或选择文件上传" />
                  <label class="btn btn-secondary upload-btn" :class="{ disabled: uploadingCertImage }">
                    <span v-if="uploadingCertImage">上传中...</span>
                    <span v-else>📁 选择文件</span>
                    <input type="file" accept="image/*" :disabled="uploadingCertImage" @change="handleCertImageUpload" style="display:none;" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCertModal = false">取消</button>
          <button class="btn btn-primary" @click="saveCertificate">
            {{ editingCertificate ? '保存修改' : '创建证书' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showIssueModal" class="modal-overlay" @click.self="showIssueModal = false">
      <div class="modal card">
        <div class="modal-header">
          <h3>发放证书 - {{ issuingCertificate?.title }}</h3>
          <button class="btn-close" @click="showIssueModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>选择用户 *</label>
            <select v-model="issueForm.user_id">
              <option :value="0">请选择用户</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.real_name }} ({{ user.branch }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>证书编号</label>
            <input v-model="issueForm.certificate_number" type="text" placeholder="请输入证书编号（可选）" />
          </div>
          <div class="form-group">
            <label>发放日期</label>
            <input v-model="issueForm.issue_date" type="date" />
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="issueForm.remarks" rows="3" placeholder="请输入备注信息"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showIssueModal = false">取消</button>
          <button class="btn btn-primary" @click="issueCertificate">确认发放</button>
        </div>
      </div>
    </div>

    <div v-if="showIssuancesModal" class="modal-overlay" @click.self="showIssuancesModal = false">
      <div class="modal card modal-large">
        <div class="modal-header">
          <h3>发放记录 - {{ viewingCertificate?.title }}</h3>
          <button class="btn-close" @click="showIssuancesModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="issuancesLoading" class="loading" style="padding: 40px;">
            <div class="spinner"></div>
          </div>

          <div v-else-if="issuances.length === 0" class="empty-state">
            <p>暂无发放记录</p>
          </div>

          <div v-else class="issuances-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>证书编号</th>
                  <th>发放日期</th>
                  <th>发放人</th>
                  <th>备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="issuance in issuances" :key="issuance.id">
                  <td>
                    <div class="user-info">
                      <img class="user-avatar" :src="issuance.avatar" :alt="issuance.real_name">
                      <div>
                        <div class="user-name">{{ issuance.real_name }}</div>
                        <div class="user-branch">{{ issuance.branch }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ issuance.certificate_number || '-' }}</td>
                  <td>{{ formatDate(issuance.issue_date) }}</td>
                  <td>{{ issuance.issuer_name || '-' }}</td>
                  <td>{{ issuance.remarks || '-' }}</td>
                  <td>
                    <button class="btn-link text-danger" @click="revokeIssuance(issuance)">
                      撤销
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showIssuancesModal = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getAdminCertificates,
  getCertificateCategories,
  getCertificateStats,
  getCertificateRanking,
  createCertificate,
  updateCertificate,
  deleteCertificate as delCertificate,
  getCertificateIssuances,
  issueCertificate as issueCert,
  revokeCertificateIssuance,
  uploadCertificateImage
} from '@/api/certificates'
import { getUsers } from '@/api/users'
import type {
  Certificate,
  CertificateAdminStats,
  CertificateRanking,
  CertificateIssuance,
  User
} from '@/types'

const loading = ref(false)
const certificatesLoading = ref(false)
const rankingLoading = ref(false)
const issuancesLoading = ref(false)

const activeTab = ref('list')
const stats = ref<CertificateAdminStats | null>(null)
const certificates = ref<Certificate[]>([])
const ranking = ref<CertificateRanking[]>([])
const categories = ref<string[]>([])
const users = ref<User[]>([])
const issuances = ref<CertificateIssuance[]>([])

const filterType = ref('')
const filterCategory = ref('')
const filterStatus = ref('')
const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const totalPages = ref(1)

const showCertModal = ref(false)
const showIssueModal = ref(false)
const showIssuancesModal = ref(false)

const editingCertificate = ref<Certificate | null>(null)
const issuingCertificate = ref<Certificate | null>(null)
const viewingCertificate = ref<Certificate | null>(null)

const certForm = ref({
  title: '',
  type: 'certificate' as const,
  category: '',
  description: '',
  cover_image: '',
  certificate_image: '',
  issuer: '',
  issue_date: '',
  valid_from: '',
  valid_to: '',
  points_reward: 0,
  status: 'active' as const
})

const issueForm = ref({
  user_id: 0,
  certificate_number: '',
  issue_date: '',
  remarks: ''
})

const uploadingCover = ref(false)
const uploadingCertImage = ref(false)

const handleCoverImageUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingCover.value = true
  try {
    const res = await uploadCertificateImage(file)
    certForm.value.cover_image = res.data.url
    alert('封面图片上传成功')
  } catch (error: any) {
    console.error('上传失败', error)
    alert(error.response?.data?.message || '封面图片上传失败')
  } finally {
    uploadingCover.value = false
    if (input) input.value = ''
  }
}

const handleCertImageUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingCertImage.value = true
  try {
    const res = await uploadCertificateImage(file)
    certForm.value.certificate_image = res.data.url
    alert('证书图片上传成功')
  } catch (error: any) {
    console.error('上传失败', error)
    alert(error.response?.data?.message || '证书图片上传失败')
  } finally {
    uploadingCertImage.value = false
    if (input) input.value = ''
  }
}

const loadStats = async () => {
  try {
    const res = await getCertificateStats()
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
    if (filterStatus.value) params.status = filterStatus.value
    if (keyword.value) params.keyword = keyword.value

    const res = await getAdminCertificates(params)
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

const loadRanking = async () => {
  rankingLoading.value = true
  try {
    const res = await getCertificateRanking({ limit: 20 })
    ranking.value = res.data
  } catch (error) {
    console.error('加载排行榜失败', error)
  } finally {
    rankingLoading.value = false
  }
}

const loadUsers = async () => {
  try {
    const res = await getUsers({ page_size: 1000 })
    users.value = res.data.list
  } catch (error) {
    console.error('加载用户列表失败', error)
  }
}

const loadIssuances = async (certId: number) => {
  issuancesLoading.value = true
  try {
    const res = await getCertificateIssuances(certId, { page_size: 100 })
    issuances.value = res.data.list
  } catch (error) {
    console.error('加载发放记录失败', error)
  } finally {
    issuancesLoading.value = false
  }
}

const showCertificateModal = (certificate?: Certificate) => {
  if (certificate) {
    editingCertificate.value = certificate
    certForm.value = {
      title: certificate.title,
      type: certificate.type === 'certificate' ? 'certificate' : 'honor',
      category: certificate.category,
      description: certificate.description,
      cover_image: certificate.cover_image,
      certificate_image: certificate.certificate_image,
      issuer: certificate.issuer,
      issue_date: certificate.issue_date,
      valid_from: certificate.valid_from || '',
      valid_to: certificate.valid_to || '',
      points_reward: certificate.points_reward,
      status: certificate.status === 'active' ? 'active' : certificate.status === 'inactive' ? 'inactive' : 'expired'
    }
  } else {
    editingCertificate.value = null
    certForm.value = {
      title: '',
      type: 'certificate',
      category: '',
      description: '',
      cover_image: '',
      certificate_image: '',
      issuer: '',
      issue_date: '',
      valid_from: '',
      valid_to: '',
      points_reward: 0,
      status: 'active'
    }
  }
  showCertModal.value = true
}

const saveCertificate = async () => {
  if (!certForm.value.title.trim()) {
    alert('请输入证书名称')
    return
  }
  if (!certForm.value.category.trim()) {
    alert('请输入分类')
    return
  }
  if (!certForm.value.issuer.trim()) {
    alert('请输入发证机构')
    return
  }

  try {
    if (editingCertificate.value) {
      await updateCertificate(editingCertificate.value.id, certForm.value)
      alert('更新成功')
    } else {
      await createCertificate(certForm.value)
      alert('创建成功')
    }
    showCertModal.value = false
    loadCertificates(currentPage.value)
    loadStats()
    loadCategories()
  } catch (error: any) {
    console.error('保存失败', error)
    alert(error.response?.data?.message || '保存失败')
  }
}

const deleteCertificate = async (cert: Certificate) => {
  if (!confirm(`确定要删除证书"${cert.title}"吗？此操作不可恢复。`)) return

  try {
    await delCertificate(cert.id)
    alert('删除成功')
    loadCertificates(currentPage.value)
    loadStats()
  } catch (error: any) {
    console.error('删除失败', error)
    alert(error.response?.data?.message || '删除失败')
  }
}

const showIssuanceModal = (cert: Certificate) => {
  issuingCertificate.value = cert
  issueForm.value = {
    user_id: 0,
    certificate_number: '',
    issue_date: new Date().toISOString().split('T')[0],
    remarks: ''
  }
  loadUsers()
  showIssueModal.value = true
}

const issueCertificate = async () => {
  if (!issueForm.value.user_id) {
    alert('请选择用户')
    return
  }
  if (!issuingCertificate.value) return

  try {
    await issueCert(issuingCertificate.value.id, issueForm.value)
    alert('发放成功')
    showIssueModal.value = false
    loadCertificates(currentPage.value)
    loadStats()
  } catch (error: any) {
    console.error('发放失败', error)
    alert(error.response?.data?.message || '发放失败')
  }
}

const viewIssuances = async (cert: Certificate) => {
  viewingCertificate.value = cert
  showIssuancesModal.value = true
  loadIssuances(cert.id)
}

const revokeIssuance = async (issuance: CertificateIssuance) => {
  if (!confirm(`确定要撤销此证书的发放吗？`)) return

  try {
    await revokeCertificateIssuance(issuance.id)
    alert('撤销成功')
    if (viewingCertificate.value) {
      loadIssuances(viewingCertificate.value.id)
    }
    loadCertificates(currentPage.value)
    loadStats()
  } catch (error: any) {
    console.error('撤销失败', error)
    alert(error.response?.data?.message || '撤销失败')
  }
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    active: '有效',
    inactive: '无效',
    expired: '过期'
  }
  return texts[status] || status
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
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
.admin-certificates-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.certificate {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.honor {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.active {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-icon.issuance {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  background: var(--bg-light);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.tab-btn.active {
  background: var(--primary-color);
  color: white;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-group label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.filter-group select,
.filter-group input {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: white;
  font-size: 13px;
}

.certificates-table-container {
  padding: 16px;
  margin-bottom: 16px;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.data-table th {
  background: var(--bg-light);
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
}

.data-table tr:hover {
  background: var(--bg-light);
}

.cert-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cert-avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.cert-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.badge {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.badge.certificate {
  background: #e3f2fd;
  color: #1976d2;
}

.badge.honor {
  background: #fce4ec;
  color: #c2185b;
}

.status-badge {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: #e8f5e9;
  color: #388e3c;
}

.status-badge.inactive {
  background: #f5f5f5;
  color: #616161;
}

.status-badge.expired {
  background: #ffebee;
  color: #d32f2f;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.btn-link {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: 13px;
  padding: 4px 6px;
  border-radius: 4px;
}

.btn-link:hover {
  background: var(--bg-light);
}

.btn-link.text-danger {
  color: var(--danger-color);
}

.text-success {
  color: var(--success-color);
  font-weight: 600;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.page-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.empty-state {
  padding: 60px;
  text-align: center;
  color: var(--text-secondary);
}

.ranking-list {
  padding: 20px;
}

.ranking-header {
  margin-bottom: 16px;
}

.ranking-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: var(--radius-md);
  transition: background 0.2s;
}

.ranking-item:hover {
  background: var(--bg-light);
}

.ranking-item + .ranking-item {
  border-top: 1px solid var(--border-color);
}

.ranking-rank {
  width: 40px;
  text-align: center;
  font-size: 20px;
  flex-shrink: 0;
}

.rank-number {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
}

.ranking-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.ranking-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ranking-info {
  flex: 1;
  min-width: 0;
}

.ranking-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.ranking-branch {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.ranking-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  text-align: center;
}

.stat-item .stat-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.stat-item .stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
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

.modal-large {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
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

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-group.full-width {
  grid-column: span 2;
}

.form-group {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: white;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
}

.user-branch {
  font-size: 12px;
  color: var(--text-secondary);
}

.issuances-table-container {
  max-height: 400px;
  overflow-y: auto;
}

.upload-field {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-preview {
  width: 100%;
  max-width: 200px;
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px;
  background: var(--bg-light);
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

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    width: 100%;
  }

  .filter-group select,
  .filter-group input {
    flex: 1;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-group.full-width {
    grid-column: span 1;
  }

  .ranking-item {
    flex-wrap: wrap;
  }

  .ranking-stats {
    width: 100%;
    justify-content: space-around;
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
  }
}
</style>
