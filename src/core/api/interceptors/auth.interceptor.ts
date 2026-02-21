/**
 * Authentication Interceptor
 *
 * Handles adding JWT tokens to outgoing requests and ensures FormData requests
 * don't carry a manual Content-Type header (which would omit the multipart
 * boundary). Without the boundary FastAPI won't parse form fields and will
 * report missing fields.
 */

import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/features/auth/stores'

/**
 * Request interceptor to inject JWT token into Authorization header
 */
export function authRequestInterceptor(
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
  const authStore = useAuthStore()
  const token = authStore.accessToken

  // If the request body is FormData, remove any Content-Type header so the browser
  // / axios can set the proper `multipart/form-data; boundary=...` header.
  try {
    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData
    if (isFormData && config.headers) {
      // header keys may be lowercased or normal-cased depending on axios version/runtime
      const headers = config.headers as Record<string, unknown>
      if ('Content-Type' in headers) {
        delete headers['Content-Type']
      }
      if ('content-type' in headers) {
        delete headers['content-type']
      }
    }
  } catch (_e) {
    // defensive: if FormData isn't defined or check fails, continue normally
  }

  if (token && config.headers) {
    const headers = config.headers as Record<string, unknown>
    headers.Authorization = `Bearer ${token}`
  }

  return config
}

/**
 * Request error interceptor
 */
export function authRequestErrorInterceptor(error: AxiosError): Promise<never> {
  return Promise.reject(error)
}
