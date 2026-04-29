<template>
  <DefaultLayout>
    <section class="rbac-management-page">
      <div class="rbac-management-header">
      <div class="rbac-management-header__copy">
        <div class="rbac-management-header__icon">
          <Icon icon="mdi:shield-account-outline" />
        </div>
        <div>
          <p class="rbac-management-header__eyebrow">Admin Control Center</p>
          <h1>Roles And Permissions</h1>
          <p>
            Manage the role catalog, reusable permissions, and detailed assignment visibility from
            one admin workspace.
          </p>
        </div>
      </div>

      <div class="rbac-management-header__actions">
        <button
          v-if="activeTab === 'roles'"
          type="button"
          class="rbac-management-button rbac-management-button--primary"
          @click="openCreateRoleDialog"
        >
          <Icon icon="mdi:shield-plus-outline" />
          <span>Add Role</span>
        </button>
        <button
          v-else
          type="button"
          class="rbac-management-button rbac-management-button--secondary"
          @click="openCreatePermissionDialog"
        >
          <Icon icon="mdi:lock-plus-outline" />
          <span>Add Permission</span>
        </button>
        <button
          type="button"
          class="rbac-management-button rbac-management-button--ghost"
          :disabled="loading"
          @click="loadData"
        >
          <Icon icon="mdi:refresh" />
          <span>{{ loading ? 'Refreshing...' : 'Refresh' }}</span>
        </button>
      </div>
    </div>

    <div v-if="error" class="rbac-management-notice rbac-management-notice--error">
      <div>
        <strong>Admin action failed</strong>
        <p>{{ error }}</p>
      </div>
      <button type="button" @click="error = ''">Dismiss</button>
    </div>

    <div v-if="success" class="rbac-management-notice rbac-management-notice--success">
      <div>
        <strong>Update complete</strong>
        <p>{{ success }}</p>
      </div>
      <button type="button" @click="success = ''">Dismiss</button>
    </div>

    <div class="rbac-management-stats-grid">
      <article class="rbac-management-stat-card">
        <span>Total Roles</span>
        <strong>{{ stats.total_roles }}</strong>
        <small>Reusable role records available across the platform.</small>
      </article>
      <article class="rbac-management-stat-card rbac-management-stat-card--success">
        <span>Total Permissions</span>
        <strong>{{ stats.total_permissions }}</strong>
        <small>Permission capabilities currently defined in the system.</small>
      </article>
      <article class="rbac-management-stat-card rbac-management-stat-card--cool">
        <span>Users With Roles</span>
        <strong>{{ stats.users_with_roles }}</strong>
        <small>Accounts already assigned to at least one active role.</small>
      </article>
      <article class="rbac-management-stat-card rbac-management-stat-card--warm">
        <span>Active Sessions</span>
        <strong>{{ stats.active_sessions }}</strong>
        <small>Current session activity tracked against authenticated users.</small>
      </article>
    </div>

    <AppTabs v-model="activeTab" :items="tabItems" scrollable>
        <template #panel-roles>
          <section class="rbac-management-tab-content">
            <section class="rbac-management-panel">
              <div class="rbac-management-panel__header rbac-management-panel__header--compact">
                <div>
                  <p class="rbac-management-panel__eyebrow">Role Directory</p>
                  <h2>Roles</h2>
                </div>

                <label class="rbac-management-search">
                  <Icon icon="mdi:magnify" />
                  <input
                    v-model="roleSearch"
                    type="search"
                    placeholder="Search by role, description, or permission"
                  >
                </label>
              </div>

              <AppDataGrid
                :columns="roleColumns"
                :rows="displayedRoles"
                :loading="loading"
                paginator
                :rowsPerPage="10"
                dataKey="id"
              >
                <template #cell-name="slotProps">
                  <button
                    type="button"
                    class="rbac-management-link-button"
                    @click="showRoleDetails(slotProps.data.id as number)"
                  >
                    {{ slotProps.data.name }}
                  </button>
                </template>

                <template #cell-description="slotProps">
                  {{ slotProps.data.description || 'No description' }}
                </template>

                <template #cell-permissions="slotProps">
                  <div class="rbac-management-chip-list">
                    <span
                      v-for="permissionName in getRolePermissionsPreview(slotProps.data.permissions as string[])"
                      :key="permissionName"
                      class="rbac-management-chip"
                    >
                      {{ permissionName }}
                    </span>
                    <span
                      v-if="getAdditionalRolePermissionCount(slotProps.data.permissions as string[]) > 0"
                      class="rbac-management-chip rbac-management-chip--muted"
                    >
                      +{{ getAdditionalRolePermissionCount(slotProps.data.permissions as string[]) }} more
                    </span>
                    <span
                      v-if="!(slotProps.data.permissions as string[] | undefined)?.length"
                      class="rbac-management-chip rbac-management-chip--muted"
                    >
                      None
                    </span>
                  </div>
                </template>

                <template #cell-users_count="slotProps">
                  <span class="rbac-management-badge rbac-management-badge--info">
                    {{ slotProps.data.users_count || 0 }} users
                  </span>
                </template>

                <template #cell-actions="slotProps">
                  <div class="rbac-management-actions">
                    <button
                      type="button"
                      title="View role details"
                      @click="showRoleDetails(slotProps.data.id as number)"
                    >
                      <Icon icon="mdi:card-account-details-outline" />
                    </button>
                    <button
                      type="button"
                      title="Edit role"
                      @click="handleEditRole(slotProps.data.id as number)"
                    >
                      <Icon icon="mdi:pencil-outline" />
                    </button>
                    <button
                      type="button"
                      class="is-danger"
                      title="Delete role"
                      :disabled="slotProps.data.name === 'admin'"
                      @click="confirmDeleteRole(slotProps.data as Role)"
                    >
                      <Icon icon="mdi:delete-outline" />
                    </button>
                  </div>
                </template>

                <template #empty>
                  <div class="rbac-management-empty-state">
                    <strong>No roles found.</strong>
                    <p>Adjust the search or create the first role.</p>
                  </div>
                </template>
              </AppDataGrid>

              <p v-if="shouldShowRoleResultLimit" class="rbac-management-footnote">
                Showing the first 50 matching roles. Refine the search for a narrower result set.
              </p>
            </section>
          </section>
        </template>

        <template #panel-permissions>
          <section class="rbac-management-tab-content">
            <section class="rbac-management-panel">
              <div class="rbac-management-panel__header rbac-management-panel__header--compact">
                <div>
                  <p class="rbac-management-panel__eyebrow">Permission Catalog</p>
                  <h2>Permissions</h2>
                </div>

                <label class="rbac-management-search">
                  <Icon icon="mdi:magnify" />
                  <input
                    v-model="permissionSearch"
                    type="search"
                    placeholder="Search by permission or description"
                  >
                </label>
              </div>

              <AppDataGrid
                :columns="permissionColumns"
                :rows="displayedPermissions"
                :loading="loading"
                paginator
                :rowsPerPage="10"
                dataKey="id"
              >
                <template #cell-name="slotProps">
                  <button
                    type="button"
                    class="rbac-management-link-button"
                    @click="showPermissionDetails(slotProps.data.id as number)"
                  >
                    {{ slotProps.data.name }}
                  </button>
                </template>

                <template #cell-description="slotProps">
                  {{ slotProps.data.description || 'No description' }}
                </template>

                <template #cell-actions="slotProps">
                  <div class="rbac-management-actions">
                    <button
                      type="button"
                      title="View permission details"
                      @click="showPermissionDetails(slotProps.data.id as number)"
                    >
                      <Icon icon="mdi:card-account-details-outline" />
                    </button>
                    <button
                      type="button"
                      title="Edit permission"
                      @click="handleEditPermission(slotProps.data.id as number)"
                    >
                      <Icon icon="mdi:pencil-outline" />
                    </button>
                    <button
                      type="button"
                      class="is-danger"
                      title="Delete permission"
                      @click="confirmDeletePermission(slotProps.data as Permission)"
                    >
                      <Icon icon="mdi:delete-outline" />
                    </button>
                  </div>
                </template>

                <template #empty>
                  <div class="rbac-management-empty-state">
                    <strong>No permissions found.</strong>
                    <p>Adjust the search or create the first permission.</p>
                  </div>
                </template>
              </AppDataGrid>

              <p v-if="shouldShowPermissionResultLimit" class="rbac-management-footnote">
                Showing the first 50 matching permissions. Refine the search for a narrower result set.
              </p>
            </section>
          </section>
        </template>
      </AppTabs>

    <AppDialog v-model:visible="roleDialogOpen" :title="roleDialogTitle" width="42rem">
      <form class="rbac-management-dialog-form" @submit.prevent="saveRole">
        <label class="rbac-management-field">
          <span>Role Name</span>
          <input v-model="roleForm.name" type="text" autocomplete="off" placeholder="data_analyst">
        </label>

        <label class="rbac-management-field">
          <span>Description</span>
          <textarea
            v-model="roleForm.description"
            rows="3"
            placeholder="Describe what this role can do"
          />
        </label>

        <div class="rbac-management-field">
          <span>Assigned Permissions</span>
          <div class="rbac-management-permission-picker">
            <label
              v-for="permissionItem in permissions"
              :key="permissionItem.id"
              class="rbac-management-permission-option"
              :class="isRolePermissionSelected(permissionItem.name) ? 'is-selected' : ''"
            >
              <input
                :checked="isRolePermissionSelected(permissionItem.name)"
                type="checkbox"
                @change="toggleRolePermission(permissionItem.name)"
              >
              <span>{{ permissionItem.name }}</span>
            </label>
          </div>
        </div>

        <div v-if="dialogError" class="rbac-management-dialog-error">
          {{ dialogError }}
        </div>

        <div class="rbac-management-dialog-footer">
          <button
            type="button"
            class="rbac-management-button rbac-management-button--ghost"
            @click="closeRoleDialog"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rbac-management-button rbac-management-button--primary"
            :disabled="dialogLoading"
          >
            {{ dialogLoading ? 'Saving...' : roleDialogSubmitLabel }}
          </button>
        </div>
      </form>
    </AppDialog>

    <AppDialog v-model:visible="permissionDialogOpen" :title="permissionDialogTitle" width="34rem">
      <form class="rbac-management-dialog-form" @submit.prevent="savePermission">
        <label class="rbac-management-field">
          <span>Permission Name</span>
          <input v-model="permissionForm.name" type="text" autocomplete="off" placeholder="read_reports">
        </label>

        <label class="rbac-management-field">
          <span>Description</span>
          <textarea
            v-model="permissionForm.description"
            rows="3"
            placeholder="Describe what this permission allows"
          />
        </label>

        <div v-if="dialogError" class="rbac-management-dialog-error">
          {{ dialogError }}
        </div>

        <div class="rbac-management-dialog-footer">
          <button
            type="button"
            class="rbac-management-button rbac-management-button--ghost"
            @click="closePermissionDialog"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rbac-management-button rbac-management-button--primary"
            :disabled="dialogLoading"
          >
            {{ dialogLoading ? 'Saving...' : permissionDialogSubmitLabel }}
          </button>
        </div>
      </form>
    </AppDialog>

    <AppDialog v-model:visible="roleDetailsDialogOpen" title="Role Details" width="48rem">
      <div v-if="selectedRoleDetails" class="rbac-management-detail-stack">
        <section class="rbac-management-detail-panel">
          <div class="rbac-management-detail-panel__header">
            <h3>{{ selectedRoleDetails.name }}</h3>
            <span class="rbac-management-badge rbac-management-badge--info">
              {{ selectedRoleDetails.users_count }} users
            </span>
          </div>
          <p>{{ selectedRoleDetails.description || 'No description provided.' }}</p>
        </section>

        <section class="rbac-management-detail-panel">
          <h3>Assigned Permissions</h3>
          <div class="rbac-management-chip-list">
            <span
              v-for="permissionName in selectedRoleDetails.permissions"
              :key="permissionName"
              class="rbac-management-chip"
            >
              {{ permissionName }}
            </span>
            <span
              v-if="selectedRoleDetails.permissions.length === 0"
              class="rbac-management-chip rbac-management-chip--muted"
            >
              No permissions assigned
            </span>
          </div>
        </section>

        <section class="rbac-management-detail-panel">
          <h3>Users With This Role</h3>
          <div class="rbac-management-user-list">
            <article
              v-for="user in selectedRoleDetails.users"
              :key="user.id"
              class="rbac-management-user-card"
            >
              <div>
                <strong>{{ user.username }}</strong>
                <small>{{ user.email || 'No email' }}</small>
              </div>
              <span
                class="rbac-management-badge"
                :class="user.is_active ? 'rbac-management-badge--success' : 'rbac-management-badge--danger'"
              >
                {{ user.is_active ? 'Active' : 'Inactive' }}
              </span>
            </article>
            <p v-if="selectedRoleDetails.users.length === 0" class="rbac-management-empty-copy">
              No users are assigned to this role.
            </p>
          </div>
        </section>

        <section v-if="selectedRoleDetails.created_at || selectedRoleDetails.updated_at" class="rbac-management-detail-panel">
          <h3>Metadata</h3>
          <dl class="rbac-management-meta-list">
            <div v-if="selectedRoleDetails.created_at">
              <dt>Created</dt>
              <dd>{{ formatDate(selectedRoleDetails.created_at) }}</dd>
            </div>
            <div v-if="selectedRoleDetails.updated_at">
              <dt>Updated</dt>
              <dd>{{ formatDate(selectedRoleDetails.updated_at) }}</dd>
            </div>
          </dl>
        </section>

        <div class="rbac-management-dialog-footer">
          <button
            type="button"
            class="rbac-management-button rbac-management-button--ghost"
            @click="roleDetailsDialogOpen = false"
          >
            Close
          </button>
          <button
            type="button"
            class="rbac-management-button rbac-management-button--primary"
            @click="editRoleFromDetails(selectedRoleDetails.id)"
          >
            Edit Role
          </button>
        </div>
      </div>
    </AppDialog>

    <AppDialog v-model:visible="permissionDetailsDialogOpen" title="Permission Details" width="42rem">
      <div v-if="selectedPermissionDetails" class="rbac-management-detail-stack">
        <section class="rbac-management-detail-panel">
          <div class="rbac-management-detail-panel__header">
            <h3>{{ selectedPermissionDetails.name }}</h3>
            <span class="rbac-management-badge rbac-management-badge--info">
              {{ selectedPermissionDetails.usage_count }} roles
            </span>
          </div>
          <p>{{ selectedPermissionDetails.description || 'No description provided.' }}</p>
        </section>

        <section class="rbac-management-detail-panel">
          <h3>Roles Using This Permission</h3>
          <div class="rbac-management-chip-list">
            <span
              v-for="roleName in selectedPermissionDetails.roles"
              :key="roleName"
              class="rbac-management-chip"
            >
              {{ roleName }}
            </span>
            <span
              v-if="selectedPermissionDetails.roles.length === 0"
              class="rbac-management-chip rbac-management-chip--muted"
            >
              Not assigned to any role
            </span>
          </div>
        </section>

        <div class="rbac-management-dialog-footer">
          <button
            type="button"
            class="rbac-management-button rbac-management-button--ghost"
            @click="permissionDetailsDialogOpen = false"
          >
            Close
          </button>
          <button
            type="button"
            class="rbac-management-button rbac-management-button--primary"
            @click="editPermissionFromDetails(selectedPermissionDetails.id)"
          >
            Edit Permission
          </button>
        </div>
      </div>
    </AppDialog>

    <AppDialog v-model:visible="deleteDialogOpen" :title="deleteDialogTitle" width="32rem">
      <div class="rbac-management-delete-stack">
        <div class="rbac-management-notice rbac-management-notice--warning rbac-management-notice--inline">
          <div>
            <strong>Destructive action</strong>
            <p>{{ deleteDialogMessage }}</p>
          </div>
        </div>

        <label class="rbac-management-field">
          <span>Type DELETE to confirm</span>
          <input
            v-model="deleteConfirmation"
            type="text"
            autocomplete="off"
            placeholder="DELETE"
            @keyup.enter="handleConfirmDelete"
          >
        </label>

        <div class="rbac-management-dialog-footer">
          <button
            type="button"
            class="rbac-management-button rbac-management-button--ghost"
            :disabled="deleting"
            @click="closeDeleteDialog"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rbac-management-button rbac-management-button--danger"
            :disabled="deleteConfirmation !== 'DELETE' || deleting"
            @click="handleConfirmDelete"
          >
            {{ deleting ? 'Deleting...' : deleteDialogActionLabel }}
          </button>
        </div>
      </div>
    </AppDialog>
    </section>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, reactive, ref } from 'vue'
