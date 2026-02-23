<template>
  <DefaultLayout>
    <v-container fluid>
      <v-row>
        <v-col cols="12">
          <div class="d-flex justify-space-between align-center mb-4">
            <div>
              <h1 class="text-h4 font-weight-bold mb-2">Roles & Permissions Management</h1>
              <p class="text-body-2 text-medium-emphasis">
                Manage roles, permissions, and access control policies
              </p>
            </div>
            <div class="d-flex gap-2">
              <v-btn color="primary" prepend-icon="mdi-shield-plus" @click="openCreateRoleDialog">
                Add Role
              </v-btn>
              <v-btn color="secondary" prepend-icon="mdi-lock-plus" @click="openCreatePermissionDialog">
                Add Permission
              </v-btn>
            </div>
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
                  <v-icon>mdi-shield-account</v-icon>
                </v-avatar>
                <div>
                  <div class="text-overline">Total Roles</div>
                  <div class="text-h5">{{ stats.total_roles }}</div>
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
                  <v-icon>mdi-lock</v-icon>
                </v-avatar>
                <div>
                  <div class="text-overline">Permissions</div>
                  <div class="text-h5">{{ stats.total_permissions }}</div>
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
                  <v-icon>mdi-account-group</v-icon>
                </v-avatar>
                <div>
                  <div class="text-overline">Users with Roles</div>
                  <div class="text-h5">{{ stats.users_with_roles }}</div>
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
                  <v-icon>mdi-connection</v-icon>
                </v-avatar>
                <div>
                  <div class="text-overline">Active Sessions</div>
                  <div class="text-h5">{{ stats.active_sessions }}</div>
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
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-tabs v-model="tab" bg-color="default" color="primary">
              <v-tab value="roles">Roles</v-tab>
              <v-tab value="permissions">Permissions</v-tab>
            </v-tabs>

            <v-window v-model="tab">
              <!-- Roles Tab -->
              <v-window-item value="roles">
                <v-card-title>
                  <v-row align="center">
                    <v-col cols="12" md="6">
                      <span class="text-h6">Roles</span>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field v-model="roleSearch" density="compact" variant="outlined"
                        prepend-inner-icon="mdi-magnify" placeholder="Search roles by name, description, or permissions"
                        hide-details clearable />
                    </v-col>
                  </v-row>
                </v-card-title>
                <v-card-text>
                  <v-data-table :headers="roleHeaders" :items="displayedRoles" :loading="loading" :items-per-page="10"
                    :items-per-page-options="[10, 25, 50, 100]">
                    <template #item.name="{ item }">
                      <span class="clickable-name" @click="showRoleDetails((item as any).id)"
                        v-html="highlightText(item.name, roleSearchDebounced)"></span>
                    </template>
                    <template #item.description="{ item }">
                      <span v-html="highlightText(item.description || '', roleSearchDebounced)"></span>
                    </template>
                    <template #item.permissions="{ item }">
                      <v-chip-group>
                        <v-chip v-for="p in (item as any).permissions?.slice(0, 3)" :key="p" size="small"
                          variant="outlined" :color="getPermissionChipColor(p)">
                          {{ p }}
                        </v-chip>
                        <v-chip v-if="((item as any).permissions?.length || 0) > 3" size="small" color="info">
                          +{{ ((item as any).permissions?.length || 0) - 3 }} more
                        </v-chip>
                      </v-chip-group>
                    </template>
                    <template #item.users_count="{ item }">
                      <v-chip size="small" :color="(item as any).users_count > 0 ? 'success' : 'default'">
                        {{ (item as any).users_count || 0 }} users
                      </v-chip>
                    </template>
                    <template #item.actions="{ item }">
                      <div class="d-flex gap-1">
                        <v-btn icon="mdi-pencil" size="small" variant="text" color="primary"
                          @click="handleEditRole((item as any).id)" title="Edit Role" />
                        <v-btn icon="mdi-delete" size="small" variant="text" color="error"
                          @click="confirmDeleteRole(item as any)" :disabled="(item as any).name === 'admin'"
                          title="Delete Role" />
                      </div>
                    </template>
                    <template #no-data>
                      <div class="text-center pa-4">
                        <v-icon size="64" color="grey">mdi-shield-off</v-icon>
                        <p class="text-h6 mt-2">No roles found</p>
                        <v-btn color="primary" @click="openCreateRoleDialog">Create First Role</v-btn>
                      </div>
                    </template>
                  </v-data-table>
                  <div v-if="shouldShowResultLimit" class="text-caption text-medium-emphasis mt-2">
                    Showing first 50 of {{ filteredRoles.length }} results. Refine your search for more specific
                    results.
                  </div>
                </v-card-text>
              </v-window-item>

              <!-- Permissions Tab -->
              <v-window-item value="permissions">
                <v-card-title>
                  <v-row align="center">
                    <v-col cols="12" md="6">
                      <span class="text-h6">Permissions</span>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field v-model="permSearch" density="compact" variant="outlined"
                        prepend-inner-icon="mdi-magnify" placeholder="Search permissions by name or description"
                        hide-details clearable />
                    </v-col>
                  </v-row>
                </v-card-title>
                <v-card-text>
                  <v-data-table :headers="permHeaders" :items="displayedPermissions" :loading="loading"
                    :items-per-page="10" :items-per-page-options="[10, 25, 50, 100]">
                    <template #item.name="{ item }">
                      <span class="clickable-name" @click="showPermissionDetails((item as any).id)"
                        v-html="highlightText(item.name, permSearchDebounced)"></span>
                    </template>
                    <template #item.description="{ item }">
                      <span v-html="highlightText(item.description || 'No description', permSearchDebounced)"></span>
                    </template>
                    <template #item.actions="{ item }">
                      <div class="d-flex gap-1">
                        <v-btn icon="mdi-pencil" size="small" variant="text" color="primary"
                          @click="handleEditPermission((item as any).id)" title="Edit Permission" />
                        <v-btn icon="mdi-delete" size="small" variant="text" color="error"
                          @click="confirmDeletePermission(item as any)" title="Delete Permission" />
                      </div>
                    </template>
                    <template #no-data>
                      <div class="text-center pa-4">
                        <v-icon size="64" color="grey">mdi-lock-off</v-icon>
                        <p class="text-h6 mt-2">No permissions found</p>
                        <v-btn color="secondary" @click="openCreatePermissionDialog">Create First Permission</v-btn>
                      </div>
                    </template>
                  </v-data-table>
                  <div v-if="shouldShowPermResultLimit" class="text-caption text-medium-emphasis mt-2">
                    Showing first 50 of {{ filteredPermissions.length }} results. Refine your search for more specific
                    results.
                  </div>
                </v-card-text>
              </v-window-item>
            </v-window>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Create Role Dialog -->
    <v-dialog v-model="roleDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5">Create New Role</v-card-title>
        <v-card-text>
          <v-text-field v-model="newRole.name" label="Role Name" variant="outlined" class="mb-3"
            hint="e.g., data_analyst, viewer, editor" persistent-hint />
          <v-textarea v-model="newRole.description" label="Description" variant="outlined" rows="3"
            hint="Describe what this role can do" persistent-hint />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="roleDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="loading" @click="handleCreateRole">Create Role</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create Permission Dialog -->
    <v-dialog v-model="permDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5">Create New Permission</v-card-title>
        <v-card-text>
          <v-text-field v-model="newPermission.name" label="Permission Name" variant="outlined" class="mb-3"
            hint="e.g., read_reports, write_data, manage_users" persistent-hint />
          <v-textarea v-model="newPermission.description" label="Description" variant="outlined" rows="3"
            hint="Describe what this permission allows" persistent-hint />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="permDialog = false">Cancel</v-btn>
          <v-btn color="secondary" :loading="loading" @click="handleCreatePermission">Create Permission</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Role Dialog -->
    <v-dialog v-model="editRoleDialog" max-width="700px">
      <v-card>
        <v-card-title class="text-h5">Edit Role</v-card-title>
        <v-card-text>
          <v-text-field v-model="editRoleForm.name" label="Role Name" variant="outlined" class="mb-3"
            hint="e.g., data_analyst, viewer, editor" persistent-hint />
          <v-textarea v-model="editRoleForm.description" label="Description" variant="outlined" rows="3"
            hint="Describe what this role can do" persistent-hint class="mb-3" />
          <v-card variant="outlined">
            <v-card-title class="text-subtitle-1">Permissions</v-card-title>
            <v-card-text>
              <v-chip-group v-model="editRoleForm.permissions" column multiple>
                <v-chip v-for="perm in permissions" :key="perm.id" :value="perm.name" filter variant="outlined">
                  {{ perm.name }}
                </v-chip>
              </v-chip-group>
            </v-card-text>
          </v-card>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="editRoleDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="loading" @click="saveRoleEdit">Save Changes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Permission Dialog -->
    <v-dialog v-model="editPermDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5">Edit Permission</v-card-title>
        <v-card-text>
          <v-text-field v-model="editPermForm.name" label="Permission Name" variant="outlined" class="mb-3"
            hint="e.g., read_reports, write_data, manage_users" persistent-hint />
          <v-textarea v-model="editPermForm.description" label="Description" variant="outlined" rows="3"
            hint="Describe what this permission allows" persistent-hint />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="editPermDialog = false">Cancel</v-btn>
          <v-btn color="secondary" :loading="loading" @click="savePermissionEdit">Save Changes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Role Details Dialog -->
    <v-dialog v-model="roleDetailsDialog" max-width="800px">
      <v-card v-if="selectedRoleDetails">
        <v-card-title class="d-flex justify-space-between align-center">
          <span class="text-h5">Role Details: {{ selectedRoleDetails.name }}</span>
          <v-btn icon="mdi-close" variant="text" @click="roleDetailsDialog = false" />
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
                    <v-col cols="4" class="text-medium-emphasis">Role Name:</v-col>
                    <v-col cols="8" class="font-weight-medium">{{ selectedRoleDetails.name }}</v-col>
                    <v-col cols="4" class="text-medium-emphasis">Description:</v-col>
                    <v-col cols="8">{{ selectedRoleDetails.description || 'No description' }}</v-col>
                    <v-col cols="4" class="text-medium-emphasis">Total Users:</v-col>
                    <v-col cols="8">
                      <v-chip size="small" :color="selectedRoleDetails.users_count > 0 ? 'success' : 'default'">
                        {{ selectedRoleDetails.users_count }} users
                      </v-chip>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Permissions -->
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1 d-flex align-center">
                  <v-icon class="mr-2">mdi-lock</v-icon>
                  Assigned Permissions ({{ selectedRoleDetails.permissions?.length || 0 }})
                </v-card-title>
                <v-divider />
                <v-card-text>
                  <v-chip-group v-if="selectedRoleDetails.permissions && selectedRoleDetails.permissions.length > 0"
                    column>
                    <v-chip v-for="perm in selectedRoleDetails.permissions" :key="perm" variant="outlined"
                      color="primary">
                      {{ perm }}
                    </v-chip>
                  </v-chip-group>
                  <p v-else class="text-medium-emphasis">No permissions assigned</p>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Users with this Role -->
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1 d-flex align-center">
                  <v-icon class="mr-2">mdi-account-group</v-icon>
                  Users with this Role ({{ selectedRoleDetails.users?.length || 0 }})
                </v-card-title>
                <v-divider />
                <v-card-text>
                  <v-list v-if="selectedRoleDetails.users && selectedRoleDetails.users.length > 0" density="compact">
                    <v-list-item v-for="user in selectedRoleDetails.users" :key="user.id">
                      <template #prepend>
                        <v-avatar :color="user.is_active ? 'success' : 'error'" size="32">
                          <v-icon>mdi-account</v-icon>
                        </v-avatar>
                      </template>
                      <v-list-item-title>{{ user.username }}</v-list-item-title>
                      <v-list-item-subtitle>{{ user.email }}</v-list-item-subtitle>
                      <template #append>
                        <v-chip v-if="!user.is_active" size="small" color="error">Inactive</v-chip>
                      </template>
                    </v-list-item>
                  </v-list>
                  <p v-else class="text-medium-emphasis">No users assigned to this role</p>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Metadata -->
            <v-col cols="12" v-if="selectedRoleDetails.created_at || selectedRoleDetails.updated_at">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1 d-flex align-center">
                  <v-icon class="mr-2">mdi-clock-outline</v-icon>
                  Metadata
                </v-card-title>
                <v-divider />
                <v-card-text>
                  <v-row dense>
                    <v-col v-if="selectedRoleDetails.created_at" cols="4" class="text-medium-emphasis">Created
                      At:</v-col>
                    <v-col v-if="selectedRoleDetails.created_at" cols="8">{{ formatDate(selectedRoleDetails.created_at)
                    }}</v-col>
                    <v-col v-if="selectedRoleDetails.updated_at" cols="4" class="text-medium-emphasis">Updated
                      At:</v-col>
                    <v-col v-if="selectedRoleDetails.updated_at" cols="8">{{ formatDate(selectedRoleDetails.updated_at)
                    }}</v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn @click="roleDetailsDialog = false">Close</v-btn>
          <v-btn color="primary" prepend-icon="mdi-pencil"
            @click="editRoleFromDetails(selectedRoleDetails.id)">Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Permission Details Dialog -->
    <v-dialog v-model="permDetailsDialog" max-width="800px">
      <v-card v-if="selectedPermDetails">
        <v-card-title class="d-flex justify-space-between align-center">
          <span class="text-h5">Permission Details: {{ selectedPermDetails.name }}</span>
          <v-btn icon="mdi-close" variant="text" @click="permDetailsDialog = false" />
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
                    <v-col cols="4" class="text-medium-emphasis">Permission Name:</v-col>
                    <v-col cols="8" class="font-weight-medium">{{ selectedPermDetails.name }}</v-col>
                    <v-col cols="4" class="text-medium-emphasis">Description:</v-col>
                    <v-col cols="8">{{ selectedPermDetails.description || 'No description' }}</v-col>
                    <v-col cols="4" class="text-medium-emphasis">Usage Count:</v-col>
                    <v-col cols="8">
                      <v-chip size="small" :color="selectedPermDetails.usage_count > 0 ? 'success' : 'default'">
                        Used by {{ selectedPermDetails.usage_count }} role(s)
                      </v-chip>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Roles with this Permission -->
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1 d-flex align-center">
                  <v-icon class="mr-2">mdi-shield-account</v-icon>
                  Roles with this Permission ({{ selectedPermDetails.roles?.length || 0 }})
                </v-card-title>
                <v-divider />
                <v-card-text>
                  <v-chip-group v-if="selectedPermDetails.roles && selectedPermDetails.roles.length > 0" column>
                    <v-chip v-for="role in selectedPermDetails.roles" :key="role" variant="outlined" color="primary">
                      {{ role }}
                    </v-chip>
                  </v-chip-group>
                  <p v-else class="text-medium-emphasis">No roles have this permission</p>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn @click="permDetailsDialog = false">Close</v-btn>
          <v-btn color="secondary" prepend-icon="mdi-pencil"
            @click="editPermissionFromDetails(selectedPermDetails.id)">Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Role Confirmation Dialog -->
    <v-dialog v-model="deleteRoleDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="text-h5 bg-error text-white">
          <v-icon start>mdi-alert</v-icon>
          Confirm Delete Role
        </v-card-title>
        <v-card-text class="pt-4">
          <div class="mb-4">
            <p class="text-body-1 mb-2">
              You are about to delete this role:
            </p>
            <v-card variant="outlined" class="mb-4">
              <v-card-text>
                <div><strong>Role Name:</strong> {{ roleToDelete?.name || 'N/A' }}</div>
                <div><strong>Description:</strong> {{ roleToDelete?.description || 'N/A' }}</div>
                <div><strong>Users Count:</strong> {{ roleToDelete?.users_count || 0 }}</div>
              </v-card-text>
            </v-card>
            <v-alert type="warning" variant="tonal" color="orange-darken-1" class="mb-4">
              This action cannot be undone. All users assigned to this role will lose these permissions.
            </v-alert>
          </div>
          <div>
            <p class="text-body-2 mb-2">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <v-text-field v-model="deleteRoleConfirmation" placeholder="DELETE" variant="outlined" density="comfortable"
              hide-details autofocus @keyup.enter="handleConfirmDeleteRole" />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="default" variant="tonal" @click="cancelDeleteRole" :disabled="deletingRole">
            Cancel
          </v-btn>
          <v-btn color="error" variant="flat" @click="handleConfirmDeleteRole"
            :disabled="deleteRoleConfirmation !== 'DELETE' || deletingRole" :loading="deletingRole">
            Delete Role
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Permission Confirmation Dialog -->
    <v-dialog v-model="deletePermDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="text-h5 bg-error text-white">
          <v-icon start>mdi-alert</v-icon>
          Confirm Delete Permission
        </v-card-title>
        <v-card-text class="pt-4">
          <div class="mb-4">
            <p class="text-body-1 mb-2">
              You are about to delete this permission:
            </p>
            <v-card variant="outlined" class="mb-4">
              <v-card-text>
                <div><strong>Permission Name:</strong> {{ permToDelete?.name || 'N/A' }}</div>
                <div><strong>Description:</strong> {{ permToDelete?.description || 'N/A' }}</div>
              </v-card-text>
            </v-card>
            <v-alert type="warning" variant="tonal" color="orange-darken-1" class="mb-4">
              This action cannot be undone. All roles using this permission will be updated.
            </v-alert>
          </div>
          <div>
            <p class="text-body-2 mb-2">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <v-text-field v-model="deletePermConfirmation" placeholder="DELETE" variant="outlined" density="comfortable"
              hide-details autofocus @keyup.enter="handleConfirmDeletePerm" />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="default" variant="tonal" @click="cancelDeletePerm" :disabled="deletingPerm">
            Cancel
          </v-btn>
          <v-btn color="error" variant="flat" @click="handleConfirmDeletePerm"
            :disabled="deletePermConfirmation !== 'DELETE' || deletingPerm" :loading="deletingPerm">
            Delete Permission
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { useMemoize, watchDebounced } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
import { getApiErrorDetail, getErrorMessage } from '@/shared/utils'
import type { Permission, PermissionDetail, RBACStats, Role, RoleDetail } from '../api/admin.api'
import { adminApi } from '../api/admin.api'

