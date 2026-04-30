/**
 * iPLAS API Composable
 *
 * Provides reactive state and methods for interacting with iPLAS APIs
 * through the backend proxy for security and performance.
 *
 * All methods now use the backend proxy by default. Tokens are securely
 * managed on the backend with optional user override via settings.
 *
 * Memory Optimization:
 * - Uses shallowRef for large arrays to reduce Vue reactivity overhead
 * - Supports compact records (without TestItem arrays) for list views
 * - Supports lazy loading of TestItems for individual records
 */

import { computed, ref, shallowRef } from 'vue'
import { getErrorMessage } from '@/shared/utils'
import {
  type CompactCsvTestItemData,
  type CsvTestItemData,
  type IplasBatchDownloadResponse,
  type IplasCachedTestItemNamesResponse,
  type IplasCsvTestItemResponse,
  type IplasDownloadAttachmentInfo,
  type IplasDownloadCsvLogInfo,
  type IplasIsnSearchRecord,
  type IplasStation,
  type IplasStationSearchBucketStat,
  type IplasStationSearchCacheMetadata,
  type IplasTestItemInfo,
  iplasProxyApi,
  type SiteProject,
  type TestItem,
} from '../api/iplasProxyApi'
import {
  fetchIplasDevicesQuery,
  fetchIplasPaginatedTestItemsQuery,
  fetchIplasRecordTestItemsQuery,
  fetchIplasSiteProjectsQuery,
  fetchIplasStationsQuery,
} from './useIplasQueries'
import { useIplasSettings } from './useIplasSettings'

// Re-export types for backwards compatibility
export type {
  CompactCsvTestItemData,
  CsvTestItemData,
  IplasIsnSearchRecord,
  IplasStation,
  SiteProject,
  TestItem,
}

// Type aliases for backwards compatibility
export type Station = IplasStation
export type DownloadAttachmentInfo = IplasDownloadAttachmentInfo
export type DownloadCsvLogInfo = IplasDownloadCsvLogInfo
export type IsnSearchData = IplasIsnSearchRecord

/**
 * Pagination options for server-side data tables
 */
export interface PaginationOptions {
  page: number // 1-based page number
  itemsPerPage: number // Items per page (e.g., 10, 25, 50)
  sortBy?: string // Field name to sort by
  sortDesc?: boolean // Sort in descending order
}

/**
 * Paginated response with total count for server-driven tables
 */
export interface PaginatedResult<T> {
  items: T[]
  totalItems: number
  page: number
  itemsPerPage: number
  possiblyTruncated: boolean
  chunkProgress: { fetched: number; total: number } | null
}

// Retry configuration for ISN search operations
const ISN_SEARCH_RETRY_ATTEMPTS = 3
const ISN_SEARCH_RETRY_DELAY_MS = 1000
const MAX_RECORD_TEST_ITEM_CACHE_ENTRIES = 150

/**
 * Retry an async operation with exponential backoff.
 * Useful for handling transient network failures during ISN search.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = ISN_SEARCH_RETRY_ATTEMPTS,
  initialDelayMs: number = ISN_SEARCH_RETRY_DELAY_MS,
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err as Error
      console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, err)
      if (attempt < maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s...
        const delayMs = initialDelayMs * 2 ** (attempt - 1)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }
  throw lastError
}

/**
 * Create a unique key for a test item record to enable deduplication.
 * Uses ISN + station + test_end_time as the unique identifier.
 * This prevents duplicate entries when:
 * - Chunked fetching returns overlapping records at chunk boundaries
 * - Multiple device IDs return the same record (rare but possible)
 */
function createRecordKey(record: CsvTestItemData | CompactCsvTestItemData): string {
  const isn = record.ISN || record.DeviceId || ''
  const station = record.station || record.TSP || ''
  const endTime = record['Test end Time'] || record['Test Start Time'] || ''
  return `${isn}_${station}_${endTime}`
}

/**
 * Deduplicate test item records by unique key.
 * Preserves the order of existing records and appends only new records.
 */
