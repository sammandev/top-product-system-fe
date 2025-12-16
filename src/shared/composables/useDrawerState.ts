/**
 * Drawer State Composable
 * 
 * Manages navigation drawer state with localStorage persistence.
 * Handles both drawer visibility (open/closed) and rail mode (collapsed/expanded).
 */

import { ref, watch, onMounted } from 'vue'

const STORAGE_KEYS = {
  DRAWER: 'app_drawer_open',
  RAIL: 'app_drawer_rail',
  THEME: 'app_theme'
} as const

/**
 * Drawer state composable with persistence
 * 
 * State combinations:
 * - drawer=true, rail=false: Drawer open and expanded (normal mode)
 * - drawer=true, rail=true: Drawer open and collapsed (rail mode, hover to expand)
 * - drawer=false, rail=false: Drawer completely hidden
 * - drawer=false, rail=true: Drawer completely hidden (rail state preserved for when reopened)
 * 
 * @example
 * ```ts
 * const { drawer, rail, toggleDrawer, toggleRail } = useDrawerState()
 * 
 * // State automatically persists to localStorage
 * // and restores on page load
 * ```
 */
export function useDrawerState(initialDrawer = true, initialRail = false) {
  const drawer = ref(initialDrawer)
  const rail = ref(initialRail)

  /**
   * Load drawer state from localStorage
   */
  function loadState() {
    try {
      const savedDrawer = localStorage.getItem(STORAGE_KEYS.DRAWER)
      const savedRail = localStorage.getItem(STORAGE_KEYS.RAIL)

      if (savedDrawer !== null) {
        drawer.value = savedDrawer === 'true'
      }

      if (savedRail !== null) {
        rail.value = savedRail === 'true'
      }
    } catch (error) {
      console.warn('Failed to load drawer state from localStorage:', error)
    }
  }

  /**
   * Save drawer state to localStorage
   */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEYS.DRAWER, String(drawer.value))
      localStorage.setItem(STORAGE_KEYS.RAIL, String(rail.value))
    } catch (error) {
      console.warn('Failed to save drawer state to localStorage:', error)
    }
  }

  /**
   * Toggle drawer open/closed
   * When closing drawer, rail state is preserved
   * When opening drawer, previous rail state is restored
   */
  function toggleDrawer() {
    drawer.value = !drawer.value
  }

  /**
   * Toggle rail mode (collapsed/expanded)
   * Only works when drawer is open
   */
  function toggleRail() {
    if (drawer.value) {
      rail.value = !rail.value
    }
  }

  /**
   * Reset to default state
   */
  function reset() {
    drawer.value = initialDrawer
    rail.value = initialRail
    saveState()
  }

  // Watch for changes and save to localStorage
  watch([drawer, rail], () => {
    saveState()
  })

  // Load state on mount
  onMounted(() => {
    loadState()
  })

  return {
    drawer,
    rail,
    toggleDrawer,
    toggleRail,
    reset,
    loadState,
    saveState
  }
}

/**
 * Theme persistence composable
 * 
 * @example
 * ```ts
 * const { saveTheme, loadTheme } = useThemeState()
 * 
 * saveTheme('dark')
 * const savedTheme = loadTheme() // Returns 'dark'
 * ```
 */
export function useThemeState() {
  function saveTheme(theme: string) {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme)
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error)
    }
  }

  function loadTheme(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.THEME)
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error)
      return null
    }
  }

  return {
    saveTheme,
    loadTheme
  }
}
