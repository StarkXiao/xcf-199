import request from '@/utils/request'
import type {
  VolunteerProject,
  VolunteerSignup,
  VolunteerServiceRecord,
  VolunteerReview,
  VolunteerStats,
  VolunteerMyStats,
  VolunteerCategoryStats,
  VolunteerRanking,
  PaginatedResponse,
  ApiResponse
} from '@/types'

export const getVolunteerProjects = (params?: {
  page?: number
  page_size?: number
  status?: string
  category?: string
  keyword?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<VolunteerProject>>>('/volunteer-service', { params })
}

export const getVolunteerCategories = () => {
  return request.get<any, ApiResponse<string[]>>('/volunteer-service/categories')
}

export const getVolunteerProjectDetail = (id: number) => {
  return request.get<any, ApiResponse<VolunteerProject>>(`/volunteer-service/${id}`)
}

export const signupVolunteerProject = (id: number, data: { apply_reason?: string; skills?: string }) => {
  return request.post<any, ApiResponse<null>>(`/volunteer-service/${id}/signup`, data)
}

export const cancelVolunteerSignup = (id: number) => {
  return request.post<any, ApiResponse<null>>(`/volunteer-service/${id}/cancel`)
}

export const getMyVolunteerSignups = (params?: { page?: number; page_size?: number; status?: string }) => {
  return request.get<any, ApiResponse<PaginatedResponse<VolunteerSignup>>>('/volunteer-service/my/signups', { params })
}

export const getMyVolunteerServiceRecords = (params?: { page?: number; page_size?: number }) => {
  return request.get<any, ApiResponse<PaginatedResponse<VolunteerServiceRecord>>>('/volunteer-service/my/service-records', { params })
}

export const getMyVolunteerStats = () => {
  return request.get<any, ApiResponse<VolunteerMyStats>>('/volunteer-service/my/stats')
}

export const getVolunteerReviews = (projectId: number, params?: { page?: number; page_size?: number }) => {
  return request.get<any, ApiResponse<PaginatedResponse<VolunteerReview>>>(`/volunteer-service/${projectId}/reviews`, { params })
}

export const submitVolunteerReview = (projectId: number, data: { rating: number; content?: string; is_anonymous?: boolean }) => {
  return request.post<any, ApiResponse<VolunteerReview>>(`/volunteer-service/${projectId}/reviews`, data)
}

export const getAdminVolunteerProjects = (params?: {
  page?: number
  page_size?: number
  status?: string
  keyword?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<VolunteerProject>>>('/admin/volunteer-projects', { params })
}

export const createVolunteerProject = (data: Partial<VolunteerProject>) => {
  return request.post<any, ApiResponse<VolunteerProject>>('/admin/volunteer-projects', data)
}

export const updateVolunteerProject = (id: number, data: Partial<VolunteerProject>) => {
  return request.put<any, ApiResponse<VolunteerProject>>(`/admin/volunteer-projects/${id}`, data)
}

export const deleteVolunteerProject = (id: number) => {
  return request.delete<any, ApiResponse<null>>(`/admin/volunteer-projects/${id}`)
}

export const getAdminVolunteerSignups = (projectId: number, params?: {
  page?: number
  page_size?: number
  status?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<VolunteerSignup>>>(`/admin/volunteer-signups/${projectId}`, { params })
}

export const updateVolunteerSignupStatus = (signupId: number, data: { status: string; review_opinion?: string }) => {
  return request.put<any, ApiResponse<null>>(`/admin/volunteer-signups/${signupId}/status`, data)
}

export const getAdminServiceRecords = (projectId: number, params?: {
  page?: number
  page_size?: number
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<VolunteerServiceRecord>>>(`/admin/volunteer-service-records/${projectId}`, { params })
}

export const createServiceRecord = (data: {
  signup_id: number
  service_date: string
  start_time: string
  end_time: string
  task_description?: string
}) => {
  return request.post<any, ApiResponse<VolunteerServiceRecord>>('/admin/volunteer-service-records', data)
}

export const getVolunteerStatsOverview = () => {
  return request.get<any, ApiResponse<VolunteerStats>>('/admin/volunteer-stats/overview')
}

export const getVolunteerStatsByCategory = () => {
  return request.get<any, ApiResponse<VolunteerCategoryStats[]>>('/admin/volunteer-stats/by-category')
}

export const getVolunteerRanking = (params?: { limit?: number }) => {
  return request.get<any, ApiResponse<VolunteerRanking[]>>('/admin/volunteer-stats/ranking', { params })
}
