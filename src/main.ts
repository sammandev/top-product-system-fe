import { createApp } from 'vue'
import { initializeSentry, installAppProviders } from '@/app/providers'
import { envConfig } from '@/core/config/env.config'
import router from '@/core/router'
import { useAppConfigStore } from '@/core/stores/appConfig.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { applyThemePreferences, getStoredThemePreferences } from '@/shared/composables'
import App from './App.vue'

// Import global styles
import './app/styles/index.css'
import './assets/main.css'

const app = createApp(App)

// Register global layout component used by 23+ views
app.component('DefaultLayout', DefaultLayout)

initializeSentry(app, router)
installAppProviders(app, router)
applyThemePreferences(getStoredThemePreferences(), { persist: false })

app.config.errorHandler = (error, _instance, info) => {
  console.error('Vue error:', error, info)
  if (envConfig.sentryDsn) {
    void import('@sentry/vue').then(({ captureException }) => captureException(error))
  }
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  if (envConfig.sentryDsn) {
    void import('@sentry/vue').then(({ captureException }) => captureException(event.reason))
  }
})

window.addEventListener('error', (event) => {
  console.error('Window error:', event.error || event.message)
  if (envConfig.sentryDsn) {
    void import('@sentry/vue').then(({ captureException }) =>
      captureException(event.error || event.message),
    )
  }
})

// Initialize stores
const authStore = useAuthStore()
authStore.initialize()

const appConfigStore = useAppConfigStore()
appConfigStore.initialize()

app.mount('#app')