import { queryKeys } from '@/core/query'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import AppDialog from '@/shared/ui/dialog/AppDialog.vue'
import AppTabs from '@/shared/ui/tabs/AppTabs.vue'
import { getApiErrorDetail, getErrorMessage } from '@/shared/utils'
import type { Permission, PermissionDetail, RBACStats, Role, RoleDetail } from '../api/admin.api'
import { adminApi } from '../api/admin.api'

type DialogMode = 'create' | 'edit'
type DeleteTarget = 'role' | 'permission' | null

const activeTab = useTabPersistence('tab', 'roles')
const tabItems = [
  { label: 'Roles', value: 'roles' },
  { label: 'Permissions', value: 'permissions' },
]

const error = ref('')
const success = ref('')

const roleSearch = ref('')
const permissionSearch = ref('')

const queryClient = useQueryClient()

const defaultStats: RBACStats = {
  total_roles: 0,
  total_permissions: 0,
  users_with_roles: 0,
  active_sessions: 0,
}

const rbacQuery = useQuery({
  queryKey: queryKeys.admin.rbac(),
  queryFn: async () => {
    const [rolesResponse, permissionsResponse] = await Promise.all([
      adminApi.getRoles(),
      adminApi.getPermissions(),
    ])

    return {
      roles: rolesResponse.roles || [],
      permissions: permissionsResponse.permissions || [],
      stats: rolesResponse.stats || defaultStats,
    }
  },
})

