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
      shell: {
        eyebrow: 'Tools',
        description: 'Compare uploaded files side by side and isolate meaningful differences without leaving the workspace.',
        icon: 'mdi-file-compare-outline',
        accent: 'info',
      },
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
      shell: {
        eyebrow: 'Tools',
        description: 'Validate DVT and MC2 outputs with a targeted comparison flow built for fast mismatch review.',
        icon: 'mdi-compare-horizontal',
        accent: 'info',
      },
    },
  },
]
