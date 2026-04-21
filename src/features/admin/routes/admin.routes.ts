import type { RouteRecordRaw } from 'vue-router'

export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/users',
    name: 'UserManagement',
    component: () => import('../views/UserManagementView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: 'User Management',
      breadcrumb: [
        { title: 'System', disabled: true },
        { title: 'User Management', disabled: true },
      ],
      shell: {
        eyebrow: 'System',
        description: 'Manage user access, roles, and account state from the central administration workspace.',
        icon: 'mdi-account-group-outline',
        accent: 'warning',
      },
    },
  },
  {
    path: '/admin/cleanup',
    name: 'SystemCleanup',
    component: () => import('../views/SystemCleanupView.vue'),
    meta: {
      requiresAuth: true,
      requiresSuperAdmin: true,
      title: 'System Cleanup',
      breadcrumb: [
        { title: 'System', disabled: true },
        { title: 'System Cleanup', disabled: true },
      ],
      shell: {
        eyebrow: 'System',
        description: 'Remove stale data and maintenance debris without losing visibility into cleanup impact.',
        icon: 'mdi-delete-sweep-outline',
        accent: 'warning',
      },
    },
  },
  {
    path: '/admin/app-config',
    name: 'AppConfig',
    component: () => import('../views/AppConfigView.vue'),
    meta: {
      requiresAuth: true,
      requiresSuperAdmin: true,
      title: 'App Configuration',
      breadcrumb: [
        { title: 'System', disabled: true },
        { title: 'App Configuration', disabled: true },
      ],
      shell: {
        eyebrow: 'System',
        description: 'Control application-level settings, service endpoints, and UI behavior from one place.',
        icon: 'mdi-cog-outline',
        accent: 'warning',
      },
    },
  },
  {
    path: '/admin/menu-access',
    name: 'MenuAccess',
    component: () => import('../views/MenuAccessView.vue'),
    meta: {
      requiresAuth: true,
      requiresSuperAdmin: true,
      title: 'Menu Access Control',
      breadcrumb: [
        { title: 'System', disabled: true },
        { title: 'Menu Access Control', disabled: true },
      ],
      shell: {
        eyebrow: 'System',
        description: 'Shape the navigation surface by defining who can see and access each part of the workspace.',
        icon: 'mdi-shield-key-outline',
        accent: 'warning',
      },
    },
  },
  // Access Control route redirects to User Management (Roles tab)
  {
    path: '/admin/access-control',
    redirect: '/admin/users',
  },
  // Legacy RBAC route redirects to User Management (Roles tab)
  {
    path: '/admin/rbac',
    redirect: '/admin/users',
  },
]
