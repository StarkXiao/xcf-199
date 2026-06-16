import request from '@/utils/request'
import type { Activity, PaginatedResponse, ApiResponse } from '@/types'

export const getActivities = (params?: {
  page?: number
  page_size?: number
  status?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<Activity>>>('/activities', { params })
}

export const getActivityDetail = (id: number) => {
  return request.get<any, ApiResponse<Activity>>(`/activities/${id}`)
}

export const signupActivity = (id: number) => {
  return request.post<any, ApiResponse<null>>(`/activities/${id}/signup`)
}

export const cancelSignup = (id: number) => {
  return request.post<any, ApiResponse<null>>(`/activities/${id}/cancel`)
}

export const getMyActivities = (params?: { page?: number; page_size?: number }) => {
  return request.get<any, ApiResponse<PaginatedResponse<Activity>>>('/activities/my/list', { params })
}

export const getAdminActivities = (params?: { page?: number; page_size?: number }) => {
  return request.get<any, ApiResponse<PaginatedResponse<Activity>>>('/admin/activities', { params })
}

export const createActivity = (data: Partial<Activity>) => {
  return request.post<any, ApiResponse<Activity>>('/admin/activities', data)
}

export const updateActivity = (id: number, data: Partial<Activity>) => {
  return request.put<any, ApiResponse<Activity>>(`/admin/activities/${id}`, data)
}

export const deleteActivity = (id: number) => {
  return request.delete<any, ApiResponse<null>>(`/admin/activities/${id}`)
}
