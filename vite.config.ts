import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vuetify from 'vite-plugin-vuetify'

const optimizeDepEntries = [
  'index.html',
  'src/**/*.{vue,ts}',
  '!src/**/*.d.ts',
  '!src/**/*.spec.ts',
  '!src/**/*.test.ts',
  '!src/**/__tests__/**',
  '!src/test/**',
]

// Vite configuration for Vue 3 + TypeScript + Vuetify
// See: https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }), // Auto-import Vuetify components
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)), // Path alias: @/ → src/
    },
  },
  // Scan all source modules up front so lazy routes don't discover new deep imports mid-session.
  optimizeDeps: {
    entries: optimizeDepEntries,
    include: ['vuetify', 'vuetify/components', 'vuetify/directives'],
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
    chunkSizeWarningLimit: 1000, // Increase chunk size warning limit
  },
})
