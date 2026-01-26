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
  token?: string  // Optional user token override
}

export interface IplasCsvTestItemResponse {
  data: CsvTestItemData[]
  total_records: number
  returned_records: number
  filtered: boolean
  cached: boolean
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

export interface IplasIsnSearchRecord {
  site?: string
  project?: string
  station?: string
  device_id?: string
  test_start_time?: string
  test_end_time?: string
  test_status?: string
  [key: string]: string | undefined
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
  CYLCE?: string  // Note: iPLAS API has typo in some responses
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
}

// Export singleton instance
export const iplasProxyApi = new IplasProxyApi()

export default iplasProxyApi
