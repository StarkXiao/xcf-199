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
}

export interface Article {
  id: number
  title: string
  content: string
  category: string
  cover_image: string
  author: string
  status: string
  views: number
  created_at: string
  updated_at: string
  excerpt?: string
}

export interface Activity {
  id: number
  title: string
  description: string
  cover_image: string
  location: string
  start_time: string
  end_time: string
  signup_deadline: string
  max_participants: number
  points_reward: number
  status: string
  signup_count?: number
  is_signed_up?: boolean
  signup_status?: string
  created_at: string
  updated_at: string
}

export interface Notice {
  id: number
  title: string
  content: string
  type: string
  priority: number
  status: string
  created_at: string
  updated_at: string
  excerpt?: string
}

export interface PointsRecord {
  id: number
  user_id: number
  points: number
  reason: string
  type: string
  created_at: string
}

export interface RankingUser {
  id: number
  username: string
  real_name: string
  branch: string
  points: number
  avatar: string
  rank: number
}

export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export type PartyStageCode = 'application' | 'activist' | 'candidate' | 'probationary' | 'probation' | 'formal'

export type PartyStageStatus = 'pending' | 'in_progress' | 'completed' | 'rejected'

export interface PartyStageConfig {
  code: PartyStageCode
  name: string
  sortOrder: number
  description: string
}

export interface PartyDevelopmentStage {
  id: number
  development_id: number
  stage_code: PartyStageCode
  stage_name: string
  status: PartyStageStatus
  start_date?: string
  end_date?: string
  deadline_date?: string
  description?: string
  reviewer?: string
  review_opinion?: string
  review_date?: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PartyDevelopmentMaterial {
  id: number
  development_id: number
  stage_code?: PartyStageCode
  material_name: string
  material_type?: string
  file_url?: string
  file_size?: number
  uploaded_by?: number
  description?: string
  created_at: string
}

export interface PartyDevelopmentHistory {
  id: number
  development_id: number
  stage_code?: PartyStageCode
  action_type: string
  action_detail?: string
  operator_id?: number
  operator_name?: string
  created_at: string
}

export interface PartyDevelopment {
  id: number
  user_id: number
  current_stage: PartyStageCode
  overall_status: 'in_progress' | 'completed' | 'suspended'
  application_date?: string
  activist_date?: string
  candidate_date?: string
  probationary_date?: string
  probation_start_date?: string
  probation_end_date?: string
  formal_date?: string
  branch_secretary?: string
  introducer1?: string
  introducer2?: string
  remarks?: string
  created_at: string
  updated_at: string
  stages?: PartyDevelopmentStage[]
  materials?: PartyDevelopmentMaterial[]
  history?: PartyDevelopmentHistory[]
  user?: User
}

export interface PartyDevelopmentListItem extends PartyDevelopment {
  real_name: string
  branch: string
  phone: string
}

export interface PartyReminder {
  id: number
  development_id: number
  stage_code: PartyStageCode
  stage_name: string
  status: PartyStageStatus
  deadline_date: string
  user_id: number
  real_name: string
  branch: string
}

