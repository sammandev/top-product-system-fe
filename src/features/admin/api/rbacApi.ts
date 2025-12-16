/**
 * RBAC Management API Service
 */

import apiClient from '@/core/api/client'

export interface RoleSchema {
  id: number
  name: string
  description: string
  permissions: string[]
  users_count: number
}

export interface RBACStatsResponse {
  total_roles: number
  total_permissions: number
  users_with_roles: number
  active_sessions: number
}

export interface RoleListResponse {
  roles: RoleSchema[]
  stats: RBACStatsResponse
}

/**
 * Get all roles with statistics
 */
export async function getRoles(): Promise<RoleListResponse> {
  const response = await apiClient.get<RoleListResponse>('/api/admin/rbac/roles')
  return response.data
}
