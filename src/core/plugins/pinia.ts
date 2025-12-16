/**
 * Pinia Plugin Configuration
 * 
 * State management store
 */

import { createPinia } from 'pinia'
import type { Pinia } from 'pinia'

/**
 * Create Pinia instance
 */
export function createPiniaInstance(): Pinia {
  const pinia = createPinia()

  // Add plugins if needed
  // pinia.use(piniaPluginPersistedstate)

  return pinia
}

export default createPiniaInstance()
