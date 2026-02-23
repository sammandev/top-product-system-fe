<template>
    <v-app>
        <!-- App Bar (Sticky) -->
        <v-app-bar :elevation="2" app color="primary" density="compact">
            <v-app-bar-nav-icon variant="text" @click="drawer = !drawer">
                <v-icon color="white">mdi-menu</v-icon>
            </v-app-bar-nav-icon>

            <!-- <v-toolbar-title class="d-flex align-center">
                <v-icon class="mr-2" color="white">mdi-atom-variant</v-icon>
                <span class="font-weight-bold">{{ appName }}</span>
            </v-toolbar-title> -->

            <v-spacer />

            <!-- Search Bar (Desktop only) -->
            <!-- <v-text-field v-if="$vuetify.display.mdAndUp" density="compact" variant="solo"
                prepend-inner-icon="mdi-magnify" placeholder="Search..." hide-details single-line rounded class="mr-4"
                style="max-width: 300px" /> -->

            <!-- Notifications -->
            <!-- <v-btn icon variant="text" class="mr-2">
                <v-badge color="error" content="3">
                    <v-icon color="white">mdi-bell</v-icon>
                </v-badge>
            </v-btn> -->

            <!-- Theme Toggle -->
            <v-btn icon variant="text" class="mr-2" @click="toggleTheme">
                <v-icon color="white">{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
            </v-btn>

            <!-- User Menu -->
            <v-menu location="bottom">
                <template #activator="{ props }">
                    <v-btn v-bind="props" variant="text" class="text-none">
                        <v-avatar size="32" :color="authStore.isGuest ? 'warning' : 'secondary'" class="mr-2">
                            <v-icon size="small">{{ authStore.isGuest ? 'mdi-account-question' : 'mdi-account' }}</v-icon>
                        </v-avatar>
                        <span v-if="$vuetify.display.smAndUp" style="color: white;">
                            {{ authStore.displayName }}
                        </span>
                        <v-icon class="ml-1" size="small" color="white">mdi-chevron-down</v-icon>
                    </v-btn>
                </template>

                <v-list min-width="250">
                    <v-list-item>
                        <template #prepend>
                            <v-avatar :color="authStore.isGuest ? 'warning' : 'secondary'" size="40">
                                <v-icon>{{ authStore.isGuest ? 'mdi-account-question' : 'mdi-account' }}</v-icon>
                            </v-avatar>
                        </template>
                        <v-list-item-title class="font-weight-bold">
                            {{ authStore.displayName }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                            {{ authStore.displayRole }}
                        </v-list-item-subtitle>
                    </v-list-item>

                    <!-- Guest Mode Indicator -->
                    <template v-if="authStore.isGuest">
                        <v-divider class="my-2" />
                        <v-list-item prepend-icon="mdi-information" title="Guest Mode"
                            subtitle="Limited access - login for full features">
                            <template #append>
                                <v-chip color="warning" size="small">Guest</v-chip>
                            </template>
                        </v-list-item>
                    </template>

                    <v-divider class="my-2" />

                    <v-list-item v-if="!authStore.isGuest" prepend-icon="mdi-account-cog" title="Profile Settings" />
                    <v-list-item v-if="!authStore.isGuest" prepend-icon="mdi-cog" title="Preferences" />

                    <v-divider v-if="!authStore.isGuest" class="my-2" />

                    <v-list-item v-if="authStore.hasDUTAccess && !authStore.isGuest" prepend-icon="mdi-cloud-check"
                        title="DUT Access" subtitle="External login active">
                        <template #append>
                            <v-chip color="success" size="small">Active</v-chip>
                        </template>
                    </v-list-item>

                    <v-divider v-if="authStore.hasDUTAccess && !authStore.isGuest" class="my-2" />

                    <v-list-item prepend-icon="mdi-logout" title="Logout" @click="handleLogout" />
                </v-list>
            </v-menu>
        </v-app-bar>

        <!-- Navigation Drawer -->
        <v-navigation-drawer v-model="drawer" :rail="rail" :expand-on-hover="rail && drawer" app>
            <!-- Drawer Header -->
            <v-list-item class="px-2 py-3">
                <template #prepend>
                    <v-avatar color="primary" size="40">
                        <v-icon>mdi-atom-variant</v-icon>
                    </v-avatar>
                </template>
                <v-list-item-title class="font-weight-bold">{{ appName }}</v-list-item-title>
                <v-list-item-subtitle>v{{ appVersion }}</v-list-item-subtitle>
            </v-list-item>

            <v-divider />

            <!-- Search Box (only show when not in rail mode) -->
            <div v-if="!rail" class="pa-3">
                <v-text-field v-model="searchQuery" density="compact" variant="outlined"
                    prepend-inner-icon="mdi-magnify" placeholder="Search menu..." hide-details clearable single-line
                    rounded />
            </div>

            <!-- Navigation Items (Scrollable) -->
            <v-list density="compact" nav class="flex-grow-1 overflow-y-auto">
                <!-- Main Section -->
                <v-list-subheader v-if="!rail" class="mt-2">MAIN</v-list-subheader>
                <template v-for="item in visibleMainItems" :key="item.path">
                    <!-- Items with children (collapsible groups) -->
                    <v-list-group v-if="item.children" :value="item.title" fluid>
                        <template #activator="{ props }">
                            <v-list-item v-bind="props" :prepend-icon="item.icon" :title="item.title" rounded="xl"
                                color="primary" class="my-1" :active="isChildActive(item)" />
                        </template>
                        <v-list-item v-for="child in item.children" :key="child.path" :prepend-icon="child.icon"
                            :title="child.title" :to="child.path" :value="child.path" rounded="xl" color="primary"
                            class="my-1" />
                    </v-list-group>
                    <!-- Regular items -->
                    <v-list-item v-else :prepend-icon="item.icon" :title="item.title" :to="item.path" :value="item.path"
                        rounded="xl" color="primary" class="my-1" />
                </template>

                <!-- Tools Section (hidden for guests) -->
                <template v-if="authStore.isUser">
                    <v-list-subheader v-if="!rail" class="mt-3">TOOLS</v-list-subheader>
                    <template v-for="item in filteredToolsItems" :key="item.path">
                        <!-- Items with children (collapsible groups) -->
                        <v-list-group v-if="item.children" :value="item.title" fluid>
                            <template #activator="{ props }">
                                <v-list-item v-bind="props" :prepend-icon="item.icon" :title="item.title" rounded="xl"
                                    color="primary" class="my-1" />
                            </template>
                            <v-list-item v-for="child in item.children" :key="child.path" :prepend-icon="child.icon"
                                :title="child.title" :to="child.path" :value="child.path" rounded="xl" color="primary"
                                class="my-1" />
                        </v-list-group>
                        <!-- Regular items -->
                        <v-list-item v-else :prepend-icon="item.icon" :title="item.title" :to="item.path"
                            :value="item.path" rounded="xl" color="primary" class="my-1" />
                    </template>
                </template>

                <!-- System Section (Admin+ Only) -->
                <template v-if="authStore.isAdmin">
                    <v-list-subheader v-if="!rail" class="mt-3">SYSTEM</v-list-subheader>
                    <template v-for="item in visibleSystemItems" :key="item.path">
                        <!-- Items with children (collapsible groups like Access Control) -->
                        <v-list-group v-if="item.children" :value="item.title" fluid>
                            <template #activator="{ props }">
                                <v-list-item v-bind="props" :prepend-icon="item.icon" :title="item.title" rounded="xl"
                                    color="primary" class="my-1" :active="isChildActive(item)" />
                            </template>
                            <v-list-item v-for="child in item.children" :key="child.path" :prepend-icon="child.icon"
                                :title="child.title" :to="child.path" :value="child.path" rounded="xl" color="primary"
                                class="my-1" />
                        </v-list-group>
                        <!-- Regular items -->
                        <v-list-item v-else :prepend-icon="item.icon" :title="item.title" :to="item.path"
                            :value="item.path" rounded="xl" color="primary" class="my-1" />
                    </template>
                </template>
            </v-list>

            <!-- Drawer Footer -->
            <template #append>
                <v-divider />
                <v-list density="compact" nav>
                    <!-- User Info with Logout Button -->
                    <v-list-item v-if="!rail" prepend-icon="mdi-account-circle" :title="authStore.displayName"
                        :subtitle="authStore.isGuest ? 'Guest Access' : (authStore.loginType === 'external' ? 'External Access' : 'Local Access')"
                        rounded="xl" class="my-1">
                        <template #append>
                            <v-btn icon="mdi-logout" size="small" variant="text" color="error" @click="handleLogout" />
                        </template>
                    </v-list-item>

                    <!-- Collapse/Expand Toggle -->
                    <v-list-item v-if="$vuetify.display.lgAndUp"
                        :prepend-icon="rail ? 'mdi-menu-close' : 'mdi-menu-open'" :title="rail ? 'Expand' : 'Collapse'"
                        @click="rail = !rail" rounded="xl" class="my-1" />
                </v-list>
            </template>
        </v-navigation-drawer>

        <!-- Navigation Loading Indicator -->
        <v-progress-linear v-if="appConfigStore.isNavigating" indeterminate color="primary" class="position-fixed"
            style="z-index: 9999; top: 48px;" />

        <!-- Main Content Area -->
        <v-main class="default-layout__main">
            <!-- Content (scrollable) -->
            <div class="default-layout__content">
                <slot />
            </div>
        </v-main>

        <!-- Footer (Fixed at bottom) -->
        <v-footer app class="default-layout__footer" border>
            <v-container fluid class="default-layout__footer-container">
                <v-row align="center" justify="space-between" no-gutters>
                    <v-col cols="12" sm="auto" class="text-center text-sm-left">
                        <span class="text-caption">&copy; {{ currentYear }} {{ appName }}. All rights
                            reserved.</span>
                    </v-col>
                    <v-col cols="12" sm="auto" class="text-center text-sm-right">
                        <span class="text-caption">v{{ appVersion }}</span>
                    </v-col>
                </v-row>
            </v-container>
        </v-footer>
    </v-app>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAppConfigStore } from '@/core/stores/appConfig.store'
import { useMenuAccessStore } from '@/features/admin/stores/menuAccess.store'
import { useAuthStore } from '@/features/auth/stores'
import { useDrawerState, useThemeState } from '@/shared/composables'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const menuAccessStore = useMenuAccessStore()
const theme = useTheme()
const { saveTheme, loadTheme } = useThemeState()

// Drawer state with persistence
const { drawer, rail } = useDrawerState(true, false)

const searchQuery = ref('')

// Flag to track if dynamic menus are loaded
const dynamicMenusLoaded = ref(false)

const isDark = computed(() => theme.global.current.value.dark)

// Helper function to check if any child route is active (reactive with route)
function isChildActive(item: MenuItem): boolean {
  if (!item.children) return false
  const currentPath = route.path
  return item.children.some((child) => child.path === currentPath)
}

function toggleTheme() {
  const newTheme = theme.global.current.value.dark ? 'customLightTheme' : 'customDarkTheme'
  theme.change(newTheme)
  saveTheme(newTheme)
}

// Load saved theme on mount
const savedTheme = loadTheme()
if (savedTheme) {
  theme.change(savedTheme)
}

// Navigation Items - Main Section
interface MenuItem {
  title: string
  icon: string
  path?: string
  children?: MenuItem[]
}

// Static fallback menus (used when DB menus not loaded yet)
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
  { title: 'Data Explorer', icon: 'mdi-download-box', path: '/dut/data-explorer' },
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
    icon: 'mdi-compare',
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
    title: 'Access Control',
    icon: 'mdi-shield-lock',
    children: [
      { title: 'User Management', icon: 'mdi-circle-small', path: '/admin/users' },
      { title: 'Access Control', icon: 'mdi-circle-small', path: '/admin/access-control' },
      { title: 'Roles & Permissions', icon: 'mdi-circle-small', path: '/admin/rbac' },
      { title: 'Menu Access', icon: 'mdi-circle-small', path: '/admin/menu-access' },
    ],
  },
  { title: 'System Cleanup', icon: 'mdi-delete-sweep', path: '/admin/cleanup' },
  { title: 'App Configuration', icon: 'mdi-cog', path: '/admin/app-config' },
]

