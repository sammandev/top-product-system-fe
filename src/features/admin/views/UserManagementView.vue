<template>
    <DefaultLayout>
        <v-container fluid>
            <v-row>
                <v-col cols="12">
                    <div class="d-flex justify-space-between align-center mb-4">
                        <div>
                            <h1 class="text-h4 font-weight-bold mb-2">User Management</h1>
                            <p class="text-body-2 text-medium-emphasis">
                                Manage user accounts, roles, and access permissions
                            </p>
                        </div>
                        <v-btn color="primary" prepend-icon="mdi-account-plus" @click="openCreateDialog">
                            Add User
                        </v-btn>
                    </div>
                </v-col>
            </v-row>

            <!-- Statistics Cards -->
            <v-row class="mb-4">
                <v-col cols="12" sm="6" md="3">
                    <v-card>
                        <v-card-text>
                            <div class="d-flex align-center">
                                <v-avatar color="primary" size="48" class="mr-3">
                                    <v-icon>mdi-account-group</v-icon>
                                </v-avatar>
                                <div>
                                    <div class="text-overline">Total Users</div>
                                    <div class="text-h5">{{ stats.total_users }}</div>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                    <v-card>
                        <v-card-text>
                            <div class="d-flex align-center">
                                <v-avatar color="success" size="48" class="mr-3">
                                    <v-icon>mdi-account-check</v-icon>
                                </v-avatar>
                                <div>
                                    <div class="text-overline">Active Users</div>
                                    <div class="text-h5">{{ stats.active_users }}</div>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                    <v-card>
                        <v-card-text>
                            <div class="d-flex align-center">
                                <v-avatar color="info" size="48" class="mr-3">
                                    <v-icon>mdi-clock-outline</v-icon>
                                </v-avatar>
                                <div>
                                    <div class="text-overline">Online Now</div>
                                    <div class="text-h5">{{ stats.online_users }}</div>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                    <v-card>
                        <v-card-text>
                            <div class="d-flex align-center">
                                <v-avatar color="warning" size="48" class="mr-3">
                                    <v-icon>mdi-account-clock</v-icon>
                                </v-avatar>
                                <div>
                                    <div class="text-overline">New This Month</div>
                                    <div class="text-h5">{{ stats.new_users }}</div>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <!-- Error/Success Alerts -->
            <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">
                {{ error }}
            </v-alert>
            <v-alert v-if="success" type="success" variant="tonal" closable class="mb-4" @click:close="success = ''">
                {{ success }}
            </v-alert>

            <!-- Users Table -->
            <v-row>
                <v-col cols="12">
                    <v-card>
                        <v-card-title>
                            <v-row align="center">
                                <v-col cols="12" md="6">
                                    Users
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-text-field v-model="search" density="compact" variant="outlined"
                                        prepend-inner-icon="mdi-magnify" placeholder="Search users..." hide-details
                                        clearable />
                                </v-col>
                            </v-row>
                        </v-card-title>
                        <v-card-text>
                            <v-data-table :headers="headers" :items="filteredUsers" :loading="loading"
                                :items-per-page="10">
                                <template v-slot:item.username="{ item }">
                                    <div class="d-flex align-center cursor-pointer" @click="showUserDetails(item)">
                                        <v-avatar :color="item.is_active ? 'primary' : 'grey'" size="32" class="mr-3">
                                            <span class="text-h6">{{ item.username.charAt(0).toUpperCase() }}</span>
                                        </v-avatar>
                                        <div>
                                            <div class="font-weight-medium text-primary">{{ item.username }}</div>
                                            <div class="text-caption text-medium-emphasis">{{ item.email }}</div>
                                        </div>
                                    </div>
                                </template>
                                <template v-slot:item.roles="{ item }">
                                    <v-chip-group>
                                        <v-chip v-for="role in item.roles" :key="role" size="small"
                                            :color="getRoleColor(role)">
                                            {{ role }}
                                        </v-chip>
                                    </v-chip-group>
                                </template>
                                <template v-slot:item.is_active="{ item }">
                                    <div class="d-flex justify-center align-center">
                                        <v-switch
                                            :model-value="item.is_active"
                                            :loading="togglingUserId === item.id"
                                            :disabled="togglingUserId === item.id"
                                            color="success"
                                            hide-details
                                            density="compact"
                                            @update:model-value="toggleUserStatus(item)"
                                        >
                                            <template v-slot:label>
                                                <span class="text-caption" :class="item.is_active ? 'text-success' : 'text-error'">
                                                    {{ item.is_active ? 'Active' : 'Inactive' }}
                                                </span>
                                            </template>
                                        </v-switch>
                                    </div>
                                </template>
                                <template v-slot:item.last_login="{ item }">
                                    {{ formatDate(item.last_login) }}
                                </template>
                                <template v-slot:item.actions="{ item }">
                                    <div class="d-flex justify-center gap-1">
                                        <v-btn icon="mdi-pencil" size="small" variant="text" color="primary"
                                            @click="editUser(item)" title="Edit User" />
                                        <v-btn icon="mdi-lock-reset" size="small" variant="text" color="warning"
                                            @click="resetPassword(item)" title="Reset Password" />
                                        <v-btn icon="mdi-delete" size="small" variant="text" color="error"
                                            @click="confirmDelete(item)" title="Delete User" />
                                    </div>
                                </template>
                            </v-data-table>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <!-- User Details Dialog -->
            <v-dialog v-model="detailsDialog" max-width="800px">
                <v-card v-if="selectedUser">
                    <v-card-title class="d-flex justify-space-between align-center">
                        <span class="text-h5">User Details: {{ selectedUser.username }}</span>
                        <v-btn icon="mdi-close" variant="text" color="primary" @click="detailsDialog = false" />
                    </v-card-title>
                    <v-divider />
                    <v-card-text class="pa-6">
                        <v-row>
                            <!-- Basic Information -->
                            <v-col cols="12">
                                <v-card variant="outlined">
                                    <v-card-title class="text-subtitle-1 d-flex align-center">
                                        <v-icon class="mr-2">mdi-information</v-icon>
                                        Basic Information
                                    </v-card-title>
                                    <v-divider />
                                    <v-card-text>
                                        <v-row dense>
                                            <v-col cols="4" class="text-medium-emphasis">Username:</v-col>
                                            <v-col cols="8" class="font-weight-medium">{{ selectedUser.username }}</v-col>
                                            <v-col cols="4" class="text-medium-emphasis">Email:</v-col>
                                            <v-col cols="8">{{ selectedUser.email || 'No email' }}</v-col>
                                            <v-col cols="4" class="text-medium-emphasis">Status:</v-col>
                                            <v-col cols="8">
                                                <v-chip :color="selectedUser.is_active ? 'success' : 'error'" size="small">
                                                    {{ selectedUser.is_active ? 'Active' : 'Inactive' }}
                                                </v-chip>
                                            </v-col>
                                            <v-col cols="4" class="text-medium-emphasis">Admin Access:</v-col>
                                            <v-col cols="8">
                                                <v-chip :color="selectedUser.roles.includes('admin') ? 'primary' : 'default'" size="small">
                                                    {{ selectedUser.roles.includes('admin') ? 'Administrator' : 'Regular User' }}
                                                </v-chip>
                                            </v-col>
                                        </v-row>
                                    </v-card-text>
                                </v-card>
                            </v-col>

                            <!-- Assigned Roles -->
                            <v-col cols="12">
                                <v-card variant="outlined">
                                    <v-card-title class="text-subtitle-1 d-flex align-center">
                                        <v-icon class="mr-2">mdi-shield-account</v-icon>
                                        Assigned Roles ({{ selectedUser.roles?.length || 0 }})
                                    </v-card-title>
                                    <v-divider />
                                    <v-card-text>
                                        <v-chip-group v-if="selectedUser.roles && selectedUser.roles.length > 0" column>
                                            <v-chip v-for="role in selectedUser.roles" :key="role" :color="getRoleColor(role)"
                                                variant="outlined">
                                                {{ role }}
                                            </v-chip>
                                        </v-chip-group>
                                        <p v-else class="text-medium-emphasis">No roles assigned</p>
                                    </v-card-text>
                                </v-card>
                            </v-col>

                            <!-- Activity Information -->
                            <v-col cols="12">
                                <v-card variant="outlined">
                                    <v-card-title class="text-subtitle-1 d-flex align-center">
                                        <v-icon class="mr-2">mdi-clock-outline</v-icon>
                                        Activity Information
                                    </v-card-title>
                                    <v-divider />
                                    <v-card-text>
                                        <v-row dense>
                                            <v-col cols="4" class="text-medium-emphasis">Last Login:</v-col>
                                            <v-col cols="8">{{ formatDate(selectedUser.last_login) }}</v-col>
                                            <v-col cols="4" class="text-medium-emphasis">Account Created:</v-col>
                                            <v-col cols="8">{{ formatDate(selectedUser.created_at) }}</v-col>
                                            <v-col cols="4" class="text-medium-emphasis">Last Updated:</v-col>
                                            <v-col cols="8">{{ formatDate(selectedUser.updated_at) }}</v-col>
                                        </v-row>
                                    </v-card-text>
                                </v-card>
                            </v-col>
                        </v-row>
                    </v-card-text>
                    <v-divider />
                    <v-card-actions>
                        <v-spacer />
                        <v-btn @click="detailsDialog = false">Close</v-btn>
                        <v-btn color="primary" prepend-icon="mdi-pencil" @click="editUserFromDetails">
                            Edit
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- Delete Confirmation Dialog -->
            <v-dialog v-model="deleteDialog" max-width="500px" persistent>
                <v-card>
                    <v-card-title class="text-h5 bg-error text-white">
                        <v-icon start>mdi-alert</v-icon>
                        Confirm Delete
                    </v-card-title>
                    <v-card-text class="pt-4">
                        <div class="mb-4">
                            <p class="text-body-1 mb-2">
                                You are about to delete this user:
                            </p>
                            <v-card variant="outlined" class="mb-4">
                                <v-card-text>
                                    <div><strong>Username:</strong> {{ userToDelete?.username || 'N/A' }}</div>
                                    <div><strong>Email:</strong> {{ userToDelete?.email || 'N/A' }}</div>
                                    <div><strong>Roles:</strong> {{ userToDelete?.roles?.join(', ') || 'None' }}</div>
                                </v-card-text>
                            </v-card>
                            <v-alert type="warning" variant="tonal" color="orange-darken-1" class="mb-4">
                                This action cannot be undone. The user will be permanently removed from the system.
                            </v-alert>
                        </div>
                        <div>
                            <p class="text-body-2 mb-2">
                                Type <strong>DELETE</strong> to confirm:
                            </p>
                            <v-text-field v-model="deleteConfirmation" placeholder="DELETE" variant="outlined"
                                density="comfortable" hide-details autofocus @keyup.enter="handleDeleteUser" />
                        </div>
                    </v-card-text>
                    <v-card-actions>
                        <v-spacer />
                        <v-btn color="default" variant="tonal" @click="cancelDelete" :disabled="deleting">
                            Cancel
                        </v-btn>
                        <v-btn color="error" variant="flat" @click="handleDeleteUser"
                            :disabled="deleteConfirmation !== 'DELETE' || deleting" :loading="deleting">
                            Delete User
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- Create/Edit User Dialog -->
            <v-dialog v-model="dialog" max-width="600px">
                <v-card>
                    <v-card-title>
                        <span class="text-h5">{{ editMode ? 'Edit User' : 'Create User' }}</span>
                    </v-card-title>
                    <v-card-text>
                        <v-form ref="form">
                            <v-text-field v-model="currentUser.username" label="Username"
                                :rules="[v => !!v || 'Username is required']" :disabled="editMode" variant="outlined"
                                class="mb-3" />
                            <v-text-field v-model="currentUser.email" label="Email" type="email" variant="outlined"
                                class="mb-3" />
                            <v-text-field v-model="currentUser.password"
                                :label="editMode ? 'New Password (optional)' : 'Password'" type="password"
                                :rules="editMode ? [] : [v => !!v || 'Password is required']" variant="outlined"
                                :hint="editMode ? 'Leave blank to keep current password' : ''" persistent-hint
                                class="mt-2 mb-5" />
                            <v-select v-model="currentUser.roles" :items="availableRoles" label="Roles" multiple chips
                                variant="outlined" closable-chips class="mb-3" />
                            <v-switch v-model="currentUser.is_active" label="Active Account" color="success" />
                        </v-form>
                    </v-card-text>
                    <v-card-actions>
                        <v-spacer />
                        <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
                        <v-btn color="primary" variant="flat" @click="saveUser" :loading="loading">
                            Save
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </v-container>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'
import { getApiErrorDetail, getErrorStatus } from '@/shared/utils'
import {
  adminApi,
  type CreateUserRequest,
  type UpdateUserRequest,
  type User,
  type UserStats,
} from '../api/admin.api'

