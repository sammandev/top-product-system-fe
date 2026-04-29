<template>
  <DefaultLayout>
    <section class="menu-access-page">
    <div class="menu-access-header mb-6">
      <div class="menu-access-header__copy">
        <div class="menu-access-header__icon">
          <Icon icon="mdi:menu-open" />
        </div>
        <div>
          <h1 class="text-h4 mb-2">Menu Access Control</h1>
          <p class="text-medium-emphasis mb-0">
            Configure which navigation surfaces are exposed to each role across the app shell.
          </p>
        </div>
      </div>

      <div class="menu-access-header__actions">
        <button
          type="button"
          class="menu-access-button menu-access-button--secondary"
          :disabled="initializing"
          @click="handleInitialize"
        >
          <Icon icon="mdi:database-refresh-outline" />
          <span>{{ initializing ? 'Initializing...' : 'Initialize Defaults' }}</span>
        </button>
        <button
          type="button"
          class="menu-access-button menu-access-button--primary"
          :disabled="!hasChanges || saving"
          @click="handleSave"
        >
          <Icon icon="mdi:content-save-outline" />
          <span>{{ saving ? 'Saving...' : 'Save Changes' }}</span>
        </button>
      </div>
    </div>

    <div v-if="error" class="menu-access-notice menu-access-notice--error mb-4">
      <div>
        <strong>Menu access error</strong>
        <p>{{ error }}</p>
      </div>
      <button type="button" @click="error = null">Dismiss</button>
    </div>

    <div v-if="successMessage" class="menu-access-notice menu-access-notice--success mb-4">
      <div>
        <strong>Access rules updated</strong>
        <p>{{ successMessage }}</p>
      </div>
      <button type="button" @click="successMessage = null">Dismiss</button>
    </div>

    <section v-if="loading" class="menu-access-loading">
      <div class="menu-access-loading__spinner" />
      <strong>Loading menu definitions...</strong>
      <p>Fetching the current role-to-menu assignments and protected resources.</p>
    </section>

    <div v-else class="menu-access-layout">
      <AppTabs v-model="activeTab" :items="roleTabItems" scrollable>
          <template v-for="role in availableRoles" :key="role" #[`panel-${role}`]>
            <div class="menu-access-tab-content">
              <section
                v-for="section in sectionDefinitions"
                :key="`${role}-${section.key}`"
                class="menu-access-section"
              >
                <div class="menu-access-section__header">
                  <div class="menu-access-section__copy">
                    <div class="menu-access-section__title-row">
                      <Icon :icon="section.icon" />
                      <h2>{{ section.title }}</h2>
                      <span
                        v-if="section.key === 'system' && role !== 'admin'"
                        class="menu-access-badge menu-access-badge--muted"
                      >
                        Admin only
                      </span>
                    </div>
                    <p>{{ section.description }}</p>
                  </div>

                  <button
                    v-if="canToggleSection(section.key, role)"
                    type="button"
                    class="menu-access-link"
                    @click="toggleSection(section.key, role)"
                  >
                    {{ isSectionAllSelected(section.key, role) ? 'Deselect All' : 'Select All' }}
                  </button>
                </div>

                <div class="menu-access-options-grid">
                  <label
                    v-for="menu in getMenusBySection(section.key)"
                    :key="menu.menu_key"
                    class="menu-access-option"
                    :class="{
                      'menu-access-option--active': hasMenuAccess(role, menu.menu_key),
                      'menu-access-option--disabled': isMenuLocked(menu, role),
                    }"
                  >
                    <input
                      :checked="hasMenuAccess(role, menu.menu_key)"
                      :disabled="isMenuLocked(menu, role)"
                      type="checkbox"
                      @change="handleMenuToggle(role, menu.menu_key, $event)"
                    >

                    <div class="menu-access-option__body">
                      <div class="menu-access-option__title-row">
                        <strong>{{ getMenuDisplayName(menu) }}</strong>
                        <span v-if="isProtectedMenu(menu.menu_key, role)" class="menu-access-badge">
                          Protected
                        </span>
                      </div>
                      <p>{{ menu.description || menu.path }}</p>
                      <small>{{ menu.path }}</small>
                    </div>
                  </label>
                </div>
              </section>
            </div>
          </template>
        </AppTabs>

      <aside class="menu-access-sidebar">
        <section class="menu-access-sidebar-panel">
          <div class="menu-access-sidebar-panel__header">
            <p class="menu-access-sidebar-panel__eyebrow">Role Summary</p>
            <h2>Access Footprint</h2>
          </div>

          <div class="menu-access-summary-list">
            <article
              v-for="role in availableRoles"
              :key="`summary-${role}`"
              class="menu-access-summary-card"
            >
              <div class="menu-access-summary-card__header">
                <span class="menu-access-badge" :class="`menu-access-badge--${role}`">
                  {{ formatRoleName(role) }}
                </span>
                <strong>{{ roleMenuAccess[role]?.length || 0 }} menus</strong>
              </div>
              <div class="menu-access-summary-card__stats">
                <div>
                  <span>Main</span>
                  <strong>{{ countMenusForRole(role, 'main') }}</strong>
                </div>
                <div>
                  <span>Tools</span>
                  <strong>{{ countMenusForRole(role, 'tools') }}</strong>
                </div>
                <div>
                  <span>System</span>
                  <strong>{{ countMenusForRole(role, 'system') }}</strong>
                </div>
              </div>
            </article>
          </div>
        </section>

      </aside>
    </div>
    </section>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { queryKeys } from '@/core/query'
