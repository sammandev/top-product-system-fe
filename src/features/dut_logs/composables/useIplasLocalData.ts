/**
 * useIplasLocalData Composable
 *
 * Provides reactive access to iPLAS data stored in IndexedDB.
 * Designed for use with v-data-table-server to enable "fake" server-side
 * pagination that queries locally stored data instead of network.
 *
 * Key Features:
 * - Reactive table state management
 * - Integration with v-data-table-server's loadItems handler
 * - Filter management with URL sync (optional)
 * - Stream progress tracking
 * - Automatic refresh on store updates
 */

import { computed, onUnmounted, type Ref, reactive, ref, watch } from 'vue'
import { getTotalCount } from '../db/iplasDb'
import {
  getDistinctValues,
  getRecordStatistics,
  getRecordsByFilter,
  type IplasDbRecord,
  queryRecordsForTable,
  type RecordFilter,
  type RecordStatistics,
  type SortOptions,
  type TablePaginationOptions,
} from '../db/iplasDbQueries'
import {
  type StreamStatus,
  type StreamToDbRequest,
  useIplasDataStore,
} from '../stores/iplasData.store'

// Re-export types for convenience
export type { RecordFilter, SortOptions, IplasDbRecord, RecordStatistics }

// ============================================================================
// Types
// ============================================================================

/**
 * Options for the composable
 */
export interface UseIplasLocalDataOptions {
  /** Auto-refresh interval in ms (0 = disabled) */
  autoRefreshInterval?: number
  /** Initial filter */
  initialFilter?: RecordFilter
  /** Initial items per page */
  initialItemsPerPage?: number
  /** Debounce time for filter changes in ms */
  filterDebounceMs?: number
}

/**
 * Table options compatible with Vuetify's v-data-table-server
 */
export interface VuetifyTableOptions {
  page: number
  itemsPerPage: number
  sortBy: Array<{ key: string; order: 'asc' | 'desc' }>
}

/**
 * Return type of the composable
 */
export interface UseIplasLocalDataReturn {
  // State
  items: Ref<IplasDbRecord[]>
  totalItems: Ref<number>
  loading: Ref<boolean>
  error: Ref<string | null>

  // Filter state
  filter: RecordFilter

  // Table options (for v-model binding)
  tableOptions: Ref<VuetifyTableOptions>

  // Stream status (reactive)
  streamStatus: StreamStatus

  // Statistics
  statistics: Ref<RecordStatistics | null>

  // Computed
  hasData: Ref<boolean>
  isStreaming: Ref<boolean>
  streamProgress: Ref<number>

  // Methods
  loadItems: (options: VuetifyTableOptions) => Promise<void>
  loadAllItems: () => Promise<void>
  refreshData: () => Promise<void>
  updateFilter: (newFilter: Partial<RecordFilter>) => void
  clearFilter: () => void
  streamData: (request: StreamToDbRequest) => Promise<number>
  abortStream: () => void
  getDistinctStations: () => Promise<string[]>
  getDistinctSites: () => Promise<string[]>
  loadStatistics: () => Promise<void>
}

// ============================================================================
// Composable Implementation
// ============================================================================

/**
 * Composable for accessing iPLAS data from IndexedDB with table integration
 *
 * @example
 * ```vue
 * <script setup>
 * const {
 *   items,
 *   totalItems,
 *   loading,
 *   tableOptions,
 *   loadItems,
 *   filter,
 *   updateFilter
 * } = useIplasLocalData()
 * </script>
 *
 * <template>
 *   <v-data-table-server
 *     v-model:options="tableOptions"
 *     :items="items"
 *     :items-length="totalItems"
 *     :loading="loading"
 *     @update:options="loadItems"
 *   />
 * </template>
 * ```
 */
