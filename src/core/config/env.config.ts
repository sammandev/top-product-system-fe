/**
 * Environment Configuration
 * Validated environment variables with defaults
 */

class EnvironmentConfig {
  // API URLs
  readonly apiBaseUrl: string
  readonly dutApiBaseUrl?: string

  // App Info
  readonly appTitle: string
  readonly appVersion: string

  // Feature Flags
  readonly enableAnalytics: boolean

  // External Services
  readonly sentryDsn?: string

  // Environment
  readonly isDevelopment: boolean
  readonly isProduction: boolean
  readonly isTest: boolean

  constructor() {
    const env = import.meta.env

    // Validate required variables
    if (!env.VITE_API_BASE_URL && !env.DEV) {
      throw new Error('VITE_API_BASE_URL is required in production')
    }

    this.apiBaseUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:7070'
    this.dutApiBaseUrl = env.VITE_DUT_API_BASE_URL
    this.appTitle = env.VITE_APP_TITLE || 'AST Tools'
    this.appVersion = env.VITE_APP_VERSION || '1.0.0'
    this.enableAnalytics = env.VITE_ENABLE_ANALYTICS === 'true'
    this.sentryDsn = env.VITE_SENTRY_DSN

    this.isDevelopment = env.DEV
    this.isProduction = env.PROD
    this.isTest = env.MODE === 'test'
  }

  /**
   * Get all environment variables as a readonly object
   */
  getAll() {
    return {
      apiBaseUrl: this.apiBaseUrl,
      dutApiBaseUrl: this.dutApiBaseUrl,
      appTitle: this.appTitle,
      appVersion: this.appVersion,
      enableAnalytics: this.enableAnalytics,
      sentryDsn: this.sentryDsn,
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      isTest: this.isTest,
    } as const
  }

  /**
   * Validate environment configuration
   */
  validate(): boolean {
    try {
      if (!this.apiBaseUrl) {
        console.error('API Base URL is not configured')
        return false
      }

      if (this.isProduction && !this.appVersion) {
        console.warn('App version should be set in production')
      }

      return true
    } catch (error) {
      console.error('Environment validation failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const envConfig = new EnvironmentConfig()

// Validate on initialization (development only)
if (envConfig.isDevelopment) {
  if (!envConfig.validate()) {
    console.warn('Environment configuration validation failed')
  }
}
