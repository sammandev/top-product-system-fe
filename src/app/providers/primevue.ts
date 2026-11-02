import Aura from '@primeuix/themes/aura'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import type { App } from 'vue'
import { APP_CONFIG } from '@/core/config'
import { getPrimeVuePreset, getStoredThemePreferences } from '@/shared/composables'

const initialThemePreferences = getStoredThemePreferences()

export function createPrimeVueOptions(license = APP_CONFIG.ui.primeUiLicense) {
  return {
    ripple: true,
    license,
    theme: {
      preset: getPrimeVuePreset(initialThemePreferences) ?? Aura,
      options: {
        prefix: 'p',
        darkModeSelector: '.app-dark',
        cssLayer: {
          name: 'primevue',
          order: 'theme, base, components, primevue, utilities',
        },
      },
    },
    zIndex: {
      modal: 1400,
      overlay: 1300,
      menu: 1350,
      tooltip: 1450,
    },
  }
}

export const primeVueOptions = createPrimeVueOptions()

export const PRIMEUI_LICENSE_STORAGE_KEY = 'primeui-license-cache'

function readCachedLicense(): string | null {
  try {
    const value = window.localStorage.getItem(PRIMEUI_LICENSE_STORAGE_KEY)
    return value && value.trim() ? value.trim() : null
  } catch {
    return null
  }
}

function writeCachedLicense(license: string) {
  try {
    window.localStorage.setItem(PRIMEUI_LICENSE_STORAGE_KEY, license)
  } catch {
    // Storage unavailable (private mode/quota); the next load simply fetches again.
  }
}

/**
 * Returns the cached license immediately when available (refreshing it in the
 * background for the next load), so app startup is not blocked on the API.
 */
export async function resolvePrimeUiLicense(): Promise<string> {
  const cached = readCachedLicense()
  if (cached) {
    void fetchPrimeUiLicense()
    return cached
  }
  return fetchPrimeUiLicense()
}

async function fetchPrimeUiLicense(): Promise<string> {
  const baseUrl = APP_CONFIG.api.baseURL.replace(/\/$/, '')
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 1500)

  try {
    const response = await fetch(`${baseUrl}/api/app-config/primeui-license/runtime`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (response.ok) {
      const payload = (await response.json()) as { license?: unknown }
      if (typeof payload.license === 'string' && payload.license.trim()) {
        const license = payload.license.trim()
        writeCachedLicense(license)
        return license
      }
    }
  } catch {
    // The bundled key keeps startup independent from API availability.
  } finally {
    window.clearTimeout(timeoutId)
  }

  return APP_CONFIG.ui.primeUiLicense
}

export function installPrimeVue(app: App, license?: string) {
  app.use(PrimeVue, createPrimeVueOptions(license))
  app.use(ToastService)
}
