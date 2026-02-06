/**
 * iPLAS Proxy API Client
 * 
 * Provides access to the backend iPLAS proxy endpoints with Redis caching
 * and server-side filtering for better performance.
 * 
 * Features:
 * - Request cancellation support via AbortController
 * - Automatic request deduplication on backend
 * - Streaming support for large datasets
 */

import apiClient from '@/core/api/client'

// ============================================================================
// Request Cancellation Support
// ============================================================================

/** Map of request keys to their AbortControllers for cancellation */
const pendingRequests = new Map<string, AbortController>()

/**
 * Generate a unique key for a request based on endpoint and parameters
 */
function getRequestKey(endpoint: string, params?: Record<string, unknown>): string {
  return `${endpoint}:${JSON.stringify(params || {})}`
}

/**
 * Cancel a pending request by its key
 */
export function cancelRequest(key: string): void {
  const controller = pendingRequests.get(key)
  if (controller) {
    controller.abort()
    pendingRequests.delete(key)
  }
}

/**
 * Cancel all pending requests matching a prefix
 * Useful for cancelling all requests for a specific feature
 */
export function cancelRequestsByPrefix(prefix: string): void {
  for (const [key, controller] of pendingRequests.entries()) {
    if (key.startsWith(prefix)) {
      controller.abort()
      pendingRequests.delete(key)
    }
  }
}

/**
 * Cancel all pending iPLAS requests
 */
export function cancelAllIplasRequests(): void {
  cancelRequestsByPrefix('/api/iplas')
}

// Types for iPLAS proxy API
export interface IplasTestItemInfo {
  name: string
  is_value: boolean
  is_bin: boolean
  has_ucl: boolean
  has_lcl: boolean
}

export interface IplasCsvTestItemRequest {
  site: string
  project: string
  station: string
  device_id: string
  begin_time: string  // ISO format
  end_time: string    // ISO format
  test_status: 'ALL' | 'PASS' | 'FAIL'
  test_item_filters?: string[]
  limit?: number
  offset?: number
  sort_by?: string   // Field name to sort by (e.g., 'TestStartTime', 'ISN')
  sort_desc?: boolean // Sort in descending order (default true)
  token?: string  // Optional user token override
}

export interface IplasCsvTestItemResponse {
  data: CsvTestItemData[]
  total_records: number
  returned_records: number
  filtered: boolean
  cached: boolean
  /** True if any chunk hit the 5000 record limit (data may be incomplete) */
  possibly_truncated?: boolean
  /** Number of API chunks fetched (for queries >6 days) */
  chunks_fetched?: number
  /** Total number of chunks (for queries >6 days) */
  total_chunks?: number
}

export interface IplasTestItemNamesRequest {
  site: string
  project: string
  station: string
  device_id: string
  begin_time: string  // ISO format
  end_time: string    // ISO format
  test_status: 'ALL' | 'PASS' | 'FAIL'
  token?: string  // Optional user token override
  // UPDATED: Option to exclude BIN/PASS-FAIL test items
  exclude_bin?: boolean
}

export interface IplasTestItemNamesResponse {
  test_items: IplasTestItemInfo[]
  total_count: number
}

// Cached test item names - database-backed for long-term caching
export interface IplasCachedTestItemNamesRequest {
  site: string
  project: string
  station: string
  token?: string
  // Option to exclude BIN/PASS-FAIL test items
  exclude_bin?: boolean
  // Force refresh the cache even if not expired
  force_refresh?: boolean
  // Optional time range for fetching fresh data on cache miss
  // If provided, uses user's selected time range instead of default 7-day window
  begin_time?: string
  end_time?: string
}

export interface IplasCachedTestItemNamesResponse {
  test_items: IplasTestItemInfo[]
  total_count: number
  cached: boolean
  cache_age_hours: number | null
}

