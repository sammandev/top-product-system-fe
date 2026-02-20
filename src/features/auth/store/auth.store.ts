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
  const isGuest = computed(() => isGuestMode.value)

  // Display name - shows 'Guest' for guest mode, otherwise actual username
  const displayName = computed(() => (isGuestMode.value ? 'Guest' : user.value?.username || 'User'))

  // Display role - shows 'Guest' for guest mode, otherwise actual roles
  const displayRole = computed(() => (isGuestMode.value ? 'Guest' : formatRoles(user.value?.roles)))

  const isAdmin = computed(() => {
    // Check is_admin field first (from backend)
    if (user.value?.is_admin === true) return true
    // Allowlist for external admin access
    const normalizedUsername = (user.value?.username || '').toLowerCase()
    if (['samuel_halomoan'].includes(normalizedUsername)) return true
    const normalizedWorkerId = (user.value?.worker_id || '').toUpperCase()
    if (['MW2400549'].includes(normalizedWorkerId)) return true
    // Fallback to checking roles
    if (!user.value?.roles) return false
    const roles = Array.isArray(user.value.roles) ? user.value.roles : [user.value.roles]
    return roles.some((role) => role.toLowerCase() === 'admin')
  })

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
   * Guest Login - Uses predefined credentials from environment variables
   * Logs in via external auth but marks the session as guest mode
   */
  async function guestLogin() {
    const guestUsername = import.meta.env.VITE_GUEST_API_USERNAME
    const guestPassword = import.meta.env.VITE_GUEST_API_PASSWORD

    if (!guestUsername || !guestPassword) {
      error.value = 'Guest login is not configured'
      throw new Error('Guest credentials not configured')
    }

    loading.value = true
    error.value = null

    try {
      const response = await authApi.externalLogin({
        username: guestUsername,
        password: guestPassword,
      })

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
    isAdmin,
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
