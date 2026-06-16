import request from '@/utils/request'
import type { Article, PaginatedResponse, ApiResponse } from '@/types'

export const getArticles = (params?: {
  page?: number
  page_size?: number
  category?: string
  keyword?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<Article>>>('/articles', { params })
}

export const getArticleCategories = () => {
  return request.get<any, ApiResponse<string[]>>('/articles/categories')
}

export const getArticleDetail = (id: number) => {
  return request.get<any, ApiResponse<Article>>(`/articles/${id}`)
}

export const recordArticleRead = (id: number, duration: number = 60) => {
  return request.post<any, ApiResponse<{ points_earned: number }>>(`/articles/${id}/read`, { duration })
}

export const getAdminArticles = (params?: { page?: number; page_size?: number; keyword?: string }) => {
  return request.get<any, ApiResponse<PaginatedResponse<Article>>>('/admin/articles', { params })
}

export const createArticle = (data: Partial<Article>) => {
  return request.post<any, ApiResponse<Article>>('/admin/articles', data)
}

export const updateArticle = (id: number, data: Partial<Article>) => {
  return request.put<any, ApiResponse<Article>>(`/admin/articles/${id}`, data)
}

export const deleteArticle = (id: number) => {
  return request.delete<any, ApiResponse<null>>(`/admin/articles/${id}`)
}
