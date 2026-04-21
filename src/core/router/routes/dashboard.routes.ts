/**
 * Dashboard Routes
 *
 * Routes for the main dashboard
 */

import type { RouteRecordRaw } from 'vue-router'

export const dashboardRoutes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/features/dashboard/views/DashboardView.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      title: 'Dashboard',
      icon: 'mdi-view-dashboard',
      breadcrumb: [
        { title: 'Operations', disabled: true },
        { title: 'Dashboard', disabled: true },
      ],
      shell: {
        eyebrow: 'Main',
        description: 'Track system health, recent activity, and the current operational snapshot at a glance.',
        icon: 'mdi-view-dashboard-outline',
        accent: 'primary',
      },
    },
  },
]