import { AppTabs } from '@/shared'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
import { getApiErrorDetail } from '@/shared/utils'
import { menuAccessApi } from '../api/menuAccess.api'
import type { MenuItemData } from '../types/menuAccess.types'

type MenuSection = 'main' | 'tools' | 'system'

const saving = ref(false)
const initializing = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const menus = ref<MenuItemData[]>([])
const availableRoles = ref<string[]>(['guest', 'user', 'admin'])
const activeTab = useTabPersistence<string>('tab', 'guest')

const roleMenuAccess = ref<Record<string, string[]>>({
  guest: [],
  user: [],
  admin: [],
})

const originalRoleMenuAccess = ref<Record<string, string[]>>({})
const queryClient = useQueryClient()

const menusQuery = useQuery({
  queryKey: queryKeys.admin.menuAccess(),
  queryFn: menuAccessApi.getAllMenus,
})

const loading = computed(() => menusQuery.isFetching.value)

const initializeMenusMutation = useMutation({
  mutationFn: menuAccessApi.initializeMenus,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.menuAccess() }),
})

const saveMenuAccessMutation = useMutation({
  mutationFn: menuAccessApi.bulkUpdateMenuAccess,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.menuAccess() }),
})

const sectionDefinitions: Array<{
  key: MenuSection
  title: string
  description: string
  icon: string
}> = [
  {
    key: 'main',
    title: 'Main Section',
    description: 'Primary pages and dashboard surfaces that anchor day-to-day navigation.',
    icon: 'mdi:home-outline',
  },
  {
    key: 'tools',
    title: 'Tools Section',
    description:
      'Operational utilities such as parsing, comparison, conversion, and related workflows.',
    icon: 'mdi:tools',
  },
  {
    key: 'system',
    title: 'System Section',
    description: 'Administrative and protected system routes reserved for elevated roles.',
    icon: 'mdi:shield-lock-outline',
  },
]

const roleTabItems = computed(() =>
  availableRoles.value.map((role) => ({
    value: role,
    label: formatRoleName(role),
    icon: getRoleTabIcon(role),
  })),
)

const hasChanges = computed(
  () => JSON.stringify(roleMenuAccess.value) !== JSON.stringify(originalRoleMenuAccess.value),
)

function getMenusBySection(section: MenuSection): MenuItemData[] {
  return menus.value
    .filter((menu) => menu.section === section)
    .sort((left, right) => left.sort_order - right.sort_order)
}

function getMenuDisplayName(menu: MenuItemData): string {
  if (!menu.parent_key) {
    return menu.title
  }

  const parent = menus.value.find((entry) => entry.menu_key === menu.parent_key)
  return parent ? `${parent.title} -> ${menu.title}` : menu.title
}

