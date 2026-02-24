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
                        <div class="d-flex ga-2">
                            <v-btn v-if="activeTab === 'users'" color="primary" prepend-icon="mdi-account-plus"
                                @click="openCreateDialog">
                                Add User
                            </v-btn>
                            <v-btn v-if="activeTab === 'roles'" color="primary" prepend-icon="mdi-refresh"
                                :loading="acLoading" @click="loadAccessControlData">
                                Refresh
                            </v-btn>
                        </div>
                    </div>
                </v-col>
            </v-row>

            <!-- Statistics Cards (Users tab only) -->
            <v-row v-if="activeTab === 'users'" class="mb-4">
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

            <!-- Tabs -->
            <v-card>
                <v-tabs v-model="activeTab" color="primary">
                    <v-tab value="users" prepend-icon="mdi-account-group">Users</v-tab>
                    <v-tab v-if="authStore.isSuperAdmin" value="roles" prepend-icon="mdi-shield-account">
                        Roles & Access
                    </v-tab>
                </v-tabs>

                <v-divider />

                <v-tabs-window v-model="activeTab">
                    <!-- ==================== USERS TAB ==================== -->
                    <v-tabs-window-item value="users">
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
                                <template v-slot:item.role="{ item }">
                                    <v-chip :color="getAccessRoleColor(item.role)" size="small" label>
                                        <v-icon start size="14">{{ getAccessRoleIcon(item.role) }}</v-icon>
                                        {{ (item.role || 'user').toUpperCase() }}
                                    </v-chip>
                                </template>
                                <template v-slot:item.is_active="{ item }">
                                    <div class="d-flex justify-center align-center">
                                        <v-switch :model-value="item.is_active" :loading="togglingUserId === item.id"
                                            :disabled="togglingUserId === item.id" color="success" hide-details
                                            density="compact" @update:model-value="toggleUserStatus(item)">
                                            <template v-slot:label>
                                                <span class="text-caption"
                                                    :class="item.is_active ? 'text-success' : 'text-error'">
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
                    </v-tabs-window-item>

                    <!-- ==================== ROLES & ACCESS TAB ==================== -->
                    <v-tabs-window-item v-if="authStore.isSuperAdmin" value="roles">
                        <!-- Loading -->
                        <v-card-text v-if="acLoading && acUsers.length === 0" class="text-center py-8">
                            <v-progress-circular indeterminate color="primary" size="48" />
                            <p class="mt-4 text-medium-emphasis">Loading access control data...</p>
                        </v-card-text>

                        <!-- Content -->
                        <template v-else>
                            <v-card-title class="d-flex align-center">
                                <v-icon class="mr-2">mdi-shield-account</v-icon>
                                User Access Management
                                <v-spacer />
                                <v-text-field v-model="acSearch" density="compact" label="Search users"
                                    prepend-inner-icon="mdi-magnify" variant="outlined" hide-details
                                    style="max-width: 300px" />
                            </v-card-title>

                            <v-card-text>
                                <v-data-table :headers="acHeaders" :items="acUsers" :search="acSearch"
                                    :loading="acLoading" :items-per-page="15" hover>
                                    <!-- Username column -->
                                    <template #item.username="{ item }">
                                        <div class="d-flex align-center">
                                            <v-avatar size="32" class="mr-2"
                                                :color="getAccessRoleColor(item.role)">
                                                <v-icon size="18" color="white">{{ getAccessRoleIcon(item.role)
                                                    }}</v-icon>
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
                                        <v-chip :color="getAccessRoleColor(item.role)" size="small" label>
                                            <v-icon start size="14">{{ getAccessRoleIcon(item.role) }}</v-icon>
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
                                        <span v-else-if="item.role === 'guest'"
                                            class="text-caption text-medium-emphasis">
                                            Guest (Limited)
                                        </span>
                                        <span v-else-if="!item.menu_permissions"
                                            class="text-caption text-medium-emphasis">
                                            Not configured
                                        </span>
                                        <span v-else class="text-caption">
                                            {{ Object.keys(item.menu_permissions).length }} resources
                                        </span>
                                    </template>

                                    <!-- Last Login column -->
                                    <template #item.last_login="{ item }">
                                        <span v-if="item.last_login" class="text-caption">
                                            {{ formatDateFull(item.last_login) }}
                                        </span>
                                        <span v-else class="text-caption text-medium-emphasis">Never</span>
                                    </template>

                                    <!-- Actions column -->
                                    <template #item.actions="{ item }">
                                        <v-btn v-if="item.role !== 'developer'" icon size="small" variant="text"
                                            @click="openAccessEditDialog(item)">
                                            <v-icon size="18">mdi-pencil</v-icon>
                                            <v-tooltip activator="parent" location="top">Edit Role</v-tooltip>
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
                            </v-card-text>
                        </template>
                    </v-tabs-window-item>
                </v-tabs-window>
            </v-card>

            <!-- User Details Dialog -->
            <v-dialog v-model="detailsDialog" max-width="800px">
                <v-card v-if="selectedUser" class="app-dialog">
                    <div class="app-dialog-header"><v-card-title class="d-flex justify-space-between align-center">
                        <span class="text-h5">User Details: {{ selectedUser.username }}</span>
                        <v-btn icon="mdi-close" variant="text" color="primary" @click="detailsDialog = false" />
                    </v-card-title></div>
                    <div class="app-dialog-body"><v-card-text class="pa-6">
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
                                            <v-col cols="8" class="font-weight-medium">{{ selectedUser.username
                                                }}</v-col>
                                            <v-col cols="4" class="text-medium-emphasis">Email:</v-col>
                                            <v-col cols="8">{{ selectedUser.email || 'No email' }}</v-col>
                                            <v-col cols="4" class="text-medium-emphasis">Status:</v-col>
                                            <v-col cols="8">
                                                <v-chip :color="selectedUser.is_active ? 'success' : 'error'"
                                                    size="small">
                                                    {{ selectedUser.is_active ? 'Active' : 'Inactive' }}
                                                </v-chip>
                                            </v-col>
                                            <v-col cols="4" class="text-medium-emphasis">Role:</v-col>
                                            <v-col cols="8">
                                                <v-chip :color="getAccessRoleColor(selectedUser.role)" size="small"
                                                    label>
                                                    <v-icon start size="14">{{ getAccessRoleIcon(selectedUser.role)
                                                        }}</v-icon>
                                                    {{ (selectedUser.role || 'user').toUpperCase() }}
                                                </v-chip>
                                            </v-col>
                                        </v-row>
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
                    </v-card-text></div>
                    <div class="app-dialog-footer"><v-card-actions>
                        <v-spacer />
                        <v-btn @click="detailsDialog = false">Close</v-btn>
                        <v-btn color="primary" prepend-icon="mdi-pencil" @click="editUserFromDetails">
                            Edit
                        </v-btn>
                    </v-card-actions></div>
                </v-card>
            </v-dialog>

            <!-- Delete Confirmation Dialog -->
            <v-dialog v-model="deleteDialog" max-width="500px" persistent>
                <v-card class="app-dialog">
                    <div class="app-dialog-header"><v-card-title class="text-h5">
                        <v-icon start>mdi-alert</v-icon>
                        Confirm Delete
                    </v-card-title></div>
                    <div class="app-dialog-body"><v-card-text class="pt-4">
                        <div class="mb-4">
                            <p class="text-body-1 mb-2">
                                You are about to delete this user:
                            </p>
                            <v-card variant="outlined" class="mb-4">
                                <v-card-text>
                                    <div><strong>Username:</strong> {{ userToDelete?.username || 'N/A' }}</div>
                                    <div><strong>Email:</strong> {{ userToDelete?.email || 'N/A' }}</div>
                                    <div><strong>Role:</strong> {{ userToDelete?.role || 'user' }}</div>
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
                    </v-card-text></div>
                    <div class="app-dialog-footer"><v-card-actions>
                        <v-spacer />
                        <v-btn color="default" variant="tonal" @click="cancelDelete" :disabled="deleting">
                            Cancel
                        </v-btn>
                        <v-btn color="error" variant="flat" @click="handleDeleteUser"
                            :disabled="deleteConfirmation !== 'DELETE' || deleting" :loading="deleting">
                            Delete User
                        </v-btn>
                    </v-card-actions></div>
                </v-card>
            </v-dialog>

            <!-- Create/Edit User Dialog -->
            <v-dialog v-model="dialog" max-width="600px">
                <v-card class="app-dialog">
                    <div class="app-dialog-header"><v-card-title>
                        <span class="text-h5">{{ editMode ? 'Edit User' : 'Create User' }}</span>
                    </v-card-title></div>
                    <div class="app-dialog-body"><v-card-text>
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
                            <v-select v-model="currentUser.role" :items="userRoleOptions" label="Role" variant="outlined"
                                class="mb-3" />
                            <v-switch v-model="currentUser.is_active" label="Active Account" color="success" />
                        </v-form>
                    </v-card-text></div>
                    <div class="app-dialog-footer"><v-card-actions>
                        <v-spacer />
                        <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
                        <v-btn color="primary" variant="flat" @click="saveUser" :loading="loading">
                            Save
                        </v-btn>
                    </v-card-actions></div>
                </v-card>
            </v-dialog>

            <!-- Edit Role/Status Dialog (Access Control) -->
            <v-dialog v-model="acEditDialog" max-width="500" persistent>
                <v-card class="app-dialog">
                    <div class="app-dialog-header"><v-card-title class="d-flex align-center">
                        <v-icon class="mr-2">mdi-account-cog</v-icon>
                        Edit Access: {{ acEditingUser?.username }}
                    </v-card-title></div>

                    <div class="app-dialog-body"><v-card-text>
                        <v-select v-model="acEditForm.role" :items="acAvailableRoles" label="Role" variant="outlined"
                            :disabled="!authStore.isDeveloper && acEditForm.role === 'superadmin'"
                            hint="Only developers can grant superadmin role" persistent-hint />

                        <v-switch v-model="acEditForm.is_active" label="Active" color="success" class="mt-2" />

                        <v-switch v-model="acEditForm.is_ptb_admin" label="PTB Admin" color="info"
                            hint="Synced from external API on login" persistent-hint />
                    </v-card-text></div>

                    <div class="app-dialog-footer"><v-card-actions>
                        <v-spacer />
                        <v-btn variant="text" @click="acEditDialog = false">Cancel</v-btn>
                        <v-btn color="primary" :loading="acSaving" @click="saveUserAccess">Save</v-btn>
                    </v-card-actions></div>
                </v-card>
            </v-dialog>

            <!-- Menu Permissions Dialog (Access Control) -->
            <v-dialog v-model="permissionsDialog" max-width="900" persistent>
                <v-card class="app-dialog">
                    <div class="app-dialog-header"><v-card-title class="d-flex align-center">
                        <v-icon class="mr-2">mdi-shield-key</v-icon>
                        Menu Permissions: {{ permissionsUser?.username }}
                    </v-card-title>

                    <v-card-subtitle>
                        Configure which resources and actions this user can access. Check the boxes to grant specific
                        CRUD permissions for each resource.
                    </v-card-subtitle></div>

                    <div class="app-dialog-body"><v-card-text>
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
                                    <th v-for="action in acAvailableActions" :key="action" class="text-center">
                                        {{ action.charAt(0).toUpperCase() + action.slice(1) }}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="resource in acAvailableResources" :key="resource">
                                    <td>
                                        <v-icon size="16" class="mr-1">{{ getResourceIcon(resource) }}</v-icon>
                                        {{ formatResourceName(resource) }}
                                    </td>
                                    <td v-for="action in acAvailableActions" :key="action" class="text-center">
                                        <v-checkbox :model-value="hasPermission(resource, action)" density="compact"
                                            hide-details class="d-inline-flex"
                                            @update:model-value="togglePermission(resource, action, $event)" />
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </v-card-text></div>

                    <div class="app-dialog-footer"><v-card-actions>
                        <v-spacer />
                        <v-btn variant="text" @click="permissionsDialog = false">Cancel</v-btn>
                        <v-btn color="primary" :loading="acSaving" @click="savePermissions">Save Permissions</v-btn>
                    </v-card-actions></div>
                </v-card>
            </v-dialog>
        </v-container>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