export function useIplasLocalData(options: UseIplasLocalDataOptions = {}): UseIplasLocalDataReturn {
  const {
    autoRefreshInterval = 0,
    initialFilter = {},
    initialItemsPerPage = 25,
    filterDebounceMs = 300,
  } = options

  // Get the Pinia store
  const store = useIplasDataStore()

  // ============================================================================
  // State
  // ============================================================================

  const items = ref<IplasDbRecord[]>([])
  const totalItems = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const statistics = ref<RecordStatistics | null>(null)

  // Filter state (reactive for deep watching)
  const filter = reactive<RecordFilter>({ ...initialFilter })

  // Table options for v-data-table-server binding
  const tableOptions = ref<VuetifyTableOptions>({
    page: 1,
    itemsPerPage: initialItemsPerPage,
    sortBy: [{ key: 'TestStartTime', order: 'desc' }],
  })

  // Debounce timer
  let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null

  // Auto-refresh timer
  let autoRefreshTimer: ReturnType<typeof setInterval> | null = null

  // ============================================================================
  // Computed
  // ============================================================================

  const hasData = computed(() => totalItems.value > 0)

  const isStreaming = computed(() => store.streamStatus.isStreaming)

  const streamProgress = computed(() => {
    const { recordsWritten, totalEstimated } = store.streamStatus
    if (totalEstimated === 0) return 0
    return Math.round((recordsWritten / totalEstimated) * 100)
  })

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Load items from IndexedDB for the current page
   *
   * This is the handler for v-data-table-server's @update:options event.
   */
  async function loadItems(opts: VuetifyTableOptions): Promise<void> {
    loading.value = true
    error.value = null

    try {
      // Convert Vuetify options to our query format
      const paginationOptions: TablePaginationOptions = {
        page: opts.page,
        itemsPerPage: opts.itemsPerPage,
        sortBy: opts.sortBy.map((s) => ({
          key: s.key as SortOptions['key'],
          order: s.order,
        })),
      }

      // Query IndexedDB
      const result = await queryRecordsForTable(paginationOptions, filter)

      items.value = result.items
      totalItems.value = result.total

      // Update table options ref
      tableOptions.value = opts
    } catch (err) {
      console.error('[useIplasLocalData] Query failed:', err)
      error.value = err instanceof Error ? err.message : 'Query failed'
    } finally {
      loading.value = false
    }
  }

  /**
   * Load ALL items from IndexedDB for client-side pagination.
   *
   * Use this for v-data-table (client-side) instead of v-data-table-server.
   * Loads all matching records from IndexedDB into the items array.
   *
   * UPDATED: Added for client-side table pagination support
   */
  async function loadAllItems(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      // Get all records matching the current filter (no limit)
      const allRecords = await getRecordsByFilter(filter)

      items.value = allRecords
      totalItems.value = allRecords.length
    } catch (err) {
      console.error('[useIplasLocalData] Load all items failed:', err)
      error.value = err instanceof Error ? err.message : 'Load all items failed'
    } finally {
      loading.value = false
    }
  }

  /**
   * Refresh data with current options
   */
  async function refreshData(): Promise<void> {
    await loadItems(tableOptions.value)
  }

  /**
   * Update filter and refresh data (debounced)
   */
  function updateFilter(newFilter: Partial<RecordFilter>): void {
    // Update filter
    Object.assign(filter, newFilter)

    // Debounce the refresh
    if (filterDebounceTimer) {
      clearTimeout(filterDebounceTimer)
    }

    filterDebounceTimer = setTimeout(() => {
      // Reset to page 1 when filter changes
      tableOptions.value.page = 1
      refreshData()
    }, filterDebounceMs)
  }

  /**
   * Clear all filters
   */
  function clearFilter(): void {
    // Reset filter to empty
    Object.keys(filter).forEach((key) => {
      delete (filter as Record<string, unknown>)[key]
    })

    // Reset to page 1 and refresh
    tableOptions.value.page = 1
    refreshData()
  }

  /**
   * Stream data from backend to IndexedDB
   *
   * After streaming completes, automatically refreshes the table.
   */
  async function streamData(request: StreamToDbRequest): Promise<number> {
    loading.value = true
    error.value = null

    try {
      const count = await store.streamToIndexedDb(request)

      // Refresh table after streaming
      await refreshData()

      return count
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Streaming failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Abort current stream
   */
  function abortStream(): void {
    store.abortIndexedDbStream()
  }

  /**
   * Get distinct station names from stored data
   */
  async function getDistinctStations(): Promise<string[]> {
    return getDistinctValues('Station')
  }

  /**
   * Get distinct site names from stored data
   */
  async function getDistinctSites(): Promise<string[]> {
    return getDistinctValues('Site')
  }

  /**
   * Load statistics about stored data
   */
  async function loadStatistics(): Promise<void> {
    try {
      statistics.value = await getRecordStatistics()
    } catch (err) {
      console.error('[useIplasLocalData] Failed to load statistics:', err)
    }
  }

  // ============================================================================
  // Watchers
  // ============================================================================

  // Watch for stream completion and refresh
  watch(
    () => store.streamStatus.isStreaming,
    (isStreaming, wasStreaming) => {
      // When streaming finishes, refresh the data
      if (wasStreaming && !isStreaming && store.streamStatus.recordsWritten > 0) {
        refreshData()
      }
    },
  )

  // ============================================================================
  // Lifecycle
  // ============================================================================

  // Set up auto-refresh if configured
  if (autoRefreshInterval > 0) {
    autoRefreshTimer = setInterval(() => {
      if (!loading.value && !isStreaming.value) {
        refreshData()
      }
    }, autoRefreshInterval)
  }

  // Initial load of total count
  getTotalCount().then((count) => {
    totalItems.value = count
  })

  // Cleanup on unmount
  onUnmounted(() => {
    if (filterDebounceTimer) {
      clearTimeout(filterDebounceTimer)
    }
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer)
    }
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    items,
    totalItems,
    loading,
    error,

    // Filter
    filter,

    // Table options
    tableOptions,

    // Stream status from store
    streamStatus: store.streamStatus,

    // Statistics
    statistics,

    // Computed
    hasData,
    isStreaming,
    streamProgress,

    // Methods
    loadItems,
    loadAllItems,
    refreshData,
    updateFilter,
    clearFilter,
    streamData,
    abortStream,
    getDistinctStations,
    getDistinctSites,
    loadStatistics,
  }
}

// ============================================================================
// Export default
// ============================================================================

export default useIplasLocalData
