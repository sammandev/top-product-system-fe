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
            <Icon :icon="acLoading ? 'mdi:loading' : 'mdi:refresh'" :class="{ 'animate-spin': acLoading }" />
            <span>{{ acLoading ? 'Refreshing...' : 'Refresh Access Data' }}</span>
          </button>
        </div>
      </div>

      <div v-if="error" class="user-management-notice user-management-notice--error mb-4" role="alert">
        <div class="user-management-notice__content">
          <Icon icon="mdi:alert-circle-outline" class="user-management-notice__icon" />
          <div>
            <strong>Admin action failed</strong>
            <p>{{ error }}</p>
          </div>
        </div>
        <button type="button" aria-label="Dismiss error notice" @click="error = ''">
          <Icon icon="mdi:close" />
        </button>
      </div>

      <div v-if="success" class="user-management-notice user-management-notice--success mb-4" role="status">
        <div class="user-management-notice__content">
          <Icon icon="mdi:check-circle-outline" class="user-management-notice__icon" />
          <div>
            <strong>Update complete</strong>
            <p>{{ success }}</p>
          </div>
        </div>
        <button type="button" aria-label="Dismiss success notice" @click="success = ''">
          <Icon icon="mdi:close" />
        </button>
      </div>

      <AppTabs v-model="activeTab" :items="tabItems">
        <template #panel-users>
          <div class="user-management-tab-content">
            <div class="user-management-stats-grid">
              <article class="user-management-stat-card">
                <div class="user-management-stat-card__top">
                  <span>Total Users</span>
                  <div class="user-management-stat-card__icon user-management-stat-card__icon--primary">
                    <Icon icon="mdi:account-group-outline" />
                  </div>
                </div>
                <strong>{{ stats.total_users }}</strong>
                <small>All accounts stored in system</small>
              </article>

              <article class="user-management-stat-card">
                <div class="user-management-stat-card__top">
                  <span>Active Users</span>
                  <div class="user-management-stat-card__icon user-management-stat-card__icon--success">
                    <Icon icon="mdi:account-check-outline" />
                  </div>
                </div>
                <strong>{{ stats.active_users }}</strong>
                <small>Can authenticate and access tools</small>
              </article>

              <article class="user-management-stat-card">
                <div class="user-management-stat-card__top">
                  <span class="inline-flex items-center gap-1.5">
                    <span class="user-management-live-dot" />
                    Online Now
                  </span>
                  <div class="user-management-stat-card__icon user-management-stat-card__icon--info">
                    <Icon icon="mdi:account-clock-outline" />
                  </div>
                </div>
                <strong>{{ stats.online_users }}</strong>
                <small>Recent authenticated session activity</small>
              </article>

              <article class="user-management-stat-card">
                <div class="user-management-stat-card__top">
                  <span>New This Month</span>
                  <div class="user-management-stat-card__icon user-management-stat-card__icon--warning">
                    <Icon icon="mdi:account-plus-outline" />
                  </div>
                </div>
                <strong>{{ stats.new_users }}</strong>
                <small>Created during current calendar month</small>
              </article>
            </div>

            <section class="user-management-panel">
              <div class="user-management-panel__header user-management-panel__header--compact">
                <div class="flex items-center gap-2.5">
                  <div>
                    <p class="user-management-panel__eyebrow">Directory</p>
                    <h2>User Accounts</h2>
                  </div>
                  <span class="user-management-count-pill">{{ filteredUsers.length }} users</span>
                </div>

                <div class="user-management-search">
                  <Icon icon="mdi:magnify" class="user-management-search__icon" />
                  <input
                    v-model="search"
                    type="search"
                    placeholder="Search by username, email, or role..."
                  >
                  <button
                    v-if="search"
                    type="button"
                    class="user-management-search__clear"
                    aria-label="Clear search"
                    @click="search = ''"
                  >
                    <Icon icon="mdi:close-circle" />
                  </button>
                </div>
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
                    <span class="user-management-user-cell__info">
                      <strong class="user-management-user-cell__name">{{ slotProps.data.username }}</strong>
                      <small class="user-management-user-cell__email">{{ slotProps.data.email || 'No email configured' }}</small>
                    </span>
                  </button>
                </template>

                <template #cell-role="slotProps">
                  <span class="user-management-badge" :class="getRoleBadgeClass(String(slotProps.data.role || 'user'))">
                    <Icon :icon="getRoleIcon(String(slotProps.data.role || 'user'))" class="mr-1" />
                    {{ String(slotProps.data.role || 'user').toUpperCase() }}
                  </span>
                </template>

                <template #cell-is_active="slotProps">
                  <button
                    type="button"
                    class="user-management-status-toggle"
                    :class="slotProps.data.is_active ? 'is-active' : 'is-inactive'"
                    :disabled="togglingUserId === slotProps.data.id"
                    :title="slotProps.data.is_active ? 'Click to deactivate user' : 'Click to activate user'"
                    @click="toggleUserStatus(slotProps.data as User)"
                  >
                    <Icon
                      v-if="togglingUserId === slotProps.data.id"
                      icon="mdi:loading"
                      class="animate-spin mr-1"
                    />
                    <Icon
                      v-else
                      :icon="slotProps.data.is_active ? 'mdi:check-circle' : 'mdi:close-circle'"
                      class="mr-1"
                    />
                    {{ togglingUserId === slotProps.data.id ? 'Updating...' : slotProps.data.is_active ? 'Active' : 'Inactive' }}
                  </button>
                </template>

                <template #cell-last_login="slotProps">
                  <span class="user-management-time-cell">
                    <Icon icon="mdi:clock-outline" class="user-management-time-cell__icon" />
                    {{ formatDate(slotProps.data.last_login as string | null) }}
                  </span>
                </template>

                <template #cell-actions="slotProps">
                  <div class="user-management-actions">
                    <button
                      type="button"
                      :aria-label="`View details for ${slotProps.data.username}`"
                      title="View user details"
                      @click="showUserDetails(slotProps.data as User)"
                    >
                      <Icon icon="mdi:card-account-details-outline" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      :aria-label="`Edit ${slotProps.data.username}`"
                      title="Edit user profile"
                      @click="editUser(slotProps.data as User)"
                    >
                      <Icon icon="mdi:pencil-outline" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      :aria-label="`Reset password for ${slotProps.data.username}`"
                      title="Reset user password"
                      @click="openResetPasswordDialog(slotProps.data as User)"
                    >
                      <Icon icon="mdi:lock-reset" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      class="is-danger"
                      :aria-label="`Delete ${slotProps.data.username}`"
                      title="Delete user account"
                      @click="confirmDelete(slotProps.data as User)"
                    >
                      <Icon icon="mdi:delete-outline" aria-hidden="true" />
                    </button>
                  </div>
                </template>

                <template #empty>
                  <div class="user-management-empty-state">
                    <div class="user-management-empty-state__icon">
                      <Icon icon="mdi:account-search-outline" />
                    </div>
                    <strong>No users found</strong>
                    <p>Adjust search filters or create a new user account.</p>
                    <button
                      v-if="search"
                      type="button"
                      class="user-management-button user-management-button--secondary mt-2"
                      @click="search = ''"
                    >
                      Clear Search
                    </button>
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
                <div class="flex items-center gap-2.5">
                  <div>
                    <p class="user-management-panel__eyebrow">Access Control</p>
                    <h2>Role & Permission Review</h2>
                  </div>
                  <span class="user-management-count-pill">{{ filteredAcUsers.length }} users</span>
                </div>

                <div class="user-management-search">
                  <Icon icon="mdi:magnify" class="user-management-search__icon" />
                  <input
                    v-model="acSearch"
                    type="search"
                    placeholder="Search users, roles, or flags..."
                  >
                  <button
                    v-if="acSearch"
                    type="button"
                    class="user-management-search__clear"
                    aria-label="Clear access search"
                    @click="acSearch = ''"
                  >
                    <Icon icon="mdi:close-circle" />
                  </button>
                </div>
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
                    <span class="user-management-user-cell__info">
                      <strong class="user-management-user-cell__name">{{ slotProps.data.username }}</strong>
                      <small v-if="slotProps.data.email" class="user-management-user-cell__email">{{ slotProps.data.email }}</small>
                    </span>
                  </div>
                </template>

                <template #cell-role="slotProps">
                  <span class="user-management-badge" :class="getRoleBadgeClass(String(slotProps.data.role || 'user'))">
                    <Icon :icon="getRoleIcon(String(slotProps.data.role || 'user'))" class="mr-1" />
                    {{ String(slotProps.data.role || 'user').toUpperCase() }}
                  </span>
                </template>

                <template #cell-is_active="slotProps">
                  <span class="user-management-badge" :class="slotProps.data.is_active ? 'user-management-badge--success' : 'user-management-badge--danger'">
                    <Icon :icon="slotProps.data.is_active ? 'mdi:check-circle' : 'mdi:close-circle'" class="mr-1" />
                    {{ slotProps.data.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </template>

                <template #cell-flags="slotProps">
                  <div class="user-management-flag-list">
                    <span v-if="slotProps.data.is_ptb_admin" class="user-management-badge user-management-badge--info">
                      <Icon icon="mdi:shield-star-outline" class="mr-1" />PTB Admin
                    </span>
                    <span v-if="slotProps.data.is_superuser" class="user-management-badge user-management-badge--purple">
                      <Icon icon="mdi:crown-outline" class="mr-1" />Superuser
                    </span>
                    <span v-if="slotProps.data.is_staff" class="user-management-badge user-management-badge--teal">
                      <Icon icon="mdi:badge-account-outline" class="mr-1" />Staff
                    </span>
                    <span v-if="slotProps.data.is_admin" class="user-management-badge user-management-badge--warning">
                      <Icon icon="mdi:shield-account-outline" class="mr-1" />Admin
                    </span>
                    <span v-if="!hasAnyFlags(slotProps.data as AccessControlUser)" class="user-management-badge user-management-badge--muted">
                      None
                    </span>
                  </div>
                </template>

                <template #cell-menu_permissions="slotProps">
                  <span v-if="slotProps.data.role === 'developer'" class="user-management-inline-note user-management-inline-note--success">
                    <Icon icon="mdi:shield-check" class="mr-1" />Full access (Developer)
                  </span>
                  <span v-else-if="slotProps.data.role === 'superadmin'" class="user-management-inline-note user-management-inline-note--info">
                    <Icon icon="mdi:shield-check" class="mr-1" />Full access (Super Admin)
                  </span>
                  <span v-else-if="slotProps.data.role === 'admin'" class="user-management-inline-note user-management-inline-note--warning">
                    <Icon icon="mdi:shield-outline" class="mr-1" />Admin access
                  </span>
                  <span v-else-if="slotProps.data.role === 'guest'" class="user-management-inline-note">
                    <Icon icon="mdi:account-outline" class="mr-1" />Guest (limited)
                  </span>
                  <span v-else-if="!slotProps.data.menu_permissions" class="user-management-inline-note user-management-inline-note--muted">
                    <Icon icon="mdi:help-circle-outline" class="mr-1" />Not configured
                  </span>
                  <span v-else class="user-management-inline-note user-management-inline-note--primary">
                    <Icon icon="mdi:format-list-checks" class="mr-1" />{{ Object.keys(slotProps.data.menu_permissions).length }} resources
                  </span>
                </template>

                <template #cell-last_login="slotProps">
                  <span class="user-management-time-cell">
                    {{ formatDateFull(slotProps.data.last_login as string | null) }}
                  </span>
                </template>

                <template #cell-actions="slotProps">
                  <div class="user-management-actions">
                    <button
                      v-if="slotProps.data.role !== 'developer'"
                      type="button"
                      :aria-label="`Edit access for ${slotProps.data.username}`"
                      title="Edit role and access flags"
                      @click="openAccessEditDialog(slotProps.data as AccessControlUser)"
                    >
                      <Icon icon="mdi:account-cog-outline" aria-hidden="true" />
                    </button>
                    <button
                      v-if="slotProps.data.role !== 'developer'"
                      type="button"
                      :aria-label="`Menu permissions for ${slotProps.data.username}`"
                      title="Configure menu permissions"
                      @click="openPermissionsDialog(slotProps.data as AccessControlUser)"
                    >
                      <Icon icon="mdi:shield-key-outline" aria-hidden="true" />
                    </button>
                    <span v-if="slotProps.data.role === 'developer'" class="user-management-badge user-management-badge--muted">
                      <Icon icon="mdi:lock" class="mr-1" />Protected
                    </span>
                  </div>
                </template>

                <template #empty>
                  <div class="user-management-empty-state">
                    <div class="user-management-empty-state__icon">
                      <Icon icon="mdi:shield-search" />
                    </div>
                    <strong>No access-control users found</strong>
                    <p>Refresh dataset or adjust search query.</p>
                  </div>
                </template>
              </AppDataGrid>
            </section>
          </section>
        </template>

        <template #panel-catalog>
          <div class="user-management-tab-content">
            <RolesPermissionsPanel />
          </div>
        </template>
      </AppTabs>

      <!-- User Details Dialog -->
      <AppFormDialog
        v-model="detailsDialog"
        title="User Profile Details"
        :description="selectedUser ? `Review identity, role assignments, and timestamps for ${selectedUser.username}.` : ''"
        size="lg"
        submit-label="Edit Profile"
        cancel-label="Close"
        @submit="editUserFromDetails"
      >
        <div v-if="selectedUser" class="user-management-details-modal">
          <div class="user-management-details-hero">
            <div class="user-management-details-hero__avatar">
              {{ getInitial(selectedUser.username) }}
            </div>
            <div class="user-management-details-hero__main">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="user-management-details-hero__name">{{ selectedUser.username }}</h3>
                <span class="user-management-badge" :class="getRoleBadgeClass(String(selectedUser.role || 'user'))">
                  <Icon :icon="getRoleIcon(String(selectedUser.role || 'user'))" class="mr-1" />
                  {{ String(selectedUser.role || 'user').toUpperCase() }}
                </span>
                <span class="user-management-badge" :class="selectedUser.is_active ? 'user-management-badge--success' : 'user-management-badge--danger'">
                  <Icon :icon="selectedUser.is_active ? 'mdi:check-circle' : 'mdi:close-circle'" class="mr-1" />
                  {{ selectedUser.is_active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <p class="user-management-details-hero__email">{{ selectedUser.email || 'No email configured' }}</p>
            </div>
          </div>

          <div class="user-management-dialog-grid">
            <section class="user-management-dialog-card">
              <div class="user-management-dialog-card__title">
                <Icon icon="mdi:account-box-outline" />
                <span>Account Identity</span>
              </div>
              <div class="user-management-detail-list">
                <div class="user-management-detail-item">
                  <span>Username</span>
                  <strong>{{ selectedUser.username }}</strong>
                </div>
                <div class="user-management-detail-item">
                  <span>Email Address</span>
                  <strong>{{ selectedUser.email || 'Not provided' }}</strong>
                </div>
                <div class="user-management-detail-item">
                  <span>Assigned Role</span>
                  <strong>{{ String(selectedUser.role || 'user').toUpperCase() }}</strong>
                </div>
                <div class="user-management-detail-item">
                  <span>Account Status</span>
                  <strong :class="selectedUser.is_active ? 'text-[var(--app-success)]' : 'text-[var(--app-danger)]'">
                    {{ selectedUser.is_active ? 'Active (Can login)' : 'Inactive (Access blocked)' }}
                  </strong>
                </div>
              </div>
            </section>

            <section class="user-management-dialog-card">
              <div class="user-management-dialog-card__title">
                <Icon icon="mdi:timeline-clock-outline" />
                <span>Activity & Lifecycle</span>
              </div>
              <div class="user-management-detail-list">
                <div class="user-management-detail-item">
                  <span>Last Login</span>
                  <strong>{{ formatDateFull(selectedUser.last_login) }}</strong>
                </div>
                <div class="user-management-detail-item">
                  <span>Created Date</span>
                  <strong>{{ formatDateFull(selectedUser.created_at) }}</strong>
                </div>
                <div class="user-management-detail-item">
                  <span>Last Updated</span>
                  <strong>{{ formatDateFull(selectedUser.updated_at) }}</strong>
                </div>
              </div>
            </section>
          </div>
        </div>
      </AppFormDialog>

      <!-- Delete User Dialog -->
      <AppConfirmDialog
        v-model="deleteDialog"
        v-model:typed-value="deleteConfirmation"
        title="Delete User Account"
        description="The user account, authentication records, and permissions will be permanently removed."
        :target="userToDelete ? `${userToDelete.username} · ${userToDelete.email || 'No email'} · ${userToDelete.role || 'user'}` : ''"
        target-label="User to delete"
        confirm-label="Delete User"
        :busy="deleting"
        require-typed
        @confirm="handleDeleteUser"
        @cancel="cancelDelete"
      >
        Deleting this user revokes active sessions immediately. This action cannot be undone.
      </AppConfirmDialog>

      <!-- Create / Edit User Dialog -->
      <AppFormDialog
        v-model="dialog"
        :title="editMode ? 'Edit User Profile' : 'Create New User'"
        :description="editMode ? 'Update account identity, system role, and access status.' : 'Register a new account credentials and system role.'"
        size="lg"
        :submit-label="editMode ? 'Save Changes' : 'Create User'"
        busy-label="Saving…"
        :busy="loading"
        :submit-disabled="!currentUserFormValid"
        @submit="saveUser"
      >
        <div v-if="editMode" class="user-management-modal-banner mb-4">
          <div class="user-management-avatar user-management-avatar--small">
            {{ getInitial(String(currentUser.username || 'U')) }}
          </div>
          <div>
            <strong>Editing {{ currentUser.username }}</strong>
            <p class="text-xs text-[var(--app-muted)]">Changes take effect immediately on next request.</p>
          </div>
        </div>

        <div class="user-management-form-grid">
          <AppFormField
            v-slot="{ id }"
            label="Username"
            :required="!editMode"
            :hint="editMode ? 'Username cannot be modified once created.' : 'Required for sign-in identification.'"
          >
            <div class="user-management-input-wrapper" :class="{ 'is-disabled': editMode }">
              <Icon icon="mdi:account-outline" class="user-management-input-icon" />
              <input
                :id="id"
                v-model="currentUser.username"
                type="text"
                :disabled="editMode"
                placeholder="Enter username"
                autocomplete="off"
              >
              <Icon v-if="editMode" icon="mdi:lock" class="user-management-input-locked-icon" />
            </div>
          </AppFormField>

          <AppFormField
            v-slot="{ id }"
            label="Email Address"
            show-optional
            hint="Used for notifications and account communications."
          >
            <div class="user-management-input-wrapper">
              <Icon icon="mdi:email-outline" class="user-management-input-icon" />
              <input
                :id="id"
                v-model="currentUser.email"
                type="email"
                placeholder="user@example.com"
                autocomplete="off"
              >
            </div>
          </AppFormField>

          <AppFormField
            v-slot="{ id, describedBy }"
            :label="editMode ? 'New Password' : 'Password'"
            :required="!editMode"
            :show-optional="editMode"
            :hint="editMode ? 'Leave blank to keep existing password unchanged.' : 'Set an initial secure password for first sign-in.'"
            full
          >
            <div class="user-management-input-wrapper">
              <Icon icon="mdi:lock-outline" class="user-management-input-icon" />
              <input
                :id="id"
                v-model="currentUser.password"
                :aria-describedby="describedBy"
                :type="showUserPassword ? 'text' : 'password'"
                :placeholder="editMode ? 'Leave blank to keep current password' : 'Enter a secure initial password'"
                autocomplete="new-password"
              >
              <button
                type="button"
                class="user-management-input-eye"
                :aria-label="showUserPassword ? 'Hide password' : 'Show password'"
                @click="showUserPassword = !showUserPassword"
              >
                <Icon :icon="showUserPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" />
              </button>
            </div>
          </AppFormField>

          <AppFormField
            v-slot="{ id }"
            label="System Role"
            required
            hint="Controls authorization levels and menu access."
          >
            <AppSelect
              :input-id="id"
              v-model="currentUser.role"
              :options="userRoleSelectOptions"
              :searchable="false"
            />
          </AppFormField>

          <div class="user-management-switch-card">
            <div class="user-management-switch-card__info">
              <Icon icon="mdi:account-check-outline" class="user-management-switch-card__icon" />
              <div>
                <strong>Active Account Status</strong>
                <p>Enable user to sign in and access authorized features.</p>
              </div>
            </div>
            <label class="user-management-switch">
              <input v-model="currentUser.is_active" type="checkbox">
              <span class="user-management-switch__slider" />
            </label>
          </div>
        </div>
      </AppFormDialog>

      <!-- Reset Password Dialog -->
      <AppFormDialog
        v-model="resetPasswordDialog"
        title="Reset User Password"
        :description="passwordResetUser ? `Set a new password for ${passwordResetUser.username}.` : ''"
        submit-label="Reset Password"
        busy-label="Resetting…"
        :busy="resettingPassword"
        :submit-disabled="!passwordResetValid"
        :error="passwordResetMismatch ? 'Both passwords must match.' : ''"
        @submit="submitPasswordReset"
        @cancel="closeResetPasswordDialog"
      >
        <div v-if="passwordResetUser" class="user-management-modal-banner mb-4">
          <div class="user-management-avatar user-management-avatar--small">
            {{ getInitial(passwordResetUser.username) }}
          </div>
          <div>
            <strong>{{ passwordResetUser.username }}</strong>
            <p class="text-xs text-[var(--app-muted)]">{{ passwordResetUser.email || 'No email configured' }}</p>
          </div>
        </div>

        <div class="user-management-dialog-stack">
          <AppFormField v-slot="{ id }" label="New Password" required hint="At least 6 characters recommended.">
            <div class="user-management-input-wrapper">
              <Icon icon="mdi:lock-outline" class="user-management-input-icon" />
              <input
                :id="id"
                v-model="passwordResetForm.password"
                :type="showResetPassword ? 'text' : 'password'"
                placeholder="Enter new password"
                autocomplete="new-password"
              >
              <button
                type="button"
                class="user-management-input-eye"
                :aria-label="showResetPassword ? 'Hide password' : 'Show password'"
                @click="showResetPassword = !showResetPassword"
              >
                <Icon :icon="showResetPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" />
              </button>
            </div>
          </AppFormField>

          <AppFormField v-slot="{ id }" label="Confirm New Password" required>
            <div class="user-management-input-wrapper">
              <Icon icon="mdi:lock-check-outline" class="user-management-input-icon" />
              <input
                :id="id"
                v-model="passwordResetForm.confirmPassword"
                :type="showResetConfirmPassword ? 'text' : 'password'"
                placeholder="Confirm new password"
                autocomplete="new-password"
              >
              <button
                type="button"
                class="user-management-input-eye"
                :aria-label="showResetConfirmPassword ? 'Hide password' : 'Show password'"
                @click="showResetConfirmPassword = !showResetConfirmPassword"
              >
                <Icon :icon="showResetConfirmPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" />
              </button>
            </div>
          </AppFormField>

          <div
            v-if="passwordResetForm.password && passwordResetForm.confirmPassword"
            class="user-management-match-badge"
            :class="passwordResetMismatch ? 'is-mismatch' : 'is-match'"
          >
            <Icon :icon="passwordResetMismatch ? 'mdi:alert-circle-outline' : 'mdi:check-circle-outline'" />
            <span>{{ passwordResetMismatch ? 'Passwords do not match' : 'Passwords match' }}</span>
          </div>
        </div>
      </AppFormDialog>

      <!-- Edit Access Dialog -->
      <AppFormDialog
        v-model="acEditDialog"
        title="Edit Access & Role"
        :description="acEditingUser ? `Adjust role and permission flags for ${acEditingUser.username}.` : ''"
        submit-label="Save Access"
        busy-label="Saving…"
        :busy="acSaving"
        persistent
        @submit="saveUserAccess"
      >
        <div v-if="acEditingUser" class="user-management-modal-banner mb-4">
          <div class="user-management-avatar user-management-avatar--small">
            {{ getInitial(acEditingUser.username) }}
          </div>
          <div>
            <strong>{{ acEditingUser.username }}</strong>
            <p class="text-xs text-[var(--app-muted)]">{{ acEditingUser.email || 'No email' }} · Current role: {{ acEditingUser.role }}</p>
          </div>
        </div>

        <div class="user-management-form-grid">
          <AppFormField v-slot="{ id }" label="Assigned Role" required full hint="Controls authorization scope across all modules.">
            <AppSelect
              :input-id="id"
              v-model="acEditForm.role"
              :options="accessRoleSelectOptions"
              :searchable="false"
            />
          </AppFormField>

          <div class="user-management-switch-card">
            <div class="user-management-switch-card__info">
              <Icon icon="mdi:account-check-outline" class="user-management-switch-card__icon" />
              <div>
                <strong>Active Account</strong>
                <p>User can authenticate and access system.</p>
              </div>
            </div>
            <label class="user-management-switch">
              <input v-model="acEditForm.is_active" type="checkbox">
              <span class="user-management-switch__slider" />
            </label>
          </div>

          <div class="user-management-switch-card">
            <div class="user-management-switch-card__info">
              <Icon icon="mdi:shield-star-outline" class="user-management-switch-card__icon text-[var(--app-info)]" />
              <div>
                <strong>PTB Admin Flag</strong>
                <p>Grants administrative access to PTB management modules.</p>
              </div>
            </div>
            <label class="user-management-switch">
              <input v-model="acEditForm.is_ptb_admin" type="checkbox">
              <span class="user-management-switch__slider" />
            </label>
          </div>
        </div>
      </AppFormDialog>

      <!-- Menu Permissions Dialog -->
      <AppFormDialog
        v-model="permissionsDialog"
        title="Menu Permissions"
        :description="permissionsUser ? `Configure fine-grained resource permissions for ${permissionsUser.username}.` : ''"
        size="xl"
        submit-label="Save Permissions"
        busy-label="Saving…"
        :busy="acSaving"
        persistent
        @submit="savePermissions"
      >
        <template #footer-aside>
          <div class="user-management-permission-counter">
            <Icon icon="mdi:shield-check-outline" />
            <span><strong>{{ selectedPermissionCount }}</strong> of {{ totalPermissionCount }} permissions assigned</span>
          </div>
        </template>

        <div class="user-management-permissions-toolbar">
          <div class="user-management-search user-management-search--compact">
            <Icon icon="mdi:magnify" class="user-management-search__icon" />
            <input
              v-model="permissionMatrixSearch"
              type="search"
              placeholder="Filter resources..."
            >
          </div>

          <div class="user-management-permissions-actions">
            <button
              type="button"
              class="user-management-button user-management-button--secondary user-management-button--sm"
              @click="selectAllPermissions"
            >
              <Icon icon="mdi:checkbox-multiple-marked-outline" />
              <span>Select All</span>
            </button>
            <button
              type="button"
              class="user-management-button user-management-button--secondary user-management-button--sm"
              @click="clearAllPermissions"
            >
              <Icon icon="mdi:checkbox-multiple-blank-outline" />
              <span>Clear All</span>
            </button>
            <button
              type="button"
              class="user-management-button user-management-button--secondary user-management-button--sm"
              @click="applyDefaultPermissions"
            >
              <Icon icon="mdi:restore" />
              <span>Apply Defaults</span>
            </button>
          </div>
        </div>

        <div class="user-management-permissions-table-wrap">
          <DataTable
            :value="filteredPermissionMatrixRows"
            dataKey="resource"
            class="p-datatable-sm user-management-permissions-grid app-interactive-datatable"
          >
            <Column field="resource" header="Resource">
              <template #body="slotProps">
                <div class="user-management-resource-cell">
                  <div class="user-management-resource-cell__icon">
                    <Icon :icon="getResourceIcon(slotProps.data.resource)" />
                  </div>
                  <span class="user-management-resource-cell__name">{{ formatResourceName(slotProps.data.resource) }}</span>
                  <button
                    type="button"
                    class="user-management-row-toggle"
                    title="Toggle all actions for this resource"
                    @click="toggleRowPermissions(slotProps.data.resource)"
                  >
                    <Icon icon="mdi:toggle-switch-outline" />
                  </button>
                </div>
              </template>
            </Column>
            <Column v-for="action in acAvailableActions" :key="action" :field="action" :header="capitalize(action)">
              <template #body="slotProps">
                <div class="flex justify-center">
                  <label class="user-management-checkbox-wrapper">
                    <input
                      class="user-management-permission-checkbox"
                      :aria-label="`${capitalize(action)} ${formatResourceName(slotProps.data.resource)}`"
                      :checked="hasPermission(slotProps.data.resource, action)"
                      type="checkbox"
                      @change="togglePermission(slotProps.data.resource, action, ($event.target as HTMLInputElement).checked)"
                    >
                  </label>
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </AppFormDialog>
    </section>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { queryKeys } from '@/core/query'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import {
  AppConfirmDialog,
  AppDataGrid,
  AppFormDialog,
  AppFormField,
  AppSelect,
  AppTabs,
} from '@/shared'
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

const RolesPermissionsPanel = defineAsyncComponent(
  () => import('../components/RolesPermissionsPanel.vue'),
)

const router = useRouter()
const authStore = useAuthStore()
const queryClient = useQueryClient()

const activeTab = useTabPersistence<'users' | 'roles' | 'catalog'>('tab', 'users')
const error = ref('')
const success = ref('')

const search = ref('')
const dialog = ref(false)
const editMode = ref(false)

const detailsDialog = ref(false)
const selectedUser = ref<User | null>(null)

const showUserPassword = ref(false)
const showResetPassword = ref(false)
const showResetConfirmPassword = ref(false)
const permissionMatrixSearch = ref('')

const defaultStats: UserStats = {
  total_users: 0,
  active_users: 0,
  online_users: 0,
  new_users: 0,
}

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

const acSaving = ref(false)
const acSearch = ref('')

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

const usersQuery = useQuery({
  queryKey: queryKeys.admin.users(),
  queryFn: adminApi.getUsers,
})

const accessControlQuery = useQuery({
  queryKey: queryKeys.admin.accessControl(),
  queryFn: async () => {
    const [usersResponse, resourcesResponse] = await Promise.all([
      adminApi.getAccessControlUsers(),
      adminApi.getMenuResources(),
    ])

    return { usersResponse, resourcesResponse }
  },
  enabled: computed(() => authStore.isSuperAdmin),
})

const loading = computed(() => usersQuery.isFetching.value)
const users = computed(() => usersQuery.data.value?.users ?? [])
const stats = computed(() => usersQuery.data.value?.stats ?? defaultStats)
const acLoading = computed(() => accessControlQuery.isFetching.value)
const acUsers = computed(() => accessControlQuery.data.value?.usersResponse.users ?? [])
const acAvailableResources = computed(
  () => accessControlQuery.data.value?.resourcesResponse.resources ?? [],
)
const acAvailableActions = computed(
  () => accessControlQuery.data.value?.resourcesResponse.actions ?? [],
)
const acDefaultPermissions = computed(
  () => accessControlQuery.data.value?.resourcesResponse.default_permissions ?? {},
)

const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() })
const invalidateAccessControl = () =>
  queryClient.invalidateQueries({ queryKey: queryKeys.admin.accessControl() })

const deleteUserMutation = useMutation({
  mutationFn: adminApi.deleteUser,
  onSuccess: invalidateUsers,
})

const updateUserMutation = useMutation({
  mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
    adminApi.updateUser(id, data),
  onSuccess: invalidateUsers,
})

const createUserMutation = useMutation({
  mutationFn: adminApi.createUser,
  onSuccess: invalidateUsers,
})

const updateAccessMutation = useMutation({
  mutationFn: ({
    id,
    data,
  }: {
    id: number
    data: Parameters<typeof adminApi.updateUserAccess>[1]
  }) => adminApi.updateUserAccess(id, data),
  onSuccess: invalidateAccessControl,
})

const tabItems = computed(() => {
  const items = [{ value: 'users', label: 'Users', icon: 'mdi-account-group' }]
  if (authStore.isSuperAdmin) {
    items.push({ value: 'roles', label: 'Roles & Access', icon: 'mdi-shield-account' })
    items.push({ value: 'catalog', label: 'Role Catalog', icon: 'mdi-shield-key' })
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

const userRoleSelectOptions = userRoleOptions.map((option) => ({
  label: option.title,
  value: option.value,
}))

const accessRoleSelectOptions = computed(() =>
  accessRoleOptions.value.map((option) => ({
    label: option.title,
    value: option.value,
  })),
)

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
      String(user.role || 'user')
        .toLowerCase()
        .includes(query)
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

const filteredPermissionMatrixRows = computed(() => {
  const query = permissionMatrixSearch.value.trim().toLowerCase()
  if (!query) return permissionMatrixRows.value

  return permissionMatrixRows.value.filter(
    (row) =>
      row.resource.toLowerCase().includes(query) ||
      formatResourceName(row.resource).toLowerCase().includes(query),
  )
})

const currentUserFormValid = computed(() => {
  const username = currentUser.value.username?.trim() ?? ''
  const password = currentUser.value.password?.trim() ?? ''
  return Boolean(username) && (editMode.value ? true : Boolean(password))
})

const passwordResetValid = computed(() => {
  return (
    passwordResetForm.value.password.trim().length >= 1 &&
    passwordResetForm.value.password === passwordResetForm.value.confirmPassword
  )
})

const passwordResetMismatch = computed(
  () =>
    passwordResetForm.value.confirmPassword.length > 0 &&
    passwordResetForm.value.password !== passwordResetForm.value.confirmPassword,
)

const totalPermissionCount = computed(
  () => acAvailableResources.value.length * acAvailableActions.value.length,
)

const selectedPermissionCount = computed(() =>
  acAvailableResources.value.reduce(
    (total, resource) =>
      total + acAvailableActions.value.filter((action) => hasPermission(resource, action)).length,
    0,
  ),
)

async function loadUsers() {
  const result = await usersQuery.refetch()
  if (result.error) {
    error.value = getApiErrorDetail(result.error, 'Failed to load users')
  }
}

function openCreateDialog() {
  editMode.value = false
  showUserPassword.value = false
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
  showUserPassword.value = false
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
    await deleteUserMutation.mutateAsync(userToDelete.value.id)
    success.value = `User "${userToDelete.value.username}" deleted successfully`
    cancelDelete()
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
    await updateUserMutation.mutateAsync({ id: user.id, data: updateData })
    success.value = `User "${user.username}" ${action} successfully`

    if (!newStatus && loggedInUser.value && user.id === loggedInUser.value.id) {
      setTimeout(async () => {
        await authStore.logout()
        router.push('/login')
      }, 1200)
    }
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, `Failed to ${action} user`)
    await usersQuery.refetch()
  } finally {
    togglingUserId.value = null
  }
}

async function saveUser() {
  try {
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

      await updateUserMutation.mutateAsync({
        id: currentUser.value.id as number,
        data: updateData,
      })
      success.value = 'User updated successfully'
    } else {
      const createData: CreateUserRequest = {
        username: String(currentUser.value.username || ''),
        email: currentUser.value.email || null,
        password: String(currentUser.value.password || ''),
        role: currentUser.value.role,
        is_active: currentUser.value.is_active,
      }

      await createUserMutation.mutateAsync(createData)
      success.value = 'User created successfully'
    }

    dialog.value = false
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to save user')
  }
}

function openResetPasswordDialog(user: User) {
  passwordResetUser.value = user
  passwordResetForm.value = {
    password: '',
    confirmPassword: '',
  }
  showResetPassword.value = false
  showResetConfirmPassword.value = false
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
  const result = await accessControlQuery.refetch()
  if (result.error) {
    error.value = getApiErrorDetail(result.error, 'Failed to load access control data')
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
    await updateAccessMutation.mutateAsync({
      id: acEditingUser.value.id,
      data: {
        role: acEditForm.value.role,
        is_active: acEditForm.value.is_active,
        is_ptb_admin: acEditForm.value.is_ptb_admin,
      },
    })

    success.value = `Access settings updated for ${acEditingUser.value.username}`
    acEditDialog.value = false
  } catch (err: unknown) {
    error.value = getApiErrorDetail(err, 'Failed to update access settings')
  } finally {
    acSaving.value = false
  }
}

function openPermissionsDialog(user: AccessControlUser) {
  permissionsUser.value = user
  permissionMatrixSearch.value = ''
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

  permissionsForm.value[resource] = permissionsForm.value[resource].filter(
    (entry) => entry !== action,
  )
  if (permissionsForm.value[resource].length === 0) {
    delete permissionsForm.value[resource]
  }
}

function toggleRowPermissions(resource: string) {
  const currentlyAllSelected = acAvailableActions.value.every((action) =>
    hasPermission(resource, action),
  )

  if (currentlyAllSelected) {
    delete permissionsForm.value[resource]
  } else {
    permissionsForm.value[resource] = [...acAvailableActions.value]
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
    await updateAccessMutation.mutateAsync({
      id: permissionsUser.value.id,
      data: {
        menu_permissions: permissionsForm.value,
      },
    })

    success.value = `Menu permissions updated for ${permissionsUser.value.username}`
    permissionsDialog.value = false
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

function getRoleIcon(role: string): string {
  switch (role) {
    case 'developer':
      return 'mdi:code-braces'
    case 'superadmin':
      return 'mdi:crown-outline'
    case 'admin':
      return 'mdi:shield-account-outline'
    case 'user':
      return 'mdi:account-outline'
    case 'guest':
      return 'mdi:account-badge-outline'
    default:
      return 'mdi:account-outline'
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
  if (!authStore.isSuperAdmin && activeTab.value !== 'users') {
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

.user-management-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
}

.user-management-header__copy {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.user-management-header__icon {
  display: grid;
  place-items: center;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 0.85rem;
  background: var(--user-management-accent-soft);
  color: var(--user-management-accent);
}

.user-management-header__icon :deep(svg) {
  width: 1.6rem;
  height: 1.6rem;
}

.user-management-header__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.user-management-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.5rem;
  padding: 0.55rem 1rem;
  border-radius: 0.65rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.user-management-button--sm {
  min-height: 2.15rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
}

.user-management-button :deep(svg) {
  width: 1.1rem;
  height: 1.1rem;
}

.user-management-button--primary {
  background: var(--user-management-accent);
  color: #ffffff;
}

.user-management-button--primary:hover:not(:disabled) {
  background: var(--app-accent-strong);
}

.user-management-button--secondary {
  background: var(--app-panel-strong);
  color: var(--app-ink);
  border-color: var(--app-border);
}

.user-management-button--secondary:hover:not(:disabled) {
  border-color: var(--user-management-accent);
  color: var(--user-management-accent);
}

.user-management-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.user-management-notice {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid transparent;
}

.user-management-notice__content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-management-notice__icon {
  font-size: 1.35rem;
  flex-shrink: 0;
}

.user-management-notice strong {
  display: block;
  font-size: 0.875rem;
}

.user-management-notice p {
  margin: 0;
  font-size: 0.825rem;
}

.user-management-notice button {
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

.user-management-notice button:hover {
  opacity: 1;
}

.user-management-notice--error {
  background: var(--user-management-danger-soft);
  border-color: var(--user-management-danger-line);
  color: var(--user-management-danger);
}

.user-management-notice--success {
  background: var(--user-management-success-soft);
  border-color: var(--user-management-success-line);
  color: var(--user-management-success);
}

.user-management-tab-content {
  display: grid;
  gap: 1.25rem;
}

.user-management-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.user-management-stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1.15rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
}

.user-management-stat-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-management-stat-card__top span {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--app-muted);
}

.user-management-stat-card__icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  font-size: 1.1rem;
}

.user-management-stat-card__icon--primary {
  background: var(--user-management-accent-soft);
  color: var(--user-management-accent);
}

.user-management-stat-card__icon--success {
  background: var(--user-management-success-soft);
  color: var(--user-management-success);
}

.user-management-stat-card__icon--info {
  background: var(--user-management-info-soft);
  color: var(--user-management-info);
}

.user-management-stat-card__icon--warning {
  background: var(--user-management-warning-soft);
  color: var(--user-management-warning);
}

.user-management-stat-card strong {
  font-size: 1.75rem;
  color: var(--app-ink);
  line-height: 1.2;
}

.user-management-stat-card small {
  color: var(--app-muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

.user-management-live-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--user-management-success);
  display: inline-block;
  box-shadow: 0 0 0 2px var(--user-management-success-soft);
  animation: user-management-pulse 2s infinite;
}

@keyframes user-management-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.user-management-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
}

.user-management-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.user-management-panel__header--compact {
  flex-wrap: wrap;
}

.user-management-panel__eyebrow {
  margin: 0;
  color: var(--user-management-accent);
  font-size: 0.72rem;
  font-weight: 700;
}

.user-management-panel__header h2 {
  margin: 0.15rem 0 0;
  color: var(--app-ink);
  font-size: 1.15rem;
  font-weight: 700;
}

.user-management-count-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--app-canvas-strong);
  color: var(--app-muted);
}

.user-management-search {
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

.user-management-search--compact {
  height: 2.35rem;
  min-width: min(100%, 16rem);
}

.user-management-search:focus-within {
  border-color: var(--user-management-accent);
  box-shadow: 0 0 0 3px var(--user-management-accent-soft);
}

.user-management-search__icon {
  font-size: 1.15rem;
  color: var(--app-muted);
  flex-shrink: 0;
}

.user-management-search input {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--app-ink);
  font-size: 0.875rem;
  outline: none;
}

.user-management-search__clear {
  border: 0;
  background: transparent;
  color: var(--app-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0.2rem;
  font-size: 1rem;
}

.user-management-search__clear:hover {
  color: var(--app-ink);
}

.user-management-user-cell,
.user-management-user-inline {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 0;
  background: transparent;
  padding: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.user-management-user-cell:hover .user-management-user-cell__name {
  color: var(--user-management-accent);
}

.user-management-user-cell__info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.user-management-user-cell__name {
  font-size: 0.875rem;
  color: var(--app-ink);
  transition: color 0.15s ease;
}

.user-management-user-cell__email {
  font-size: 0.75rem;
  color: var(--app-muted);
}

.user-management-avatar {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  background: var(--user-management-accent-soft);
  color: var(--user-management-accent);
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.user-management-avatar--small {
  width: 1.9rem;
  height: 1.9rem;
  font-size: 0.75rem;
}

.user-management-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  background: var(--app-canvas-strong);
  color: var(--app-ink);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
}

.user-management-badge--warning {
  background: var(--user-management-warning-soft);
  color: var(--user-management-warning);
}

.user-management-badge--info {
  background: var(--user-management-info-soft);
  color: var(--user-management-info);
}

.user-management-badge--teal {
  background: var(--user-management-accent-soft);
  color: var(--user-management-accent);
}

.user-management-badge--purple {
  background: var(--user-management-info-soft);
  color: var(--user-management-info);
}

.user-management-badge--success {
  background: var(--user-management-success-soft);
  color: var(--user-management-success);
}

.user-management-badge--danger {
  background: var(--user-management-danger-soft);
  color: var(--user-management-danger);
}

.user-management-badge--muted {
  background: var(--app-canvas-strong);
  color: var(--app-muted);
}

.user-management-status-toggle {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.user-management-status-toggle.is-active {
  background: var(--user-management-success-soft);
  color: var(--user-management-success);
  border-color: var(--user-management-success-line);
}

.user-management-status-toggle.is-inactive {
  background: var(--user-management-danger-soft);
  color: var(--user-management-danger);
  border-color: var(--user-management-danger-line);
}

.user-management-status-toggle:hover:not(:disabled) {
  transform: translateY(-1px);
}

.user-management-status-toggle:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.user-management-time-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--app-muted);
}

.user-management-time-cell__icon {
  font-size: 0.95rem;
}

.user-management-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  justify-content: flex-end;
}

.user-management-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 0.6rem;
  background: var(--app-panel);
  color: var(--app-ink);
  border: 1px solid var(--app-border);
  cursor: pointer;
  transition: all 0.15s ease;
}

.user-management-actions button:hover:not(:disabled) {
  border-color: var(--user-management-accent);
  color: var(--user-management-accent);
  background: var(--user-management-accent-soft);
}

.user-management-actions button.is-danger:hover:not(:disabled) {
  border-color: var(--user-management-danger);
  color: var(--user-management-danger);
  background: var(--user-management-danger-soft);
}

.user-management-actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.user-management-empty-state,
.user-management-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem 1.5rem;
  text-align: center;
}