export interface IplasProxyHealthResponse {
  status: string
  redis_cache: string
  configured_sites: string[]
  cache_ttl: {
    test_items: number
    site_projects: number
    stations: number
    devices: number
    isn_search: number
  }
}

// ============================================================================
// iPLAS v2 API Types
// ============================================================================

export interface SiteProject {
  site: string
  project: string
}

export interface IplasSiteProjectListResponse {
  data: SiteProject[]
  total_count: number
  cached: boolean
}

export interface IplasStation {
  display_station_name: string
  station_name: string
  order: number
  data_source: string
}

export interface IplasStationListRequest {
  site: string
  project: string
  token?: string  // Optional user token override
}

export interface IplasStationListResponse {
  data: IplasStation[]
  total_count: number
  cached: boolean
}

export interface IplasDeviceListRequest {
  site: string
  project: string
  station: string
  start_time: string  // ISO format
  end_time: string    // ISO format
  token?: string  // Optional user token override
}

export interface IplasDeviceListResponse {
  data: string[]  // Device IDs
  total_count: number
  cached: boolean
}

export interface IplasIsnSearchRequest {
  isn: string
  token?: string  // Optional user token override
}

/** Test item from ISN search result */
export interface IplasIsnTestItem {
  NAME: string
  STATUS: string
  VALUE: string
  UCL?: string
  LCL?: string
  CYCLE?: string
}

/** Single record from ISN search result - matches backend IplasIsnSearchRecord */
export interface IplasIsnSearchRecord {
  site: string
  project: string
  isn: string
  error_name?: string
  station_name: string
  slot?: string
  error_code: string
  error_message?: string
  test_status: string
  line: string
  test_start_time: string
  total_testing_time?: string
  test_item: IplasIsnTestItem[]
  mo?: string
  test_end_time: string
  device_id: string
  file_token?: string
  project_token?: string
  display_station_name: string
}

export interface IplasIsnSearchResponse {
  data: IplasIsnSearchRecord[]
  total_count: number
  cached: boolean
}

// ============================================================================
// Stations From ISN Types
// ============================================================================

/** Request to get station list from a single ISN */
export interface IplasStationsFromIsnRequest {
  isn: string
  token?: string  // Optional user token override
}

/** Request to get station lists from multiple ISNs */
export interface IplasStationsFromIsnBatchRequest {
  isns: string[]
  token?: string  // Optional user token override
}

/** Information about an ISN's project discovered from ISN search */
export interface IplasIsnProjectInfo {
  isn: string
  site: string
  project: string
  found: boolean
}

/** Response for single ISN stations lookup */
export interface IplasStationsFromIsnResponse {
  isn_info: IplasIsnProjectInfo
  stations: IplasStation[]
  total_stations: number
  cached: boolean
}

/** Single item in batch stations lookup response */
export interface IplasStationsFromIsnBatchItem {
  isn_info: IplasIsnProjectInfo
  stations: IplasStation[]
  total_stations: number
}

/** Response for batch ISN stations lookup */
export interface IplasStationsFromIsnBatchResponse {
  results: IplasStationsFromIsnBatchItem[]
  total_isns: number
  unique_projects: number
  not_found_isns: string[]
  cached: boolean
}

// ============================================================================
// Download Attachment Types
// ============================================================================

export interface IplasDownloadAttachmentInfo {
  isn: string
  time: string  // Format: "YYYY/MM/DD HH:mm:ss"
  deviceid: string
  station: string
}

export interface IplasDownloadAttachmentRequest {
  site: string
  project: string
  info: IplasDownloadAttachmentInfo[]
  token?: string  // Optional user token override
}

export interface IplasDownloadAttachmentResponse {
  content: string  // Base64 encoded file content
  filename?: string  // Only when single file
}

// ============================================================================
// CSV Test Log Download Types
// ============================================================================

