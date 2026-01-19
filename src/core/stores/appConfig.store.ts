import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { appConfigApi } from '@/core/api/appConfigApi'
import { APP_CONFIG } from '@/core/config'
import type { AppConfig, AppConfigUpdateRequest } from '@/core/types'

const fallbackConfig: AppConfig = {
  name: APP_CONFIG.name,
  version: APP_CONFIG.version,
  description: APP_CONFIG.description
}

export const useAppConfigStore = defineStore('appConfig', () => {
  const config = ref<AppConfig>({ ...fallbackConfig })
  const loading = ref(false)
  const error = ref<string | null>(null)

  const appName = computed(() => config.value.name || APP_CONFIG.name)
  const appVersion = computed(() => config.value.version || APP_CONFIG.version)
  const appDescription = computed(() => config.value.description || APP_CONFIG.description)

  async function fetchConfig(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const data = await appConfigApi.get()
      config.value = { ...fallbackConfig, ...data }
    } catch (err: any) {
      error.value = err?.message || 'Failed to load app configuration'
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
    } catch (err: any) {
      error.value = err?.response?.data?.detail || err?.message || 'Failed to update app configuration'
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
    appName,
    appVersion,
    appDescription,
    fetchConfig,
    updateConfig,
    initialize
  }
})
