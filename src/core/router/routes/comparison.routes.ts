/**
 * Comparison Routes
 *
 * Routes for file comparison features
 */

import type { RouteRecordRaw } from 'vue-router'

export const comparisonRoutes: RouteRecordRaw[] = [
  {
    path: '/compare',
    name: 'Compare',
    component: () => import('@/features/comparison/views/CompareView.vue'),
    meta: {
      requiresAuth: true,
      title: 'File Comparison',
      icon: 'mdi-file-compare',
      breadcrumb: [
        { title: 'Dashboard', to: '/dashboard' },
        { title: 'File Comparison', disabled: true },
      ],
    },
  },
  {
    path: '/compare/dvt-mc2',
    name: 'DvtMc2Compare',
    component: () => import('@/features/comparison/views/DvtMc2CompareView.vue'),
    meta: {
      requiresAuth: true,
      title: 'DVT-MC2 Compare',
      icon: 'mdi-file-compare',
      breadcrumb: [
        { title: 'Dashboard', to: '/dashboard' },
        { title: 'DVT-MC2 Compare', disabled: true },
      ],
    },
  },
]
