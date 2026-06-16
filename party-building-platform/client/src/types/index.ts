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
