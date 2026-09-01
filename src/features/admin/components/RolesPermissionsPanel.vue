<template>
  <section class="rbac-management-page">
    <div v-if="error" class="rbac-management-notice rbac-management-notice--error" role="alert">
      <div class="rbac-management-notice__content">
        <Icon icon="mdi:alert-circle-outline" class="rbac-management-notice__icon" />
        <div>
          <strong>Admin action failed</strong>
          <p>{{ error }}</p>
        </div>
      </div>
      <button type="button" aria-label="Dismiss error notice" @click="error = ''">
        <Icon icon="mdi:close" />
      </button>
    </div>

    <div v-if="success" class="rbac-management-notice rbac-management-notice--success" role="status">
      <div class="rbac-management-notice__content">
        <Icon icon="mdi:check-circle-outline" class="rbac-management-notice__icon" />
        <div>
          <strong>Update complete</strong>
          <p>{{ success }}</p>
        </div>
      </div>
      <button type="button" aria-label="Dismiss success notice" @click="success = ''">
        <Icon icon="mdi:close" />
      </button>
    </div>

    <div class="rbac-management-toolbar">
      <div class="rbac-management-stats-grid">
        <article class="rbac-management-stat-card">
          <div class="rbac-management-stat-card__top">
            <span>Total Roles</span>
            <div class="rbac-management-stat-card__icon rbac-management-stat-card__icon--primary">
              <Icon icon="mdi:shield-outline" />
            </div>
          </div>
          <strong>{{ stats.total_roles }}</strong>
          <small>Role definitions in catalog</small>
        </article>

        <article class="rbac-management-stat-card">
          <div class="rbac-management-stat-card__top">
            <span>Total Permissions</span>
            <div class="rbac-management-stat-card__icon rbac-management-stat-card__icon--info">
              <Icon icon="mdi:lock-outline" />
            </div>
          </div>
          <strong>{{ stats.total_permissions }}</strong>
          <small>Defined action capabilities</small>
        </article>

        <article class="rbac-management-stat-card">
          <div class="rbac-management-stat-card__top">
            <span>Users With Roles</span>
            <div class="rbac-management-stat-card__icon rbac-management-stat-card__icon--success">
              <Icon icon="mdi:account-group-outline" />
            </div>
          </div>
          <strong>{{ stats.users_with_roles }}</strong>
          <small>Accounts assigned to a role</small>
        </article>

        <article class="rbac-management-stat-card">
          <div class="rbac-management-stat-card__top">
            <span>Active Sessions</span>
            <div class="rbac-management-stat-card__icon rbac-management-stat-card__icon--warning">
              <Icon icon="mdi:lan-connect" />
            </div>
          </div>
          <strong>{{ stats.active_sessions }}</strong>
          <small>Tracked user session activity</small>
        </article>
      </div>

      <div class="rbac-management-toolbar__actions">
        <button
          v-if="activeTab === 'roles'"
          type="button"
          class="rbac-management-button rbac-management-button--primary"
          @click="openCreateRoleDialog"
        >
          <Icon icon="mdi:shield-plus-outline" aria-hidden="true" />
          <span>Add Role</span>
        </button>
        <button
          v-else
          type="button"
          class="rbac-management-button rbac-management-button--primary"
          @click="openCreatePermissionDialog"
        >
          <Icon icon="mdi:lock-plus-outline" aria-hidden="true" />
          <span>Add Permission</span>
        </button>
        <button
          type="button"
          class="rbac-management-button rbac-management-button--ghost"
          :disabled="loading"
          @click="loadData"
        >
          <Icon :icon="loading ? 'mdi:loading' : 'mdi:refresh'" :class="{ 'animate-spin': loading }" aria-hidden="true" />
          <span>{{ loading ? 'Refreshing...' : 'Refresh' }}</span>
        </button>
      </div>
    </div>

    <AppTabs v-model="activeTab" :items="tabItems">
      <template #panel-roles>
        <section class="rbac-management-tab-content">
          <section class="rbac-management-panel">
            <div class="rbac-management-panel__header rbac-management-panel__header--compact">
              <div class="flex items-center gap-2.5">
                <div>
                  <p class="rbac-management-panel__eyebrow">Role Directory</p>
                  <h2>Roles</h2>
                </div>
                <span class="rbac-management-count-pill">{{ filteredRoles.length }} roles</span>
              </div>

              <div class="rbac-management-search">
                <Icon icon="mdi:magnify" class="rbac-management-search__icon" />
                <input
                  v-model="roleSearch"
                  type="search"
                  placeholder="Search by role, description, or permission..."
                >
                <button
                  v-if="roleSearch"
                  type="button"
                  class="rbac-management-search__clear"
                  aria-label="Clear role search"
                  @click="roleSearch = ''"
                >
                  <Icon icon="mdi:close-circle" />
                </button>
              </div>
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
                  class="rbac-management-link-button flex items-center gap-1.5"
                  @click="showRoleDetails(slotProps.data.id as number)"
                >
                  <Icon icon="mdi:shield-outline" class="text-[var(--app-accent)] text-base" />
                  <span>{{ slotProps.data.name }}</span>
                </button>
              </template>

              <template #cell-description="slotProps">
                <span class="text-[var(--app-muted)]">{{ slotProps.data.description || 'No description provided' }}</span>
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
                  <Icon icon="mdi:account-group-outline" class="mr-1" />
                  {{ slotProps.data.users_count || 0 }} users
                </span>
              </template>

              <template #cell-actions="slotProps">
                <div class="rbac-management-actions">
                  <button
                    type="button"
                    :aria-label="`View details for role ${slotProps.data.name}`"
                    title="View role details"
                    @click="showRoleDetails(slotProps.data.id as number)"
                  >
                    <Icon icon="mdi:card-account-details-outline" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    :aria-label="`Edit role ${slotProps.data.name}`"
                    title="Edit role definition"
                    @click="handleEditRole(slotProps.data.id as number)"
                  >
                    <Icon icon="mdi:pencil-outline" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="is-danger"
                    :aria-label="`Delete role ${slotProps.data.name}`"
                    :title="slotProps.data.name === 'admin' ? 'Default admin role cannot be deleted' : 'Delete role'"
                    :disabled="slotProps.data.name === 'admin'"
                    @click="confirmDeleteRole(slotProps.data as Role)"
                  >
                    <Icon icon="mdi:delete-outline" aria-hidden="true" />
                  </button>
                </div>
              </template>

              <template #empty>
                <div class="rbac-management-empty-state">
                  <div class="rbac-management-empty-state__icon">
                    <Icon icon="mdi:shield-search" />
                  </div>
                  <strong>No roles found</strong>
                  <p>Adjust search query or register a new role.</p>
                </div>
              </template>
            </AppDataGrid>

            <p v-if="shouldShowRoleResultLimit" class="rbac-management-footnote">
              Showing the first 50 matching roles. Refine search query for a narrower result set.
            </p>
          </section>
        </section>
      </template>

      <template #panel-permissions>
        <section class="rbac-management-tab-content">
          <section class="rbac-management-panel">
            <div class="rbac-management-panel__header rbac-management-panel__header--compact">
              <div class="flex items-center gap-2.5">
                <div>
                  <p class="rbac-management-panel__eyebrow">Permission Catalog</p>
                  <h2>Permissions</h2>
                </div>
                <span class="rbac-management-count-pill">{{ filteredPermissions.length }} permissions</span>
              </div>

              <div class="rbac-management-search">
                <Icon icon="mdi:magnify" class="rbac-management-search__icon" />
                <input
                  v-model="permissionSearch"
                  type="search"
                  placeholder="Search by permission or description..."
                >
                <button
                  v-if="permissionSearch"
                  type="button"
                  class="rbac-management-search__clear"
                  aria-label="Clear permission search"
                  @click="permissionSearch = ''"
                >
                  <Icon icon="mdi:close-circle" />
                </button>
              </div>
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
                  class="rbac-management-link-button flex items-center gap-1.5"
                  @click="showPermissionDetails(slotProps.data.id as number)"
                >
                  <Icon icon="mdi:key-outline" class="text-[var(--app-info)] text-base" />
                  <span>{{ slotProps.data.name }}</span>
                </button>
              </template>

              <template #cell-description="slotProps">
                <span class="text-[var(--app-muted)]">{{ slotProps.data.description || 'No description provided' }}</span>
              </template>

              <template #cell-actions="slotProps">
                <div class="rbac-management-actions">
                  <button
                    type="button"
                    :aria-label="`View details for permission ${slotProps.data.name}`"
                    title="View permission details"
                    @click="showPermissionDetails(slotProps.data.id as number)"
                  >
                    <Icon icon="mdi:card-account-details-outline" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    :aria-label="`Edit permission ${slotProps.data.name}`"
                    title="Edit permission definition"
                    @click="handleEditPermission(slotProps.data.id as number)"
                  >
                    <Icon icon="mdi:pencil-outline" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="is-danger"
                    :aria-label="`Delete permission ${slotProps.data.name}`"
                    title="Delete permission"
                    @click="confirmDeletePermission(slotProps.data as Permission)"
                  >
                    <Icon icon="mdi:delete-outline" aria-hidden="true" />
                  </button>
                </div>
              </template>

              <template #empty>
                <div class="rbac-management-empty-state">
                  <div class="rbac-management-empty-state__icon">
                    <Icon icon="mdi:lock-question" />
                  </div>
                  <strong>No permissions found</strong>
                  <p>Adjust search query or register a new permission.</p>
                </div>
              </template>
            </AppDataGrid>

            <p v-if="shouldShowPermissionResultLimit" class="rbac-management-footnote">
              Showing the first 50 matching permissions. Refine search query for a narrower result set.
            </p>
          </section>
        </section>
      </template>
    </AppTabs>

    <!-- Create / Edit Role Dialog -->
    <AppFormDialog
      v-model="roleDialogOpen"
      :title="roleDialogTitle"
      description="Roles bundle multiple granular permissions so access can be assigned efficiently in one step."
      size="lg"
      :submit-label="roleDialogSubmitLabel"
      busy-label="Saving…"
      :busy="dialogLoading"
      :submit-disabled="!roleForm.name.trim()"
      :error="dialogError"
      @submit="saveRole"
      @cancel="closeRoleDialog"
    >
      <template #footer-aside>
        <div class="rbac-management-selection-counter">
          <Icon icon="mdi:check-all" />
          <span><strong>{{ roleForm.permissions.length }}</strong> of {{ permissions.length }} permissions selected</span>
        </div>
      </template>

      <div class="rbac-management-dialog-form">
        <AppFormField v-slot="{ id, describedBy }" label="Role Identifier" required hint="Lowercase with underscores (e.g., data_analyst, review_manager).">
          <div class="rbac-management-input-wrapper">
            <Icon icon="mdi:shield-outline" class="rbac-management-input-icon" />
            <input
              :id="id"
              v-model="roleForm.name"
              :aria-describedby="describedBy"
              type="text"
              autocomplete="off"
              placeholder="e.g. data_analyst"
            >
          </div>
        </AppFormField>

        <AppFormField v-slot="{ id }" label="Description" show-optional hint="Summarize what users with this role are authorized to do.">
          <textarea
            :id="id"
            v-model="roleForm.description"
            rows="3"
            class="rbac-management-textarea"
            placeholder="Describe what access and capabilities this role provides..."
          />
        </AppFormField>

        <AppFormField label="Assigned Permissions">
          <div class="rbac-management-permission-section">
            <div class="rbac-management-permission-toolbar">
              <div class="rbac-management-search rbac-management-search--compact">
                <Icon icon="mdi:magnify" class="rbac-management-search__icon" />
                <input
                  v-model="rolePermissionSearch"
                  type="search"
                  placeholder="Filter permissions..."
                >
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="rbac-management-button rbac-management-button--secondary rbac-management-button--sm"
                  @click="selectAllFilteredRolePermissions"
                >
                  Select All
                </button>
                <button
                  type="button"
                  class="rbac-management-button rbac-management-button--secondary rbac-management-button--sm"
                  @click="clearAllFilteredRolePermissions"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div class="rbac-management-permission-picker">
              <label
                v-for="permissionItem in filteredRoleDialogPermissions"
                :key="permissionItem.id"
                class="rbac-management-permission-option"
                :class="isRolePermissionSelected(permissionItem.name) ? 'is-selected' : ''"
              >
                <input
                  :checked="isRolePermissionSelected(permissionItem.name)"
                  type="checkbox"
                  @change="toggleRolePermission(permissionItem.name)"
                >
                <span class="rbac-management-permission-option__name">{{ permissionItem.name }}</span>
              </label>
              <div v-if="filteredRoleDialogPermissions.length === 0" class="col-span-2 text-center py-4 text-xs text-[var(--app-muted)]">
                No permissions match "{{ rolePermissionSearch }}"
              </div>
            </div>
          </div>
        </AppFormField>
      </div>
    </AppFormDialog>

    <!-- Create / Edit Permission Dialog -->
    <AppFormDialog
      v-model="permissionDialogOpen"
      :title="permissionDialogTitle"
      description="Permissions represent granular capabilities assigned to roles across the system."
      :submit-label="permissionDialogSubmitLabel"
      busy-label="Saving…"
      :busy="dialogLoading"
      :submit-disabled="!permissionForm.name.trim()"
      :error="dialogError"
      @submit="savePermission"
      @cancel="closePermissionDialog"
    >
      <div class="rbac-management-dialog-form">
        <AppFormField v-slot="{ id, describedBy }" label="Permission Identifier" required hint="Use verb_noun pattern (e.g. read_reports, export_data, edit_dut).">
          <div class="rbac-management-input-wrapper">
            <Icon icon="mdi:key-outline" class="rbac-management-input-icon" />
            <input
              :id="id"
              v-model="permissionForm.name"
              :aria-describedby="describedBy"
              type="text"
              autocomplete="off"
              placeholder="e.g. read_reports"
            >
          </div>
        </AppFormField>

        <AppFormField v-slot="{ id }" label="Description" show-optional hint="Explain the specific action or feature this permission unlocks.">
          <textarea
            :id="id"
            v-model="permissionForm.description"
            rows="3"
            class="rbac-management-textarea"
            placeholder="Describe what this permission allows..."
          />
        </AppFormField>
      </div>
    </AppFormDialog>

    <!-- Role Details Dialog -->
    <AppFormDialog
      v-model="roleDetailsDialogOpen"
      title="Role Details"
      size="lg"
      submit-label="Edit Role"
      cancel-label="Close"
      :submit-disabled="!selectedRoleDetails"
      @submit="selectedRoleDetails && editRoleFromDetails(selectedRoleDetails.id)"
    >
      <div v-if="selectedRoleDetails" class="rbac-management-detail-stack">
        <div class="rbac-management-detail-hero">
          <div class="rbac-management-detail-hero__icon rbac-management-detail-hero__icon--primary">
            <Icon icon="mdi:shield-account-outline" />
          </div>
          <div class="rbac-management-detail-hero__info">
            <div class="flex items-center gap-2 flex-wrap">
              <h3>{{ selectedRoleDetails.name }}</h3>
              <span class="rbac-management-badge rbac-management-badge--info">
                <Icon icon="mdi:account-group-outline" class="mr-1" />
                {{ selectedRoleDetails.users_count }} users assigned
              </span>
            </div>
            <p>{{ selectedRoleDetails.description || 'No description provided.' }}</p>
          </div>
        </div>

        <section class="rbac-management-detail-panel">
          <div class="rbac-management-detail-panel__header">
            <h3>Assigned Permissions</h3>
            <span class="rbac-management-count-pill">{{ selectedRoleDetails.permissions.length }} permissions</span>
          </div>
          <div class="rbac-management-chip-list">
            <span
              v-for="permissionName in selectedRoleDetails.permissions"
              :key="permissionName"
              class="rbac-management-chip"
            >
              <Icon icon="mdi:key-outline" class="mr-1" />
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
          <div class="rbac-management-detail-panel__header">
            <h3>Users With This Role</h3>
            <span class="rbac-management-count-pill">{{ selectedRoleDetails.users.length }} users</span>
          </div>
          <div class="rbac-management-user-list">
            <article
              v-for="user in selectedRoleDetails.users"
              :key="user.id"
              class="rbac-management-user-card"
            >
              <div class="flex items-center gap-2.5">
                <span class="rbac-management-avatar rbac-management-avatar--small">
                  {{ getInitial(user.username) }}
                </span>
                <div>
                  <strong>{{ user.username }}</strong>
                  <small>{{ user.email || 'No email configured' }}</small>
                </div>
              </div>
              <span
                class="rbac-management-badge"
                :class="user.is_active ? 'rbac-management-badge--success' : 'rbac-management-badge--danger'"
              >
                <Icon :icon="user.is_active ? 'mdi:check-circle' : 'mdi:close-circle'" class="mr-1" />
                {{ user.is_active ? 'Active' : 'Inactive' }}
              </span>
            </article>
            <p v-if="selectedRoleDetails.users.length === 0" class="rbac-management-empty-copy">
              No users are currently assigned to this role.
            </p>
          </div>
        </section>

        <section v-if="selectedRoleDetails.created_at || selectedRoleDetails.updated_at" class="rbac-management-detail-panel">
          <div class="rbac-management-detail-panel__header">
            <h3>Metadata & Lifecycle</h3>
          </div>
          <dl class="rbac-management-meta-list">
            <div v-if="selectedRoleDetails.created_at">
              <dt class="flex items-center gap-1"><Icon icon="mdi:calendar-plus" /> Created</dt>
              <dd>{{ formatDate(selectedRoleDetails.created_at) }}</dd>
            </div>
            <div v-if="selectedRoleDetails.updated_at">
              <dt class="flex items-center gap-1"><Icon icon="mdi:calendar-edit" /> Last Updated</dt>
              <dd>{{ formatDate(selectedRoleDetails.updated_at) }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </AppFormDialog>

    <!-- Permission Details Dialog -->
    <AppFormDialog
      v-model="permissionDetailsDialogOpen"
      title="Permission Details"
      size="md"
      submit-label="Edit Permission"
      cancel-label="Close"
      :submit-disabled="!selectedPermissionDetails"
      @submit="selectedPermissionDetails && editPermissionFromDetails(selectedPermissionDetails.id)"
    >
      <div v-if="selectedPermissionDetails" class="rbac-management-detail-stack">
        <div class="rbac-management-detail-hero">
          <div class="rbac-management-detail-hero__icon rbac-management-detail-hero__icon--info">
            <Icon icon="mdi:key-outline" />
          </div>
          <div class="rbac-management-detail-hero__info">
            <div class="flex items-center gap-2 flex-wrap">
              <h3>{{ selectedPermissionDetails.name }}</h3>
              <span class="rbac-management-badge rbac-management-badge--info">
                <Icon icon="mdi:shield-outline" class="mr-1" />
                {{ selectedPermissionDetails.usage_count }} roles using
              </span>
            </div>
            <p>{{ selectedPermissionDetails.description || 'No description provided.' }}</p>
          </div>
        </div>

        <section class="rbac-management-detail-panel">
          <div class="rbac-management-detail-panel__header">
            <h3>Roles Using This Permission</h3>
            <span class="rbac-management-count-pill">{{ selectedPermissionDetails.roles.length }} roles</span>
          </div>
          <div class="rbac-management-chip-list">
            <span
              v-for="roleName in selectedPermissionDetails.roles"
              :key="roleName"
              class="rbac-management-chip"
            >
              <Icon icon="mdi:shield-outline" class="mr-1" />
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
      </div>
    </AppFormDialog>

    <!-- Delete Confirmation Dialog -->
    <AppConfirmDialog
      v-model="deleteDialogOpen"
      v-model:typed-value="deleteConfirmation"
      :title="deleteDialogTitle"
      :confirm-label="deleteDialogActionLabel"
      :busy="deleting"
      require-typed
      @confirm="handleConfirmDelete"
      @cancel="closeDeleteDialog"
    >
      {{ deleteDialogMessage }}
    </AppConfirmDialog>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, reactive, ref } from 'vue'
