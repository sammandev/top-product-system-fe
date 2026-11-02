// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { APP_CONFIG } from '@/core/config'
import {
  createPrimeVueOptions,
  PRIMEUI_LICENSE_STORAGE_KEY,
  resolvePrimeUiLicense,
} from './primevue'

describe('PrimeVue license bootstrap', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.removeItem(PRIMEUI_LICENSE_STORAGE_KEY)
  })

  it('returns a cached license immediately and refreshes it in the background', async () => {
    window.localStorage.setItem(PRIMEUI_LICENSE_STORAGE_KEY, 'cached-license')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ license: 'fresh-license' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    expect(await resolvePrimeUiLicense()).toBe('cached-license')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.waitFor(() =>
      expect(window.localStorage.getItem(PRIMEUI_LICENSE_STORAGE_KEY)).toBe('fresh-license'),
    )
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
