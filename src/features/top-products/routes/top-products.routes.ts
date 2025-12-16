import type { RouteRecordRaw } from 'vue-router';

export const topProductsRoutes: RouteRecordRaw[] = [
  {
    path: '/dut/top-products/data',
    name: 'TopProductsDatabase',
    component: () => import('../views/TopProductDatabaseView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Top Product Database'
    }
  }
];