import { queryKeys } from '@/core/query'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import AppConfirmDialog from '@/shared/ui/dialog/AppConfirmDialog.vue'
import AppFormDialog from '@/shared/ui/dialog/AppFormDialog.vue'
import AppFormField from '@/shared/ui/forms/AppFormField.vue'
import AppTabs from '@/shared/ui/tabs/AppTabs.vue'
import { getApiErrorDetail, getErrorMessage } from '@/shared/utils'
import type { Permission, PermissionDetail, RBACStats, Role, RoleDetail } from '../api/admin.api'
import { adminApi } from '../api/admin.api'

type DialogMode = 'create' | 'edit'
type DeleteTarget = 'role' | 'permission' | null

const activeTab = useTabPersistence('catalogTab', 'roles')
const tabItems = [
  { label: 'Roles', value: 'roles' },
  { label: 'Permissions', value: 'permissions' },
]

const error = ref('')
const success = ref('')

const roleSearch = ref('')
const permissionSearch = ref('')
const rolePermissionSearch = ref('')

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

const filteredRoleDialogPermissions = computed(() => {
  const query = rolePermissionSearch.value.trim().toLowerCase()
  if (!query) return permissions.value

  return permissions.value.filter(
    (perm) =>
      perm.name.toLowerCase().includes(query) ||
      Boolean(perm.description?.toLowerCase().includes(query)),
  )
})