// State - tab persisted in URL
const tab = useTabPersistence('tab', 'roles')
const loading = ref(false)
const error = ref('')
const success = ref('')
const roleSearch = ref('')
const permSearch = ref('')
const roleSearchDebounced = ref('')
const permSearchDebounced = ref('')
const roles = ref<Role[]>([])
const permissions = ref<Permission[]>([])
const stats = ref<RBACStats>({
  total_roles: 0,
  total_permissions: 0,
  users_with_roles: 0,
  active_sessions: 0,
})

const roleDialog = ref(false)
const permDialog = ref(false)
const newRole = ref({ name: '', description: '' })
const newPermission = ref({ name: '', description: '' })

// Edit dialogs
const editRoleDialog = ref(false)
const editPermDialog = ref(false)
const editRoleForm = ref({ id: 0, name: '', description: '', permissions: [] as string[] })
const editPermForm = ref({ id: 0, name: '', description: '' })

// Details dialogs
const roleDetailsDialog = ref(false)
const permDetailsDialog = ref(false)
const selectedRoleDetails = ref<RoleDetail | null>(null)
const selectedPermDetails = ref<PermissionDetail | null>(null)

// Delete dialogs
const deleteRoleDialog = ref(false)
const roleToDelete = ref<Role | null>(null)
const deleteRoleConfirmation = ref('')
const deletingRole = ref(false)

