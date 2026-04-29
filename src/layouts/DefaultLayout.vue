<template>
  <div class="default-layout" :data-shell-theme="shellTheme">
    <!-- Mobile overlay -->
    <button v-if="drawer && !isDesktop" aria-label="Close navigation"
      class="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] lg:hidden" type="button" @click="drawer = false" />

    <!-- Sidebar -->
    <aside class="sidebar" :class="sidebarClasses" @mouseenter="handleSidebarMouseEnter"
      @mouseleave="handleSidebarMouseLeave">
      <div class="sidebar__header">
        <div class="sidebar__logo">
          <Icon icon="solar:atom-bold-duotone" />
        </div>
        <div v-if="sidebarExpanded" class="sidebar__brand">
          <span class="sidebar__app-name">{{ appName }}</span>
          <span class="sidebar__version">v{{ appVersion }}</span>
        </div>
      </div>

      <nav class="sidebar__nav">
        <div v-for="section in navigationSections" :key="section.id" class="sidebar__section">
          <div v-if="sidebarExpanded" class="sidebar__section-label">{{ section.title }}</div>

          <template v-for="item in section.items" :key="item.path || item.title">
            <!-- Group with children -->
            <div v-if="item.children">
              <button class="sidebar__item" :class="{ 'sidebar__item--active': isGroupActive(item) }" type="button"
                :title="sidebarExpanded ? undefined : item.title" @click="toggleGroup(item)">
                <Icon class="sidebar__item-icon" :icon="normalizeIcon(item.icon)" />
                <span v-if="sidebarExpanded" class="sidebar__item-label">{{ item.title }}</span>
                <Icon v-if="sidebarExpanded" class="sidebar__item-chevron" :class="{ 'rotate-180': isGroupOpen(item) }"
                  icon="solar:alt-arrow-down-linear" />
              </button>

              <div v-if="sidebarExpanded && isGroupOpen(item)" class="sidebar__children">
                <router-link v-for="child in item.children" :key="child.path" class="sidebar__item sidebar__item--child"
                  :class="{ 'sidebar__item--active': isItemActive(child) }" :to="child.path || '/'"
                  @click="handleNavigationSelection">
                  <Icon class="sidebar__item-icon sidebar__item-icon--sm" :icon="normalizeIcon(child.icon)" />
                  <span class="sidebar__item-label">{{ child.title }}</span>
                </router-link>
              </div>
            </div>

            <!-- Single item -->
            <router-link v-else class="sidebar__item" :class="{ 'sidebar__item--active': isItemActive(item) }"
              :title="sidebarExpanded ? undefined : item.title" :to="item.path || '/'"
              @click="handleNavigationSelection">
              <Icon class="sidebar__item-icon" :icon="normalizeIcon(item.icon)" />
              <span v-if="sidebarExpanded" class="sidebar__item-label">{{ item.title }}</span>
            </router-link>
          </template>
        </div>
      </nav>

      <div class="sidebar__footer">
        <button class="sidebar__collapse-btn" type="button" :title="rail ? 'Expand sidebar' : 'Collapse sidebar'"
          @click="rail = !rail">
          <Icon :icon="rail ? 'solar:alt-arrow-right-linear' : 'solar:alt-arrow-left-linear'" />
          <span v-if="sidebarExpanded">Collapse</span>
        </button>
      </div>
    </aside>

    <!-- Main area -->
    <div class="main-area">
      <header class="topbar">
        <button aria-label="Toggle navigation" class="topbar__menu-btn lg:hidden" type="button"
          @click="drawer = !drawer">
          <Icon icon="solar:hamburger-menu-line-duotone" />
        </button>

        <!-- Search -->
        <div class="topbar__search">
          <Icon class="topbar__search-icon" icon="solar:magnifer-linear" />
          <input v-model="searchQuery" aria-label="Filter navigation" class="topbar__search-input" placeholder="Filter navigation" type="text" />
          <kbd v-if="!searchQuery" class="topbar__search-kbd">Nav</kbd>
        </div>

        <div class="topbar__actions">
          <!-- Theme toggle -->
          <button :aria-label="quickThemeToggleLabel" class="topbar__icon-btn" type="button" @click="toggleTheme">
            <Icon :icon="isDark ? 'solar:sun-bold-duotone' : 'solar:moon-stars-bold-duotone'" />
          </button>

          <!-- Theme settings -->
          <div class="topbar__dropdown" ref="themeDropdownRef">
            <button class="topbar__icon-btn" type="button" :aria-expanded="themeDropdownOpen"
              :aria-label="'Appearance settings, current: ' + themeSummaryLabel" :title="'Appearance: ' + themeSummaryLabel"
              @click="themeDropdownOpen = !themeDropdownOpen">
              <Icon icon="solar:palette-round-bold-duotone" />
            </button>

            <Transition name="dropdown">
              <div v-if="themeDropdownOpen" class="topbar__dropdown-panel topbar__dropdown-panel--theme">
                <div class="dropdown-section">
                  <p class="dropdown-label">Primary</p>
                  <div class="theme-color-grid theme-color-grid--primary">
                    <button v-for="option in THEME_PRIMARY_OPTIONS" :key="option.value" class="theme-color-btn"
                      :class="{
                        'theme-color-btn--active': themePreferences.primary === option.value,
                        'theme-color-btn--preset': option.value === 'preset',
                      }" :title="option.label" type="button" @click="setPrimaryPreference(option.value)">
                      <span class="theme-color-dot" :style="{ background: option.preview }" />
                    </button>
                  </div>
                </div>

                <div class="dropdown-section">
                  <p class="dropdown-label">Surface</p>
                  <div class="theme-color-grid">
                    <button v-for="option in THEME_SURFACE_OPTIONS" :key="option.value" class="theme-color-btn"
                      :class="{
                        'theme-color-btn--active': themePreferences.surface === option.value,
                        'theme-color-btn--preset': option.value === 'preset',
                      }" :title="option.label" type="button" @click="setSurfacePreference(option.value)">
                      <span class="theme-color-dot" :style="{ background: option.preview }" />
                    </button>
                  </div>
                </div>

                <div class="dropdown-section">
                  <p class="dropdown-label">Theme</p>
                  <SelectButton :modelValue="themePreferences.preset" :options="THEME_PRESET_OPTIONS"
                    class="theme-preset-switch" optionLabel="label" optionValue="value"
                    @update:modelValue="setPresetPreference" />
                </div>
              </div>
            </Transition>
          </div>

          <!-- User menu -->
          <div class="topbar__dropdown" ref="userDropdownRef">
            <button class="topbar__user-btn" type="button" :aria-expanded="userDropdownOpen"
              aria-label="Open user menu" @click="userDropdownOpen = !userDropdownOpen">
              <span class="topbar__avatar" :class="authStore.isGuest ? 'topbar__avatar--guest' : ''">{{ userInitial
                }}</span>
              <span class="topbar__user-name hidden sm:block">{{ authStore.displayName }}</span>
              <Icon class="topbar__user-chevron hidden sm:block" icon="solar:alt-arrow-down-linear" />
            </button>

            <Transition name="dropdown">
              <div v-if="userDropdownOpen" class="topbar__dropdown-panel topbar__dropdown-panel--user">
                <div class="user-panel__header">
                  <span class="user-panel__avatar" :class="authStore.isGuest ? 'topbar__avatar--guest' : ''">{{
                    userInitial
                    }}</span>
                  <div class="user-panel__info">
                    <p class="user-panel__name">{{ authStore.displayName }}</p>
                    <p class="user-panel__role">{{ authStore.displayRole }}</p>
                  </div>
                </div>

                <div class="user-panel__session">
                  <div class="user-panel__session-row">
                    <div>
                      <p class="user-panel__session-label">{{ accessLabel }}</p>
                      <p class="user-panel__session-desc">{{ accessDescription }}</p>
                    </div>
                    <span class="user-panel__badge"
                      :class="authStore.isGuest ? 'user-panel__badge--guest' : authStore.hasDUTAccess ? 'user-panel__badge--connected' : 'user-panel__badge--standard'">{{
                      accessBadge }}</span>
                  </div>
                </div>

                <button class="user-panel__logout" type="button" @click="handleLogout">
                  <Icon icon="solar:logout-2-bold-duotone" />
                  Sign out
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <div v-if="appConfigStore.isNavigating" class="topbar__progress" />
      </header>

      <!-- Mobile search -->
      <div class="topbar__mobile-search lg:hidden">
        <Icon class="topbar__search-icon" icon="solar:magnifer-linear" />
        <input v-model="searchQuery" aria-label="Filter navigation" class="topbar__search-input" placeholder="Filter navigation" type="text" />
      </div>

      <div v-if="appConfigError" class="shell-config-alert" role="status">
        Using fallback app settings. {{ appConfigError }}
      </div>

      <main class="main-content">
        <slot />
      </main>

      <footer class="app-footer">
        <span>{{ currentYear }} {{ appName }}</span>
        <span>v{{ appVersion }}</span>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import SelectButton from 'primevue/selectbutton'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppConfigStore } from '@/core/stores/appConfig.store'
