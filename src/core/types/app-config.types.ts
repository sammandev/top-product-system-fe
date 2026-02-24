export interface AppConfig {
  name: string
  version: string
  description?: string | null
  tab_title?: string | null
  favicon_url?: string | null
  updated_at?: string | null
  updated_by?: string | null
}

export interface AppConfigUpdateRequest {
  name: string
  version: string
  description?: string | null
  tab_title?: string | null
}

// ===== iPLAS Token Types =====

export interface IplasToken {
  id: number
  site: string
  base_url: string
  token_masked: string
  label: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  updated_by: string | null
}

export interface IplasTokenCreateRequest {
  site: string
  base_url: string
  token_value: string
  label?: string | null
  is_active?: boolean
}

export interface IplasTokenUpdateRequest {
  site?: string | null
  base_url?: string | null
  token_value?: string | null
  label?: string | null
  is_active?: boolean | null
}

export interface IplasTokenListResponse {
  tokens: IplasToken[]
  total: number
}

// ===== SFISTSP Config Types =====

export interface SfistspConfigItem {
  id: number
  base_url: string
  program_id: string
  password_masked: string
  timeout: number
  label: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  updated_by: string | null
}

export interface SfistspConfigCreateRequest {
  base_url: string
  program_id: string
  program_password: string
  timeout?: number
  label?: string | null
  is_active?: boolean
}

export interface SfistspConfigUpdateRequest {
  base_url?: string | null
  program_id?: string | null
  program_password?: string | null
  timeout?: number | null
  label?: string | null
  is_active?: boolean | null
}

export interface SfistspConfigListResponse {
  configs: SfistspConfigItem[]
  total: number
}

// ===== Guest Credential Types =====

export interface GuestCredential {
  id: number
  username_masked: string
  label: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  updated_by: string | null
}

export interface GuestCredentialCreateRequest {
  username: string
  password: string
  label?: string | null
  is_active?: boolean
}

export interface GuestCredentialUpdateRequest {
  username?: string | null
  password?: string | null
  label?: string | null
  is_active?: boolean | null
}

export interface GuestCredentialListResponse {
  credentials: GuestCredential[]
  total: number
}