const loading = computed(() => rbacQuery.isFetching.value)
const roles = computed(() => rbacQuery.data.value?.roles ?? [])
const permissions = computed(() => rbacQuery.data.value?.permissions ?? [])
const stats = computed(() => rbacQuery.data.value?.stats ?? defaultStats)

const invalidateRbac = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.rbac() })
const createRoleMutation = useMutation({
  mutationFn: adminApi.createRole,
  onSuccess: invalidateRbac,
})
const updateRoleMutation = useMutation({
  mutationFn: ({ id, data }: { id: number; data: Parameters<typeof adminApi.updateRole>[1] }) =>
    adminApi.updateRole(id, data),
  onSuccess: invalidateRbac,
})
const deleteRoleMutation = useMutation({
  mutationFn: adminApi.deleteRole,
  onSuccess: invalidateRbac,
})
const createPermissionMutation = useMutation({
  mutationFn: adminApi.createPermission,
  onSuccess: invalidateRbac,
})
const updatePermissionMutation = useMutation({
  mutationFn: ({
    id,
    data,
  }: {
    id: number
    data: Parameters<typeof adminApi.updatePermission>[1]
  }) => adminApi.updatePermission(id, data),
  onSuccess: invalidateRbac,
})
const deletePermissionMutation = useMutation({
  mutationFn: adminApi.deletePermission,
  onSuccess: invalidateRbac,
})
const grantPermissionMutation = useMutation({
  mutationFn: ({ roleId, permissionId }: { roleId: number; permissionId: number }) =>
    adminApi.grantPermissionToRole(roleId, permissionId),
  onSuccess: invalidateRbac,
})