import { useMenuAccessStore } from '@/features/admin/stores/menuAccess.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import {
  resolveThemeMode,
  THEME_PRESET_OPTIONS,
  THEME_PRIMARY_OPTIONS,
  THEME_SURFACE_OPTIONS,
  type ThemePresetName,
  type ThemePrimaryName,
  type ThemeSurfaceName,
  useDrawerState,
  useThemeState,
} from '@/shared/composables'

interface MenuItem {
  title: string
  icon: string
  path?: string
  children?: MenuItem[]
}

interface NavigationSection {
  id: string
  title: string
  items: MenuItem[]
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const menuAccessStore = useMenuAccessStore()
const appConfigStore = useAppConfigStore()
const {
  applyThemePreferences,
  cycleThemeMode,
  loadThemePreferences,
  setThemePreferences,
  themePreferences,
} = useThemeState()
const { appName, appVersion, error: appConfigError } = storeToRefs(appConfigStore)
const { drawer, rail } = useDrawerState(true, false)

const searchQuery = ref('')
const dynamicMenusLoaded = ref(false)
const openGroups = ref<string[]>([])
const currentYear = new Date().getFullYear()
const hoverExpanded = ref(false)
const themeDropdownOpen = ref(false)
const userDropdownOpen = ref(false)
const themeDropdownRef = ref<HTMLElement | null>(null)
const userDropdownRef = ref<HTMLElement | null>(null)
const isDesktop = ref(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true)

const sidebarExpanded = computed(() => {
  if (!drawer.value) return false
  if (!rail.value) return true
  return hoverExpanded.value
})

const SUPERADMIN_ONLY_PATHS = new Set(['/admin/menu-access', '/admin/cleanup', '/admin/app-config'])
const GUEST_MAIN_PATHS = new Set(['/dut/top-products/analysis', '/dut/data-explorer'])
const ADMIN_MAIN_PATHS = new Set(['/dashboard'])
const DUPLICATE_MENU_TITLES = new Set(['System Config'])

const staticMainItems: MenuItem[] = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', path: '/dashboard' },
  {
    title: 'Top Products',
    icon: 'mdi-trophy',
    children: [
      { title: 'Analysis', icon: 'mdi-circle-small', path: '/dut/top-products/analysis' },
      { title: 'Database', icon: 'mdi-circle-small', path: '/dut/top-products/data' },
    ],
  },
  { title: 'Data Explorer', icon: 'mdi-database-search', path: '/dut/data-explorer' },
]

