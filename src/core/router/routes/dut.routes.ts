/**
 * DUT Management Routes
 *
 * Routes for DUT-related features (Top Products, Analysis, etc.)
 */

import type { RouteRecordRaw } from 'vue-router'

export const dutRoutes: RouteRecordRaw[] = [
  {
    path: '/dut/top-products/analysis',
    name: 'TopProducts',
    component: () => import('@/features/dut/views/TopProductsView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Top Products Analysis',
      icon: 'mdi-chart-line',
      breadcrumb: [
        { title: 'Dashboard', to: '/dashboard' },
        { title: 'DUT Management', disabled: true },
        { title: 'Top Products', disabled: true },
      ],
      shell: {
        eyebrow: 'Main',
        description: 'Review ranking trends, score outcomes, and test-item behavior across top-product workflows.',
        icon: 'mdi-trophy-outline',
        accent: 'info',
      },
    },
  },
  {
    path: '/dut/analysis',
    name: 'DUTAnalysis',
    component: () => import('@/features/dut/views/AnalysisView.vue'),
    meta: {
      requiresAuth: true,
      title: 'DUT Analysis',
      icon: 'mdi-chart-line',
      breadcrumb: [
        { title: 'Dashboard', to: '/dashboard' },
        { title: 'DUT Management', disabled: true },
        { title: 'Analysis', disabled: true },
      ],
      shell: {
        eyebrow: 'Main',
        description: 'Inspect DUT performance with focused analysis tools for measurements, failures, and correlations.',
        icon: 'mdi-chart-line-variant',
        accent: 'info',
      },
    },
  },
  {
    path: '/dut/top-products/pa-trend',
    name: 'PATrend',
    component: () => import('@/features/dut/views/PATrendView.vue'),
    meta: {
      requiresAuth: true,
      title: 'PA Trend Analysis',
      icon: 'mdi-chart-line-variant',
      breadcrumb: [
        { title: 'Dashboard', to: '/dashboard' },
        { title: 'DUT Management', disabled: true },
        { title: 'PA Trend', disabled: true },
      ],
      shell: {
        eyebrow: 'Main',
        description: 'Follow PA movement over time to spot drift, stability changes, and outlier periods early.',
        icon: 'mdi-chart-timeline-variant',
        accent: 'info',
      },
    },
  },
  {
    path: '/dut/data-explorer',
    name: 'DataExplorer',
    component: () => import('@/features/dut/views/DataExplorerView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Data Explorer',
      icon: 'mdi-database-search',
      breadcrumb: [
        { title: 'Dashboard', to: '/dashboard' },
        { title: 'DUT Management', disabled: true },
        { title: 'Data Explorer', disabled: true },
      ],
      shell: {
        eyebrow: 'Main',
        description: 'Slice DUT records, inspect raw data, and move quickly between stations, ISNs, and result sets.',
        icon: 'mdi-database-search-outline',
        accent: 'info',
      },
    },
  },
  // iPLAS Integration Routes - Redirect to combined Data Explorer
  {
    path: '/iplas/explorer',
    name: 'IplasExplorer',
    redirect: '/dut/data-explorer',
  },
  // {
  //   path: '/iplas/download',
  //   name: 'IplasDownload',
  //   component: () => import('@/features/dut-logs/views/IplasDownloadView.vue'),
  //   meta: {
  //     requiresAuth: true,
  //     title: 'iPLAS Downloader',
  //     icon: 'mdi-download',
  //     breadcrumb: [
  //       { title: 'Dashboard', to: '/dashboard' },
  //       { title: 'iPLAS', disabled: true },
  //       { title: 'Downloader', disabled: true }
  //     ]
  //   }
  // }
]
