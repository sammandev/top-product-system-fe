<template>
    <DefaultLayout>
        <v-container fluid>
            <!-- Page Header -->
            <v-row>
                <v-col cols="12">
                    <div class="d-flex justify-space-between align-center mb-4">
                        <div>
                            <h1 class="text-h4 font-weight-bold mb-2">Access Control</h1>
                            <p class="text-body-2 text-medium-emphasis">
                                Manage user roles and menu permissions. Only developers and super admins can access this
                                page.
                            </p>
                        </div>
                        <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="loadData">
                            Refresh
                        </v-btn>
                    </div>
                </v-col>
            </v-row>

            <!-- Error Alert -->
            <v-row v-if="error">
                <v-col cols="12">
                    <v-alert type="error" closable @click:close="error = ''">
                        {{ error }}
                    </v-alert>
                </v-col>
            </v-row>

            <!-- Success Alert -->
            <v-row v-if="success">
                <v-col cols="12">
                    <v-alert type="success" closable @click:close="success = ''">
                        {{ success }}
                    </v-alert>
                </v-col>
            </v-row>

            <!-- Loading -->
            <v-row v-if="loading && users.length === 0">
                <v-col cols="12" class="text-center py-8">
                    <v-progress-circular indeterminate color="primary" size="48" />
                    <p class="mt-4 text-medium-emphasis">Loading access control data...</p>
                </v-col>
            </v-row>

            <!-- Users Table -->
            <v-row v-else>
                <v-col cols="12">
                    <v-card>
                        <v-card-title class="d-flex align-center">
                            <v-icon class="mr-2">mdi-shield-account</v-icon>
                            User Access Management
                            <v-spacer />
                            <v-text-field v-model="search" density="compact" label="Search users"
                                prepend-inner-icon="mdi-magnify" variant="outlined" hide-details class="max-w-sm"
                                style="max-width: 300px" />
                        </v-card-title>

                        <v-data-table :headers="headers" :items="users" :search="search" :loading="loading"
                            :items-per-page="15" hover>
                            <!-- Username column -->
                            <template #item.username="{ item }">
                                <div class="d-flex align-center">
                                    <v-avatar size="32" class="mr-2" :color="getRoleColor(item.role)">
                                        <v-icon size="18" color="white">{{ getRoleIcon(item.role) }}</v-icon>
                                    </v-avatar>
                                    <div>
                                        <span class="font-weight-medium">{{ item.username }}</span>
                                        <div v-if="item.email" class="text-caption text-medium-emphasis">
                                            {{ item.email }}
                                        </div>
                                    </div>
                                </div>
                            </template>

                            <!-- Role column -->
                            <template #item.role="{ item }">
                                <v-chip :color="getRoleColor(item.role)" size="small" label>
                                    <v-icon start size="14">{{ getRoleIcon(item.role) }}</v-icon>
                                    {{ item.role.toUpperCase() }}
                                </v-chip>
                            </template>

                            <!-- Status column -->
                            <template #item.is_active="{ item }">
                                <v-chip :color="item.is_active ? 'success' : 'error'" size="small" label>
                                    {{ item.is_active ? 'Active' : 'Inactive' }}
                                </v-chip>
                            </template>

                            <!-- Flags column -->
                            <template #item.flags="{ item }">
                                <div class="d-flex ga-1 flex-wrap">
                                    <v-chip v-if="item.is_ptb_admin" size="x-small" color="info" label>
                                        PTB Admin
                                    </v-chip>
                                    <v-chip v-if="item.is_superuser" size="x-small" color="purple" label>
                                        Superuser
                                    </v-chip>
                                    <v-chip v-if="item.is_staff" size="x-small" color="teal" label>
                                        Staff
                                    </v-chip>
                                    <v-chip v-if="item.is_admin" size="x-small" color="warning" label>
                                        Admin
                                    </v-chip>
                                </div>
                            </template>

                            <!-- Permissions column -->
                            <template #item.menu_permissions="{ item }">
                                <span v-if="item.role === 'developer'" class="text-caption text-success">
                                    Full Access (Developer)
                                </span>
                                <span v-else-if="item.role === 'superadmin'" class="text-caption text-info">
                                    Full Access (Super Admin)
                                </span>
                                <span v-else-if="item.role === 'admin'" class="text-caption text-warning">
                                    Admin Access
                                </span>
                                <span v-else-if="item.role === 'guest'" class="text-caption text-medium-emphasis">
                                    Guest (Limited)
                                </span>
                                <span v-else-if="!item.menu_permissions" class="text-caption text-medium-emphasis">
                                    Not configured
                                </span>
                                <span v-else class="text-caption">
                                    {{ Object.keys(item.menu_permissions).length }} resources
                                </span>
                            </template>

                            <!-- Last Login column -->
                            <template #item.last_login="{ item }">
                                <span v-if="item.last_login" class="text-caption">
                                    {{ formatDate(item.last_login) }}
                                </span>
                                <span v-else class="text-caption text-medium-emphasis">Never</span>
                            </template>

                            <!-- Actions column -->
                            <template #item.actions="{ item }">
                                <v-btn v-if="item.role !== 'developer'" icon size="small" variant="text"
                                    @click="openEditDialog(item)">
                                    <v-icon size="18">mdi-pencil</v-icon>
                                    <v-tooltip activator="parent" location="top">Edit Access</v-tooltip>
                                </v-btn>
                                <v-btn v-if="item.role !== 'developer'" icon size="small" variant="text"
                                    @click="openPermissionsDialog(item)">
                                    <v-icon size="18">mdi-shield-key</v-icon>
                                    <v-tooltip activator="parent" location="top">Menu Permissions</v-tooltip>
                                </v-btn>
                                <v-chip v-if="item.role === 'developer'" size="x-small" color="grey" label>
                                    Protected
                                </v-chip>
                            </template>
                        </v-data-table>
                    </v-card>
                </v-col>
            </v-row>

            <!-- Edit Role/Status Dialog -->
            <v-dialog v-model="editDialog" max-width="500" persistent>
                <v-card>
                    <v-card-title class="d-flex align-center">
                        <v-icon class="mr-2">mdi-account-cog</v-icon>
                        Edit Access: {{ editingUser?.username }}
                    </v-card-title>

                    <v-card-text>
                        <v-select v-model="editForm.role" :items="availableRoles" label="Role" variant="outlined"
                            :disabled="!authStore.isDeveloper && editForm.role === 'superadmin'"
                            hint="Only developers can grant superadmin role" persistent-hint />

                        <v-switch v-model="editForm.is_active" label="Active" color="success" class="mt-2" />

                        <v-switch v-model="editForm.is_ptb_admin" label="PTB Admin" color="info"
                            hint="Synced from external API on login" persistent-hint />
                    </v-card-text>

                    <v-card-actions>
                        <v-spacer />
                        <v-btn variant="text" @click="editDialog = false">Cancel</v-btn>
                        <v-btn color="primary" :loading="saving" @click="saveUserAccess">Save</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- Menu Permissions Dialog -->
            <v-dialog v-model="permissionsDialog" max-width="900" persistent>
                <v-card>
                    <v-card-title class="d-flex align-center">
                        <v-icon class="mr-2">mdi-shield-key</v-icon>
                        Menu Permissions: {{ permissionsUser?.username }}
                    </v-card-title>

                    <v-card-subtitle>
                        Configure which resources and actions this user can access. Check the boxes to grant specific
                        CRUD permissions for each resource.
                    </v-card-subtitle>

                    <v-card-text>
                        <v-btn size="small" variant="outlined" class="mr-2 mb-3"
                            prepend-icon="mdi-checkbox-marked-outline" @click="selectAllPermissions">
                            Select All
                        </v-btn>
                        <v-btn size="small" variant="outlined" class="mr-2 mb-3"
                            prepend-icon="mdi-checkbox-blank-outline" @click="clearAllPermissions">
                            Clear All
                        </v-btn>
                        <v-btn size="small" variant="outlined" class="mb-3" prepend-icon="mdi-restore"
                            @click="applyDefaultPermissions">
                            Apply Defaults
                        </v-btn>

                        <v-table density="compact">
                            <thead>
                                <tr>
                                    <th class="text-left" style="min-width: 180px">Resource</th>
                                    <th v-for="action in availableActions" :key="action" class="text-center">
                                        {{ action.charAt(0).toUpperCase() + action.slice(1) }}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="resource in availableResources" :key="resource">
                                    <td>
                                        <v-icon size="16" class="mr-1">{{ getResourceIcon(resource) }}</v-icon>
                                        {{ formatResourceName(resource) }}
                                    </td>
                                    <td v-for="action in availableActions" :key="action" class="text-center">
                                        <v-checkbox :model-value="hasPermission(resource, action)" density="compact"
                                            hide-details class="d-inline-flex"
                                            @update:model-value="togglePermission(resource, action, $event)" />
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </v-card-text>

                    <v-card-actions>
                        <v-spacer />
                        <v-btn variant="text" @click="permissionsDialog = false">Cancel</v-btn>
                        <v-btn color="primary" :loading="saving" @click="savePermissions">Save Permissions</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </v-container>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/features/auth/stores'