const roleDialogOpen = ref(false)
const permissionDialogOpen = ref(false)
const roleDialogMode = ref<DialogMode>('create')
const permissionDialogMode = ref<DialogMode>('create')
const dialogLoading = ref(false)
const dialogError = ref('')

const roleForm = reactive({
  id: 0,
  name: '',
  description: '',
  permissions: [] as string[],
})

const permissionForm = reactive({
  id: 0,
  name: '',
  description: '',
})

const roleDetailsDialogOpen = ref(false)
const permissionDetailsDialogOpen = ref(false)
const selectedRoleDetails = ref<RoleDetail | null>(null)
const selectedPermissionDetails = ref<PermissionDetail | null>(null)

const deleteDialogOpen = ref(false)
const deleteTarget = ref<DeleteTarget>(null)
const deleteRole = ref<Role | null>(null)
const deletePermission = ref<Permission | null>(null)
const deleteConfirmation = ref('')
const deleting = ref(false)

const roleColumns = [
  { field: 'name', header: 'Role Name' },
  { field: 'description', header: 'Description' },
  { field: 'permissions', header: 'Permissions', sortable: false },
  { field: 'users_count', header: 'Users' },
  { field: 'actions', header: 'Actions', sortable: false },
]

const permissionColumns = [
  { field: 'name', header: 'Permission Name' },
  { field: 'description', header: 'Description' },
  { field: 'actions', header: 'Actions', sortable: false },
]

