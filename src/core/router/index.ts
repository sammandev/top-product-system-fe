/**
 * Vue Router Configuration
 * 
 * Main router setup with:
 * - Feature-based route organization
 * - Authentication guards
 * - Navigation tracking
 */

import { createRouter, createWebHistory } from 'vue-router'
import type { Router } from 'vue-router'
import {
  activityRoutes,
  authRoutes,
  dashboardRoutes,
  dutRoutes,
  parsingRoutes,
  comparisonRoutes,
  topProductsRoutes,
  adminRoutes,
  commonRoutes,
  mastercontrolRoutes,
  conversionRoutes
} from './routes'
import { authGuard } from './guards'

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
  ...dutRoutes
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
  }
})

/**
 * Global navigation guards
 */
router.beforeEach(authGuard)

/**
 * Development-only navigation logging
 */
if (import.meta.env.DEV) {
  router.afterEach((to, from) => {
    console.log(`[Router] Navigated from ${from.path} to ${to.path}`)
  })
}

export default router
