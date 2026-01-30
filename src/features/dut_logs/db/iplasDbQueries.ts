/**
 * iPLAS IndexedDB Query Helpers
 * 
 * Advanced query utilities for efficient pagination, filtering, and sorting
 * of test records stored in IndexedDB. Designed for use with v-data-table-server
 * to provide "fake" server-side pagination that actually queries locally.
 * 
 * Key Features:
 * - Cursor-based pagination for memory efficiency
 * - Index-optimized queries for common filter patterns
 * - Compound index support for station + date queries
 * - Efficient count queries without loading full records
 * 
 * @see IPLAS_PERFORMANCE_OPTIMIZATION_PLAN.md Phase 5.5
 */

import { getDb, type IplasDbRecord, type IplasDbSchema } from './iplasDb'
import type { IDBPDatabase } from 'idb'

// Helper type for IDB object store with index access
// Using a simplified interface to avoid complex generic type issues
interface IDBObjectStoreWithIndexes {
  index(name: string): {
    getAll(key?: unknown): Promise<IplasDbRecord[]>
  }
  getAll(): Promise<IplasDbRecord[]>
}

// ============================================================================
// Types
// ============================================================================

/**
 * Filter options for querying records
 */
export interface RecordFilter {
  /** Filter by station name (exact match) */
  station?: string
  /** Filter by test status */
  status?: 'PASS' | 'FAIL' | 'ALL'
  /** Filter by date range (ISO strings) */
  dateRange?: {
    start: string
    end: string
  }
  /** Filter by ISN (exact match) */
  isn?: string
  /** Filter by site (exact match) */
  site?: string
  /** Filter by project (exact match) */
  project?: string
  /** Search query (searches ISN, ErrorName, ErrorCode) */
  search?: string
}

/**
 * Sort options
 */
export interface SortOptions {
  /** Field to sort by */
  key: 'TestStartTime' | 'ISN' | 'Station' | 'TestStatus' | 'DeviceId'
  /** Sort order */
  order: 'asc' | 'desc'
}

/**
 * Pagination options (compatible with v-data-table-server)
 */
export interface TablePaginationOptions {
  page: number
  itemsPerPage: number
  sortBy: SortOptions[]
}

/**
 * Result from paginated query (compatible with v-data-table-server)
 */
export interface TableQueryResult {
  items: IplasDbRecord[]
  total: number
}

/**
 * Statistics about stored records
 */
export interface RecordStatistics {
  total: number
  byStatus: {
    pass: number
    fail: number
  }
  byStation: Map<string, number>
  dateRange: {
    earliest: string | null
    latest: string | null
  }
}

// ============================================================================
// Constants
// ============================================================================

const STORE_NAME = 'testRecords'

// ============================================================================
// Core Query Functions
// ============================================================================

/**
 * Query records with filtering, sorting, and pagination
 * 
 * This is the main query function designed for v-data-table-server's loadItems handler.
 * It queries IndexedDB locally, providing instant response without network latency.
 * 
 * @param options - Pagination options from v-data-table-server
 * @param filter - Filter options
 * @returns Items for current page and total count
 */
export async function queryRecordsForTable(
  options: TablePaginationOptions,
  filter: RecordFilter = {}
): Promise<TableQueryResult> {
  const db = await getDb()
  const { page, itemsPerPage, sortBy } = options

  // Get filtered records
  const allFiltered = await getFilteredRecords(db, filter)
  const total = allFiltered.length

  // Apply sorting
  const sortConfig = sortBy[0] || { key: 'TestStartTime', order: 'desc' }
  sortRecords(allFiltered, sortConfig)

  // Apply pagination
  const offset = (page - 1) * itemsPerPage
  const items = allFiltered.slice(offset, offset + itemsPerPage)

  return { items, total }
}

/**
 * Get total count of records matching a filter
 * 
 * More efficient than loading all records when only count is needed.
 */
export async function getFilteredCount(filter: RecordFilter = {}): Promise<number> {
  const db = await getDb()

  // If no filters, use fast count
  if (isEmptyFilter(filter)) {
    return db.count(STORE_NAME)
  }

  // For filtered counts, we need to scan
  const records = await getFilteredRecords(db, filter)
  return records.length
}

/**
 * Get records by filter without pagination
 * 
 * Use sparingly - prefer paginated queries for large datasets.
 */
export async function getRecordsByFilter(
  filter: RecordFilter,
  limit?: number
): Promise<IplasDbRecord[]> {
  const db = await getDb()
  const records = await getFilteredRecords(db, filter)

  if (limit && records.length > limit) {
    return records.slice(0, limit)
  }

  return records
}

// ============================================================================
// Index-Optimized Queries
// ============================================================================