const deletePermDialog = ref(false)
const permToDelete = ref<Permission | null>(null)
const deletePermConfirmation = ref('')
const deletingPerm = ref(false)

// Debounced search (150ms) for better performance
watchDebounced(
  roleSearch,
  (val) => {
    roleSearchDebounced.value = val
  },
  { debounce: 150 },
)

watchDebounced(
  permSearch,
  (val) => {
    permSearchDebounced.value = val
  },
  { debounce: 150 },
)

// Table headers
const roleHeaders = [
  { title: 'Role Name', key: 'name', sortable: true },
  { title: 'Description', key: 'description', sortable: true },
  { title: 'Permissions', key: 'permissions', sortable: false },
  { title: 'Users', key: 'users_count', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false },
]

const permHeaders = [
  { title: 'Permission Name', key: 'name', sortable: true },
  { title: 'Description', key: 'description', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false },
]

// Utility: Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Utility: Highlight matching text with XSS protection and error handling
function highlightText(text: string, query: string): string {
  try {
    if (!query || query.length < 2) return escapeHtml(text)

    const escapedText = escapeHtml(text)
    const escapedQuery = escapeHtml(query)

    const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return escapedText.replace(
      regex,
      '<mark style="background-color: #FFF59D; padding: 2px 4px; border-radius: 2px;">$1</mark>',
    )
  } catch (e) {
    console.error('Error highlighting text:', e)
    return escapeHtml(text)
  }
}

