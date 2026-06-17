<template>
  <div class="admin-dues-rules">
    <div class="page-header">
      <h2 class="page-title">党费规则配置</h2>
      <button class="btn btn-primary" @click="showAddModal = true">
        + 添加规则
      </button>
    </div>

    <div class="card">
      <div class="rules-intro">
        <p>📌 党费缴纳比例说明（按税后月收入）：</p>
        <ul>
          <li>3000元及以下：0.5%</li>
          <li>3000元以上至5000元：1%</li>
          <li>5000元以上至10000元：1.5%</li>
          <li>10000元以上：2%</li>
          <li>离退休党员：按实际领取的离退休费总额或养老金总额，5000元及以下按0.5%，5000元以上按1%</li>
        </ul>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else class="table-container card">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 60px;">ID</th>
            <th>收入范围（元）</th>
            <th>缴纳比例</th>
            <th>党员类型</th>
            <th style="width: 100px;">是否启用</th>
            <th style="width: 140px;">更新时间</th>
            <th style="width: 150px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rule in rules" :key="rule.id">
            <td>{{ rule.id }}</td>
            <td>{{ rule.income_min || 0 }} - {{ rule.income_max || '不限' }}</td>
            <td><span class="rate-badge">{{ ((rule.rate || rule.dues_rate) * 100).toFixed(1) }}%</span></td>
            <td>
              <span class="type-badge" :class="rule.member_type || rule.calculation_method">
                {{ (rule.member_type || rule.calculation_method) === 'retired' ? '离退休党员' : '正式党员' }}
              </span>
            </td>
            <td>
              <span class="status-tag" :class="{ active: rule.is_active || rule.status === 'active' }">
                {{ rule.is_active || rule.status === 'active' ? '✓ 启用' : '✗ 禁用' }}
              </span>
            </td>
            <td>{{ formatDate(rule.updated_at) }}</td>
            <td>
              <button class="btn btn-sm btn-secondary" @click="handleEdit(rule)">编辑</button>
              <button 
                class="btn btn-sm" 
                :class="(rule.is_active || rule.status === 'active') ? 'btn-warning' : 'btn-success'" 
                @click="handleToggle(rule)"
                style="margin-left: 6px;"
              >
                {{ rule.is_active || rule.status === 'active' ? '禁用' : '启用' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="rules.length === 0" class="empty-state">
        <p>暂无规则配置</p>
      </div>
    </div>

    <div class="card">
      <h3 class="section-title">用户特殊配置</h3>
      <p class="section-desc">为特殊情况的党员设置固定缴费金额或自定义缴费基数</p>
      
      <div class="user-config-header">
        <div class="search-bar">
          <input
            v-model="userKeyword"
            type="text"
            class="form-input"
            placeholder="搜索党员姓名..."
            style="width: 200px;"
          >
          <button class="btn btn-secondary" @click="loadUserConfigs">搜索</button>
        </div>
        <button class="btn btn-primary" @click="showAddUserModal = true">
          + 添加特殊配置
        </button>
      </div>

      <div v-if="userConfigsLoading" class="loading" style="padding: 30px;">
        <div class="spinner"></div>
      </div>

      <div v-else>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 80px;">用户ID</th>
              <th>党员姓名</th>
              <th>所属支部</th>
              <th>月收入（元）</th>
              <th>固定金额（元）</th>
              <th style="width: 100px;">是否启用</th>
              <th style="width: 140px;">更新时间</th>
              <th style="width: 150px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="config in userConfigs" :key="config.id">
              <td>{{ config.user_id }}</td>
              <td>{{ config.real_name || config.user?.real_name || '-' }}</td>
              <td>{{ config.branch || config.user?.branch || '-' }}</td>
              <td>{{ config.monthly_income ? config.monthly_income.toFixed(2) : '-' }}</td>
              <td>{{ (config.fixed_amount || config.custom_dues_amount) ? (config.fixed_amount || config.custom_dues_amount)!.toFixed(2) : '-' }}</td>
              <td>
                <span class="status-tag" :class="{ active: config.is_active || config.is_exempt === 0 }">
                  {{ config.is_active || config.is_exempt === 0 ? '✓ 启用' : '✗ 禁用' }}
                </span>
              </td>
              <td>{{ formatDate(config.updated_at) }}</td>
              <td>
                <button class="btn btn-sm btn-secondary" @click="handleEditUser(config)">编辑</button>
                <button class="btn btn-sm btn-danger" @click="handleDeleteUser(config)" style="margin-left: 6px;">删除</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="userConfigs.length === 0" class="empty-state">
          <p>暂无特殊配置</p>
        </div>
      </div>
    </div>

    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="modal-title">{{ showEditModal ? '编辑规则' : '添加规则' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">最低收入（元）*</label>
              <input v-model.number="ruleForm.income_min" type="number" class="form-input" placeholder="0">
            </div>
            <div class="form-group">
              <label class="form-label">最高收入（元）</label>
              <input v-model.number="ruleForm.income_max" type="number" class="form-input" placeholder="留空表示不限">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">缴纳比例（%）*</label>
              <input v-model.number="ruleForm.rate" type="number" step="0.1" class="form-input" placeholder="0.5">
              <small class="form-hint">例如：0.5 表示 0.5%</small>
            </div>
            <div class="form-group">
              <label class="form-label">党员类型*</label>
              <select v-model="ruleForm.member_type" class="form-input">
                <option value="regular">正式党员</option>
                <option value="retired">离退休党员</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">备注说明</label>
            <textarea v-model="ruleForm.description" class="form-input" rows="2" placeholder="选填"></textarea>
          </div>
          <div class="form-group">
            <label class="form-checkbox">
              <input type="checkbox" v-model="ruleForm.is_active">
              <span>启用此规则</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="submitRule" :disabled="submitting">
            {{ submitting ? '提交中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showAddUserModal || showEditUserModal" class="modal-overlay" @click.self="closeUserModal">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="modal-title">{{ showEditUserModal ? '编辑特殊配置' : '添加特殊配置' }}</h3>
          <button class="close-btn" @click="closeUserModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">选择党员*</label>
            <select v-model="userConfigForm.user_id" class="form-input" :disabled="showEditUserModal">
              <option :value="null">请选择党员</option>
              <option v-for="user in userOptions" :key="user.id" :value="user.id">
                {{ user.real_name }} ({{ user.username }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">月收入（元）</label>
            <input v-model.number="userConfigForm.monthly_income" type="number" class="form-input" placeholder="用于计算缴费基数">
            <small class="form-hint">设置此项将按照规则自动计算缴费金额</small>
          </div>
          <div class="form-group">
            <label class="form-label">固定缴费金额（元）</label>
            <input v-model.number="userConfigForm.fixed_amount" type="number" class="form-input" placeholder="每月固定缴纳金额">
            <small class="form-hint">设置此项将忽略收入计算，直接使用固定金额</small>
          </div>
          <div class="form-group">
            <label class="form-checkbox">
              <input type="checkbox" v-model="userConfigForm.is_active">
              <span>启用此配置</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeUserModal">取消</button>
          <button class="btn btn-primary" @click="submitUserConfig" :disabled="submitting">
            {{ submitting ? '提交中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  getDuesRules, 
  createDuesRule, 
  updateDuesRule, 
  toggleDuesRule,
  getDuesUserConfigs,
  createDuesUserConfig,
  updateDuesUserConfig,
  deleteDuesUserConfig,
  getUsers
} from '@/api/partyDues'
import type { PartyDuesRule, PartyDuesUserConfig, User, PaginatedResponse } from '@/types'

const loading = ref(false)
const submitting = ref(false)
const rules = ref<PartyDuesRule[]>([])
const userConfigs = ref<PartyDuesUserConfig[]>([])
const userConfigsLoading = ref(false)
const userOptions = ref<User[]>([])
const userKeyword = ref('')

const showAddModal = ref(false)
const showEditModal = ref(false)
const editingRule = ref<PartyDuesRule | null>(null)

const showAddUserModal = ref(false)
const showEditUserModal = ref(false)
const editingUserConfig = ref<PartyDuesUserConfig | null>(null)

const ruleForm = ref({
  income_min: 0,
  income_max: null as number | null,
  rate: 0,
  member_type: 'regular',
  description: '',
  is_active: true
})

const userConfigForm = ref({
  user_id: null as number | null,
  monthly_income: null as number | null,
  fixed_amount: null as number | null,
  is_active: true
})

const loadRules = async () => {
  loading.value = true
  try {
    const res = await getDuesRules()
    rules.value = res.data
  } catch (error) {
    console.error('加载规则失败', error)
  } finally {
    loading.value = false
  }
}

const loadUserConfigs = async () => {
  userConfigsLoading.value = true
  try {
    const params: any = {}
    if (userKeyword.value) params.keyword = userKeyword.value
    const res = await getDuesUserConfigs(params)
    const data = res.data as any
    userConfigs.value = data.list || data
  } catch (error) {
    console.error('加载用户配置失败', error)
  } finally {
    userConfigsLoading.value = false
  }
}

const loadUserOptions = async () => {
  try {
    const res = await getUsers()
    userOptions.value = res.data
  } catch (error) {
    console.error('加载用户列表失败', error)
  }
}

const handleEdit = (rule: PartyDuesRule) => {
  editingRule.value = rule
  ruleForm.value = {
    income_min: rule.income_min,
    income_max: rule.income_max,
    rate: (rule.rate || rule.dues_rate) * 100,
    member_type: rule.member_type || rule.calculation_method || 'regular',
    description: rule.description || '',
    is_active: rule.is_active ? true : rule.status === 'active'
  }
  showEditModal.value = true
}

const handleToggle = async (rule: PartyDuesRule) => {
  const isActive = rule.is_active ? true : rule.status === 'active'
  try {
    await toggleDuesRule(rule.id)
    alert(isActive ? '已禁用' : '已启用')
    loadRules()
  } catch (error: any) {
    alert(error.response?.data?.message || '操作失败')
  }
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  editingRule.value = null
  ruleForm.value = {
    income_min: 0,
    income_max: null,
    rate: 0,
    member_type: 'regular',
    description: '',
    is_active: true
  }
}

const submitRule = async () => {
  if (!ruleForm.value.rate || ruleForm.value.rate <= 0) {
    alert('请输入有效的缴纳比例')
    return
  }
  
  submitting.value = true
  try {
    const data = {
      ...ruleForm.value,
      dues_rate: ruleForm.value.rate / 100,
      rate: ruleForm.value.rate / 100,
      is_active: ruleForm.value.is_active ? 1 : 0
    } as any
    
    if (showEditModal.value && editingRule.value) {
      await updateDuesRule(editingRule.value.id, data)
      alert('更新成功')
    } else {
      await createDuesRule(data)
      alert('添加成功')
    }
    closeModal()
    loadRules()
  } catch (error: any) {
    alert(error.response?.data?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const handleEditUser = (config: PartyDuesUserConfig) => {
  editingUserConfig.value = config
  userConfigForm.value = {
    user_id: config.user_id,
    monthly_income: config.monthly_income,
    fixed_amount: config.fixed_amount || config.custom_dues_amount,
    is_active: config.is_active ? true : config.is_exempt === 0
  }
  showEditUserModal.value = true
}

const handleDeleteUser = async (config: PartyDuesUserConfig) => {
  if (!confirm('确定要删除此配置吗？')) return
  try {
    await deleteDuesUserConfig(config.id)
    alert('删除成功')
    loadUserConfigs()
  } catch (error: any) {
    alert(error.response?.data?.message || '删除失败')
  }
}

const closeUserModal = () => {
  showAddUserModal.value = false
  showEditUserModal.value = false
  editingUserConfig.value = null
  userConfigForm.value = {
    user_id: null,
    monthly_income: null,
    fixed_amount: null,
    is_active: true
  }
}

const submitUserConfig = async () => {
  if (!userConfigForm.value.user_id) {
    alert('请选择党员')
    return
  }
  
  submitting.value = true
  try {
    const data = {
      ...userConfigForm.value,
      user_id: userConfigForm.value.user_id || undefined,
      custom_dues_amount: userConfigForm.value.fixed_amount,
      monthly_income: userConfigForm.value.monthly_income || undefined,
      fixed_amount: userConfigForm.value.fixed_amount || undefined,
      is_active: userConfigForm.value.is_active ? 1 : 0
    } as any
    
    if (showEditUserModal.value && editingUserConfig.value) {
      await updateDuesUserConfig(editingUserConfig.value.id, data)
      alert('更新成功')
    } else {
      await createDuesUserConfig(data)
      alert('添加成功')
    }
    closeUserModal()
    loadUserConfigs()
  } catch (error: any) {
    alert(error.response?.data?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

onMounted(() => {
  loadRules()
  loadUserConfigs()
  loadUserOptions()
})
</script>

<style scoped>
.admin-dues-rules {
  max-width: 1200px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.rules-intro {
  background: var(--primary-light);
  padding: 16px;
  border-radius: var(--radius-md);
}

.rules-intro p {
  margin: 0 0 8px 0;
  font-weight: 500;
}

.rules-intro ul {
  margin: 0;
  padding-left: 20px;
}

.rules-intro li {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.section-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.user-config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.search-bar {
  display: flex;
  gap: 8px;
}

.rate-badge {
  display: inline-block;
  padding: 4px 10px;
  background: var(--primary-color);
  color: white;
  border-radius: 4px;
  font-weight: 600;
  font-size: 13px;
}

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.type-badge.regular {
  background: rgba(34, 197, 94, 0.1);
  color: var(--success-color);
}

.type-badge.retired {
  background: rgba(156, 163, 175, 0.2);
  color: var(--text-secondary);
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
}

.status-tag.active {
  background: rgba(34, 197, 94, 0.1);
  color: var(--success-color);
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.form-checkbox input {
  width: 16px;
  height: 16px;
}

.points-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--primary-light);
  color: var(--primary-color);
  border-radius: 10px;
  font-weight: 600;
  font-size: 12px;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
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
}

.modal-content {
  background: white;
  border-radius: var(--radius-lg);
  width: 90%;
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

.modal-title {
  margin: 0;
  font-size: 18px;
}

.close-btn {
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
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
}

.btn {
  padding: 6px 16px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-secondary {
  background: var(--bg-light);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--border-color);
}

.btn-danger {
  background: var(--danger-color);
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-warning {
  background: var(--warning-color);
  color: white;
}

.btn-warning:hover {
  background: #d97706;
}

.btn-success {
  background: var(--success-color);
  color: white;
}

.btn-success:hover {
  background: #16a34a;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 12px 16px;
  background: var(--bg-light);
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border-color);
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
}

.data-table tr:hover {
  background: var(--bg-light);
}

.card {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 20px;
  margin-bottom: 20px;
}

.table-container {
  overflow-x: auto;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.user-detail .user-name {
  font-weight: 500;
}

.user-detail .user-username {
  font-size: 12px;
  color: var(--text-secondary);
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
}

.pagination button {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
}

.pagination button.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
