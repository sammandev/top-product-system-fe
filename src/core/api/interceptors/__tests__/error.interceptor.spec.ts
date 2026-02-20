import type { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LoginResponse } from '@/core/types'
import { useAuthStore } from '@/features/auth/store/index' // Fixed: explicit index import
import {
  createErrorResponseInterceptor,
  errorResponseSuccessInterceptor,
} from '../error.interceptor'

const mockHeaders = (): InternalAxiosRequestConfig['headers'] =>
  ({}) as unknown as InternalAxiosRequestConfig['headers']

const mockErrorResponse = (status: number): AxiosError['response'] =>
  ({ status }) as unknown as AxiosError['response']

/**
 * Error Interceptor Tests
 *
 * CRITICAL: These tests prevent regression of Issue #9 (login page refresh bug)
 *
 * The error interceptor must:
 * 1. Skip token refresh for auth endpoints (login, external-login, token/refresh)
 * 2. Attempt token refresh for protected endpoints on 401
 * 3. Retry original request after successful refresh
 * 4. Logout and redirect on refresh failure
 */

describe('Error Interceptor', () => {
  let mockApiClient: AxiosInstance
  let interceptor: (error: AxiosError) => Promise<unknown>
  let authStore: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    // Create fresh Pinia instance
    setActivePinia(createPinia())
    authStore = useAuthStore()

    // Clear localStorage
    localStorage.clear()

    // Create mock API client
    mockApiClient = vi.fn() as unknown as AxiosInstance

    // Create interceptor
    interceptor = createErrorResponseInterceptor(mockApiClient)

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('errorResponseSuccessInterceptor', () => {
    it('should pass through successful responses', () => {
      const response = { data: { test: 'data' }, status: 200 } as unknown as AxiosResponse

      const result = errorResponseSuccessInterceptor(response)

      expect(result).toBe(response)
    })
  })

  describe('Auth Endpoint Detection (CRITICAL - Issue #9)', () => {
    it('should skip refresh for /api/auth/login endpoint', async () => {
      const error: AxiosError = {
        response: mockErrorResponse(401),
        config: {
          url: '/api/auth/login',
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      }

      await expect(interceptor(error)).rejects.toEqual(error)

      // Should NOT call mockApiClient (no refresh attempt)
      expect(mockApiClient).not.toHaveBeenCalled()
    })

    it('should skip refresh for /api/auth/external-login endpoint', async () => {
      const error: AxiosError = {
        response: mockErrorResponse(401),
        config: {
          url: '/api/auth/external-login',
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      }

      await expect(interceptor(error)).rejects.toEqual(error)
      expect(mockApiClient).not.toHaveBeenCalled()
    })

    it('should skip refresh for /api/auth/token/refresh endpoint', async () => {
      const error: AxiosError = {
        response: mockErrorResponse(401),
        config: {
          url: '/api/auth/token/refresh',
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      }

      await expect(interceptor(error)).rejects.toEqual(error)
      expect(mockApiClient).not.toHaveBeenCalled()
    })

    it('should detect auth endpoints with query parameters', async () => {
      const error: AxiosError = {
        response: mockErrorResponse(401),
        config: {
          url: '/api/auth/login?redirect=/dashboard',
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      }

      await expect(interceptor(error)).rejects.toEqual(error)
      expect(mockApiClient).not.toHaveBeenCalled()
    })

    it('should detect auth endpoints with full URL', async () => {
      const error: AxiosError = {
        response: mockErrorResponse(401),
        config: {
          url: 'http://localhost:7070/api/auth/external-login',
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      }

      await expect(interceptor(error)).rejects.toEqual(error)
      expect(mockApiClient).not.toHaveBeenCalled()
    })
  })

  describe('Protected Endpoint Token Refresh', () => {
    it('should attempt refresh for protected endpoint on 401', async () => {
      const mockRefreshResponse: LoginResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
      }

      const mockSuccessResponse = { data: { result: 'success' } }

      // Set up auth store with tokens
      authStore.refreshTokenValue = 'old-refresh-token'
      authStore.accessToken = 'old-access-token'

      // Mock successful refresh
      vi.spyOn(authStore, 'refreshToken').mockResolvedValue(mockRefreshResponse)
      authStore.accessToken = 'new-access-token' // Simulate token update

      // Mock successful retry
      vi.mocked(mockApiClient).mockResolvedValue(mockSuccessResponse)

      const error: AxiosError = {
        response: mockErrorResponse(401),
        config: {
          url: '/api/protected/endpoint',
          headers: mockHeaders(),
          _retry: undefined,
        } as InternalAxiosRequestConfig & { _retry?: boolean },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      }

      const result = await interceptor(error)

      // Should have called refreshToken
      expect(authStore.refreshToken).toHaveBeenCalled()

      // Should have retried the original request
      expect(mockApiClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/protected/endpoint',
          _retry: true,
        }),
      )

      expect(result).toEqual(mockSuccessResponse)
    })

    it('should update Authorization header before retry', async () => {
      const mockRefreshResponse: LoginResponse = {
        access_token: 'brand-new-token',
        refresh_token: 'brand-new-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      }

      authStore.refreshTokenValue = 'old-refresh'
      vi.spyOn(authStore, 'refreshToken').mockResolvedValue(mockRefreshResponse)
      authStore.accessToken = 'brand-new-token'

      vi.mocked(mockApiClient).mockResolvedValue({ data: {} })

      const error: AxiosError = {
        response: mockErrorResponse(401),
        config: {
          url: '/api/data',
          headers: {
            Authorization: 'Bearer old-token',
          } as unknown as InternalAxiosRequestConfig['headers'],
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      }

      await interceptor(error)

      // Should have updated Authorization header
      expect(mockApiClient).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer brand-new-token',
          }),
        }),
      )
    })

    it('should not attempt refresh if _retry flag is set', async () => {
      const error: AxiosError = {
        response: mockErrorResponse(401),
        config: {
          url: '/api/protected',
          headers: mockHeaders(),
          _retry: true, // Already retried
        } as InternalAxiosRequestConfig & { _retry?: boolean },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      }

      await expect(interceptor(error)).rejects.toEqual(error)
      expect(mockApiClient).not.toHaveBeenCalled()
    })
  })

  describe('Refresh Failure Handling', () => {
    it('should logout and redirect on refresh failure', async () => {
      authStore.accessToken = 'expired-token'
      authStore.refreshTokenValue = 'invalid-refresh'

      // Mock failed refresh
      vi.spyOn(authStore, 'refreshToken').mockRejectedValue(new Error('Refresh failed'))
      vi.spyOn(authStore, 'logout')

      const error: AxiosError = {
        response: mockErrorResponse(401),
        config: {
          url: '/api/protected',
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      }

      await expect(interceptor(error)).rejects.toThrow('Refresh failed')

      // Should have called logout
      expect(authStore.logout).toHaveBeenCalled()

      // Should have cleared tokens
      expect(authStore.accessToken).toBeNull()
      expect(authStore.refreshTokenValue).toBeNull()
    })

    it('should redirect to login page on refresh failure', async () => {
      // Mock window.location
      const originalLocation = window.location
      const mockLocation = { href: '' }
      Object.defineProperty(window, 'location', {
        writable: true,
        value: mockLocation,
      })

      authStore.accessToken = 'expired-token'
      authStore.refreshTokenValue = 'invalid-refresh'

      vi.spyOn(authStore, 'refreshToken').mockRejectedValue(new Error('Refresh failed'))

      const error: AxiosError = {
        response: mockErrorResponse(401),
        config: {
          url: '/api/protected',
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      }

      await expect(interceptor(error)).rejects.toThrow()

      // Should have redirected to login
      expect(mockLocation.href).toBe('/login')

      // Restore original location
      Object.defineProperty(window, 'location', {
        writable: true,
        value: originalLocation,
      })
    })
  })

  describe('Non-401 Error Handling', () => {
    it('should pass through non-401 errors without refresh attempt', async () => {
      const error: AxiosError = {
        response: mockErrorResponse(403),
        config: {
          url: '/api/forbidden',
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Forbidden',
      }

      await expect(interceptor(error)).rejects.toEqual(error)
      expect(mockApiClient).not.toHaveBeenCalled()
    })

    it('should pass through 404 errors', async () => {
      const error: AxiosError = {
        response: mockErrorResponse(404),
        config: {
          url: '/api/notfound',
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Not Found',
      }

      await expect(interceptor(error)).rejects.toEqual(error)
    })

    it('should pass through 500 errors', async () => {
      const error: AxiosError = {
        response: mockErrorResponse(500),
        config: {
          url: '/api/error',
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Internal Server Error',
      }

      await expect(interceptor(error)).rejects.toEqual(error)
    })
  })

  describe('Edge Cases', () => {
    it('should handle errors without config', async () => {
      const error: AxiosError = {
        response: mockErrorResponse(401),
        config: undefined,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'No config',
      }

      await expect(interceptor(error)).rejects.toEqual(error)
    })

    it('should handle errors without response', async () => {
      const error: AxiosError = {
        response: undefined,
        config: {
          url: '/api/test',
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Network error',
      }

      await expect(interceptor(error)).rejects.toEqual(error)
    })

    it('should handle errors without url', async () => {
      // When URL is undefined, the auth endpoint check will be false
      // So it will attempt refresh (if no refresh token, it will fail)
      authStore.refreshTokenValue = null // No refresh token available

      const error: AxiosError = {
        response: mockErrorResponse(401),
        config: {
          url: undefined,
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'No URL',
      }

      // Will attempt refresh, but fail because no refresh token
      await expect(interceptor(error)).rejects.toThrow('No refresh token available')
    })

    it('should handle window being undefined (SSR)', async () => {
      const originalWindow = globalThis.window

      // Simulate SSR environment
      ;(globalThis as unknown as { window?: Window }).window = undefined

      authStore.refreshTokenValue = 'token'
      vi.spyOn(authStore, 'refreshToken').mockRejectedValue(new Error('Failed'))

      const error: AxiosError = {
        response: mockErrorResponse(401),
        config: {
          url: '/api/protected',
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      }

      await expect(interceptor(error)).rejects.toThrow()

      // Should not throw when trying to access window.location
      // (just skip the redirect)

      // Restore window
      ;(globalThis as unknown as { window?: Window }).window = originalWindow
    })
  })

  describe('Regression Tests for Issue #9', () => {
    it('CRITICAL: Login failure should NOT trigger token refresh', async () => {
      // This is the exact scenario from Issue #9
      authStore.accessToken = null
      authStore.refreshTokenValue = null

      const loginError: AxiosError = {
        response: {
          status: 401,
          data: { detail: 'Invalid username or password' },
        } as unknown as AxiosError['response'],
        config: {
          url: '/api/auth/login',
          method: 'post',
          data: new FormData(), // Login uses FormData
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 401',
      }

      // Should reject with original error (not attempt refresh)
      await expect(interceptor(loginError)).rejects.toEqual(loginError)

      // Should NOT have attempted to call mockApiClient for retry
      expect(mockApiClient).not.toHaveBeenCalled()

      // Should NOT have cleared tokens or redirected
      // (auth store state should be unchanged from initial state)
    })

    it('CRITICAL: External login failure should NOT trigger token refresh', async () => {
      const externalLoginError: AxiosError = {
        response: {
          status: 401,
          data: { detail: 'Invalid credentials' },
        } as unknown as AxiosError['response'],
        config: {
          url: '/api/auth/external-login',
          method: 'post',
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      }

      await expect(interceptor(externalLoginError)).rejects.toEqual(externalLoginError)
      expect(mockApiClient).not.toHaveBeenCalled()
    })

    it('CRITICAL: Should allow error to bubble up to LoginView for display', async () => {
      // Verify the error is rejected (not swallowed) so LoginView can catch it
      const loginError: AxiosError = {
        response: {
          status: 401,
          data: { detail: 'Test error message' },
        } as unknown as AxiosError['response'],
        config: {
          url: '/api/auth/login',
          headers: mockHeaders(),
        } as InternalAxiosRequestConfig,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      }

      try {
        await interceptor(loginError)
        // Should not reach here
        expect.fail('Should have thrown error')
      } catch (error) {
        // Error should be the original login error
        expect(error).toEqual(loginError)
        expect((error as AxiosError).response?.data).toEqual({
          detail: 'Test error message',
        })
      }
    })
  })
})
