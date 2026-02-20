import type { ComponentMountingOptions } from '@vue/test-utils'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

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
 * Create Vuetify instance for testing
 */
export function createTestVuetify() {
  return createVuetify({
    components,
    directives,
    theme: {
      defaultTheme: 'light',
    },
  })
}

/**
 * Mount a component with common test setup (Pinia, Router, Vuetify)
 *
 * @param component - The component to mount
 * @param options - Additional mounting options
 * @returns VueWrapper instance
 */
export function mountWithPlugins(
  component: Parameters<typeof mount>[0],
  options: ComponentMountingOptions<unknown> = {},
): VueWrapper<unknown> {
  const pinia = createTestPinia()
  const router = createTestRouter()
  const vuetify = createTestVuetify()

  return mount(component, {
    global: {
      plugins: [pinia, router, vuetify],
      ...options.global,
    },
    ...options,
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