// Router for logout redirect
const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(false)
const search = ref('')
const dialog = ref(false)
const editMode = ref(false)
const form = ref()

const error = ref('')
const success = ref('')

const detailsDialog = ref(false)
const selectedUser = ref<User | null>(null)

const stats = ref<UserStats>({
  total_users: 0,
  active_users: 0,
  online_users: 0,
  new_users: 0,
})

const users = ref<User[]>([])

const currentUser = ref<Partial<User & { password?: string }>>({
  username: '',
  email: '',
  roles: [],
  is_active: true,
})

// Delete dialog state
const deleteDialog = ref(false)
const userToDelete = ref<User | null>(null)
const deleteConfirmation = ref('')
const deleting = ref(false)

// Toggle status state
const togglingUserId = ref<number | null>(null)

// Get current logged-in user
const loggedInUser = computed(() => authStore.user)

// Load roles dynamically from RBAC
const availableRoles = ref<string[]>([])

const headers = [
  { title: 'User', key: 'username' },
  { title: 'Roles', key: 'roles', sortable: false },
  { title: 'Account Status', key: 'is_active', align: 'center' as const },
  { title: 'Last Login', key: 'last_login' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const },
]

// Computed
const filteredUsers = computed(() => {
  if (!search.value) return users.value
  return users.value.filter(
    (user) =>
      user.username.toLowerCase().includes(search.value.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.value.toLowerCase()),
  )
})

