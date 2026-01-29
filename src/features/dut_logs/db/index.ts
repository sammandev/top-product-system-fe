/**
 * iPLAS Database Exports
 * 
 * Barrel export for IndexedDB utilities and types.
 * 
 * @see IPLAS_PERFORMANCE_OPTIMIZATION_PLAN.md Phase 5.4, 5.5
 */

export {
  // Database initialization
  getDb,
  closeDb,
  deleteDatabase,
  
  // Write operations
  openWriteTransaction,
  putRecord,
  putRecordsBatch,
  clearAllRecords,
  clearStaleRecords,
  
  // Read operations
  getTotalCount,
  getCountByStation,
  getCountByStatus,
  getRecord,
  getAllRecords,
  getPagedRecords,
  getRecordsByIsn,
  getDistinctStations,
  
  // Utilities
  generateRecordId,
  getStorageStats,
  
  // Types
  type IplasDbRecord,
  type IplasDbQueryOptions,
  type IplasDbPageResult,
  type IplasDbSchema,
  type IDBPDatabase
} from './iplasDb'

// Query helpers (Phase 5.5)
export {
  // Main query function for v-data-table-server
  queryRecordsForTable,
  
  // Filter utilities
  getFilteredCount,
  getRecordsByFilter,
  
  // Statistics & aggregation
  getRecordStatistics,
  getDistinctValues,
  getRecordsGroupedBy,
  
  // Streaming (memory efficient)
  streamRecords,
  
  // Types
  type RecordFilter,
  type SortOptions,
  type TablePaginationOptions,
  type TableQueryResult,
  type RecordStatistics
} from './iplasDbQueries'