function deduplicateRecords<T extends CsvTestItemData | CompactCsvTestItemData>(
  existingRecords: T[],
  newRecords: T[],
): T[] {
  const existingKeys = new Set(existingRecords.map(createRecordKey))
  const uniqueNewRecords = newRecords.filter((record) => {
    const key = createRecordKey(record)
    if (existingKeys.has(key)) {
      return false
    }
    existingKeys.add(key)
    return true
  })
  return [...existingRecords, ...uniqueNewRecords]
}

function mergeBucketStats(
  existingStats: IplasStationSearchBucketStat[],
  newStats: IplasStationSearchBucketStat[],
): IplasStationSearchBucketStat[] {
  const statMap = new Map<string, IplasStationSearchBucketStat>()

  for (const stat of existingStats) {
    statMap.set(`${stat.bucket_start}_${stat.bucket_end}_${stat.source}`, stat)
  }

  for (const stat of newStats) {
    statMap.set(`${stat.bucket_start}_${stat.bucket_end}_${stat.source}`, stat)
  }

  return Array.from(statMap.values()).sort((a, b) => a.bucket_start.localeCompare(b.bucket_start))
}

function mergeStationSearchMetadata(
  current: IplasStationSearchCacheMetadata | null,
  response: Pick<IplasCsvTestItemResponse, 'cache_coverage' | 'validated_until' | 'bucket_stats'>,
): IplasStationSearchCacheMetadata | null {
  const mergedStats = mergeBucketStats(current?.bucketStats ?? [], response.bucket_stats ?? [])
  const validatedCandidates = [current?.validatedUntil, response.validated_until]
    .filter((value): value is string => Boolean(value))
    .sort()

  if (mergedStats.length === 0 && validatedCandidates.length === 0) {
    return current
  }

  let cacheCoverage: 'full' | 'partial' | 'miss' = 'full'
  const sources = new Set(mergedStats.map((stat) => stat.source))

  if (sources.has('cache') && sources.has('refresh')) {
    cacheCoverage = 'partial'
  } else if (sources.has('refresh')) {
    cacheCoverage = 'miss'
  }

  if (response.cache_coverage === 'partial') {
    cacheCoverage = 'partial'
  }

  return {
    cacheCoverage,
    validatedUntil: validatedCandidates[0] ?? null,
    bucketStats: mergedStats,
  }
}

function ensureArrayResponse<T>(
  data: T[] | null | undefined,
  emptyMessage: string,
  invalidMessage: string,
): T[] {
  if (!Array.isArray(data)) {
    throw new Error(invalidMessage)
  }

  if (data.length === 0) {
    throw new Error(emptyMessage)
  }

  return data
}

function getCachedRecordTestItems(
  cache: Map<string, TestItem[]>,
  cacheKey: string,
): TestItem[] | undefined {
  const cached = cache.get(cacheKey)
  if (!cached) {
    return undefined
  }

  cache.delete(cacheKey)
  cache.set(cacheKey, cached)
  return cached
}

function cacheRecordTestItems(
  cache: Map<string, TestItem[]>,
  cacheKey: string,
  items: TestItem[],
): void {
  if (cache.has(cacheKey)) {
    cache.delete(cacheKey)
  }

  cache.set(cacheKey, items)

  while (cache.size > MAX_RECORD_TEST_ITEM_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (!oldestKey) {
      break
    }
    cache.delete(oldestKey)
  }
}

/**
 * Composable for iPLAS API operations
 */
