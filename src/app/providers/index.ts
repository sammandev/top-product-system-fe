import type { App } from 'vue'
import type { Router } from 'vue-router'
import { pinia } from '@/core/plugins'
import { installPrimeVue } from './primevue'
import { installQueryClient } from './query-client'
import { installRouter } from './router'

export { primeVueOptions } from './primevue'
export { createAppQueryClient, queryClient } from './query-client'
export { initializeSentry } from './sentry'

export function installAppProviders(app: App, router: Router) {
  app.use(pinia)
  installRouter(app, router)
  installPrimeVue(app)
  installQueryClient(app)
}
