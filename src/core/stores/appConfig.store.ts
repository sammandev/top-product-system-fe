import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { appConfigApi } from '@/core/api/appConfigApi'
import { APP_CONFIG } from '@/core/config'
import { envConfig } from '@/core/config/env.config'
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

const DEFAULT_FAVICON_HREF = '/icon.svg'

/**
 * Update the <link rel="icon"> element in <head> to point at the given URL,
 * or revert to the default favicon when url is null.
 */
function _applyFavicon(url: string | null | undefined): void {
  const href = url || DEFAULT_FAVICON_HREF
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  // Append a cache-busting param so the browser re-fetches immediately
  link.href = url ? `${href}?t=${Date.now()}` : href
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
  const tabTitle = computed(() => config.value.tab_title || envConfig.appTitle || APP_CONFIG.name)
  const faviconUrl = computed(() => config.value.favicon_url || null)

  // Live-update browser tab title whenever config changes
  watch(tabTitle, (title) => {
    document.title = title
  }, { immediate: true })

  // Live-update favicon whenever config changes
  watch(faviconUrl, (url) => {
    _applyFavicon(url)
  }, { immediate: true })

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
    tabTitle,
    faviconUrl,
    fetchConfig,
    updateConfig,
    initialize,
  }
})
