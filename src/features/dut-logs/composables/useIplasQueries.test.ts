import { QueryClient } from '@tanstack/vue-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { iplasProxyApi } from '../api/iplasProxyApi'
import {
  fetchIplasStationsQuery,
  getIplasResultStaleTime,
  getIplasTokenQueryScope,
} from './useIplasQueries'

describe('iPLAS query credential scoping', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not expose bearer tokens in query scope', () => {
    const token = 'sensitive-bearer-token'
    const scope = getIplasTokenQueryScope(token)

    expect(scope).not.toContain(token)
    expect(scope).not.toContain('sensitive')
    expect(scope).toBe(getIplasTokenQueryScope(token))
    expect(scope).not.toBe(getIplasTokenQueryScope('different-token'))
    expect(getIplasTokenQueryScope()).toBe('configured')
  })

  it('does not reuse station data across different tokens', async () => {
    const getStations = vi.spyOn(iplasProxyApi, 'getStations').mockResolvedValue({
      data: [],
      total_count: 0,
      cached: false,
    })
    const client = new QueryClient()

    await fetchIplasStationsQuery(
      { site: 'PTB', project: 'HH5K', token: 'token-one' },
      false,
      client,
    )
    await fetchIplasStationsQuery(
      { site: 'PTB', project: 'HH5K', token: 'token-two' },
      false,
      client,
    )

    const serializedKeys = JSON.stringify(
      client
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey),
    )
    expect(getStations).toHaveBeenCalledTimes(2)
    expect(serializedKeys).not.toContain('token-one')
    expect(serializedKeys).not.toContain('token-two')
  })

  it('keeps empty results fresh for only the backend negative-cache window', () => {
    const populatedStaleTime = 5 * 60 * 1000

    expect(getIplasResultStaleTime([], populatedStaleTime)).toBe(15 * 1000)
    expect(getIplasResultStaleTime({ data: [] }, populatedStaleTime)).toBe(15 * 1000)
    expect(getIplasResultStaleTime({ items: [] }, populatedStaleTime)).toBe(15 * 1000)
    expect(getIplasResultStaleTime({ successful_count: 0 }, populatedStaleTime)).toBe(15 * 1000)
    expect(getIplasResultStaleTime(['614636'], populatedStaleTime)).toBe(populatedStaleTime)
  })
})
