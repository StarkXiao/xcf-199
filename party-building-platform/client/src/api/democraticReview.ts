import request from '@/utils/request'
import type {
  DemocraticReview,
  DemocraticReviewResult,
  DemocraticReviewStats,
  PaginatedResponse,
  ApiResponse
} from '@/types'

export const getDemocraticReviews = (params?: {
  page?: number
  page_size?: number
  status?: string
  year?: string
  branch?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<DemocraticReview>>>('/democratic-review', { params })
}

export const getDemocraticReviewDetail = (id: number) => {
  return request.get<any, ApiResponse<DemocraticReview>>(`/democratic-review/${id}`)
}

export const getDemocraticReviewResults = (id: number) => {
  return request.get<any, ApiResponse<DemocraticReviewResult[]>>(`/democratic-review/${id}/results`)
}

export const submitMutualReview = (id: number, data: {
  target_user_id: number
  scores: { form_item_id: number; score: number; content?: string }[]
}) => {
  return request.post<any, ApiResponse<null>>(`/democratic-review/${id}/mutual-review`, data)
}

export const submitOrganizationReview = (id: number, data: {
  target_user_id: number
  scores: { form_item_id: number; score: number; content?: string }[]
}) => {
  return request.post<any, ApiResponse<null>>(`/democratic-review/${id}/organization-review`, data)
}

export const getAdminDemocraticReviews = (params?: {
  page?: number
  page_size?: number
  status?: string
  year?: string
  branch?: string
  keyword?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<DemocraticReview>>>('/admin/democratic-reviews', { params })
}

export const createDemocraticReview = (data: {
  title: string
  year: number
  branch: string
  description?: string
  status?: string
  start_date?: string
  end_date?: string
  form_items?: { item_name: string; item_type?: string; max_score?: number; weight?: number; required?: number; options?: string }[]
}) => {
  return request.post<any, ApiResponse<DemocraticReview>>('/admin/democratic-reviews', data)
}

export const updateDemocraticReview = (id: number, data: Partial<DemocraticReview> & {
  form_items?: { item_name: string; item_type?: string; max_score?: number; weight?: number; required?: number; options?: string }[]
}) => {
  return request.put<any, ApiResponse<null>>(`/admin/democratic-reviews/${id}`, data)
}

export const deleteDemocraticReview = (id: number) => {
  return request.delete<any, ApiResponse<null>>(`/admin/democratic-reviews/${id}`)
}

export const getDemocraticReviewStats = () => {
  return request.get<any, ApiResponse<DemocraticReviewStats>>('/admin/democratic-review-stats/overview')
}

export const exportDemocraticReview = (id: number) => {
  return `/api/admin/democratic-review-stats/export/${id}`
}
