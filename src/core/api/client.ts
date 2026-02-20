/**
 * API Client
 *
 * Configured Axios instance with interceptors for:
 * - Authentication (JWT token injection)
 * - Error handling (token refresh, logout on failure)
 * - Request/response logging in development
 */

import axios, { type AxiosInstance } from 'axios'
import { APP_CONFIG } from '@/core/config'
import {
  authRequestErrorInterceptor,
  authRequestInterceptor,
  createErrorResponseInterceptor,
  errorResponseSuccessInterceptor,
} from './interceptors'

/**
 * Create and configure the main API client
 */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: APP_CONFIG.api.baseURL,
    timeout: APP_CONFIG.api.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
    // Serialize array parameters correctly for FastAPI
    // FastAPI expects: ?stations=value1&stations=value2
    // Not: ?stations[0]=value1&stations[1]=value2
    paramsSerializer: {
      indexes: null, // This tells axios to use repeated params for arrays
    },
  })

  // Request interceptors
  client.interceptors.request.use(authRequestInterceptor, authRequestErrorInterceptor)

  // Response interceptors
  client.interceptors.response.use(
    errorResponseSuccessInterceptor,
    createErrorResponseInterceptor(client),
  )

  return client
}

/**
 * Main API client instance
 *
 * Usage:
 * ```typescript
 * import apiClient from '@/core/api/client'
 *
 * const response = await apiClient.get('/api/endpoint')
 * const data = await apiClient.post('/api/endpoint', payload)
 * ```
 */
const apiClient = createApiClient()

export default apiClient
