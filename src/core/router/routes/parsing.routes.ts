/**
 * Parsing Routes
 *
 * Routes for file parsing features
 */

import type { RouteRecordRaw } from 'vue-router'

export const parsingRoutes: RouteRecordRaw[] = [
  {
    path: '/parsing',
    name: 'Parsing',
    component: () => import('@/features/parsing/views/ParsingView.vue'),
    meta: {
      requiresAuth: true,
      title: 'File Parsing',
      icon: 'mdi-file-document-edit',
      breadcrumb: [
        { title: 'Dashboard', to: '/dashboard' },
        { title: 'File Parsing', disabled: true },
      ],
    },
  },
  {
    path: '/parsing/download-format',
    name: 'ParseDownloadFormat',
    component: () => import('@/features/parsing/views/ParseDownloadView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Parse & Download Format',
      icon: 'mdi-file-export',
      breadcrumb: [
        { title: 'Dashboard', to: '/dashboard' },
        { title: 'Parse & Download Format', disabled: true },
      ],
    },
  },
]
