import { createApp } from 'vue'
import App from './App.vue'
import router from '@/core/router'
import { pinia, vuetify } from '@/core/plugins'
import { useAuthStore } from '@/features/auth/store'
import { useAppConfigStore } from '@/core/stores/appConfig.store'
import { envConfig } from '@/core/config/env.config'
import * as Sentry from '@sentry/vue'

// Import global styles
import './assets/main.css'

const app = createApp(App)

if (envConfig.sentryDsn) {
    Sentry.init({
        app,
        dsn: envConfig.sentryDsn,
        integrations: [
            Sentry.browserTracingIntegration({ router })
        ],
        tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.0),
        environment: import.meta.env.MODE,
        release: envConfig.appVersion
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
