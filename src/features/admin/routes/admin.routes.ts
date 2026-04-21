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