function formatRoleName(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function getRoleTabIcon(role: string): string {
  switch (role) {
    case 'guest':
      return 'mdi-account-question'
    case 'user':
      return 'mdi-account'
    case 'admin':
      return 'mdi-shield-account'
    default:
      return 'mdi-account-circle'
  }
}

function isProtectedMenu(menuKey: string, role: string): boolean {
  return menuKey === 'access-control-menus' && role === 'admin'
}

function hasMenuAccess(role: string, menuKey: string): boolean {
  return roleMenuAccess.value[role]?.includes(menuKey) ?? false
}

function isMenuLocked(menu: MenuItemData, role: string): boolean {
  if (menu.section === 'system' && role !== 'admin') {
    return true
  }

  return isProtectedMenu(menu.menu_key, role)
}

function canToggleSection(section: MenuSection, role: string): boolean {
  return !(section === 'system' && role !== 'admin')
}

function isSectionAllSelected(section: MenuSection, role: string): boolean {
  const sectionMenus = getMenusBySection(section).filter((menu) => !isMenuLocked(menu, role))
  if (sectionMenus.length === 0) {
    return false
  }

  return sectionMenus.every((menu) => hasMenuAccess(role, menu.menu_key))
}

function toggleSection(section: MenuSection, role: string): void {
  const sectionMenus = getMenusBySection(section).filter((menu) => !isMenuLocked(menu, role))
  const roleAccess = roleMenuAccess.value[role] || []

  if (isSectionAllSelected(section, role)) {
    roleMenuAccess.value[role] = roleAccess.filter(
      (menuKey) =>
        !sectionMenus.some((menu) => menu.menu_key === menuKey) || isProtectedMenu(menuKey, role),
    )
    return
  }

  const sectionKeys = sectionMenus.map((menu) => menu.menu_key)
  roleMenuAccess.value[role] = [...new Set([...roleAccess, ...sectionKeys])]
}

function handleMenuToggle(role: string, menuKey: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  const roleAccess = roleMenuAccess.value[role] || []

  if (checked) {
    if (!roleAccess.includes(menuKey)) {
      roleMenuAccess.value[role] = [...roleAccess, menuKey]
    }
    return
  }

  roleMenuAccess.value[role] = roleAccess.filter((entry) => entry !== menuKey)
}

function countMenusForRole(role: string, section: MenuSection): number {
  return getMenusBySection(section).filter((menu) => hasMenuAccess(role, menu.menu_key)).length
}

async function fetchMenus(): Promise<void> {
  error.value = null

  const result = await menusQuery.refetch()
  if (result.error) {
    error.value = getApiErrorDetail(result.error, 'Failed to load menu definitions')
  }
}

async function handleInitialize(): Promise<void> {
  initializing.value = true
  error.value = null

  try {
    const result = await initializeMenusMutation.mutateAsync()
    successMessage.value = result.message
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to initialize menu definitions')
  } finally {
    initializing.value = false
  }
}

async function handleSave(): Promise<void> {
  saving.value = true
  error.value = null

  try {
    const updates: Array<{ menu_key: string; role_name: string; can_view: boolean }> = []

    for (const role of availableRoles.value) {
      const currentAccess = roleMenuAccess.value[role] || []
      const originalAccess = originalRoleMenuAccess.value[role] || []

      for (const menuKey of currentAccess) {
        if (!originalAccess.includes(menuKey)) {
          updates.push({ menu_key: menuKey, role_name: role, can_view: true })
        }
      }

      for (const menuKey of originalAccess) {
        if (!currentAccess.includes(menuKey)) {
          updates.push({ menu_key: menuKey, role_name: role, can_view: false })
        }
      }
    }

    if (updates.length > 0) {
      await saveMenuAccessMutation.mutateAsync({ updates })
    }

    successMessage.value = `Successfully updated ${updates.length} menu access entr${updates.length === 1 ? 'y' : 'ies'}`
    originalRoleMenuAccess.value = JSON.parse(JSON.stringify(roleMenuAccess.value))
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to save menu access changes')
  } finally {
    saving.value = false
  }
}

watch(
  () => menusQuery.data.value,
  (response) => {
    if (!response) return
    menus.value = response.menus
    availableRoles.value = response.available_roles

    const access: Record<string, string[]> = {}
    for (const role of availableRoles.value) {
      access[role] = response.menus
        .filter((menu) => menu.role_access.includes(role))
        .map((menu) => menu.menu_key)
    }

    roleMenuAccess.value = access
    originalRoleMenuAccess.value = JSON.parse(JSON.stringify(access))

    if (!availableRoles.value.includes(activeTab.value)) {
      activeTab.value = availableRoles.value[0] ?? 'guest'
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.menu-access-page {
  --menu-access-accent: var(--app-accent);
  --menu-access-accent-soft: var(--app-accent-soft);
  --menu-access-info: var(--app-info);
  --menu-access-info-soft: var(--app-info-soft);
  --menu-access-success-soft: var(--app-success-soft);
  --menu-access-success-line: var(--app-success-line);
  --menu-access-warning-soft: var(--app-warning-soft);
  --menu-access-danger-soft: var(--app-danger-soft);
  --menu-access-danger-line: var(--app-danger-line);
}

.menu-access-header,
.menu-access-header__actions,
.menu-access-header__copy,
.menu-access-section__header,
.menu-access-section__title-row,
.menu-access-option__title-row,
.menu-access-summary-card__header,
.menu-access-notice {
  display: flex;
}

.menu-access-header,
.menu-access-section__header,
.menu-access-summary-card__header,
.menu-access-notice {
  justify-content: space-between;
}

.menu-access-header,
.menu-access-header__copy,
.menu-access-header__actions,
.menu-access-section__header,
.menu-access-section__title-row,
.menu-access-option__title-row,
.menu-access-summary-card__header,
.menu-access-notice {
  gap: 1rem;
  align-items: flex-start;
}

.menu-access-header__icon {
  display: grid;
  place-items: center;
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 1.1rem;
  background: linear-gradient(135deg, var(--menu-access-accent-soft), var(--menu-access-info-soft));
  color: var(--menu-access-accent);
  box-shadow: var(--app-shadow-soft);
}

.menu-access-header__icon :deep(svg) {
  width: 1.6rem;
  height: 1.6rem;
}

.menu-access-header__actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.menu-access-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border: 0;
  border-radius: 0.5rem;
  padding: 0.9rem 1.25rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.menu-access-button :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.menu-access-button--primary {
  background: linear-gradient(135deg, var(--menu-access-accent), var(--menu-access-info));
  color: white;
  box-shadow: 0 16px 28px var(--menu-access-accent-soft);
}

.menu-access-button--secondary {
  background: var(--app-panel-strong);
  color: var(--app-ink);
  border: 1px solid var(--app-border);
  box-shadow: var(--app-shadow-soft);
}

.menu-access-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.menu-access-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.menu-access-notice,
.menu-access-loading,
.menu-access-sidebar-panel,
.menu-access-section,
.menu-access-option,
.menu-access-summary-card {
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-panel-strong);
  box-shadow: var(--app-shadow-soft);
}

.menu-access-notice,
.menu-access-loading,
.menu-access-sidebar-panel,
.menu-access-section,
.menu-access-summary-card {
  padding: 1rem 1.1rem;
}

.menu-access-notice p,
.menu-access-loading p,
.menu-access-section__copy p,
.menu-access-option__body p,
.menu-access-option__body small,
.menu-access-playbook span,
.menu-access-summary-card__stats span {
  color: var(--app-muted);
  line-height: 1.55;
}

.menu-access-notice--error {
  background: var(--menu-access-danger-soft);
  border-color: var(--menu-access-danger-line);
}

.menu-access-notice--success {
  background: var(--menu-access-success-soft);
  border-color: var(--menu-access-success-line);
}

.menu-access-notice button,
.menu-access-link {
  border: 0;
  background: transparent;
  color: var(--app-accent);
  cursor: pointer;
  font-weight: 700;
}

.menu-access-loading {
  display: grid;
  place-items: center;
  gap: 0.7rem;
  min-height: 18rem;
}

.menu-access-loading__spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid var(--menu-access-accent-soft);
  border-top-color: var(--menu-access-accent);
  border-radius: 999px;
  animation: menu-access-spin 0.9s linear infinite;
}

.menu-access-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.8fr);
  gap: 1rem;
}

