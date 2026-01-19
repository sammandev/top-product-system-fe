export interface AppConfig {
  name: string
  version: string
  description?: string | null
  updated_at?: string | null
  updated_by?: string | null
}

export interface AppConfigUpdateRequest {
  name: string
  version: string
  description?: string | null
}