const filteredRoles = computed(() => {
  const query = roleSearch.value.trim().toLowerCase()

  if (!query) {
    return roles.value
  }

  return roles.value.filter((role) => {
    return (
      role.name.toLowerCase().includes(query) ||
      role.description?.toLowerCase().includes(query) ||
      role.permissions?.some((permissionName) => permissionName.toLowerCase().includes(query))
    )
  })
})

const filteredPermissions = computed(() => {
  const query = permissionSearch.value.trim().toLowerCase()

  if (!query) {
    return permissions.value
  }

  return permissions.value.filter((permissionItem) => {
    return (
      permissionItem.name.toLowerCase().includes(query) ||
      permissionItem.description?.toLowerCase().includes(query)
    )
  })
})

const displayedRoles = computed(() => filteredRoles.value.slice(0, 50))
const displayedPermissions = computed(() => filteredPermissions.value.slice(0, 50))

const shouldShowRoleResultLimit = computed(() => filteredRoles.value.length > 50)
const shouldShowPermissionResultLimit = computed(() => filteredPermissions.value.length > 50)

const roleDialogTitle = computed(() => {
  return roleDialogMode.value === 'create' ? 'Create Role' : 'Edit Role'
})

const permissionDialogTitle = computed(() => {
  return permissionDialogMode.value === 'create' ? 'Create Permission' : 'Edit Permission'
})

const roleDialogSubmitLabel = computed(() => {
  return roleDialogMode.value === 'create' ? 'Create Role' : 'Save Changes'
})

const permissionDialogSubmitLabel = computed(() => {
  return permissionDialogMode.value === 'create' ? 'Create Permission' : 'Save Changes'
})

const deleteDialogTitle = computed(() => {
  return deleteTarget.value === 'role' ? 'Delete Role' : 'Delete Permission'
})

const deleteDialogActionLabel = computed(() => {
  return deleteTarget.value === 'role' ? 'Delete Role' : 'Delete Permission'
})

const deleteDialogMessage = computed(() => {
  if (deleteTarget.value === 'role') {
    return `Delete ${deleteRole.value?.name || 'this role'}? Users assigned to it will lose those permissions.`
  }

  return `Delete ${deletePermission.value?.name || 'this permission'}? Roles using it will be updated.`
})

async function loadData() {
  const result = await rbacQuery.refetch()
  if (result.error) {
    error.value =
      getApiErrorDetail(result.error) || getErrorMessage(result.error) || 'Failed to load RBAC data'
  }
}

function resetRoleForm() {
  roleForm.id = 0
  roleForm.name = ''
  roleForm.description = ''
  roleForm.permissions = []
}

function resetPermissionForm() {
  permissionForm.id = 0
  permissionForm.name = ''
  permissionForm.description = ''
}

function closeRoleDialog() {
  roleDialogOpen.value = false
  resetRoleForm()
  dialogError.value = ''
}

function closePermissionDialog() {
  permissionDialogOpen.value = false
  resetPermissionForm()
  dialogError.value = ''
}

function openCreateRoleDialog() {
  roleDialogMode.value = 'create'
  dialogError.value = ''
  resetRoleForm()
  roleDialogOpen.value = true
}

function openCreatePermissionDialog() {
  permissionDialogMode.value = 'create'
  dialogError.value = ''
  resetPermissionForm()
  permissionDialogOpen.value = true
}

function handleEditRole(id: number) {
  const role = roles.value.find((item) => item.id === id)
  if (!role) {
    error.value = 'Role not found'
    return
  }

  roleDialogMode.value = 'edit'
  dialogError.value = ''
  roleForm.id = role.id
  roleForm.name = role.name
  roleForm.description = role.description || ''
  roleForm.permissions = [...(role.permissions || [])]
  roleDialogOpen.value = true
}

