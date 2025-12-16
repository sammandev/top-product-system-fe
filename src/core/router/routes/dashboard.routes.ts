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
      title: 'Dashboard',
      icon: 'mdi-view-dashboard'
    }
  }
]
