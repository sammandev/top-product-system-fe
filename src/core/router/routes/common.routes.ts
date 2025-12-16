/**
 * Common Routes
 * 
 * Common routes like home redirect, 404, etc.
 */

import type { RouteRecordRaw } from 'vue-router'

export const commonRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/shared/components/error/NotFoundView.vue'),
    meta: {
      requiresAuth: false,
      title: 'Page Not Found'
    }
  }
]