export interface IplasDownloadCsvLogInfo {
  site: string
  project: string
  station: string
  line: string
  model: string  // Usually "ALL"
  deviceid: string
  isn: string
  test_end_time: string  // Format: "YYYY/MM/DD HH:mm:ss.000" (MUST include .000)
  data_source: number  // Usually 0
}

export interface IplasDownloadCsvLogRequest {
  query_list: IplasDownloadCsvLogInfo[]
  token?: string  // Optional user token override
}

export interface IplasDownloadCsvLogResponse {
  content: string  // CSV file content as string
  filename?: string  // Filename from response header
}

// ============================================================================
// Batch Download Types (for multiple TXT/CSV downloads)
// ============================================================================

export interface IplasBatchDownloadRequest {
  site: string
  project: string
  items: IplasDownloadCsvLogInfo[]
  download_type: 'txt' | 'csv' | 'all'  // 'txt' for attachments, 'csv' for CSV logs, 'all' for both
  token?: string  // Optional user token override
}

export interface IplasBatchDownloadResponse {
  content: string  // Base64 encoded zip file content
  filename: string  // Suggested filename
  file_count: number  // Total files in archive
  txt_count: number  // Number of TXT files
  csv_count: number  // Number of CSV files
}

// ============================================================================
// Verify Endpoint Types
// ============================================================================

export interface IplasVerifyRequest {
  site: string
  project: string
  token?: string  // Optional user token override
}

export interface IplasVerifyResponse {
  success: boolean
  message: string
}

// ============================================================================
// V1 Get Test Item By ISN Types (Cross-Station Search)
// ============================================================================

export interface IplasTestItemByIsnRequest {
  site: string
  project: string
  isn: string
  station?: string   // Optional station filter (empty = search all stations)
  device?: string    // Optional device ID filter (empty = search all devices)
  begin_time: string // ISO format
  end_time: string   // ISO format
  token?: string     // Optional user token override
}

export interface IplasTestItemByIsnTestItem {
  name: string
  Status: string
  LSL: string   // Lower Spec Limit (same as LCL)
  Value: string
  USL: string   // Upper Spec Limit (same as UCL)
  CYCLE: string
}

export interface IplasTestItemByIsnRecord {
  site: string
  project: string
  ISN: string
  station: string
  model: string
  line: string
  device: string
  test_end_time: string
  test_item: IplasTestItemByIsnTestItem[]
}

export interface IplasTestItemByIsnResponse {
  data: IplasTestItemByIsnRecord[]
  total_count: number
  cached: boolean
}

// Re-export types from iplasApi for convenience
export interface TestItem {
  NAME: string
  STATUS: string
  VALUE: string
  UCL: string
  LCL: string
  CYCLE?: string
}

export interface CsvTestItemData {
  Site: string
  Project: string
  station: string
  TSP: string
  Model: string
  MO: string
  Line: string
  ISN: string
  DeviceId: string
  'Test Status': string
  'Test Start Time': string
  'Test end Time': string
  ErrorCode: string
  ErrorName: string
  TestItem: TestItem[]
}

/**
 * Compact record without TestItem array for memory-efficient list views.
 * Use this for displaying record lists. TestItems can be loaded on-demand.
 */
export interface CompactCsvTestItemData {
  Site: string
  Project: string
  station: string
  TSP: string
  Model: string
  MO: string
  Line: string
  ISN: string
  DeviceId: string
  // Use same property names as CsvTestItemData for compatibility
  'Test Status': string
  'Test Start Time': string
  'Test end Time': string
  ErrorCode: string
  ErrorName: string
  /** Number of test items (without the actual array) */
  TestItemCount: number
}

export interface CompactCsvTestItemResponse {
  data: CompactCsvTestItemData[]
  total_records: number
  returned_records: number
  filtered: boolean
  cached: boolean
  possibly_truncated?: boolean
  /** Number of API chunks fetched (for queries >6 days) */
  chunks_fetched?: number
  /** Total number of chunks (for queries >6 days) */
  total_chunks?: number
}