// Memoized filtered roles with search by name, description, and permissions
const memoizedFilterRoles = useMemoize((searchQuery: string, rolesList: Role[]) => {
  if (!searchQuery || searchQuery.length < 2) return rolesList

  const query = searchQuery.toLowerCase()
  return rolesList.filter(
    (role) =>
      role.name.toLowerCase().includes(query) ||
      role.description?.toLowerCase().includes(query) ||
      role.permissions?.some((p: string) => p.toLowerCase().includes(query)),
  )
})

const filteredRoles = computed(() => {
  return memoizedFilterRoles(roleSearchDebounced.value, roles.value)
})

// Display first 50 results for performance
const displayedRoles = computed(() => {
  return filteredRoles.value.slice(0, 50)
})

const shouldShowResultLimit = computed(() => {
  return roleSearchDebounced.value.length >= 2 && filteredRoles.value.length > 50
})

// Memoized filtered permissions
const memoizedFilterPermissions = useMemoize((searchQuery: string, permsList: Permission[]) => {
  if (!searchQuery || searchQuery.length < 2) return permsList

  const query = searchQuery.toLowerCase()
  return permsList.filter(
    (perm) =>
      perm.name.toLowerCase().includes(query) || perm.description?.toLowerCase().includes(query),
  )
})

const filteredPermissions = computed(() => {
  return memoizedFilterPermissions(permSearchDebounced.value, permissions.value)
})