const staticToolsItems: MenuItem[] = [
  {
    title: 'File Upload',
    icon: 'mdi-file-upload',
    children: [
      { title: 'Upload File', icon: 'mdi-circle-small', path: '/parsing' },
      { title: 'Parse & Download', icon: 'mdi-circle-small', path: '/parsing/download-format' },
    ],
  },
  {
    title: 'Compare Files',
    icon: 'mdi-file-compare',
    children: [
      { title: 'Compare Files', icon: 'mdi-circle-small', path: '/compare' },
      { title: 'DVT-MC2 Compare', icon: 'mdi-circle-small', path: '/compare/dvt-mc2' },
    ],
  },
  { title: 'MasterControl Analyze', icon: 'mdi-file-chart', path: '/mastercontrol/analyze' },
  { title: 'DVT to MC2 Converter', icon: 'mdi-file-swap', path: '/conversion/dvt-to-mc2' },
]

const staticSystemItems: MenuItem[] = [
  {
    title: 'System Configuration',
    icon: 'mdi-shield-lock',
    children: [
      { title: 'User Management', icon: 'mdi-circle-small', path: '/admin/users' },
      { title: 'Roles & Permissions', icon: 'mdi-circle-small', path: '/admin/rbac' },
      { title: 'Menu Access', icon: 'mdi-circle-small', path: '/admin/menu-access' },
      { title: 'App Configuration', icon: 'mdi-circle-small', path: '/admin/app-config' },
    ],
  },
  { title: 'System Cleanup', icon: 'mdi-delete-sweep', path: '/admin/cleanup' },
]

