import type { ComponentMountingOptions } from '@vue/test-utils'
import { mount, type VueWrapper } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { createAppQueryClient, primeVueOptions } from '@/app/providers'

/**
 * Test Utilities
 *
 * Helper functions for component testing with Vue Test Utils.
 */

/**
 * Create a fresh Pinia instance for testing
 */
export function createTestPinia() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

/**
 * Create a test router with memory history
 *
 * @param routes - Optional routes to include
 */
export function createTestRouter(routes: RouteRecordRaw[] = []) {
  return createRouter({
    history: createMemoryHistory(),
    routes:
      routes.length > 0
        ? routes
        : [
            { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
            { path: '/login', name: 'login', component: { template: '<div>Login</div>' } },
            {
              path: '/dashboard',
              name: 'dashboard',
              component: { template: '<div>Dashboard</div>' },
            },
          ],
  })
}

/**
 * Create PrimeVue plugin tuple for scaffold tests
 */
export function createTestPrimeVue() {
  return [PrimeVue, primeVueOptions] as [typeof PrimeVue, typeof primeVueOptions]
}

/**
 * Create TanStack Query client for scaffold tests
 */
export function createTestQueryClient() {
  return createAppQueryClient()
}

/**
 * Mount a component with the common scaffold plugin stack
 *
 * @param component - The component to mount
 * @param options - Additional mounting options
 * @returns VueWrapper instance
 */
export function mountWithPlugins(
  component: Parameters<typeof mount>[0],
  options: ComponentMountingOptions<unknown> = {},
): VueWrapper<unknown> {
  return mountWithScaffoldPlugins(component, options)
}

/**
 * Mount a component with the new scaffold plugins (Pinia, Router, Query, PrimeVue)
 */
export function mountWithScaffoldPlugins(
  component: Parameters<typeof mount>[0],
  options: ComponentMountingOptions<unknown> = {},
): VueWrapper<unknown> {
  const pinia = createTestPinia()
  const router = createTestRouter()
  const queryClient = createTestQueryClient()
  const existingPlugins = options.global?.plugins ?? []

  return mount(component, {
    ...options,
    global: {
      ...options.global,
      plugins: [
        pinia,
        router,
        createTestPrimeVue(),
        [VueQueryPlugin, { queryClient }],
        ...existingPlugins,
      ],
    },
  })
}

/**
 * Wait for next tick and all pending promises
 * Useful for waiting for Vue updates and async operations
 */
export async function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Wait for a specific amount of time
 *
 * @param ms - Milliseconds to wait
 */
export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Find element by test ID
 * Convention: use data-testid attribute in components
 *
 * @param wrapper - Component wrapper
 * @param testId - Test ID value
 */
export function findByTestId(wrapper: VueWrapper, testId: string) {
  return wrapper.find(`[data-testid="${testId}"]`)
}

/**
 * Check if element with test ID exists
 *
 * @param wrapper - Component wrapper
 * @param testId - Test ID value
 */
export function existsByTestId(wrapper: VueWrapper, testId: string): boolean {
  return findByTestId(wrapper, testId).exists()
}

/**
 * Mock successful API response
 *
 * @param data - Response data
 */
export function mockApiSuccess<T>(data: T) {
  return Promise.resolve({ data })
}

/**
 * Mock API error response
 *
 * @param message - Error message
 * @param status - HTTP status code
 */
export function mockApiError(message: string, status = 400) {
  return Promise.reject({
    response: {
      status,
      data: {
        detail: message,
      },
    },
  })
}
