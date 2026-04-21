/**
 * Common Type Definitions
 * Shared types used across the application
 */

// API Response wrapper
export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  status: number
  timestamp?: string
}

// Error handling
export interface ApiError {
  detail: string
  status_code: number
  error_code?: string
  field_errors?: Record<string, string[]>
}

export interface ValidationError {
  field: string
  message: string
  code?: string
}

// Pagination
export interface PaginationParams {
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

// Sorting
export interface SortConfig {
  field: string
  order: 'asc' | 'desc'
}

// Filtering
export interface FilterConfig {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in'
  value: unknown
}

// File handling
export interface FileUpload {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export interface FileInfo {
  name: string
  size: number
  type: string
  lastModified: number
  url?: string
}

// Form handling
export interface FormField<T = unknown> {
  value: T
  error: string | null
  touched: boolean
  dirty: boolean
  valid: boolean
}

export interface FormState {
  [key: string]: FormField
}

// Async operations
export interface AsyncState<T = unknown> {
  data: T | null
  loading: boolean
  error: string | null
  timestamp?: number
}

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

// Generic ID type
export type ID = string | number

// Nullable type
export type Nullable<T> = T | null

// Optional properties
export type Optional<T> = T | undefined

// Deep partial
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Enum helper
export type ValueOf<T> = T[keyof T]

// Component props helper
// biome-ignore lint/suspicious/noExplicitAny: required for generic type utility
export type ComponentProps<T extends abstract new (...args: any[]) => any> =
  InstanceType<T> extends { $props: infer P } ? P : never

// Route meta
export interface RouteMeta {
  requiresAuth?: boolean
  requiresGuest?: boolean
  roles?: string[]
  permissions?: string[]
  title?: string
  icon?: string
  layout?: string
  breadcrumb?: string
}

// Notification
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  closable?: boolean
}

// Dialog
export interface DialogConfig {
  title?: string
  message: string
  type?: 'confirm' | 'alert' | 'prompt'
  confirmText?: string
  cancelText?: string
  persistent?: boolean
}

// Theme
export type ThemeMode = 'light' | 'dark' | 'auto'

export interface ThemeConfig {
  mode: ThemeMode
  primaryColor?: string
  accentColor?: string
}

// Breadcrumb
export interface BreadcrumbItem {
  text: string
  to?: string
  disabled?: boolean
  icon?: string
}

// Menu item
export interface MenuItem {
  id: string
  title: string
  icon?: string
  path?: string
  children?: MenuItem[]
  badge?: string | number
  disabled?: boolean
  divider?: boolean
  header?: boolean
}

// Table
export interface TableHeader {
  key: string
  title: string
  sortable?: boolean
  align?: 'start' | 'center' | 'end'
  width?: string | number
  fixed?: boolean
}

export interface TableOptions {
  page: number
  itemsPerPage: number
  sortBy?: SortConfig[]
  search?: string
}