function handleEditPermission(id: number) {
  const permissionItem = permissions.value.find((item) => item.id === id)
  if (!permissionItem) {
    error.value = 'Permission not found'
    return
  }

  permissionDialogMode.value = 'edit'
  dialogError.value = ''
  permissionForm.id = permissionItem.id
  permissionForm.name = permissionItem.name
  permissionForm.description = permissionItem.description || ''
  permissionDialogOpen.value = true
}

function isRolePermissionSelected(permissionName: string) {
  return roleForm.permissions.includes(permissionName)
}

function toggleRolePermission(permissionName: string) {
  if (isRolePermissionSelected(permissionName)) {
    roleForm.permissions = roleForm.permissions.filter((item) => item !== permissionName)
    return
  }

  roleForm.permissions = [...roleForm.permissions, permissionName]
}

async function saveRole() {
  if (!roleForm.name.trim()) {
    dialogError.value = 'Role name is required.'
    return
  }

  dialogLoading.value = true
  dialogError.value = ''

  try {
    if (roleDialogMode.value === 'create') {
      const createdRole = await createRoleMutation.mutateAsync({
        name: roleForm.name.trim(),
        description: roleForm.description.trim() || undefined,
      })

      if (roleForm.permissions.length > 0) {
        for (const permissionItem of permissions.value) {
          if (roleForm.permissions.includes(permissionItem.name)) {
            await grantPermissionMutation.mutateAsync({
              roleId: createdRole.id,
              permissionId: permissionItem.id,
            })
          }
        }
      }

      success.value = `Role "${roleForm.name.trim()}" created successfully`
    } else {
      await updateRoleMutation.mutateAsync({
        id: roleForm.id,
        data: {
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || '',
          permissions: [...roleForm.permissions],
        },
      })

      success.value = `Role "${roleForm.name.trim()}" updated successfully`
    }

    closeRoleDialog()
  } catch (err: unknown) {
    dialogError.value = getApiErrorDetail(err, 'Failed to save role')
  } finally {
    dialogLoading.value = false
  }
}

async function savePermission() {
  if (!permissionForm.name.trim()) {
    dialogError.value = 'Permission name is required.'
    return
  }

  dialogLoading.value = true
  dialogError.value = ''

  try {
    if (permissionDialogMode.value === 'create') {
      await createPermissionMutation.mutateAsync({
        name: permissionForm.name.trim(),
        description: permissionForm.description.trim() || undefined,
      })
      success.value = `Permission "${permissionForm.name.trim()}" created successfully`
    } else {
      await updatePermissionMutation.mutateAsync({
        id: permissionForm.id,
        data: {
          name: permissionForm.name.trim(),
          description: permissionForm.description.trim() || '',
        },
      })
      success.value = `Permission "${permissionForm.name.trim()}" updated successfully`
    }

    closePermissionDialog()
  } catch (err: unknown) {
    dialogError.value = getApiErrorDetail(err, 'Failed to save permission')
  } finally {
    dialogLoading.value = false
  }
}

async function showRoleDetails(id: number) {
  error.value = ''

  try {
    selectedRoleDetails.value = await queryClient.fetchQuery({
      queryKey: queryKeys.admin.roleDetail(id),
      queryFn: () => adminApi.getRoleDetails(id),
    })
    roleDetailsDialogOpen.value = true
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to load role details')
  }
}

async function showPermissionDetails(id: number) {
  error.value = ''

  try {
    selectedPermissionDetails.value = await queryClient.fetchQuery({
      queryKey: queryKeys.admin.permissionDetail(id),
      queryFn: () => adminApi.getPermissionDetails(id),
    })
    permissionDetailsDialogOpen.value = true
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to load permission details')
  }
}

function editRoleFromDetails(id: number) {
  roleDetailsDialogOpen.value = false
  handleEditRole(id)
}

function editPermissionFromDetails(id: number) {
  permissionDetailsDialogOpen.value = false
  handleEditPermission(id)
}

function confirmDeleteRole(role: Role) {
  deleteTarget.value = 'role'
  deleteRole.value = role
  deletePermission.value = null
  deleteConfirmation.value = ''
  deleteDialogOpen.value = true
}

function confirmDeletePermission(permissionItem: Permission) {
  deleteTarget.value = 'permission'
  deletePermission.value = permissionItem
  deleteRole.value = null
  deleteConfirmation.value = ''
  deleteDialogOpen.value = true
}

function closeDeleteDialog() {
  deleteDialogOpen.value = false
  deleteTarget.value = null
  deleteRole.value = null
  deletePermission.value = null
  deleteConfirmation.value = ''
}

async function handleConfirmDelete() {
  if (deleteConfirmation.value !== 'DELETE' || deleting.value) {
    return
  }

  deleting.value = true
  error.value = ''

  try {
    if (deleteTarget.value === 'role' && deleteRole.value) {
      await deleteRoleMutation.mutateAsync(deleteRole.value.id)
      success.value = `Role "${deleteRole.value.name}" deleted successfully`
    }

    if (deleteTarget.value === 'permission' && deletePermission.value) {
      await deletePermissionMutation.mutateAsync(deletePermission.value.id)
      success.value = `Permission "${deletePermission.value.name}" deleted successfully`
    }

    closeDeleteDialog()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to delete item')
  } finally {
    deleting.value = false
  }
}

