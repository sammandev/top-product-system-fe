import { createApp, defineAsyncComponent } from 'vue'
import { installAppProviders } from '@/app/providers'
import { envConfig } from '@/core/config/env.config'
import router from '@/core/router'
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

const app = createApp(App)
const DefaultLayout = defineAsyncComponent(() => import('@/layouts/DefaultLayout.vue'))
let sentryProviderPromise: Promise<typeof import('@/app/providers/sentry')> | null = null

function loadSentryProvider() {
  sentryProviderPromise ??= import('@/app/providers/sentry')
  return sentryProviderPromise
}

function initializeErrorTracking() {
  if (!envConfig.sentryDsn) {
    return
  }

  void loadSentryProvider().then(({ initializeSentry }) => {
    initializeSentry(app, router)
  })
}

function captureRuntimeException(error: unknown) {
  if (!envConfig.sentryDsn) {
    return
  }

  void loadSentryProvider().then(({ captureFrontendException }) => {
    captureFrontendException(error)
  })
}

app.component('DefaultLayout', DefaultLayout)

initializeErrorTracking()
installAppProviders(app, router)
applyThemePreferences(getStoredThemePreferences(), { persist: false })

app.config.errorHandler = (error, _instance, info) => {
  console.error('Vue error:', error, info)
  captureRuntimeException(error)
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  captureRuntimeException(event.reason)
})

window.addEventListener('error', (event) => {
  console.error('Window error:', event.error || event.message)
  captureRuntimeException(event.error || event.message)
})

function initializeRuntimeStores() {
  void import('@/features/auth/stores/auth.store').then(({ useAuthStore }) => {
    void useAuthStore().initialize()
  })
  void import('@/core/stores/appConfig.store').then(({ useAppConfigStore }) => {
    void useAppConfigStore().initialize()
  })
}

app.mount('#app')

window.requestAnimationFrame(() => {
  window.setTimeout(initializeRuntimeStores, 0)
})
