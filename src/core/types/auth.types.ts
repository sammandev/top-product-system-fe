/**
 * Authentication Type Definitions
 * Central location for all authentication-related types
 */

export interface LoginRequest {
  username: string
  password: string
}

export interface ExternalLoginRequest {
  username: string
  password: string
  dut_username?: string
  dut_password?: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  dut_access_token?: string
  dut_refresh_token?: string
}

export interface RefreshTokenRequest {
  refresh_token: string
}

/**
 * User role in the access control hierarchy.
 * - developer: Hardcoded identity, auto-assigned. Cannot be modified via UI.
 * - superadmin: Granted by developer only. Full system access.
 * - user: Regular authenticated user with menu_permissions-based access.
 */
export type UserRole = 'developer' | 'superadmin' | 'user'

/**
 * Per-resource CRUD permissions.
 * Keys are resource names (e.g. "dashboard", "parsing").
 * Values are arrays of allowed actions (e.g. ["create", "read", "update", "delete"]).
 */
export type MenuPermissions = Record<string, string[]>

export interface User {
  id: number
  username: string
  email?: string
  roles: string[]
  permissions: string[]
  is_active?: boolean
  is_admin?: boolean
  is_ptb_admin?: boolean
  is_superuser?: boolean
  is_staff?: boolean
  worker_id?: string | null
  role?: UserRole
  menu_permissions?: MenuPermissions | null
  created_at?: string
  updated_at?: string
}

export interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  dutAccessToken: string | null
  dutRefreshToken: string | null
  user: User | null
  loading: boolean
  error: string | null
  loginType: 'local' | 'external'
}

export interface TokenPayload {
  sub: string
  exp: number
  iat: number
  type: string
  ver?: number
}