.menu-access-tab-content,
.menu-access-summary-list,
.menu-access-playbook,
.menu-access-section,
.menu-access-options-grid,
.menu-access-summary-card__stats {
  display: grid;
  gap: 1rem;
}

.menu-access-tab-content,
.menu-access-summary-list,
.menu-access-playbook {
  padding-top: 1rem;
}

.menu-access-section {
  background:
    radial-gradient(circle at top right, var(--menu-access-accent-soft), transparent 34%),
    var(--app-panel-strong);
}

.menu-access-section__copy {
  display: grid;
  gap: 0.35rem;
}

.menu-access-section__title-row h2,
.menu-access-sidebar-panel__header h2 {
  margin: 0;
  color: var(--app-ink);
  font-size: 1.05rem;
}

.menu-access-section__title-row :deep(svg) {
  width: 1rem;
  height: 1rem;
  color: var(--app-accent);
}

.menu-access-options-grid {
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
}

.menu-access-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.8rem;
  padding: 0.9rem 1rem;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.menu-access-option input {
  margin-top: 0.15rem;
  width: 1rem;
  height: 1rem;
  accent-color: var(--app-accent);
}

.menu-access-option__body {
  display: grid;
  gap: 0.2rem;
}

.menu-access-option__title-row strong {
  color: var(--app-ink);
}

