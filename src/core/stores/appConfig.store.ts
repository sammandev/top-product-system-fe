import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { appConfigApi } from '@/core/api/appConfigApi'
import { APP_CONFIG } from '@/core/config'
import type { AppConfig, AppConfigUpdateRequest } from '@/core/types'

const fallbackConfig: AppConfig = {
  name: APP_CONFIG.name,
  version: APP_CONFIG.version,
  description: APP_CONFIG.description,
}

function getErrorMessage(err: unknown): string | null {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }
  return null
}

function getErrorDetail(err: unknown): string | null {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: unknown }).response
    if (response && typeof response === 'object' && 'data' in response) {
      const data = (response as { data?: unknown }).data
      if (data && typeof data === 'object' && 'detail' in data) {
        const detail = (data as { detail?: unknown }).detail
        if (typeof detail === 'string') {
          return detail
        }
      }
    }
  }
  return null
}

export const useAppConfigStore = defineStore('appConfig', () => {
  const config = ref<AppConfig>({ ...fallbackConfig })
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Navigation loading state
  const isNavigating = ref(false)

  const appName = computed(() => config.value.name || APP_CONFIG.name)
  const appVersion = computed(() => config.value.version || APP_CONFIG.version)
  const appDescription = computed(() => config.value.description || APP_CONFIG.description)

  async function fetchConfig(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const data = await appConfigApi.get()
      config.value = { ...fallbackConfig, ...data }
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to load app configuration'
      config.value = { ...fallbackConfig }
    } finally {
      loading.value = false
    }
  }

  async function updateConfig(payload: AppConfigUpdateRequest): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const data = await appConfigApi.update(payload)
      config.value = { ...fallbackConfig, ...data }
    } catch (err: unknown) {
      error.value =
        getErrorDetail(err) || getErrorMessage(err) || 'Failed to update app configuration'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function initialize(): Promise<void> {
    if (!config.value?.name || config.value.name === APP_CONFIG.name) {
      await fetchConfig()
    }
  }

  return {
    config,
    loading,
    error,
    isNavigating,
    appName,
    appVersion,
    appDescription,
    fetchConfig,
    updateConfig,
    initialize,
  }
})
