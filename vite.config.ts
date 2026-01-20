import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

// Vite configuration for Vue 3 + TypeScript + Vuetify
// See: https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }) // Auto-import Vuetify components
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)) // Path alias: @/ → src/
    }
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API requests to backend (avoids CORS in development)
      '/api': {
        target: 'http://127.0.0.1:7070',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    sourcemap: false, // Disable source maps in production
    chunkSizeWarningLimit: 1000 // Increase chunk size warning limit
  }
})