const displayedRoles = computed(() => filteredRoles.value.slice(0, 50))
const displayedPermissions = computed(() => filteredPermissions.value.slice(0, 50))

const shouldShowRoleResultLimit = computed(() => filteredRoles.value.length > 50)
const shouldShowPermissionResultLimit = computed(() => filteredPermissions.value.length > 50)

const roleDialogTitle = computed(() => {
  return roleDialogMode.value === 'create' ? 'Create New Role' : 'Edit Role Definition'
})

const permissionDialogTitle = computed(() => {
  return permissionDialogMode.value === 'create'
    ? 'Create New Permission'
    : 'Edit Permission Definition'
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
  rolePermissionSearch.value = ''
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
  rolePermissionSearch.value = ''
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

function selectAllFilteredRolePermissions() {
  const selectedSet = new Set(roleForm.permissions)
  for (const perm of filteredRoleDialogPermissions.value) {
    selectedSet.add(perm.name)
  }
  roleForm.permissions = Array.from(selectedSet)
}

function clearAllFilteredRolePermissions() {
  const filteredNames = new Set(filteredRoleDialogPermissions.value.map((p) => p.name))
  roleForm.permissions = roleForm.permissions.filter((name) => !filteredNames.has(name))
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

function getInitial(value: string): string {
  return value.trim().charAt(0).toUpperCase() || 'U'
}

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
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

.rbac-management-toolbar {
  display: grid;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

.rbac-management-toolbar__actions {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.rbac-management-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.5rem;
  padding: 0.55rem 1rem;
  border-radius: 0.65rem;
  border: 1px solid transparent;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.rbac-management-button--sm {
  min-height: 2.15rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
}

.rbac-management-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.rbac-management-button--primary {
  background: var(--rbac-accent);
  color: #ffffff;
}

.rbac-management-button--primary:hover:not(:disabled) {
  background: var(--rbac-accent-strong);
}

.rbac-management-button--secondary {
  background: var(--app-panel-strong);
  border-color: var(--app-border);
  color: var(--app-ink);
}

.rbac-management-button--secondary:hover:not(:disabled) {
  border-color: var(--rbac-accent);
  color: var(--rbac-accent);
}

.rbac-management-button--ghost {
  background: var(--app-panel-strong);
  border-color: var(--app-border);
  color: var(--app-ink);
}

.rbac-management-button--ghost:hover:not(:disabled) {
  border-color: var(--rbac-accent);
  color: var(--rbac-accent);
}

.rbac-management-notice {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid transparent;
  margin-bottom: 1rem;
}

.rbac-management-notice__content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.rbac-management-notice__icon {
  font-size: 1.35rem;
  flex-shrink: 0;
}

.rbac-management-notice strong {
  display: block;
  font-size: 0.875rem;
}

.rbac-management-notice p {
  margin: 0;
  font-size: 0.825rem;
}

.rbac-management-notice button {
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 0.4rem;
  color: inherit;
  opacity: 0.8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rbac-management-notice button:hover {
  opacity: 1;
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

.rbac-management-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.rbac-management-stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1.15rem;
  border-radius: 0.75rem;
  border: 1px solid var(--app-border);
  background: var(--app-panel-strong);
}

.rbac-management-stat-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rbac-management-stat-card__top span {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--app-muted);
}

.rbac-management-stat-card__icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  font-size: 1.1rem;
}

.rbac-management-stat-card__icon--primary {
  background: var(--rbac-accent-soft);
  color: var(--rbac-accent);
}

.rbac-management-stat-card__icon--info {
  background: var(--rbac-info-soft);
  color: var(--rbac-info);
}

.rbac-management-stat-card__icon--success {
  background: var(--rbac-success-soft);
  color: var(--rbac-success);
}

.rbac-management-stat-card__icon--warning {
  background: var(--rbac-warning-soft);
  color: var(--rbac-warning);
}

.rbac-management-stat-card strong {
  font-size: 1.75rem;
  color: var(--app-ink);
  line-height: 1.2;
}

.rbac-management-stat-card small {
  color: var(--app-muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

.rbac-management-tab-content {
  display: grid;
  gap: 1.25rem;
}

.rbac-management-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
}

.rbac-management-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.rbac-management-panel__header--compact {
  flex-wrap: wrap;
}

.rbac-management-panel__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  color: var(--rbac-accent);
  font-weight: 700;
}

.rbac-management-panel h2 {
  margin: 0.15rem 0 0;
  color: var(--app-ink);
  font-size: 1.15rem;
  font-weight: 700;
}

.rbac-management-count-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--app-canvas-strong);
  color: var(--app-muted);
}

.rbac-management-search {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: min(100%, 22rem);
  height: 2.75rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel);
  padding: 0 0.85rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.rbac-management-search--compact {
  height: 2.35rem;
  min-width: min(100%, 15rem);
}

.rbac-management-search:focus-within {
  border-color: var(--rbac-accent);
  box-shadow: 0 0 0 3px var(--rbac-accent-soft);
}

.rbac-management-search__icon {
  font-size: 1.15rem;
  color: var(--app-muted);
  flex-shrink: 0;
}

.rbac-management-search input {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 0.875rem;
  color: var(--app-ink);
}

.rbac-management-search__clear {
  border: 0;
  background: transparent;
  color: var(--app-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0.2rem;
  font-size: 1rem;
}

.rbac-management-search__clear:hover {
  color: var(--app-ink);
}

.rbac-management-link-button {
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  color: var(--app-ink);
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.15s ease;
}

.rbac-management-link-button:hover {
  color: var(--rbac-accent);
}

.rbac-management-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.rbac-management-chip,
.rbac-management-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
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
  width: 2.15rem;
  height: 2.15rem;
  border: 1px solid var(--app-border);
  border-radius: 0.6rem;
  background: var(--app-panel);
  color: var(--app-ink);
  cursor: pointer;
  transition: all 0.15s ease;
}

.rbac-management-actions button:hover:not(:disabled) {
  border-color: var(--rbac-accent);
  color: var(--rbac-accent);
  background: var(--rbac-accent-soft);
}

.rbac-management-actions button.is-danger:hover:not(:disabled) {
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
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
}

.rbac-management-empty-state__icon {
  display: grid;
  place-items: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 999px;
  background: var(--app-canvas-strong);
  color: var(--app-muted);
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.rbac-management-empty-state strong {
  font-size: 1rem;
  color: var(--app-ink);
}

.rbac-management-empty-state p,
.rbac-management-footnote,
.rbac-management-empty-copy {
  margin: 0;
  font-size: 0.825rem;
  color: var(--app-muted);
}

.rbac-management-dialog-form,
.rbac-management-detail-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rbac-management-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  height: 2.75rem;
  padding: 0 0.85rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.rbac-management-input-wrapper:focus-within {
  border-color: var(--rbac-accent);
  box-shadow: 0 0 0 3px var(--rbac-accent-soft);
}

.rbac-management-input-icon {
  font-size: 1.15rem;
  color: var(--app-muted);
  flex-shrink: 0;
}

.rbac-management-input-wrapper input {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--app-ink);
  font-size: 0.875rem;
  outline: none;
}

.rbac-management-textarea {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  padding: 0.75rem 0.85rem;
  font: inherit;
  font-size: 0.875rem;
  color: var(--app-ink);
  background: var(--app-panel-strong);
  resize: vertical;
  min-height: 6rem;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.rbac-management-textarea:focus {
  border-color: var(--rbac-accent);
  box-shadow: 0 0 0 3px var(--rbac-accent-soft);
}

.rbac-management-permission-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  padding: 0.85rem;
  background: var(--app-surface);
}

.rbac-management-permission-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.rbac-management-permission-picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  max-height: 16rem;
  overflow-y: auto;
  padding: 0.25rem 0.1rem;
}

.rbac-management-permission-option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--app-border);
  border-radius: 0.65rem;
  background: var(--app-panel);
  cursor: pointer;
  transition: all 0.15s ease;
}

