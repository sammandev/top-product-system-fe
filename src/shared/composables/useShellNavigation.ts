import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { APP_CONFIG } from '@/core/config'
import type { AppRouteBreadcrumbItem } from '@/core/router/route-meta'
import { useMenuAccessStore } from '@/features/admin/stores/menuAccess.store'
import { useAuthStore } from '@/features/auth/stores'

type MenuSectionKey = 'main' | 'tools' | 'system'
type ShellSectionTone = 'primary' | 'info' | 'warning'

export interface ShellMenuItem {
  title: string
  icon: string
  path?: string
  children?: ShellMenuItem[]
}

export interface ShellMenuSection {
  key: MenuSectionKey
  label: string
  caption: string
  icon: string
  tone: ShellSectionTone
  items: ShellMenuItem[]
}

const SUPERADMIN_ONLY_PATHS = new Set(['/admin/menu-access', '/admin/cleanup', '/admin/app-config'])
const GUEST_MAIN_PATHS = new Set(['/dut/top-products/analysis', '/dut/data-explorer'])
const ADMIN_MAIN_PATHS = new Set(['/dashboard'])

const STATIC_MAIN_ITEMS: ShellMenuItem[] = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', path: '/dashboard' },
  {
    title: 'Top Products',
    icon: 'mdi-trophy-outline',
    children: [
      { title: 'Analysis', icon: 'mdi-circle-small', path: '/dut/top-products/analysis' },
      { title: 'Database', icon: 'mdi-circle-small', path: '/dut/top-products/data' },
    ],
  },
  { title: 'Data Explorer', icon: 'mdi-database-search-outline', path: '/dut/data-explorer' },
]

const STATIC_TOOLS_ITEMS: ShellMenuItem[] = [
  {
    title: 'File Upload',
    icon: 'mdi-file-upload-outline',
    children: [
      { title: 'Upload File', icon: 'mdi-circle-small', path: '/parsing' },
      { title: 'Parse & Download', icon: 'mdi-circle-small', path: '/parsing/download-format' },
    ],
  },
  {
    title: 'Compare Files',
    icon: 'mdi-compare-horizontal',
    children: [
      { title: 'Compare Files', icon: 'mdi-circle-small', path: '/compare' },
      { title: 'DVT-MC2 Compare', icon: 'mdi-circle-small', path: '/compare/dvt-mc2' },
    ],
  },
  { title: 'MasterControl Analyze', icon: 'mdi-file-chart-outline', path: '/mastercontrol/analyze' },
  { title: 'DVT to MC2 Converter', icon: 'mdi-swap-horizontal-bold', path: '/conversion/dvt-to-mc2' },
]

const STATIC_SYSTEM_ITEMS: ShellMenuItem[] = [
  {
    title: 'System Configuration',
    icon: 'mdi-cog-outline',
    children: [
      { title: 'User Management', icon: 'mdi-circle-small', path: '/admin/users' },
      { title: 'Menu Access', icon: 'mdi-circle-small', path: '/admin/menu-access' },
      { title: 'App Configuration', icon: 'mdi-circle-small', path: '/admin/app-config' },
    ],
  },
  { title: 'System Cleanup', icon: 'mdi-delete-sweep-outline', path: '/admin/cleanup' },
]

function filterItemByPaths(item: ShellMenuItem, allowed: Set<string>): ShellMenuItem | null {
  if (item.children) {
    const children = item.children.filter((child) => child.path && allowed.has(child.path))
    if (children.length === 0) return null
    return { ...item, children }
  }

  if (item.path && allowed.has(item.path)) {
    return item
  }

  return null
}

function filterOutSuperAdminItems(items: ShellMenuItem[]): ShellMenuItem[] {
  return items.reduce<ShellMenuItem[]>((accumulator, item) => {
    if (item.children) {
      const children = item.children.filter(
        (child) => !child.path || !SUPERADMIN_ONLY_PATHS.has(child.path),
      )
      if (children.length > 0) {
        accumulator.push({ ...item, children })
      }
      return accumulator
    }

    if (!item.path || !SUPERADMIN_ONLY_PATHS.has(item.path)) {
      accumulator.push(item)
    }

    return accumulator
  }, [])
}

