import * as Sentry from '@sentry/vue'
import { createApp } from 'vue'
import { setRouterInstance } from '@/core/api/interceptors'
import { envConfig } from '@/core/config/env.config'
import { pinia, vuetify } from '@/core/plugins'
import router from '@/core/router'
import { useAppConfigStore } from '@/core/stores/appConfig.store'
import { useAuthStore } from '@/features/auth/stores'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import App from './App.vue'

// Import global styles
import './assets/main.css'

const app = createApp(App)

// Register global layout component used by 23+ views
app.component('DefaultLayout', DefaultLayout)

// Inject router instance into API interceptors for proper navigation
// This allows error interceptor to use router.push() instead of window.location.href
// which prevents full page reloads that would lose analysis results
setRouterInstance(router)

if (envConfig.sentryDsn) {
  Sentry.init({
    app,
    dsn: envConfig.sentryDsn,
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.0),
    environment: import.meta.env.MODE,
    release: envConfig.appVersion,
  })
}

app.use(pinia)
app.use(router)
app.use(vuetify)

app.config.errorHandler = (error, _instance, info) => {
  console.error('Vue error:', error, info)
  if (envConfig.sentryDsn) {
    Sentry.captureException(error)
  }
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  if (envConfig.sentryDsn) {
    Sentry.captureException(event.reason)
  }
})

window.addEventListener('error', (event) => {
  console.error('Window error:', event.error || event.message)
  if (envConfig.sentryDsn) {
    Sentry.captureException(event.error || event.message)
  }
})

// Initialize stores
const authStore = useAuthStore()
authStore.initialize()

const appConfigStore = useAppConfigStore()
appConfigStore.initialize()

app.mount('#app')