/** Paths only accessible to superadmin/developer in the System section. */
const SUPERADMIN_ONLY_PATHS = new Set([
  '/admin/rbac',
  '/admin/menu-access',
  '/admin/cleanup',
  '/admin/app-config',
])

/** Paths a guest can see in the Main section. */
const GUEST_MAIN_PATHS = new Set(['/dut/top-products/analysis', '/dut/data-explorer'])

// Dynamic menus from database (use static as fallback)
const mainItems = computed(() => {
  if (dynamicMenusLoaded.value && menuAccessStore.initialized) {
    const tree = menuAccessStore.buildMenuTree()
    return tree.main.length > 0 ? tree.main : staticMainItems
  }
  return staticMainItems
})

const toolsItems = computed(() => {
  if (dynamicMenusLoaded.value && menuAccessStore.initialized) {
    const tree = menuAccessStore.buildMenuTree()
    return tree.tools.length > 0 ? tree.tools : staticToolsItems
  }
  return staticToolsItems
})

const systemItems = computed(() => {
  if (dynamicMenusLoaded.value && menuAccessStore.initialized) {
    const tree = menuAccessStore.buildMenuTree()
    return tree.system.length > 0 ? tree.system : staticSystemItems
  }
  return staticSystemItems
})

// Filtered navigation items based on search
const filteredMainItems = computed(() => {
  if (!searchQuery.value) return mainItems.value
  const query = searchQuery.value.toLowerCase()
  return mainItems.value.filter(
    (item) =>
      item.title.toLowerCase().includes(query) ||
      item.children?.some((child) => child.title.toLowerCase().includes(query)),
  )
})

