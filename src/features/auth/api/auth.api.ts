import { apiClient } from '@/core/api'
import type { ExternalLoginRequest, LoginRequest, LoginResponse, User } from '@/core/types'

/**
 * Authentication API
 *
 * Handles all authentication-related API calls including login, logout, token refresh, and user info.
 */
export const authApi = {
  /**
   * Login with username and password (local authentication only)
   * Provides access to file parsing and comparison features.
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const formData = new FormData()
    formData.append('username', credentials.username)
    formData.append('password', credentials.password)

    const { data } = await apiClient.post<LoginResponse>('/api/auth/login', formData)
    return data
  },

  /**
   * External login with DUT credentials (enables DUT Management API access)
   * Provides full access including DUT features.
   */
  async externalLogin(credentials: ExternalLoginRequest): Promise<LoginResponse> {
    const formData = new FormData()
    formData.append('username', credentials.username)
    formData.append('password', credentials.password)
    if (credentials.dut_username) {
      formData.append('dut_username', credentials.dut_username)
    }
    if (credentials.dut_password) {
      formData.append('dut_password', credentials.dut_password)
    }

    const { data } = await apiClient.post<LoginResponse>('/api/auth/external-login', formData)
    return data
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const formData = new FormData()
    formData.append('refresh_token', refreshToken)

    const { data } = await apiClient.post<LoginResponse>('/api/auth/token/refresh', formData)
    return data
  },

  /**
   * Get current authenticated user information
   */
  async me(): Promise<User> {
    const { data } = await apiClient.get<User>('/api/auth/me')
    return data
  },

  /**
   * Logout (if backend has logout endpoint)
   */
  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout')
  },
}