.user-management-empty-state__icon {
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

.user-management-empty-state strong,
.user-management-loading-state strong {
  font-size: 1rem;
  color: var(--app-ink);
}

.user-management-empty-state p,
.user-management-loading-state p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--app-muted);
}

.user-management-loading-state__spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 3px solid var(--user-management-accent-soft);
  border-top-color: var(--user-management-accent);
  border-radius: 999px;
  animation: user-management-spin 0.8s linear infinite;
}

@keyframes user-management-spin {
  to { transform: rotate(360deg); }
}

.user-management-flag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.user-management-inline-note {
  display: inline-flex;
  align-items: center;
  font-size: 0.8rem;
  color: var(--app-muted);
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

.user-management-inline-note--primary {
  color: var(--user-management-accent);
  font-weight: 600;
}

/* Modal and Form Styles */
.user-management-modal-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
}

.user-management-details-modal {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.user-management-details-hero {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem;
  border: 1px solid var(--app-border);
  border-radius: 0.85rem;
  background: var(--app-surface);
}

.user-management-details-hero__avatar {
  display: grid;
  place-items: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 999px;
  background: var(--user-management-accent-soft);
  color: var(--user-management-accent);
  font-weight: 800;
  font-size: 1.35rem;
  flex-shrink: 0;
}

.user-management-details-hero__main {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.user-management-details-hero__name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--app-ink);
}