import { getApiErrorDetail } from '@/shared/utils'
import { type AccessControlUser, adminApi } from '../api/admin.api'

const authStore = useAuthStore()

// State
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const error = ref('')
const success = ref('')

const users = ref<AccessControlUser[]>([])
const availableResources = ref<string[]>([])
const availableActions = ref<string[]>([])
const defaultPermissions = ref<Record<string, string[]>>({})

// Edit dialog state
const editDialog = ref(false)
const editingUser = ref<AccessControlUser | null>(null)
const editForm = ref({
  role: 'user' as string,
  is_active: true,
  is_ptb_admin: false,
})

// Permissions dialog state
const permissionsDialog = ref(false)
const permissionsUser = ref<AccessControlUser | null>(null)
const permissionsForm = ref<Record<string, string[]>>({})

// Table headers
const headers = [
  { title: 'User', key: 'username', sortable: true },
  { title: 'Role', key: 'role', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Flags', key: 'flags', sortable: false },
  { title: 'Permissions', key: 'menu_permissions', sortable: false },
  { title: 'Last Login', key: 'last_login', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const },
]

// Available roles for the dropdown (developer cannot be assigned via UI)
const availableRoles = [
  { title: 'Guest', value: 'guest' },
  { title: 'User', value: 'user' },
  { title: 'Admin', value: 'admin' },
  { title: 'Super Admin', value: 'superadmin' },
]

// ============================================================================
// Data Loading
// ============================================================================

async function loadData() {
  loading.value = true
  error.value = ''

  try {
    const [usersResponse, resourcesResponse] = await Promise.all([
      adminApi.getAccessControlUsers(),
      adminApi.getMenuResources(),
    ])

    users.value = usersResponse.users
    availableResources.value = resourcesResponse.resources
    availableActions.value = resourcesResponse.actions
    defaultPermissions.value = resourcesResponse.default_permissions
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to load access control data')
  } finally {
    loading.value = false
  }
}

// ============================================================================
// Edit Role/Status Dialog
// ============================================================================

function openEditDialog(user: AccessControlUser) {
  editingUser.value = user
  editForm.value = {
    role: user.role,
    is_active: user.is_active,
    is_ptb_admin: user.is_ptb_admin,
  }
  editDialog.value = true
}

async function saveUserAccess() {
  if (!editingUser.value) return

  saving.value = true
  error.value = ''

  try {
    await adminApi.updateUserAccess(editingUser.value.id, {
      role: editForm.value.role,
      is_active: editForm.value.is_active,
      is_ptb_admin: editForm.value.is_ptb_admin,
    })

    success.value = `Access settings updated for ${editingUser.value.username}`
    editDialog.value = false
    await loadData()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to update access settings')
  } finally {
    saving.value = false
  }
}

// ============================================================================
// Menu Permissions Dialog
// ============================================================================

function openPermissionsDialog(user: AccessControlUser) {
  permissionsUser.value = user
  // Deep clone existing permissions or start empty
  permissionsForm.value = user.menu_permissions
    ? JSON.parse(JSON.stringify(user.menu_permissions))
    : {}
  permissionsDialog.value = true
}

function hasPermission(resource: string, action: string): boolean {
  return permissionsForm.value[resource]?.includes(action) ?? false
}

function togglePermission(resource: string, action: string, checked: unknown) {
  if (!permissionsForm.value[resource]) {
    permissionsForm.value[resource] = []
  }

  if (checked) {
    if (!permissionsForm.value[resource].includes(action)) {
      permissionsForm.value[resource].push(action)
    }
  } else {
    permissionsForm.value[resource] = permissionsForm.value[resource].filter((a) => a !== action)
    // Remove empty arrays
    if (permissionsForm.value[resource].length === 0) {
      delete permissionsForm.value[resource]
    }
  }
}

function selectAllPermissions() {
  const allPerms: Record<string, string[]> = {}
  for (const resource of availableResources.value) {
    allPerms[resource] = [...availableActions.value]
  }
  permissionsForm.value = allPerms
}

function clearAllPermissions() {
  permissionsForm.value = {}
}

function applyDefaultPermissions() {
  permissionsForm.value = JSON.parse(JSON.stringify(defaultPermissions.value))
}

async function savePermissions() {
  if (!permissionsUser.value) return

  saving.value = true
  error.value = ''

  try {
    await adminApi.updateUserAccess(permissionsUser.value.id, {
      menu_permissions: permissionsForm.value,
    })

    success.value = `Menu permissions updated for ${permissionsUser.value.username}`
    permissionsDialog.value = false
    await loadData()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to update menu permissions')
  } finally {
    saving.value = false
  }
}

// ============================================================================
// Helpers
// ============================================================================

function getRoleColor(role: string): string {
  switch (role) {
    case 'developer':
      return 'deep-purple'
    case 'superadmin':
      return 'orange'
    case 'admin':
      return 'teal'
    case 'user':
      return 'blue-grey'
    case 'guest':
      return 'grey'
    default:
      return 'grey'
  }
}

function getRoleIcon(role: string): string {
  switch (role) {
    case 'developer':
      return 'mdi-code-tags'
    case 'superadmin':
      return 'mdi-shield-crown'
    case 'admin':
      return 'mdi-shield-account'
    case 'user':
      return 'mdi-account'
    case 'guest':
      return 'mdi-account-question'
    default:
      return 'mdi-account-question'
  }
}

function getResourceIcon(resource: string): string {
  const icons: Record<string, string> = {
    dashboard: 'mdi-view-dashboard',
    parsing: 'mdi-file-document-edit',
    comparison: 'mdi-compare-horizontal',
    top_products: 'mdi-trophy',
    dut_analysis: 'mdi-chart-line',
    dut_management: 'mdi-devices',
    activity: 'mdi-history',
    mastercontrol: 'mdi-factory',
    conversion: 'mdi-swap-horizontal',
    admin_users: 'mdi-account-group',
    admin_rbac: 'mdi-shield-lock',
    admin_cleanup: 'mdi-broom',
    admin_config: 'mdi-cog',
    admin_menu_access: 'mdi-menu',
    admin_access_control: 'mdi-shield-account',
  }
  return icons[resource] || 'mdi-circle-small'
}

function formatResourceName(resource: string): string {
  return resource
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  loadData()
})
</script>
