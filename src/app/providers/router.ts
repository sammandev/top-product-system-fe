import type { App } from 'vue'
import type { Router } from 'vue-router'
import { setRouterInstance } from '@/core/api/interceptors'

export function installRouter(app: App, router: Router) {
  setRouterInstance(router)
  app.use(router)
}
