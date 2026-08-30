import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const optimizeDepEntries = [
  'index.html',
  'src/**/*.{vue,ts}',
  '!src/**/*.d.ts',
  '!src/**/*.spec.ts',
  '!src/**/*.test.ts',
  '!src/**/__tests__/**',
  '!src/test/**',
]

function manualChunks(id: string): string | undefined {
  const normalizedId = id.replace(/\\/g, '/')

  if (!normalizedId.includes('/node_modules/')) {
    return undefined
  }

  // Package path relative to its node_modules root, e.g. "@iconify/vue/dist/..".
  const pkgPath = normalizedId.split('/node_modules/').pop() ?? ''

  if (/^(?:vue|vue-router|pinia)\//.test(pkgPath) || pkgPath.startsWith('@vue/')) {
    return 'vendor-vue'
  }

  if (pkgPath.startsWith('@iconify/')) {
    return 'vendor-icons'
  }

  if (pkgPath.startsWith('@tanstack/')) {
    return 'vendor-query'
  }

  if (/^(?:axios|dayjs|lodash-es|zod)\//.test(pkgPath) || pkgPath.startsWith('@vueuse/')) {
    return 'vendor-utils'
  }

  // PrimeVue is deliberately left unchunked: grouping every component into one
  // vendor chunk drags the whole library into the initial load even though the
  // app entry only needs primevue/config. Rollup splits it per route instead.
  return undefined
}

// Vite configuration for the Vue 3 + TypeScript frontend
// See: https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)), // Path alias: @/ → src/
    },
  },
  optimizeDeps: {
    entries: optimizeDepEntries,
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API requests to backend (avoids CORS in development)
      '/api': {
        target: 'http://127.0.0.1:7070',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: false, // Disable source maps in production
    chunkSizeWarningLimit: 5000, // Increase chunk size warning limit
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})
