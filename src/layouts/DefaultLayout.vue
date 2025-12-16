<template>
    <v-app>
        <!-- App Bar (Sticky) -->
        <v-app-bar :elevation="2" app color="primary" density="compact">
            <v-app-bar-nav-icon variant="text" @click="drawer = !drawer">
                <v-icon color="white">mdi-menu</v-icon>
            </v-app-bar-nav-icon>

            <!-- <v-toolbar-title class="d-flex align-center">
                <v-icon class="mr-2" color="white">mdi-test-tube</v-icon>
                <span class="font-weight-bold">AST Tools</span>
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
                        <v-avatar size="32" color="secondary" class="mr-2">
                            <v-icon size="small">mdi-account</v-icon>
                        </v-avatar>
                        <span v-if="$vuetify.display.smAndUp" style="color: white;">
                            {{ authStore.user?.username || 'User' }}
                        </span>
                        <v-icon class="ml-1" size="small" color="white">mdi-chevron-down</v-icon>
                    </v-btn>
                </template>

                <v-list min-width="250">
                    <v-list-item>
                        <template #prepend>
                            <v-avatar color="secondary" size="40">
                                <v-icon>{{ authStore.user?.username || 'User' }}</v-icon>
                            </v-avatar>
                        </template>
                        <v-list-item-title class="font-weight-bold">
                            {{ authStore.user?.username || 'User' }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                            {{ formatRoles(authStore.user?.roles) }}
                        </v-list-item-subtitle>
                    </v-list-item>

                    <v-divider class="my-2" />

                    <v-list-item prepend-icon="mdi-account-cog" title="Profile Settings" />
                    <v-list-item prepend-icon="mdi-cog" title="Preferences" />

                    <v-divider class="my-2" />

                    <v-list-item v-if="authStore.hasDUTAccess" prepend-icon="mdi-cloud-check" title="DUT Access"
                        subtitle="External login active">
                        <template #append>
                            <v-chip color="success" size="small">Active</v-chip>
                        </template>
                    </v-list-item>

                    <v-divider v-if="authStore.hasDUTAccess" class="my-2" />

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
                        <v-icon>mdi-test-tube</v-icon>
                    </v-avatar>
                </template>
                <v-list-item-title class="font-weight-bold">AST Tools</v-list-item-title>
                <v-list-item-subtitle>v1.0.0</v-list-item-subtitle>
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
                <template v-for="item in filteredMainItems" :key="item.path">
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

                <!-- Tools Section -->
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
                    <v-list-item v-else :prepend-icon="item.icon" :title="item.title" :to="item.path" :value="item.path"
                        rounded="xl" color="primary" class="my-1" />
                </template>

                <!-- System Section (Admin Only) -->
                <template v-if="authStore.isAdmin">
                    <v-list-subheader v-if="!rail" class="mt-3">SYSTEM</v-list-subheader>
                    <template v-for="item in filteredSystemItems" :key="item.path">
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
                    <v-list-item v-if="!rail" prepend-icon="mdi-account-circle"
                        :title="authStore.user?.username || 'User'"
                        :subtitle="authStore.loginType === 'external' ? 'External Access' : 'Local Access'" rounded="xl"
                        class="my-1">
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
                        <span class="text-caption">&copy; {{ currentYear }} AST Tools. All rights
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
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'
import { useTheme } from 'vuetify'
import { useDrawerState, useThemeState } from '@/shared/composables'
import { APP_CONFIG } from '@/core/config'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const theme = useTheme()
const { saveTheme, loadTheme } = useThemeState()

// Drawer state with persistence
const { drawer, rail } = useDrawerState(true, false)

const searchQuery = ref('')

const isDark = computed(() => theme.global.current.value.dark)

// Helper function to check if any child route is active (reactive with route)
function isChildActive(item: MenuItem): boolean {
    if (!item.children) return false
    const currentPath = route.path
    return item.children.some(child => child.path === currentPath)
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

const mainItems: MenuItem[] = [
    { title: 'Dashboard', icon: 'mdi-view-dashboard', path: '/dashboard' },
    {
        title: 'Top Products',
        icon: 'mdi-trophy',
        children: [
            { title: 'Analysis', icon: 'mdi-circle-small', path: '/dut/top-products/analysis' },
            { title: 'Database', icon: 'mdi-circle-small', path: '/dut/top-products/data' },
            // { title: 'PA Trend', icon: 'mdi-circle-small', path: '/dut/top-products/pa-trend' },
        ]
    },
    { title: 'Test Log Download', icon: 'mdi-download-box', path: '/dut/test-log-download' },
]

// Navigation Items - Tools Section
const toolsItems: MenuItem[] = [
    {
        title: 'File Upload',
        icon: 'mdi-file-upload',
        children: [
            { title: 'Upload File', icon: 'mdi-circle-small', path: '/parsing' },
            { title: 'Parse & Download', icon: 'mdi-circle-small', path: '/parsing/download-format' }
        ]
    },
    {
        title: 'Compare Files',
        icon: 'mdi-compare',
        children: [
            { title: 'Compare Files', icon: 'mdi-circle-small', path: '/compare' },
            { title: 'DVT-MC2 Compare', icon: 'mdi-circle-small', path: '/compare/dvt-mc2' }
        ]
    },
    { title: 'MasterControl Analyze', icon: 'mdi-file-chart', path: '/mastercontrol/analyze' },
    { title: 'DVT to MC2 Converter', icon: 'mdi-file-swap', path: '/conversion/dvt-to-mc2' }
]

// Navigation Items - System Section (Admin Only)
const systemItems: MenuItem[] = [
    {
        title: 'Access Control',
        icon: 'mdi-shield-lock',
        children: [
            { title: 'User Management', icon: 'mdi-circle-small', path: '/admin/users' },
            { title: 'Roles & Permissions', icon: 'mdi-circle-small', path: '/admin/rbac' }
        ]
    },
    { title: 'System Cleanup', icon: 'mdi-delete-sweep', path: '/admin/cleanup' },
    // { title: 'System Settings', icon: 'mdi-cog', path: '/admin/settings' },
    // { title: 'Audit Logs', icon: 'mdi-file-document-outline', path: '/admin/logs' }
]

// Filtered navigation items based on search
const filteredMainItems = computed(() => {
    if (!searchQuery.value) return mainItems
    const query = searchQuery.value.toLowerCase()
    return mainItems.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.children?.some(child => child.title.toLowerCase().includes(query))
    )
})

const filteredToolsItems = computed(() => {
    if (!searchQuery.value) return toolsItems
    const query = searchQuery.value.toLowerCase()
    return toolsItems.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.children?.some(child => child.title.toLowerCase().includes(query))
    )
})

const filteredSystemItems = computed(() => {
    if (!searchQuery.value) return systemItems
    const query = searchQuery.value.toLowerCase()
    return systemItems.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.children?.some(child => child.title.toLowerCase().includes(query))
    )
})

function formatRoles(roles: string[] | string | undefined): string {
    if (!roles) return 'User'
    if (Array.isArray(roles)) {
        return roles.join(', ')
    }
    return roles
}

function handleLogout() {
    authStore.logout()
    router.push('/login')
}

const currentYear = new Date().getFullYear()
const appVersion = APP_CONFIG.version || '1.0.0'
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