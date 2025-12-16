/**
 * Conversion Tools Routes
 * 
 * Routes for file format conversion utilities
 */

import type { RouteRecordRaw } from 'vue-router'

export const conversionRoutes: RouteRecordRaw[] = [
  {
    path: '/conversion/dvt-to-mc2',
    name: 'DvtToMc2Converter',
    component: () => import('@/features/conversion/views/DvtToMc2View.vue'),
    meta: {
      requiresAuth: true,
      title: 'DVT to MC2 Converter',
      icon: 'mdi-file-swap',
      breadcrumb: [
        { title: 'Dashboard', to: '/dashboard' },
        { title: 'Tools', disabled: true },
        { title: 'DVT to MC2 Converter', disabled: true }
      ]
    }
  }
]