const resolvedThemeMode = computed(() => resolveThemeMode(themePreferences.value.mode))
const isDark = computed(() => resolvedThemeMode.value === 'dark')
const shellTheme = computed(() => (isDark.value ? 'dark' : 'light'))
const userInitial = computed(() => authStore.displayName.slice(0, 1).toUpperCase())
const accessLabel = computed(() => {
  if (authStore.isGuest) return 'Guest access'
  return authStore.loginType === 'external' ? 'External access' : 'Local access'
})
const accessDescription = computed(() => {
  if (authStore.isGuest) return 'Limited read-only mode.'
  return authStore.hasDUTAccess ? 'DUT session connected.' : 'Application session only.'
})
const accessBadge = computed(() => {
  if (authStore.isGuest) return 'Guest'
  return authStore.hasDUTAccess ? 'Connected' : 'Standard'
})
const themeSummaryLabel = computed(() => {
  if (themePreferences.value.mode === 'system') {
    return `System ${resolvedThemeMode.value === 'dark' ? 'Dark' : 'Light'}`
  }
  return themePreferences.value.mode === 'dark' ? 'Dark' : 'Light'
})
const quickThemeToggleLabel = computed(() =>
  resolvedThemeMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
)
const sidebarClasses = computed(() => {
  if (!drawer.value) {
    return 'sidebar--hidden'
  }
  if (rail.value && !hoverExpanded.value) {
    return 'sidebar--collapsed'
  }
  if (rail.value && hoverExpanded.value) {
    return 'sidebar--collapsed sidebar--hover-expanded'
  }
  return 'sidebar--expanded'
})

function filterItemByPaths(item: MenuItem, allowed: Set<string>): MenuItem | null {
  if (item.children) {
    const filteredChildren = item.children.filter((child) => child.path && allowed.has(child.path))
    if (filteredChildren.length === 0) return null
    return { ...item, children: filteredChildren }
  }

  if (item.path && allowed.has(item.path)) {
    return item
  }

  return null
}

function filterOutSuperAdminItems(items: MenuItem[]): MenuItem[] {
  return items.reduce<MenuItem[]>((accumulator, item) => {
    if (item.children) {
      const filteredChildren = item.children.filter(
        (child) => !child.path || !SUPERADMIN_ONLY_PATHS.has(child.path),
      )
      if (filteredChildren.length > 0) {
        accumulator.push({ ...item, children: filteredChildren })
      }
      return accumulator
    }

    if (!item.path || !SUPERADMIN_ONLY_PATHS.has(item.path)) {
      accumulator.push(item)
    }

    return accumulator
  }, [])
}

function filterBySearch(items: MenuItem[]): MenuItem[] {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return items

  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(query) ||
      item.children?.some((child) => child.title.toLowerCase().includes(query)),
  )
}

const menuTree = computed(() => {
  if (dynamicMenusLoaded.value && menuAccessStore.initialized) {
    const tree = menuAccessStore.buildMenuTree()
    return {
      main: tree.main.length > 0 ? tree.main : staticMainItems,
      tools: tree.tools.length > 0 ? tree.tools : staticToolsItems,
      system: tree.system.length > 0 ? tree.system : staticSystemItems,
    }
  }

  return {
    main: staticMainItems,
    tools: staticToolsItems,
    system: staticSystemItems,
  }
})

const visibleMainItems = computed(() => {
  let items = filterBySearch(menuTree.value.main)
  if (authStore.isGuest) {
    items = items.reduce<MenuItem[]>((accumulator, item) => {
      const filtered = filterItemByPaths(item, GUEST_MAIN_PATHS)
      if (filtered) accumulator.push(filtered)
      return accumulator
    }, [])
  } else if (!authStore.isAdmin) {
    items = items.filter((item) => !item.path || !ADMIN_MAIN_PATHS.has(item.path))
  }
  return items
})

