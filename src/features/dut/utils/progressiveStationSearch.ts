import type { CompactCsvTestItemData, CsvTestItemData } from '@/features/dut-logs/api/iplasProxyApi'

type StationSearchRecord = CsvTestItemData | CompactCsvTestItemData

/** Same key semantics as useIplasApi's deduplicateRecords. */
export function createStationSearchRecordKey(record: StationSearchRecord): string {
  const isn = record.ISN || record.DeviceId || ''
  const station = record.station || record.TSP || ''
  const endTime = record['Test end Time'] || record['Test Start Time'] || ''
  return `${isn}_${station}_${endTime}`
}

export interface ProgressiveRecordMerger<T> {
  push(records: readonly T[]): void
  flush(): void
  dispose(): void
}

export interface ProgressiveRecordMergerOptions<T> {
  getCurrent: () => T[]
  commit: (next: T[]) => void
  flushIntervalMs?: number
  maxPending?: number
  getKey?: (record: T) => string
}

/**
 * Buffers incoming records and commits them in batches (timer or size threshold),
 * appending only records whose key is not already present.
 */
export function createProgressiveRecordMerger<T extends StationSearchRecord>(
  options: ProgressiveRecordMergerOptions<T>,
): ProgressiveRecordMerger<T> {
  const flushIntervalMs = options.flushIntervalMs ?? 100
  const maxPending = options.maxPending ?? 500
  const getKey = options.getKey ?? createStationSearchRecordKey
  let pending: T[] = []
  let timer: ReturnType<typeof setTimeout> | null = null
  let knownKeys: Set<string> | null = null
  let knownLength = -1
  let disposed = false

  function cancelTimer(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function flush(): void {
    cancelTimer()
    if (disposed || pending.length === 0) return

    const current = options.getCurrent()
    if (!knownKeys || knownLength !== current.length) {
      knownKeys = new Set(current.map(getKey))
    }

    const additions: T[] = []
    for (const record of pending) {
      const key = getKey(record)
      if (knownKeys.has(key)) continue
      knownKeys.add(key)
      additions.push(record)
    }
    pending = []

    if (additions.length === 0) {
      knownLength = current.length
      return
    }
    const next = current.concat(additions)
    knownLength = next.length
    options.commit(next)
  }

  return {
    push(records) {
      if (disposed || records.length === 0) return
      for (const record of records) pending.push(record)
      if (pending.length >= maxPending) {
        flush()
      } else if (timer === null) {
        timer = setTimeout(flush, flushIntervalMs)
      }
    },
    flush,
    dispose() {
      disposed = true
      cancelTimer()
      pending = []
    },
  }
}

export interface StationSearchPage<T> {
  data: T[]
  total_records: number
}

export interface ProgressivePageInfo {
  loaded: number
  total: number
  done: boolean
}

/**
 * Fetches a small first page, then the remainder. If the total changed between
 * calls (data refreshed upstream), refetches the full range; the merger dedupes.
 */
export async function fetchStationSearchProgressively<T>(
  fetchPage: (offset: number, limit?: number) => Promise<StationSearchPage<T>>,
  onPage: (page: StationSearchPage<T>, info: ProgressivePageInfo) => void,
  options: { firstPageSize?: number; signal?: AbortSignal } = {},
): Promise<number> {
  const firstPageSize = options.firstPageSize ?? 200
  const throwIfAborted = () => {
    if (options.signal?.aborted) {
      throw new DOMException('Station search aborted', 'AbortError')
    }
  }

  throwIfAborted()
  const first = await fetchPage(0, firstPageSize)
  throwIfAborted()
  const total = first.total_records
  const firstDone = first.data.length < firstPageSize || first.data.length >= total
  onPage(first, { loaded: first.data.length, total, done: firstDone })
  if (firstDone) return total

  let rest = await fetchPage(firstPageSize)
  throwIfAborted()
  let loaded = first.data.length + rest.data.length
  if (rest.total_records !== total) {
    rest = await fetchPage(0)
    throwIfAborted()
    loaded = rest.data.length
  }
  onPage(rest, { loaded, total: rest.total_records, done: true })
  return rest.total_records
}
