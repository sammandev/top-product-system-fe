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
      shell: {
        eyebrow: 'Tools',
        description: 'Analyze MasterControl files with a tighter review surface built for specification-heavy work.',
        icon: 'mdi-file-chart-outline',
        accent: 'info',
      },
    },
  },
]
