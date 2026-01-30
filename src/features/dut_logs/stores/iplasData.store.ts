/**
 * iPLAS Data Store
 * 
 * Centralized Pinia store for iPLAS data management.
 * Provides shared state across components with memory optimization:
 * - Uses shallowRef for large arrays to reduce reactivity overhead
 * - Stores test items in a non-reactive Map for memory efficiency
 * - Supports compact records for list views
 * - Caches metadata (site/projects, stations) to reduce API calls
 * - Streams large datasets to IndexedDB (disk) instead of memory
 */

import { defineStore } from 'pinia'
import { ref, shallowRef, computed, reactive } from 'vue'
import {
  iplasProxyApi,
  type SiteProject,
  type IplasStation,
  type CsvTestItemData,
  type CompactCsvTestItemData,
  type TestItem,
  type IplasIsnSearchRecord
} from '../api/iplasProxyApi'
import { useIplasSettings } from '../composables/useIplasSettings'
import {
  fetchAndSinkToDB,
  abortCurrentStream,
  isStreaming as checkIsStreaming,
  type StreamMetadata,
  type StreamProgress
} from '../api/streamReader'
import {
  getPagedRecords,
  getTotalCount,
  clearAllRecords,
  getStorageStats,
  type IplasDbRecord,
  type IplasDbQueryOptions
} from '../db/iplasDb'

// Re-export types for convenience
export type { SiteProject, IplasStation, CsvTestItemData, CompactCsvTestItemData, TestItem, IplasIsnSearchRecord, IplasDbRecord }

/**
 * Pagination options for server-side data tables
 */
export interface PaginationOptions {
  page: number
  itemsPerPage: number
  sortBy?: string
  sortDesc?: boolean
}

/**
 * Paginated response with total count
 */
export interface PaginatedResult<T> {
  items: T[]
  totalItems: number
  page: number
  itemsPerPage: number
  possiblyTruncated: boolean
  chunkProgress: { fetched: number; total: number } | null
}

/**
 * Station pagination state
 */
export interface StationPaginationState {
  page: number
  itemsPerPage: number
  sortBy: string
  sortDesc: boolean
  items: CompactCsvTestItemData[]
  totalItems: number
  loading: boolean
}

/**
 * Stream status for UI feedback during IndexedDB streaming
 * Used to prevent UI flash and show progress during data loading
 */
export interface StreamStatus {
  /** Whether a stream is currently active */
  isStreaming: boolean
  /** Number of records processed from network */
  recordsProcessed: number
  /** Number of records written to IndexedDB */
  recordsWritten: number
  /** Estimated total records (from metadata) */
  totalEstimated: number
  /** Bytes received from network */
  bytesReceived: number
  /** Timestamp of last UI refresh */
  lastRefreshAt: number
  /** Current run ID for race condition tracking */
  runId: number
  /** Error message if stream failed */
  error: string | null
  /** Stream metadata when available */
  metadata: StreamMetadata | null
}

/**
 * Request parameters for streaming to IndexedDB
 */
export interface StreamToDbRequest {
  site: string
  project: string
  station: string
  deviceId: string
  beginTime: Date | string
  endTime: Date | string
  testStatus: 'PASS' | 'FAIL' | 'ALL'
}

