import request from '@/utils/request'
import type { Notice, PaginatedResponse, ApiResponse } from '@/types'

export const getNotices = (params?: {
  page?: number
  page_size?: number
  type?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<Notice>>>('/notices', { params })
}

export const getNoticeTypes = () => {
  return request.get<any, ApiResponse<string[]>>('/notices/types')
}

export const getNoticeDetail = (id: number) => {
  return request.get<any, ApiResponse<Notice>>(`/notices/${id}`)
}

export const getAdminNotices = (params?: { page?: number; page_size?: number }) => {
  return request.get<any, ApiResponse<PaginatedResponse<Notice>>>('/admin/notices', { params })
}

export const createNotice = (data: Partial<Notice>) => {
  return request.post<any, ApiResponse<Notice>>('/admin/notices', data)
}

export const updateNotice = (id: number, data: Partial<Notice>) => {
  return request.put<any, ApiResponse<Notice>>(`/admin/notices/${id}`, data)
}

export const deleteNotice = (id: number) => {
  return request.delete<any, ApiResponse<null>>(`/admin/notices/${id}`)
}