const displayedPermissions = computed(() => {
  return filteredPermissions.value.slice(0, 50)
})

const shouldShowPermResultLimit = computed(() => {
  return permSearchDebounced.value.length >= 2 && filteredPermissions.value.length > 50
})

// Highlight matching permission chips
function getPermissionChipColor(permissionName: string): string {
  if (
    roleSearchDebounced.value.length >= 2 &&
    permissionName.toLowerCase().includes(roleSearchDebounced.value.toLowerCase())
  ) {
    return 'success'
  }
  return 'default'
}

// Methods
async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [rolesData, permsData] = await Promise.all([
      adminApi.getRoles(),
      adminApi.getPermissions(),
    ])
    roles.value = rolesData.roles || []
    if (rolesData.stats) stats.value = rolesData.stats
    permissions.value = permsData.permissions || []

    // Clear memoization cache when data updates
    memoizedFilterRoles.clear()
    memoizedFilterPermissions.clear()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Failed to load data'
  } finally {
    loading.value = false
  }
}

function openCreateRoleDialog() {
  newRole.value = { name: '', description: '' }
  roleDialog.value = true
}

function openCreatePermissionDialog() {
  newPermission.value = { name: '', description: '' }
  permDialog.value = true
}

async function handleCreateRole() {
  if (!newRole.value.name) {
    error.value = 'Role name is required'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await adminApi.createRole(newRole.value)
    success.value = `Role "${newRole.value.name}" created successfully`
    roleDialog.value = false
    await loadData()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to create role')
  } finally {
    loading.value = false
  }
}