const visibleToolsItems = computed(() => {
  if (!authStore.isUser) return []
  return filterBySearch(menuTree.value.tools)
})

const visibleSystemItems = computed(() => {
  if (!authStore.isAdmin) return []
  let searchedItems = filterBySearch(menuTree.value.system)
  searchedItems = searchedItems.filter((item) => !DUPLICATE_MENU_TITLES.has(item.title))
  if (authStore.isAdmin && !authStore.isSuperAdmin) {
    return filterOutSuperAdminItems(searchedItems)
  }
  return searchedItems
})

const navigationSections = computed<NavigationSection[]>(() => {
  const sections: NavigationSection[] = []

  if (visibleMainItems.value.length > 0) {
    sections.push({ id: 'main', title: 'Main', items: visibleMainItems.value })
  }

  if (visibleToolsItems.value.length > 0) {
    sections.push({ id: 'tools', title: 'Tools', items: visibleToolsItems.value })
  }

  if (visibleSystemItems.value.length > 0) {
    sections.push({ id: 'system', title: 'System', items: visibleSystemItems.value })
  }

  return sections
})

function groupKey(item: MenuItem) {
  return item.path || item.title
}

function isItemActive(item: MenuItem) {
  return Boolean(item.path && item.path === route.path)
}

function isGroupActive(item: MenuItem) {
  if (isItemActive(item)) return true
  return Boolean(item.children?.some((child) => child.path === route.path))
}

function isGroupOpen(item: MenuItem) {
  if (searchQuery.value.trim().length > 0) return true
  if (isGroupActive(item)) return true
  return openGroups.value.includes(groupKey(item))
}

function toggleGroup(item: MenuItem) {
  const key = groupKey(item)
  if (openGroups.value.includes(key)) {
    openGroups.value = openGroups.value.filter((entry) => entry !== key)
    return
  }
  openGroups.value = [...openGroups.value, key]
}

function normalizeIcon(icon: string | undefined) {
  if (!icon) return 'solar:widget-5-bold-duotone'
  if (icon.startsWith('mdi:')) return icon
  if (icon.startsWith('mdi-')) return icon.replace('mdi-', 'mdi:')
  return icon
}

function handleNavigationSelection() {
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    drawer.value = false
  }
}

function handleSidebarMouseEnter() {
  if (rail.value && isDesktop.value) {
    hoverExpanded.value = true
  }
}

function handleSidebarMouseLeave() {
  hoverExpanded.value = false
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (
    themeDropdownOpen.value &&
    themeDropdownRef.value &&
    !themeDropdownRef.value.contains(target)
  ) {
    themeDropdownOpen.value = false
  }
  if (userDropdownOpen.value && userDropdownRef.value && !userDropdownRef.value.contains(target)) {
    userDropdownOpen.value = false
  }
}

function handleResize() {
  isDesktop.value = window.innerWidth >= 1024
}

function applyShellTheme() {
  document.documentElement.dataset.shellTheme = shellTheme.value
}

function toggleTheme() {
  cycleThemeMode()
}

function setThemePreference(nextPreferences: Partial<typeof themePreferences.value>) {
  setThemePreferences(nextPreferences)
}

function setPresetPreference(preset: ThemePresetName) {
  setThemePreference({ preset })
}

function setPrimaryPreference(primary: ThemePrimaryName) {
  setThemePreference({ primary })
}

function setSurfacePreference(surface: ThemeSurfaceName) {
  setThemePreference({ surface })
}

function syncThemeState() {
  const storedPreferences = loadThemePreferences()
  applyThemePreferences(storedPreferences, { persist: false })
}

async function syncMenus(forceRefresh = false) {
  if (!authStore.isAuthenticated) {
    menuAccessStore.clearCache()
    dynamicMenusLoaded.value = false
    return
  }

  try {
    await Promise.race([
      menuAccessStore.fetchMenus(authStore.isGuest, forceRefresh),
      new Promise<void>((resolve) => setTimeout(resolve, 3000)),
    ])
  } catch {
    // Static fallback remains active on errors.
  }

  dynamicMenusLoaded.value = menuAccessStore.initialized
}