// Methods
async function loadRoles() {
  try {
    const response = await adminApi.getRoles()
    availableRoles.value = response.roles.map((role) => role.name)
  } catch (error) {
    console.error('Failed to load roles:', error)
    // Fallback to default roles if API fails
    availableRoles.value = ['admin', 'user', 'analyst', 'viewer']
  }
}

async function loadUsers() {
  console.log('[UserManagement] Loading users...')
  loading.value = true
  try {
    const response = await adminApi.getUsers()
    users.value = response.users
    stats.value = response.stats
    console.log('[UserManagement] Users loaded successfully', {
      totalUsers: response.users.length,
      stats: response.stats,
    })
    // Load available roles
    await loadRoles()
  } catch (error) {
    console.error('[UserManagement] Failed to load users:', error)
  } finally {
    loading.value = false
  }
}

function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    admin: 'error',
    user: 'primary',
    analyst: 'info',
    viewer: 'success',
  }
  return colors[role] || 'default'
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}

function openCreateDialog() {
  editMode.value = false
  currentUser.value = {
    username: '',
    email: '',
    roles: [],
    is_active: true,
    password: '',
  }
  dialog.value = true
}

function editUser(user: User) {
  editMode.value = true
  currentUser.value = { ...user }
  dialog.value = true
}