.user-management-details-hero__email {
  margin: 0;
  font-size: 0.85rem;
  color: var(--app-muted);
}

.user-management-dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.user-management-dialog-card {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1.15rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel);
}

.user-management-dialog-card__title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--user-management-accent);
}

.user-management-dialog-card__title :deep(svg) {
  font-size: 1.05rem;
}

.user-management-detail-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-management-detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--app-border);
}

.user-management-detail-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.user-management-detail-item span {
  font-size: 0.75rem;
  color: var(--app-muted);
  font-weight: 500;
}

.user-management-detail-item strong {
  font-size: 0.875rem;
  color: var(--app-ink);
}

.user-management-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.user-management-dialog-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.user-management-input-wrapper {
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

.user-management-input-wrapper:focus-within {
  border-color: var(--user-management-accent);
  box-shadow: 0 0 0 3px var(--user-management-accent-soft);
}

.user-management-input-wrapper.is-disabled {
  background: var(--app-canvas-strong);
  opacity: 0.85;
  cursor: not-allowed;
}

.user-management-input-icon {
  font-size: 1.15rem;
  color: var(--app-muted);
  flex-shrink: 0;
}

.user-management-input-locked-icon {
  font-size: 1rem;
  color: var(--app-muted);
  flex-shrink: 0;
}

.user-management-input-wrapper input {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--app-ink);
  font-size: 0.875rem;
  outline: none;
}

