/**
 * iPLAS External API Service
 * 
 * Provides access to iPLAS v1 (External2) and v2 (External3) APIs
 * 
 * v1 API: Token in request body
 * v2 API: Token in Authorization header
 */

import axios, { type AxiosInstance } from 'axios'

// Storage key for persisting settings (must match useIplasSettings.ts)
const STORAGE_KEY = 'iplas_settings'

// API Configuration from environment or localStorage
function getIplasConfig(): { baseIp: string; port: number; token: string } {
  const defaultPort = Number(import.meta.env.VITE_IPLAS_API_PORT) || 32678
  const defaultBaseIp = (import.meta.env.VITE_IPLAS_API_PTB_BASE_URL || 'http://10.176.33.89').replace(/^https?:\/\//, '')
  const defaultToken = import.meta.env.VITE_IPLAS_API_TOKEN_PTB || ''

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const selectedId = parsed.selectedServerId || 'PTB'
      const servers = parsed.servers || []
      const server = servers.find((s: { id: string }) => s.id === selectedId)
      if (server) {
        return {
          baseIp: server.baseIp || defaultBaseIp,
          port: server.port || defaultPort,
          token: server.token || defaultToken
        }
      }
    }
  } catch (error) {
    console.error('Failed to load iPLAS config from localStorage:', error)
  }
  // Fallback to PTB defaults from environment variables
  return {
    baseIp: defaultBaseIp,
    port: defaultPort,
    token: defaultToken
  }
}

const config = getIplasConfig()
const IPLAS_V1_API_BASE_URL = import.meta.env.VITE_IPLAS_V1_API_BASE_URL || `http://${config.baseIp}:${config.port}/api/v1`
const IPLAS_V2_API_BASE_URL = import.meta.env.VITE_IPLAS_V2_API_BASE_URL || `http://${config.baseIp}:${config.port}/api/v2`
const IPLAS_API_TOKEN = config.token
const IPLAS_API_TIMEOUT = Number(import.meta.env.VITE_IPLAS_API_TIMEOUT || 60) * 1000

// ============================================================================
// Types for v1 API (External2)
// ============================================================================

export interface DownloadAttachmentInfo {
  isn: string
  time: string // Format: "2025/11/17 14:20:28"
  deviceid: string
  station: string
}

export interface DownloadAttachmentRequest {
  info: DownloadAttachmentInfo[]
  token: string
}

export interface DownloadAttachmentResponse {
  statuscode: number
  data: {
    content: string // Base64 encoded file content
    filename?: string // Only returned when info has 1 entry
  }
}

export interface GetCsvTestItemRequest {
  station: string
  model: 'ALL'
  line: 'ALL'
  deviceid: string
  test_status: 'PASS' | 'FAIL' | 'ALL'
  begintime: string // Format: "2026/01/05 08:00:00"
  endtime: string // Format: "2026/01/05 15:00:00"
  token: string
}

export interface TestItem {
  NAME: string
  STATUS: string  // Can be PASS, FAIL, or other values from iPLAS
  VALUE: string // Float as string or "PASS"/"FAIL" for bin data
  UCL: string // Upper Control Limit
  LCL: string // Lower Control Limit
  CYCLE?: string // Cycle time (empty for value data, optional)
}

export interface CsvTestItemData {
  Site: string
  Project: string
  station: string
  TSP: string
  Model: string
  MO: string
  Line: string
  ISN: string // DUT serial number (could have multiple same ISN if the DUT is retest)
  DeviceId: string
  'Test Status': string
  'Test Start Time': string
  'Test end Time': string
  ErrorCode: string
  ErrorName: string
  TestItem: TestItem[]
}

export interface GetCsvTestItemResponse {
  statuscode: number
  data: CsvTestItemData[]
}

// ============================================================================
// Types for v2 API (External3)
// ============================================================================

export interface SiteProject {
  site: string
  project: string
}

export interface Station {
  display_station_name: string
  station_name: string
  order: number
  data_source: string
}

export interface VerifyResponse {
  message: string
}

// ISN Search Types (v2 API)
export interface IsnSearchTestItem {
  NAME: string
  STATUS: string
  VALUE: string
  UCL?: string
  LCL?: string
  CYCLE?: string
}

export interface IsnSearchData {
  site: string
  project: string
  isn: string
  error_name?: string
  station_name: string
  display_station_name: string
  slot?: string
  error_code: string
  error_message?: string
  test_status: string
  line: string
  test_start_time: string
  test_end_time: string
  total_testing_time?: string
  test_item: IsnSearchTestItem[]
  mo?: string
  device_id: string
  file_token?: string
  project_token?: string
}

