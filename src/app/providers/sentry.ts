import type { App } from 'vue'
import type { Router } from 'vue-router'
import { envConfig } from '@/core/config/env.config'

type SentryModule = typeof import('@sentry/vue')

let sentryModulePromise: Promise<SentryModule> | null = null

function loadSentryModule(): Promise<SentryModule> {
  sentryModulePromise ??= import('@sentry/vue')
  return sentryModulePromise
}

export function initializeSentry(app: App, router: Router) {
  if (!envConfig.sentryDsn) {
    return
  }

  void loadSentryModule().then((Sentry) => {
    Sentry.init({
      app,
      dsn: envConfig.sentryDsn,
      integrations: [Sentry.browserTracingIntegration({ router })],
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.0),
      environment: import.meta.env.MODE,
      release: envConfig.appVersion,
    })
  })
}

export function captureFrontendException(error: unknown) {
  if (!envConfig.sentryDsn) {
    return
  }

  void loadSentryModule().then((Sentry) => {
    Sentry.captureException(error)
  })
}
