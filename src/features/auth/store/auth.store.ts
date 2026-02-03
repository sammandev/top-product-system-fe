import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api/auth.api'
import type { LoginRequest, ExternalLoginRequest, User } from '@/core/types'

/**
 * Authentication Store
 * 
 * Manages user authentication state, tokens, and login flows.
 * Supports dual authentication: local (file features only) and external (full DUT API access).
 * 
 * IMPORTANT: Uses sessionStorage instead of localStorage to prevent cross-tab/cross-user
 * token conflicts. Each browser tab maintains its own session. This means users need to
 * log in for each new tab, but prevents User B's login from invalidating User A's session.
 */
export const useAuthStore = defineStore('auth', () => {
  // State - use sessionStorage for session-isolated auth tokens
  const accessToken = ref<string | null>(sessionStorage.getItem('access_token'))
  const refreshTokenValue = ref<string | null>(sessionStorage.getItem('refresh_token'))
  const dutAccessToken = ref<string | null>(sessionStorage.getItem('dut_access_token'))
  const dutRefreshToken = ref<string | null>(sessionStorage.getItem('dut_refresh_token'))
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loginType = ref<'local' | 'external'>(
    (sessionStorage.getItem('login_type') as 'local' | 'external') || 'local'
  )
  const isGuestMode = ref<boolean>(sessionStorage.getItem('is_guest_mode') === 'true')

  // Getters
  const isAuthenticated = computed(() => !!accessToken.value)
  const hasDUTAccess = computed(() => !!dutAccessToken.value)
  const isGuest = computed(() => isGuestMode.value)
  
  // Display name - shows 'Guest' for guest mode, otherwise actual username
  const displayName = computed(() => isGuestMode.value ? 'Guest' : (user.value?.username || 'User'))
  
  // Display role - shows 'Guest' for guest mode, otherwise actual roles
  const displayRole = computed(() => isGuestMode.value ? 'Guest' : formatRoles(user.value?.roles))
  
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
    return roles.some(role => role.toLowerCase() === 'admin')
  })

  // Helper to check if user has specific role
  const hasRole = (roleName: string): boolean => {
    if (!user.value?.roles) return false
    const roles = Array.isArray(user.value.roles) ? user.value.roles : [user.value.roles]
    return roles.some(role => role.toLowerCase() === roleName.toLowerCase())
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

      // Store tokens in sessionStorage (session-isolated)
      sessionStorage.setItem('access_token', response.access_token)
      sessionStorage.setItem('refresh_token', response.refresh_token)
      sessionStorage.setItem('login_type', 'local')

      // Clear DUT tokens for local login
      dutAccessToken.value = null
      dutRefreshToken.value = null
      sessionStorage.removeItem('dut_access_token')
      sessionStorage.removeItem('dut_refresh_token')

      // Fetch user info
      await fetchUser()

      return response
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Login failed'
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

      // Store tokens in sessionStorage (session-isolated)
      sessionStorage.setItem('access_token', response.access_token)
      sessionStorage.setItem('refresh_token', response.refresh_token)
      sessionStorage.setItem('login_type', 'external')

      // Store DUT tokens if provided
      if (response.dut_access_token) {
        dutAccessToken.value = response.dut_access_token
        sessionStorage.setItem('dut_access_token', response.dut_access_token)
      }
      if (response.dut_refresh_token) {
        dutRefreshToken.value = response.dut_refresh_token
        sessionStorage.setItem('dut_refresh_token', response.dut_refresh_token)
      }

      // Fetch user info
      await fetchUser()

      return response
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'External login failed'
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
        password: guestPassword
      })

      accessToken.value = response.access_token
      refreshTokenValue.value = response.refresh_token
      loginType.value = 'external'
      isGuestMode.value = true

      // Store tokens in sessionStorage (session-isolated)
      sessionStorage.setItem('access_token', response.access_token)
      sessionStorage.setItem('refresh_token', response.refresh_token)
      sessionStorage.setItem('login_type', 'external')
      sessionStorage.setItem('is_guest_mode', 'true')

      // Store DUT tokens if provided
      if (response.dut_access_token) {
        dutAccessToken.value = response.dut_access_token
        sessionStorage.setItem('dut_access_token', response.dut_access_token)
      }
      if (response.dut_refresh_token) {
        dutRefreshToken.value = response.dut_refresh_token
        sessionStorage.setItem('dut_refresh_token', response.dut_refresh_token)
      }

      // Fetch user info (but display will show as Guest)
      await fetchUser()

      return response
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Guest login failed'
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

      sessionStorage.setItem('access_token', response.access_token)
      sessionStorage.setItem('refresh_token', response.refresh_token)

      return response
    } catch (err) {
      logout()
      throw err
    }
  }

  async function fetchUser() {
    if (!accessToken.value) return

    try {
      user.value = await authApi.me()
    } catch (err: any) {
      console.error('Failed to fetch user:', err)
      if (err.response?.status === 401) {
        logout()
      }
    }
  }

  function logout() {
    accessToken.value = null
    refreshTokenValue.value = null
    dutAccessToken.value = null
    dutRefreshToken.value = null
    user.value = null
    isGuestMode.value = false

    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    sessionStorage.removeItem('dut_access_token')
    sessionStorage.removeItem('dut_refresh_token')
    sessionStorage.removeItem('login_type')
    sessionStorage.removeItem('is_guest_mode')
  }

  // Track initialization state to prevent duplicate fetches
  let isInitialized = false

  // Initialize store - only runs once per app lifecycle
  async function initialize() {
    if (isInitialized) return
    isInitialized = true
    
    if (accessToken.value && !user.value) {
      await fetchUser()
    }
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
    initialize
  }
})