export const useIplasDataStore = defineStore('iplasData', () => {
  // ============================================================================
  // Settings
  // ============================================================================
  const { apiToken } = useIplasSettings()
  
  function getUserToken(): string | undefined {
    const token = apiToken.value
    return token && token.trim() ? token : undefined
  }

  // ============================================================================
  // Loading States
  // ============================================================================
  const loading = ref(false)
  const loadingStations = ref(false)
  const loadingDevices = ref(false)
  const loadingTestItems = ref(false)
  const loadingIsnSearch = ref(false)
  const downloading = ref(false)

  // ============================================================================
  // Error State
  // ============================================================================
  const error = ref<string | null>(null)
  
  // ============================================================================
  // Warning States
  // ============================================================================
  const possiblyTruncated = ref(false)
  const chunkProgress = ref<{ fetched: number; total: number } | null>(null)

  // ============================================================================
  // Stream Status (for IndexedDB streaming with UI feedback)
  // ============================================================================
  const streamStatus = reactive<StreamStatus>({
    isStreaming: false,
    recordsProcessed: 0,
    recordsWritten: 0,
    totalEstimated: 0,
    bytesReceived: 0,
    lastRefreshAt: 0,
    runId: 0,
    error: null,
    metadata: null
  })

  // ============================================================================
  // Metadata (cached at module level for performance)
  // ============================================================================
  const siteProjects = ref<SiteProject[]>([])
  const stations = ref<IplasStation[]>([])
  const deviceIds = ref<string[]>([])
  
  // Cache status
  let siteProjectsCached = false
  const stationsCache = new Map<string, IplasStation[]>()

  // ============================================================================
  // Data States (using shallowRef for large arrays)
  // ============================================================================
  
  // Full records - used when detailed test items are needed immediately
  const testItemData = shallowRef<CsvTestItemData[]>([])
  
  // Compact records - for memory-efficient list views
  const compactTestItemData = shallowRef<CompactCsvTestItemData[]>([])
  
  // ISN search results
  const isnSearchData = shallowRef<IplasIsnSearchRecord[]>([])

  // ============================================================================
  // Test Items Cache (non-reactive for memory efficiency)
  // ============================================================================
  
  // Lazy-loaded TestItems cache (key: `${ISN}_${TestStartTime}`)
  const testItemsCache = new Map<string, TestItem[]>()
  
  // Track which records are currently loading test items
  const loadingTestItemsForRecord = new Set<string>()

  // ============================================================================
  // Per-Station Pagination State
  // ============================================================================
  const paginationByStation = ref<Record<string, StationPaginationState>>({})

  // ============================================================================
  // Computed Properties
  // ============================================================================
  
  const uniqueSites = computed(() => {
    const sites = new Set(siteProjects.value.map(sp => sp.site))
    return Array.from(sites).sort()
  })

  const projectsBySite = computed(() => {
    const map: Record<string, string[]> = {}
    for (const sp of siteProjects.value) {
      if (!map[sp.site]) {
        map[sp.site] = []
      }
      map[sp.site]!.push(sp.project)
    }
    for (const site of Object.keys(map)) {
      map[site]!.sort()
    }
    return map
  })

  const totalRecords = computed(() => 
    testItemData.value.length + compactTestItemData.value.length
  )

  // ============================================================================
  // Metadata Actions
  // ============================================================================

  async function fetchSiteProjects(forceRefresh = false): Promise<SiteProject[]> {
    if (siteProjectsCached && !forceRefresh && siteProjects.value.length > 0) {
      return siteProjects.value
    }

    loading.value = true
    error.value = null

    try {
      const response = await iplasProxyApi.getSiteProjects('simple')
      siteProjects.value = response.data
      siteProjectsCached = true
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch site projects'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchStations(
    site: string,
    project: string,
    forceRefresh = false
  ): Promise<IplasStation[]> {
    const cacheKey = `${site}::${project}`
    
    if (!forceRefresh && stationsCache.has(cacheKey)) {
      stations.value = stationsCache.get(cacheKey)!
      return stations.value
    }

    loadingStations.value = true
    error.value = null

    try {
      const response = await iplasProxyApi.getStations({
        site,
        project,
        token: getUserToken()
      })
      stations.value = response.data
      stationsCache.set(cacheKey, response.data)
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch stations'
      throw err
    } finally {
      loadingStations.value = false
    }
  }

  async function fetchDeviceIds(
    site: string,
    project: string,
    station: string,
    startTime: Date | string,
    endTime: Date | string
  ): Promise<string[]> {
    loadingDevices.value = true
    error.value = null

    try {
      const response = await iplasProxyApi.getDevices({
        site,
        project,
        station,
        start_time: iplasProxyApi.formatDateForRequest(startTime),
        end_time: iplasProxyApi.formatDateForRequest(endTime),
        token: getUserToken()
      })
      deviceIds.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch device IDs'
      throw err
    } finally {
      loadingDevices.value = false
    }
  }

  // ============================================================================
  // Data Fetching Actions
  // ============================================================================

  async function fetchTestItemsCompact(
    site: string,
    project: string,
    station: string,
    deviceId: string,
    beginTime: Date | string,
    endTime: Date | string,
    testStatus: 'PASS' | 'FAIL' | 'ALL' = 'ALL'
  ): Promise<CompactCsvTestItemData[]> {
    loadingTestItems.value = true
    error.value = null
    chunkProgress.value = null

    try {
      const response = await iplasProxyApi.getCsvTestItemsCompact({
        site,
        project,
        station,
        device_id: deviceId,
        begin_time: iplasProxyApi.formatDateForRequest(beginTime),
        end_time: iplasProxyApi.formatDateForRequest(endTime),
        test_status: testStatus,
        token: getUserToken()
      })

      if (response.possibly_truncated) {
        possiblyTruncated.value = true
      }

      if (response.chunks_fetched && response.total_chunks) {
        chunkProgress.value = {
          fetched: response.chunks_fetched,
          total: response.total_chunks
        }
      }

      // Append to existing data
      compactTestItemData.value = [...compactTestItemData.value, ...response.data]
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch compact test items'
      throw err
    } finally {
      loadingTestItems.value = false
    }
  }

  async function fetchTestItemsPaginated(
    site: string,
    project: string,
    station: string,
    deviceId: string,
    beginTime: Date | string,
    endTime: Date | string,
    testStatus: 'PASS' | 'FAIL' | 'ALL' = 'ALL',
    options: PaginationOptions = { page: 1, itemsPerPage: 25 }
  ): Promise<PaginatedResult<CompactCsvTestItemData>> {
    loadingTestItems.value = true
    error.value = null
    chunkProgress.value = null

    try {
      const offset = (options.page - 1) * options.itemsPerPage

      const response = await iplasProxyApi.getCsvTestItemsCompact({
        site,
        project,
        station,
        device_id: deviceId,
        begin_time: iplasProxyApi.formatDateForRequest(beginTime),
        end_time: iplasProxyApi.formatDateForRequest(endTime),
        test_status: testStatus,
        limit: options.itemsPerPage,
        offset,
        sort_by: options.sortBy,
        sort_desc: options.sortDesc ?? true,
        token: getUserToken()
      })

      const truncated = response.possibly_truncated ?? false
      if (truncated) {
        possiblyTruncated.value = true
      }

      let progress: { fetched: number; total: number } | null = null
      if (response.chunks_fetched && response.total_chunks) {
        progress = {
          fetched: response.chunks_fetched,
          total: response.total_chunks
        }
        chunkProgress.value = progress
      }

      return {
        items: response.data,
        totalItems: response.total_records,
        page: options.page,
        itemsPerPage: options.itemsPerPage,
        possiblyTruncated: truncated,
        chunkProgress: progress
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch paginated test items'
      throw err
    } finally {
      loadingTestItems.value = false
    }
  }

  async function fetchRecordTestItems(
    site: string,
    project: string,
    station: string,
    isn: string,
    testStartTime: string,
    deviceId: string = 'ALL'
  ): Promise<TestItem[]> {
    const cacheKey = `${isn}_${testStartTime}`

    // Return cached if available
    if (testItemsCache.has(cacheKey)) {
      return testItemsCache.get(cacheKey)!
    }

    // Mark as loading
    loadingTestItemsForRecord.add(cacheKey)

    try {
      const response = await iplasProxyApi.getRecordTestItems({
        site,
        project,
        station,
        isn,
        test_start_time: testStartTime,
        device_id: deviceId,
        token: getUserToken()
      })

      const testItems = response.test_items as TestItem[]
      testItemsCache.set(cacheKey, testItems)
      return testItems
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch record test items'
      throw err
    } finally {
      loadingTestItemsForRecord.delete(cacheKey)
    }
  }

  async function searchByIsn(isn: string): Promise<IplasIsnSearchRecord[]> {
    loadingIsnSearch.value = true
    error.value = null

    try {
      const response = await iplasProxyApi.searchByIsn({
        isn,
        token: getUserToken()
      })
      isnSearchData.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to search by ISN'
      throw err
    } finally {
      loadingIsnSearch.value = false
    }
  }

  // ============================================================================
  // Station Pagination Actions
  // ============================================================================

  function getStationPaginationState(stationName: string): StationPaginationState {
    if (!paginationByStation.value[stationName]) {
      paginationByStation.value[stationName] = {
        page: 1,
        itemsPerPage: 25,
        sortBy: 'TestStartTime',
        sortDesc: true,
        items: [],
        totalItems: 0,
        loading: false
      }
    }
    return paginationByStation.value[stationName]!
  }

  async function updateStationPagination(
    stationName: string,
    site: string,
    project: string,
    deviceId: string,
    beginTime: Date | string,
    endTime: Date | string,
    testStatus: 'PASS' | 'FAIL' | 'ALL',
    options: { page: number; itemsPerPage: number; sortBy?: string; sortDesc?: boolean }
  ): Promise<void> {
    const state = getStationPaginationState(stationName)
    state.loading = true

    try {
      const result = await fetchTestItemsPaginated(
        site,
        project,
        stationName,
        deviceId,
        beginTime,
        endTime,
        testStatus,
        {
          page: options.page,
          itemsPerPage: options.itemsPerPage,
          sortBy: options.sortBy || 'TestStartTime',
          sortDesc: options.sortDesc ?? true
        }
      )

      state.page = result.page
      state.itemsPerPage = result.itemsPerPage
      state.sortBy = options.sortBy || 'TestStartTime'
      state.sortDesc = options.sortDesc ?? true
      state.items = result.items
      state.totalItems = result.totalItems
    } finally {
      state.loading = false
    }
  }

  // ============================================================================
  // Streaming Actions
  // ============================================================================

  // Track active stream abort controller
  let activeStreamController: AbortController | null = null

  /**
   * Stream test items using NDJSON for memory-efficient loading
   * 
   * @param options - Streaming options
   * @returns Total records streamed
   */
  async function streamTestItems(options: {
    site: string
    project: string
    station: string
    deviceId: string
    beginTime: Date | string
    endTime: Date | string
    testStatus: 'PASS' | 'FAIL' | 'ALL'
    onRecord?: (record: CompactCsvTestItemData) => void
    onProgress?: (current: number, total: number) => void
  }): Promise<number> {
    // Abort any existing stream
    abortStream()

    loadingTestItems.value = true
    error.value = null
    chunkProgress.value = null

    // Create new abort controller
    activeStreamController = new AbortController()
    const collectedRecords: CompactCsvTestItemData[] = []
    let recordCount = 0

    try {
      const count = await iplasProxyApi.streamCsvTestItems(
        {
          site: options.site,
          project: options.project,
          station: options.station,
          device_id: options.deviceId,
          begin_time: iplasProxyApi.formatDateForRequest(options.beginTime),
          end_time: iplasProxyApi.formatDateForRequest(options.endTime),
          test_status: options.testStatus,
          token: getUserToken()
        },
        (record) => {
          collectedRecords.push(record)
          recordCount++
          options.onRecord?.(record)
          
          // Update progress periodically
          if (recordCount % 100 === 0) {
            options.onProgress?.(recordCount, chunkProgress.value?.total || recordCount)
          }
        },
        (metadata) => {
          if (metadata.possiblyTruncated) {
            possiblyTruncated.value = true
          }
          if (metadata.chunksFetched && metadata.totalChunks) {
            chunkProgress.value = {
              fetched: metadata.chunksFetched,
              total: metadata.totalChunks
            }
          }
        },
        (err) => {
          error.value = err.message || 'Streaming failed'
        },
        activeStreamController.signal
      )

      // Update store with all collected records
      compactTestItemData.value = [...compactTestItemData.value, ...collectedRecords]
      
      return count
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        error.value = err.message || 'Streaming failed'
      }
      throw err
    } finally {
      loadingTestItems.value = false
      activeStreamController = null
    }
  }

  /**
   * Abort any active stream
   */
  function abortStream(): void {
    if (activeStreamController) {
      activeStreamController.abort()
      activeStreamController = null
    }
  }

  // ============================================================================
  // IndexedDB Streaming Actions
  // ============================================================================

  /**
   * Reset stream status to initial state
   */
  function resetStreamStatus(): void {
    streamStatus.isStreaming = false
    streamStatus.recordsProcessed = 0
    streamStatus.recordsWritten = 0
    streamStatus.totalEstimated = 0
    streamStatus.bytesReceived = 0
    streamStatus.lastRefreshAt = 0
    streamStatus.runId = 0
    streamStatus.error = null
    streamStatus.metadata = null
  }

  /**
   * Stream test items directly to IndexedDB for memory-efficient storage
   * 
   * This is the primary method for loading large datasets.
   * Data flows: Network → IndexedDB (disk) instead of Network → Memory
   * 
   * Benefits:
   * - Constant memory usage regardless of dataset size
   * - Survives page refreshes (data persisted)
   * - Better performance for large datasets (50k+ records)
   * 
   * @param request - Stream request parameters
   * @returns Number of records written to IndexedDB
   */
  async function streamToIndexedDb(request: StreamToDbRequest): Promise<number> {
    // Reset status and set streaming flag
    resetStreamStatus()
    streamStatus.isStreaming = true
    streamStatus.runId = Date.now()
    error.value = null
    possiblyTruncated.value = false

    try {
      const recordsWritten = await fetchAndSinkToDB({
        request: {
          site: request.site,
          project: request.project,
          station: request.station,
          device_id: request.deviceId,
          begin_time: iplasProxyApi.formatDateForRequest(request.beginTime),
          end_time: iplasProxyApi.formatDateForRequest(request.endTime),
          test_status: request.testStatus,
          token: getUserToken()
        },
        onProgress: (progress: StreamProgress) => {
          streamStatus.recordsProcessed = progress.recordsProcessed
          streamStatus.recordsWritten = progress.recordsWritten
          streamStatus.totalEstimated = progress.totalEstimated
          streamStatus.bytesReceived = progress.bytesReceived
          streamStatus.lastRefreshAt = Date.now()

          if (progress.error) {
            streamStatus.error = progress.error.message
            error.value = progress.error.message
          }
        },
        onMetadata: (metadata: StreamMetadata) => {
          streamStatus.metadata = metadata
          streamStatus.totalEstimated = metadata.totalRecords

          if (metadata.possiblyTruncated) {
            possiblyTruncated.value = true
          }
          if (metadata.chunksFetched && metadata.totalChunks) {
            chunkProgress.value = {
              fetched: metadata.chunksFetched,
              total: metadata.totalChunks
            }
          }
        },
        onComplete: (total: number) => {
          streamStatus.recordsWritten = total
          streamStatus.isStreaming = false
          console.log(`[IplasStore] Streamed ${total} records to IndexedDB`)
        },
        onError: (err: Error) => {
          streamStatus.error = err.message
          streamStatus.isStreaming = false
          error.value = err.message
        },
        batchSize: 100,
        progressInterval: 50
      })

      return recordsWritten
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        streamStatus.error = err.message || 'Streaming failed'
        error.value = err.message || 'Streaming failed'
      }
      streamStatus.isStreaming = false
      throw err
    }
  }

  /**
   * Abort the current IndexedDB stream
   */
  function abortIndexedDbStream(): void {
    abortCurrentStream()
    streamStatus.isStreaming = false
  }

  /**
   * Query records from IndexedDB with pagination and filtering
   * 
   * This replaces network-based pagination with local IndexedDB queries.
   * Much faster for filtering/sorting since data is already on disk.
   * 
   * @param options - Query options (station, status, pagination, sorting)
   * @returns Paginated records from IndexedDB
   */
  async function queryFromIndexedDb(options: IplasDbQueryOptions = {}): Promise<{
    records: IplasDbRecord[]
    totalCount: number
    hasMore: boolean
  }> {
    return getPagedRecords(options)
  }

  /**
   * Get total count of records in IndexedDB
   */
  async function getIndexedDbRecordCount(): Promise<number> {
    return getTotalCount()
  }

  /**
   * Clear all records from IndexedDB
   */
  async function clearIndexedDb(): Promise<void> {
    await clearAllRecords()
    resetStreamStatus()
  }

  /**
   * Get storage statistics for IndexedDB
   */
  async function getIndexedDbStats(): Promise<{
    recordCount: number
    estimatedSizeBytes: number
    quotaBytes: number
    usageBytes: number
  }> {
    return getStorageStats()
  }

  /**
   * Check if IndexedDB streaming is currently active
   */
  function isIndexedDbStreaming(): boolean {
    return streamStatus.isStreaming || checkIsStreaming()
  }

  // ============================================================================
  // Utility Actions
  // ============================================================================

  function clearTestItemData(): void {
    testItemData.value = []
    compactTestItemData.value = []
    possiblyTruncated.value = false
    chunkProgress.value = null
  }

  function clearIsnSearchData(): void {
    isnSearchData.value = []
  }

  function clearTestItemsCache(): void {
    testItemsCache.clear()
    loadingTestItemsForRecord.clear()
  }

  function clearPaginationState(): void {
    paginationByStation.value = {}
  }

  function clearAllData(): void {
    clearTestItemData()
    clearIsnSearchData()
    clearTestItemsCache()
    clearPaginationState()
    error.value = null
  }

  function isRecordLoading(isn: string, testStartTime: string): boolean {
    return loadingTestItemsForRecord.has(`${isn}_${testStartTime}`)
  }

  function getTestItemsFromCache(isn: string, testStartTime: string): TestItem[] | undefined {
    return testItemsCache.get(`${isn}_${testStartTime}`)
  }

  // ============================================================================
  // Return Public API
  // ============================================================================
  return {
    // Loading States
    loading,
    loadingStations,
    loadingDevices,
    loadingTestItems,
    loadingIsnSearch,
    downloading,

    // Error & Warning States
    error,
    possiblyTruncated,
    chunkProgress,

    // Stream Status (for IndexedDB streaming)
    streamStatus,

    // Metadata
    siteProjects,
    stations,
    deviceIds,
    uniqueSites,
    projectsBySite,

    // Data
    testItemData,
    compactTestItemData,
    isnSearchData,
    totalRecords,

    // Pagination
    paginationByStation,
    getStationPaginationState,
    updateStationPagination,

    // Metadata Actions
    fetchSiteProjects,
    fetchStations,
    fetchDeviceIds,

    // Data Actions
    fetchTestItemsCompact,
    fetchTestItemsPaginated,
    fetchRecordTestItems,
    searchByIsn,

    // Legacy Streaming Actions (memory-based)
    streamTestItems,
    abortStream,

    // IndexedDB Streaming Actions (disk-based)
    streamToIndexedDb,
    abortIndexedDbStream,
    queryFromIndexedDb,
    getIndexedDbRecordCount,
    clearIndexedDb,
    getIndexedDbStats,
    isIndexedDbStreaming,
    resetStreamStatus,

    // Utility Actions
    clearTestItemData,
    clearIsnSearchData,
    clearTestItemsCache,
    clearPaginationState,
    clearAllData,
    isRecordLoading,
    getTestItemsFromCache
  }
})