.rbac-management-permission-option input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--rbac-accent);
  cursor: pointer;
}

.rbac-management-permission-option__name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--app-ink);
}

.rbac-management-permission-option.is-selected {
  border-color: var(--rbac-accent);
  background: var(--rbac-accent-soft);
}

.rbac-management-selection-counter {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.825rem;
  color: var(--app-muted);
}

.rbac-management-selection-counter strong {
  color: var(--rbac-accent);
}

.rbac-management-detail-hero {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.15rem;
  border: 1px solid var(--app-border);
  border-radius: 0.85rem;
  background: var(--app-surface);
}

.rbac-management-detail-hero__icon {
  display: grid;
  place-items: center;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 0.75rem;
  font-size: 1.6rem;
  flex-shrink: 0;
}

.rbac-management-detail-hero__icon--primary {
  background: var(--rbac-accent-soft);
  color: var(--rbac-accent);
}

.rbac-management-detail-hero__icon--info {
  background: var(--rbac-info-soft);
  color: var(--rbac-info);
}

.rbac-management-detail-hero__info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.rbac-management-detail-hero__info h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--app-ink);
}

.rbac-management-detail-hero__info p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--app-muted);
}

.rbac-management-detail-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.15rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel);
}

.rbac-management-detail-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.rbac-management-detail-panel h3 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--app-ink);
}

