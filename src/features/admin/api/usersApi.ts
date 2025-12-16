/**
 * User Management API Service
 */

import apiClient from '@/core/api/client'

export interface UserSchema {
  id: number
  username: string
  email: string | null
  roles: string[]
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface UserStatsResponse {
    total_users: number
    active_users: number
    online_users: number
    new_users: number
}

export interface UserListResponse {
    users: UserSchema[]
    stats: UserStatsResponse
}

export interface UserCreateRequest {
    username: string
    email?: string | null
    password: string
    roles?: string[]
    is_active?: boolean
}

export interface UserUpdateRequest {
    email?: string | null
    roles?: string[]
    is_active?: boolean
    password?: string
}

/**
 * Get all users with statistics
 */
export async function getUsers(): Promise<UserListResponse> {
    const response = await apiClient.get<UserListResponse>('/api/admin/users')
    return response.data
}

/**
 * Create a new user
 */
export async function createUser(userData: UserCreateRequest): Promise<UserSchema> {
    const response = await apiClient.post<UserSchema>('/api/admin/users', userData)
    return response.data
}

/**
 * Update an existing user
 */
export async function updateUser(userId: number, userData: UserUpdateRequest): Promise<UserSchema> {
    const response = await apiClient.put<UserSchema>(`/api/admin/users/${userId}`, userData)
    return response.data
}

/**
 * Delete a user
 */
export async function deleteUser(userId: number): Promise<void> {
    await apiClient.delete(`/api/admin/users/${userId}`)
}
