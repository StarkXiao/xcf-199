import request from '@/utils/request'
import type {
  Survey,
  SurveyStats,
  SurveyQuestionStats,
  PaginatedResponse,
  ApiResponse
} from '@/types'

export const getSurveys = (params?: {
  page?: number
  page_size?: number
  status?: string
  keyword?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<Survey>>>('/surveys', { params })
}

export const getAvailableSurveys = () => {
  return request.get<any, ApiResponse<Survey[]>>('/surveys/available')
}

export const getSurveyDetail = (id: number) => {
  return request.get<any, ApiResponse<Survey>>(`/surveys/${id}`)
}

export const createSurvey = (data: any) => {
  return request.post<any, ApiResponse<Survey>>('/surveys', data)
}

export const updateSurvey = (id: number, data: any) => {
  return request.put<any, ApiResponse<null>>(`/surveys/${id}`, data)
}

export const deleteSurvey = (id: number) => {
  return request.delete<any, ApiResponse<null>>(`/surveys/${id}`)
}

export const submitSurvey = (id: number, data: { answers: { question_id: number; answer_text: string }[] }) => {
  return request.post<any, ApiResponse<null>>(`/surveys/${id}/submit`, data)
}

export const updateSurveyStatus = (id: number, status: string) => {
  return request.put<any, ApiResponse<null>>(`/surveys/${id}/status`, { status })
}

export const getSurveyStats = () => {
  return request.get<any, ApiResponse<SurveyStats>>('/surveys/stats/overview')
}

export const getSurveyDetailStats = (id: number) => {
  return request.get<any, ApiResponse<{
    survey: Survey
    questions: any[]
    responses: any[]
    answers: any[]
    question_stats: SurveyQuestionStats[]
  }>>(`/surveys/${id}/stats`)
}

export const exportSurveyData = (id: number) => {
  return request.get(`/surveys/${id}/export`, { responseType: 'blob' })
}