import { getApiErrorDetail, getErrorStatus } from '@/shared/utils'
import {
  type AccessControlUser,
  adminApi,
  type CreateUserRequest,
  type UpdateUserRequest,
  type User,
  type UserStats,
} from '../api/admin.api'

// Router for logout redirect
const router = useRouter()
const authStore = useAuthStore()

// ============================================================================
// Shared State
// ============================================================================

const activeTab = useTabPersistence<'users' | 'roles'>('tab', 'users')
const error = ref('')
const success = ref('')

// ============================================================================
// Users Tab State
// ============================================================================

const loading = ref(false)
const search = ref('')
const dialog = ref(false)
const editMode = ref(false)
const form = ref()

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
  role: 'user',
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

// Role options for user create/edit dialog
const userRoleOptions = [
  { title: 'Guest', value: 'guest' },
  { title: 'User', value: 'user' },
  { title: 'Admin', value: 'admin' },
  { title: 'Super Admin', value: 'superadmin' },
]

const headers = [
  { title: 'User', key: 'username' },
  { title: 'Role', key: 'role', sortable: true },
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

// ============================================================================
// Access Control (Roles) Tab State
// ============================================================================

const acLoading = ref(false)
const acSaving = ref(false)
const acSearch = ref('')

const acUsers = ref<AccessControlUser[]>([])
const acAvailableResources = ref<string[]>([])
const acAvailableActions = ref<string[]>([])
const acDefaultPermissions = ref<Record<string, string[]>>({})

// Edit dialog state
const acEditDialog = ref(false)
const acEditingUser = ref<AccessControlUser | null>(null)
const acEditForm = ref({
  role: 'user' as string,
  is_active: true,
  is_ptb_admin: false,
})

// Permissions dialog state
const permissionsDialog = ref(false)
const permissionsUser = ref<AccessControlUser | null>(null)
const permissionsForm = ref<Record<string, string[]>>({})

// Table headers for access control tab
const acHeaders = [
  { title: 'User', key: 'username', sortable: true },
  { title: 'Role', key: 'role', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Flags', key: 'flags', sortable: false },
  { title: 'Permissions', key: 'menu_permissions', sortable: false },
  { title: 'Last Login', key: 'last_login', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const },
]

// Available roles for the dropdown (developer cannot be assigned via UI)
const acAvailableRoles = [
  { title: 'Guest', value: 'guest' },
  { title: 'User', value: 'user' },
  { title: 'Admin', value: 'admin' },
  { title: 'Super Admin', value: 'superadmin' },
]

// ============================================================================
// Users Tab Methods
// ============================================================================

async function loadUsers() {
  loading.value = true
  try {
    const response = await adminApi.getUsers()
    users.value = response.users
    stats.value = response.stats
  } catch (err: unknown) {
    console.error('[UserManagement] Failed to load users:', err)
    error.value = getApiErrorDetail(err, 'Failed to load users')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editMode.value = false
  currentUser.value = {
    username: '',
    email: '',
    role: 'user',
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
    cancelDelete()
    await loadUsers()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to delete user')
  } finally {
    deleting.value = false
  }
}

async function toggleUserStatus(user: User) {
  if (togglingUserId.value !== null) return

  const newStatus = !user.is_active
  const action = newStatus ? 'activate' : 'deactivate'

  // Prevent self-deactivation
  if (!newStatus && loggedInUser.value && user.id === loggedInUser.value.id) {
    error.value = 'Cannot deactivate your own account'
    return
  }

  togglingUserId.value = user.id
  error.value = ''

  try {
    const updateData: UpdateUserRequest = { is_active: newStatus }
    await adminApi.updateUser(user.id, updateData)
    user.is_active = newStatus
    success.value = `User "${user.username}" ${action}d successfully`

    if (!newStatus && loggedInUser.value && user.id === loggedInUser.value.id) {
      setTimeout(async () => {
        await authStore.logout()
        router.push('/login')
      }, 1500)
    }
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, `Failed to ${action} user`)
    await loadUsers()
  } finally {
    togglingUserId.value = null
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
      const updateData: UpdateUserRequest = {
        email: currentUser.value.email,
        role: currentUser.value.role,
        is_active: currentUser.value.is_active,
      }

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
      const createData: CreateUserRequest = {
        // biome-ignore lint/style/noNonNullAssertion: validated as required before submission
        username: currentUser.value.username!,
        email: currentUser.value.email,
        // biome-ignore lint/style/noNonNullAssertion: validated as required before submission
        password: currentUser.value.password!,
        role: currentUser.value.role,
        is_active: currentUser.value.is_active,
      }

      await adminApi.createUser(createData)
      success.value = 'User created successfully'
    }

    dialog.value = false
    await loadUsers()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to save user')
  } finally {
    loading.value = false
  }
}

// ============================================================================
// Access Control (Roles) Tab Methods
// ============================================================================

async function loadAccessControlData() {
  acLoading.value = true
  error.value = ''

  try {
    const [usersResponse, resourcesResponse] = await Promise.all([
      adminApi.getAccessControlUsers(),
      adminApi.getMenuResources(),
    ])

    acUsers.value = usersResponse.users
    acAvailableResources.value = resourcesResponse.resources
    acAvailableActions.value = resourcesResponse.actions
    acDefaultPermissions.value = resourcesResponse.default_permissions
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to load access control data')
  } finally {
    acLoading.value = false
  }
}

function openAccessEditDialog(user: AccessControlUser) {
  acEditingUser.value = user
  acEditForm.value = {
    role: user.role,
    is_active: user.is_active,
    is_ptb_admin: user.is_ptb_admin,
  }
  acEditDialog.value = true
}

async function saveUserAccess() {
  if (!acEditingUser.value) return

  acSaving.value = true
  error.value = ''

  try {
    await adminApi.updateUserAccess(acEditingUser.value.id, {
      role: acEditForm.value.role,
      is_active: acEditForm.value.is_active,
      is_ptb_admin: acEditForm.value.is_ptb_admin,
    })

    success.value = `Access settings updated for ${acEditingUser.value.username}`
    acEditDialog.value = false
    await loadAccessControlData()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to update access settings')
  } finally {
    acSaving.value = false
  }
}

function openPermissionsDialog(user: AccessControlUser) {
  permissionsUser.value = user
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
    if (permissionsForm.value[resource].length === 0) {
      delete permissionsForm.value[resource]
    }
  }
}