export function useIplasApi() {
  // Get settings for user token
  const { apiToken } = useIplasSettings()

  // Loading states
  const loading = ref(false)
  const loadingStations = ref(false)
  const loadingDevices = ref(false)
  const loadingTestItems = ref(false)
  const loadingIsnSearch = ref(false)
  const downloading = ref(false)
  const loadingRecordTestItems = ref(false)

  // Error state
  const error = ref<string | null>(null)

  // Warning state (for truncated data)
  const possiblyTruncated = ref(false)

  // Chunk progress tracking (for multi-day queries)
  const chunkProgress = ref<{ fetched: number; total: number } | null>(null)

  // Station Search cache metadata for lightweight UI status
  const stationSearchCacheMetadata = ref<IplasStationSearchCacheMetadata | null>(null)

  // Data states (using shallowRef for large arrays to reduce reactivity overhead)
  const siteProjects = ref<SiteProject[]>([])
  const stations = ref<Station[]>([])
  const deviceIds = ref<string[]>([])
  // Large arrays use shallowRef - Vue only tracks array replacement, not nested changes
  const testItemData = shallowRef<CsvTestItemData[]>([])
  const isnSearchData = shallowRef<IsnSearchData[]>([])

  // Compact data for memory-efficient list views (without TestItem arrays)
  const compactTestItemData = shallowRef<CompactCsvTestItemData[]>([])

  // Lazy-loaded TestItems cache (key: `${ISN}_${TestStartTime}`)
  const testItemsCache = new Map<string, TestItem[]>()

  // Computed
  const uniqueSites = computed(() => {
    const sites = new Set(siteProjects.value.map((sp) => sp.site))
    return Array.from(sites).sort()
  })

  const projectsBySite = computed(() => {
    const map: Record<string, string[]> = {}
    for (const sp of siteProjects.value) {
      if (!map[sp.site]) {
        map[sp.site] = []
      }
      map[sp.site]?.push(sp.project)
    }
    // Sort projects within each site
    for (const site of Object.keys(map)) {
      map[site]?.sort()
    }
    return map
  })

  /**
   * Get user token for proxy requests (if configured)
   */
  function getUserToken(): string | undefined {
    const token = apiToken.value
    // Return undefined if token is empty (backend will use default)
    return token?.trim() ? token : undefined
  }

  /**
   * Verify token access for a site/project via backend proxy
   */
  async function verifyAccess(site: string, project: string): Promise<boolean> {
    try {
      const response = await iplasProxyApi.verifyAccess({
        site,
        project,
        token: getUserToken(),
      })
      return response.success
    } catch (err) {
      console.error('Access verification failed:', err)
      return false
    }
  }

  /**
   * Fetch site and project list via backend proxy (cached for 24 hours)
   */
  async function fetchSiteProjects(forceRefresh = false): Promise<SiteProject[]> {
    loading.value = true
    error.value = null

    try {
      const data = await fetchIplasSiteProjectsQuery(forceRefresh)
      siteProjects.value = data
      return data
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to fetch site/project list'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch stations for a project via backend proxy (cached for 1 hour)
   */
  async function fetchStations(
    site: string,
    project: string,
    forceRefresh = false,
  ): Promise<Station[]> {
    loadingStations.value = true
    error.value = null

    try {
      const stationData = await fetchIplasStationsQuery(
        {
          site,
          project,
          token: getUserToken(),
        },
        forceRefresh,
      )
      stations.value = stationData
      return stationData
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to fetch station list'
      throw err
    } finally {
      loadingStations.value = false
    }
  }

  /**
   * Fetch device IDs for a station via backend proxy (cached for 5 minutes)
   */
  async function fetchDeviceIds(
    site: string,
    project: string,
    displayStationName: string,
    startTime: string | Date,
    endTime: string | Date,
  ): Promise<string[]> {
    loadingDevices.value = true
    error.value = null

    try {
      // Convert Date objects to ISO string if needed
      const start = startTime instanceof Date ? startTime.toISOString() : startTime
      const end = endTime instanceof Date ? endTime.toISOString() : endTime

      const data = await fetchIplasDevicesQuery({
        site,
        project,
        station: displayStationName,
        startTime: start,
        endTime: end,
        token: getUserToken(),
      })
      deviceIds.value = data
      return data
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to fetch device IDs'
      throw err
    } finally {
      loadingDevices.value = false
    }
  }

  /**
   * Get CSV test items for a device via backend proxy
   * Appends to existing testItemData instead of replacing
   *
   * @param begintime - Start time (Date object or ISO string)
   * @param endtime - End time (Date object or ISO string)
   */
  async function fetchTestItems(
    site: string,
    project: string,
    station: string,
    deviceid: string,
    begintime: string | Date,
    endtime: string | Date,
    testStatus: 'PASS' | 'FAIL' | 'ALL' = 'ALL',
  ): Promise<CompactCsvTestItemData[]> {
    loadingTestItems.value = true
    error.value = null
    chunkProgress.value = null

    try {
      const response = await iplasProxyApi.getCsvTestItems<CompactCsvTestItemData>({
        site,
        project,
        station,
        device_id: deviceid,
        begin_time: iplasProxyApi.formatDateForRequest(begintime),
        end_time: iplasProxyApi.formatDateForRequest(endtime),
        test_status: testStatus,
        include_test_items: false,
        token: getUserToken(),
      })
      const responseData = ensureArrayResponse(
        response.data as CompactCsvTestItemData[] | undefined,
        'No iPLAS data was returned for the selected device and time range',
        'iPLAS API returned an invalid response for test items',
      )

      // Track truncation warning (any chunk hit 5000 limit)
      if (response.possibly_truncated) {
        possiblyTruncated.value = true
      }

      // Track chunk progress
      if (response.chunks_fetched && response.total_chunks) {
        chunkProgress.value = {
          fetched: response.chunks_fetched,
          total: response.total_chunks,
        }
      }

      stationSearchCacheMetadata.value = mergeStationSearchMetadata(
        stationSearchCacheMetadata.value,
        response,
      )

      // Append to existing data with deduplication
      compactTestItemData.value = deduplicateRecords(compactTestItemData.value, responseData)
      return responseData
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to fetch test items'
      throw err
    } finally {
      loadingTestItems.value = false
    }
  }

  /**
   * Get full CSV test items for flows that still require TestItem arrays.
   * Use this only for explicit heavy-mode scenarios such as batched scoring.
   */
  async function fetchTestItemsFull(
    site: string,
    project: string,
    station: string,
    deviceid: string,
    begintime: string | Date,
    endtime: string | Date,
    testStatus: 'PASS' | 'FAIL' | 'ALL' = 'ALL',
  ): Promise<CsvTestItemData[]> {
    loadingTestItems.value = true
    error.value = null
    chunkProgress.value = null

    try {
      const response = await iplasProxyApi.getCsvTestItems<CsvTestItemData>({
        site,
        project,
        station,
        device_id: deviceid,
        begin_time: iplasProxyApi.formatDateForRequest(begintime),
        end_time: iplasProxyApi.formatDateForRequest(endtime),
        test_status: testStatus,
        include_test_items: true,
        token: getUserToken(),
      })
      const responseData = ensureArrayResponse(
        response.data as CsvTestItemData[] | undefined,
        'No iPLAS data was returned for the selected device and time range',
        'iPLAS API returned an invalid response for test items',
      )

      if (response.possibly_truncated) {
        possiblyTruncated.value = true
      }

      if (response.chunks_fetched && response.total_chunks) {
        chunkProgress.value = {
          fetched: response.chunks_fetched,
          total: response.total_chunks,
        }
      }

      stationSearchCacheMetadata.value = mergeStationSearchMetadata(
        stationSearchCacheMetadata.value,
        response,
      )

      testItemData.value = deduplicateRecords(testItemData.value, responseData)
      return responseData
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to fetch full test items'
      throw err
    } finally {
      loadingTestItems.value = false
    }
  }

  /**
   * Get compact CSV test items (without TestItem arrays) for memory efficiency.
   * Use this for list views where you don't need test item details.
   *
   * @param begintime - Start time (Date object or ISO string)
   * @param endtime - End time (Date object or ISO string)
   */
  async function fetchTestItemsCompact(
    site: string,
    project: string,
    station: string,
    deviceid: string,
    begintime: string | Date,
    endtime: string | Date,
    testStatus: 'PASS' | 'FAIL' | 'ALL' = 'ALL',
  ): Promise<CompactCsvTestItemData[]> {
    loadingTestItems.value = true
    error.value = null
    chunkProgress.value = null

    try {
      const response = await iplasProxyApi.getCsvTestItemsCompact({
        site,
        project,
        station,
        device_id: deviceid,
        begin_time: iplasProxyApi.formatDateForRequest(begintime),
        end_time: iplasProxyApi.formatDateForRequest(endtime),
        test_status: testStatus,
        token: getUserToken(),
      })

      // Track truncation warning
      if (response.possibly_truncated) {
        possiblyTruncated.value = true
      }

      // Track chunk progress
      if (response.chunks_fetched && response.total_chunks) {
        chunkProgress.value = {
          fetched: response.chunks_fetched,
          total: response.total_chunks,
        }
      }

      stationSearchCacheMetadata.value = mergeStationSearchMetadata(
        stationSearchCacheMetadata.value,
        response,
      )

      // Append to existing data with deduplication
      compactTestItemData.value = deduplicateRecords(
        compactTestItemData.value,
        response.data as CompactCsvTestItemData[],
      )
      return response.data
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to fetch compact test items'
      throw err
    } finally {
      loadingTestItems.value = false
    }
  }

  /**
   * Fetch paginated compact test items for server-side data table.
   * Does NOT append to existing data - designed for page-by-page loading.
   *
   * @returns PaginatedResult with items, totalItems, and pagination metadata
   */
  async function fetchTestItemsPaginated(
    site: string,
    project: string,
    station: string,
    deviceid: string,
    begintime: string | Date,
    endtime: string | Date,
    testStatus: 'PASS' | 'FAIL' | 'ALL' = 'ALL',
    options: PaginationOptions = { page: 1, itemsPerPage: 25 },
  ): Promise<PaginatedResult<CompactCsvTestItemData>> {
    loadingTestItems.value = true
    error.value = null
    chunkProgress.value = null

    try {
      const result = await fetchIplasPaginatedTestItemsQuery({
        site,
        project,
        station,
        deviceId: deviceid,
        startTime: begintime,
        endTime: endtime,
        testStatus,
        options,
        token: getUserToken(),
      })

      if (result.possiblyTruncated) {
        possiblyTruncated.value = true
      }

      if (result.chunkProgress) {
        chunkProgress.value = result.chunkProgress
      }

      return result
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to fetch paginated test items'
      throw err
    } finally {
      loadingTestItems.value = false
    }
  }

  /**
   * Get test items for a specific record (lazy loading).
   * Results are cached to avoid redundant API calls.
   */
  async function fetchRecordTestItems(
    site: string,
    project: string,
    station: string,
    isn: string,
    testStartTime: string,
    deviceId: string = 'ALL',
  ): Promise<TestItem[]> {
    const cacheKey = `${isn}_${testStartTime}`

    // Return cached if available
    const cachedItems = getCachedRecordTestItems(testItemsCache, cacheKey)
    if (cachedItems) {
      return cachedItems
    }

    loadingRecordTestItems.value = true
    error.value = null

    try {
      const testItems = await fetchIplasRecordTestItemsQuery({
        site,
        project,
        station,
        isn,
        test_start_time: testStartTime,
        device_id: deviceId,
        token: getUserToken(),
      })

      // Cache the result
      cacheRecordTestItems(testItemsCache, cacheKey, testItems)
      return testItems
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to fetch record test items'
      throw err
    } finally {
      loadingRecordTestItems.value = false
    }
  }

  /**
   * Search DUT test data by ISN via backend proxy
   * Returns data from all stations that tested the same ISN.
   * Uses retry logic for better reliability against transient failures.
   */
  async function searchByIsn(isn: string): Promise<IsnSearchData[]> {
    loadingIsnSearch.value = true
    error.value = null

    try {
      // UPDATED: Use retry logic for better reliability
      const response = await withRetry(async () => {
        return await iplasProxyApi.searchByIsn({
          isn,
          token: getUserToken(),
        })
      })
      const responseData = ensureArrayResponse(
        response.data as unknown as IsnSearchData[] | undefined,
        `No iPLAS data was returned for identifier ${isn}`,
        'iPLAS API returned an invalid ISN search response',
      )

      // Map proxy response to IsnSearchData format
      isnSearchData.value = responseData
      return isnSearchData.value
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to search by ISN'
      throw err
    } finally {
      loadingIsnSearch.value = false
    }
  }

  /**
   * Search DUT test data by multiple ISNs via backend proxy (batch)
   * This is significantly faster than calling searchByIsn multiple times.
   * Returns a Map of ISN -> IsnSearchData[] for easy lookup.
   * Uses retry logic for better reliability against transient failures.
   */
  async function searchByIsnBatch(isns: string[]): Promise<Map<string, IsnSearchData[]>> {
    if (isns.length === 0) {
      return new Map()
    }

    loadingIsnSearch.value = true
    error.value = null

    try {
      // UPDATED: Use retry logic for better reliability
      const response = await withRetry(async () => {
        return await iplasProxyApi.searchByIsnBatch({
          isns,
          token: getUserToken(),
        })
      })

      // Build a map of ISN -> records
      const resultMap = new Map<string, IsnSearchData[]>()
      for (const item of response.results) {
        resultMap.set(item.isn, item.data as unknown as IsnSearchData[])
      }

      return resultMap
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to batch search by ISN'
      throw err
    } finally {
      loadingIsnSearch.value = false
    }
  }

  /**
   * Clear ISN search data
   */
  function clearIsnSearchData(): void {
    isnSearchData.value = []
  }

  /**
   * Download test log attachments via backend proxy
   */
  async function downloadAttachments(
    site: string,
    project: string,
    attachments: DownloadAttachmentInfo[],
  ): Promise<void> {
    downloading.value = true
    error.value = null

    try {
      // Convert to proxy format
      const proxyInfo: IplasDownloadAttachmentInfo[] = attachments.map((a) => ({
        isn: a.isn,
        time: a.time,
        deviceid: a.deviceid,
        station: a.station,
      }))

      const response = await iplasProxyApi.downloadAttachment({
        site,
        project,
        info: proxyInfo,
        token: getUserToken(),
      })

      // Generate filename if not provided
      const filename =
        response.filename ||
        (attachments.length === 1 && attachments[0]
          ? `${attachments[0].isn}_${attachments[0].time.replace(/[/:]/g, '_')}.zip`
          : `test_logs_${new Date().toISOString().slice(0, 10)}.zip`)

      // Trigger download
      iplasProxyApi.downloadBase64File(response.content, filename)
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to download attachments'
      throw err
    } finally {
      downloading.value = false
    }
  }

  /**
   * Download CSV test logs via backend proxy
   *
   * UPDATED: Added for downloading actual CSV test logs from iPLAS API
   */
  async function downloadCsvLogs(records: DownloadCsvLogInfo[]): Promise<void> {
    downloading.value = true
    error.value = null

    try {
      const response = await iplasProxyApi.downloadCsvLog({
        query_list: records.map((r) => ({
          site: r.site,
          project: r.project,
          station: r.station,
          line: r.line,
          model: r.model || 'ALL',
          deviceid: r.deviceid,
          isn: r.isn,
          test_end_time: r.test_end_time,
          data_source: r.data_source ?? 0,
        })),
        token: getUserToken(),
      })

      // Generate filename if not provided
      const filename =
        response.filename ||
        (records.length === 1 && records[0]
          ? `${records[0].isn}_${records[0].test_end_time.replace(/[/:. ]/g, '_')}.csv`
          : `test_logs_${new Date().toISOString().slice(0, 10)}.csv`)

      // Trigger download
      iplasProxyApi.downloadCsvFile(response.content, filename)
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to download CSV logs'
      throw err
    } finally {
      downloading.value = false
    }
  }

  /**
   * Batch download test logs (TXT, CSV, or both) as a zip archive
   *
   * This is the recommended method for downloading multiple logs as it:
   * - Uses parallel requests for faster downloads
   * - Properly packages files into a zip archive
   * - Organizes files in /txt/ and /csv/ folders
   *
   * @param site - Site identifier
   * @param project - Project identifier
   * @param records - List of records to download
   * @param downloadType - 'txt' for attachments, 'csv' for CSV logs, 'all' for both
   */
  async function batchDownloadLogs(
    site: string,
    project: string,
    records: DownloadCsvLogInfo[],
    downloadType: 'txt' | 'csv' | 'all' = 'all',
  ): Promise<IplasBatchDownloadResponse> {
    downloading.value = true
    error.value = null

    try {
      const response = await iplasProxyApi.batchDownload({
        site,
        project,
        items: records.map((r) => ({
          site: r.site,
          project: r.project,
          station: r.station,
          line: r.line,
          model: r.model || 'ALL',
          deviceid: r.deviceid,
          isn: r.isn,
          test_end_time: r.test_end_time,
          data_source: r.data_source ?? 0,
        })),
        download_type: downloadType,
        token: getUserToken(),
      })

      // Trigger download
      iplasProxyApi.downloadBatchFile(response)

      return response
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to batch download logs'
      throw err
    } finally {
      downloading.value = false
    }
  }

  /**
   * Format date for iPLAS v1 API (YYYY/MM/DD HH:mm:ss)
   */
  function formatDateForV1Api(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
  }

  /**
   * Clear test item data (useful before fetching multiple devices)
   */
  function clearTestItemData(): void {
    testItemData.value = []
    compactTestItemData.value = []
    testItemsCache.clear()
    possiblyTruncated.value = false
    chunkProgress.value = null
    stationSearchCacheMetadata.value = null
  }

  /**
   * Clear all cached data
   */
  function clearCache(): void {
    siteProjects.value = []
    stations.value = []
    deviceIds.value = []
    testItemData.value = []
    compactTestItemData.value = []
    isnSearchData.value = []
    testItemsCache.clear()
    possiblyTruncated.value = false
    chunkProgress.value = null
    stationSearchCacheMetadata.value = null
  }

  /**
   * Fetch unique test item names via backend proxy (lightweight)
   * Returns only test item names, not full data - reduces payload significantly
   *
   * UPDATED: Added excludeBin option to filter out BIN/PASS-FAIL test items
   */
  async function fetchTestItemNames(
    site: string,
    project: string,
    station: string,
    deviceId: string,
    beginTime: string | Date,
    endTime: string | Date,
    testStatus: 'PASS' | 'FAIL' | 'ALL' = 'ALL',
    excludeBin = false,
  ): Promise<IplasTestItemInfo[]> {
    loading.value = true
    error.value = null

    try {
      const response = await iplasProxyApi.getTestItemNames({
        site,
        project,
        station,
        device_id: deviceId,
        begin_time: iplasProxyApi.formatDateForRequest(beginTime),
        end_time: iplasProxyApi.formatDateForRequest(endTime),
        test_status: testStatus,
        token: getUserToken(),
        exclude_bin: excludeBin,
      })
      return response.test_items
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to fetch test item names'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch cached test item names from database
   *
   * Optimized for Configure Station dialog where date ranges of 30+ days
   * would cause timeouts. Uses database cache with 7-day TTL.
   * Cache key: site + project + station (date range NOT included)
   *
   * @param site - Site code
   * @param project - Project name
   * @param station - Station name
   * @param excludeBin - Filter out BIN/PASS-FAIL test items
   * @param forceRefresh - Force cache refresh even if not expired
   * @param beginTime - Optional start time for fetching fresh data (used on cache miss)
   * @param endTime - Optional end time for fetching fresh data (used on cache miss)
   */
  async function fetchTestItemNamesCached(
    site: string,
    project: string,
    station: string,
    excludeBin = false,
    forceRefresh = false,
    beginTime?: string | Date,
    endTime?: string | Date,
  ): Promise<IplasCachedTestItemNamesResponse> {
    loading.value = true
    error.value = null

    try {
      const response = await iplasProxyApi.getTestItemNamesCached({
        site,
        project,
        station,
        token: getUserToken(),
        exclude_bin: excludeBin,
        force_refresh: forceRefresh,
        begin_time: beginTime ? iplasProxyApi.formatDateForRequest(beginTime) : undefined,
        end_time: endTime ? iplasProxyApi.formatDateForRequest(endTime) : undefined,
      })
      return response
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to fetch cached test item names'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch filtered test items via backend proxy with caching
   * Filters are applied on server-side for better performance
   */
  async function fetchTestItemsFiltered(
    site: string,
    project: string,
    station: string,
    deviceId: string,
    beginTime: string | Date,
    endTime: string | Date,
    testStatus: 'PASS' | 'FAIL' | 'ALL' = 'ALL',
    testItemFilters?: string[],
    excludeTestItemFilters?: string[],
    limit?: number,
    offset?: number,
  ): Promise<IplasCsvTestItemResponse<CsvTestItemData>> {
    loadingTestItems.value = true
    error.value = null

    try {
      const response = await iplasProxyApi.getCsvTestItems<CsvTestItemData>({
        site,
        project,
        station,
        device_id: deviceId,
        begin_time: iplasProxyApi.formatDateForRequest(beginTime),
        end_time: iplasProxyApi.formatDateForRequest(endTime),
        test_status: testStatus,
        test_item_filters: testItemFilters,
        exclude_test_item_filters: excludeTestItemFilters,
        include_test_items: true,
        limit,
        offset,
        token: getUserToken(),
      })
      const responseData = ensureArrayResponse(
        response.data as CsvTestItemData[] | undefined,
        'No iPLAS data was returned for the selected device and filters',
        'iPLAS API returned an invalid filtered test-item response',
      )

      if (response.possibly_truncated) {
        possiblyTruncated.value = true
      }

      if (response.chunks_fetched && response.total_chunks) {
        chunkProgress.value = {
          fetched: response.chunks_fetched,
          total: response.total_chunks,
        }
      }

      stationSearchCacheMetadata.value = mergeStationSearchMetadata(
        stationSearchCacheMetadata.value,
        response,
      )

      // Append to existing data with deduplication
      testItemData.value = deduplicateRecords(testItemData.value, responseData)
      return response
    } catch (err: unknown) {
      error.value = getErrorMessage(err) || 'Failed to fetch filtered test items'
      throw err
    } finally {
      loadingTestItems.value = false
    }
  }

  return {
    // Loading states
    loading,
    loadingStations,
    loadingDevices,
    loadingTestItems,
    loadingIsnSearch,
    loadingRecordTestItems,
    downloading,

    // Error state
    error,

    // Warning state (for truncated data)
    possiblyTruncated,

    // Chunk progress (for multi-day queries)
    chunkProgress,

    // Station Search cache metadata
    stationSearchCacheMetadata,

    // Data (full records with TestItem arrays)
    siteProjects,
    stations,
    deviceIds,
    testItemData,
    isnSearchData,

    // Compact data (without TestItem arrays - memory efficient)
    compactTestItemData,

    // Computed
    uniqueSites,
    projectsBySite,

    // Core Methods (all use backend proxy with user token support)
    verifyAccess,
    fetchSiteProjects,
    fetchStations,
    fetchDeviceIds,
    fetchTestItems,
    fetchTestItemsFull,
    fetchTestItemsCompact,
    fetchTestItemsPaginated,
    fetchRecordTestItems,
    fetchTestItemNames,
    fetchTestItemNamesCached,
    fetchTestItemsFiltered,
    searchByIsn,
    searchByIsnBatch,
    downloadAttachments,
    downloadCsvLogs,
    batchDownloadLogs,

    // Utilities
    formatDateForV1Api,
    clearTestItemData,
    clearIsnSearchData,
    clearCache,
  }
}
