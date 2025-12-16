/**
 * Authentication Guard
 * 
 * Navigation guard that protects routes requiring authentication
 */

import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'

/**
 * Check if route requires authentication and handle accordingly
 * 
 * Behavior:
 * - If route requires auth and user is not authenticated → redirect to login
 * - If route requires admin and user is not admin → redirect to dashboard
 * - If route is login and user is authenticated → redirect to dashboard
 * - Otherwise → allow navigation
 */
export async function authGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> {
  const authStore = useAuthStore()
  
  // Wait for auth store to initialize if there's a token
  if (authStore.accessToken && !authStore.user) {
    await authStore.fetchUser()
  }

  const requiresAuth = to.meta.requiresAuth !== false
  const requiresAdmin = to.meta.requiresAdmin === true

  // Check if route requires authentication
  if (requiresAuth && !authStore.isAuthenticated) {
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
