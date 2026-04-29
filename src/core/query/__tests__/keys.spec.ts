import { describe, expect, it } from 'vitest'
import { queryKeys } from '../keys'

describe('queryKeys', () => {
  it('builds stable grouped top-product keys', () => {
    expect(queryKeys.topProducts.stats()).toEqual(['top-products', 'stats'])
    expect(queryKeys.topProducts.detail(42)).toEqual(['top-products', 'detail', 42])
    expect(queryKeys.topProducts.list({ page: 1 })).toEqual(['top-products', 'list', { page: 1 }])
  })

  it('groups admin and app-config keys for invalidation', () => {
    expect(queryKeys.admin.users()).toEqual(['admin', 'users'])
    expect(queryKeys.admin.accessControl()).toEqual(['admin', 'access-control'])
    expect(queryKeys.appConfig.general()).toEqual(['app-config', 'general'])
  })
})
