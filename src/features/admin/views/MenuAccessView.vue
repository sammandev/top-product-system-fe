<template>
  <DefaultLayout>
    <v-container fluid class="py-6">
      <!-- Page Header -->
      <v-row class="mb-4">
        <v-col cols="12">
          <div class="d-flex align-center justify-space-between flex-wrap">
            <div>
              <h1 class="text-h4 font-weight-bold mb-1">Menu Access Control</h1>
              <p class="text-body-2 text-medium-emphasis">
                Control which menus are visible to each user role
              </p>
            </div>
            <div class="d-flex gap-2">
              <v-btn
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-database-refresh"
                :loading="initializing"
                @click="handleInitialize"
              >
                Initialize Defaults
              </v-btn>
              <v-btn
                color="primary"
                prepend-icon="mdi-content-save"
                :loading="saving"
                :disabled="!hasChanges"
                @click="handleSave"
              >
                Save Changes
              </v-btn>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Error/Success Alerts -->
      <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
        {{ error }}
      </v-alert>
      <v-alert v-if="successMessage" type="success" class="mb-4" closable @click:close="successMessage = null">
        {{ successMessage }}
      </v-alert>

      <!-- Loading State -->
      <v-row v-if="loading" class="justify-center py-12">
        <v-progress-circular indeterminate color="primary" size="64" />
      </v-row>

      <!-- Role Tabs -->
      <template v-else>
        <v-card elevation="2">
          <v-tabs v-model="activeTab" color="primary" bg-color="grey-lighten-4">
            <v-tab v-for="role in availableRoles" :key="role" :value="role">
              <v-icon start>{{ getRoleIcon(role) }}</v-icon>
              {{ formatRoleName(role) }}
            </v-tab>
          </v-tabs>

          <v-divider />

          <v-tabs-window v-model="activeTab">
            <v-tabs-window-item v-for="role in availableRoles" :key="role" :value="role">
              <v-card-text>
                <!-- Section: Main -->
                <div class="mb-6">
                  <div class="d-flex align-center mb-3">
                    <v-icon class="mr-2" color="primary">mdi-home</v-icon>
                    <span class="text-h6">Main Section</span>
                    <v-spacer />
                    <v-btn
                      variant="text"
                      size="small"
                      @click="toggleSection('main', role)"
                    >
                      {{ isSectionAllSelected('main', role) ? 'Deselect All' : 'Select All' }}
                    </v-btn>
                  </div>
                  <v-row>
                    <v-col
                      v-for="menu in getMenusBySection('main')"
                      :key="menu.menu_key"
                      cols="12"
                      sm="6"
                      md="4"
                      lg="3"
                    >
                      <v-checkbox
                        v-model="roleMenuAccess[role]"
                        :value="menu.menu_key"
                        :label="getMenuDisplayName(menu)"
                        density="compact"
                        hide-details
                        :disabled="isProtectedMenu(menu.menu_key, role)"
                        color="primary"
                      />
                    </v-col>
                  </v-row>
                </div>

                <v-divider class="my-4" />

                <!-- Section: Tools -->
                <div class="mb-6">
                  <div class="d-flex align-center mb-3">
                    <v-icon class="mr-2" color="warning">mdi-tools</v-icon>
                    <span class="text-h6">Tools Section</span>
                    <v-spacer />
                    <v-btn
                      variant="text"
                      size="small"
                      @click="toggleSection('tools', role)"
                    >
                      {{ isSectionAllSelected('tools', role) ? 'Deselect All' : 'Select All' }}
                    </v-btn>
                  </div>
                  <v-row>
                    <v-col
                      v-for="menu in getMenusBySection('tools')"
                      :key="menu.menu_key"
                      cols="12"
                      sm="6"
                      md="4"
                      lg="3"
                    >
                      <v-checkbox
                        v-model="roleMenuAccess[role]"
                        :value="menu.menu_key"
                        :label="getMenuDisplayName(menu)"
                        density="compact"
                        hide-details
                        :disabled="isProtectedMenu(menu.menu_key, role)"
                        color="warning"
                      />
                    </v-col>
                  </v-row>
                </div>

                <v-divider class="my-4" />

                <!-- Section: System (Admin Only) -->
                <div>
                  <div class="d-flex align-center mb-3">
                    <v-icon class="mr-2" color="error">mdi-shield-lock</v-icon>
                    <span class="text-h6">System Section</span>
                    <v-chip v-if="role !== 'admin'" size="small" color="grey" class="ml-2">
                      Admin Only
                    </v-chip>
                    <v-spacer />
                    <v-btn
                      v-if="role === 'admin'"
                      variant="text"
                      size="small"
                      @click="toggleSection('system', role)"
                    >
                      {{ isSectionAllSelected('system', role) ? 'Deselect All' : 'Select All' }}
                    </v-btn>
                  </div>
                  <v-row>
                    <v-col
                      v-for="menu in getMenusBySection('system')"
                      :key="menu.menu_key"
                      cols="12"
                      sm="6"
                      md="4"
                      lg="3"
                    >
                      <v-checkbox
                        v-model="roleMenuAccess[role]"
                        :value="menu.menu_key"
                        :label="getMenuDisplayName(menu)"
                        density="compact"
                        hide-details
                        :disabled="role !== 'admin' || isProtectedMenu(menu.menu_key, role)"
                        color="error"
                      />
                    </v-col>
                  </v-row>
                </div>
              </v-card-text>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card>

        <!-- Role Summary Cards -->
        <v-row class="mt-6">
          <v-col v-for="role in availableRoles" :key="`summary-${role}`" cols="12" md="4">
            <v-card variant="outlined">
              <v-card-title class="d-flex align-center">
                <v-icon :color="getRoleColor(role)" class="mr-2">{{ getRoleIcon(role) }}</v-icon>
                {{ formatRoleName(role) }}
              </v-card-title>
              <v-card-text>
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-medium-emphasis">Main Menus:</span>
                  <span class="font-weight-bold">{{ countMenusForRole(role, 'main') }}</span>
                </div>
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-medium-emphasis">Tools Menus:</span>
                  <span class="font-weight-bold">{{ countMenusForRole(role, 'tools') }}</span>
                </div>
                <div class="d-flex justify-space-between">
                  <span class="text-medium-emphasis">System Menus:</span>
                  <span class="font-weight-bold">{{ countMenusForRole(role, 'system') }}</span>
                </div>
                <v-divider class="my-3" />
                <div class="d-flex justify-space-between">
                  <span class="text-medium-emphasis">Total Access:</span>
                  <v-chip size="small" :color="getRoleColor(role)">
                    {{ roleMenuAccess[role]?.length || 0 }} menus
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </v-container>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { menuAccessApi } from '../api/menuAccess.api'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
import type { MenuItemData } from '../types/menuAccess.types'

