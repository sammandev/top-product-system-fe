import { createApp, defineAsyncComponent } from 'vue'
import { installAppProviders, resolvePrimeUiLicense } from '@/app/providers'
import { envConfig } from '@/core/config/env.config'
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
let sentryProviderPromise: Promise<typeof import('@/app/providers/sentry')> | null = null

function loadSentryProvider() {
  sentryProviderPromise ??= import('@/app/providers/sentry')
  return sentryProviderPromise
}

function initializeErrorTracking(app: ReturnType<typeof createApp>) {
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

function initializeRuntimeStores() {
  void useAuthStore().initialize()
  void useAppConfigStore().initialize()
}

async function bootstrap() {
  const primeUiLicense = await resolvePrimeUiLicense()
  const app = createApp(App)

  app.component('DefaultLayout', DefaultLayout)
  initializeErrorTracking(app)
  installAppProviders(app, router, primeUiLicense)
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

  app.mount('#app')
  window.requestAnimationFrame(() => window.setTimeout(initializeRuntimeStores, 0))
}

void bootstrap()
