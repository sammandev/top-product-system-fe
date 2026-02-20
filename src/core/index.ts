/**
 * Core Module Barrel Export
 *
 * Centralized export for all core infrastructure
 */

// API
export * from './api'
// Configuration (avoid re-exporting AppConfig which conflicts with types/app-config.types.ts)
export { APP_CONFIG, envConfig } from './config'

// Plugins
export * from './plugins'

// Router
export { default as router } from './router'
export * from './router/guards'
export * from './router/routes'

// Types
export * from './types'
