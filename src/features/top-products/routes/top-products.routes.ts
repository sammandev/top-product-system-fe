import type { RouteRecordRaw } from 'vue-router'

export const topProductsRoutes: RouteRecordRaw[] = [
  {
    path: '/dut/top-products/data',
    name: 'TopProductsDatabase',
    component: () => import('../views/TopProductDatabaseView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Top Product Database',
      breadcrumb: [
        { title: 'Main', disabled: true },
        { title: 'Top Products', disabled: true },
        { title: 'Database', disabled: true },
      ],
      shell: {
        eyebrow: 'Main',
        description: 'Browse stored top-product results, filter historical records, and open detailed measurement context.',
        icon: 'mdi-database-outline',
        accent: 'info',
      },
    },
  },
]
