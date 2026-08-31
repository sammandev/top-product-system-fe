import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    css: false, // Disable CSS processing in tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/types/',
        '**/*.d.ts',
        'src/main.ts',
        'src/core/plugins/**',
        '**/__tests__/**',
      ],
      thresholds: {
        // Current suite baseline. Raise these floors as coverage grows.
        lines: 42,
        functions: 34,
        branches: 33,
        statements: 42,
        'src/app/providers/primevue.ts': {
          lines: 85,
          functions: 50,
          branches: 60,
          statements: 80,
        },
        'src/shared/ui/forms/AppMultiSelect.vue': {
          lines: 70,
          functions: 80,
          branches: 50,
          statements: 60,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
