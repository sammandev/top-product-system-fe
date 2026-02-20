/**
 * iPLAS IndexedDB Database
 *
 * Provides persistent, disk-based storage for iPLAS test records.
 * This eliminates memory pressure from large datasets by storing
 * records in IndexedDB instead of JavaScript heap.
 *
 * Schema Design:
 * - Primary key: composite of ISN + TestStartTime (unique per record)
 * - Indexes: station, status, testDate for efficient queries
 * - Optimized for cursor-based pagination and filtering
 */

import { type DBSchema, deleteDB, type IDBPDatabase, openDB } from 'idb'

// ============================================================================
// Types
// ============================================================================

/**
 * Compact test record stored in IndexedDB
 * Matches CompactCsvTestItemData from iplasProxyApi.ts
 */
export interface IplasDbRecord {
  /** Composite primary key: `${ISN}_${TestStartTime}` */
  id: string
  /** Product serial number */
  ISN: string
  /** ISO timestamp of test start */
  TestStartTime: string
  /** ISO timestamp of test end */
  TestEndTime?: string
  /** Test result status */
  TestStatus: 'PASS' | 'FAIL'
  /** Test station name - use this for API calls */
  Station: string
  /** Display station name (do NOT use for API calls, display only) */
  TSP?: string
  /** Device identifier */
  DeviceId: string
  /** Site identifier */
  Site: string
  /** Project identifier */
  Project: string
  /** Error code (if failed) */
  ErrorCode?: string
  /** Error name (if failed) */
  ErrorName?: string
  /** Slot identifier */
  Slot?: string
  /** Test duration in seconds */
  TestDuration?: number
  /** Run ID for cache invalidation (epoch timestamp) */
  runId: number
}

/**
 * Query filter options for fetching records
 */
export interface IplasDbQueryOptions {
  /** Filter by station name */
  station?: string
  /** Filter by test status */
  status?: 'PASS' | 'FAIL' | 'ALL'
  /** Filter by date range (ISO strings) */
  dateRange?: {
    start: string
    end: string
  }
  /** Pagination: number of records to fetch */
  limit?: number
  /** Pagination: number of records to skip */
  offset?: number
  /** Sort field */
  sortBy?: 'TestStartTime' | 'ISN' | 'Station' | 'TestStatus'
  /** Sort direction */
  sortDesc?: boolean
}

/**
 * Result from paginated query
 */
export interface IplasDbPageResult {
  records: IplasDbRecord[]
  totalCount: number
  hasMore: boolean
}

// ============================================================================
// Database Schema
// ============================================================================

const DB_NAME = 'iplas-data'
const DB_VERSION = 1
const STORE_NAME = 'testRecords'

interface IplasDbSchema extends DBSchema {
  testRecords: {
    key: string
    value: IplasDbRecord
    indexes: {
      'by-station': string
      'by-status': string
      'by-date': string
      'by-isn': string
      'by-runId': number
      'by-station-date': [string, string]
    }
  }
}

// ============================================================================
// Database Singleton
// ============================================================================

let dbInstance: IDBPDatabase<IplasDbSchema> | null = null
let dbInitPromise: Promise<IDBPDatabase<IplasDbSchema>> | null = null

/**
 * Initialize and get the IndexedDB database instance
 *
 * Uses singleton pattern to ensure only one connection is maintained.
 * Thread-safe initialization with promise caching.
 */