function filterByQuery(items: ShellMenuItem[], query: string): ShellMenuItem[] {
  if (!query) {
    return items
  }

  return items.reduce<ShellMenuItem[]>((accumulator, item) => {
    const itemMatches = item.title.toLowerCase().includes(query)
    const matchingChildren = item.children?.filter((child) => child.title.toLowerCase().includes(query))

    if (itemMatches) {
      accumulator.push(item)
      return accumulator
    }

    if (matchingChildren && matchingChildren.length > 0) {
      accumulator.push({ ...item, children: matchingChildren })
    }

    return accumulator
  }, [])
}

function findCurrentMenuMatch(sections: ShellMenuSection[], currentPath: string): {
  item: ShellMenuItem
  section: ShellMenuSection
  parentTitle?: string
} | null {
  for (const section of sections) {
    for (const item of section.items) {
      if (item.path === currentPath) {
        return { item, section }
      }

      if (!item.children) {
        continue
      }

      const child = item.children.find((entry) => entry.path === currentPath)
      if (child) {
        return { item: child, section, parentTitle: item.title }
      }
    }
  }

  return null
}

function formatRouteName(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    return 'Workspace'
  }

  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .trim()
}

export function useShellNavigation() {
  const route = useRoute()
  const authStore = useAuthStore()
  const menuAccessStore = useMenuAccessStore()

  const searchQuery = ref('')
  const dynamicMenusLoaded = ref(false)

  const menuTree = computed(() => {
    if (!menuAccessStore.initialized || !dynamicMenusLoaded.value) {
      return {
        main: STATIC_MAIN_ITEMS,
        tools: STATIC_TOOLS_ITEMS,
        system: STATIC_SYSTEM_ITEMS,
      }
    }

    return menuAccessStore.buildMenuTree()
  })

  const usingFallbackMenus = computed(() => !menuAccessStore.initialized || !dynamicMenusLoaded.value)
  const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase())

  const visibleMainItems = computed(() => {
    const filtered = filterByQuery(menuTree.value.main, normalizedQuery.value)

    if (authStore.isGuest) {
      return filtered.reduce<ShellMenuItem[]>((accumulator, item) => {
        const nextItem = filterItemByPaths(item, GUEST_MAIN_PATHS)
        if (nextItem) {
          accumulator.push(nextItem)
        }
        return accumulator
      }, [])
    }

    if (!authStore.isAdmin) {
      return filtered.filter((item) => !item.path || !ADMIN_MAIN_PATHS.has(item.path))
    }

    return filtered
  })

  const visibleToolsItems = computed(() => {
    if (!authStore.isUser) {
      return []
    }

    return filterByQuery(menuTree.value.tools, normalizedQuery.value)
  })

  const visibleSystemItems = computed(() => {
    if (!authStore.isAdmin) {
      return []
    }

    const filtered = filterByQuery(menuTree.value.system, normalizedQuery.value)

    if (authStore.isAdmin && !authStore.isSuperAdmin) {
      return filterOutSuperAdminItems(filtered)
    }

    return filtered
  })

  const visibleSections = computed(() => {
    const sections: ShellMenuSection[] = [
      {
        key: 'main',
        label: 'Main',
        caption: 'Core workspace',
        icon: 'mdi-compass-outline',
        tone: 'primary',
        items: visibleMainItems.value,
      },
    ]

    if (visibleToolsItems.value.length > 0) {
      sections.push({
        key: 'tools',
        label: 'Tools',
        caption: 'Processing and analysis',
        icon: 'mdi-hammer-wrench',
        tone: 'info',
        items: visibleToolsItems.value,
      })
    }

    if (visibleSystemItems.value.length > 0) {
      sections.push({
        key: 'system',
        label: 'System',
        caption: 'Administration and control',
        icon: 'mdi-shield-crown-outline',
        tone: 'warning',
        items: visibleSystemItems.value,
      })
    }

    return sections
  })

  const currentMatch = computed(() => findCurrentMenuMatch(visibleSections.value, route.path))
  const currentShellMeta = computed(() => route.meta.shell)

  const pageTitle = computed(() => {
    if (typeof route.meta.title === 'string' && route.meta.title.trim().length > 0) {
      return route.meta.title
    }

    return currentMatch.value?.item.title || formatRouteName(route.name)
  })

  const pageEyebrow = computed(
    () => currentShellMeta.value?.eyebrow || currentMatch.value?.section.label || 'Workspace',
  )

  const pageIcon = computed(
    () => currentShellMeta.value?.icon || route.meta.icon || currentMatch.value?.section.icon || 'mdi-compass-outline',
  )

  const pageAccent = computed<'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'>(
    () => currentShellMeta.value?.accent || currentMatch.value?.section.tone || 'primary',
  )

  const pageBreadcrumbs = computed<AppRouteBreadcrumbItem[]>(() => {
    if (Array.isArray(route.meta.breadcrumb) && route.meta.breadcrumb.length > 0) {
      return route.meta.breadcrumb
    }

    if (currentMatch.value?.parentTitle) {
      return [
        { title: currentMatch.value.section.label, disabled: true },
        { title: currentMatch.value.parentTitle, disabled: true },
        { title: currentMatch.value.item.title, disabled: true },
      ]
    }

    return [{ title: pageTitle.value, disabled: true }]
  })

  const activeSectionKey = computed(() => currentMatch.value?.section.key || null)

  const pageDescription = computed(() => {
    if (currentShellMeta.value?.description) {
      return currentShellMeta.value.description
    }

    if (menuAccessStore.loading) {
      return 'Synchronizing role-aware navigation for this workspace.'
    }

    if (menuAccessStore.error || usingFallbackMenus.value) {
      return 'Showing the default workspace menu while access rules finish syncing.'
    }

    if (currentMatch.value?.parentTitle) {
      return `${currentMatch.value.parentTitle} workspace view`
    }

    return APP_CONFIG.description
  })

  const menuStatusTone = computed<'success' | 'warning' | 'info'>(() => {
    if (menuAccessStore.loading) {
      return 'info'
    }

    if (menuAccessStore.error || usingFallbackMenus.value) {
      return 'warning'
    }

    return 'success'
  })

  const menuStatusLabel = computed(() => {
    if (menuAccessStore.loading) {
      return 'Syncing menu access'
    }

    if (menuAccessStore.error || usingFallbackMenus.value) {
      return 'Default menu active'
    }

    return 'Access menus synced'
  })

  const menuStatusDetail = computed(() => {
    if (menuAccessStore.loading) {
      return 'Role-based navigation is loading in the background.'
    }

    if (menuAccessStore.error) {
      return menuAccessStore.error
    }

    if (usingFallbackMenus.value) {
      return 'Built-in navigation is being used until menu access data is ready.'
    }

    return 'Your available sections are aligned with the latest access rules.'
  })

  async function syncMenus(forceRefresh = false) {
    try {
      await Promise.race([
        menuAccessStore.fetchMenus(authStore.isGuest, forceRefresh),
        new Promise<void>((resolve) => setTimeout(resolve, 3000)),
      ])
    } catch {
      // Keep the shell responsive and let the fallback UI explain the state.
    } finally {
      dynamicMenusLoaded.value = menuAccessStore.initialized
    }
  }

  onMounted(() => {
    syncMenus()
  })

  watch(
    () => menuAccessStore.initialized,
    (initialized) => {
      dynamicMenusLoaded.value = initialized
    },
    { immediate: true },
  )

  watch(
    () => authStore.isAuthenticated,
    async (isAuthenticated) => {
      if (isAuthenticated) {
        await syncMenus(true)
      } else {
        menuAccessStore.clearCache()
        dynamicMenusLoaded.value = false
      }
    },
  )

  return {
    searchQuery,
    visibleSections,
    activeSectionKey,
    pageTitle,
    pageEyebrow,
    pageDescription,
    pageIcon,
    pageAccent,
    pageBreadcrumbs,
    menuStatusTone,
    menuStatusLabel,
    menuStatusDetail,
    usingFallbackMenus,
    syncMenus,
  }
}