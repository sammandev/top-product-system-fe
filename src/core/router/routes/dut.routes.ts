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
        { title: 'Top Products', disabled: true }
      ]
    }
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
        { title: 'Analysis', disabled: true }
      ]
    }
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
        { title: 'PA Trend', disabled: true }
      ]
    }
  },
  {
    path: '/dut/test-log-download',
    name: 'TestLogDownload',
    component: () => import('@/features/dut/views/TestLogDownloadView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Test Log Download',
      icon: 'mdi-download-box',
      breadcrumb: [
        { title: 'Dashboard', to: '/dashboard' },
        { title: 'DUT Management', disabled: true },
        { title: 'Test Log Download', disabled: true }
      ]
    }
  },
  // iPLAS Integration Routes
  {
    path: '/iplas/explorer',
    name: 'IplasExplorer',
    component: () => import('@/features/dut_logs/views/IplasExplorerView.vue'),
    meta: {
      requiresAuth: true,
      title: 'iPLAS Explorer',
      icon: 'mdi-compass',
      breadcrumb: [
        { title: 'Dashboard', to: '/dashboard' },
        { title: 'iPLAS', disabled: true },
        { title: 'Explorer', disabled: true }
      ]
    }
  },
  {
    path: '/iplas/download',
    name: 'IplasDownload',
    component: () => import('@/features/dut_logs/views/IplasDownloadView.vue'),
    meta: {
      requiresAuth: true,
      title: 'iPLAS Downloader',
      icon: 'mdi-download',
      breadcrumb: [
        { title: 'Dashboard', to: '/dashboard' },
        { title: 'iPLAS', disabled: true },
        { title: 'Downloader', disabled: true }
      ]
    }
  }
]
