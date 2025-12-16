import { apiClient } from '@/core/api'

/**
 * RBAC API Client
 * 
 * Handles all RBAC (Role-Based Access Control) operations
 */

// Types
export interface Role {
  id: number
  name: string
  description?: string
  permissions?: string[]
  users_count?: number
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

/**
 * RBAC API
 */
export const rbacApi = {
  // ==================== Roles ====================
  
  /**
   * Get all roles (admin endpoint)
   */
  async getRoles(): Promise<{ roles: Role[]; stats?: RBACStats }> {
    const { data } = await apiClient.get('/api/rbac/admin/roles')
    return data
  },

  /**
   * Get roles (non-admin endpoint)
   */
  async listRoles(): Promise<{ roles: Role[] }> {
    const { data } = await apiClient.get('/api/rbac/roles')
    return data
  },

  /**
   * Create a new role (admin only)
   */
  async createRole(params: {
    name: string
    description?: string
  }): Promise<{ id: number; name: string; description: string }> {
    const formData = new FormData()
    formData.append('name', params.name)
    if (params.description) {
      formData.append('description', params.description)
    }

    const { data } = await apiClient.post('/api/rbac/roles', formData)
    return data
  },

  /**
   * Delete a role (admin only)
   */
  async deleteRole(roleId: number): Promise<{ deleted: number }> {
    const { data } = await apiClient.delete(`/api/rbac/roles/${roleId}`)
    return data
  },

  // ==================== Permissions ====================
  
  /**
   * Get all permissions (admin only)
   */
  async getPermissions(): Promise<{ permissions: Permission[] }> {
    const { data } = await apiClient.get('/api/rbac/permissions')
    return data
  },

  /**
   * Create a new permission (admin only)
   */
  async createPermission(params: {
    name: string
    description?: string
  }): Promise<{ id: number; name: string; description: string }> {
    const formData = new FormData()
    formData.append('name', params.name)
    if (params.description) {
      formData.append('description', params.description)
    }

    const { data } = await apiClient.post('/api/rbac/permissions', formData)
    return data
  },

  /**
   * Delete a permission (admin only)
   */
  async deletePermission(permissionId: number): Promise<{ deleted: number }> {
    const { data } = await apiClient.delete(`/api/rbac/permissions/${permissionId}`)
    return data
  },

  // ==================== Role <-> Permission Links ====================
  
  /**
   * Grant a permission to a role (admin only)
   */
  async grantPermission(params: {
    roleId: number
    permissionId: number
  }): Promise<{ role: string; granted: string }> {
    const formData = new FormData()
    formData.append('perm_id', params.permissionId.toString())

    const { data } = await apiClient.post(`/api/rbac/roles/${params.roleId}/grant`, formData)
    return data
  },

  /**
   * Revoke a permission from a role (admin only)
   */
  async revokePermission(params: {
    roleId: number
    permissionId: number
  }): Promise<{ role: string; revoked: string }> {
    const formData = new FormData()
    formData.append('perm_id', params.permissionId.toString())

    const { data } = await apiClient.post(`/api/rbac/roles/${params.roleId}/revoke`, formData)
    return data
  },

  // ==================== User <-> Role Links ====================
  
  /**
   * Assign a role to a user (admin only)
   */
  async assignRole(params: {
    userId: number
    roleId: number
  }): Promise<{ user: string; role: string; assigned: boolean }> {
    const formData = new FormData()
    formData.append('role_id', params.roleId.toString())

    const { data } = await apiClient.post(`/api/rbac/users/${params.userId}/assign-role`, formData)
    return data
  },

  /**
   * Remove a role from a user (admin only)
   */
  async removeRole(params: {
    userId: number
    roleId: number
  }): Promise<{ user: string; role: string; removed: boolean }> {
    const formData = new FormData()
    formData.append('role_id', params.roleId.toString())

    const { data } = await apiClient.post(`/api/rbac/users/${params.userId}/remove-role`, formData)
    return data
  },

  // ==================== Permission Checks ====================
  
  /**
   * Check if current user has read permission
   */
  async checkReadPermission(): Promise<{ ok: boolean; message: string }> {
    const { data } = await apiClient.get('/api/rbac/check-read-permission')
    return data
  }
}
