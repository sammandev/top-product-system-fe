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
      shell: {
        eyebrow: 'Tools',
        description: 'Prepare uploaded data for downstream analysis with a cleaner parsing workspace and clearer outputs.',
        icon: 'mdi-file-document-edit-outline',
        accent: 'info',
      },
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
      shell: {
        eyebrow: 'Tools',
        description: 'Generate export-ready parsed outputs with the exact structure needed for downstream use.',
        icon: 'mdi-file-export-outline',
        accent: 'info',
      },
    },
  },
]
