/**
 * Vue Router Configuration
 *
 * Main router setup with:
 * - Feature-based route organization
 * - Authentication guards
 * - Navigation tracking
 * - Navigation loading state
 */

import type { Router } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { useAppConfigStore } from '@/core/stores/appConfig.store'
import { authGuard } from './guards'
import {
  activityRoutes,
  adminRoutes,
  authRoutes,
  commonRoutes,
  comparisonRoutes,
  conversionRoutes,
  dashboardRoutes,
  dutRoutes,
  mastercontrolRoutes,
  parsingRoutes,
  topProductsRoutes,
} from './routes'

/**
 * Combine all feature routes
 */
const routes = [
  ...commonRoutes,
  ...authRoutes,
  ...dashboardRoutes,
  ...activityRoutes,
  ...parsingRoutes,
  ...comparisonRoutes,
  ...topProductsRoutes,
  ...mastercontrolRoutes,
  ...conversionRoutes,
  ...adminRoutes,
  ...dutRoutes,
]

/**
 * Create router instance
 */
const router: Router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    // Restore scroll position when using back button
    if (savedPosition) {
      return savedPosition
    }
    // Scroll to top for new routes
    return { top: 0 }
  },
})

/**
 * Global navigation guards
 */
router.beforeEach((to, from, next) => {
  // Set navigation loading state immediately
  const appConfigStore = useAppConfigStore()
  appConfigStore.isNavigating = true

  // Call auth guard
  authGuard(to, from, next)
})

router.afterEach(() => {
  // Clear navigation loading state after navigation completes
  const appConfigStore = useAppConfigStore()
  appConfigStore.isNavigating = false
})

/**
 * Development-only navigation logging
 */
if (import.meta.env.DEV) {
  router.afterEach((to, from) => {
    console.log(`[Router] Navigated from ${from.path} to ${to.path}`)
  })
}

export default router