/**
 * Get records using index-optimized query when possible
 */
async function getFilteredRecords(
  db: IDBPDatabase<IplasDbSchema>,
  filter: RecordFilter
): Promise<IplasDbRecord[]> {
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  // Determine best index to use
  const indexStrategy = determineIndexStrategy(filter)

  let records: IplasDbRecord[]

  switch (indexStrategy.type) {
    case 'station':
      records = await queryByStation(store as unknown as IDBObjectStoreWithIndexes, filter.station!)
      break
    case 'status':
      records = await queryByStatus(store as unknown as IDBObjectStoreWithIndexes, filter.status as 'PASS' | 'FAIL')
      break
    case 'isn':
      records = await queryByIsn(store as unknown as IDBObjectStoreWithIndexes, filter.isn!)
      break
    case 'full-scan':
    default:
      records = await store.getAll()
  }

  // Apply remaining filters in memory
  return applyMemoryFilters(records, filter, indexStrategy.usedFields)
}

/**
 * Determine which index to use based on filter
 */
function determineIndexStrategy(filter: RecordFilter): {
  type: 'station' | 'status' | 'isn' | 'full-scan'
  usedFields: Set<string>
} {
  const usedFields = new Set<string>()

  // Priority: ISN > Station > Status (based on selectivity)
  if (filter.isn) {
    usedFields.add('isn')
    return { type: 'isn', usedFields }
  }

  if (filter.station) {
    usedFields.add('station')
    return { type: 'station', usedFields }
  }

  if (filter.status && filter.status !== 'ALL') {
    usedFields.add('status')
    return { type: 'status', usedFields }
  }

  return { type: 'full-scan', usedFields }
}

/**
 * Query using station index
 */
async function queryByStation(
  store: IDBObjectStoreWithIndexes,
  station: string
): Promise<IplasDbRecord[]> {
  const index = store.index('by-station')
  return index.getAll(station)
}

/**
 * Query using status index
 */
async function queryByStatus(
  store: IDBObjectStoreWithIndexes,
  status: 'PASS' | 'FAIL'
): Promise<IplasDbRecord[]> {
  const index = store.index('by-status')
  return index.getAll(status)
}

/**
 * Query using ISN index
 */
async function queryByIsn(
  store: IDBObjectStoreWithIndexes,
  isn: string
): Promise<IplasDbRecord[]> {
  const index = store.index('by-isn')
  return index.getAll(isn)
}

/**
 * Apply remaining filters in memory after index query
 */
function applyMemoryFilters(
  records: IplasDbRecord[],
  filter: RecordFilter,
  usedFields: Set<string>
): IplasDbRecord[] {
  return records.filter(record => {
    // Station filter (if not already applied via index)
    if (filter.station && !usedFields.has('station')) {
      if (record.Station !== filter.station) return false
    }

    // Status filter (if not already applied via index)
    if (filter.status && filter.status !== 'ALL' && !usedFields.has('status')) {
      if (record.TestStatus !== filter.status) return false
    }

    // ISN filter (if not already applied via index)
    if (filter.isn && !usedFields.has('isn')) {
      if (record.ISN !== filter.isn) return false
    }

    // Date range filter
    if (filter.dateRange) {
      const recordDate = record.TestStartTime
      if (recordDate < filter.dateRange.start || recordDate > filter.dateRange.end) {
        return false
      }
    }

    // Site filter
    if (filter.site && record.Site !== filter.site) {
      return false
    }

    // Project filter
    if (filter.project && record.Project !== filter.project) {
      return false
    }

    // Search filter (searches ISN, ErrorName, ErrorCode)
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      const matchesIsn = record.ISN.toLowerCase().includes(searchLower)
      const matchesError = record.ErrorName?.toLowerCase().includes(searchLower) ?? false
      const matchesCode = record.ErrorCode?.toLowerCase().includes(searchLower) ?? false
      if (!matchesIsn && !matchesError && !matchesCode) {
        return false
      }
    }

    return true
  })
}

/**
 * Sort records in place
 */
function sortRecords(records: IplasDbRecord[], sortConfig: SortOptions): void {
  const { key, order } = sortConfig
  const multiplier = order === 'desc' ? -1 : 1

  records.sort((a, b) => {
    const aVal = a[key] ?? ''
    const bVal = b[key] ?? ''

    if (aVal < bVal) return -1 * multiplier
    if (aVal > bVal) return 1 * multiplier
    return 0
  })
}

/**
 * Check if filter is empty (no active filters)
 */
function isEmptyFilter(filter: RecordFilter): boolean {
  return !filter.station &&
    (!filter.status || filter.status === 'ALL') &&
    !filter.dateRange &&
    !filter.isn &&
    !filter.site &&
    !filter.project &&
    !filter.search
}

