/**
 * Authentication Guard
 *
 * Navigation guard that protects routes requiring authentication.
 * Enforces the 5-role access hierarchy:
 *   guest → user → admin → superadmin → developer
 *
 * guest: only /dut/top-products/analysis and /dut/data-explorer (default)
 * user:  standard pages + tools (no admin/system)
 * admin: all pages except System Cleanup, App Config, Roles & Permissions, Menu Access
 * superadmin/developer: all pages
 */

import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores'

/** Paths a guest can always access (before menu_permissions grants). */
const GUEST_ALLOWED_PATHS = new Set(['/dut/top-products/analysis', '/dut/data-explorer'])

/** Default page for regular users (non-admin). */
const USER_DEFAULT_PATH = '/dut/top-products/analysis'

/** Default redirect for guest users when they try to access restricted pages. */
const GUEST_DEFAULT_PATH = '/dut/top-products/analysis'

/**
 * Check if route requires authentication and handle accordingly.
 *
 * Priority:
 * 1. Not authenticated → login
 * 2. requiresSuperAdmin → only superadmin/developer
 * 3. requiresAdmin → only admin/superadmin/developer
 * 4. Guest restrictions → only allowed paths
 * 5. User restrictions → no admin pages
 * 6. Login page while authenticated → dashboard
 */
export async function authGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
): Promise<void> {
  const authStore = useAuthStore()

  // Ensure user data is loaded if we have a token
  // The store handles deduplication - if a fetch is in progress, it returns the same promise
  if (authStore.accessToken && !authStore.user) {
    await authStore.fetchUser()
  }

  const requiresAuth = to.meta.requiresAuth !== false
  const requiresAdmin = to.meta.requiresAdmin === true
  const requiresSuperAdmin = to.meta.requiresSuperAdmin === true

  // Check if route requires authentication
  if (requiresAuth && !authStore.isAuthenticated) {
    next({
      name: 'Login',
      query: { redirect: to.fullPath },
    })
    return
  }

  // Check if route requires superadmin role (developer or superadmin)
  if (requiresSuperAdmin && !authStore.isSuperAdmin) {
    next({
      path: authStore.isAdmin ? '/dashboard' : USER_DEFAULT_PATH,
      query: { error: 'unauthorized' },
    })
    return
  }

  // Check if route requires admin role (admin, superadmin, developer)
  if (requiresAdmin && !authStore.isAdmin) {
    next({
      path: USER_DEFAULT_PATH,
      query: { error: 'unauthorized' },
    })
    return
  }

  // Guest restrictions: only allowed paths (unless granted via menu_permissions)
  if (authStore.isGuest && requiresAuth && !GUEST_ALLOWED_PATHS.has(to.path)) {
    // Check if guest has been granted access via menu_permissions
    const resource = routePathToResource(to.path)
    if (!resource || !authStore.hasMenuPermission(resource, 'read')) {
      next({ path: GUEST_DEFAULT_PATH })
      return
    }
  }

  // Prevent authenticated users from accessing login page
  if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ path: authStore.isAdmin ? '/dashboard' : USER_DEFAULT_PATH })
    return
  }

  // Allow navigation
  next()
}

/**
 * Map a route path to a menu_permissions resource name.
 * Returns undefined if no mapping exists (the route has no resource check).
 */
function routePathToResource(path: string): string | undefined {
  const mapping: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/dut/top-products/analysis': 'top_products',
    '/dut/top-products/data': 'top_products',
    '/dut/top-products/pa-trend': 'top_products',
    '/dut/analysis': 'dut_analysis',
    '/dut/data-explorer': 'dut_management',
    '/parsing': 'parsing',
    '/parsing/download-format': 'parsing',
    '/compare': 'comparison',
    '/compare/dvt-mc2': 'comparison',
    '/mastercontrol/analyze': 'mastercontrol',
    '/conversion/dvt-to-mc2': 'conversion',
    '/activity': 'activity',
    '/admin/users': 'admin_users',
    '/admin/rbac': 'admin_rbac',
    '/admin/cleanup': 'admin_cleanup',
    '/admin/app-config': 'admin_config',
    '/admin/menu-access': 'admin_menu_access',
    '/admin/access-control': 'admin_access_control',
  }
  return mapping[path]
}
