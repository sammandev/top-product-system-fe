import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { ExternalLoginRequest, LoginRequest } from '@/core/types'
import { useAuthStore } from '../stores'

/**
 * Auth Composable
 *
 * Provides a convenient interface for authentication operations.
 * Wraps the auth store with additional business logic and router integration.
 *
 * @example
 * ```typescript
 * const { isAuthenticated, login, logout } = useAuth()
 *
 * if (isAuthenticated.value) {
 *   console.log('User is logged in')
 * }
 *
 * await login({ username: 'user', password: 'pass' })
 * ```
 */
export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  // Computed properties
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const hasDUTAccess = computed(() => authStore.hasDUTAccess)
  const user = computed(() => authStore.user)
  const loading = computed(() => authStore.loading)
  const error = computed(() => authStore.error)
  const loginType = computed(() => authStore.loginType)

  /**
   * Perform local login
   * Redirects to dashboard on success
   */
  async function login(credentials: LoginRequest) {
    try {
      await authStore.login(credentials)
      const redirect = router.currentRoute.value.query.redirect as string
      await router.push(redirect || '/dashboard')
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  /**
   * Perform external login with DUT credentials
   * Redirects to dashboard on success
   */
  async function externalLogin(credentials: ExternalLoginRequest) {
    try {
      await authStore.externalLogin(credentials)
      const redirect = router.currentRoute.value.query.redirect as string
      await router.push(redirect || '/dashboard')
    } catch (error) {
      console.error('External login failed:', error)
      throw error
    }
  }

  /**
   * Perform guest login using predefined credentials
   * Redirects to dashboard on success
   */
  async function guestLogin() {
    try {
      await authStore.guestLogin()
      const redirect = router.currentRoute.value.query.redirect as string
      await router.push(redirect || '/dashboard')
    } catch (error) {
      console.error('Guest login failed:', error)
      throw error
    }
  }

  /**
   * Logout and redirect to login page
   */
  async function logout() {
    authStore.logout()
    await router.push('/login')
  }

  /**
   * Refresh authentication token
   */
  async function refreshToken() {
    return authStore.refreshToken()
  }

  /**
   * Check if user has specific permission
   * (placeholder for future RBAC implementation)
   */
  function hasPermission(_permission: string): boolean {
    // TODO: Implement permission checking when RBAC is added
    return isAuthenticated.value
  }

  return {
    // State
    isAuthenticated,
    hasDUTAccess,
    user,
    loading,
    error,
    loginType,

    // Actions
    login,
    externalLogin,
    guestLogin,
    logout,
    refreshToken,
    hasPermission,
  }
}
