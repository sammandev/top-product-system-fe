import type { RouteRecordRaw } from 'vue-router'

export const activityRoutes: RouteRecordRaw[] = [
  {
    path: '/activity',
    name: 'ActivityList',
    component: () => import('@/features/activity/views/ActivityListView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Activity History',
    },
  },
]
