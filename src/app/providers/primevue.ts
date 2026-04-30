import Aura from '@primeuix/themes/aura'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import type { App } from 'vue'
import { getPrimeVuePreset, getStoredThemePreferences } from '@/shared/composables'

const initialThemePreferences = getStoredThemePreferences()

export const primeVueOptions = {
  ripple: true,
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

export function installPrimeVue(app: App) {
  app.use(PrimeVue, primeVueOptions)
  app.use(ToastService)
}
