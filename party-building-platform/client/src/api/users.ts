import request from '@/utils/request'
import type { PaginatedResponse, ApiResponse } from '@/types'

export interface User {
  id: number
  username: string
  real_name: string
  phone: string
  branch: string
  role: string
  points: number
  avatar: string
  created_at: string
  updated_at: string
}

export const getUsers = (params?: {
  page?: number
  page_size?: number
  role?: string
  branch?: string
  keyword?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<User>>>('/admin/users', { params })
}

export const getUserDetail = (id: number) => {
  return request.get<any, ApiResponse<User>>(`/admin/users/${id}`)
}