function resetPassword(user: User) {
  if (confirm(`Reset password for user "${user.username}"?`)) {
    // API call to reset password
    alert('Password reset email sent!')
  }
}

function confirmDelete(user: User) {
  userToDelete.value = user
  deleteConfirmation.value = ''
  deleteDialog.value = true
}

function cancelDelete() {
  deleteDialog.value = false
  userToDelete.value = null
  deleteConfirmation.value = ''
}

async function handleDeleteUser() {
  if (deleteConfirmation.value !== 'DELETE' || !userToDelete.value || deleting.value) {
    return
  }

  deleting.value = true
  try {
    error.value = ''
    await adminApi.deleteUser(userToDelete.value.id)
    success.value = `User "${userToDelete.value.username}" deleted successfully`

    // Close dialog
    cancelDelete()

    // Reload users list
    await loadUsers()
  } catch (err: unknown) {
    console.error('Failed to delete user:', err)
    error.value = getApiErrorDetail(err, 'Failed to delete user')
  } finally {
    deleting.value = false
  }
}

async function toggleUserStatus(user: User) {
  console.log('[UserManagement] toggleUserStatus called', {
    userId: user.id,
    username: user.username,
    currentStatus: user.is_active,
    targetStatus: !user.is_active,
    togglingUserId: togglingUserId.value,
  })

  // Prevent multiple simultaneous toggles
  if (togglingUserId.value !== null) {
    console.warn('[UserManagement] Toggle already in progress for user:', togglingUserId.value)
    return
  }

  const newStatus = !user.is_active
  const action = newStatus ? 'activate' : 'deactivate'

  // Prevent self-deactivation
  if (!newStatus && loggedInUser.value && user.id === loggedInUser.value.id) {
    console.warn('[UserManagement] Prevented self-deactivation attempt', {
      userId: user.id,
      username: user.username,
    })
    error.value = 'Cannot deactivate your own account'
    return
  }

  togglingUserId.value = user.id
  error.value = ''

  console.log('[UserManagement] Starting user status toggle', {
    userId: user.id,
    username: user.username,
    action,
    newStatus,
  })

  try {
    // Update user status - only send is_active field to avoid issues
    const updateData: UpdateUserRequest = {
      is_active: newStatus,
    }

    console.log('[UserManagement] Sending API request to update user', {
      userId: user.id,
      updateData,
    })

    const response = await adminApi.updateUser(user.id, updateData)

    console.log('[UserManagement] API response received', {
      userId: response.id,
      username: response.username,
      is_active: response.is_active,
    })

    // Update local user object immediately for responsive UI
    user.is_active = newStatus

    success.value = `User "${user.username}" ${action}d successfully`
    console.log('[UserManagement] User status updated successfully', {
      userId: user.id,
      username: user.username,
      newStatus: user.is_active,
    })

    // If we deactivated ourselves (shouldn't happen with check above), logout
    if (!newStatus && loggedInUser.value && user.id === loggedInUser.value.id) {
      console.warn('[UserManagement] Current user was deactivated, logging out...')
      setTimeout(async () => {
        await authStore.logout()
        router.push('/login')
      }, 1500)
    }
  } catch (err: unknown) {
    console.error('[UserManagement] Failed to toggle user status', {
      userId: user.id,
      username: user.username,
      action,
      error: err,
      errorDetail: getApiErrorDetail(err),
      errorStatus: getErrorStatus(err),
    })

    error.value = getApiErrorDetail(err, `Failed to ${action} user`)

    // Reload on error to restore correct state
    console.log('[UserManagement] Reloading user list due to error')
    await loadUsers()
  } finally {
    togglingUserId.value = null
    console.log('[UserManagement] Toggle operation completed for user:', user.id)
  }
}

