import { createApp, defineAsyncComponent } from 'vue'
import { installAppProviders, resolvePrimeUiLicense } from '@/app/providers'
import router from '@/core/router'
import { useAppConfigStore } from '@/core/stores/appConfig.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import {
  applyThemePreferences,
  getStoredThemePreferences,
} from '@/shared/composables/useThemeState'
import App from './App.vue'
import { registerOfflineIcons } from './core/icons.generated'

// Register offline icon data so @iconify/vue never calls api.iconify.design
registerOfflineIcons()

// Import global styles
import './app/styles/index.css'
import './assets/main.css'

const DefaultLayout = defineAsyncComponent(() => import('@/layouts/DefaultLayout.vue'))

function initializeRuntimeStores() {
  void useAuthStore().initialize()
  void useAppConfigStore().initialize()
}

async function bootstrap() {
  const primeUiLicense = await resolvePrimeUiLicense()
  const app = createApp(App)

  app.component('DefaultLayout', DefaultLayout)
  installAppProviders(app, router, primeUiLicense)
  applyThemePreferences(getStoredThemePreferences(), { persist: false })

  app.config.errorHandler = (error, _instance, info) => {
    console.error('Vue error:', error, info)
  }

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
  })

  window.addEventListener('error', (event) => {
    console.error('Window error:', event.error || event.message)
  })

  app.mount('#app')
  window.requestAnimationFrame(() => window.setTimeout(initializeRuntimeStores, 0))
}

void bootstrap()
