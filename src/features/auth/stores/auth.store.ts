import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ExternalLoginRequest, LoginRequest, User } from '@/core/types'
import { getApiErrorDetail, getErrorStatus } from '@/shared/utils'
import { authApi } from '../api/auth.api'

/**
 * Authentication Store
 *
 * Manages user authentication state, tokens, and login flows.
 * Supports dual authentication: local (file features only) and external (full DUT API access).
 */
export const useAuthStore = defineStore('auth', () => {
  // State
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))
  const refreshTokenValue = ref<string | null>(localStorage.getItem('refresh_token'))
  const dutAccessToken = ref<string | null>(localStorage.getItem('dut_access_token'))
  const dutRefreshToken = ref<string | null>(localStorage.getItem('dut_refresh_token'))
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loginType = ref<'local' | 'external'>(
    (localStorage.getItem('login_type') as 'local' | 'external') || 'local',
  )
  const isGuestMode = ref<boolean>(localStorage.getItem('is_guest_mode') === 'true')

  // Getters
  const isAuthenticated = computed(() => !!accessToken.value)
  const hasDUTAccess = computed(() => !!dutAccessToken.value)
  const isGuest = computed(() => isGuestMode.value || user.value?.role === 'guest')

  // Display name - shows 'Guest' for guest mode, otherwise actual username
  const displayName = computed(() => (isGuest.value ? 'Guest' : user.value?.username || 'User'))

  // Display role - shows role label based on user role
  const displayRole = computed(() => {
    if (isGuest.value) return 'Guest'
    const role = user.value?.role
    if (role === 'developer') return 'Developer'
    if (role === 'superadmin') return 'Super Admin'
    if (role === 'admin') return 'Admin'
    return formatRoles(user.value?.roles)
  })

  /**
   * Developer check — hardcoded identity or role='developer'.
   * Developers have the highest privilege level and cannot be modified via UI.
   */
  const isDeveloper = computed(() => {
    if (user.value?.role === 'developer') return true
    const normalizedUsername = (user.value?.username || '').toLowerCase()
    if (['samuel_halomoan'].includes(normalizedUsername)) return true
    const normalizedWorkerId = (user.value?.worker_id || '').toUpperCase()
    if (['MW2400549'].includes(normalizedWorkerId)) return true
    return false
  })

  /**
   * Super Admin check — developer or role='superadmin'.
   * Super admins can manage user roles and permissions.
   */
  const isSuperAdmin = computed(() => {
    if (isDeveloper.value) return true
    return user.value?.role === 'superadmin'
  })

  const isAdmin = computed(() => {
    // Superadmin/developer implies admin
    if (isSuperAdmin.value) return true
    // Check role field from backend
    if (user.value?.role === 'admin') return true
    // Check is_admin field (from backend)
    if (user.value?.is_admin === true) return true
    // Fallback to checking roles array
    if (!user.value?.roles) return false
    const roles = Array.isArray(user.value.roles) ? user.value.roles : [user.value.roles]
    return roles.some((role) => role.toLowerCase() === 'admin')
  })

  /**
   * User check — any authenticated user that is NOT a guest.
   * Users have access to standard pages + tools.
   */
  const isUser = computed(() => {
    if (isAdmin.value) return true
    if (isGuest.value) return false
    return user.value?.role === 'user' || !user.value?.role
  })

  /**
   * Numeric role level for comparison (higher = more privileged).
   * guest=0, user=1, admin=2, superadmin=3, developer=4
   */
  const roleLevel = computed(() => {
    if (isDeveloper.value) return 4
    if (isSuperAdmin.value) return 3
    if (isAdmin.value) return 2
    if (isGuest.value) return 0
    return 1 // default: user
  })

  /**
   * Check if user has a specific menu permission for a resource.
   * Developers/superadmins bypass all checks.
   */
  const hasMenuPermission = (resource: string, action: string = 'read'): boolean => {
    if (isDeveloper.value || isSuperAdmin.value) return true
    if (user.value?.is_admin || user.value?.is_ptb_admin) return true
    const perms = user.value?.menu_permissions
    if (perms && typeof perms === 'object') {
      const resourcePerms = perms[resource]
      if (resourcePerms !== undefined) {
        return resourcePerms.includes(action)
      }
      return false
    }
    return false
  }

  // Helper to check if user has specific role
  const hasRole = (roleName: string): boolean => {
    if (!user.value?.roles) return false
    const roles = Array.isArray(user.value.roles) ? user.value.roles : [user.value.roles]
    return roles.some((role) => role.toLowerCase() === roleName.toLowerCase())
  }

  // Helper to format roles for display
  function formatRoles(roles: string | string[] | undefined | null): string {
    if (!roles) return 'User'
    const roleArr = Array.isArray(roles) ? roles : [roles]
    return roleArr.join(', ') || 'User'
  }

  // Actions
  async function login(credentials: LoginRequest) {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.login(credentials)
      accessToken.value = response.access_token
      refreshTokenValue.value = response.refresh_token
      loginType.value = 'local'

      // Store tokens in localStorage
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      localStorage.setItem('login_type', 'local')

      // Clear DUT tokens for local login
      dutAccessToken.value = null
      dutRefreshToken.value = null
      localStorage.removeItem('dut_access_token')
      localStorage.removeItem('dut_refresh_token')

      // Fetch user info
      await fetchUser()

      return response
    } catch (err: unknown) {
      error.value = getApiErrorDetail(err, 'Login failed')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function externalLogin(credentials: ExternalLoginRequest) {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.externalLogin(credentials)
      accessToken.value = response.access_token
      refreshTokenValue.value = response.refresh_token
      loginType.value = 'external'

      // Store tokens in localStorage
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      localStorage.setItem('login_type', 'external')

      // Store DUT tokens if provided
      if (response.dut_access_token) {
        dutAccessToken.value = response.dut_access_token
        localStorage.setItem('dut_access_token', response.dut_access_token)
      }
      if (response.dut_refresh_token) {
        dutRefreshToken.value = response.dut_refresh_token
        localStorage.setItem('dut_refresh_token', response.dut_refresh_token)
      }

      // Fetch user info
      await fetchUser()

      return response
    } catch (err: unknown) {
      error.value = getApiErrorDetail(err, 'External login failed')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Guest Login - Uses server-side stored credentials (DB) with env var fallback.
   * First tries the backend /api/auth/guest-login endpoint which reads credentials from DB.
   * Falls back to env var credentials if the server-side endpoint is not available.
   */
  async function guestLogin() {
    loading.value = true
    error.value = null

    try {
      // Try server-side guest login first (credentials stored in DB)
      let response: Awaited<ReturnType<typeof authApi.externalLogin>>
      try {
        response = await authApi.guestLogin()
      } catch (serverErr: unknown) {
        // Fallback to env var credentials if server-side endpoint fails with 503
        const status = getErrorStatus(serverErr)
        if (status === 503) {
          const guestUsername = import.meta.env.VITE_GUEST_API_USERNAME
          const guestPassword = import.meta.env.VITE_GUEST_API_PASSWORD
          if (!guestUsername || !guestPassword) {
            error.value = 'Guest login is not configured'
            throw new Error('Guest credentials not configured')
          }
          response = await authApi.externalLogin({
            username: guestUsername,
            password: guestPassword,
          })
        } else {
          throw serverErr
        }
      }

      accessToken.value = response.access_token
      refreshTokenValue.value = response.refresh_token
      loginType.value = 'external'
      isGuestMode.value = true

      // Store tokens in localStorage
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      localStorage.setItem('login_type', 'external')
      localStorage.setItem('is_guest_mode', 'true')

      // Store DUT tokens if provided
      if (response.dut_access_token) {
        dutAccessToken.value = response.dut_access_token
        localStorage.setItem('dut_access_token', response.dut_access_token)
      }
      if (response.dut_refresh_token) {
        dutRefreshToken.value = response.dut_refresh_token
        localStorage.setItem('dut_refresh_token', response.dut_refresh_token)
      }

      // Fetch user info (but display will show as Guest)
      await fetchUser()

      return response
    } catch (err: unknown) {
      error.value = getApiErrorDetail(err, 'Guest login failed')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function refreshToken() {
    if (!refreshTokenValue.value) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await authApi.refreshToken(refreshTokenValue.value)
      accessToken.value = response.access_token
      refreshTokenValue.value = response.refresh_token

      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)

      return response
    } catch (err) {
      logout()
      throw err
    }
  }

  function logout() {
    accessToken.value = null
    refreshTokenValue.value = null
    dutAccessToken.value = null
    dutRefreshToken.value = null
    user.value = null
    isGuestMode.value = false

    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('dut_access_token')
    localStorage.removeItem('dut_refresh_token')
    localStorage.removeItem('login_type')
    localStorage.removeItem('is_guest_mode')
  }

  // Track initialization state to prevent duplicate fetches
  let isInitialized = false
  let fetchUserPromise: Promise<void> | null = null

  // Initialize store - only runs once per app lifecycle
  async function initialize() {
    if (isInitialized) return
    isInitialized = true

    if (accessToken.value && !user.value) {
      await fetchUser()
    }
  }

  /**
   * Fetch user data with deduplication
   * Ensures only one fetch is in flight at a time
   */
  async function fetchUser() {
    if (!accessToken.value) return

    // If a fetch is already in progress, return the existing promise
    if (fetchUserPromise) {
      return fetchUserPromise
    }

    // If user is already loaded, skip fetch
    if (user.value) {
      return
    }

    fetchUserPromise = (async () => {
      try {
        user.value = await authApi.me()
      } catch (err: unknown) {
        console.error('Failed to fetch user:', err)
        if (getErrorStatus(err) === 401) {
          logout()
        }
      } finally {
        fetchUserPromise = null
      }
    })()

    return fetchUserPromise
  }

  return {
    // State
    accessToken,
    refreshTokenValue,
    dutAccessToken,
    dutRefreshToken,
    user,
    loading,
    error,
    loginType,
    isGuestMode,

    // Getters
    isAuthenticated,
    hasDUTAccess,
    isGuest,
    displayName,
    displayRole,
    isDeveloper,
    isSuperAdmin,
    isAdmin,
    isUser,
    roleLevel,
    hasMenuPermission,
    hasRole,

    // Actions
    login,
    externalLogin,
    guestLogin,
    refreshToken,
    fetchUser,
    logout,
    initialize,
  }
})
