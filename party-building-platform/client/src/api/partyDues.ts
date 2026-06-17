import request from '@/utils/request'
import type {
  PartyDuesRule,
  PartyDuesBill,
  PartyDuesPayment,
  PartyDuesRemediation,
  PartyDuesUserConfig,
  PartyDuesSummary,
  PartyDuesStatsOverview,
  PartyDuesUserStats,
  PartyDuesBranchStats,
  PartyDuesMonthStats,
  PaginatedResponse,
  ApiResponse,
  User,
  PartyDuesBillsStats
} from '@/types'

export const getDuesRules = (params?: { status?: string }) => {
  return request.get<any, ApiResponse<PartyDuesRule[]>>('/party-dues/rules', { params })
}

export const createDuesRule = (data: Partial<PartyDuesRule>) => {
  return request.post<any, ApiResponse<PartyDuesRule>>('/party-dues/rules', data)
}

export const updateDuesRule = (id: number, data: Partial<PartyDuesRule>) => {
  return request.put<any, ApiResponse<PartyDuesRule>>(`/party-dues/rules/${id}`, data)
}

export const deleteDuesRule = (id: number) => {
  return request.delete<any, ApiResponse<null>>(`/party-dues/rules/${id}`)
}

export const toggleDuesRule = (id: number) => {
  return request.put<any, ApiResponse<PartyDuesRule>>(`/party-dues/rules/${id}/toggle`)
}

export const getMyDuesBills = (params?: {
  page?: number
  page_size?: number
  year?: number
  month?: number
  status?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<PartyDuesBill>>>('/party-dues/my/bills', { params })
}

export const getMyDuesPayments = (params?: {
  page?: number
  page_size?: number
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<PartyDuesPayment>>>('/party-dues/my/payments', { params })
}

export const getMyDuesSummary = () => {
  return request.get<any, ApiResponse<PartyDuesSummary>>('/party-dues/my/summary')
}

export const payDues = (data: {
  bill_ids: number[]
  payment_method: string
  payment_reference?: string
  payment_date?: string
}) => {
  return request.post<any, ApiResponse<{ payment_id: number; total_amount: number }>>('/party-dues/my/pay', data)
}

export const submitRemediation = (data: {
  start_year: number
  start_month: number
  end_year: number
  end_month: number
  reason: string
}) => {
  return request.post<any, ApiResponse<PartyDuesRemediation>>('/party-dues/my/remediation', data)
}

export const getDuesBills = (params?: {
  page?: number
  page_size?: number
  year?: number
  month?: number
  status?: string
  branch?: string
  keyword?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<PartyDuesBill>>>('/party-dues/admin/bills', { params })
}

export const getAdminDuesBills = (params?: {
  page?: number
  page_size?: number
  year?: number
  month?: number
  status?: string
  branch?: string
  keyword?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<PartyDuesBill>>>('/party-dues/admin/bills', { params })
}

export const getDuesBillsStats = (params?: { year?: number }) => {
  return request.get<any, ApiResponse<PartyDuesBillsStats>>('/party-dues/admin/bills/stats', { params })
}

export const generateDuesBills = (data: { year: number; month: number }) => {
  return request.post<any, ApiResponse<{ generated_count: number }>>('/party-dues/admin/bills/generate', data)
}

export const generateMonthlyBills = (data: { year: number; month: number }) => {
  return request.post<any, ApiResponse<{ generated_count: number }>>('/party-dues/admin/bills/generate', data)
}

export const markBillPaid = (billId: number, data: { payment_method: string; payment_reference?: string; payment_date?: string }) => {
  return request.put<any, ApiResponse<null>>(`/party-dues/admin/bills/${billId}/mark-paid`, data)
}

export const getDuesPayments = (params?: {
  page?: number
  page_size?: number
  start_date?: string
  end_date?: string
  branch?: string
  keyword?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<PartyDuesPayment>>>('/party-dues/admin/payments', { params })
}

export const getAdminDuesPayments = (params?: {
  page?: number
  page_size?: number
  start_date?: string
  end_date?: string
  branch?: string
  keyword?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<PartyDuesPayment>>>('/party-dues/admin/payments', { params })
}

export const createDuesPayment = (data: {
  user_id: number
  bill_year: number
  bill_month: number
  payment_amount: number
  payment_method: string
  payment_reference?: string
  payment_date?: string
  remark?: string
}) => {
  return request.post<any, ApiResponse<{ payment_id: number }>>('/party-dues/admin/payments', data)
}

export const getDuesRemediations = (params?: {
  page?: number
  page_size?: number
  status?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<PartyDuesRemediation>>>('/party-dues/admin/remediations', { params })
}

export const getAdminRemediations = (params?: {
  page?: number
  page_size?: number
  status?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<PartyDuesRemediation>>>('/party-dues/admin/remediations', { params })
}

export const getDuesRemediationStats = () => {
  return request.get<any, ApiResponse<{ pending: number; approved: number; rejected: number; paid: number }>>('/party-dues/admin/remediations/stats')
}

export const approveRemediation = (id: number) => {
  return request.put<any, ApiResponse<null>>(`/party-dues/admin/remediations/${id}/approve`)
}

export const rejectRemediation = (id: number, data: { reject_reason: string }) => {
  return request.put<any, ApiResponse<null>>(`/party-dues/admin/remediations/${id}/reject`, data)
}

export const getDuesStatsOverview = () => {
  return request.get<any, ApiResponse<PartyDuesStatsOverview>>('/party-dues/admin/stats/overview')
}

export const getDuesStatsByUser = (params?: { year?: number }) => {
  return request.get<any, ApiResponse<PartyDuesUserStats[]>>('/party-dues/admin/stats/by-user', { params })
}

export const getDuesStatsByBranch = (params?: { year?: number }) => {
  return request.get<any, ApiResponse<PartyDuesBranchStats[]>>('/party-dues/admin/stats/by-branch', { params })
}

export const getDuesStatsByMonth = (params?: { year?: number }) => {
  return request.get<any, ApiResponse<PartyDuesMonthStats[]>>('/party-dues/admin/stats/by-month', { params })
}

export const getDuesStatsMonthly = (params?: { year?: number }) => {
  return request.get<any, ApiResponse<PartyDuesMonthStats[]>>('/party-dues/admin/stats/by-month', { params })
}

export const getDuesUnpaidList = (params?: { year?: number; month?: number; branch?: string }) => {
  return request.get<any, ApiResponse<PartyDuesBill[]>>('/party-dues/admin/bills/unpaid', { params })
}

export const getDuesUserConfigs = (params?: { page?: number; page_size?: number; keyword?: string }) => {
  return request.get<any, ApiResponse<PaginatedResponse<PartyDuesUserConfig>>>('/party-dues/admin/user-configs', { params })
}

export const createDuesUserConfig = (data: Partial<PartyDuesUserConfig>) => {
  return request.put<any, ApiResponse<PartyDuesUserConfig>>(`/party-dues/admin/user-configs/${data.user_id}`, data)
}

export const updateDuesUserConfig = (userId: number, data: Partial<PartyDuesUserConfig>) => {
  return request.put<any, ApiResponse<PartyDuesUserConfig>>(`/party-dues/admin/user-configs/${userId}`, data)
}

export const deleteDuesUserConfig = (userId: number) => {
  return request.delete<any, ApiResponse<null>>(`/party-dues/admin/user-configs/${userId}`)
}

export const getUsers = (params?: { keyword?: string; role?: string }) => {
  return request.get<any, ApiResponse<User[]>>('/users', { params })
}
