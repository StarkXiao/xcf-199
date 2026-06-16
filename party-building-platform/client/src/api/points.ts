import request from '@/utils/request'
import type { RankingUser, PointsRecord, PaginatedResponse, ApiResponse, User } from '@/types'

export const getPointsRanking = (params?: {
  page?: number
  page_size?: number
  branch?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<RankingUser>>>('/points/ranking', { params })
}

export const getMyPointsRecords = (params?: { page?: number; page_size?: number }) => {
  return request.get<any, ApiResponse<{
    list: PointsRecord[]
    total: number
    page: number
    page_size: number
    total_points: number
  }>>('/points/my-records', { params })
}

export const getBranches = () => {
  return request.get<any, ApiResponse<string[]>>('/points/branches')
}

export const getAdminStats = () => {
  return request.get<any, ApiResponse<{
    user_count: number
    article_count: number
    activity_count: number
    notice_count: number
    total_points: number
    recent_signups: any[]
  }>>('/admin/stats')
}

export const getAdminUsers = (params?: { page?: number; page_size?: number; keyword?: string }) => {
  return request.get<any, ApiResponse<PaginatedResponse<User>>>('/admin/users', { params })
}

export const adjustUserPoints = (userId: number, points: number, reason: string) => {
  return request.put<any, ApiResponse<User>>(`/admin/users/${userId}/points`, { points, reason })
}

export const deleteUser = (userId: number) => {
  return request.delete<any, ApiResponse<null>>(`/admin/users/${userId}`)
}
