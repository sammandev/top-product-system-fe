// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { APP_CONFIG } from '@/core/config'
import { createPrimeVueOptions, resolvePrimeUiLicense } from './primevue'

describe('PrimeVue license bootstrap', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses a database-managed license when bootstrap returns one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ license: 'database-license' }),
      }),
    )

    expect(await resolvePrimeUiLicense()).toBe('database-license')
  })

  it('falls back to the bundled license when bootstrap is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    expect(await resolvePrimeUiLicense()).toBe(APP_CONFIG.ui.primeUiLicense)
  })

  it('passes the selected license to PrimeVue configuration', () => {
    expect(createPrimeVueOptions('selected-license').license).toBe('selected-license')
  })
})