function handleLogout() {
  authStore.logout()
  menuAccessStore.clearCache()
  dynamicMenusLoaded.value = false
  void router.push('/login')
}

let systemThemeMediaQuery: MediaQueryList | null = null

function handleSystemThemeChange() {
  if (themePreferences.value.mode !== 'system') return
  applyThemePreferences(themePreferences.value, { persist: false })
}

onMounted(() => {
  syncThemeState()
  applyShellTheme()
  if (typeof window !== 'undefined') {
    systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemThemeMediaQuery.addEventListener('change', handleSystemThemeChange)
    document.addEventListener('click', handleClickOutside)
    window.addEventListener('resize', handleResize)
  }
  void syncMenus()
})

onBeforeUnmount(() => {
  systemThemeMediaQuery?.removeEventListener('change', handleSystemThemeChange)
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
})

watch(
  isDark,
  () => {
    applyShellTheme()
  },
  { immediate: true },
)

watch(
  () => route.path,
  () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      drawer.value = false
    }
  },
)

watch(
  [() => authStore.isAuthenticated, () => authStore.isGuest],
  ([isAuthenticated, isGuest], [wasAuthenticated, wasGuest]) => {
    if (!isAuthenticated) {
      menuAccessStore.clearCache()
      dynamicMenusLoaded.value = false
      return
    }

    const forceRefresh = !wasAuthenticated || wasGuest !== isGuest
    void syncMenus(forceRefresh)
  },
)
</script>

<style scoped>
.default-layout {
  --shell-bg: var(--app-shell-bg, var(--app-canvas));
  --shell-header: var(--app-shell-header, var(--app-panel-strong));
  --shell-sidebar: var(--app-shell-sidebar, var(--app-panel));
  --shell-panel: var(--app-panel);
  --shell-panel-strong: var(--app-panel-strong);
  --shell-ink: var(--app-ink);
  --shell-muted: var(--app-muted);
  --shell-border: var(--app-border);
  --shell-accent: var(--app-accent);
  --shell-accent-soft: var(--app-accent-soft);
  --shell-danger: var(--app-danger);
  --shell-shadow: var(--app-shadow);
  --shell-shadow-soft: var(--app-shadow-soft);
  --sidebar-width: 15rem;
  --sidebar-collapsed-width: 4rem;

  display: flex;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--shell-bg);
  color: var(--shell-ink);
}

/* ── Sidebar ── */
.sidebar {
  position: fixed;
  inset-block: 0;
  left: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  border-right: 1px solid var(--shell-border);
  background: var(--shell-sidebar);
  padding: 0.75rem;
  overflow: hidden;
  transition: width 0.2s ease, transform 0.2s ease;
}

@media (min-width: 1024px) {
  .sidebar {
    position: sticky;
    top: 0;
    z-index: 20;
    height: 100vh;
  }
}

.sidebar--hidden {
  transform: translateX(-100%);
}

@media (min-width: 1024px) {
  .sidebar--hidden {
    width: 0;
    padding: 0;
    border-right: 0;
    transform: none;
    overflow: hidden;
  }
}

.sidebar--collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar--collapsed.sidebar--hover-expanded {
  width: var(--sidebar-width);
  box-shadow: var(--shell-shadow);
  z-index: 30;
}

.sidebar--expanded {
  width: var(--sidebar-width);
}

.sidebar__header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  min-height: 2rem;
}

.sidebar__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.375rem;
  background: var(--shell-accent-soft);
  color: var(--shell-accent);
  font-size: 1.125rem;
  flex-shrink: 0;
}

.sidebar__brand {
  min-width: 0;
  white-space: nowrap;
}

.sidebar__app-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--shell-ink);
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__version {
  font-size: 0.6875rem;
  color: var(--shell-muted);
}

.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 120, 120, 0.3) transparent;
}

.sidebar__section {
  margin-bottom: 1rem;
}

.sidebar__section-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--shell-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.25rem;
  white-space: nowrap;
}

.sidebar__item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.5rem;
  border-radius: 0.375rem;
  border: none;
  background: transparent;
  color: var(--shell-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
  text-align: left;
}

