export const queryKeys = {
  appConfig: {
    all: ['app-config'] as const,
    general: () => [...queryKeys.appConfig.all, 'general'] as const,
    iplasTokens: () => [...queryKeys.appConfig.all, 'iplas-tokens'] as const,
    sfistspConfigs: () => [...queryKeys.appConfig.all, 'sfistsp'] as const,
    guestCredentials: () => [...queryKeys.appConfig.all, 'guest-credentials'] as const,
  },
  activity: {
    all: ['activity'] as const,
    list: (params: unknown) => [...queryKeys.activity.all, 'list', params] as const,
  },
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
    accessControl: () => [...queryKeys.admin.all, 'access-control'] as const,
    rbac: () => [...queryKeys.admin.all, 'rbac'] as const,
    roleDetail: (id: number) => [...queryKeys.admin.rbac(), 'role', id] as const,
    permissionDetail: (id: number) => [...queryKeys.admin.rbac(), 'permission', id] as const,
    menuAccess: () => [...queryKeys.admin.all, 'menu-access'] as const,
  },
  topProducts: {
    all: ['top-products'] as const,
    list: (params: unknown) => [...queryKeys.topProducts.all, 'list', params] as const,
    stats: () => [...queryKeys.topProducts.all, 'stats'] as const,
    detail: (id: number) => [...queryKeys.topProducts.all, 'detail', id] as const,
    projects: () => [...queryKeys.topProducts.all, 'filters', 'projects'] as const,
    stations: () => [...queryKeys.topProducts.all, 'filters', 'stations'] as const,
  },
  iplas: {
    all: ['iplas'] as const,
    siteProjects: () => [...queryKeys.iplas.all, 'site-projects'] as const,
    stations: (site: string, project: string) =>
      [...queryKeys.iplas.all, 'stations', site, project] as const,
    devices: (params: unknown) => [...queryKeys.iplas.all, 'devices', params] as const,
    recordTestItems: (params: unknown) =>
      [...queryKeys.iplas.all, 'record-test-items', params] as const,
    paginatedTestItems: (params: unknown) =>
      [...queryKeys.iplas.all, 'paginated-test-items', params] as const,
  },
} as const