function selectAllPermissions() {
  const allPerms: Record<string, string[]> = {}
  for (const resource of acAvailableResources.value) {
    allPerms[resource] = [...acAvailableActions.value]
  }
  permissionsForm.value = allPerms
}

function clearAllPermissions() {
  permissionsForm.value = {}
}

function applyDefaultPermissions() {
  permissionsForm.value = JSON.parse(JSON.stringify(acDefaultPermissions.value))
}

async function savePermissions() {
  if (!permissionsUser.value) return

  acSaving.value = true
  error.value = ''

  try {
    await adminApi.updateUserAccess(permissionsUser.value.id, {
      menu_permissions: permissionsForm.value,
    })

    success.value = `Menu permissions updated for ${permissionsUser.value.username}`
    permissionsDialog.value = false
    await loadAccessControlData()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to update menu permissions')
  } finally {
    acSaving.value = false
  }
}

// ============================================================================
// Shared Helpers
// ============================================================================

function getAccessRoleColor(role: string): string {
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

function getAccessRoleIcon(role: string): string {
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

function formatDateFull(dateStr: string): string {
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

// Load access control data when switching to the Roles tab
watch(activeTab, (tab) => {
  if (tab === 'roles' && acUsers.value.length === 0) {
    loadAccessControlData()
  }
})

onMounted(() => {
  loadUsers()
  // If starting on roles tab, load access control data too
  if (activeTab.value === 'roles' && authStore.isSuperAdmin) {
    loadAccessControlData()
  }
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