export interface RecordTestItemsRequest {
  site: string
  project: string
  station: string
  isn: string
  test_start_time: string
  device_id?: string
  test_status?: 'ALL' | 'PASS' | 'FAIL'
  token?: string
}

export interface RecordTestItemsResponse {
  isn: string
  test_start_time: string
  test_items: TestItem[]
  test_item_count: number
  cached: boolean
}

/**
 * Metadata from NDJSON streaming response header
 */
export interface StreamMetadata {
  totalRecords: number
  filtered: boolean
  cached: boolean
  possiblyTruncated: boolean
  chunksFetched: number
  totalChunks: number
}

/**
 * iPLAS Proxy API Service
 * 
 * Uses the backend proxy endpoints for cached and filtered iPLAS data access.
 * Supports request cancellation to prevent redundant API calls.
 */
class IplasProxyApi {
  private readonly baseUrl = '/api/iplas'

  /**
   * Get filtered CSV test items from iPLAS with caching
   * Supports request cancellation via signal.
   * 
   * @param request - Request parameters including filters
   * @param options - Optional configuration including signal for cancellation
   * @returns Filtered test item data with cache metadata
   */
  async getCsvTestItems(
    request: IplasCsvTestItemRequest,
    options?: { signal?: AbortSignal }
  ): Promise<IplasCsvTestItemResponse> {
    const response = await apiClient.post<IplasCsvTestItemResponse>(
      `${this.baseUrl}/csv-test-items`,
      request,
      { signal: options?.signal }
    )
    return response.data
  }

  /**
   * Get compact CSV test items (without TestItem arrays) for memory efficiency
   * 
   * Use this for:
   * - Record list views where you don't need test item details
   * - Initial page load to show record summaries
   * - Performance-critical scenarios
   * 
   * Supports request cancellation via signal.
   * 
   * @param request - Request parameters including filters
   * @param options - Optional configuration including signal for cancellation
   * @returns Compact test item data (60-80% smaller than full data)
   */
  async getCsvTestItemsCompact(
    request: IplasCsvTestItemRequest,
    options?: { signal?: AbortSignal }
  ): Promise<CompactCsvTestItemResponse> {
    const response = await apiClient.post<CompactCsvTestItemResponse>(
      `${this.baseUrl}/csv-test-items/compact`,
      request,
      { signal: options?.signal }
    )
    return response.data
  }

  /**
   * Get test items for a specific record (lazy loading)
   * 
   * Use this to load TestItem details on-demand when user expands a record,
   * instead of loading all test items upfront.
   * 
   * @param request - Record identification parameters
   * @returns Test items for the specific record
   */
  async getRecordTestItems(request: RecordTestItemsRequest): Promise<RecordTestItemsResponse> {
    const response = await apiClient.post<RecordTestItemsResponse>(
      `${this.baseUrl}/record-test-items`,
      request
    )
    return response.data
  }

  /**
   * Get unique test item names for the selection dialog
   * 
   * This is a lightweight endpoint that returns only test item names,
   * reducing payload from ~500KB to ~5KB.
   * 
   * @param request - Request parameters
   * @returns List of unique test item names with type info
   */
  async getTestItemNames(request: IplasTestItemNamesRequest): Promise<IplasTestItemNamesResponse> {
    const response = await apiClient.post<IplasTestItemNamesResponse>(
      `${this.baseUrl}/test-item-names`,
      request
    )
    return response.data
  }

  /**
   * Get cached test item names from database
   * 
   * This is optimized for the "Configure Station" dialog where loading
   * test items for long date ranges (30+ days) often times out.
   * 
   * Cache key: site + project + station (date range NOT included)
   * Cache TTL: 7 days in database
   * 
   * @param request - Request parameters (no date range needed)
   * @returns List of unique test item names with cache info
   */
  async getTestItemNamesCached(request: IplasCachedTestItemNamesRequest): Promise<IplasCachedTestItemNamesResponse> {
    const response = await apiClient.post<IplasCachedTestItemNamesResponse>(
      `${this.baseUrl}/test-item-names-cached`,
      request
    )
    return response.data
  }

