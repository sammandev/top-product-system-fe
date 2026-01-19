import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/features/auth/store'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/features/auth/views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/features/dashboard/views/DashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/parsing',
    name: 'Parsing',
    component: () => import('@/features/parsing/views/ParsingView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/compare',
    name: 'Compare',
    component: () => import('@/features/comparison/views/CompareView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dut/top-products',
    name: 'TopProducts',
    component: () => import('@/features/dut/views/TopProductsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dut/analysis',
    name: 'DUTAnalysis',
    component: () => import('@/features/dut/views/AnalysisView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dut/deep-dive',
    name: 'DeepDive',
    component: () => import('@/features/dut/views/DeepDiveView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/shared/components/error/NotFoundView.vue'),
    meta: { requiresAuth: false }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Navigation guard for authentication
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router
