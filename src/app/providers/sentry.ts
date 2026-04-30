import * as Sentry from '@sentry/vue'
import type { App } from 'vue'
import type { Router } from 'vue-router'
import { envConfig } from '@/core/config/env.config'

export function initializeSentry(app: App, router: Router) {
  if (!envConfig.sentryDsn) {
    return
  }

  Sentry.init({
    app,
    dsn: envConfig.sentryDsn,
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.0),
    environment: import.meta.env.MODE,
    release: envConfig.appVersion,
  })
}