function showUserDetails(user: User) {
  selectedUser.value = user
  detailsDialog.value = true
}

function editUserFromDetails() {
  if (selectedUser.value) {
    editUser(selectedUser.value)
    detailsDialog.value = false
  }
}

async function saveUser() {
  try {
    loading.value = true
    error.value = ''

    if (editMode.value) {
      // Update existing user
      const updateData: UpdateUserRequest = {
        email: currentUser.value.email,
        roles: currentUser.value.roles,
        is_active: currentUser.value.is_active,
      }

      // Include password if provided
      if (currentUser.value.password && currentUser.value.password.trim() !== '') {
        updateData.password = currentUser.value.password
      }

      await adminApi.updateUser(
        // biome-ignore lint/style/noNonNullAssertion: id exists for existing users being updated
        currentUser.value.id!,
        updateData,
      )
      success.value = 'User updated successfully'
    } else {
      // Create new user
      const createData: CreateUserRequest = {
        // biome-ignore lint/style/noNonNullAssertion: validated as required before submission
        username: currentUser.value.username!,
        email: currentUser.value.email,
        // biome-ignore lint/style/noNonNullAssertion: validated as required before submission
        password: currentUser.value.password!,
        roles: currentUser.value.roles,
        is_active: currentUser.value.is_active,
      }

      await adminApi.createUser(createData)
      success.value = 'User created successfully'
    }

    // Close dialog and reload users
    dialog.value = false
    await loadUsers()
  } catch (err: unknown) {
    console.error('Failed to save user:', err)
    error.value = getApiErrorDetail(err, 'Failed to save user')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.gap-1 {
    gap: 0.25rem;
}

.cursor-pointer {
    cursor: pointer;
}

.cursor-pointer:hover {
    background-color: rgba(var(--v-theme-primary), 0.04);
    border-radius: 4px;
}
</style>