.sidebar__item:hover {
  background: var(--shell-panel);
  color: var(--shell-ink);
}

.sidebar__item--active {
  background: var(--shell-accent-soft);
  color: var(--shell-accent);
  font-weight: 600;
}

.sidebar__item-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.sidebar__item-icon--sm {
  font-size: 1rem;
}

.sidebar__item-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__item-chevron {
  font-size: 0.875rem;
  flex-shrink: 0;
  transition: transform 0.15s;
}

.sidebar__children {
  margin-left: 1rem;
  padding-left: 0.625rem;
  border-left: 1px solid var(--shell-border);
}

.sidebar__item--child {
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
}

.sidebar__footer {
  border-top: 1px solid var(--shell-border);
  padding-top: 0.35rem;
  margin-top: 0.25rem;
}

.sidebar__collapse-btn {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.1rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--shell-muted);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

@media (min-width: 1024px) {
  .sidebar__collapse-btn {
    display: flex;
  }
}

.sidebar__collapse-btn:hover {
  background: var(--shell-panel);
  color: var(--shell-ink);
}

/* ── Main area ── */
.main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* ── Topbar ── */
.topbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--shell-border);
  background: var(--shell-header);
  backdrop-filter: blur(8px);
  min-height: 3rem;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}

.topbar__menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--shell-border);
  border-radius: 0.375rem;
  background: transparent;
  color: var(--shell-ink);
  font-size: 1.25rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.topbar__menu-btn:hover {
  background: var(--shell-panel);
  border-color: var(--shell-accent);
}

.topbar__search {
  display: none;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  max-width: 24rem;
  padding: 0.4375rem 0.75rem;
  border: 1px solid var(--shell-border);
  border-radius: 0.375rem;
  background: var(--shell-panel-strong);
  min-height: 2.25rem;
}

@media (min-width: 1024px) {
  .topbar__search {
    display: flex;
  }
}

.topbar__search-icon {
  font-size: 1rem;
  color: var(--shell-muted);
  flex-shrink: 0;
}

.topbar__search-input {
  flex: 1;
  border: 0;
  background: transparent;
  font-size: 0.8125rem;
  color: var(--shell-ink);
  outline: none;
}

.topbar__search-input::placeholder {
  color: var(--shell-muted);
}

.topbar__search-kbd {
  font-size: 0.6875rem;
  color: var(--shell-muted);
  background: var(--shell-panel);
  border: 1px solid var(--shell-border);
  border-radius: 0.25rem;
  padding: 0.0625rem 0.375rem;
  font-family: inherit;
}

.topbar__mobile-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  margin: 0.5rem 1rem;
  border: 1px solid var(--shell-border);
  border-radius: 0.375rem;
  background: var(--shell-panel-strong);
}

.shell-config-alert {
  margin: 0.5rem 1.5rem 0;
  border: 1px solid var(--app-warning-line);
  border-radius: 0.5rem;
  background: var(--app-warning-soft);
  color: var(--app-warning);
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
}

@media (min-width: 1024px) {
  .topbar__mobile-search {
    display: none;
  }
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.topbar__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--shell-border);
  border-radius: 0.375rem;
  background: transparent;
  color: var(--shell-muted);
  font-size: 1.125rem;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}

.topbar__icon-btn:hover {
  background: var(--shell-panel);
  color: var(--shell-ink);
  border-color: var(--shell-accent);
}

.topbar__dropdown {
  position: relative;
}

.topbar__dropdown-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  z-index: 50;
  border: 1px solid var(--shell-border);
  border-radius: 0.5rem;
  background: var(--shell-panel-strong);
  box-shadow: var(--shell-shadow);
  padding: 0.75rem;
}

.topbar__dropdown-panel--theme {
  width: 20.75rem;
}

.topbar__dropdown-panel--user {
  width: 16rem;
}

.dropdown-section {
  padding: 0.5rem 0;
}

.dropdown-section+.dropdown-section {
  border-top: 1px solid var(--shell-border);
}

.dropdown-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--shell-muted);
  margin-bottom: 0.375rem;
}

.theme-color-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 0.45rem;
}

.theme-color-grid--primary {
  grid-template-columns: repeat(9, minmax(0, 1fr));
}

