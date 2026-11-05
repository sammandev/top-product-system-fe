import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompactCsvTestItemData } from '@/features/dut-logs/api/iplasProxyApi'
import {
  createProgressiveRecordMerger,
  fetchStationSearchProgressively,
  type StationSearchPage,
} from './progressiveStationSearch'

function record(isn: string, station = 'FT1'): CompactCsvTestItemData {
  return {
    ISN: isn,
    station,
    'Test end Time': `2026-01-01 00:00:${isn.padStart(2, '0')}`,
  } as unknown as CompactCsvTestItemData
}

describe('createProgressiveRecordMerger', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function setup(options: { maxPending?: number } = {}) {
    let current: CompactCsvTestItemData[] = []
    const commit = vi.fn((next: CompactCsvTestItemData[]) => {
      current = next
    })
    const merger = createProgressiveRecordMerger({
      getCurrent: () => current,
      commit,
      flushIntervalMs: 100,
      ...options,
    })
    return { merger, commit, get: () => current }
  }

  it('batches pushes into one commit per interval and dedupes', () => {
    const { merger, commit, get } = setup()
    merger.push([record('1'), record('2')])
    merger.push([record('2'), record('3')])
    expect(commit).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(get().map((r) => r.ISN)).toEqual(['1', '2', '3'])

    merger.push([record('1'), record('4')])
    merger.flush()
    expect(get().map((r) => r.ISN)).toEqual(['1', '2', '3', '4'])
  })

  it('flushes immediately when the pending threshold is reached', () => {
    const { merger, commit } = setup({ maxPending: 2 })
    merger.push([record('1'), record('2')])
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('drops pending records after dispose (abort)', () => {
    const { merger, commit } = setup()
    merger.push([record('1')])
    merger.dispose()
    vi.advanceTimersByTime(500)
    merger.flush()
    expect(commit).not.toHaveBeenCalled()
  })
})

describe('fetchStationSearchProgressively', () => {
  const all = Array.from({ length: 5 }, (_, i) => record(String(i)))
  const page = (offset: number, limit?: number): StationSearchPage<CompactCsvTestItemData> => ({
    data: all.slice(offset, limit ? offset + limit : undefined),
    total_records: all.length,
  })

  it('fetches a first page then the remainder', async () => {
    const fetchPage = vi.fn(async (offset: number, limit?: number) => page(offset, limit))
    const onPage = vi.fn()
    const total = await fetchStationSearchProgressively(fetchPage, onPage, { firstPageSize: 2 })

    expect(total).toBe(5)
    expect(fetchPage.mock.calls).toEqual([[0, 2], [2]])
    expect(onPage.mock.calls.map(([, info]) => info)).toEqual([
      { loaded: 2, total: 5, done: false },
      { loaded: 5, total: 5, done: true },
    ])
  })

  it('skips the remainder when the first page is complete', async () => {
    const fetchPage = vi.fn(async (offset: number, limit?: number) => page(offset, limit))
    await fetchStationSearchProgressively(fetchPage, vi.fn(), { firstPageSize: 10 })
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('refetches the full range when the total changes between pages', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page(0, 2))
      .mockResolvedValueOnce({ data: all.slice(3), total_records: 6 })
      .mockResolvedValueOnce({ data: [...all, record('9')], total_records: 6 })
    const onPage = vi.fn()
    await fetchStationSearchProgressively(fetchPage, onPage, { firstPageSize: 2 })

    expect(fetchPage.mock.calls[2]).toEqual([0])
    expect(onPage.mock.calls[1]?.[1]).toEqual({ loaded: 6, total: 6, done: true })
  })

  it('stops without emitting the remainder once aborted', async () => {
    const controller = new AbortController()
    const fetchPage = vi.fn(async (offset: number, limit?: number) => {
      if (offset > 0) controller.abort()
      return page(offset, limit)
    })
    const onPage = vi.fn()
    await expect(
      fetchStationSearchProgressively(fetchPage, onPage, {
        firstPageSize: 2,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(onPage).toHaveBeenCalledTimes(1)
  })
})