  /**
   * Check iPLAS proxy health and cache status
   * 
   * @returns Health status including Redis and iPLAS API status
   */
  async healthCheck(): Promise<IplasProxyHealthResponse> {
    const response = await apiClient.get<IplasProxyHealthResponse>(
      `${this.baseUrl}/health`
    )
    return response.data
  }

  /**
   * Helper to format date for API request
   * 
   * @param date - Date object or string
   * @returns ISO format string
   */
  formatDateForRequest(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toISOString()
  }

  // ============================================================================
  // iPLAS v2 API Methods
  // ============================================================================

  /**
   * Get all site/project pairs from iPLAS v2 API
   * 
   * This endpoint aggregates site/project data from all configured iPLAS sites.
   * Results are cached for 24 hours.
   * 
   * @param dataType - Filter type: 'simple' or 'strict'
   * @returns List of site/project pairs
   */
  async getSiteProjects(dataType: 'simple' | 'strict' = 'simple'): Promise<IplasSiteProjectListResponse> {
    const response = await apiClient.get<IplasSiteProjectListResponse>(
      `${this.baseUrl}/site-projects`,
      { params: { data_type: dataType } }
    )
    return response.data
  }

  /**
   * Get station list for a specific site/project
   * 
   * Results are cached for 1 hour.
   * 
   * @param request - Site and project to query
   * @returns List of stations with IP addresses
   */
  async getStations(request: IplasStationListRequest): Promise<IplasStationListResponse> {
    const response = await apiClient.post<IplasStationListResponse>(
      `${this.baseUrl}/stations`,
      request
    )
    return response.data
  }

  /**
   * Get device list for a specific station within a time range
   * 
   * Results are cached for 5 minutes.
   * Supports request cancellation - previous requests for same station are auto-cancelled.
   * 
   * @param request - Station and time range parameters
   * @param options - Optional configuration including signal for cancellation
   * @returns List of device IDs
   */
  async getDevices(
    request: IplasDeviceListRequest,
    options?: { signal?: AbortSignal; cancelPrevious?: boolean }
  ): Promise<IplasDeviceListResponse> {
    const endpoint = `${this.baseUrl}/devices`
    const requestKey = getRequestKey(endpoint, { 
      site: request.site, 
      project: request.project, 
      station: request.station 
    })
    
    // Cancel previous request for the same station if requested
    if (options?.cancelPrevious !== false) {
      cancelRequest(requestKey)
    }
    
    // Create new abort controller
    const controller = new AbortController()
    pendingRequests.set(requestKey, controller)
    
    try {
      const response = await apiClient.post<IplasDeviceListResponse>(
        endpoint,
        request,
        { signal: options?.signal || controller.signal }
      )
      return response.data
    } finally {
      pendingRequests.delete(requestKey)
    }
  }

  /**
   * Search for DUT test data by ISN
   * 
   * This endpoint queries all configured iPLAS sites to find the ISN.
   * Results are cached for 5 minutes.
   * 
   * @param request - ISN to search for
   * @returns List of matching test records
   */
  async searchByIsn(request: IplasIsnSearchRequest): Promise<IplasIsnSearchResponse> {
    const response = await apiClient.post<IplasIsnSearchResponse>(
      `${this.baseUrl}/isn-search`,
      request
    )
    return response.data
  }

  // ============================================================================
  // v2 Stations From ISN
  // ============================================================================

