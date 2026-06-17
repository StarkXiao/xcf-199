import request from '@/utils/request'
import type {
  PartyTransfer,
  PartyTransferStageConfig,
  PartyTransferRequiredMaterial,
  PartyTransferStats,
  PaginatedResponse,
  ApiResponse,
  TransferStageCode
} from '@/types'

export interface ApplyTransferData {
  transfer_type?: string
  transfer_direction?: string
  from_branch: string
  to_branch: string
  from_organization?: string
  to_organization?: string
  reason: string
  remarks?: string
}

export interface ReviewStageData {
  opinion?: string
  action: 'approve' | 'reject'
}

export interface VerifyMaterialData {
  verify_status: 'pending' | 'passed' | 'rejected'
  verify_opinion?: string
}

export interface ListQueryParams {
  page?: number
  page_size?: number
  keyword?: string
  stage?: string
  status?: string
  type?: string
}

export const getMyTransfers = () => {
  return request.get<any, ApiResponse<PartyTransfer[]>>('/party-transfer/my')
}

export const getMyTransferDetail = (id: number) => {
  return request.get<any, ApiResponse<PartyTransfer>>(`/party-transfer/my/${id}`)
}

export const getStageConfig = () => {
  return request.get<any, ApiResponse<PartyTransferStageConfig[]>>('/party-transfer/stages/config')
}

export const getRequiredMaterials = () => {
  return request.get<any, ApiResponse<PartyTransferRequiredMaterial[]>>('/party-transfer/materials/required')
}

export const applyTransfer = (data: ApplyTransferData) => {
  return request.post<any, ApiResponse<PartyTransfer>>('/party-transfer/apply', data)
}

export const uploadMaterialFile = (formData: FormData, onProgress?: (progress: number) => void) => {
  return request.post<any, ApiResponse<any>>(
    '/party-transfer/materials/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress ? (progressEvent: any) => {
        const percentCompleted = progressEvent.total
          ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
          : 0
        onProgress(percentCompleted)
      } : undefined
    }
  )
}

export const getMaterialDownloadUrl = (id: number) => {
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/party-transfer/materials/download/${id}`
}

export const getMaterialPreviewUrl = (fileUrl: string) => {
  if (!fileUrl) return ''
  if (fileUrl.startsWith('http')) return fileUrl
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/api$/, '')
  return base + fileUrl
}

export const verifyMaterial = (id: number, data: VerifyMaterialData) => {
  return request.put<any, ApiResponse<null>>(`/party-transfer/materials/${id}/verify`, data)
}

export const getAdminTransferList = (params: ListQueryParams = {}) => {
  return request.get<any, ApiResponse<PaginatedResponse<PartyTransfer>>>('/party-transfer/admin/list', { params })
}

export const getAdminTransferDetail = (id: number) => {
  return request.get<any, ApiResponse<PartyTransfer>>(`/party-transfer/admin/${id}`)
}

export const reviewStage = (id: number, stageCode: TransferStageCode, data: ReviewStageData) => {
  return request.put<any, ApiResponse<PartyTransfer>>(`/party-transfer/admin/${id}/stage/${stageCode}`, data)
}

export const cancelTransfer = (id: number, reason?: string) => {
  return request.put<any, ApiResponse<null>>(`/party-transfer/admin/${id}/cancel`, { reason })
}

export const getTransferStats = () => {
  return request.get<any, ApiResponse<PartyTransferStats>>('/party-transfer/admin/stats')
}
