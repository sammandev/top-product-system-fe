import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api/auth.api'
import type { LoginRequest, ExternalLoginRequest, User } from '@/core/types'

/**
 * Authentication Store
 * 
 * Manages user authentication state, tokens, and login flows.
 * Supports dual authentication: local (file features only) and external (full DUT API access).
 */
export const useAuthStore = defineStore('auth', () => {
  // State
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))
  const refreshTokenValue = ref<string | null>(localStorage.getItem('refresh_token'))
  const dutAccessToken = ref<string | null>(localStorage.getItem('dut_access_token'))
  const dutRefreshToken = ref<string | null>(localStorage.getItem('dut_refresh_token'))
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loginType = ref<'local' | 'external'>(
    (localStorage.getItem('login_type') as 'local' | 'external') || 'local'
  )

  // Getters
  const isAuthenticated = computed(() => !!accessToken.value)
  const hasDUTAccess = computed(() => !!dutAccessToken.value)
  const isAdmin = computed(() => {
    // Check is_admin field first (from backend)
    if (user.value?.is_admin === true) return true
    // Fallback to checking roles
    if (!user.value?.roles) return false
    const roles = Array.isArray(user.value.roles) ? user.value.roles : [user.value.roles]
    return roles.some(role => role.toLowerCase() === 'admin')
  })

  // Helper to check if user has specific role
  const hasRole = (roleName: string): boolean => {
    if (!user.value?.roles) return false
    const roles = Array.isArray(user.value.roles) ? user.value.roles : [user.value.roles]
    return roles.some(role => role.toLowerCase() === roleName.toLowerCase())
  }

  // Actions
  async function login(credentials: LoginRequest) {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.login(credentials)
      accessToken.value = response.access_token
      refreshTokenValue.value = response.refresh_token
      loginType.value = 'local'

      // Store tokens in localStorage
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      localStorage.setItem('login_type', 'local')

      // Clear DUT tokens for local login
      dutAccessToken.value = null
      dutRefreshToken.value = null
      localStorage.removeItem('dut_access_token')
      localStorage.removeItem('dut_refresh_token')

      // Fetch user info
      await fetchUser()

      return response
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function externalLogin(credentials: ExternalLoginRequest) {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.externalLogin(credentials)
      accessToken.value = response.access_token
      refreshTokenValue.value = response.refresh_token
      loginType.value = 'external'

      // Store tokens in localStorage
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      localStorage.setItem('login_type', 'external')

      // Store DUT tokens if provided
      if (response.dut_access_token) {
        dutAccessToken.value = response.dut_access_token
        localStorage.setItem('dut_access_token', response.dut_access_token)
      }
      if (response.dut_refresh_token) {
        dutRefreshToken.value = response.dut_refresh_token
        localStorage.setItem('dut_refresh_token', response.dut_refresh_token)
      }

      // Fetch user info
      await fetchUser()

      return response
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'External login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function refreshToken() {
    if (!refreshTokenValue.value) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await authApi.refreshToken(refreshTokenValue.value)
      accessToken.value = response.access_token
      refreshTokenValue.value = response.refresh_token

      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)

      return response
    } catch (err) {
      logout()
      throw err
    }
  }

  async function fetchUser() {
    if (!accessToken.value) return

    try {
      user.value = await authApi.me()
    } catch (err: any) {
      console.error('Failed to fetch user:', err)
      if (err.response?.status === 401) {
        logout()
      }
    }
  }

  function logout() {
    accessToken.value = null
    refreshTokenValue.value = null
    dutAccessToken.value = null
    dutRefreshToken.value = null
    user.value = null

    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('dut_access_token')
    localStorage.removeItem('dut_refresh_token')
    localStorage.removeItem('login_type')
  }

  // Initialize store
  async function initialize() {
    if (accessToken.value) {
      await fetchUser()
    }
  }

  return {
    // State
    accessToken,
    refreshTokenValue,
    dutAccessToken,
    dutRefreshToken,
    user,
    loading,
    error,
    loginType,

    // Getters
    isAuthenticated,
    hasDUTAccess,
    isAdmin,
    hasRole,

    // Actions
    login,
    externalLogin,
    refreshToken,
    fetchUser,
    logout,
    initialize
  }
})
