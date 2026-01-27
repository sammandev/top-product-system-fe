/**
 * Application Configuration
 * Central configuration for app-wide constants and settings
 */

export const APP_CONFIG = {
  // Application Info
  name: 'Top Product',
  version: '1.0.0',
  description: 'Test Data Analysis Platform',

  // API Configuration
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
    timeout: 120000, // 120 seconds
    retryAttempts: 3,
    retryDelay: 1000
  },

  // Authentication
  auth: {
    tokenKey: 'access_token',
    refreshTokenKey: 'refresh_token',
    dutTokenKey: 'dut_access_token',
    dutRefreshTokenKey: 'dut_refresh_token',
    loginTypeKey: 'login_type',
    tokenExpiry: 3600, // 1 hour in seconds
    refreshBeforeExpiry: 300 // Refresh 5 minutes before expiry
  },

  // Pagination
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
    maxPageSize: 100
  },

  // File Upload
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFormats: ['.csv', '.xlsx', '.xls'],
    chunkSize: 1024 * 1024 // 1MB chunks
  },

  // Date/Time
  dateTime: {
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss',
    dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',
    timezone: 'UTC'
  },

  // UI
  ui: {
    debounceDelay: 300,
    toastDuration: 2000,
    animationDuration: 200,
    sidebarWidth: 256,
    sidebarRailWidth: 72
  },

  // Theme
  theme: {
    defaultMode: 'light' as const,
    storageKey: 'theme_mode'
  },

  // Features
  features: {
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableDarkMode: true,
    enableNotifications: true,
    enableFileComparison: true,
    enableDUTAnalysis: true
  },

  // Performance
  performance: {
    enableLazyLoading: true,
    enableCodeSplitting: true,
    cacheTimeout: 5 * 60 * 1000 // 5 minutes
  }
} as const

export type AppConfig = typeof APP_CONFIG
