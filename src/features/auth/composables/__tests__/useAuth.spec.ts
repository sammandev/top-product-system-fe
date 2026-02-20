import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useAuthStore } from '../../store/index'
import { useAuth } from '../useAuth'

// Create global router instance for tests
let testRouter: ReturnType<typeof createRouter>

// Mock vue-router's useRouter to return our test router
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRouter: () => testRouter,
  }
})

// Mock auth API
vi.mock('../../api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    externalLogin: vi.fn(),
    refreshToken: vi.fn(),
    me: vi.fn(),
  },
}))

describe('useAuth Composable', () => {
  beforeEach(() => {
    // Create fresh Pinia instance
    setActivePinia(createPinia())

    // Create test router
    testRouter = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
        { path: '/login', name: 'login', component: { template: '<div>Login</div>' } },
        { path: '/dashboard', name: 'dashboard', component: { template: '<div>Dashboard</div>' } },
      ],
    })

    // Clear localStorage
    localStorage.clear()

    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('Computed Properties', () => {
    it('should expose isAuthenticated from store', () => {
      const authStore = useAuthStore()
      const { isAuthenticated } = useAuth()

      expect(isAuthenticated.value).toBe(false)

      authStore.accessToken = 'test-token'
      expect(isAuthenticated.value).toBe(true)
    })

    it('should expose hasDUTAccess from store', () => {
      const authStore = useAuthStore()
      const { hasDUTAccess } = useAuth()

      expect(hasDUTAccess.value).toBe(false)

      authStore.dutAccessToken = 'dut-token'
      expect(hasDUTAccess.value).toBe(true)
    })

    it('should expose user from store', () => {
      const authStore = useAuthStore()
      const { user } = useAuth()

      expect(user.value).toBeNull()

      const mockUser = {
        id: 1,
        username: 'testuser',
        roles: ['user'],
        permissions: ['read'],
      }
      authStore.user = mockUser
      expect(user.value).toEqual(mockUser)
    })

    it('should expose loading state from store', () => {
      const authStore = useAuthStore()
      const { loading } = useAuth()

      expect(loading.value).toBe(false)

      authStore.loading = true
      expect(loading.value).toBe(true)
    })

    it('should expose error from store', () => {
      const authStore = useAuthStore()
      const { error } = useAuth()

      expect(error.value).toBeNull()

      authStore.error = 'Test error'
      expect(error.value).toBe('Test error')
    })

    it('should expose loginType from store', () => {
      const authStore = useAuthStore()
      const { loginType } = useAuth()

      expect(loginType.value).toBe('local')

      authStore.loginType = 'external'
      expect(loginType.value).toBe('external')
    })
  })

  describe('login method', () => {
    it('should call store login and navigate to dashboard', async () => {
      const authStore = useAuthStore()
      const { login } = useAuth()

      // Mock successful login
      vi.spyOn(authStore, 'login').mockResolvedValueOnce({
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
      })

      const pushSpy = vi.spyOn(testRouter, 'push')

      await login({ username: 'test', password: 'pass' })

      expect(authStore.login).toHaveBeenCalledWith({
        username: 'test',
        password: 'pass',
      })
      expect(pushSpy).toHaveBeenCalledWith('/dashboard')
    })

    it('should navigate to redirect URL if provided', async () => {
      const authStore = useAuthStore()
      const { login } = useAuth()

      // Set redirect query param
      await testRouter.push('/login?redirect=/dut/analysis')

      // Mock successful login
      vi.spyOn(authStore, 'login').mockResolvedValueOnce({
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
      })

      const pushSpy = vi.spyOn(testRouter, 'push')

      await login({ username: 'test', password: 'pass' })

      expect(pushSpy).toHaveBeenCalledWith('/dut/analysis')
    })

    it('should throw error on login failure', async () => {
      const authStore = useAuthStore()
      const { login } = useAuth()

      const loginError = new Error('Invalid credentials')
      vi.spyOn(authStore, 'login').mockRejectedValueOnce(loginError)

      await expect(login({ username: 'test', password: 'wrong' })).rejects.toThrow(
        'Invalid credentials',
      )
    })
  })

  describe('externalLogin method', () => {
    it('should call store externalLogin and navigate to dashboard', async () => {
      const authStore = useAuthStore()
      const { externalLogin } = useAuth()

      // Mock successful external login
      vi.spyOn(authStore, 'externalLogin').mockResolvedValueOnce({
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        dut_access_token: 'dut-token',
        dut_refresh_token: 'dut-refresh',
      })

      const pushSpy = vi.spyOn(testRouter, 'push')

      await externalLogin({
        username: 'test',
        password: 'pass',
        dut_username: 'dutuser',
        dut_password: 'dutpass',
      })

      expect(authStore.externalLogin).toHaveBeenCalledWith({
        username: 'test',
        password: 'pass',
        dut_username: 'dutuser',
        dut_password: 'dutpass',
      })
      expect(pushSpy).toHaveBeenCalledWith('/dashboard')
    })

    it('should handle external login without DUT credentials', async () => {
      const authStore = useAuthStore()
      const { externalLogin } = useAuth()

      vi.spyOn(authStore, 'externalLogin').mockResolvedValueOnce({
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
      })

      await externalLogin({
        username: 'test',
        password: 'pass',
      })

      expect(authStore.externalLogin).toHaveBeenCalled()
    })

    it('should throw error on external login failure', async () => {
      const authStore = useAuthStore()
      const { externalLogin } = useAuth()

      const loginError = new Error('External API unavailable')
      vi.spyOn(authStore, 'externalLogin').mockRejectedValueOnce(loginError)

      await expect(externalLogin({ username: 'test', password: 'pass' })).rejects.toThrow(
        'External API unavailable',
      )
    })
  })

  describe('logout method', () => {
    it('should call store logout and navigate to login page', async () => {
      const authStore = useAuthStore()
      const { logout } = useAuth()

      const logoutSpy = vi.spyOn(authStore, 'logout')
      const pushSpy = vi.spyOn(testRouter, 'push')

      await logout()

      expect(logoutSpy).toHaveBeenCalled()
      expect(pushSpy).toHaveBeenCalledWith('/login')
    })

    it('should clear all auth data on logout', async () => {
      const authStore = useAuthStore()
      const { logout } = useAuth()

      // Set some auth data
      authStore.accessToken = 'test-token'
      authStore.user = { id: 1, username: 'test', roles: [], permissions: [] }

      await logout()

      expect(authStore.accessToken).toBeNull()
      expect(authStore.user).toBeNull()
    })
  })

  describe('refreshToken method', () => {
    it('should call store refreshToken', async () => {
      const authStore = useAuthStore()
      const { refreshToken } = useAuth()

      vi.spyOn(authStore, 'refreshToken').mockResolvedValueOnce({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      })

      await refreshToken()

      expect(authStore.refreshToken).toHaveBeenCalled()
    })

    it('should throw error when no refresh token available', async () => {
      const authStore = useAuthStore()
      const { refreshToken } = useAuth()

      authStore.refreshTokenValue = null

      await expect(refreshToken()).rejects.toThrow('No refresh token available')
    })
  })

  describe('hasPermission method', () => {
    it('should return true when authenticated (placeholder implementation)', () => {
      const authStore = useAuthStore()
      const { hasPermission } = useAuth()

      authStore.accessToken = 'test-token'

      expect(hasPermission('read:data')).toBe(true)
    })

    it('should return false when not authenticated', () => {
      const { hasPermission } = useAuth()

      expect(hasPermission('read:data')).toBe(false)
    })
  })
})
