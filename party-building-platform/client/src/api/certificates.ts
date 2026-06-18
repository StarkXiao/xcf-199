import request from '@/utils/request'
import type {
  Certificate,
  CertificateIssuance,
  UserAchievement,
  CertificateStats,
  CertificateAdminStats,
  CertificateRanking,
  AchievementWithUser,
  PaginatedResponse,
  ApiResponse
} from '@/types'

export const getCertificates = (params?: {
  page?: number
  page_size?: number
  type?: string
  category?: string
  status?: string
  keyword?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<Certificate>>>('/certificates', { params })
}

export const getCertificateCategories = () => {
  return request.get<any, ApiResponse<string[]>>('/certificates/categories')
}

export const getCertificateDetail = (id: number) => {
  return request.get<any, ApiResponse<Certificate>>(`/certificates/${id}`)
}

export const getMyCertificates = (params?: {
  page?: number
  page_size?: number
  type?: string
  category?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<CertificateIssuance>>>('/certificates/my/list', { params })
}

export const getMyCertificateStats = () => {
  return request.get<any, ApiResponse<CertificateStats>>('/certificates/my/stats')
}

export const getAchievements = (params?: { user_id?: number }) => {
  return request.get<any, ApiResponse<AchievementWithUser>>('/certificates/achievements', { params })
}

export const createAchievement = (data: Partial<UserAchievement>) => {
  return request.post<any, ApiResponse<UserAchievement>>('/certificates/achievements', data)
}

export const updateAchievement = (id: number, data: Partial<UserAchievement>) => {
  return request.put<any, ApiResponse<UserAchievement>>(`/certificates/achievements/${id}`, data)
}

export const deleteAchievement = (id: number) => {
  return request.delete<any, ApiResponse<null>>(`/certificates/achievements/${id}`)
}

export const getAdminCertificates = (params?: {
  page?: number
  page_size?: number
  type?: string
  category?: string
  status?: string
  keyword?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<Certificate>>>('/certificates', { params })
}

export const createCertificate = (data: Partial<Certificate>) => {
  return request.post<any, ApiResponse<Certificate>>('/certificates', data)
}

export const updateCertificate = (id: number, data: Partial<Certificate>) => {
  return request.put<any, ApiResponse<Certificate>>(`/certificates/${id}`, data)
}

export const deleteCertificate = (id: number) => {
  return request.delete<any, ApiResponse<null>>(`/certificates/${id}`)
}

export const getCertificateIssuances = (id: number, params?: {
  page?: number
  page_size?: number
  status?: string
}) => {
  return request.get<any, ApiResponse<{ list: CertificateIssuance[]; total: number; page: number; page_size: number; certificate: Certificate }>>(`/certificates/${id}/issuances`, { params })
}

export const issueCertificate = (id: number, data: {
  user_id: number
  certificate_number?: string
  remarks?: string
  issue_date?: string
}) => {
  return request.post<any, ApiResponse<CertificateIssuance>>(`/certificates/${id}/issue`, data)
}

export const revokeCertificateIssuance = (id: number) => {
  return request.delete<any, ApiResponse<null>>(`/certificates/issuances/${id}`)
}

export const getCertificateStats = () => {
  return request.get<any, ApiResponse<CertificateAdminStats>>('/certificates/stats/overview')
}

export const getCertificateRanking = (params?: { limit?: number }) => {
  return request.get<any, ApiResponse<CertificateRanking[]>>('/certificates/stats/ranking', { params })
}