const filteredToolsItems = computed(() => {
  if (!searchQuery.value) return toolsItems.value
  const query = searchQuery.value.toLowerCase()
  return toolsItems.value.filter(
    (item) =>
      item.title.toLowerCase().includes(query) ||
      item.children?.some((child) => child.title.toLowerCase().includes(query)),
  )
})

const filteredSystemItems = computed(() => {
  if (!searchQuery.value) return systemItems.value
  const query = searchQuery.value.toLowerCase()
  return systemItems.value.filter(
    (item) =>
      item.title.toLowerCase().includes(query) ||
      item.children?.some((child) => child.title.toLowerCase().includes(query)),
  )
})

/**
 * Helper: filter a menu item's children by allowed paths (set-based).
 * Returns a new item with only matching children, or null if none match.
 */
function filterItemByPaths(item: MenuItem, allowed: Set<string>): MenuItem | null {
  if (item.children) {
    const filteredChildren = item.children.filter((c) => c.path && allowed.has(c.path))
    if (filteredChildren.length === 0) return null
    return { ...item, children: filteredChildren }
  }
  if (item.path && allowed.has(item.path)) return item
  return null
}

/**
 * Helper: remove superadmin-only items from a menu tree.
 * Used by admin role to hide System Cleanup, App Config, Roles & Permissions, Menu Access.
 */
