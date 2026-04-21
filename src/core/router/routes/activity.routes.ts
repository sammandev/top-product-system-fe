import type { RouteRecordRaw } from 'vue-router'

export const activityRoutes: RouteRecordRaw[] = [
  {
    path: '/activity',
    name: 'ActivityList',
    component: () => import('@/features/activity/views/ActivityListView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Activity History',
      breadcrumb: [
        { title: 'Operations', disabled: true },
        { title: 'Activity History', disabled: true },
      ],
      shell: {
        eyebrow: 'Main',
        description: 'Review recent user actions and background events to understand who changed what and when.',
        icon: 'mdi-history',
        accent: 'primary',
      },
    },
  },
]
