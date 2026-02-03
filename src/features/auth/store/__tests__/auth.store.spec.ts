import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../index' // Changed from ../auth.store
import { authApi } from '../../api/auth.api'
import type { LoginResponse, User } from '@/core/types'

// Mock the auth API
vi.mock('../../api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    externalLogin: vi.fn(),
    refreshToken: vi.fn(),
    me: vi.fn()
  }
}))

describe('Auth Store', () => {
  beforeEach(() => {
    // Create fresh Pinia instance
    setActivePinia(createPinia())
    
    // Clear sessionStorage (auth tokens use sessionStorage)
    sessionStorage.clear()
    
    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  describe('Initial State', () => {
    it('should have null values by default', () => {
      const store = useAuthStore()
      
      expect(store.accessToken).toBeNull()
      expect(store.refreshTokenValue).toBeNull()
      expect(store.dutAccessToken).toBeNull()
      expect(store.dutRefreshToken).toBeNull()
      expect(store.user).toBeNull()
      expect(store.error).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.loginType).toBe('local')
    })

    it('should restore tokens from sessionStorage', () => {
      sessionStorage.setItem('access_token', 'stored-access-token')
      sessionStorage.setItem('refresh_token', 'stored-refresh-token')
      sessionStorage.setItem('login_type', 'external')
      
      const store = useAuthStore()
      
      expect(store.accessToken).toBe('stored-access-token')
      expect(store.refreshTokenValue).toBe('stored-refresh-token')
      expect(store.loginType).toBe('external')
    })
  })

  describe('Getters', () => {
    it('isAuthenticated should return false when no access token', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
    })

    it('isAuthenticated should return true when access token exists', () => {
      const store = useAuthStore()
      store.accessToken = 'test-token'
      expect(store.isAuthenticated).toBe(true)
    })

    it('hasDUTAccess should return false when no DUT token', () => {
      const store = useAuthStore()
      expect(store.hasDUTAccess).toBe(false)
    })

    it('hasDUTAccess should return true when DUT token exists', () => {
      const store = useAuthStore()
      store.dutAccessToken = 'dut-token'
      expect(store.hasDUTAccess).toBe(true)
    })
  })

  describe('login', () => {
    const mockLoginResponse: LoginResponse = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      token_type: 'Bearer',
      expires_in: 3600
    }

    const mockUser: User = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read:data'],
      is_active: true,
      is_admin: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    it('should login successfully with valid credentials', async () => {
      vi.mocked(authApi.login).mockResolvedValue(mockLoginResponse)
      vi.mocked(authApi.me).mockResolvedValue(mockUser)
      
      const store = useAuthStore()
      const result = await store.login({ username: 'test', password: 'password' })
      
      expect(authApi.login).toHaveBeenCalledWith({
        username: 'test',
        password: 'password'
      })
      expect(store.accessToken).toBe('test-access-token')
      expect(store.refreshTokenValue).toBe('test-refresh-token')
      expect(store.loginType).toBe('local')
      expect(store.user).toEqual(mockUser)
      expect(store.error).toBeNull()
      expect(store.loading).toBe(false)
      expect(result).toEqual(mockLoginResponse)
    })

    it('should store tokens in sessionStorage', async () => {
      vi.mocked(authApi.login).mockResolvedValue(mockLoginResponse)
      vi.mocked(authApi.me).mockResolvedValue(mockUser)
      
      const store = useAuthStore()
      await store.login({ username: 'test', password: 'password' })
      
      expect(sessionStorage.getItem('access_token')).toBe('test-access-token')
      expect(sessionStorage.getItem('refresh_token')).toBe('test-refresh-token')
      expect(sessionStorage.getItem('login_type')).toBe('local')
    })

    it('should clear DUT tokens on local login', async () => {
      // Set some DUT tokens first
      sessionStorage.setItem('dut_access_token', 'dut-token')
      sessionStorage.setItem('dut_refresh_token', 'dut-refresh')
      
      vi.mocked(authApi.login).mockResolvedValue(mockLoginResponse)
      vi.mocked(authApi.me).mockResolvedValue(mockUser)
      
      const store = useAuthStore()
      store.dutAccessToken = 'dut-token'
      store.dutRefreshToken = 'dut-refresh'
      
      await store.login({ username: 'test', password: 'password' })
      
      expect(store.dutAccessToken).toBeNull()
      expect(store.dutRefreshToken).toBeNull()
      expect(sessionStorage.getItem('dut_access_token')).toBeNull()
      expect(sessionStorage.getItem('dut_refresh_token')).toBeNull()
    })

    it('should set error on login failure', async () => {
      const errorResponse = {
        response: { 
          data: { detail: 'Invalid username or password' },
          status: 401
        }
      }
      
      vi.mocked(authApi.login).mockRejectedValue(errorResponse)
      
      const store = useAuthStore()
      
      await expect(
        store.login({ username: 'wrong', password: 'wrong' })
      ).rejects.toEqual(errorResponse)
      
      expect(store.error).toBe('Invalid username or password')
      expect(store.accessToken).toBeNull()
      expect(store.loading).toBe(false)
    })

    it('should set default error message when detail not provided', async () => {
      vi.mocked(authApi.login).mockRejectedValue(new Error('Network error'))
      
      const store = useAuthStore()
      
      await expect(
        store.login({ username: 'test', password: 'test' })
      ).rejects.toThrow()
      
      expect(store.error).toBe('Login failed')
    })

    it('should clear error on successful login after failed attempt', async () => {
      const store = useAuthStore()
      
      // First: failed login
      vi.mocked(authApi.login).mockRejectedValueOnce({
        response: { data: { detail: 'Invalid credentials' } }
      })
      
      await expect(
        store.login({ username: 'wrong', password: 'wrong' })
      ).rejects.toThrow()
      expect(store.error).toBe('Invalid credentials')
      
      // Second: successful login
      vi.mocked(authApi.login).mockResolvedValue(mockLoginResponse)
      vi.mocked(authApi.me).mockResolvedValue(mockUser)
      
      await store.login({ username: 'correct', password: 'correct' })
      expect(store.error).toBeNull()
    })
  })

  describe('externalLogin', () => {
    const mockExternalLoginResponse: LoginResponse = {
      access_token: 'ext-access-token',
      refresh_token: 'ext-refresh-token',
      dut_access_token: 'dut-access-token',
      dut_refresh_token: 'dut-refresh-token',
      token_type: 'Bearer',
      expires_in: 3600
    }

    const mockUser: User = {
      id: 1,
      username: 'external-user',
      email: 'external@example.com',
      roles: ['user'],
      permissions: ['read:data', 'read:dut'],
      is_active: true,
      is_admin: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    it('should login with external credentials', async () => {
      vi.mocked(authApi.externalLogin).mockResolvedValue(mockExternalLoginResponse)
      vi.mocked(authApi.me).mockResolvedValue(mockUser)
      
      const store = useAuthStore()
      await store.externalLogin({
        username: 'test',
        password: 'password'
      })
      
      expect(store.accessToken).toBe('ext-access-token')
      expect(store.refreshTokenValue).toBe('ext-refresh-token')
      expect(store.loginType).toBe('external')
      expect(store.dutAccessToken).toBe('dut-access-token')
      expect(store.dutRefreshToken).toBe('dut-refresh-token')
      expect(store.user).toEqual(mockUser)
    })

    it('should store DUT tokens in sessionStorage', async () => {
      vi.mocked(authApi.externalLogin).mockResolvedValue(mockExternalLoginResponse)
      vi.mocked(authApi.me).mockResolvedValue(mockUser)
      
      const store = useAuthStore()
      await store.externalLogin({
        username: 'test',
        password: 'password'
      })
      
      expect(sessionStorage.getItem('dut_access_token')).toBe('dut-access-token')
      expect(sessionStorage.getItem('dut_refresh_token')).toBe('dut-refresh-token')
      expect(sessionStorage.getItem('login_type')).toBe('external')
    })

    it('should handle external login without DUT tokens', async () => {
      const responseWithoutDUT: LoginResponse = {
        access_token: 'ext-access-token',
        refresh_token: 'ext-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600
      }
      
      vi.mocked(authApi.externalLogin).mockResolvedValue(responseWithoutDUT)
      vi.mocked(authApi.me).mockResolvedValue(mockUser)
      
      const store = useAuthStore()
      await store.externalLogin({
        username: 'test',
        password: 'password'
      })
      
      expect(store.accessToken).toBe('ext-access-token')
      expect(store.dutAccessToken).toBeNull()
      expect(store.dutRefreshToken).toBeNull()
    })

    it('should set error on external login failure', async () => {
      const errorResponse = {
        response: { 
          data: { detail: 'External login failed' },
          status: 401
        }
      }
      
      vi.mocked(authApi.externalLogin).mockRejectedValue(errorResponse)
      
      const store = useAuthStore()
      
      await expect(
        store.externalLogin({ username: 'test', password: 'test' })
      ).rejects.toEqual(errorResponse)
      
      expect(store.error).toBe('External login failed')
    })
  })

  describe('refreshToken', () => {
    it('should refresh access token successfully', async () => {
      const mockRefreshResponse: LoginResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600
      }
      
      vi.mocked(authApi.refreshToken).mockResolvedValue(mockRefreshResponse)
      
      const store = useAuthStore()
      store.refreshTokenValue = 'old-refresh-token'
      
      await store.refreshToken()
      
      expect(authApi.refreshToken).toHaveBeenCalledWith('old-refresh-token')
      expect(store.accessToken).toBe('new-access-token')
      expect(store.refreshTokenValue).toBe('new-refresh-token')
      expect(sessionStorage.getItem('access_token')).toBe('new-access-token')
      expect(sessionStorage.getItem('refresh_token')).toBe('new-refresh-token')
    })

    it('should throw error when no refresh token available', async () => {
      const store = useAuthStore()
      store.refreshTokenValue = null
      
      await expect(store.refreshToken()).rejects.toThrow('No refresh token available')
    })

    it('should logout on refresh failure', async () => {
      vi.mocked(authApi.refreshToken).mockRejectedValue(new Error('Refresh failed'))
      
      const store = useAuthStore()
      store.accessToken = 'access-token'
      store.refreshTokenValue = 'refresh-token'
      
      await expect(store.refreshToken()).rejects.toThrow()
      
      expect(store.accessToken).toBeNull()
      expect(store.refreshTokenValue).toBeNull()
    })
  })

  describe('logout', () => {
    it('should clear all tokens and user data', () => {
      const store = useAuthStore()
      
      // Set some data
      store.accessToken = 'token'
      store.refreshTokenValue = 'refresh'
      store.dutAccessToken = 'dut-token'
      store.dutRefreshToken = 'dut-refresh'
      store.user = {
        id: 1,
        username: 'test',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read:data'],
        is_active: true,
        is_admin: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
      
      store.logout()
      
      expect(store.accessToken).toBeNull()
      expect(store.refreshTokenValue).toBeNull()
      expect(store.dutAccessToken).toBeNull()
      expect(store.dutRefreshToken).toBeNull()
      expect(store.user).toBeNull()
    })

    it('should clear all tokens from sessionStorage', () => {
      sessionStorage.setItem('access_token', 'token')
      sessionStorage.setItem('refresh_token', 'refresh')
      sessionStorage.setItem('dut_access_token', 'dut-token')
      sessionStorage.setItem('dut_refresh_token', 'dut-refresh')
      sessionStorage.setItem('login_type', 'external')
      
      const store = useAuthStore()
      store.logout()
      
      expect(sessionStorage.getItem('access_token')).toBeNull()
      expect(sessionStorage.getItem('refresh_token')).toBeNull()
      expect(sessionStorage.getItem('dut_access_token')).toBeNull()
      expect(sessionStorage.getItem('dut_refresh_token')).toBeNull()
      expect(sessionStorage.getItem('login_type')).toBeNull()
    })
  })

  describe('fetchUser', () => {
    const mockUser: User = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read:data'],
      is_active: true,
      is_admin: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    it('should fetch user info when access token exists', async () => {
      vi.mocked(authApi.me).mockResolvedValue(mockUser)
      
      const store = useAuthStore()
      store.accessToken = 'test-token'
      
      await store.fetchUser()
      
      expect(authApi.me).toHaveBeenCalled()
      expect(store.user).toEqual(mockUser)
    })

    it('should not fetch user when no access token', async () => {
      const store = useAuthStore()
      store.accessToken = null
      
      await store.fetchUser()
      
      expect(authApi.me).not.toHaveBeenCalled()
      expect(store.user).toBeNull()
    })

    it('should logout on 401 error', async () => {
      vi.mocked(authApi.me).mockRejectedValue({
        response: { status: 401 }
      })
      
      const store = useAuthStore()
      store.accessToken = 'invalid-token'
      
      await store.fetchUser()
      
      expect(store.accessToken).toBeNull()
      expect(store.user).toBeNull()
    })
  })

  describe('initialize', () => {
    it('should fetch user if access token exists', async () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read:data'],
        is_active: true,
        is_admin: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
      
      vi.mocked(authApi.me).mockResolvedValue(mockUser)
      
      sessionStorage.setItem('access_token', 'stored-token')
      
      const store = useAuthStore()
      await store.initialize()
      
      expect(authApi.me).toHaveBeenCalled()
      expect(store.user).toEqual(mockUser)
    })

    it('should not fetch user if no access token', async () => {
      const store = useAuthStore()
      await store.initialize()
      
      expect(authApi.me).not.toHaveBeenCalled()
    })
  })
})
