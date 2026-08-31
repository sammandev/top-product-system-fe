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

export async function resolvePrimeUiLicense(): Promise<string> {
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
        return payload.license.trim()
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
