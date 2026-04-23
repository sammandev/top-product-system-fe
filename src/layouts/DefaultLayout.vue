<template>
  <div class="default-layout min-h-screen" :data-shell-theme="shellTheme">
    <button
      v-if="drawer"
      aria-label="Close navigation"
      class="fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] lg:hidden"
      type="button"
      @click="drawer = false"
    />

    <div class="relative flex min-h-screen flex-col bg-[var(--shell-bg)] text-[var(--shell-ink)]">
      <header class="sticky top-0 z-40 border-b border-[var(--shell-border)] bg-[color:var(--shell-header)]/90 backdrop-blur">
        <div class="flex min-h-16 items-center gap-3 px-3 py-3 sm:px-4 lg:px-6">
          <button
            aria-label="Toggle navigation"
            class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--shell-border)] bg-[color:var(--shell-panel-strong)] text-[var(--shell-ink)] shadow-[var(--shell-shadow-soft)] transition hover:-translate-y-px hover:border-[var(--shell-accent)] hover:text-[var(--shell-accent)]"
            type="button"
            @click="drawer = !drawer"
          >
            <Icon class="text-xl" icon="solar:hamburger-menu-line-duotone" />
          </button>

          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 items-center gap-3">
              <div class="hidden h-11 w-11 items-center justify-center rounded-2xl bg-[var(--shell-accent-soft)] text-[var(--shell-accent)] shadow-[var(--shell-shadow-soft)] sm:inline-flex">
                <Icon class="text-2xl" icon="solar:widget-5-bold-duotone" />
              </div>
              <div class="min-w-0">
                <p class="truncate text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-[var(--shell-muted)]">
                  {{ appName }}
                </p>
                <h1 class="truncate font-[var(--app-display)] text-xl leading-none sm:text-2xl">
                  {{ currentRouteTitle }}
                </h1>
              </div>
            </div>
          </div>

          <div class="hidden min-w-[14rem] max-w-sm flex-1 lg:block xl:max-w-md">
            <label class="flex items-center gap-3 rounded-full border border-[var(--shell-border)] bg-[color:var(--shell-panel-strong)] px-4 py-3 shadow-[var(--shell-shadow-soft)]">
              <Icon class="text-lg text-[var(--shell-muted)]" icon="solar:magnifer-linear" />
              <input
                v-model="searchQuery"
                class="w-full bg-transparent text-sm text-[var(--shell-ink)] outline-none placeholder:text-[var(--shell-muted)]"
                placeholder="Search navigation"
                type="text"
              />
            </label>
          </div>

          <div class="flex items-center gap-2 sm:gap-3">
            <button
              :aria-label="quickThemeToggleLabel"
              class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--shell-border)] bg-[color:var(--shell-panel-strong)] text-[var(--shell-ink)] shadow-[var(--shell-shadow-soft)] transition hover:-translate-y-px hover:border-[var(--shell-accent)] hover:text-[var(--shell-accent)]"
              type="button"
              @click="toggleTheme"
            >
              <Icon
                class="text-xl"
                :icon="isDark ? 'solar:sun-bold-duotone' : 'solar:moon-stars-bold-duotone'"
              />
            </button>

            <details class="relative">
              <summary class="flex cursor-pointer list-none items-center gap-3 rounded-[1.4rem] border border-[var(--shell-border)] bg-[color:var(--shell-panel-strong)] px-3 py-2 shadow-[var(--shell-shadow-soft)] transition hover:-translate-y-px hover:border-[var(--shell-accent)]">
                <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-panel)] text-[var(--shell-ink)]">
                  <Icon class="text-lg" icon="solar:palette-round-bold-duotone" />
                </div>
                <div class="hidden min-w-0 text-left xl:block">
                  <p class="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                    Theme
                  </p>
                  <p class="truncate text-sm font-semibold text-[var(--shell-ink)]">
                    {{ themeSummaryLabel }}
                  </p>
                </div>
                <Icon class="hidden text-lg text-[var(--shell-muted)] xl:block" icon="solar:alt-arrow-down-linear" />
              </summary>

              <div class="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[22rem] rounded-[1.6rem] border border-[var(--shell-border)] bg-[color:var(--shell-panel-strong)] p-4 shadow-[var(--shell-shadow)] backdrop-blur">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                      Appearance
                    </p>
                    <p class="mt-1 text-sm leading-6 text-[var(--shell-muted)]">
                      {{ themeSummaryDescription }}
                    </p>
                  </div>
                  <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--shell-accent-soft)] text-[var(--shell-accent)]">
                    <Icon class="text-xl" :icon="themeSummaryIcon" />
                  </div>
                </div>

                <div class="mt-4 space-y-2">
                  <p class="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                    Mode
                  </p>
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      v-for="option in THEME_MODE_OPTIONS"
                      :key="option.value"
                      class="flex flex-col items-center gap-2 rounded-[1.2rem] border px-3 py-3 text-center transition"
                      :class="themePreferences.mode === option.value
                        ? 'border-[var(--shell-accent)] bg-[var(--shell-accent-soft)] text-[var(--shell-accent)] shadow-[var(--shell-shadow-soft)]'
                        : 'border-[var(--shell-border)] bg-[var(--shell-panel)] text-[var(--shell-muted)] hover:border-[var(--shell-accent)] hover:text-[var(--shell-ink)]'"
                      type="button"
                      @click="setThemePreference({ mode: option.value })"
                    >
                      <span class="h-10 w-full rounded-2xl" :style="{ background: option.preview }" />
                      <span class="text-xs font-semibold uppercase tracking-[0.18em]">{{ option.label }}</span>
                    </button>
                  </div>
                </div>

                <div class="mt-4 space-y-2">
                  <p class="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                    PrimeVue Preset
                  </p>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      v-for="option in THEME_PRESET_OPTIONS"
                      :key="option.value"
                      class="rounded-[1.2rem] border px-3 py-3 text-left transition"
                      :class="themePreferences.preset === option.value
                        ? 'border-[var(--shell-accent)] bg-[var(--shell-accent-soft)] text-[var(--shell-accent)] shadow-[var(--shell-shadow-soft)]'
                        : 'border-[var(--shell-border)] bg-[var(--shell-panel)] text-[var(--shell-muted)] hover:border-[var(--shell-accent)] hover:text-[var(--shell-ink)]'"
                      type="button"
                      @click="setThemePreference({ preset: option.value })"
                    >
                      <div class="flex items-center gap-3">
                        <span class="h-9 w-9 shrink-0 rounded-2xl" :style="{ background: option.preview }" />
                        <div class="min-w-0">
                          <p class="truncate text-sm font-semibold">{{ option.label }}</p>
                          <p class="mt-1 text-xs leading-5 opacity-80">{{ option.description }}</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div class="mt-4 grid gap-4 md:grid-cols-2">
                  <div class="space-y-2">
                    <p class="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                      Primary
                    </p>
                    <div class="grid grid-cols-2 gap-2">
                      <button
                        v-for="option in THEME_PRIMARY_OPTIONS"
                        :key="option.value"
                        class="flex items-center gap-3 rounded-[1.2rem] border px-3 py-2.5 text-left transition"
                        :class="themePreferences.primary === option.value
                          ? 'border-[var(--shell-accent)] bg-[var(--shell-accent-soft)] text-[var(--shell-accent)] shadow-[var(--shell-shadow-soft)]'
                          : 'border-[var(--shell-border)] bg-[var(--shell-panel)] text-[var(--shell-muted)] hover:border-[var(--shell-accent)] hover:text-[var(--shell-ink)]'"
                        type="button"
                        @click="setThemePreference({ primary: option.value })"
                      >
                        <span class="h-8 w-8 shrink-0 rounded-full border border-white/50" :style="{ background: option.preview }" />
                        <span class="truncate text-sm font-semibold">{{ option.label }}</span>
                      </button>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <p class="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                      Surface
                    </p>
                    <div class="space-y-2">
                      <button
                        v-for="option in THEME_SURFACE_OPTIONS"
                        :key="option.value"
                        class="flex w-full items-center gap-3 rounded-[1.2rem] border px-3 py-2.5 text-left transition"
                        :class="themePreferences.surface === option.value
                          ? 'border-[var(--shell-accent)] bg-[var(--shell-accent-soft)] text-[var(--shell-accent)] shadow-[var(--shell-shadow-soft)]'
                          : 'border-[var(--shell-border)] bg-[var(--shell-panel)] text-[var(--shell-muted)] hover:border-[var(--shell-accent)] hover:text-[var(--shell-ink)]'"
                        type="button"
                        @click="setThemePreference({ surface: option.value })"
                      >
                        <span class="h-8 w-8 shrink-0 rounded-2xl border border-white/50" :style="{ background: option.preview }" />
                        <div class="min-w-0">
                          <p class="truncate text-sm font-semibold">{{ option.label }}</p>
                          <p class="mt-1 text-xs leading-5 opacity-80">{{ option.description }}</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </details>

            <details class="relative">
              <summary class="flex cursor-pointer list-none items-center gap-3 rounded-[1.4rem] border border-[var(--shell-border)] bg-[color:var(--shell-panel-strong)] px-3 py-2 shadow-[var(--shell-shadow-soft)] transition hover:-translate-y-px hover:border-[var(--shell-accent)]">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold uppercase"
                  :class="authStore.isGuest ? 'bg-[rgba(198,134,37,0.18)] text-[rgb(156,102,18)]' : 'bg-[var(--shell-accent-soft)] text-[var(--shell-accent)]'"
                >
                  {{ userInitial }}
                </div>
                <div class="hidden text-left sm:block">
                  <p class="max-w-[12rem] truncate text-sm font-semibold text-[var(--shell-ink)]">
                    {{ authStore.displayName }}
                  </p>
                  <p class="text-[0.68rem] uppercase tracking-[0.2em] text-[var(--shell-muted)]">
                    {{ authStore.displayRole }}
                  </p>
                </div>
                <Icon class="hidden text-lg text-[var(--shell-muted)] sm:block" icon="solar:alt-arrow-down-linear" />
              </summary>

              <div class="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 rounded-[1.6rem] border border-[var(--shell-border)] bg-[color:var(--shell-panel-strong)] p-4 shadow-[var(--shell-shadow)] backdrop-blur">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-semibold uppercase"
                    :class="authStore.isGuest ? 'bg-[rgba(198,134,37,0.18)] text-[rgb(156,102,18)]' : 'bg-[var(--shell-accent-soft)] text-[var(--shell-accent)]'"
                  >
                    {{ userInitial }}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-base font-semibold text-[var(--shell-ink)]">
                      {{ authStore.displayName }}
                    </p>
                    <p class="text-sm text-[var(--shell-muted)]">{{ authStore.displayRole }}</p>
                  </div>
                </div>

                <div class="mt-4 rounded-[1.3rem] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-3">
                  <p class="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                    Session
                  </p>
                  <div class="mt-2 flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-[var(--shell-ink)]">{{ accessLabel }}</p>
                      <p class="text-xs leading-5 text-[var(--shell-muted)]">{{ accessDescription }}</p>
                    </div>
                    <span
                      class="rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]"
                      :class="authStore.isGuest ? 'bg-[rgba(198,134,37,0.18)] text-[rgb(156,102,18)]' : authStore.hasDUTAccess ? 'bg-[rgba(20,88,71,0.18)] text-[var(--shell-accent)]' : 'bg-[rgba(35,83,134,0.14)] text-[rgb(33,87,145)]'"
                    >
                      {{ accessBadge }}
                    </span>
                  </div>
                </div>

                <button
                  class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[rgba(156,54,41,0.22)] bg-[rgba(163,61,45,0.08)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--shell-danger)] transition hover:bg-[rgba(163,61,45,0.14)]"
                  type="button"
                  @click="handleLogout"
                >
                  <Icon class="text-lg" icon="solar:logout-2-bold-duotone" />
                  Logout
                </button>
              </div>
            </details>
          </div>
        </div>

        <div class="border-t border-[var(--shell-border)] px-3 py-3 lg:hidden sm:px-4">
          <label class="flex items-center gap-3 rounded-full border border-[var(--shell-border)] bg-[color:var(--shell-panel-strong)] px-4 py-3 shadow-[var(--shell-shadow-soft)]">
            <Icon class="text-lg text-[var(--shell-muted)]" icon="solar:magnifer-linear" />
            <input
              v-model="searchQuery"
              class="w-full bg-transparent text-sm text-[var(--shell-ink)] outline-none placeholder:text-[var(--shell-muted)]"
              placeholder="Search navigation"
              type="text"
            />
          </label>
        </div>

        <div v-if="appConfigStore.isNavigating" class="default-layout__progress" />
      </header>

      <div class="flex min-h-0 flex-1">
        <aside
          class="fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-[var(--shell-border)] bg-[color:var(--shell-sidebar)]/96 px-3 py-4 shadow-[var(--shell-shadow)] backdrop-blur transition-all duration-200 ease-out lg:sticky lg:top-0 lg:z-20"
          :class="drawerPanelClasses"
        >
          <div class="flex items-center gap-3 rounded-[1.8rem] border border-[var(--shell-border)] bg-[color:var(--shell-panel)] px-3 py-3 shadow-[var(--shell-shadow-soft)]">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.4rem] bg-[var(--shell-accent-soft)] text-[var(--shell-accent)]">
              <Icon class="text-2xl" icon="solar:atom-bold-duotone" />
            </div>
            <div v-if="!rail" class="min-w-0 flex-1">
              <p class="truncate text-xs font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                Workspace
              </p>
              <p class="truncate font-[var(--app-display)] text-xl leading-none text-[var(--shell-ink)]">
                {{ appName }}
              </p>
              <p class="mt-1 truncate text-xs text-[var(--shell-muted)]">v{{ appVersion }}</p>
            </div>
          </div>

          <div class="mt-4 flex-1 overflow-y-auto pr-1">
            <nav class="space-y-4">
              <section v-for="section in navigationSections" :key="section.id" class="space-y-2">
                <div v-if="!rail" class="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                  {{ section.title }}
                </div>

                <div class="space-y-1">
                  <template v-for="item in section.items" :key="item.path || item.title">
                    <div v-if="item.children" class="space-y-1">
                      <button
                        class="flex w-full items-center gap-3 rounded-[1.25rem] border px-3 py-3 text-left transition"
                        :class="isGroupActive(item)
                          ? 'border-[var(--shell-accent)] bg-[var(--shell-accent-soft)] text-[var(--shell-accent)] shadow-[var(--shell-shadow-soft)]'
                          : 'border-transparent bg-transparent text-[var(--shell-muted)] hover:border-[var(--shell-border)] hover:bg-[var(--shell-panel)] hover:text-[var(--shell-ink)]'"
                        type="button"
                        @click="toggleGroup(item)"
                      >
                        <Icon class="shrink-0 text-xl" :icon="normalizeIcon(item.icon)" />
                        <span v-if="!rail" class="min-w-0 flex-1 truncate text-sm font-semibold">
                          {{ item.title }}
                        </span>
                        <Icon
                          v-if="!rail"
                          class="shrink-0 text-lg transition"
                          :class="isGroupOpen(item) ? 'rotate-180' : ''"
                          icon="solar:alt-arrow-down-linear"
                        />
                      </button>

                      <div v-if="!rail && isGroupOpen(item)" class="ml-4 space-y-1 border-l border-[var(--shell-border)] pl-3">
                        <router-link
                          v-for="child in item.children"
                          :key="child.path"
                          class="flex items-center gap-3 rounded-[1.15rem] border px-3 py-2.5 text-sm transition"
                          :class="isItemActive(child)
                            ? 'border-[var(--shell-accent)] bg-[var(--shell-accent-soft)] text-[var(--shell-accent)] shadow-[var(--shell-shadow-soft)]'
                            : 'border-transparent text-[var(--shell-muted)] hover:border-[var(--shell-border)] hover:bg-[var(--shell-panel)] hover:text-[var(--shell-ink)]'"
                          :to="child.path || '/'"
                          @click="handleNavigationSelection"
                        >
                          <Icon class="shrink-0 text-lg" :icon="normalizeIcon(child.icon)" />
                          <span class="truncate">{{ child.title }}</span>
                        </router-link>
                      </div>
                    </div>

                    <router-link
                      v-else
                      class="flex items-center gap-3 rounded-[1.25rem] border px-3 py-3 text-sm font-semibold transition"
                      :class="isItemActive(item)
                        ? 'border-[var(--shell-accent)] bg-[var(--shell-accent-soft)] text-[var(--shell-accent)] shadow-[var(--shell-shadow-soft)]'
                        : 'border-transparent text-[var(--shell-muted)] hover:border-[var(--shell-border)] hover:bg-[var(--shell-panel)] hover:text-[var(--shell-ink)]'"
                      :to="item.path || '/'"
                      @click="handleNavigationSelection"
                    >
                      <Icon class="shrink-0 text-xl" :icon="normalizeIcon(item.icon)" />
                      <span v-if="!rail" class="truncate">{{ item.title }}</span>
                    </router-link>
                  </template>
                </div>
              </section>
            </nav>
          </div>

          <div class="mt-4 space-y-3 border-t border-[var(--shell-border)] pt-4">
            <div v-if="!rail" class="rounded-[1.4rem] border border-[var(--shell-border)] bg-[var(--shell-panel)] px-3 py-3 shadow-[var(--shell-shadow-soft)]">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                    Navigation
                  </p>
                  <p class="mt-1 text-sm font-semibold text-[var(--shell-ink)]">
                    {{ dynamicMenusLoaded ? 'Dynamic access map loaded' : 'Static fallback active' }}
                  </p>
                </div>
                <span
                  class="h-3 w-3 rounded-full"
                  :class="dynamicMenusLoaded ? 'bg-[var(--shell-accent)]' : 'bg-[rgb(184,122,40)]'"
                />
              </div>
            </div>

            <button
              class="hidden w-full items-center justify-center gap-3 rounded-[1.25rem] border border-[var(--shell-border)] bg-[color:var(--shell-panel-strong)] px-3 py-3 text-sm font-semibold text-[var(--shell-ink)] shadow-[var(--shell-shadow-soft)] transition hover:-translate-y-px hover:border-[var(--shell-accent)] lg:flex"
              type="button"
              @click="rail = !rail"
            >
              <Icon
                class="text-lg"
                :icon="rail ? 'solar:siderbar-linear' : 'solar:siderbar-bold-duotone'"
              />
              <span v-if="!rail">Collapse navigation</span>
            </button>
          </div>
        </aside>

        <div class="flex min-w-0 flex-1 flex-col">
          <main class="default-layout__content flex-1 overflow-y-auto">
            <div class="mx-auto min-h-full w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
              <slot />
            </div>
          </main>

          <footer class="border-t border-[var(--shell-border)] bg-[color:var(--shell-panel)]/88 px-3 py-3 backdrop-blur sm:px-4 lg:px-6">
            <div class="flex flex-col gap-2 text-xs uppercase tracking-[0.18em] text-[var(--shell-muted)] sm:flex-row sm:items-center sm:justify-between">
              <span>{{ currentYear }} {{ appName }}. All rights reserved.</span>
              <span>Version {{ appVersion }}</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppConfigStore } from '@/core/stores/appConfig.store'
