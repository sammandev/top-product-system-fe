/**
 * Menu Access API Service
 * 
 * Handles menu access management for role-based menu visibility
 */

import apiClient from '@/core/api/client'
import type {
  MenuListResponse,
  UserMenusResponse,
  UpdateMenuAccessRequest,
  BulkUpdateMenuAccessRequest
} from '../types/menuAccess.types'

const BASE_URL = '/api/admin/menu-access'

/**
 * Menu Access API
 */
export const menuAccessApi = {
  /**
   * Initialize menu definitions in the database (Superadmin only)
   */
  async initializeMenus(): Promise<{ message: string; count: number }> {
    const response = await apiClient.post<{ message: string; count: number }>(
      `${BASE_URL}/initialize`
    )
    return response.data
  },

  /**
   * Get all menu definitions with role access (Superadmin only)
   */
  async getAllMenus(): Promise<MenuListResponse> {
    const response = await apiClient.get<MenuListResponse>(`${BASE_URL}/menus`)
    return response.data
  },

  /**
   * Update menu access for a specific role (Superadmin only)
   */
  async updateMenuAccess(request: UpdateMenuAccessRequest): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>(
      `${BASE_URL}/access`,
      request
    )
    return response.data
  },

  /**
   * Bulk update menu access (Superadmin only)
   */
  async bulkUpdateMenuAccess(request: BulkUpdateMenuAccessRequest): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>(
      `${BASE_URL}/access/bulk`,
      request
    )
    return response.data
  },

  /**
   * Get current user's accessible menus
   */
  async getMyMenus(): Promise<UserMenusResponse> {
    const response = await apiClient.get<UserMenusResponse>(`${BASE_URL}/my-menus`)
    return response.data
  },

  /**
   * Get guest accessible menus (no auth required)
   */
  async getGuestMenus(): Promise<UserMenusResponse> {
    const response = await apiClient.get<UserMenusResponse>(`${BASE_URL}/guest-menus`)
    return response.data
  }
}
