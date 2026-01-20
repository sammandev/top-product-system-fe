/**
 * Menu Access Store
 * 
 * Manages user's accessible menus with caching for fast navigation
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { menuAccessApi } from '../api/menuAccess.api'
import type { UserMenuData } from '../types/menuAccess.types'

// Module-level cache for menus (persists across store instances)
let cachedMenus: UserMenuData[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export const useMenuAccessStore = defineStore('menuAccess', () => {
  // State
  const menus = ref<UserMenuData[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // Computed - organized by section
  const mainMenus = computed(() => 
    menus.value.filter(m => m.section === 'main')
  )
  
  const toolsMenus = computed(() => 
    menus.value.filter(m => m.section === 'tools')
  )
  
  const systemMenus = computed(() => 
    menus.value.filter(m => m.section === 'system')
  )

  // Computed - check if menu is accessible
  const canAccess = computed(() => (menuKey: string) => 
    menus.value.some(m => m.menu_key === menuKey)
  )

  // Computed - check if path is accessible
  const canAccessPath = computed(() => (path: string) => 
    menus.value.some(m => m.path === path)
  )

  /**
   * Fetch user's accessible menus
   */
  async function fetchMenus(isGuest: boolean = false, forceRefresh: boolean = false): Promise<void> {
    // Check cache first
    const now = Date.now()
    if (!forceRefresh && cachedMenus && (now - cacheTimestamp) < CACHE_TTL_MS) {
      menus.value = cachedMenus
      initialized.value = true
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = isGuest
        ? await menuAccessApi.getGuestMenus()
        : await menuAccessApi.getMyMenus()
      
      menus.value = response.menus
      cachedMenus = response.menus
      cacheTimestamp = now
      initialized.value = true
    } catch (err: any) {
      error.value = err.response?.data?.detail || 'Failed to fetch menus'
      console.error('Failed to fetch menus:', err)
      // On error, use fallback menus (empty means full access for backwards compatibility)
      menus.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Clear menu cache (call on logout or role change)
   */
  function clearCache(): void {
    cachedMenus = null
    cacheTimestamp = 0
    menus.value = []
    initialized.value = false
  }

  /**
   * Build hierarchical menu structure from flat list
   */
  function buildMenuTree(): {
    main: MenuItem[]
    tools: MenuItem[]
    system: MenuItem[]
  } {
    const result = {
      main: [] as MenuItem[],
      tools: [] as MenuItem[],
      system: [] as MenuItem[]
    }

    // Group menus by section
    const bySection = {
      main: menus.value.filter(m => m.section === 'main'),
      tools: menus.value.filter(m => m.section === 'tools'),
      system: menus.value.filter(m => m.section === 'system')
    }

    // Build tree for each section
    for (const [section, items] of Object.entries(bySection)) {
      const parents = items.filter(m => !m.parent_key)
      const children = items.filter(m => m.parent_key)

      for (const parent of parents) {
        const menuItem: MenuItem = {
          title: parent.title,
          icon: parent.icon,
          path: parent.path || undefined
        }

        // Find children for this parent
        const childItems = children.filter(c => c.parent_key === parent.menu_key)
        if (childItems.length > 0) {
          menuItem.children = childItems
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(c => ({
              title: c.title,
              icon: c.icon,
              path: c.path
            }))
        }

        result[section as keyof typeof result].push(menuItem)
      }

      // Sort by sort_order
      result[section as keyof typeof result].sort((a, b) => {
        const aOrder = items.find(i => i.title === a.title)?.sort_order ?? 0
        const bOrder = items.find(i => i.title === b.title)?.sort_order ?? 0
        return aOrder - bOrder
      })
    }

    return result
  }

  return {
    // State
    menus,
    loading,
    error,
    initialized,

    // Computed
    mainMenus,
    toolsMenus,
    systemMenus,
    canAccess,
    canAccessPath,

    // Actions
    fetchMenus,
    clearCache,
    buildMenuTree
  }
})

// Type for menu items
interface MenuItem {
  title: string
  icon: string
  path?: string
  children?: MenuItem[]
}
