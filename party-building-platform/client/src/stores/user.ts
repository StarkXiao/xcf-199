import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { login as loginApi, register as registerApi, getProfile, logout as logoutApi } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const setUser = (newUser: User | null) => {
    user.value = newUser
  }

  const login = async (username: string, password: string) => {
    const res = await loginApi({ username, password })
    if (res.code === 200) {
      setToken(res.data.token)
      setUser(res.data.user)
    }
    return res
  }

  const register = async (data: {
    username: string
    password: string
    real_name: string
    phone?: string
    branch?: string
  }) => {
    const res = await registerApi(data)
    if (res.code === 200) {
      setToken(res.data.token)
      setUser(res.data.user)
    }
    return res
  }

  const fetchProfile = async () => {
    try {
      const res = await getProfile()
      if (res.code === 200) {
        setUser(res.data)
      }
      return res
    } catch (error) {
      return null
    }
  }

  const logout = async () => {
    try {
      await logoutApi()
    } catch (error) {
      // ignore
    }
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
  }

  return {
    token,
    user,
    isLoggedIn,
    isAdmin,
    setToken,
    setUser,
    login,
    register,
    fetchProfile,
    logout
  }
})
