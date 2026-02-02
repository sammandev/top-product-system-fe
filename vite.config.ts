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
  // UPDATED: Pre-bundle Vuetify components to avoid runtime optimization and HMR reloads
  optimizeDeps: {
    include: [
      'vuetify',
      'vuetify/components',
      'vuetify/components/VBtnGroup',
      'vuetify/components/VBtn',
      'vuetify/components/VForm',
      'vuetify/components/VForm',
      'vuetify/components/VCard',
      'vuetify/components/VDialog',
      'vuetify/components/VList',
      'vuetify/components/VChip',
      'vuetify/components/VDataTable',
      'vuetify/components/VOverlay',
      'vuetify/components/VTimeLine',
      'vuetify/components/VForm',
      'vuetify/components/VTextField',
      'vuetify/components/VSelect',
      'vuetify/components/VAutocomplete',
      'vuetify/components/VCheckbox',
      'vuetify/components/VSlider',
      'vuetify/components/VAlert',
      'vuetify/components/VTabs',
      'vuetify/components/VMenu',
      'vuetify/components/VTooltip',
      'vuetify/components/VVirtualScroll',
      'vuetify/directives'
    ],
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
