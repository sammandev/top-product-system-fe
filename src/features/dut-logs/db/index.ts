/**
 * iPLAS Database Exports
 *
 * Barrel export for IndexedDB utilities and types.
 */

export {
  clearAllRecords,
  clearStaleRecords,
  closeDb,
  deleteDatabase,
  // Utilities
  generateRecordId,
  getAllRecords,
  getCountByStation,
  getCountByStatus,
  // Database initialization
  getDb,
  getDistinctStations,
  getPagedRecords,
  getRecord,
  getRecordsByIsn,
  getStorageStats,
  // Read operations
  getTotalCount,
  type IDBPDatabase,
  type IplasDbPageResult,
  type IplasDbQueryOptions,
  // Types
  type IplasDbRecord,
  type IplasDbSchema,
  // Write operations
  openWriteTransaction,
  putRecord,
  putRecordsBatch,
} from './iplasDb'

// Query helpers
export {
  getDistinctValues,
  // Filter utilities
  getFilteredCount,
  // Statistics & aggregation
  getRecordStatistics,
  getRecordsByFilter,
  getRecordsGroupedBy,
  // Main query function for v-data-table-server
  queryRecordsForTable,
  // Types
  type RecordFilter,
  type RecordStatistics,
  type SortOptions,
  // Streaming (memory efficient)
  streamRecords,
  type TablePaginationOptions,
  type TableQueryResult,
} from './iplasDbQueries'
