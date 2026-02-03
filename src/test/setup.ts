import { vi } from 'vitest'
import { config } from '@vue/test-utils'

/**
 * Test Setup File
 * 
 * Configures the testing environment with necessary mocks and global settings.
 */

// Mock window.matchMedia (used by Vuetify responsive features)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver (used by Vuetify for lazy loading)
;(globalThis as any).IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Mock ResizeObserver (used by Vuetify for responsive components)
;(globalThis as any).ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Configure Vue Test Utils globally
config.global.stubs = {
  teleport: true,
  Teleport: true,
  // Stub Vuetify icons to avoid loading MDI fonts in tests
  'v-icon': true,
  VIcon: true
}

// Suppress Vuetify warnings in tests
const originalConsole = globalThis.console
;(globalThis as any).console = {
  ...originalConsole,
  warn: vi.fn(),
  error: vi.fn()
}