function getRolePermissionsPreview(permissionNames: string[] | undefined) {
  return (permissionNames || []).slice(0, 3)
}

function getAdditionalRolePermissionCount(permissionNames: string[] | undefined) {
  return Math.max((permissionNames || []).length - 3, 0)
}

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleString()
  } catch {
    return dateString
  }
}
</script>

<style scoped>
.rbac-management-page {
  --rbac-accent: var(--app-accent);
  --rbac-accent-strong: var(--app-accent-strong);
  --rbac-accent-soft: var(--app-accent-soft);
  --rbac-accent-line: var(--app-ring);
  --rbac-info: var(--app-info);
  --rbac-info-soft: var(--app-info-soft);
  --rbac-info-line: var(--app-info-line);
  --rbac-success: var(--app-success);
  --rbac-success-soft: var(--app-success-soft);
  --rbac-success-line: var(--app-success-line);
  --rbac-warning: var(--app-warning);
  --rbac-warning-soft: var(--app-warning-soft);
  --rbac-warning-line: var(--app-warning-line);
  --rbac-danger: var(--app-danger);
  --rbac-danger-soft: var(--app-danger-soft);
  --rbac-danger-line: var(--app-danger-line);
}

.rbac-management-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.rbac-management-header__copy {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.rbac-management-header__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, var(--rbac-accent), var(--rbac-info));
  color: white;
  font-size: 1.45rem;
  box-shadow: 0 18px 32px var(--rbac-accent-soft);
}

.rbac-management-header__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0;
  text-transform: none;
  color: var(--rbac-accent);
  font-weight: 700;
}

.rbac-management-header h1 {
  margin: 0;
  font-size: clamp(1.8rem, 2.5vw, 2.35rem);
  color: var(--app-ink);
}

.rbac-management-header p:last-child {
  max-width: 45rem;
  margin: 0.45rem 0 0;
  color: var(--app-muted);
  line-height: 1.6;
}

.rbac-management-header__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.rbac-management-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.9rem;
  border: 1px solid transparent;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.rbac-management-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.rbac-management-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.rbac-management-button--primary {
  background: linear-gradient(135deg, var(--rbac-accent), var(--rbac-info));
  color: white;
  box-shadow: 0 18px 32px var(--rbac-accent-soft);
}

.rbac-management-button--secondary {
  background: linear-gradient(135deg, var(--rbac-accent), var(--rbac-accent-strong));
  color: white;
}

.rbac-management-button--ghost {
  background: var(--app-panel-strong);
  border-color: var(--app-border);
  color: var(--app-ink);
}

.rbac-management-button--danger {
  background: var(--rbac-danger-soft);
  border-color: var(--rbac-danger-line);
  color: var(--rbac-danger);
}

.rbac-management-notice {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem 1.1rem;
  border-radius: 1rem;
  border: 1px solid transparent;
  margin-bottom: 1rem;
}

.rbac-management-notice p {
  margin: 0.25rem 0 0;
}

.rbac-management-notice button {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.rbac-management-notice--inline {
  margin-bottom: 0;
}

.rbac-management-notice--error {
  background: var(--rbac-danger-soft);
  border-color: var(--rbac-danger-line);
  color: var(--rbac-danger);
}

.rbac-management-notice--success {
  background: var(--rbac-success-soft);
  border-color: var(--rbac-success-line);
  color: var(--rbac-success);
}

.rbac-management-notice--warning {
  background: var(--rbac-warning-soft);
  border-color: var(--rbac-warning-line);
  color: var(--rbac-warning);
}

.rbac-management-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.rbac-management-stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1.2rem;
  border-radius: 0.75rem;
  border: 1px solid var(--app-border);
  background: linear-gradient(180deg, var(--app-panel-strong), var(--app-panel));
  box-shadow: 0 16px 36px rgb(15 23 42 / 0.06);
}

.rbac-management-stat-card span {
  font-size: 0.8rem;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-muted);
  font-weight: 700;
}

.rbac-management-stat-card strong {
  font-size: 2rem;
  color: var(--app-ink);
}

.rbac-management-stat-card small {
  color: var(--app-muted);
  line-height: 1.5;
}

.rbac-management-stat-card--success {
  background: linear-gradient(180deg, var(--rbac-success-soft), var(--app-panel-strong));
}

.rbac-management-stat-card--cool {
  background: linear-gradient(180deg, var(--rbac-info-soft), var(--app-panel-strong));
}

.rbac-management-stat-card--warm {
  background: linear-gradient(180deg, var(--rbac-warning-soft), var(--app-panel-strong));
}

.rbac-management-tab-content {
  display: grid;
  gap: 1rem;
}

.rbac-management-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--app-border);
  border-radius: 1.25rem;
  background: linear-gradient(180deg, var(--app-panel-strong), var(--app-panel));
}

