/**
 * Admin API Client
 *
 * Unified API client for all administrative operations including user management and RBAC.
 * All endpoints require admin privileges.
 */

import { apiClient } from '@/core/api'

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface User {
  id: number
  username: string
  email: string | null
  roles: string[]
  role: string
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface UserStats {
  total_users: number
  active_users: number
  online_users: number
  new_users: number
}

export interface UserListResponse {
  users: User[]
  stats: UserStats
}

export interface CreateUserRequest {
  username: string
  email?: string | null
  password: string
  roles?: string[]
  role?: string
  is_active?: boolean
}

export interface UpdateUserRequest {
  email?: string | null
  roles?: string[]
  role?: string
  is_active?: boolean
  password?: string
}

export interface Role {
  id: number
  name: string
  description: string
  permissions: string[]
  users_count: number
}

export interface Permission {
  id: number
  name: string
  description?: string
}

export interface RBACStats {
  total_roles: number
  total_permissions: number
  users_with_roles: number
  active_sessions: number
}

export interface RoleListResponse {
  roles: Role[]
  stats: RBACStats
}

export interface PermissionListResponse {
  permissions: Permission[]
}

export interface RoleDetail {
  id: number
  name: string
  description: string
  permissions: string[]
  users: Array<{
    id: number
    username: string
    email: string | null
    is_active: boolean
  }>
  users_count: number
  created_at?: string
  updated_at?: string
}

export interface PermissionDetail {
  id: number
  name: string
  description: string
  roles: string[]
  usage_count: number
}

export interface UpdateRoleRequest {
  name?: string
  description?: string
  permissions?: string[]
}

export interface UpdatePermissionRequest {
  name?: string
  description?: string
}

// ============================================================================
// Access Control Interfaces
// ============================================================================

export interface AccessControlUser {
  id: number
  username: string
  email: string | null
  worker_id: string | null
  is_admin: boolean
  is_ptb_admin: boolean
  is_superuser: boolean
  is_staff: boolean
  is_active: boolean
  role: 'developer' | 'superadmin' | 'admin' | 'user' | 'guest'
  menu_permissions: Record<string, string[]> | null
  permission_updated_at: string | null
  last_login: string | null
  created_at: string
}

export interface AccessControlUserListResponse {
  users: AccessControlUser[]
  available_resources: string[]
  available_actions: string[]
  total: number
}

export interface MenuResourcesResponse {
  resources: string[]
  actions: string[]
  default_permissions: Record<string, string[]>
}

export interface UpdateAccessRequest {
  role?: string
  menu_permissions?: Record<string, string[]>
  is_active?: boolean
  is_ptb_admin?: boolean
  is_superuser?: boolean
  is_staff?: boolean
}

// ============================================================================
// Admin API
// ============================================================================

export const adminApi = {
  // ==================== User Management ====================

  /**
   * Get all users with statistics (admin only)
   */
  async getUsers(): Promise<UserListResponse> {
    const { data } = await apiClient.get<UserListResponse>('/api/admin/users')
    return data
  },

  /**
   * Create a new user (admin only)
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    const { data } = await apiClient.post<User>('/api/admin/users', userData)
    return data
  },

  /**
   * Update an existing user (admin only)
   */
  async updateUser(userId: number, userData: UpdateUserRequest): Promise<User> {
    const { data } = await apiClient.put<User>(`/api/admin/users/${userId}`, userData)
    return data
  },

  /**
   * Delete a user (admin only)
   */
  async deleteUser(userId: number): Promise<void> {
    await apiClient.delete(`/api/admin/users/${userId}`)
  },

  /**
   * Change user password (admin only)
   */
  async changeUserPassword(
    userId: number,
    newPassword: string,
  ): Promise<{
    user_id: number
    username: string
    changed: boolean
    revoked_tokens: boolean
  }> {
    const formData = new FormData()
    formData.append('new_password', newPassword)

    const { data } = await apiClient.post(`/api/admin/users/${userId}/password`, formData)
    return data
  },

  /**
   * Revoke all tokens for a user (admin only)
   */
  async revokeUserTokens(userId: number): Promise<{
    user_id: number
    username: string
    revoked: boolean
    token_version: number
  }> {
    const { data } = await apiClient.post(`/api/admin/users/${userId}/revoke`)
    return data
  },

  // ==================== RBAC Management ====================

  /**
   * Get all roles with statistics (admin only)
   */
  async getRoles(): Promise<RoleListResponse> {
    const { data } = await apiClient.get<RoleListResponse>('/api/admin/rbac/roles')
    return data
  },

  /**
   * Create a new role (admin only)
   */
  async createRole(params: {
    name: string
    description?: string
  }): Promise<{ id: number; name: string; description: string }> {
    const { data } = await apiClient.post('/api/admin/rbac/roles', params)
    return data
  },

  /**
   * Delete a role (admin only)
   */
  async deleteRole(roleId: number): Promise<void> {
    await apiClient.delete(`/api/admin/rbac/roles/${roleId}`)
  },

  /**
   * Get all permissions (admin only)
   */
  async getPermissions(): Promise<PermissionListResponse> {
    const { data } = await apiClient.get<PermissionListResponse>('/api/admin/rbac/permissions')
    return data
  },

  /**
   * Create a new permission (admin only)
   */
  async createPermission(params: {
    name: string
    description?: string
  }): Promise<{ id: number; name: string; description: string }> {
    const { data } = await apiClient.post('/api/admin/rbac/permissions', params)
    return data
  },

  /**
   * Delete a permission (admin only)
   */
  async deletePermission(permissionId: number): Promise<void> {
    await apiClient.delete(`/api/admin/rbac/permissions/${permissionId}`)
  },

  /**
   * Get role details (admin only)
   */
  async getRoleDetails(roleId: number): Promise<RoleDetail> {
    const { data } = await apiClient.get<RoleDetail>(`/api/admin/rbac/roles/${roleId}`)
    return data
  },

  /**
   * Update role (admin only)
   */
  async updateRole(roleId: number, request: UpdateRoleRequest): Promise<Role> {
    const { data } = await apiClient.put<Role>(`/api/admin/rbac/roles/${roleId}`, request)
    return data
  },

  /**
   * Get permission details (admin only)
   */
  async getPermissionDetails(permissionId: number): Promise<PermissionDetail> {
    const { data } = await apiClient.get<PermissionDetail>(
      `/api/admin/rbac/permissions/${permissionId}`,
    )
    return data
  },

  /**
   * Update permission (admin only)
   */
  async updatePermission(
    permissionId: number,
    request: UpdatePermissionRequest,
  ): Promise<Permission> {
    const { data } = await apiClient.put<Permission>(
      `/api/admin/rbac/permissions/${permissionId}`,
      request,
    )
    return data
  },

  /**
   * Grant a permission to a role (admin only)
   */
  async grantPermissionToRole(
    roleId: number,
    permissionId: number,
  ): Promise<{
    role: string
    granted: string
  }> {
    const { data } = await apiClient.post(`/api/admin/rbac/roles/${roleId}/grant`, {
      perm_id: permissionId,
    })
    return data
  },

  /**
   * Revoke a permission from a role (admin only)
   */
  async revokePermissionFromRole(
    roleId: number,
    permissionId: number,
  ): Promise<{
    role: string
    revoked: string
  }> {
    const { data } = await apiClient.post(`/api/admin/rbac/roles/${roleId}/revoke`, {
      perm_id: permissionId,
    })
    return data
  },

  /**
   * Assign a role to a user (admin only)
   */
  async assignRoleToUser(
    userId: number,
    roleId: number,
  ): Promise<{
    user: string
    role: string
    assigned: boolean
  }> {
    const { data } = await apiClient.post(`/api/admin/rbac/users/${userId}/assign-role`, {
      role_id: roleId,
    })
    return data
  },

  /**
   * Remove a role from a user (admin only)
   */
  async removeRoleFromUser(
    userId: number,
    roleId: number,
  ): Promise<{
    user: string
    role: string
    removed: boolean
  }> {
    const { data } = await apiClient.post(`/api/admin/rbac/users/${userId}/remove-role`, {
      role_id: roleId,
    })
    return data
  },

  // ==================== Access Control ====================

  /**
   * Get all users with access control settings (superadmin/developer only)
   */
  async getAccessControlUsers(): Promise<AccessControlUserListResponse> {
    const { data } = await apiClient.get<AccessControlUserListResponse>(
      '/api/admin/access-control/users',
    )
    return data
  },

  /**
   * Get available menu resources and actions
   */
  async getMenuResources(): Promise<MenuResourcesResponse> {
    const { data } = await apiClient.get<MenuResourcesResponse>(
      '/api/admin/access-control/resources',
    )
    return data
  },

  /**
   * Update a user's access control settings (superadmin/developer only)
   */
  async updateUserAccess(userId: number, request: UpdateAccessRequest): Promise<AccessControlUser> {
    const { data } = await apiClient.patch<AccessControlUser>(
      `/api/admin/access-control/users/${userId}`,
      request,
    )
    return data
  },
}
