<template>
  <DefaultLayout>
    <section class="user-management-page">
    <div class="user-management-header mb-6">
      <div class="user-management-header__copy">
        <div class="user-management-header__icon">
          <Icon icon="mdi:account-group-outline" />
        </div>
        <div>
          <h1 class="text-h4 mb-2">User Management</h1>
          <p class="text-medium-emphasis mb-0">
            Manage account lifecycle, access roles, and menu permissions from one admin workspace.
          </p>
        </div>
      </div>

      <div class="user-management-header__actions">
        <button
          v-if="activeTab === 'users'"
          type="button"
          class="user-management-button user-management-button--primary"
          @click="openCreateDialog"
        >
          <Icon icon="mdi:account-plus-outline" />
          <span>Add User</span>
        </button>
        <button
          v-if="activeTab === 'roles'"
          type="button"
          class="user-management-button user-management-button--secondary"
          :disabled="acLoading"
          @click="loadAccessControlData"
        >
          <Icon icon="mdi:refresh" />
          <span>{{ acLoading ? 'Refreshing...' : 'Refresh Access Data' }}</span>
        </button>
      </div>
    </div>

    <div v-if="error" class="user-management-notice user-management-notice--error mb-4">
      <div>
        <strong>Admin action failed</strong>
        <p>{{ error }}</p>
      </div>
      <button type="button" @click="error = ''">Dismiss</button>
    </div>

    <div v-if="success" class="user-management-notice user-management-notice--success mb-4">
      <div>
        <strong>Update complete</strong>
        <p>{{ success }}</p>
      </div>
      <button type="button" @click="success = ''">Dismiss</button>
    </div>

    <AppTabs v-model="activeTab" :items="tabItems" scrollable>
        <template #panel-users>
          <div class="user-management-tab-content">
            <div class="user-management-stats-grid">
              <article class="user-management-stat-card">
                <span>Total Users</span>
                <strong>{{ stats.total_users }}</strong>
                <small>All accounts currently stored in the system.</small>
              </article>
              <article class="user-management-stat-card user-management-stat-card--success">
                <span>Active Users</span>
                <strong>{{ stats.active_users }}</strong>
                <small>Accounts that can still authenticate.</small>
              </article>
              <article class="user-management-stat-card user-management-stat-card--cool">
                <span>Online Now</span>
                <strong>{{ stats.online_users }}</strong>
                <small>Users with current recent session activity.</small>
              </article>
              <article class="user-management-stat-card user-management-stat-card--warm">
                <span>New This Month</span>
                <strong>{{ stats.new_users }}</strong>
                <small>Accounts created during the current month.</small>
              </article>
            </div>

            <section class="user-management-panel">
              <div class="user-management-panel__header user-management-panel__header--compact">
                <div>
                  <p class="user-management-panel__eyebrow">Directory</p>
                  <h2>User Accounts</h2>
                </div>

                <label class="user-management-search">
                  <Icon icon="mdi:magnify" />
                  <input v-model="search" type="search" placeholder="Search by username, email, or role">
                </label>
              </div>

              <AppDataGrid
                :columns="userColumns"
                :rows="filteredUsers"
                :loading="loading"
                paginator
                :rowsPerPage="10"
                dataKey="id"
              >
                <template #cell-username="slotProps">
                  <button
                    type="button"
                    class="user-management-user-cell"
                    @click="showUserDetails(slotProps.data as User)"
                  >
                    <span class="user-management-avatar">
                      {{ getInitial(String(slotProps.data.username || 'U')) }}
                    </span>
                    <span>
                      <strong>{{ slotProps.data.username }}</strong>
                      <small>{{ slotProps.data.email || 'No email' }}</small>
                    </span>
                  </button>
                </template>

                <template #cell-role="slotProps">
                  <span class="user-management-badge" :class="getRoleBadgeClass(String(slotProps.data.role || 'user'))">
                    {{ String(slotProps.data.role || 'user').toUpperCase() }}
                  </span>
                </template>

                <template #cell-is_active="slotProps">
                  <button
                    type="button"
                    class="user-management-status-toggle"
                    :class="slotProps.data.is_active ? 'is-active' : 'is-inactive'"
                    :disabled="togglingUserId === slotProps.data.id"
                    @click="toggleUserStatus(slotProps.data as User)"
                  >
                    {{ togglingUserId === slotProps.data.id ? 'Updating...' : slotProps.data.is_active ? 'Active' : 'Inactive' }}
                  </button>
                </template>

                <template #cell-last_login="slotProps">
                  {{ formatDate(slotProps.data.last_login as string | null) }}
                </template>

                <template #cell-actions="slotProps">
                  <div class="user-management-actions">
                    <button type="button" title="View details" @click="showUserDetails(slotProps.data as User)">
                      <Icon icon="mdi:card-account-details-outline" />
                    </button>
                    <button type="button" title="Edit user" @click="editUser(slotProps.data as User)">
                      <Icon icon="mdi:pencil-outline" />
                    </button>
                    <button type="button" title="Reset password" @click="openResetPasswordDialog(slotProps.data as User)">
                      <Icon icon="mdi:lock-reset" />
                    </button>
                    <button type="button" class="is-danger" title="Delete user" @click="confirmDelete(slotProps.data as User)">
                      <Icon icon="mdi:delete-outline" />
                    </button>
                  </div>
                </template>

                <template #empty>
                  <div class="user-management-empty-state">
                    <strong>No users found.</strong>
                    <p>Adjust the search or create a new account.</p>
                  </div>
                </template>
              </AppDataGrid>
            </section>
          </div>
        </template>

        <template #panel-roles>
          <section class="user-management-tab-content">
            <section class="user-management-panel">
              <div class="user-management-panel__header user-management-panel__header--compact">
                <div>
                  <p class="user-management-panel__eyebrow">Access Control</p>
                  <h2>Role And Permission Review</h2>
                </div>

                <label class="user-management-search">
                  <Icon icon="mdi:magnify" />
                  <input v-model="acSearch" type="search" placeholder="Search users, roles, or flags">
                </label>
              </div>

              <div v-if="acLoading && acUsers.length === 0" class="user-management-loading-state">
                <div class="user-management-loading-state__spinner" />
                <strong>Loading access-control data...</strong>
                <p>Fetching role, permission, and resource metadata.</p>
              </div>

              <AppDataGrid
                v-else
                :columns="accessColumns"
                :rows="filteredAcUsers"
                :loading="acLoading"
                paginator
                :rowsPerPage="15"
                dataKey="id"
              >
                <template #cell-username="slotProps">
                  <div class="user-management-user-inline">
                    <span class="user-management-avatar user-management-avatar--small">
                      {{ getInitial(String(slotProps.data.username || 'U')) }}
                    </span>
                    <span>
                      <strong>{{ slotProps.data.username }}</strong>
                      <small v-if="slotProps.data.email">{{ slotProps.data.email }}</small>
                    </span>
                  </div>
                </template>

                <template #cell-role="slotProps">
                  <span class="user-management-badge" :class="getRoleBadgeClass(String(slotProps.data.role || 'user'))">
                    {{ String(slotProps.data.role || 'user').toUpperCase() }}
                  </span>
                </template>

                <template #cell-is_active="slotProps">
                  <span class="user-management-badge" :class="slotProps.data.is_active ? 'user-management-badge--success' : 'user-management-badge--danger'">
                    {{ slotProps.data.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </template>

                <template #cell-flags="slotProps">
                  <div class="user-management-flag-list">
                    <span v-if="slotProps.data.is_ptb_admin" class="user-management-badge user-management-badge--info">PTB Admin</span>
                    <span v-if="slotProps.data.is_superuser" class="user-management-badge user-management-badge--purple">Superuser</span>
                    <span v-if="slotProps.data.is_staff" class="user-management-badge user-management-badge--teal">Staff</span>
                    <span v-if="slotProps.data.is_admin" class="user-management-badge user-management-badge--warning">Admin</span>
                    <span v-if="!hasAnyFlags(slotProps.data as AccessControlUser)" class="user-management-badge user-management-badge--muted">None</span>
                  </div>
                </template>

                <template #cell-menu_permissions="slotProps">
                  <span v-if="slotProps.data.role === 'developer'" class="user-management-inline-note user-management-inline-note--success">
                    Full access (Developer)
                  </span>
                  <span v-else-if="slotProps.data.role === 'superadmin'" class="user-management-inline-note user-management-inline-note--info">
                    Full access (Super Admin)
                  </span>
                  <span v-else-if="slotProps.data.role === 'admin'" class="user-management-inline-note user-management-inline-note--warning">
                    Admin access
                  </span>
                  <span v-else-if="slotProps.data.role === 'guest'" class="user-management-inline-note">
                    Guest (limited)
                  </span>
                  <span v-else-if="!slotProps.data.menu_permissions" class="user-management-inline-note">
                    Not configured
                  </span>
                  <span v-else class="user-management-inline-note">
                    {{ Object.keys(slotProps.data.menu_permissions).length }} resources
                  </span>
                </template>

                <template #cell-last_login="slotProps">
                  {{ formatDateFull(slotProps.data.last_login as string | null) }}
                </template>

                <template #cell-actions="slotProps">
                  <div class="user-management-actions">
                    <button
                      v-if="slotProps.data.role !== 'developer'"
                      type="button"
                      title="Edit access"
                      @click="openAccessEditDialog(slotProps.data as AccessControlUser)"
                    >
                      <Icon icon="mdi:account-cog-outline" />
                    </button>
                    <button
                      v-if="slotProps.data.role !== 'developer'"
                      type="button"
                      title="Menu permissions"
                      @click="openPermissionsDialog(slotProps.data as AccessControlUser)"
                    >
                      <Icon icon="mdi:shield-key-outline" />
                    </button>
                    <span v-if="slotProps.data.role === 'developer'" class="user-management-badge user-management-badge--muted">
                      Protected
                    </span>
                  </div>
                </template>

                <template #empty>
                  <div class="user-management-empty-state">
                    <strong>No access-control users found.</strong>
                    <p>Refresh the dataset or adjust the search.</p>
                  </div>
                </template>
              </AppDataGrid>
            </section>
          </section>
        </template>
      </AppTabs>

    <AppDialog
      v-model="detailsDialog"
      title="User Details"
      :description="selectedUser ? `Review the current profile for ${selectedUser.username}.` : ''"
      width="min(92vw, 48rem)"
    >
      <div v-if="selectedUser" class="user-management-dialog-grid">
        <section class="user-management-dialog-card">
          <p class="user-management-dialog-card__eyebrow">Basic</p>
          <div class="user-management-detail-list">
            <div><span>Username</span><strong>{{ selectedUser.username }}</strong></div>
            <div><span>Email</span><strong>{{ selectedUser.email || 'No email' }}</strong></div>
            <div><span>Status</span><strong>{{ selectedUser.is_active ? 'Active' : 'Inactive' }}</strong></div>
            <div><span>Role</span><strong>{{ String(selectedUser.role || 'user').toUpperCase() }}</strong></div>
          </div>
        </section>

        <section class="user-management-dialog-card">
          <p class="user-management-dialog-card__eyebrow">Activity</p>
          <div class="user-management-detail-list">
            <div><span>Last Login</span><strong>{{ formatDateFull(selectedUser.last_login) }}</strong></div>
            <div><span>Created</span><strong>{{ formatDateFull(selectedUser.created_at) }}</strong></div>
            <div><span>Updated</span><strong>{{ formatDateFull(selectedUser.updated_at) }}</strong></div>
          </div>
        </section>
      </div>
      <template #footer>
        <div class="user-management-dialog-footer">
          <button type="button" class="user-management-button user-management-button--ghost" @click="detailsDialog = false">
            Close
          </button>
          <button type="button" class="user-management-button user-management-button--primary" @click="editUserFromDetails">
            Edit User
          </button>
        </div>
      </template>
    </AppDialog>

    <AppDialog
      v-model="deleteDialog"
      title="Confirm User Deletion"
      description="This action permanently removes the selected user. Type DELETE to continue."
      persistent
      width="min(92vw, 32rem)"
    >
      <div class="user-management-dialog-stack">
        <div class="user-management-inline-warning">
          <strong>Target user</strong>
          <p>{{ userToDelete?.username || 'N/A' }} · {{ userToDelete?.email || 'No email' }} · {{ userToDelete?.role || 'user' }}</p>
        </div>

        <label class="user-management-field">
          <span>Type DELETE to confirm</span>
          <input v-model="deleteConfirmation" type="text" placeholder="DELETE" @keyup.enter="handleDeleteUser">
        </label>
      </div>
      <template #footer>
        <div class="user-management-dialog-footer">
          <button type="button" class="user-management-button user-management-button--ghost" :disabled="deleting" @click="cancelDelete">
            Cancel
          </button>
          <button
            type="button"
            class="user-management-button user-management-button--danger"
            :disabled="deleteConfirmation !== 'DELETE' || deleting"
            @click="handleDeleteUser"
          >
            {{ deleting ? 'Deleting...' : 'Delete User' }}
          </button>
        </div>
      </template>
    </AppDialog>

    <AppDialog
      v-model="dialog"
      :title="editMode ? 'Edit User' : 'Create User'"
      :description="editMode ? 'Update account identity, role, and active status.' : 'Create a new account for the system.'"
      width="min(92vw, 38rem)"
    >
      <div class="user-management-form-grid">
        <label class="user-management-field">
          <span>Username</span>
          <input v-model="currentUser.username" type="text" :disabled="editMode" placeholder="Username">
        </label>

        <label class="user-management-field">
          <span>Email</span>
          <input v-model="currentUser.email" type="email" placeholder="Email address">
        </label>

        <label class="user-management-field user-management-field--full">
          <span>{{ editMode ? 'New Password (Optional)' : 'Password' }}</span>
          <input v-model="currentUser.password" type="password" :placeholder="editMode ? 'Leave blank to keep the current password' : 'Set an initial password'">
        </label>

        <label class="user-management-field">
          <span>Role</span>
          <select v-model="currentUser.role">
            <option v-for="option in userRoleOptions" :key="option.value" :value="option.value">{{ option.title }}</option>
          </select>
        </label>

        <label class="user-management-toggle">
          <input v-model="currentUser.is_active" type="checkbox">
          <span>Active account</span>
        </label>
      </div>

      <template #footer>
        <div class="user-management-dialog-footer">
          <button type="button" class="user-management-button user-management-button--ghost" @click="dialog = false">
            Cancel
          </button>
          <button
            type="button"
            class="user-management-button user-management-button--primary"
            :disabled="!currentUserFormValid || loading"
            @click="saveUser"
          >
            {{ loading ? 'Saving...' : 'Save User' }}
          </button>
        </div>
      </template>
    </AppDialog>

    <AppDialog
      v-model="resetPasswordDialog"
      title="Reset Password"
      :description="passwordResetUser ? `Set a new password for ${passwordResetUser.username}.` : ''"
      width="min(92vw, 34rem)"
    >
      <div class="user-management-dialog-stack">
        <label class="user-management-field">
          <span>New Password</span>
          <input v-model="passwordResetForm.password" type="password" placeholder="Enter new password">
        </label>
        <label class="user-management-field">
          <span>Confirm Password</span>
          <input v-model="passwordResetForm.confirmPassword" type="password" placeholder="Confirm new password" @keyup.enter="submitPasswordReset">
        </label>
      </div>

      <template #footer>
        <div class="user-management-dialog-footer">
          <button type="button" class="user-management-button user-management-button--ghost" @click="closeResetPasswordDialog">
            Cancel
          </button>
          <button
            type="button"
            class="user-management-button user-management-button--primary"
            :disabled="!passwordResetValid || resettingPassword"
            @click="submitPasswordReset"
          >
            {{ resettingPassword ? 'Resetting...' : 'Reset Password' }}
          </button>
        </div>
      </template>
    </AppDialog>

    <AppDialog
      v-model="acEditDialog"
      title="Edit Access"
      :description="acEditingUser ? `Adjust the role and status for ${acEditingUser.username}.` : ''"
      width="min(92vw, 34rem)"
      persistent
    >
      <div class="user-management-form-grid">
        <label class="user-management-field">
          <span>Role</span>
          <select v-model="acEditForm.role">
            <option v-for="option in accessRoleOptions" :key="option.value" :value="option.value">{{ option.title }}</option>
          </select>
        </label>

        <label class="user-management-toggle">
          <input v-model="acEditForm.is_active" type="checkbox">
          <span>Active account</span>
        </label>

        <label class="user-management-toggle user-management-toggle--full">
          <input v-model="acEditForm.is_ptb_admin" type="checkbox">
          <span>PTB Admin</span>
        </label>
      </div>

      <template #footer>
        <div class="user-management-dialog-footer">
          <button type="button" class="user-management-button user-management-button--ghost" @click="acEditDialog = false">
            Cancel
          </button>
          <button type="button" class="user-management-button user-management-button--primary" :disabled="acSaving" @click="saveUserAccess">
            {{ acSaving ? 'Saving...' : 'Save Access' }}
          </button>
        </div>
      </template>
    </AppDialog>

    <AppDialog
      v-model="permissionsDialog"
      title="Menu Permissions"
      :description="permissionsUser ? `Configure resource permissions for ${permissionsUser.username}.` : ''"
      width="min(94vw, 56rem)"
      persistent
    >
      <div class="user-management-permissions-actions">
        <button type="button" class="user-management-button user-management-button--secondary" @click="selectAllPermissions">
          Select All
        </button>
        <button type="button" class="user-management-button user-management-button--secondary" @click="clearAllPermissions">
          Clear All
        </button>
        <button type="button" class="user-management-button user-management-button--secondary" @click="applyDefaultPermissions">
          Apply Defaults
        </button>
      </div>

      <div class="user-management-permissions-table-wrap">
        <DataTable :value="permissionMatrixRows" dataKey="resource" class="p-datatable-sm user-management-permissions-grid">
          <Column field="resource" header="Resource">
            <template #body="slotProps">
              <div class="user-management-resource-cell">
                <Icon :icon="getResourceIcon(slotProps.data.resource)" />
                <span>{{ formatResourceName(slotProps.data.resource) }}</span>
              </div>
            </template>
          </Column>
          <Column v-for="action in acAvailableActions" :key="action" :field="action" :header="capitalize(action)">
            <template #body="slotProps">
              <input
                class="user-management-permission-checkbox"
                :checked="hasPermission(slotProps.data.resource, action)"
                type="checkbox"
                @change="togglePermission(slotProps.data.resource, action, ($event.target as HTMLInputElement).checked)"
              >
            </template>
          </Column>
        </DataTable>
      </div>

      <template #footer>
        <div class="user-management-dialog-footer">
          <button type="button" class="user-management-button user-management-button--ghost" @click="permissionsDialog = false">
            Cancel
          </button>
          <button type="button" class="user-management-button user-management-button--primary" :disabled="acSaving" @click="savePermissions">
            {{ acSaving ? 'Saving...' : 'Save Permissions' }}
          </button>
        </div>
      </template>
    </AppDialog>
    </section>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AppDataGrid, AppDialog, AppTabs } from '@/shared'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
import { getApiErrorDetail } from '@/shared/utils'
import {
  type AccessControlUser,
  adminApi,
  type CreateUserRequest,
  type UpdateUserRequest,
  type User,
  type UserStats,
} from '../api/admin.api'

type UserDraft = Partial<User> & { password?: string }

const router = useRouter()
const authStore = useAuthStore()

const activeTab = useTabPersistence<'users' | 'roles'>('tab', 'users')
const error = ref('')
const success = ref('')

const loading = ref(false)
const search = ref('')
const dialog = ref(false)
const editMode = ref(false)

const detailsDialog = ref(false)
const selectedUser = ref<User | null>(null)

const stats = ref<UserStats>({
  total_users: 0,
  active_users: 0,
  online_users: 0,
  new_users: 0,
})

const users = ref<User[]>([])
const currentUser = ref<UserDraft>({
  username: '',
  email: '',
  role: 'user',
  is_active: true,
  password: '',
})

const deleteDialog = ref(false)
const userToDelete = ref<User | null>(null)
const deleteConfirmation = ref('')
const deleting = ref(false)
const togglingUserId = ref<number | null>(null)

const resetPasswordDialog = ref(false)
const passwordResetUser = ref<User | null>(null)
const resettingPassword = ref(false)
const passwordResetForm = ref({
  password: '',
  confirmPassword: '',
})

const acLoading = ref(false)
const acSaving = ref(false)
const acSearch = ref('')
const acUsers = ref<AccessControlUser[]>([])
const acAvailableResources = ref<string[]>([])
const acAvailableActions = ref<string[]>([])
const acDefaultPermissions = ref<Record<string, string[]>>({})

const acEditDialog = ref(false)
const acEditingUser = ref<AccessControlUser | null>(null)
const acEditForm = ref({
  role: 'user',
  is_active: true,
  is_ptb_admin: false,
})

const permissionsDialog = ref(false)
const permissionsUser = ref<AccessControlUser | null>(null)
const permissionsForm = ref<Record<string, string[]>>({})

const loggedInUser = computed(() => authStore.user)

const tabItems = computed(() => {
  const items = [{ value: 'users', label: 'Users', icon: 'mdi-account-group' }]
  if (authStore.isSuperAdmin) {
    items.push({ value: 'roles', label: 'Roles & Access', icon: 'mdi-shield-account' })
  }
  return items
})

const userRoleOptions = [
  { title: 'Guest', value: 'guest' },
  { title: 'User', value: 'user' },
  { title: 'Admin', value: 'admin' },
  { title: 'Super Admin', value: 'superadmin' },
]

const accessRoleOptions = computed(() => {
  const base = [
    { title: 'Guest', value: 'guest' },
    { title: 'User', value: 'user' },
    { title: 'Admin', value: 'admin' },
  ]

  if (authStore.isDeveloper) {
    base.push({ title: 'Super Admin', value: 'superadmin' })
  }

  return base
})

const userColumns = [
  { key: 'username', field: 'username', header: 'User', sortable: true },
  { key: 'role', field: 'role', header: 'Role', sortable: true },
  { key: 'is_active', field: 'is_active', header: 'Status', sortable: true },
  { key: 'last_login', field: 'last_login', header: 'Last Login', sortable: true },
  { key: 'actions', header: 'Actions', sortable: false },
]

const accessColumns = [
  { key: 'username', field: 'username', header: 'User', sortable: true },
  { key: 'role', field: 'role', header: 'Role', sortable: true },
  { key: 'is_active', field: 'is_active', header: 'Status', sortable: true },
  { key: 'flags', header: 'Flags', sortable: false },
  { key: 'menu_permissions', header: 'Permissions', sortable: false },
  { key: 'last_login', field: 'last_login', header: 'Last Login', sortable: true },
  { key: 'actions', header: 'Actions', sortable: false },
]

const filteredUsers = computed(() => {
  if (!search.value.trim()) {
    return users.value
  }

  const query = search.value.toLowerCase()
  return users.value.filter((user) => {
    const email = user.email?.toLowerCase() ?? ''
    return (
      user.username.toLowerCase().includes(query) ||
      email.includes(query) ||
      String(user.role || 'user').toLowerCase().includes(query)
    )
  })
})

const filteredAcUsers = computed(() => {
  if (!acSearch.value.trim()) {
    return acUsers.value
  }

  const query = acSearch.value.toLowerCase()
  return acUsers.value.filter((user) => {
    const email = user.email?.toLowerCase() ?? ''
    return (
      user.username.toLowerCase().includes(query) ||
      email.includes(query) ||
      user.role.toLowerCase().includes(query)
    )
  })
})

const permissionMatrixRows = computed(() => {
  return acAvailableResources.value.map((resource) => ({ resource }))
})

const currentUserFormValid = computed(() => {
  const username = currentUser.value.username?.trim() ?? ''
  const password = currentUser.value.password?.trim() ?? ''
  return Boolean(username) && (editMode.value ? true : Boolean(password))
})

const passwordResetValid = computed(() => {
  return (
    passwordResetForm.value.password.trim().length > 0 &&
    passwordResetForm.value.password === passwordResetForm.value.confirmPassword
  )
})

async function loadUsers() {
  loading.value = true
  try {
    const response = await adminApi.getUsers()
    users.value = response.users
    stats.value = response.stats
  } catch (err: unknown) {
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
  currentUser.value = {
    ...user,
    password: '',
  }
  dialog.value = true
}

function showUserDetails(user: User) {
  selectedUser.value = user
  detailsDialog.value = true
}

function editUserFromDetails() {
  if (!selectedUser.value) return
  detailsDialog.value = false
  editUser(selectedUser.value)
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
  if (!userToDelete.value || deleteConfirmation.value !== 'DELETE' || deleting.value) {
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
  const action = newStatus ? 'activated' : 'deactivated'

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
    success.value = `User "${user.username}" ${action} successfully`

    if (!newStatus && loggedInUser.value && user.id === loggedInUser.value.id) {
      setTimeout(async () => {
        await authStore.logout()
        router.push('/login')
      }, 1200)
    }
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, `Failed to ${action} user`)
    await loadUsers()
  } finally {
    togglingUserId.value = null
  }
}

async function saveUser() {
  try {
    loading.value = true
    error.value = ''

    if (editMode.value) {
      const updateData: UpdateUserRequest = {
        email: currentUser.value.email || null,
        role: currentUser.value.role,
        is_active: currentUser.value.is_active,
      }

      if (currentUser.value.password?.trim()) {
        updateData.password = currentUser.value.password
      }

      await adminApi.updateUser(currentUser.value.id as number, updateData)
      success.value = 'User updated successfully'
    } else {
      const createData: CreateUserRequest = {
        username: String(currentUser.value.username || ''),
        email: currentUser.value.email || null,
        password: String(currentUser.value.password || ''),
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

function openResetPasswordDialog(user: User) {
  passwordResetUser.value = user
  passwordResetForm.value = {
    password: '',
    confirmPassword: '',
  }
  resetPasswordDialog.value = true
}

function closeResetPasswordDialog() {
  resetPasswordDialog.value = false
  passwordResetUser.value = null
  passwordResetForm.value = {
    password: '',
    confirmPassword: '',
  }
}

async function submitPasswordReset() {
  if (!passwordResetUser.value || !passwordResetValid.value || resettingPassword.value) {
    return
  }

  resettingPassword.value = true
  try {
    await adminApi.changeUserPassword(passwordResetUser.value.id, passwordResetForm.value.password)
    success.value = `Password reset successfully for ${passwordResetUser.value.username}`
    closeResetPasswordDialog()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to reset password')
  } finally {
    resettingPassword.value = false
  }
}

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
    return
  }

  permissionsForm.value[resource] = permissionsForm.value[resource].filter((entry) => entry !== action)
  if (permissionsForm.value[resource].length === 0) {
    delete permissionsForm.value[resource]
  }
}

function selectAllPermissions() {
  const allPermissions: Record<string, string[]> = {}
  for (const resource of acAvailableResources.value) {
    allPermissions[resource] = [...acAvailableActions.value]
  }
  permissionsForm.value = allPermissions
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

function getRoleBadgeClass(role: string) {
  switch (role) {
    case 'developer':
      return 'user-management-badge--purple'
    case 'superadmin':
      return 'user-management-badge--warning'
    case 'admin':
      return 'user-management-badge--teal'
    case 'user':
      return 'user-management-badge--info'
    case 'guest':
      return 'user-management-badge--muted'
    default:
      return 'user-management-badge--muted'
  }
}

function getResourceIcon(resource: string): string {
  const icons: Record<string, string> = {
    dashboard: 'mdi:view-dashboard-outline',
    parsing: 'mdi:file-document-edit-outline',
    comparison: 'mdi:compare-horizontal',
    top_products: 'mdi:trophy-outline',
    dut_analysis: 'mdi:chart-line',
    dut_management: 'mdi:devices',
    activity: 'mdi:history',
    mastercontrol: 'mdi:factory',
    conversion: 'mdi:swap-horizontal',
    admin_users: 'mdi:account-group-outline',
    admin_rbac: 'mdi:shield-lock-outline',
    admin_cleanup: 'mdi:broom',
    admin_config: 'mdi:cog-outline',
    admin_menu_access: 'mdi:menu-open',
    admin_access_control: 'mdi:shield-account-outline',
  }
  return icons[resource] || 'mdi:circle-small'
}

function formatResourceName(resource: string): string {
  return resource
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
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

function formatDateFull(dateString: string | null): string {
  if (!dateString) return 'Never'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

function getInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || 'U'
}

function hasAnyFlags(user: AccessControlUser): boolean {
  return Boolean(user.is_ptb_admin || user.is_superuser || user.is_staff || user.is_admin)
}

watch(activeTab, (tab) => {
  if (tab === 'roles' && authStore.isSuperAdmin && acUsers.value.length === 0) {
    loadAccessControlData()
  }
})

onMounted(() => {
  if (!authStore.isSuperAdmin && activeTab.value === 'roles') {
    activeTab.value = 'users'
  }

  loadUsers()
  if (authStore.isSuperAdmin && activeTab.value === 'roles') {
    loadAccessControlData()
  }
})
</script>

<style scoped>
.user-management-page {
  --user-management-accent: var(--app-accent);
  --user-management-accent-soft: var(--app-accent-soft);
  --user-management-info: var(--app-info);
  --user-management-info-soft: var(--app-info-soft);
  --user-management-success: var(--app-success);
  --user-management-success-soft: var(--app-success-soft);
  --user-management-success-line: var(--app-success-line);
  --user-management-warning: var(--app-warning);
  --user-management-warning-soft: var(--app-warning-soft);
  --user-management-danger: var(--app-danger);
  --user-management-danger-soft: var(--app-danger-soft);
  --user-management-danger-line: var(--app-danger-line);
}

.user-management-header,
.user-management-header__copy,
.user-management-header__actions,
.user-management-notice,
.user-management-panel__header,
.user-management-dialog-footer,
.user-management-user-cell,
.user-management-user-inline,
.user-management-actions,
.user-management-permissions-actions,
.user-management-resource-cell {
  display: flex;
}

.user-management-header,
.user-management-panel__header,
.user-management-notice,
.user-management-dialog-footer {
  justify-content: space-between;
}

.user-management-header,
.user-management-header__copy,
.user-management-header__actions,
.user-management-notice,
.user-management-panel__header,
.user-management-dialog-footer,
.user-management-user-cell,
.user-management-user-inline,
.user-management-actions,
.user-management-permissions-actions,
.user-management-resource-cell {
  gap: 1rem;
  align-items: flex-start;
}

.user-management-header__icon {
  display: grid;
  place-items: center;
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 1.1rem;
  background: linear-gradient(135deg, var(--user-management-accent-soft), var(--user-management-warning-soft));
  color: var(--user-management-accent);
  box-shadow: var(--app-shadow-soft);
}

.user-management-header__icon :deep(svg) {
  width: 1.6rem;
  height: 1.6rem;
}

.user-management-header__actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.user-management-button,
.user-management-status-toggle,
.user-management-actions button {
  border: 0;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.user-management-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border-radius: 999px;
  padding: 0.9rem 1.25rem;
  font-weight: 700;
}

.user-management-button :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.user-management-button--primary {
  background: linear-gradient(135deg, var(--user-management-accent), var(--user-management-warning));
  color: white;
  box-shadow: 0 16px 28px var(--user-management-accent-soft);
}

.user-management-button--secondary,
.user-management-button--ghost {
  background: var(--app-panel-strong);
  color: var(--app-ink);
  border: 1px solid var(--app-border);
  box-shadow: var(--app-shadow-soft);
}

.user-management-button--danger {
  background: linear-gradient(135deg, var(--user-management-danger), var(--user-management-warning));
  color: white;
  box-shadow: 0 16px 28px var(--user-management-danger-soft);
}

.user-management-button:hover:not(:disabled),
.user-management-status-toggle:hover:not(:disabled),
.user-management-actions button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.user-management-button:disabled,
.user-management-status-toggle:disabled,
.user-management-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.user-management-notice,
.user-management-panel,
.user-management-stat-card,
.user-management-dialog-card,
.user-management-inline-warning,
.user-management-empty-state {
  border: 1px solid var(--app-border);
  border-radius: 1.35rem;
  background: var(--app-panel-strong);
  box-shadow: var(--app-shadow-soft);
}

.user-management-notice,
.user-management-panel,
.user-management-stat-card,
.user-management-dialog-card,
.user-management-inline-warning,
.user-management-empty-state {
  padding: 1rem 1.1rem;
}

.user-management-notice--error {
  background: var(--user-management-danger-soft);
  border-color: var(--user-management-danger-line);
}

.user-management-notice--success {
  background: var(--user-management-success-soft);
  border-color: var(--user-management-success-line);
}

.user-management-notice p,
.user-management-stat-card small,
.user-management-empty-state p,
.user-management-inline-warning p,
.user-management-user-cell small,
.user-management-user-inline small,
.user-management-inline-note,
.user-management-field small {
  color: var(--app-muted);
  line-height: 1.55;
}

.user-management-notice button {
  border: 0;
  background: transparent;
  color: var(--app-accent);
  cursor: pointer;
  font-weight: 700;
}

.user-management-tab-content,
.user-management-stats-grid,
.user-management-form-grid,
.user-management-dialog-grid,
.user-management-dialog-stack,
.user-management-detail-list,
.user-management-flag-list {
  display: grid;
  gap: 1rem;
}

.user-management-stats-grid {
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.user-management-stat-card {
  display: grid;
  gap: 0.35rem;
  background:
    radial-gradient(circle at top right, var(--user-management-accent-soft), transparent 34%),
    var(--app-panel-strong);
}

.user-management-stat-card--success {
  background:
    radial-gradient(circle at top right, var(--user-management-success-soft), transparent 34%),
    var(--app-panel-strong);
}

.user-management-stat-card--cool {
  background:
    radial-gradient(circle at top right, var(--user-management-info-soft), transparent 34%),
    var(--app-panel-strong);
}

.user-management-stat-card--warm {
  background:
    radial-gradient(circle at top right, var(--user-management-warning-soft), transparent 34%),
    var(--app-panel-strong);
}

.user-management-stat-card span,
.user-management-dialog-card__eyebrow,
.user-management-detail-list span,
.user-management-field > span {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-muted);
}

.user-management-stat-card strong {
  color: var(--app-ink);
  font-size: 1.9rem;
}

.user-management-panel {
  display: grid;
  gap: 1rem;
  background:
    radial-gradient(circle at top right, var(--user-management-accent-soft), transparent 34%),
    var(--app-panel-strong);
}

.user-management-panel__header--compact {
  align-items: center;
}

.user-management-panel__eyebrow {
  margin: 0;
  color: var(--app-accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.user-management-panel__header h2 {
  margin: 0.2rem 0 0;
  color: var(--app-ink);
  font-size: 1.1rem;
}

.user-management-search {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  min-width: min(100%, 20rem);
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-panel-strong);
  box-shadow: var(--app-shadow-soft);
  padding: 0.8rem 1rem;
}

.user-management-search input,
.user-management-field input,
.user-management-field select {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--app-ink);
}

.user-management-search input:focus,
.user-management-field input:focus,
.user-management-field select:focus {
  outline: none;
}

.user-management-user-cell,
.user-management-user-inline {
  border: 0;
  background: transparent;
  padding: 0;
  color: inherit;
  text-align: left;
}

.user-management-user-cell span,
.user-management-user-inline span {
  display: grid;
  gap: 0.2rem;
}

.user-management-user-cell strong,
.user-management-user-inline strong,
.user-management-detail-list strong,
.user-management-inline-warning strong,
.user-management-empty-state strong {
  color: var(--app-ink);
}

.user-management-avatar {
  display: grid;
  place-items: center;
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--user-management-accent-soft), var(--user-management-info-soft));
  color: var(--user-management-accent);
  font-weight: 700;
}

.user-management-avatar--small {
  width: 2rem;
  height: 2rem;
}

.user-management-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.28rem 0.65rem;
  background: var(--app-canvas-strong);
  color: var(--app-ink);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.user-management-badge--warning {
  background: var(--user-management-warning-soft);
}

.user-management-badge--info {
  background: var(--user-management-info-soft);
}

.user-management-badge--teal {
  background: var(--user-management-accent-soft);
}

.user-management-badge--purple {
  background: var(--user-management-info-soft);
}

.user-management-badge--success {
  background: var(--user-management-success-soft);
}

.user-management-badge--danger {
  background: var(--user-management-danger-soft);
}

.user-management-badge--muted {
  background: var(--app-canvas-strong);
  color: var(--app-muted);
}

.user-management-status-toggle {
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  font-weight: 700;
}

.user-management-status-toggle.is-active {
  background: var(--user-management-success-soft);
  color: var(--user-management-success);
}

.user-management-status-toggle.is-inactive {
  background: var(--user-management-danger-soft);
  color: var(--user-management-danger);
}

.user-management-actions {
  flex-wrap: wrap;
}

.user-management-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 999px;
  background: var(--app-panel-strong);
  color: var(--app-accent);
  border: 1px solid var(--app-border);
  box-shadow: var(--app-shadow-soft);
}

.user-management-actions button.is-danger {
  color: var(--user-management-danger);
}

.user-management-actions button :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.user-management-empty-state,
.user-management-loading-state {
  display: grid;
  place-items: center;
  gap: 0.6rem;
  min-height: 12rem;
}

.user-management-loading-state__spinner {
  width: 2.6rem;
  height: 2.6rem;
  border: 3px solid var(--user-management-accent-soft);
  border-top-color: var(--user-management-accent);
  border-radius: 999px;
  animation: user-management-spin 0.9s linear infinite;
}

.user-management-dialog-grid {
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

.user-management-dialog-card {
  display: grid;
  gap: 0.9rem;
}

.user-management-detail-list div {
  display: grid;
  gap: 0.25rem;
}

.user-management-dialog-stack,
.user-management-form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.user-management-dialog-stack {
  grid-template-columns: 1fr;
}

.user-management-field,
.user-management-toggle {
  display: grid;
  gap: 0.45rem;
}

.user-management-field,
.user-management-search,
.user-management-toggle,
.user-management-inline-warning,
.user-management-dialog-card {
  background: var(--app-panel-strong);
}

.user-management-field {
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  box-shadow: var(--app-shadow-soft);
  padding: 0.85rem 0.95rem;
}

.user-management-field--full,
.user-management-toggle--full {
  grid-column: 1 / -1;
}

.user-management-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  box-shadow: var(--app-shadow-soft);
  padding: 0.95rem 1rem;
  font-weight: 600;
  color: var(--app-ink);
}

.user-management-toggle input,
.user-management-permission-checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: var(--app-accent);
}

.user-management-inline-warning {
  display: grid;
  gap: 0.3rem;
}

.user-management-inline-note--success {
  color: var(--user-management-success);
}

.user-management-inline-note--info {
  color: var(--user-management-info);
}

.user-management-inline-note--warning {
  color: var(--user-management-warning);
}

.user-management-flag-list {
  grid-template-columns: repeat(auto-fit, minmax(5.5rem, max-content));
}

.user-management-permissions-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  background: var(--app-panel-strong);
  box-shadow: var(--app-shadow-soft);
}

.user-management-permissions-table {
  width: 100%;
  border-collapse: collapse;
}

.user-management-permissions-table th,
.user-management-permissions-table td {
  border-bottom: 1px solid var(--app-border);
  padding: 0.85rem 0.9rem;
  text-align: center;
}

.user-management-permissions-table th:first-child,
.user-management-permissions-table td:first-child {
  text-align: left;
}

.user-management-permissions-table th {
  background: var(--app-panel);
  color: var(--app-ink);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.user-management-resource-cell {
  gap: 0.55rem;
  align-items: center;
}

.user-management-resource-cell :deep(svg) {
  width: 1rem;
  height: 1rem;
  color: var(--app-accent);
}

@keyframes user-management-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 960px) {
  .user-management-header,
  .user-management-header__copy,
  .user-management-panel__header,
  .user-management-notice,
  .user-management-dialog-footer {
    flex-direction: column;
  }

  .user-management-header__actions {
    width: 100%;
    justify-content: stretch;
  }

  .user-management-button,
  .user-management-search {
    width: 100%;
  }

  .user-management-form-grid,
  .user-management-dialog-grid {
    grid-template-columns: 1fr;
  }
}
</style>