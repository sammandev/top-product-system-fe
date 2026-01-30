/**
 * iPLAS Proxy API Client
 * 
 * Provides access to the backend iPLAS proxy endpoints with Redis caching
 * and server-side filtering for better performance.
 */

import apiClient from '@/core/api/client'

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
 */
class IplasProxyApi {
  private readonly baseUrl = '/api/iplas'

  /**
   * Get filtered CSV test items from iPLAS with caching
   * 
   * @param request - Request parameters including filters
   * @returns Filtered test item data with cache metadata
   */
  async getCsvTestItems(request: IplasCsvTestItemRequest): Promise<IplasCsvTestItemResponse> {
    const response = await apiClient.post<IplasCsvTestItemResponse>(
      `${this.baseUrl}/csv-test-items`,
      request
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
   * @param request - Request parameters including filters
   * @returns Compact test item data (60-80% smaller than full data)
   */
  async getCsvTestItemsCompact(request: IplasCsvTestItemRequest): Promise<CompactCsvTestItemResponse> {
    const response = await apiClient.post<CompactCsvTestItemResponse>(
      `${this.baseUrl}/csv-test-items/compact`,
      request
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
      `${this.baseUrl}/v2/site-projects`,
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
      `${this.baseUrl}/v2/stations`,
      request
    )
    return response.data
  }

  /**
   * Get device list for a specific station within a time range
   * 
   * Results are cached for 5 minutes.
   * 
   * @param request - Station and time range parameters
   * @returns List of device IDs
   */
  async getDevices(request: IplasDeviceListRequest): Promise<IplasDeviceListResponse> {
    const response = await apiClient.post<IplasDeviceListResponse>(
      `${this.baseUrl}/v2/devices`,
      request
    )
    return response.data
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
      `${this.baseUrl}/v2/isn-search`,
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
      `${this.baseUrl}/v1/download-attachment`,
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
      `${this.baseUrl}/v2/verify`,
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