async function handleCreatePermission() {
  if (!newPermission.value.name) {
    error.value = 'Permission name is required'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await adminApi.createPermission(newPermission.value)
    success.value = `Permission "${newPermission.value.name}" created successfully`
    permDialog.value = false
    await loadData()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to create permission')
  } finally {
    loading.value = false
  }
}

function confirmDeleteRole(role: Role) {
  roleToDelete.value = role
  deleteRoleConfirmation.value = ''
  deleteRoleDialog.value = true
}

function cancelDeleteRole() {
  deleteRoleDialog.value = false
  roleToDelete.value = null
  deleteRoleConfirmation.value = ''
}

async function handleConfirmDeleteRole() {
  if (deleteRoleConfirmation.value !== 'DELETE' || !roleToDelete.value || deletingRole.value) {
    return
  }

  deletingRole.value = true
  error.value = ''
  try {
    await adminApi.deleteRole(roleToDelete.value.id)
    success.value = `Role "${roleToDelete.value.name}" deleted successfully`

    // Close dialog
    cancelDeleteRole()

    // Reload data
    await loadData()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to delete role')
  } finally {
    deletingRole.value = false
  }
}

function handleEditRole(id: number) {
  const role = roles.value.find((r) => r.id === id)
  if (!role) {
    error.value = 'Role not found'
    return
  }
  editRoleForm.value = {
    id: role.id,
    name: role.name,
    description: role.description || '',
    permissions: role.permissions ? [...role.permissions] : [],
  }
  editRoleDialog.value = true
}

