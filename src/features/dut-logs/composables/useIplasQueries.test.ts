import { QueryClient } from '@tanstack/vue-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAppQueryClient } from '@/app/providers/query-client'
import { queryKeys } from '@/core/query'
import { iplasProxyApi } from '../api/iplasProxyApi'
import {
  fetchIplasCachedTestItemNamesQuery,
  fetchIplasDevicesQuery,
  fetchIplasSiteProjectsQuery,
  fetchIplasStationsQuery,
  fetchIplasTestItemNamesQuery,
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

describe('iPLAS lookup caching', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const deviceParams = {
    site: 'PTB',
    project: 'HH5K',
    station: 'FT1',
    startTime: '2026-01-01T00:00:00Z',
    endTime: '2026-01-02T00:00:00Z',
  }

  it('dedupes identical concurrent lookups into one HTTP call', async () => {
    const getDevices = vi
      .spyOn(iplasProxyApi, 'getDevices')
      .mockResolvedValue({ data: ['D1'], total_count: 1, cached: false } as never)
    const client = new QueryClient()

    const results = await Promise.all([
      fetchIplasDevicesQuery(deviceParams, false, client),
      fetchIplasDevicesQuery({ ...deviceParams }, false, client),
      fetchIplasDevicesQuery({ ...deviceParams }, false, client),
    ])

    expect(getDevices).toHaveBeenCalledTimes(1)
    expect(results).toEqual([['D1'], ['D1'], ['D1']])
    expect(getDevices.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
  })

  it('serves repeated lookups within staleTime from cache', async () => {
    const getSiteProjects = vi
      .spyOn(iplasProxyApi, 'getSiteProjects')
      .mockResolvedValue({ data: [{ site: 'PTB', project: 'HH5K' }] } as never)
    const getNames = vi.spyOn(iplasProxyApi, 'getTestItemNamesCached').mockResolvedValue({
      test_items: [{ name: 'T1' }],
      total_count: 1,
      cached: true,
      cache_age_hours: 1,
    } as never)
    const client = new QueryClient()
    const nameParams = { site: 'PTB', project: 'HH5K', station: 'FT1' }

    await fetchIplasSiteProjectsQuery(false, client)
    await fetchIplasSiteProjectsQuery(false, client)
    await fetchIplasCachedTestItemNamesQuery(nameParams, false, client)
    await fetchIplasCachedTestItemNamesQuery(nameParams, false, client)

    expect(getSiteProjects).toHaveBeenCalledTimes(1)
    expect(getNames).toHaveBeenCalledTimes(1)

    await fetchIplasSiteProjectsQuery(true, client)
    expect(getSiteProjects).toHaveBeenCalledTimes(2)
    expect(getSiteProjects).toHaveBeenLastCalledWith('simple', true)
  })

  it('issues separate calls for different params', async () => {
    const getStations = vi
      .spyOn(iplasProxyApi, 'getStations')
      .mockResolvedValue({ data: [], total_count: 0, cached: false })
    const getNames = vi
      .spyOn(iplasProxyApi, 'getTestItemNames')
      .mockResolvedValue({ test_items: [] } as never)
    const client = new QueryClient()

    await Promise.all([
      fetchIplasStationsQuery({ site: 'PTB', project: 'HH5K' }, false, client),
      fetchIplasStationsQuery({ site: 'PTB', project: 'HH6K' }, false, client),
      fetchIplasStationsQuery({ site: 'PTD', project: 'HH5K' }, false, client),
    ])
    await fetchIplasTestItemNamesQuery({ ...deviceParams, deviceId: 'D1' }, client)
    await fetchIplasTestItemNamesQuery({ ...deviceParams, deviceId: 'D2' }, client)

    expect(getStations).toHaveBeenCalledTimes(3)
    expect(getNames).toHaveBeenCalledTimes(2)
  })

  it('drops iPLAS lookups when admin iPLAS tokens are invalidated', async () => {
    vi.spyOn(iplasProxyApi, 'getStations').mockResolvedValue({
      data: [],
      total_count: 0,
      cached: false,
    })
    const client = createAppQueryClient()
    client.setQueryData(queryKeys.appConfig.iplasTokens(), [])
    await fetchIplasStationsQuery({ site: 'PTB', project: 'HH5K' }, false, client)
    expect(client.getQueryCache().findAll({ queryKey: queryKeys.iplas.all })).toHaveLength(1)

    await client.invalidateQueries({ queryKey: queryKeys.appConfig.iplasTokens() })

    expect(client.getQueryCache().findAll({ queryKey: queryKeys.iplas.all })).toHaveLength(0)
  })
})
