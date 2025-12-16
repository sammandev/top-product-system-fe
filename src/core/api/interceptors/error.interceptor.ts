/**
 * Error Interceptor
 * 
 * Handles API errors including:
 * - Token refresh on 401 Unauthorized
 * - Automatic logout on refresh failure
 * - Global error handling
 */

import type { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { AxiosInstance } from 'axios'
import { useAuthStore } from '@/features/auth/store'

/**
 * Response success interceptor (pass-through)
 */
export function errorResponseSuccessInterceptor(response: AxiosResponse): AxiosResponse {
  return response
}

/**
 * Response error interceptor with automatic token refresh
 * 
 * @param apiClient - Axios instance for retrying failed requests
 */
export function createErrorResponseInterceptor(apiClient: AxiosInstance) {
  return async (error: AxiosError): Promise<any> => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    console.log('[API Interceptor] Error caught', {
      status: error.response?.status,
      url: originalRequest?.url,
      method: originalRequest?.method,
      errorMessage: error.message,
      errorDetail: (error.response?.data as any)?.detail
    });

    // Skip token refresh for login and refresh endpoints
    const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/login') || 
                          originalRequest?.url?.includes('/api/auth/external-login') ||
                          originalRequest?.url?.includes('/api/auth/token/refresh')

    // Handle 401 Unauthorized - attempt token refresh (except for auth endpoints)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      console.log('[API Interceptor] 401 Unauthorized - attempting token refresh', {
        url: originalRequest.url,
        isRetry: originalRequest._retry
      });

      originalRequest._retry = true

      try {
        const authStore = useAuthStore()
        
        console.log('[API Interceptor] Attempting to refresh token...');
        // Attempt to refresh the token
        await authStore.refreshToken()

        console.log('[API Interceptor] Token refreshed successfully, retrying original request');

        // Update Authorization header with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`
        }

        // Retry the original request
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed - logout user and redirect to login
        console.error('[API Interceptor] Token refresh failed - logging out user', refreshError);
        const authStore = useAuthStore()
        authStore.logout()
        
        // Redirect to login page
        if (typeof window !== 'undefined') {
          console.log('[API Interceptor] Redirecting to login page');
          window.location.href = '/login'
        }
        
        return Promise.reject(refreshError)
      }
    }

    // Log other errors
    if (error.response?.status && error.response.status !== 401) {
      console.error('[API Interceptor] HTTP error', {
        status: error.response.status,
        url: originalRequest?.url,
        detail: (error.response.data as any)?.detail || error.message
      });
    }

    // Handle other errors
    return Promise.reject(error)
  }
}