  /**
   * Get station list from a single ISN
   * 
   * Looks up the ISN to find its site/project, then returns all stations
   * for that project.
   * 
   * Cache TTL:
   * - ISN lookup: 5 minutes
   * - Station list: 1 hour
   * 
   * @param request - ISN to look up
   * @returns Station list for the ISN's project
   */
  async getStationsFromIsn(request: IplasStationsFromIsnRequest): Promise<IplasStationsFromIsnResponse> {
    const response = await apiClient.post<IplasStationsFromIsnResponse>(
      `${this.baseUrl}/isn/stations`,
      request
    )
    return response.data
  }

  /**
   * Get station lists from multiple ISNs
   * 
   * Looks up multiple ISNs and returns station lists for each unique project.
   * Results are deduplicated - if multiple ISNs belong to the same project,
   * the station list is only fetched once.
   * 
   * Limits: Maximum 50 ISNs per request
   * 
   * Cache TTL:
   * - ISN lookup: 5 minutes
   * - Station list: 1 hour
   * 
   * @param request - ISNs to look up
   * @returns Station lists for each ISN's project
   */
  async getStationsFromIsnBatch(request: IplasStationsFromIsnBatchRequest): Promise<IplasStationsFromIsnBatchResponse> {
    const response = await apiClient.post<IplasStationsFromIsnBatchResponse>(
      `${this.baseUrl}/isn-batch/stations`,
      request
    )
    return response.data
  }

  // ============================================================================
  // v1 Download Attachment
  // ============================================================================

  /**
   * Download test log attachments from iPLAS
   * 
   * Supports multiple downloads in a single request.
   * 
   * @param request - Download request with attachment info
   * @returns Base64-encoded file content
   */
  async downloadAttachment(request: IplasDownloadAttachmentRequest): Promise<IplasDownloadAttachmentResponse> {
    const response = await apiClient.post<IplasDownloadAttachmentResponse>(
      `${this.baseUrl}/download-attachment`,
      request
    )
    return response.data
  }

