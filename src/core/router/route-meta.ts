import 'vue-router'

export interface AppRouteBreadcrumbItem {
  title: string
  to?: string
  disabled?: boolean
  icon?: string
}

export interface AppRouteShellMeta {
  eyebrow?: string
  description?: string
  icon?: string
  accent?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'
}

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresGuest?: boolean
    requiresAdmin?: boolean
    requiresSuperAdmin?: boolean
    roles?: string[]
    permissions?: string[]
    title?: string
    icon?: string
    layout?: string
    breadcrumb?: AppRouteBreadcrumbItem[]
    shell?: AppRouteShellMeta
  }
}