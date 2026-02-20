import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vuetify from 'vite-plugin-vuetify'

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
  // UPDATED: Pre-bundle Vuetify components to avoid runtime optimization and HMR reloads
  optimizeDeps: {
    include: [
      'vuetify',
      'vuetify/components',
      'vuetify/components/VApp',
      'vuetify/components/VBtnGroup',
      'vuetify/components/VBtn',
      'vuetify/components/VForm',
      'vuetify/components/VCard',
      'vuetify/components/VDialog',
      'vuetify/components/VList',
      'vuetify/components/VChip',
      'vuetify/components/VDataTable',
      'vuetify/components/VOverlay',
      'vuetify/components/VTimeline',
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
      'vuetify/components/VIcon',
      'vuetify/components/VTable',
      'vuetify/components/VWindow',
      'vuetify/components/VBtn',
      'vuetify/components/VIcon',
      'vuetify/components/VTabs',
      'vuetify/components/VWindow',
      'vuetify/components/VCard',
      'vuetify/components/VChip',
      'vuetify/components/VGrid',
      'vuetify/components/VBtnToggle',
      'vuetify/components/VCheckbox',
      'vuetify/components/VFileInput',
      'vuetify/components/VSnackbar',
      'vuetify/components/VAppBar',
      'vuetify/components/VAvatar',
      'vuetify/components/VDivider',
      'vuetify/components/VFooter',
      'vuetify/components/VList',
      'vuetify/components/VMain',
      'vuetify/components/VMenu',
      'vuetify/components/VNavigationDrawer',
      'vuetify/components/VProgressLinear',
      'vuetify/components/VTextField',
      'vuetify/components/VBadge',
      'vuetify/components/VCombobox',
      'vuetify/components/VExpansionPanel',
      'vuetify/components/VAutocomplete',
      'vuetify/components/VSelect',
      'vuetify/components/VChipGroup',
      'vuetify/components/VDataTable',
      'vuetify/components/VDialog',
      'vuetify/components/VTextarea',
      'vuetify/components/VTooltip',
      'vuetify/components/VPagination',
      'vuetify/components/VVirtualScroll',
      'vuetify/components/VSheet',
      'vuetify/components/VSwitch',
      'vuetify/components/VProgressCircular',
      'vuetify/components/transitions',
      'vuetify/components/VTable',
      'vuetify/components/VSkeletonLoader',
      'vuetify/directives',
    ],
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