// State
const loading = ref(true)
const saving = ref(false)
const initializing = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const menus = ref<MenuItemData[]>([])
const availableRoles = ref<string[]>(['guest', 'user', 'admin'])
const activeTab = useTabPersistence('tab', 'guest')

// Track menu access per role
const roleMenuAccess = ref<Record<string, string[]>>({
  guest: [],
  user: [],
  admin: []
})

// Track original state for change detection
const originalRoleMenuAccess = ref<Record<string, string[]>>({})

// Computed
const hasChanges = computed(() => {
  return JSON.stringify(roleMenuAccess.value) !== JSON.stringify(originalRoleMenuAccess.value)
})

// Methods
function getMenusBySection(section: string): MenuItemData[] {
  return menus.value
    .filter(m => m.section === section)
    .sort((a, b) => a.sort_order - b.sort_order)
}

function getMenuDisplayName(menu: MenuItemData): string {
  if (menu.parent_key) {
    const parent = menus.value.find(m => m.menu_key === menu.parent_key)
    return parent ? `${parent.title} → ${menu.title}` : menu.title
  }
  return menu.title
}

function formatRoleName(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function getRoleIcon(role: string): string {
  switch (role) {
    case 'guest': return 'mdi-account-question'
    case 'user': return 'mdi-account'
    case 'admin': return 'mdi-shield-account'
    default: return 'mdi-account'
  }
}

function getRoleColor(role: string): string {
  switch (role) {
    case 'guest': return 'warning'
    case 'user': return 'primary'
    case 'admin': return 'error'
    default: return 'grey'
  }
}

function isProtectedMenu(menuKey: string, role: string): boolean {
  // Menu access management should always be accessible to admin
  if (menuKey === 'access-control-menus' && role === 'admin') return true
  return false
}

function isSectionAllSelected(section: string, role: string): boolean {
  const sectionMenus = getMenusBySection(section)
  const roleAccess = roleMenuAccess.value[role] || []
  return sectionMenus.every(m => roleAccess.includes(m.menu_key))
}

function toggleSection(section: string, role: string): void {
  const sectionMenus = getMenusBySection(section)
  const roleAccess = roleMenuAccess.value[role] || []
  
  if (isSectionAllSelected(section, role)) {
    // Deselect all (except protected)
    roleMenuAccess.value[role] = roleAccess.filter(
      key => !sectionMenus.some(m => m.menu_key === key) || isProtectedMenu(key, role)
    )
  } else {
    // Select all
    const newKeys = sectionMenus.map(m => m.menu_key)
    roleMenuAccess.value[role] = [...new Set([...roleAccess, ...newKeys])]
  }
}

function countMenusForRole(role: string, section: string): number {
  const sectionMenus = getMenusBySection(section)
  const roleAccess = roleMenuAccess.value[role] || []
  return sectionMenus.filter(m => roleAccess.includes(m.menu_key)).length
}

async function fetchMenus(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    const response = await menuAccessApi.getAllMenus()
    menus.value = response.menus
    availableRoles.value = response.available_roles

    // Build initial role access from menus
    const access: Record<string, string[]> = {}
    for (const role of availableRoles.value) {
      access[role] = response.menus
        .filter(m => m.role_access.includes(role))
        .map(m => m.menu_key)
    }
    roleMenuAccess.value = access
    originalRoleMenuAccess.value = JSON.parse(JSON.stringify(access))
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to load menu definitions'
  } finally {
    loading.value = false
  }
}

