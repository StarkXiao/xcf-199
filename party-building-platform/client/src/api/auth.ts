import request from '@/utils/request'
import type { User, ApiResponse } from '@/types'

interface LoginData {
  username: string
  password: string
}

interface RegisterData {
  username: string
  password: string
  real_name: string
  phone?: string
  branch?: string
}

interface LoginResponse {
  token: string
  user: User
}

export const login = (data: LoginData) => {
  return request.post<any, ApiResponse<LoginResponse>>('/auth/login', data)
}

export const register = (data: RegisterData) => {
  return request.post<any, ApiResponse<LoginResponse>>('/auth/register', data)
}

export const getProfile = () => {
  return request.get<any, ApiResponse<User>>('/auth/profile')
}

export const updateProfile = (data: Partial<User>) => {
  return request.put<any, ApiResponse<User>>('/auth/profile', data)
}

export const logout = () => {
  return request.post<any, ApiResponse<null>>('/auth/logout')
}
