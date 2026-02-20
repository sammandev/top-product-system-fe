/**
 * MasterControl Tools Routes
 *
 * Routes for MasterControl analysis and related tools
 */

import type { RouteRecordRaw } from 'vue-router'

export const mastercontrolRoutes: RouteRecordRaw[] = [
  {
    path: '/mastercontrol/analyze',
    name: 'MasterControlAnalyze',
    component: () => import('@/features/mastercontrol/views/AnalyzeView.vue'),
    meta: {
      requiresAuth: true,
      title: 'MasterControl Analyze',
      icon: 'mdi-file-chart',
      breadcrumb: [
        { title: 'Dashboard', to: '/dashboard' },
        { title: 'Tools', disabled: true },
        { title: 'MasterControl Analyze', disabled: true },
      ],
    },
  },
]
