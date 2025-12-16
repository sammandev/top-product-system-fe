/**
 * Authentication Routes
 * 
 * Routes for authentication features (login, logout, etc.)
 */

import type { RouteRecordRaw } from 'vue-router'

export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/features/auth/views/LoginView.vue'),
    meta: {
      requiresAuth: false,
      title: 'Login',
      layout: 'auth'
    }
  }
]