async function handleInitialize(): Promise<void> {
  initializing.value = true
  error.value = null

  try {
    const result = await menuAccessApi.initializeMenus()
    successMessage.value = result.message
    await fetchMenus()
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to initialize menu definitions'
  } finally {
    initializing.value = false
  }
}

async function handleSave(): Promise<void> {
  saving.value = true
  error.value = null

  try {
    // Build update list
    const updates: { menu_key: string; role_name: string; can_view: boolean }[] = []

    for (const role of availableRoles.value) {
      const currentAccess = roleMenuAccess.value[role] || []
      const originalAccess = originalRoleMenuAccess.value[role] || []

      // Find additions
      for (const menuKey of currentAccess) {
        if (!originalAccess.includes(menuKey)) {
          updates.push({ menu_key: menuKey, role_name: role, can_view: true })
        }
      }

      // Find removals
      for (const menuKey of originalAccess) {
        if (!currentAccess.includes(menuKey)) {
          updates.push({ menu_key: menuKey, role_name: role, can_view: false })
        }
      }
    }

    if (updates.length > 0) {
      await menuAccessApi.bulkUpdateMenuAccess({ updates })
    }

    successMessage.value = `Successfully updated ${updates.length} menu access entries`
    originalRoleMenuAccess.value = JSON.parse(JSON.stringify(roleMenuAccess.value))
  } catch (err: any) {
    error.value = err.response?.data?.detail || 'Failed to save menu access changes'
  } finally {
    saving.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchMenus()
})
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}
</style>