function filterOutSuperAdminItems(items: MenuItem[]): MenuItem[] {
  return items.reduce<MenuItem[]>((acc, item) => {
    if (item.children) {
      const filteredChildren = item.children.filter(
        (c) => !c.path || !SUPERADMIN_ONLY_PATHS.has(c.path),
      )
      if (filteredChildren.length > 0) {
        acc.push({ ...item, children: filteredChildren })
      }
    } else if (!item.path || !SUPERADMIN_ONLY_PATHS.has(item.path)) {
      acc.push(item)
    }
    return acc
  }, [])
}

/** Main items filtered by role and search query. */
const visibleMainItems = computed(() => {
  let items = filteredMainItems.value
  if (authStore.isGuest) {
    // Guest: only Top Products Analysis + Data Explorer
    items = items.reduce<MenuItem[]>((acc, item) => {
      const filtered = filterItemByPaths(item, GUEST_MAIN_PATHS)
      if (filtered) acc.push(filtered)
      return acc
    }, [])
  }
  return items
})

/** System items filtered by role: admin sees only User Management + Access Control; superadmin+ sees all. */
const visibleSystemItems = computed(() => {
  let items = filteredSystemItems.value
  if (authStore.isAdmin && !authStore.isSuperAdmin) {
    items = filterOutSuperAdminItems(items)
  }
  return items
})

function handleLogout() {
  authStore.logout()
  menuAccessStore.clearCache()
  router.push('/login')
}

const currentYear = new Date().getFullYear()
const appConfigStore = useAppConfigStore()
const { appName, appVersion } = storeToRefs(appConfigStore)

// Fetch user's accessible menus on mount (non-blocking, uses cache)
onMounted(() => {
  // Don't block rendering - fetch menus in background with timeout
  // Use Promise.race to ensure quick fallback to static menus
  const fetchWithTimeout = Promise.race([
    menuAccessStore.fetchMenus(authStore.isGuest),
    new Promise<void>((resolve) => setTimeout(() => resolve(), 3000)), // 3 second timeout
  ])

  fetchWithTimeout
    .then(() => {
      if (menuAccessStore.initialized) {
        dynamicMenusLoaded.value = true
      }
    })
    .catch(() => {
      // Static menus will be used as fallback - fail silently
    })
})

