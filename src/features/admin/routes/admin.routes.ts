import type { RouteRecordRaw } from 'vue-router';

export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/rbac',
    name: 'RBACManagement',
    component: () => import('../views/RBACManagementView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: 'RBAC Management'
    }
  },
  {
    path: '/admin/users',
    name: 'UserManagement',
    component: () => import('../views/UserManagementView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: 'User Management'
    }
  },
  {
    path: '/admin/cleanup',
    name: 'SystemCleanup',
    component: () => import('../views/SystemCleanupView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: 'System Cleanup'
    }
  },
  {
    path: '/admin/app-config',
    name: 'AppConfig',
    component: () => import('../views/AppConfigView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: 'App Configuration'
    }
  }
];
