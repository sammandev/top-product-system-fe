import { apiClient } from '@/core/api'
import type {
  DUTSite,
  DUTModel,
  DUTStation,
  TopProductsRequest,
  TopProductsResponse,
  DUTIdentifierList
} from '@/core/types'
import type {
  PATrendRequest,
  PATrendStationDataSchema,
  PADiffStationDataSchema
} from '@/types/api'

/**
 * DUT Management API
 * 
 * Handles all DUT (Device Under Test) related API calls including:
 * - Sites, models, and stations metadata
 * - Top products analysis
 * - DUT records and history
 */
export const dutApi = {
  /**
   * Get all available DUT test sites
   */
  async getSites(): Promise<DUTSite[]> {
    const { data } = await apiClient.get<DUTSite[]>('/api/dut/sites')
    return data
  },

  /**
   * Get models for a specific site
   * @param siteId - Site ID or name
   */
  async getModels(siteId: string | number): Promise<DUTModel[]> {
    const { data } = await apiClient.get<DUTModel[]>(`/api/dut/sites/${siteId}/models`)
    return data
  },

  /**
   * Get test stations for a specific model
   * @param modelId - Model ID or name
   */
  async getStations(modelId: string | number): Promise<DUTStation[]> {
    const { data } = await apiClient.get<DUTStation[]>(`/api/dut/models/${modelId}/stations`)
    return data
  },

  /**
   * Get top products analysis for a station
   * @param stationId - Station ID
   * @param params - Analysis parameters (date range, criteria, etc.)
   */
  async getTopProducts(
    stationId: string | number,
    params: TopProductsRequest
  ): Promise<TopProductsResponse> {
    const formData = new FormData()
    formData.append('site_id', String(params.site_id))
    formData.append('model_id', String(params.model_id))
    formData.append('start_time', params.start_time)
    formData.append('end_time', params.end_time)
    formData.append('criteria_score', String(params.criteria_score))

    if (params.limit) {
      formData.append('limit', String(params.limit))
    }

    if (params.criteria_file) {
      formData.append('criteria_file', params.criteria_file)
    }

    // CRITICAL: Do NOT set Content-Type header manually for FormData!
    // Browser/axios must set it automatically with the multipart boundary
    const { data } = await apiClient.post<TopProductsResponse>(
      `/api/dut/stations/${stationId}/top-products`,
      formData
    )
    return data
  },

  /**
   * Get detailed records for a specific DUT
   * @param stationId - Station ID
   * @param dutId - DUT identifier
   */
  async getDUTRecords(stationId: string | number, dutId: string): Promise<any> {
    const { data } = await apiClient.get(`/api/dut/records/${stationId}/${dutId}`)
    return data
  },

  /**
   * Get DUT test history and progression
   * @param params - Query parameters for history
   */
  async getDUTHistory(params: any): Promise<any> {
    const { data } = await apiClient.get('/api/dut/history/progression', { params })
    return data
  },

  /**
   * Get DUT summary including all stations where the DUT was tested
   * @param dutIsn - DUT ISN identifier
   */
  async getDUTSummary(dutIsn: string): Promise<any> {
    const { data } = await apiClient.get('/api/dut/summary', {
      params: { dut_isn: dutIsn }
    })
    return data
  },

  /**
   * Get DUT identifiers (serial numbers) linked to an ISN
   * @param isn - ISN identifier
   */
  async getDUTIdentifiers(isn: string): Promise<DUTIdentifierList> {
    const { data } = await apiClient.get<DUTIdentifierList>('/api/dut/history/identifiers', {
      params: { dut_isn: isn }
    })
    return data
  },

  /**
   * Get DUT ISN variants (all ISNs associated with a serial number)
   * @param identifier - Serial number identifier
   */
  async getDUTISNVariants(identifier: string): Promise<string[]> {
    const { data } = await apiClient.get<{ dut_isn: string; site_name: string | null; model_name: string | null; isns: string[] }>('/api/dut/history/isns', {
      params: { dut_isn: identifier }
    })
    return data.isns
  },

  /**
   * Get latest test items for multiple stations based on DUT ISN
   * @param dutIsn - DUT ISN to get test items for
   * @param stationIdentifiers - Array of station IDs or names
   */
  async getLatestTestItemsBatch(dutIsn: string, stationIdentifiers: string[]): Promise<any> {
    const { data } = await apiClient.post('/api/dut/test-items/latest/batch', {
      dut_isn: dutIsn,
      station_identifiers: stationIdentifiers
    })
    return data
  },

  /**
   * Get PA Trend Auto analysis
   * Analyzes power analysis trends automatically across multiple DUTs and stations
   * @param params - PA trend request parameters
   */
  async getPATrendAuto(params: PATrendRequest): Promise<PATrendStationDataSchema[]> {
    const queryParams = new URLSearchParams()
    
    // Add array parameters
    params.dut_isn.forEach((isn: string) => queryParams.append('dut_isn', isn))
    params.station_id.forEach((id: string) => queryParams.append('station_id', id))
    
    // Add optional parameters
    if (params.site_identifier) {
      queryParams.append('site_identifier', params.site_identifier)
    }
    if (params.model_identifier) {
      queryParams.append('model_identifier', params.model_identifier)
    }
    if (params.start_time) {
      queryParams.append('start_time', params.start_time)
    }
    if (params.end_time) {
      queryParams.append('end_time', params.end_time)
    }
    if (params.srom_filter) {
      queryParams.append('srom_filter', params.srom_filter)
    }

    const { data } = await apiClient.get<PATrendStationDataSchema[]>(
      `/api/dut/pa/trend/auto?${queryParams.toString()}`
    )
    return data
  },

  /**
   * Get PA Trend Dex analysis
   * Analyzes power analysis dexterity trends across multiple DUTs and stations
   * @param params - PA trend request parameters
   */
  async getPATrendDex(params: PATrendRequest): Promise<PATrendStationDataSchema[]> {
    const queryParams = new URLSearchParams()
    
    // Add array parameters
    params.dut_isn.forEach((isn: string) => queryParams.append('dut_isn', isn))
    params.station_id.forEach((id: string) => queryParams.append('station_id', id))
    
    // Add optional parameters
    if (params.site_identifier) {
      queryParams.append('site_identifier', params.site_identifier)
    }
    if (params.model_identifier) {
      queryParams.append('model_identifier', params.model_identifier)
    }
    if (params.start_time) {
      queryParams.append('start_time', params.start_time)
    }
    if (params.end_time) {
      queryParams.append('end_time', params.end_time)
    }
    if (params.srom_filter) {
      queryParams.append('srom_filter', params.srom_filter)
    }

    const { data } = await apiClient.get<PATrendStationDataSchema[]>(
      `/api/dut/pa/trend/dex?${queryParams.toString()}`
    )
    return data
  },

  /**
   * Get PA Trend Differential analysis
   * Analyzes differential power analysis trends across multiple DUTs and stations
   * @param params - PA trend request parameters
   */
  async getPATrendDiff(params: PATrendRequest): Promise<PADiffStationDataSchema[]> {
    const queryParams = new URLSearchParams()
    
    // Add array parameters
    params.dut_isn.forEach((isn: string) => queryParams.append('dut_isn', isn))
    params.station_id.forEach((id: string) => queryParams.append('station_id', id))
    
    // Add optional parameters
    if (params.site_identifier) {
      queryParams.append('site_identifier', params.site_identifier)
    }
    if (params.model_identifier) {
      queryParams.append('model_identifier', params.model_identifier)
    }
    if (params.start_time) {
      queryParams.append('start_time', params.start_time)
    }
    if (params.end_time) {
      queryParams.append('end_time', params.end_time)
    }
    if (params.srom_filter) {
      queryParams.append('srom_filter', params.srom_filter)
    }

    const { data } = await apiClient.get<PADiffStationDataSchema[]>(
      `/api/dut/pa/trend/diff?${queryParams.toString()}`
    )
    return data
  }
}