.rbac-management-user-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 14rem;
  overflow-y: auto;
}

.rbac-management-user-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--app-border);
  border-radius: 0.65rem;
  background: var(--app-panel-strong);
}

.rbac-management-user-card strong {
  display: block;
  font-size: 0.85rem;
  color: var(--app-ink);
}

.rbac-management-user-card small {
  display: block;
  font-size: 0.75rem;
  color: var(--app-muted);
}

.rbac-management-avatar {
  display: grid;
  place-items: center;
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 999px;
  background: var(--rbac-accent-soft);
  color: var(--rbac-accent);
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.rbac-management-avatar--small {
  width: 1.85rem;
  height: 1.85rem;
  font-size: 0.75rem;
}

.rbac-management-meta-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 0;
}

.rbac-management-meta-list div {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.rbac-management-meta-list dt {
  font-size: 0.75rem;
  color: var(--app-muted);
  font-weight: 600;
}

.rbac-management-meta-list dd {
  margin: 0;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--app-ink);
}

@media (max-width: 960px) {
  .rbac-management-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rbac-management-permission-picker {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .rbac-management-stats-grid {
    grid-template-columns: 1fr;
  }

  .rbac-management-toolbar__actions {
    width: 100%;
  }

  .rbac-management-button,
  .rbac-management-search {
    width: 100%;
  }

  .rbac-management-meta-list {
    grid-template-columns: 1fr;
  }
}
</style>