.menu-access-option--active {
  border-color: var(--app-accent);
  background: linear-gradient(180deg, var(--menu-access-accent-soft), var(--app-panel-strong));
  box-shadow: 0 0 0 4px var(--app-ring);
  transform: translateY(-1px);
}

.menu-access-option--disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.menu-access-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 0.5rem;
  padding: 0.2rem 0.55rem;
  background: var(--menu-access-accent-soft);
  color: var(--menu-access-accent);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.menu-access-badge--muted {
  background: var(--app-canvas-strong);
  color: var(--app-muted);
}

.menu-access-badge--guest {
  background: var(--menu-access-warning-soft);
}

.menu-access-badge--user {
  background: var(--menu-access-info-soft);
}

.menu-access-badge--admin {
  background: var(--menu-access-danger-soft);
}

.menu-access-sidebar {
  display: grid;
  gap: 1rem;
}

.menu-access-sidebar-panel {
  display: grid;
  gap: 1rem;
}

.menu-access-sidebar-panel--cool {
  background:
    radial-gradient(circle at top right, var(--menu-access-info-soft), transparent 34%),
    var(--app-panel-strong);
}

.menu-access-sidebar-panel__header {
  display: grid;
  gap: 0.35rem;
}

.menu-access-sidebar-panel__eyebrow {
  margin: 0;
  color: var(--app-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.menu-access-summary-card {
  display: grid;
  gap: 0.9rem;
}

.menu-access-summary-card strong {
  color: var(--app-ink);
}

.menu-access-summary-card__stats {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.menu-access-summary-card__stats div {
  display: grid;
  gap: 0.25rem;
}

.menu-access-playbook {
  padding-left: 1.25rem;
  margin: 0;
}

.menu-access-playbook strong {
  display: block;
  color: var(--app-ink);
}

@keyframes menu-access-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 960px) {
  .menu-access-layout {
    grid-template-columns: 1fr;
  }

  .menu-access-header,
  .menu-access-header__copy,
  .menu-access-section__header,
  .menu-access-notice {
    flex-direction: column;
  }

  .menu-access-header__actions {
    width: 100%;
    justify-content: stretch;
  }

  .menu-access-button {
    width: 100%;
  }

  .menu-access-summary-card__stats {
    grid-template-columns: 1fr;
  }
}
</style>