async function saveRoleEdit() {
  if (!editRoleForm.value.name) {
    error.value = 'Role name is required'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await adminApi.updateRole(editRoleForm.value.id, {
      name: editRoleForm.value.name,
      description: editRoleForm.value.description,
      permissions: editRoleForm.value.permissions,
    })
    success.value = `Role "${editRoleForm.value.name}" updated successfully`
    editRoleDialog.value = false
    await loadData()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to update role')
  } finally {
    loading.value = false
  }
}

async function showRoleDetails(id: number) {
  loading.value = true
  error.value = ''
  try {
    selectedRoleDetails.value = await adminApi.getRoleDetails(id)
    roleDetailsDialog.value = true
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to load role details')
  } finally {
    loading.value = false
  }
}

function editRoleFromDetails(id: number) {
  roleDetailsDialog.value = false
  handleEditRole(id)
}

function confirmDeletePermission(perm: Permission) {
  permToDelete.value = perm
  deletePermConfirmation.value = ''
  deletePermDialog.value = true
}

function cancelDeletePerm() {
  deletePermDialog.value = false
  permToDelete.value = null
  deletePermConfirmation.value = ''
}

async function handleConfirmDeletePerm() {
  if (deletePermConfirmation.value !== 'DELETE' || !permToDelete.value || deletingPerm.value) {
    return
  }

  deletingPerm.value = true
  error.value = ''
  try {
    await adminApi.deletePermission(permToDelete.value.id)
    success.value = `Permission "${permToDelete.value.name}" deleted successfully`

    // Close dialog
    cancelDeletePerm()

    // Reload data
    await loadData()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to delete permission')
  } finally {
    deletingPerm.value = false
  }
}

function handleEditPermission(id: number) {
  const perm = permissions.value.find((p) => p.id === id)
  if (!perm) {
    error.value = 'Permission not found'
    return
  }
  editPermForm.value = {
    id: perm.id,
    name: perm.name,
    description: perm.description || '',
  }
  editPermDialog.value = true
}

async function savePermissionEdit() {
  if (!editPermForm.value.name) {
    error.value = 'Permission name is required'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await adminApi.updatePermission(editPermForm.value.id, {
      name: editPermForm.value.name,
      description: editPermForm.value.description,
    })
    success.value = `Permission "${editPermForm.value.name}" updated successfully`
    editPermDialog.value = false
    await loadData()
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to update permission')
  } finally {
    loading.value = false
  }
}

async function showPermissionDetails(id: number) {
  loading.value = true
  error.value = ''
  try {
    selectedPermDetails.value = await adminApi.getPermissionDetails(id)
    permDetailsDialog.value = true
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to load permission details')
  } finally {
    loading.value = false
  }
}

function editPermissionFromDetails(id: number) {
  permDetailsDialog.value = false
  handleEditPermission(id)
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString()
  } catch {
    return dateString
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}

.gap-1 {
  gap: 0.25rem;
}

.clickable-name {
  cursor: pointer;
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
  transition: opacity 0.2s;
}

.clickable-name:hover {
  opacity: 0.7;
  text-decoration: underline;
}
</style>