export async function getDb(): Promise<IDBPDatabase<IplasDbSchema>> {
  if (dbInstance) {
    return dbInstance
  }

  // Prevent concurrent initialization
  if (dbInitPromise) {
    return dbInitPromise
  }

  dbInitPromise = openDB<IplasDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`[IplasDB] Upgrading from v${oldVersion} to v${newVersion}`)

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })

        // Create indexes for efficient queries
        store.createIndex('by-station', 'Station', { unique: false })
        store.createIndex('by-status', 'TestStatus', { unique: false })
        store.createIndex('by-date', 'TestStartTime', { unique: false })
        store.createIndex('by-isn', 'ISN', { unique: false })
        store.createIndex('by-runId', 'runId', { unique: false })

        // Compound index for station + date queries (most common)
        store.createIndex('by-station-date', ['Station', 'TestStartTime'], { unique: false })

        console.log('[IplasDB] Created object store with indexes')
      }
    },
    blocked() {
      console.warn('[IplasDB] Database upgrade blocked by another connection')
    },
    blocking() {
      console.warn('[IplasDB] This connection is blocking a database upgrade')
      // Close this connection to allow upgrade
      dbInstance?.close()
      dbInstance = null
    },
    terminated() {
      console.error('[IplasDB] Database connection terminated unexpectedly')
      dbInstance = null
      dbInitPromise = null
    },
  })

  dbInstance = await dbInitPromise
  dbInitPromise = null

  console.log('[IplasDB] Database initialized')
  return dbInstance
}

/**
 * Close the database connection
 */
export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    dbInitPromise = null
    console.log('[IplasDB] Database connection closed')
  }
}

/**
 * Delete the entire database (for testing/reset)
 */
export async function deleteDatabase(): Promise<void> {
  closeDb()
  await deleteDB(DB_NAME)
  console.log('[IplasDB] Database deleted')
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Open a write transaction with optional relaxed durability
 *
 * Uses relaxed durability when supported for better write performance.
 * Falls back to standard transaction for browsers without support.
 */
export async function openWriteTransaction(db: IDBPDatabase<IplasDbSchema>) {
  try {
    // Try relaxed durability for better performance
    return db.transaction(STORE_NAME, 'readwrite', { durability: 'relaxed' })
  } catch {
    // Fallback for browsers without durability support
    return db.transaction(STORE_NAME, 'readwrite')
  }
}

/**
 * Add or update a single record
 */
export async function putRecord(record: IplasDbRecord): Promise<void> {
  const db = await getDb()
  await db.put(STORE_NAME, record)
}

/**
 * Add or update multiple records in a batch
 *
 * Uses a single transaction for efficiency.
 *
 * @param records - Records to upsert
 * @param runId - Run ID for cache invalidation checking
 * @returns Number of records written
 */
export async function putRecordsBatch(records: IplasDbRecord[], runId: number): Promise<number> {
  if (records.length === 0) return 0

  const db = await getDb()
  const tx = await openWriteTransaction(db)
  const store = tx.objectStore(STORE_NAME)

  let written = 0
  for (const record of records) {
    // Ensure runId is set
    record.runId = runId
    await store.put(record)
    written++
  }

  await tx.done
  return written
}

/**
 * Clear all records from the database
 */
export async function clearAllRecords(): Promise<void> {
  const db = await getDb()
  await db.clear(STORE_NAME)
  console.log('[IplasDB] All records cleared')
}

/**
 * Clear records from a previous run
 *
 * Removes all records with a runId different from the current one.
 * This is used for cache invalidation when starting a new stream.
 *
 * @param currentRunId - The current run ID to keep
 */
export async function clearStaleRecords(currentRunId: number): Promise<number> {
  const db = await getDb()
  const tx = await openWriteTransaction(db)
  const store = tx.objectStore(STORE_NAME)
  const index = store.index('by-runId')

  let deleted = 0
  let cursor = await index.openCursor()

  while (cursor) {
    if (cursor.value.runId !== currentRunId) {
      await cursor.delete()
      deleted++
    }
    cursor = await cursor.continue()
  }

  await tx.done

  if (deleted > 0) {
    console.log(`[IplasDB] Cleared ${deleted} stale records`)
  }

  return deleted
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get total count of records
 */
export async function getTotalCount(): Promise<number> {
  const db = await getDb()
  return db.count(STORE_NAME)
}

/**
 * Get count of records matching a filter
 */
export async function getCountByStation(station: string): Promise<number> {
  const db = await getDb()
  const index = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).index('by-station')
  return index.count(station)
}

/**
 * Get count of records matching status filter
 */
export async function getCountByStatus(status: 'PASS' | 'FAIL'): Promise<number> {
  const db = await getDb()
  const index = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).index('by-status')
  return index.count(status)
}

/**
 * Get a single record by ID
 */