export interface IsnSearchResponse {
  status_code: number
  data: IsnSearchData[]
}

// ============================================================================
// API Client Classes
// ============================================================================

/**
 * iPLAS v1 API Client (External2)
 * Token is passed in request body
 */
class IplasV1Api {
  private client: AxiosInstance
  private token: string

  constructor(baseURL: string, token: string, timeout: number) {
    this.token = token
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  /**
   * Download test log attachments
   * Supports multiple downloads in single request
   */
  async downloadAttachment(
    site: string,
    project: string,
    info: DownloadAttachmentInfo[]
  ): Promise<DownloadAttachmentResponse> {
    const payload: DownloadAttachmentRequest = {
      info,
      token: this.token
    }

    const response = await this.client.post<DownloadAttachmentResponse>(
      `/file/${site}/${project}/download_attachment`,
      payload
    )
    return response.data
  }

  /**
   * Get CSV test items for a device
   * Maximum 500 records
   */
  async getCsvTestItems(
    site: string,
    project: string,
    params: {
      station: string
      deviceid: string
      test_status?: 'PASS' | 'FAIL' | 'ALL'
      begintime: string
      endtime: string
    }
  ): Promise<GetCsvTestItemResponse> {
    const payload: GetCsvTestItemRequest = {
      station: params.station,
      model: 'ALL',
      line: 'ALL',
      deviceid: params.deviceid,
      test_status: params.test_status || 'ALL',
      begintime: params.begintime,
      endtime: params.endtime,
      token: this.token
    }

    const response = await this.client.post<GetCsvTestItemResponse>(
      `/raw/${site}/${project}/get_csv_testitem`,
      payload
    )
    return response.data
  }

  /**
   * Helper to decode base64 content and trigger download
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
}

/**
 * iPLAS v2 API Client (External3)
 * Token is passed in Authorization header
 */
class IplasV2Api {
  private client: AxiosInstance

  constructor(baseURL: string, token: string, timeout: number) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
  }

  /**
   * Verify token access for site and project
   */
  async verify(site: string, project: string): Promise<VerifyResponse> {
    const response = await this.client.get<VerifyResponse>('/verify', {
      params: { site, project }
    })
    return response.data
  }

  /**
   * Get site and project list
   * @param dataType - 'simple' or 'strict'
   */
  async getSiteProjectList(dataType: 'simple' | 'strict' = 'simple'): Promise<SiteProject[]> {
    const response = await this.client.get<SiteProject[]>('/site_project_list', {
      params: { data_type: dataType }
    })
    return response.data
  }

  /**
   * Get station list for a project
   * Note: Results are not sorted by order
   */
  async getStationList(site: string, project: string): Promise<Station[]> {
    const response = await this.client.get<Station[]>(`/${site}/${project}/station_list`)
    // Sort by order before returning
    return response.data.sort((a, b) => a.order - b.order)
  }

  /**
   * Get device ID list for a station
   * @param startTime - ISO format with timezone (e.g., "2026-01-14T08:00:01+08:00")
   * @param endTime - ISO format with timezone (e.g., "2026-01-15T12:00:01+08:00")
   */
  async getDeviceIdList(
    site: string,
    project: string,
    displayStationName: string,
    startTime: string,
    endTime: string
  ): Promise<string[]> {
    const response = await this.client.get<string[]>(
      `/${site}/${project}/${encodeURIComponent(displayStationName)}/test_station_device_list`,
      {
        params: {
          start_time: startTime,
          end_time: endTime
        }
      }
    )
    return response.data
  }

  /**
   * Search DUT test data by ISN
   * Returns data from all stations that tested the same ISN
   */
  async searchByIsn(isn: string): Promise<IsnSearchResponse> {
    const response = await this.client.get<IsnSearchResponse>('/isn_search', {
      params: { isn }
    })
    return response.data
  }
}

// ============================================================================
// Exported API Instances
// ============================================================================

/**
 * iPLAS v1 API instance (External2)
 * For downloading attachments and getting test items
 */
export const iplasV1Api = new IplasV1Api(
  IPLAS_V1_API_BASE_URL,
  IPLAS_API_TOKEN,
  IPLAS_API_TIMEOUT
)

/**
 * iPLAS v2 API instance (External3)
 * For metadata queries (sites, projects, stations, devices)
 */
export const iplasV2Api = new IplasV2Api(
  IPLAS_V2_API_BASE_URL,
  IPLAS_API_TOKEN,
  IPLAS_API_TIMEOUT
)

// Export a combined API object for convenience
export const iplasApi = {
  v1: iplasV1Api,
  v2: iplasV2Api
}
