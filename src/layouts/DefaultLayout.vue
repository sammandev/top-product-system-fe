<template>
  <v-app class="default-layout" :style="shellStyleVars">
    <AppShellHeader
      :app-name="appName"
      :app-version="appVersion"
      :page-title="pageTitle"
      :page-eyebrow="pageEyebrow"
      :page-description="pageDescription"
      :page-icon="pageIcon"
      :page-accent="pageAccent"
      :page-breadcrumbs="pageBreadcrumbs"
      :display-name="authStore.displayName"
      :display-role="authStore.displayRole"
      :is-guest="authStore.isGuest"
      :has-dut-access="authStore.hasDUTAccess"
      :is-dark="isDark"
      :header-height="APP_CONFIG.ui.headerHeight"
      @toggle-drawer="drawer = !drawer"
      @toggle-theme="toggleTheme"
      @logout="handleLogout"
    />

    <AppShellSidebar
      v-model="drawer"
      :rail="rail"
      :search-query="searchQuery"
      :sections="visibleSections"
      :current-path="route.path"
      :active-section-key="activeSectionKey"
      :app-name="appName"
      :display-name="authStore.displayName"
      :access-label="accessLabel"
      :is-guest="authStore.isGuest"
      :is-mobile="isMobile"
      :can-toggle-rail="canToggleRail"
      :menu-loading="menuAccessStore.loading"
      :menu-status-tone="menuStatusTone"
      :menu-status-label="menuStatusLabel"
      :menu-status-detail="menuStatusDetail"
      :using-fallback-menus="usingFallbackMenus"
      :sidebar-width="APP_CONFIG.ui.sidebarWidth"
      :sidebar-rail-width="APP_CONFIG.ui.sidebarRailWidth"
      @update:rail="rail = $event"
      @update:search-query="searchQuery = $event"
      @refresh-menus="syncMenus(true)"
      @logout="handleLogout"
    />

    <v-progress-linear
      v-if="appConfigStore.isNavigating"
      indeterminate
      color="primary"
      class="default-layout__progress"
    />

    <v-main class="default-layout__main">
      <div class="default-layout__content">
        <slot />
      </div>
    </v-main>

    <AppFooter
      :app-name="appName"
      :app-version="appVersion"
      :app-description="appDescription"
      :height="APP_CONFIG.ui.footerHeight"
    />
  </v-app>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import { APP_CONFIG } from '@/core/config'
import { useAppConfigStore } from '@/core/stores/appConfig.store'
import { useMenuAccessStore } from '@/features/admin/stores/menuAccess.store'
import { useAuthStore } from '@/features/auth/stores'
import { AppFooter, AppShellHeader, AppShellSidebar } from '@/shared/components/layout'
import { useDrawerState, useShellNavigation, useThemeState } from '@/shared/composables'

const router = useRouter()
const route = useRoute()
const theme = useTheme()
const display = useDisplay()
const authStore = useAuthStore()
const menuAccessStore = useMenuAccessStore()
const appConfigStore = useAppConfigStore()

const { appName, appVersion, appDescription } = storeToRefs(appConfigStore)
const { saveTheme, loadTheme } = useThemeState()
const { drawer, rail } = useDrawerState(true, false)
const {
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
} = useShellNavigation()

const isDark = computed(() => theme.global.current.value.dark)
const isMobile = computed(() => display.width.value < 960)
const canToggleRail = computed(() => display.width.value >= 960)

const accessLabel = computed(() => {
  if (authStore.isGuest) {
    return 'Guest workspace'
  }

  return authStore.loginType === 'external' ? 'External DUT access' : 'Standard application access'
})

const shellStyleVars = computed(() => ({
  '--app-shell-header-height': `${APP_CONFIG.ui.headerHeight}px`,
  '--app-shell-footer-height': `${APP_CONFIG.ui.footerHeight}px`,
}))

function toggleTheme() {
  const nextTheme = theme.global.current.value.dark ? 'customLightTheme' : 'customDarkTheme'
  theme.change(nextTheme)
  saveTheme(nextTheme)
}

function handleLogout() {
  authStore.logout()
  menuAccessStore.clearCache()
  router.push('/login')
}

const savedTheme = loadTheme()
if (savedTheme) {
  theme.change(savedTheme)
}

watch(
  isMobile,
  (mobile) => {
    if (mobile) {
      rail.value = false
      drawer.value = false
    }
  },
  { immediate: true },
)

watch(
  () => route.fullPath,
  () => {
    if (isMobile.value) {
      drawer.value = false
    }
  },
)
</script>

<style scoped>
.default-layout {
  background:
    radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.08), transparent 26%),
    linear-gradient(180deg, rgb(var(--v-theme-background)), rgba(var(--v-theme-background), 0.98));
}

.default-layout__progress {
  position: fixed;
  top: var(--app-shell-header-height);
  z-index: 9999;
}

.default-layout__main {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.default-layout__content {
  flex: 1 1 0;
  min-height: 0;
  padding: 26px 28px 22px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.28) rgba(0, 0, 0, 0.06);
}

.default-layout__content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.default-layout__content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
}

.default-layout__content::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.22);
}

.default-layout__content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.34);
}

.default-layout__content::-webkit-scrollbar-button {
  width: 0;
  height: 0;
}

@media (max-width: 960px) {
  .default-layout__content {
    padding: 18px 16px 16px;
  }
}

@media (max-width: 600px) {
  .default-layout__content {
    padding: 14px 12px 14px;
  }
}
</style>