.theme-color-btn {
  width: 1.58rem;
  height: 1.58rem;
  padding: 0.14rem;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  justify-self: center;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}

.theme-color-btn:hover {
  border-color: color-mix(in srgb, var(--shell-ink) 18%, transparent);
  transform: translateY(-1px);
}

.theme-color-btn--active {
  border-color: color-mix(in srgb, var(--shell-ink) 88%, white);
  box-shadow: 0 0 0 1px var(--shell-panel-strong);
}

.theme-color-btn--preset .theme-color-dot {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.theme-color-dot {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

.theme-preset-switch :deep(.p-selectbutton) {
  display: flex;
  width: 100%;
}

.theme-preset-switch :deep(.p-selectbutton .p-togglebutton),
.theme-preset-switch :deep(.p-selectbutton .p-button) {
  flex: 1 1 0;
  justify-content: center;
}

/* ── User dropdown ── */
.topbar__user-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem;
  padding-right: 0.5rem;
  border: 1px solid var(--shell-border);
  border-radius: 0.375rem;
  background: transparent;
  color: var(--shell-ink);
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 500;
  transition: background 0.15s, border-color 0.15s;
}

.topbar__user-btn:hover {
  background: var(--shell-panel);
  border-color: var(--shell-accent);
}

.topbar__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--shell-accent-soft);
  color: var(--shell-accent);
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.topbar__avatar--guest {
  background: rgba(198, 134, 37, 0.18);
  color: rgb(156, 102, 18);
}

.topbar__user-name {
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar__user-chevron {
  font-size: 0.75rem;
  color: var(--shell-muted);
}

.user-panel__header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid var(--shell-border);
}

.user-panel__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--shell-accent-soft);
  color: var(--shell-accent);
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
}

.user-panel__info {
  min-width: 0;
}

.user-panel__name {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--shell-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-panel__role {
  margin: 0;
  font-size: 0.75rem;
  color: var(--shell-muted);
}

.user-panel__session {
  padding: 0.5rem 0;
}

.user-panel__session-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.user-panel__session-label {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--shell-ink);
}

.user-panel__session-desc {
  margin: 0;
  font-size: 0.6875rem;
  color: var(--shell-muted);
}

.user-panel__badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  flex-shrink: 0;
}

.user-panel__badge--guest {
  background: rgba(198, 134, 37, 0.18);
  color: rgb(156, 102, 18);
}

.user-panel__badge--connected {
  background: rgba(15, 118, 110, 0.16);
  color: var(--shell-accent);
}

.user-panel__badge--standard {
  background: rgba(35, 83, 134, 0.14);
  color: rgb(33, 87, 145);
}

.user-panel__logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.5rem;
  border: none;
  border-radius: 0.375rem;
  background: rgba(163, 61, 45, 0.08);
  color: var(--shell-danger);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.user-panel__logout:hover {
  background: rgba(163, 61, 45, 0.16);
}

/* ── Main content ── */
.main-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem 1.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 120, 120, 0.35) transparent;
}

.main-content > * {
  min-width: 0;
  max-width: 100%;
}

.main-content::-webkit-scrollbar {
  width: 6px;
}

.main-content::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(120, 120, 120, 0.35);
}

.app-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.625rem 1.5rem;
  border-top: 1px solid var(--shell-border);
  font-size: 0.75rem;
  color: var(--shell-muted);
  flex-shrink: 0;
  min-height: 2.25rem;
}

@media (max-width: 767px) {
  .topbar {
    padding: 0.5rem 0.75rem;
  }

  .topbar__mobile-search {
    margin: 0.5rem 0.75rem;
  }

  .main-content {
    padding: 0.75rem;
  }

  .app-footer {
    padding: 0.625rem 0.75rem;
  }
}

/* ── Progress bar ── */
.topbar__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(15, 118, 110, 0.08);
  overflow: hidden;
}

.topbar__progress::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 -35%;
  width: 35%;
  background: linear-gradient(90deg, transparent, var(--shell-accent), transparent);
  animation: progress-slide 1.1s linear infinite;
}

/* ── Dropdown transitions ── */
.dropdown-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes progress-slide {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(400%);
  }
}
</style>
