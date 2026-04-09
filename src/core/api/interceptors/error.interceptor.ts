/**
 * Error Interceptor
 *
 * Handles API errors including:
 * - Token refresh on 401 Unauthorized
 * - Automatic logout on refresh failure
 * - Global error handling
 *
 * NOTE: This interceptor uses router.push() instead of window.location.href
 * to avoid full page reloads which would cause loss of analysis results.
 */

import type { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { Router } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores'

// Router instance will be injected after router is created
let routerInstance: Router | null = null
const shouldLogInterceptorDebug = import.meta.env.DEV

function debugLog(message: string, payload?: unknown): void {
  if (!shouldLogInterceptorDebug) {
    return
  }

  if (payload === undefined) {
    console.log(message)
    return
  }

  console.log(message, payload)
}

function debugError(message: string, payload?: unknown): void {
  if (!shouldLogInterceptorDebug) {
    return
  }

  if (payload === undefined) {
    console.error(message)
    return
  }

  console.error(message, payload)
}

/**
 * Set the router instance for navigation
 * This should be called from main.ts after router is created
 */
export function setRouterInstance(router: Router): void {
  routerInstance = router
}

/**
 * Response success interceptor (pass-through)
 */
export function errorResponseSuccessInterceptor(response: AxiosResponse): AxiosResponse {
  return response
}

function extractErrorDetail(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined
  }

  const detail = (data as Record<string, unknown>).detail
  return typeof detail === 'string' ? detail : undefined
}

/**
 * Response error interceptor with automatic token refresh
 *
 * @param apiClient - Axios instance for retrying failed requests
 */
export function createErrorResponseInterceptor(apiClient: AxiosInstance) {
  return async (error: AxiosError): Promise<unknown> => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    debugLog('[API Interceptor] Error caught', {
      status: error.response?.status,
      url: originalRequest?.url,
      method: originalRequest?.method,
      errorMessage: error.message,
      errorDetail: extractErrorDetail(error.response?.data),
    })

    // Skip token refresh for login and refresh endpoints
    const isAuthEndpoint =
      originalRequest?.url?.includes('/api/auth/login') ||
      originalRequest?.url?.includes('/api/auth/external-login') ||
      originalRequest?.url?.includes('/api/auth/token/refresh')

    // Handle 401 Unauthorized - attempt token refresh (except for auth endpoints)
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      debugLog('[API Interceptor] 401 Unauthorized - attempting token refresh', {
        url: originalRequest.url,
        isRetry: originalRequest._retry,
      })

      originalRequest._retry = true

      try {
        const authStore = useAuthStore()

        debugLog('[API Interceptor] Attempting to refresh token...')
        // Attempt to refresh the token
        await authStore.refreshToken()

        debugLog('[API Interceptor] Token refreshed successfully, retrying original request')

        // Update Authorization header with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`
        }

        // Retry the original request
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed - logout user and redirect to login
        debugError('[API Interceptor] Token refresh failed - logging out user', refreshError)
        const authStore = useAuthStore()
        authStore.logout()

        // Redirect to login page using Vue Router (avoids full page reload)
        // This preserves any in-memory state in other tabs/components
        if (routerInstance) {
          debugLog('[API Interceptor] Redirecting to login page via router')
          routerInstance.push({
            name: 'Login',
            query: {
              redirect: originalRequest?.url || '/',
              reason: 'session_expired',
            },
          })
        } else if (typeof window !== 'undefined') {
          // Fallback to window.location only if router is not available
          debugLog('[API Interceptor] Router not available, using window.location')
          window.location.href = '/login?reason=session_expired'
        }

        return Promise.reject(refreshError)
      }
    }

    // Log other errors
    if (error.response?.status && error.response.status !== 401) {
      debugError('[API Interceptor] HTTP error', {
        status: error.response.status,
        url: originalRequest?.url,
        detail: extractErrorDetail(error.response.data) || error.message,
      })
    }

    // Handle other errors
    return Promise.reject(error)
  }
}