// ============================================================================
// Statistics & Aggregation
// ============================================================================

/**
 * Get statistics about stored records
 * 
 * Useful for dashboard displays and filter option generation.
 */
export async function getRecordStatistics(): Promise<RecordStatistics> {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  const stats: RecordStatistics = {
    total: 0,
    byStatus: { pass: 0, fail: 0 },
    byStation: new Map(),
    dateRange: { earliest: null, latest: null }
  }

  // Iterate through all records once to gather stats
  let cursor = await store.openCursor()

  while (cursor) {
    const record = cursor.value
    stats.total++

    // Count by status
    if (record.TestStatus === 'PASS') {
      stats.byStatus.pass++
    } else if (record.TestStatus === 'FAIL') {
      stats.byStatus.fail++
    }

    // Count by station
    const stationCount = stats.byStation.get(record.Station) || 0
    stats.byStation.set(record.Station, stationCount + 1)

    // Track date range
    if (!stats.dateRange.earliest || record.TestStartTime < stats.dateRange.earliest) {
      stats.dateRange.earliest = record.TestStartTime
    }
    if (!stats.dateRange.latest || record.TestStartTime > stats.dateRange.latest) {
      stats.dateRange.latest = record.TestStartTime
    }

    cursor = await cursor.continue()
  }

  return stats
}

/**
 * Get list of distinct values for a field
 * 
 * Useful for populating filter dropdowns.
 */
export async function getDistinctValues(
  field: 'Station' | 'Site' | 'Project' | 'DeviceId'
): Promise<string[]> {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  const values = new Set<string>()
  let cursor = await store.openCursor()

  while (cursor) {
    const value = cursor.value[field]
    if (value) {
      values.add(value)
    }
    cursor = await cursor.continue()
  }

  return Array.from(values).sort()
}

/**
 * Get records grouped by a field
 * 
 * @param field - Field to group by
 * @param limit - Max records per group (optional)
 */
export async function getRecordsGroupedBy(
  field: 'Station' | 'DeviceId' | 'TestStatus',
  limit?: number
): Promise<Map<string, IplasDbRecord[]>> {
  const db = await getDb()
  const records = await db.getAll(STORE_NAME)

  const grouped = new Map<string, IplasDbRecord[]>()

  for (const record of records) {
    const key = record[field]
    if (!key) continue

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }

    const group = grouped.get(key)!
    if (!limit || group.length < limit) {
      group.push(record)
    }
  }

  return grouped
}

// ============================================================================
// Cursor-Based Streaming (Memory Efficient)
// ============================================================================

/**
 * Stream records with a callback for each record
 * 
 * More memory efficient than loading all records for large datasets.
 * 
 * @param filter - Filter options
 * @param onRecord - Callback for each matching record
 * @param options - Additional options
 */
export async function streamRecords(
  filter: RecordFilter,
  onRecord: (record: IplasDbRecord) => void | Promise<void>,
  options: {
    /** Stop after this many records */
    limit?: number
    /** Skip this many records */
    offset?: number
  } = {}
): Promise<number> {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  let cursor = await store.openCursor()
  let skipped = 0
  let processed = 0

  while (cursor) {
    const record = cursor.value

    // Apply filter
    if (matchesFilter(record, filter)) {
      // Handle offset
      if (options.offset && skipped < options.offset) {
        skipped++
      } else {
        await onRecord(record)
        processed++

        // Check limit
        if (options.limit && processed >= options.limit) {
          break
        }
      }
    }

    cursor = await cursor.continue()
  }

  return processed
}

/**
 * Check if record matches filter
 */
function matchesFilter(record: IplasDbRecord, filter: RecordFilter): boolean {
  if (filter.station && record.Station !== filter.station) return false
  if (filter.status && filter.status !== 'ALL' && record.TestStatus !== filter.status) return false
  if (filter.isn && record.ISN !== filter.isn) return false
  if (filter.site && record.Site !== filter.site) return false
  if (filter.project && record.Project !== filter.project) return false

  if (filter.dateRange) {
    if (record.TestStartTime < filter.dateRange.start) return false
    if (record.TestStartTime > filter.dateRange.end) return false
  }

  if (filter.search) {
    const searchLower = filter.search.toLowerCase()
    const matchesIsn = record.ISN.toLowerCase().includes(searchLower)
    const matchesError = record.ErrorName?.toLowerCase().includes(searchLower) ?? false
    const matchesCode = record.ErrorCode?.toLowerCase().includes(searchLower) ?? false
    if (!matchesIsn && !matchesError && !matchesCode) return false
  }

  return true
}

// ============================================================================
// Export for convenience
// ============================================================================

export type {
  IplasDbRecord
}