  /**
   * Helper to decode base64 content and trigger download
   * 
   * @param base64Content - Base64 encoded file content
   * @param filename - Filename for the download
   */
  downloadBase64File(base64Content: string, filename: string): void {
    const binaryString = atob(base64Content)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const blob = new Blob([bytes], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ============================================================================
  // v1 Download CSV Test Log
  // ============================================================================

  /**
   * Download CSV test logs from iPLAS
   * 
   * Uses the iPLAS endpoint: POST /raw/get_test_log
   * 
   * **Important**: The test_end_time field MUST include milliseconds (e.g., '2026/01/22 18:57:05.000')
   * 
   * @param request - Download request with query list
   * @returns CSV file content as string with optional filename
   */
  async downloadCsvLog(request: IplasDownloadCsvLogRequest): Promise<IplasDownloadCsvLogResponse> {
    const response = await apiClient.post<IplasDownloadCsvLogResponse>(
      `${this.baseUrl}/download-csv-log`,
      request
    )
    return response.data
  }

  /**
   * Helper to download CSV content as a file
   * 
   * @param csvContent - CSV file content as string
   * @param filename - Filename for the download
   */
  downloadCsvFile(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ============================================================================
  // Batch Download (TXT, CSV, or both)
  // ============================================================================

  /**
   * Batch download test logs (TXT, CSV, or both) as a zip archive
   * 
   * This is optimized for downloading multiple logs at once, packaging them
   * into a single zip file with proper structure:
   * - /txt/ folder contains TXT attachment files
   * - /csv/ folder contains CSV test log files
   * 
   * @param request - Batch download request with items and download type
   * @returns Base64 encoded zip file with file counts
   */
  async batchDownload(request: IplasBatchDownloadRequest): Promise<IplasBatchDownloadResponse> {
    const response = await apiClient.post<IplasBatchDownloadResponse>(
      `${this.baseUrl}/batch-download`,
      request
    )
    return response.data
  }

  /**
   * Helper to download batch download response as a file
   * 
   * @param response - Batch download response from API
   */
  downloadBatchFile(response: IplasBatchDownloadResponse): void {
    this.downloadBase64File(response.content, response.filename)
  }

  // ============================================================================
  // v2 Verify Access
  // ============================================================================

  /**
   * Verify token access for a site/project
   * 
   * This is useful for validating user-provided tokens.
   * 
   * @param request - Site, project, and optional token
   * @returns Verification result
   */
  async verifyAccess(request: IplasVerifyRequest): Promise<IplasVerifyResponse> {
    const response = await apiClient.post<IplasVerifyResponse>(
      `${this.baseUrl}/verify`,
      request
    )
    return response.data
  }

  // ============================================================================
  // v1 Get Test Item By ISN (Cross-Station Search)
  // ============================================================================

  /**
   * Get test items by ISN from iPLAS v1 API (cross-station search)
   * 
   * This endpoint searches for an ISN across all related test stations within a date range.
   * More flexible than V2 isn_search because it supports date filtering and returns
   * test items from ALL stations that processed this ISN.
   * 
   * **Use Cases:**
   * - Track a DUT through the entire production flow
   * - Find all test records for a specific serial number
   * - Compare test results across different stations for the same ISN
   * 
   * @param request - ISN search parameters with optional date range
   * @returns List of matching records across all related stations
   */
  async getTestItemByIsn(request: IplasTestItemByIsnRequest): Promise<IplasTestItemByIsnResponse> {
    const response = await apiClient.post<IplasTestItemByIsnResponse>(
      `${this.baseUrl}/test-item-by-isn`,
      request
    )
    return response.data
  }

  // ============================================================================
  // Streaming Endpoint
  // ============================================================================

  /**
   * Stream metadata from NDJSON response
   */
  public static parseStreamMetadata(line: string): StreamMetadata | null {
    try {
      const parsed = JSON.parse(line)
      if (parsed._metadata) {
        return {
          totalRecords: parsed.total_records,
          filtered: parsed.filtered,
          cached: parsed.cached,
          possiblyTruncated: parsed.possibly_truncated,
          chunksFetched: parsed.chunks_fetched,
          totalChunks: parsed.total_chunks
        }
      }
    } catch {
      // Not valid JSON metadata
    }
    return null
  }

  /**
   * Stream CSV test items as NDJSON for memory-efficient large dataset handling
   * 
   * Benefits:
   * - Frontend can process records as they arrive (progressive rendering)
   * - Reduced peak memory usage
   * - Better UX for large datasets (users see data immediately)
   * 
   * @param request - Request parameters
   * @param onRecord - Callback for each record received
   * @param onMetadata - Callback for stream metadata (first line)
   * @param onError - Callback for errors
   * @param signal - Optional AbortSignal for cancellation
   * @returns Total records processed
   */
  async streamCsvTestItems(
    request: IplasCsvTestItemRequest,
    onRecord: (record: CompactCsvTestItemData) => void,
    onMetadata?: (metadata: StreamMetadata) => void,
    onError?: (error: Error) => void,
    signal?: AbortSignal
  ): Promise<number> {
    const url = `${import.meta.env.VITE_API_URL || ''}/api/iplas/csv-test-items/stream`
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let recordCount = 0

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue

          // Check for metadata first
          const metadata = IplasProxyApi.parseStreamMetadata(line)
          if (metadata) {
            onMetadata?.(metadata)
            continue
          }

          // Parse record
          try {
            const record = JSON.parse(line) as CompactCsvTestItemData
            onRecord(record)
            recordCount++
          } catch (parseError) {
            console.warn('Failed to parse NDJSON line:', line)
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const record = JSON.parse(buffer) as CompactCsvTestItemData
          onRecord(record)
          recordCount++
        } catch {
          // Ignore incomplete final line
        }
      }

      return recordCount
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Stream aborted by user')
          return 0
        }
        onError?.(error)
      }
      throw error
    }
  }
}

// Export singleton instance
export const iplasProxyApi = new IplasProxyApi()

export default iplasProxyApi