export async function getRecord(id: string): Promise<IplasDbRecord | undefined> {
  const db = await getDb()
  return db.get(STORE_NAME, id)
}

/**
 * Get all records (use with caution for large datasets)
 */
export async function getAllRecords(): Promise<IplasDbRecord[]> {
  const db = await getDb()
  return db.getAll(STORE_NAME)
}

/**
 * Get paginated records with filtering and sorting
 *
 * Uses cursor-based pagination for memory efficiency.
 */
export async function getPagedRecords(
  options: IplasDbQueryOptions = {},
): Promise<IplasDbPageResult> {
  const db = await getDb()
  const {
    station,
    status,
    dateRange,
    limit = 25,
    offset = 0,
    sortBy = 'TestStartTime',
    sortDesc = true,
  } = options

  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  // Collect all matching records first (we need to count and sort)
  const allRecords: IplasDbRecord[] = []

  // Use appropriate index based on filters
  if (station && !status) {
    // Station-only filter: use station index
    const index = store.index('by-station')
    let cursor = await index.openCursor(IDBKeyRange.only(station))
    while (cursor) {
      allRecords.push(cursor.value)
      cursor = await cursor.continue()
    }
  } else if (status && status !== 'ALL' && !station) {
    // Status-only filter: use status index
    const index = store.index('by-status')
    let cursor = await index.openCursor(IDBKeyRange.only(status))
    while (cursor) {
      allRecords.push(cursor.value)
      cursor = await cursor.continue()
    }
  } else {
    // Multiple filters or no filters: scan all and filter in memory
    let cursor = await store.openCursor()
    while (cursor) {
      const record = cursor.value
      let matches = true

      if (station && record.Station !== station) {
        matches = false
      }
      if (status && status !== 'ALL' && record.TestStatus !== status) {
        matches = false
      }
      if (dateRange) {
        if (record.TestStartTime < dateRange.start || record.TestStartTime > dateRange.end) {
          matches = false
        }
      }

      if (matches) {
        allRecords.push(record)
      }
      cursor = await cursor.continue()
    }
  }

  const totalCount = allRecords.length

  // Sort in memory
  allRecords.sort((a, b) => {
    const aVal = a[sortBy] ?? ''
    const bVal = b[sortBy] ?? ''

    if (aVal < bVal) return sortDesc ? 1 : -1
    if (aVal > bVal) return sortDesc ? -1 : 1
    return 0
  })

  // Apply pagination
  const pageRecords = allRecords.slice(offset, offset + limit)

  return {
    records: pageRecords,
    totalCount,
    hasMore: offset + limit < totalCount,
  }
}

/**
 * Get records by ISN (for detail view)
 */
export async function getRecordsByIsn(isn: string): Promise<IplasDbRecord[]> {
  const db = await getDb()
  const index = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).index('by-isn')
  return index.getAll(isn)
}

/**
 * Get distinct station names from stored records
 */
export async function getDistinctStations(): Promise<string[]> {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const index = store.index('by-station')

  const stations = new Set<string>()
  let cursor = await index.openKeyCursor()

  while (cursor) {
    stations.add(cursor.key as string)
    cursor = await cursor.continue()
  }

  return Array.from(stations).sort()
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate composite ID from ISN and TestStartTime
 */
export function generateRecordId(isn: string, testStartTime: string): string {
  return `${isn}_${testStartTime}`
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  recordCount: number
  estimatedSizeBytes: number
  quotaBytes: number
  usageBytes: number
}> {
  const recordCount = await getTotalCount()

  // Estimate ~500 bytes per record
  const estimatedSizeBytes = recordCount * 500

  let quotaBytes = 0
  let usageBytes = 0

  if (navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate()
      quotaBytes = estimate.quota || 0
      usageBytes = estimate.usage || 0
    } catch {
      // Storage API not available
    }
  }

  return {
    recordCount,
    estimatedSizeBytes,
    quotaBytes,
    usageBytes,
  }
}

// ============================================================================
// Export Types
// ============================================================================

export type { IDBPDatabase, IplasDbSchema }
