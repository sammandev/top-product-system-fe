import { apiClient } from '@/core/api'
import type { AppConfig, AppConfigUpdateRequest } from '@/core/types'

export const appConfigApi = {
  async get(): Promise<AppConfig> {
    const { data } = await apiClient.get<AppConfig>('/api/app-config')
    return data
  },

  async update(payload: AppConfigUpdateRequest): Promise<AppConfig> {
    const { data } = await apiClient.put<AppConfig>('/api/app-config', payload)
    return data
  },
}