.rbac-management-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.rbac-management-panel__header--compact {
  flex-wrap: wrap;
}

.rbac-management-panel__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0;
  text-transform: none;
  color: var(--rbac-accent);
  font-weight: 700;
}

.rbac-management-panel h2 {
  margin: 0;
  color: var(--app-ink);
}

.rbac-management-search {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: min(100%, 24rem);
  padding: 0.75rem 0.95rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-panel-strong);
  color: var(--app-muted);
}

.rbac-management-search input {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  font: inherit;
  color: var(--app-ink);
}

.rbac-management-link-button {
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  color: var(--rbac-accent);
  font-weight: 700;
  cursor: pointer;
}

.rbac-management-link-button:hover {
  text-decoration: underline;
}

.rbac-management-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.rbac-management-chip,
.rbac-management-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.32rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.rbac-management-chip {
  background: var(--rbac-accent-soft);
  color: var(--rbac-accent);
}

.rbac-management-chip--muted {
  background: var(--app-canvas-strong);
  color: var(--app-muted);
}

.rbac-management-badge--info {
  background: var(--rbac-info-soft);
  color: var(--rbac-info);
}

.rbac-management-badge--success {
  background: var(--rbac-success-soft);
  color: var(--rbac-success);
}

.rbac-management-badge--danger {
  background: var(--rbac-danger-soft);
  color: var(--rbac-danger);
}

.rbac-management-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
}

.rbac-management-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  cursor: pointer;
}

.rbac-management-actions button.is-danger {
  background: var(--rbac-danger-soft);
  border-color: var(--rbac-danger-line);
  color: var(--rbac-danger);
}

.rbac-management-actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.rbac-management-empty-state {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--app-muted);
}

.rbac-management-empty-state p,
.rbac-management-footnote,
.rbac-management-empty-copy {
  margin: 0;
}

.rbac-management-footnote {
  color: var(--app-muted);
  font-size: 0.82rem;
}

.rbac-management-dialog-form,
.rbac-management-delete-stack,
.rbac-management-detail-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rbac-management-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.rbac-management-field span {
  font-weight: 600;
  color: var(--app-ink);
}

.rbac-management-field input,
.rbac-management-field textarea {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.9rem;
  padding: 0.78rem 0.95rem;
  font: inherit;
  color: var(--app-ink);
  background: var(--app-panel-strong);
}

.rbac-management-field input:focus,
.rbac-management-field textarea:focus {
  outline: none;
  border-color: var(--rbac-accent);
  box-shadow: 0 0 0 4px var(--rbac-accent-soft);
}

.rbac-management-field textarea {
  resize: vertical;
  min-height: 7.5rem;
}

.rbac-management-permission-picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  max-height: 18rem;
  overflow: auto;
  padding: 0.25rem;
}

.rbac-management-permission-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
  cursor: pointer;
}

.rbac-management-permission-option input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--rbac-accent);
}

.rbac-management-permission-option.is-selected {
  border-color: var(--rbac-accent-line);
  background: var(--rbac-accent-soft);
}

.rbac-management-dialog-error {
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  background: var(--rbac-danger-soft);
  border: 1px solid var(--rbac-danger-line);
  color: var(--rbac-danger);
}

.rbac-management-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.rbac-management-detail-panel {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
}

.rbac-management-detail-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.rbac-management-detail-panel h3 {
  margin: 0;
  color: var(--app-ink);
}

.rbac-management-detail-panel p {
  margin: 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.rbac-management-user-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rbac-management-user-card {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 0.9rem 1rem;
  border: 1px solid var(--app-border);
  border-radius: 0.95rem;
  background: var(--app-panel-strong);
}

.rbac-management-user-card strong,
.rbac-management-user-card small {
  display: block;
}

.rbac-management-user-card small {
  margin-top: 0.2rem;
  color: var(--app-muted);
}

.rbac-management-meta-list {
  display: grid;
  gap: 0.75rem;
  margin: 0;
}

.rbac-management-meta-list div {
  padding-top: 0.75rem;
  border-top: 1px solid var(--app-border);
}

.rbac-management-meta-list dt {
  margin-bottom: 0.2rem;
  font-size: 0.8rem;
  letter-spacing: 0;
  text-transform: none;
  color: var(--app-muted);
}

.rbac-management-meta-list dd {
  margin: 0;
  font-weight: 600;
  color: var(--app-ink);
}

@media (max-width: 1100px) {
  .rbac-management-permission-picker {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .rbac-management-header,
  .rbac-management-header__copy {
    flex-direction: column;
  }

  .rbac-management-header__actions,
  .rbac-management-dialog-footer {
    width: 100%;
  }

  .rbac-management-button {
    width: 100%;
  }

  .rbac-management-stats-grid {
    grid-template-columns: 1fr;
  }

  .rbac-management-pane {
    padding: 1rem;
  }

  .rbac-management-panel {
    padding: 1rem;
  }

  .rbac-management-actions {
    justify-content: flex-start;
  }

  .rbac-management-user-card,
  .rbac-management-detail-panel__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
