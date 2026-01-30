/**
 * iPLAS Database Exports
 * 
 * Barrel export for IndexedDB utilities and types.
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

// Query helpers
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
