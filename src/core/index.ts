/**
 * Core Module Barrel Export
 * 
 * Centralized export for all core infrastructure
 */

// API
export * from './api'

// Configuration
export * from './config'

// Plugins
export * from './plugins'

// Router
export { default as router } from './router'
export * from './router/guards'
export * from './router/routes'

// Types
export * from './types'
