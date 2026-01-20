/**
 * Menu Access API Types
 */

export interface MenuItemData {
  id: number
  menu_key: string
  title: string
  path: string
  icon: string
  parent_key: string | null
  section: 'main' | 'tools' | 'system'
  sort_order: number
  is_active: boolean
  description: string | null
  role_access: string[]
}

export interface MenuListResponse {
  menus: MenuItemData[]
  available_roles: string[]
}

export interface UserMenuData {
  menu_key: string
  title: string
  path: string
  icon: string
  parent_key: string | null
  section: 'main' | 'tools' | 'system'
  sort_order: number
}

export interface UserMenusResponse {
  menus: UserMenuData[]
}

export interface UpdateMenuAccessRequest {
  menu_key: string
  role_name: string
  can_view: boolean
}

export interface BulkUpdateMenuAccessRequest {
  updates: UpdateMenuAccessRequest[]
}