.user-management-input-eye {
  border: 0;
  background: transparent;
  color: var(--app-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  font-size: 1.15rem;
  border-radius: 0.4rem;
}

.user-management-input-eye:hover {
  color: var(--app-ink);
}

.user-management-switch-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1.1rem;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
  grid-column: 1 / -1;
}

.user-management-switch-card__info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-management-switch-card__icon {
  font-size: 1.35rem;
  color: var(--user-management-accent);
  flex-shrink: 0;
}

.user-management-switch-card__info strong {
  display: block;
  font-size: 0.875rem;
  color: var(--app-ink);
}

.user-management-switch-card__info p {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: var(--app-muted);
}

.user-management-switch {
  position: relative;
  display: inline-block;
  width: 2.75rem;
  height: 1.5rem;
  flex-shrink: 0;
}

.user-management-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.user-management-switch__slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--app-canvas-strong);
  border: 1px solid var(--app-border);
  transition: 0.2s;
  border-radius: 999px;
}

.user-management-switch__slider:before {
  position: absolute;
  content: "";
  height: 1.15rem;
  width: 1.15rem;
  left: 0.15rem;
  bottom: 0.1rem;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.user-management-switch input:checked + .user-management-switch__slider {
  background-color: var(--user-management-accent);
  border-color: var(--user-management-accent);
}

.user-management-switch input:checked + .user-management-switch__slider:before {
  transform: translateX(1.2rem);
}

.user-management-match-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.85rem;
  border-radius: 0.6rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.user-management-match-badge.is-match {
  background: var(--user-management-success-soft);
  color: var(--user-management-success);
}

.user-management-match-badge.is-mismatch {
  background: var(--user-management-danger-soft);
  color: var(--user-management-danger);
}

.user-management-permission-counter {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.825rem;
  color: var(--app-muted);
}

.user-management-permission-counter strong {
  color: var(--user-management-accent);
}

.user-management-permissions-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
}

.user-management-permissions-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.user-management-permissions-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel);
}

.user-management-resource-cell {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.user-management-resource-cell__icon {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.4rem;
  background: var(--user-management-accent-soft);
  color: var(--user-management-accent);
  font-size: 1rem;
  flex-shrink: 0;
}

.user-management-resource-cell__name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--app-ink);
}

.user-management-row-toggle {
  border: 0;
  background: transparent;
  color: var(--app-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 0.2rem;
  font-size: 1rem;
  margin-left: auto;
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.user-management-row-toggle:hover {
  opacity: 1;
  color: var(--user-management-accent);
}

.user-management-checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.user-management-permission-checkbox {
  width: 1.15rem;
  height: 1.15rem;
  accent-color: var(--user-management-accent);
  cursor: pointer;
}

@media (max-width: 960px) {
  .user-management-header {
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

  .user-management-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .user-management-form-grid,
  .user-management-dialog-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .user-management-stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
