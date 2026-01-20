/**
 * Vuetify Plugin Configuration
 * 
 * Material Design 3 component framework with custom themes
 * Using auto-import via vite-plugin-vuetify for optimal bundle size
 */

import 'vuetify/styles/main.css'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import type { ThemeDefinition } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// NOTE: Components and directives are auto-imported by vite-plugin-vuetify
// This reduces bundle size by only including used components

/**
 * Custom Light Theme
 */
const customLightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    primary: '#1976D2',
    secondary: '#424242',
    accent: '#82B1FF',
    error: '#FF5252',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FFC107',
    background: '#FAFAFA',
    surface: '#FFFFFF'
  }
}

/**
 * Custom Dark Theme
 */
const customDarkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    primary: '#2196F3',
    secondary: '#616161',
    accent: '#82B1FF',
    error: '#FF5252',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FFC107',
    background: '#121212',
    surface: '#1E1E1E'
  }
}

/**
 * Vuetify instance with custom configuration
 * Components and directives are auto-imported by vite-plugin-vuetify
 */
export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    }
  },
  theme: {
    defaultTheme: 'customLightTheme',
    themes: {
      customLightTheme,
      customDarkTheme
    }
  },
  defaults: {
    VBtn: {
      color: 'primary',
      variant: 'elevated',
      rounded: 'md'
    },
    VCard: {
      elevation: 2,
      rounded: 'lg'
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable'
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable'
    },
    VAutocomplete: {
      variant: 'outlined',
      density: 'comfortable'
    },
    VDataTable: {
      hover: true
    }
  }
})
