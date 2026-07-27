import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const optimizeDepEntries = ['index.html']

function manualChunks(id: string): string | undefined {
  const normalizedId = id.replace(/\\/g, '/')

  if (!normalizedId.includes('/node_modules/')) {
    return undefined
  }

  if (
    normalizedId.includes('/vue/') ||
    normalizedId.includes('/@vue/') ||
    normalizedId.includes('/vue-router/') ||
    normalizedId.includes('/pinia/')
  ) {
    return 'vendor-vue'
  }

  if (normalizedId.includes('/primevue/') || normalizedId.includes('/@primeuix/')) {
    return 'vendor-primevue'
  }

  if (normalizedId.includes('/@iconify/')) {
    return 'vendor-icons'
  }

  if (normalizedId.includes('/@tanstack/')) {
    return 'vendor-query'
  }

  if (
    normalizedId.includes('/axios/') ||
    normalizedId.includes('/dayjs/') ||
    normalizedId.includes('/lodash-es/') ||
    normalizedId.includes('/zod/') ||
    normalizedId.includes('/@vueuse/')
  ) {
    return 'vendor-utils'
  }

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
