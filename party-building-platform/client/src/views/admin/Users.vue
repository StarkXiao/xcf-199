<template>
  <div class="admin-users">
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
    </div>

    <div class="search-bar">
      <input
        v-model="keyword"
        type="text"
        class="form-input"
        placeholder="搜索用户名或姓名..."
        @keyup.enter="loadUsers"
      >
      <button class="btn btn-secondary" @click="loadUsers">搜索</button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else class="table-container card">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 50px;">ID</th>
            <th>用户</th>
            <th style="width: 120px;">手机号</th>
            <th style="width: 140px;">支部</th>
            <th style="width: 80px;">积分</th>
            <th style="width: 140px;">注册时间</th>
            <th style="width: 150px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>
              <div class="user-info">
                <img :src="user.avatar" class="user-avatar" alt="avatar">
                <div class="user-detail">
                  <div class="user-name">{{ user.real_name }}</div>
                  <div class="user-username">{{ user.username }}</div>
                </div>
              </div>
            </td>
            <td>{{ user.phone || '-' }}</td>
            <td>{{ user.branch || '-' }}</td>
            <td>
              <span class="points-badge">{{ user.points }}</span>
            </td>
            <td>{{ formatDate(user.created_at) }}</td>
            <td>
              <button class="btn btn-sm btn-secondary" @click="handleAdjustPoints(user)">调整积分</button>
              <button v-if="user.role !== 'admin'" class="btn btn-sm btn-danger" @click="handleDelete(user)" style="margin-left: 6px;">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="users.length === 0" class="empty-state">
        <p>暂无用户</p>
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

    <div v-if="showPointsModal" class="modal-overlay" @click.self="showPointsModal = false">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title">调整积分</h3>
          <button class="close-btn" @click="showPointsModal = false">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">当前用户：<strong>{{ selectedUser?.real_name }}</strong></p>
          <p class="modal-desc">当前积分：<strong>{{ selectedUser?.points }}</strong></p>
          <div class="form-group">
            <label class="form-label">调整积分（正数增加，负数减少）</label>
            <input v-model.number="pointsAdjust" type="number" class="form-input" placeholder="请输入积分数值">
          </div>
          <div class="form-group">
            <label class="form-label">调整原因</label>
            <input v-model="pointsReason" type="text" class="form-input" placeholder="请输入原因">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showPointsModal = false">取消</button>
          <button class="btn btn-primary" @click="submitPointsAdjust" :disabled="submitting">
            {{ submitting ? '提交中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAdminUsers, adjustUserPoints, deleteUser } from '@/api/points'
import type { User } from '@/types'

const users = ref<User[]>([])
const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const submitting = ref(false)
const showPointsModal = ref(false)
const selectedUser = ref<User | null>(null)
const pointsAdjust = ref(0)
const pointsReason = ref('')

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const loadUsers = async () => {
  loading.value = true
  try {
    const res = await getAdminUsers({
      page: page.value,
      page_size: pageSize.value,
      keyword: keyword.value || undefined
    })
    users.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载用户失败', error)
  } finally {
    loading.value = false
  }
}

const changePage = (p: number) => {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadUsers()
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const handleAdjustPoints = (user: User) => {
  selectedUser.value = user
  pointsAdjust.value = 0
  pointsReason.value = ''
  showPointsModal.value = true
}

const submitPointsAdjust = async () => {
  if (!selectedUser.value || pointsAdjust.value === 0) {
    alert('请输入有效的积分数值')
    return
  }

  submitting.value = true
  try {
    await adjustUserPoints(selectedUser.value.id, pointsAdjust.value, pointsReason.value || '管理员调整')
    alert('积分调整成功')
    showPointsModal.value = false
    loadUsers()
  } catch (error: any) {
    alert(error.message || '调整失败')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (user: User) => {
  if (!confirm(`确定要删除用户"${user.real_name}"吗？此操作不可恢复。`)) return

  try {
    await deleteUser(user.id)
    alert('删除成功')
    loadUsers()
  } catch (error: any) {
    alert(error.message || '删除失败')
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.admin-users {
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

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.user-detail {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
}

.user-username {
  font-size: 12px;
  color: var(--text-light);
}

.points-badge {
  display: inline-block;
  padding: 2px 10px;
  background: #ffe0e3;
  color: var(--primary-color);
  border-radius: 12px;
  font-weight: 600;
  font-size: 13px;
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

.modal-desc {
  margin-bottom: 10px;
  font-size: 14px;
  color: var(--text-secondary);
}

@media (max-width: 992px) {
  .data-table th:nth-child(3),
  .data-table td:nth-child(3),
  .data-table th:nth-child(6),
  .data-table td:nth-child(6) {
    display: none;
  }
}
</style>
