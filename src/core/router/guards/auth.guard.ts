/**
 * Authentication Guard
 * 
 * Navigation guard that protects routes requiring authentication
 * Optimized to prevent redundant API calls during navigation
 */

import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'

// Track if initial user fetch has been done this session
let initialFetchDone = false

/**
 * Check if route requires authentication and handle accordingly
 * 
 * Behavior:
 * - If route requires auth and user is not authenticated → redirect to login
 * - If route requires admin and user is not admin → redirect to dashboard
 * - If route is login and user is authenticated → redirect to dashboard
 * - Otherwise → allow navigation
 * 
 * Performance: Only fetches user data once per session (on first protected route)
 */
export async function authGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> {
  const authStore = useAuthStore()
  
  // Only fetch user data once per session when we have a token but no user data
  // This prevents redundant API calls on every navigation
  if (authStore.accessToken && !authStore.user && !initialFetchDone) {
    initialFetchDone = true
    await authStore.fetchUser()
  }

  const requiresAuth = to.meta.requiresAuth !== false
  const requiresAdmin = to.meta.requiresAdmin === true

  // Check if route requires authentication
  if (requiresAuth && !authStore.isAuthenticated) {
    // Reset flag on logout so next login will fetch user
    initialFetchDone = false
    // User not authenticated, redirect to login with return path
    next({
      name: 'Login',
      query: { redirect: to.fullPath }
    })
    return
  }

  // Check if route requires admin role
  if (requiresAdmin && !authStore.isAdmin) {
    // User not admin, redirect to dashboard
    next({
      name: 'Dashboard',
      query: { error: 'unauthorized' }
    })
    return
  }

  // Prevent authenticated users from accessing login page
  if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'Dashboard' })
    return
  }

  // Allow navigation
  next()
}