// Watch for auth changes to refresh menus
watch(
  () => authStore.isAuthenticated,
  async (isAuth) => {
    if (isAuth) {
      menuAccessStore.fetchMenus(authStore.isGuest)
      dynamicMenusLoaded.value = true
    } else {
      menuAccessStore.clearCache()
      dynamicMenusLoaded.value = false
    }
  },
)
</script>

<style scoped>
/* ====== MAIN LAYOUT ====== */
/* 
 * CRITICAL: v-main with app prop gets automatic height calculation from Vuetify
 * We need to ensure content respects this height and scrolls properly
 */
.default-layout__main {
    display: flex;
    flex-direction: column;
    height: 100%;
    /* Respect Vuetify's calculated height */
}

/* Content area - must have defined height to enable scrolling */
.default-layout__content {
    flex: 1 1 0;
    /* CRITICAL: Use 0 as flex-basis to respect parent height */
    min-height: 0;
    /* CRITICAL: Allow flex item to shrink below content size */
    padding: 24px;
    overflow-y: auto;
    overflow-x: hidden;
}

/* Footer - fixed at bottom with app prop */
.default-layout__footer {
    flex-shrink: 0;
    height: 48px;
    min-height: 48px;
    max-height: 48px;
    border-top: 1px solid rgba(0, 0, 0, 0.12);
    background-color: rgb(var(--v-theme-surface));
}

/* Footer container - properly sized */
:deep(.default-layout__footer-container) {
    height: 100%;
    padding: 0 16px !important;
}

:deep(.default-layout__footer .v-row) {
    height: 100%;
}

:deep(.default-layout__footer .v-col) {
    display: flex;
    align-items: center;
    justify-content: center;
}

/* ====== DRAWER STYLING ====== */
/* Drawer content layout */
:deep(.v-navigation-drawer__content) {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

/* Make menu list scrollable */
:deep(.v-list.flex-grow-1) {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
}

/* Center menu icon in rail mode */
:deep(.v-navigation-drawer--rail .v-list-item__prepend) {
    justify-content: center;
}

/* Drawer footer styling */
:deep(.v-navigation-drawer .v-navigation-drawer__append) {
    flex-shrink: 0;
}

/* Hover expand animation */
:deep(.v-navigation-drawer--rail.v-navigation-drawer--expand-on-hover:hover) {
    width: 256px !important;
}

/* ====== SCROLLBAR STYLING ====== */
/* Content scrollbar - Thin with no arrows */
.default-layout__content {
    scrollbar-width: thin;
    scrollbar-color: #c1c1c1 #f1f1f1;
}

.default-layout__content::-webkit-scrollbar {
    width: 7px;
    height: 7px;
    background-color: #f1f1f1;
}

.default-layout__content::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 6px rgba(83, 83, 83, 0.07);
    background-color: #f1f1f1;
}

.default-layout__content::-webkit-scrollbar-thumb {
    background-color: #c1c1c1;
    border-radius: 4px;
}

.default-layout__content::-webkit-scrollbar-thumb:hover {
    background-color: #a8a8a8 !important;
}

/* Remove scrollbar arrows */
.default-layout__content::-webkit-scrollbar-button {
    width: 0;
    height: 0;
}

/* Drawer scrollbar */
:deep(.v-navigation-drawer__content) {
    scrollbar-width: thin;
    scrollbar-color: #c1c1c1 #f1f1f1;
}

:deep(.v-navigation-drawer__content)::-webkit-scrollbar {
    width: 7px;
    height: 7px;
    background-color: #f1f1f1;
}

:deep(.v-navigation-drawer__content)::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 6px rgba(83, 83, 83, 0.07);
    background-color: #f1f1f1;
}

:deep(.v-navigation-drawer__content)::-webkit-scrollbar-thumb {
    background-color: #c1c1c1;
    border-radius: 4px;
}

:deep(.v-navigation-drawer__content)::-webkit-scrollbar-thumb:hover {
    background-color: #a8a8a8 !important;
}

/* Remove drawer scrollbar arrows */
:deep(.v-navigation-drawer__content)::-webkit-scrollbar-button {
    width: 0;
    height: 0;
}

/* ====== RESPONSIVE ====== */
@media (max-width: 960px) {
    .default-layout__content {
        padding: 16px;
    }
}

@media (max-width: 600px) {
    .default-layout__content {
        padding: 12px;
    }
}
</style>