import { useMenuAccessStore } from '@/features/admin/stores/menuAccess.store'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import {
  THEME_MODE_OPTIONS,
  THEME_PRESET_OPTIONS,
  THEME_PRIMARY_OPTIONS,
  THEME_SURFACE_OPTIONS,
  resolveThemeMode,
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
const { appName, appVersion } = storeToRefs(appConfigStore)
const { drawer, rail } = useDrawerState(true, false)

const searchQuery = ref('')
const dynamicMenusLoaded = ref(false)
const openGroups = ref<string[]>([])
const currentYear = new Date().getFullYear()

const SUPERADMIN_ONLY_PATHS = new Set(['/admin/menu-access', '/admin/cleanup', '/admin/app-config'])
const GUEST_MAIN_PATHS = new Set(['/dut/top-products/analysis', '/dut/data-explorer'])
const ADMIN_MAIN_PATHS = new Set(['/dashboard'])

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

const shellTheme = computed(() => (isDark.value ? 'dark' : 'light'))
const isDark = computed(() => theme.global.current.value.dark)
const resolvedThemeMode = computed(() => resolveThemeMode(themePreferences.value.mode))
const currentRouteTitle = computed(() => {
  const title = route.meta.title
  return typeof title === 'string' && title.trim().length > 0 ? title : appName.value
})
const userInitial = computed(() => authStore.displayName.slice(0, 1).toUpperCase())
const accessLabel = computed(() => {
  if (authStore.isGuest) return 'Guest access'
  return authStore.loginType === 'external' ? 'External access' : 'Local access'
})
const accessDescription = computed(() => {
  if (authStore.isGuest) return 'Limited read-only mode for shared visibility.'
  return authStore.hasDUTAccess ? 'DUT session is connected and available.' : 'Application session only.'
})
const accessBadge = computed(() => {
  if (authStore.isGuest) return 'Guest'
  return authStore.hasDUTAccess ? 'Connected' : 'Standard'
})
const activePresetOption = computed(() =>
  THEME_PRESET_OPTIONS.find((option) => option.value === themePreferences.value.preset)
    ?? THEME_PRESET_OPTIONS[0],
)
const themeSummaryLabel = computed(() => {
  if (themePreferences.value.mode === 'system') {
    return `System ${resolvedThemeMode.value === 'dark' ? 'Dark' : 'Light'}`
  }

  return themePreferences.value.mode === 'dark' ? 'Manual Dark' : 'Manual Light'
})
const themeSummaryDescription = computed(() => {
  const presetOption = activePresetOption.value ?? THEME_PRESET_OPTIONS[0]!
  const primaryOption = THEME_PRIMARY_OPTIONS.find(
    (option) => option.value === themePreferences.value.primary,
  )
  const surfaceOption = THEME_SURFACE_OPTIONS.find(
    (option) => option.value === themePreferences.value.surface,
  )

  return `${presetOption.label} preset with ${primaryOption?.label ?? 'Emerald'} accents on ${surfaceOption?.label ?? 'Stone'} surfaces.`
})
const themeSummaryIcon = computed(() => {
  if (themePreferences.value.mode === 'system') return 'solar:monitor-bold-duotone'
  return resolvedThemeMode.value === 'dark'
    ? 'solar:moon-stars-bold-duotone'
    : 'solar:sun-2-bold-duotone'
})
const quickThemeToggleLabel = computed(() =>
  resolvedThemeMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
)
const drawerPanelClasses = computed(() => {
  if (!drawer.value) {
    return 'w-[18rem] -translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden lg:border-transparent lg:px-0 lg:py-0 lg:opacity-0'
  }
  return rail.value
    ? 'w-[5.5rem] translate-x-0 lg:w-[5.5rem]'
    : 'w-[18rem] translate-x-0 lg:w-[18rem]'
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
  const searchedItems = filterBySearch(menuTree.value.system)
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

function applyShellTheme() {
  document.documentElement.dataset.shellTheme = shellTheme.value
}

function toggleTheme() {
  cycleThemeMode()
}

function setThemePreference(nextPreferences: Partial<typeof themePreferences.value>) {
  setThemePreferences(nextPreferences)
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
  }
  void syncMenus()
})

onBeforeUnmount(() => {
  systemThemeMediaQuery?.removeEventListener('change', handleSystemThemeChange)
})

watch(isDark, () => {
  applyShellTheme()
}, { immediate: true })

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
}

.default-layout__content {
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 120, 120, 0.45) transparent;
}

.default-layout__content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.default-layout__content::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(120, 120, 120, 0.45);
}

.default-layout__progress {
  position: relative;
  height: 3px;
  overflow: hidden;
  background: rgba(20, 88, 71, 0.12);
}

.default-layout__progress::after {
  content: '';
  position: absolute;
  inset: 0 auto 0 -35%;
  width: 35%;
  background: linear-gradient(90deg, transparent, var(--shell-accent), transparent);
  animation: default-layout-progress 1.1s linear infinite;
}

details > summary::-webkit-details-marker {
  display: none;
}

@keyframes default-layout-progress {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(400%);
  }
}
</style>