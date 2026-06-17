import request from '@/utils/request'
import type {
  PartyDevelopment,
  PartyDevelopmentListItem,
  PartyStageConfig,
  PartyDevelopmentMaterial,
  PartyReminder,
  PaginatedResponse,
  ApiResponse,
  PartyStageCode,
  PartyStageStatus
} from '@/types'

export interface UploadMaterialData {
  development_id: number
  stage_code?: PartyStageCode
  material_name: string
  material_type?: string
  file_url?: string
  file_size?: number
  description?: string
}

export interface UpdateStageData {
  status?: PartyStageStatus
  review_opinion?: string
  start_date?: string
  end_date?: string
  deadline_date?: string
}

export interface UpdateDevInfoData {
  branch_secretary?: string
  introducer1?: string
  introducer2?: string
  remarks?: string
}

export interface ListQueryParams {
  page?: number
  page_size?: number
  keyword?: string
  stage?: string
  status?: string
}

export const getMyDevelopment = () => {
  return request.get<any, ApiResponse<PartyDevelopment | null>>('/party-development/my')
}

export const applyForParty = () => {
  return request.post<any, ApiResponse<PartyDevelopment>>('/party-development/apply')
}

export const uploadMaterial = (data: UploadMaterialData) => {
  return request.post<any, ApiResponse<PartyDevelopmentMaterial>>('/party-development/materials', data)
}

export const deleteMaterial = (id: number) => {
  return request.delete<any, ApiResponse<null>>(`/party-development/materials/${id}`)
}

export const getStageConfig = () => {
  return request.get<any, ApiResponse<PartyStageConfig[]>>('/party-development/stages/config')
}

export const getAdminDevList = (params: ListQueryParams = {}) => {
  return request.get<any, ApiResponse<PaginatedResponse<PartyDevelopmentListItem>>>('/party-development/admin/list', { params })
}

export const getAdminDevDetail = (id: number) => {
  return request.get<any, ApiResponse<PartyDevelopment>>(`/party-development/admin/${id}`)
}

export const updateStage = (id: number, stageCode: PartyStageCode, data: UpdateStageData) => {
  return request.put<any, ApiResponse<PartyDevelopment>>(`/party-development/admin/${id}/stage/${stageCode}`, data)
}

export const updateDevInfo = (id: number, data: UpdateDevInfoData) => {
  return request.put<any, ApiResponse<PartyDevelopment>>(`/party-development/admin/${id}`, data)
}

export const getReminders = () => {
  return request.get<any, ApiResponse<PartyReminder[]>>('/party-development/admin/reminders/list')
}
