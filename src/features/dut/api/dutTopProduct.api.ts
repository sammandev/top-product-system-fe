/**
 * DUT ISN-based Top Product API Service
 *
 * Provides methods to analyze DUT performance across multiple stations
 * using DUT ISN as the primary identifier.
 */

import apiClient from '@/core/api/client'
import type {
  BatchDevicesRequest,
  BatchDevicesResponse,
  BatchTestItemsRequest,
  BatchTestItemsResponse,
  TopProductBatchResponse,
  TopProductRequest,
} from '../types/dutTopProduct.types'

const BASE_URL = '/api/dut'

export const dutTopProductApi = {
  /**
   * Analyze DUT performance across multiple stations
   *
   * @param request - Top product request parameters
   * @returns Batch response with results and errors
   *
   * @example
   * ```typescript
   * const response = await dutTopProductApi.analyzeByISN({
   *   dut_isns: ['260884980003907', '260884980003908'],
   *   stations: ['144', '145'],
   *   criteria_file: criteriaFile
   * })
   * ```
   */
  async analyzeByISN(request: TopProductRequest): Promise<TopProductBatchResponse> {
    // Build query parameters - backend expects Query params for filters
    const params = new URLSearchParams()

    // Add ISNs (required) - use 'dut_isn' as the query parameter name (backend alias)
    request.dut_isns.forEach((isn) => {
      params.append('dut_isn', isn)
    })

    // Add optional station filters
    if (request.stations && request.stations.length > 0) {
      request.stations.forEach((station) => {
        params.append('stations', station)
      })
    }

    // Add optional site filter
    if (request.site_identifier) {
      params.append('site_identifier', request.site_identifier)
    }

    // Add optional model filter
    if (request.model_identifier) {
      params.append('model_identifier', request.model_identifier)
    }

    // Add optional device filters
    if (request.device_identifiers && request.device_identifiers.length > 0) {
      request.device_identifiers.forEach((device) => {
        params.append('device_identifiers', device)
      })
    }

    // Add optional test item filters (include patterns)
    if (request.test_item_filters && request.test_item_filters.length > 0) {
      request.test_item_filters.forEach((filter) => {
        params.append('test_item_filters', filter)
      })
    }

    // Add optional test item exclude filters
    if (request.exclude_test_item_filters && request.exclude_test_item_filters.length > 0) {
      request.exclude_test_item_filters.forEach((filter) => {
        params.append('exclude_test_item_filters', filter)
      })
    }

    // Add per-station filters as JSON string (backend expects 'station_filters' query param)
    if (request.station_filters && Object.keys(request.station_filters).length > 0) {
      params.append('station_filters', JSON.stringify(request.station_filters))
    }

    // Backend expects criteria_file as multipart/form-data File parameter
    // We must use FormData when criteria_file is present
    if (request.criteria_file) {
      // console.log('🔍 Uploading criteria file:', {
      //   fileName: request.criteria_file.name,
      //   fileSize: request.criteria_file.size,
      //   fileType: request.criteria_file.type,
      //   url: `${BASE_URL}/top-product?${params.toString()}`
      // })

      const formData = new FormData()
      formData.append('criteria_file', request.criteria_file)

      // CRITICAL: Do NOT set Content-Type header manually!
      // Browser/axios must set it automatically with the multipart boundary
      // The auth interceptor will remove any manual Content-Type header for FormData
      const { data } = await apiClient.post<TopProductBatchResponse>(
        `${BASE_URL}/top-product?${params.toString()}`,
        formData,
      )

      // console.log('✅ Criteria file upload response:', {
      //   resultsCount: data.results?.length || 0,
      //   errorsCount: data.errors?.length || 0,
      //   firstResult: data.results?.[0]
      // })

      return data
    }

    // console.log('ℹ️ No criteria file provided, using default rules')

    // When no criteria file, send POST with empty body
    // Backend will use default criteria rules
    const { data } = await apiClient.post<TopProductBatchResponse>(
      `${BASE_URL}/top-product?${params.toString()}`,
    )

    return data
  },

  /**
   * Analyze DUT performance with PA trends
   *
   * Uses the with-pa-trends endpoint which includes PA trend measurements
   * that compare historical PA trend data with current PA measurements.
   *
   * ⚠️ WARNING: Including PA trends adds 200-500ms per station with PA test items.
   *
   * @param request - Top product request parameters
   * @returns Batch response with PA trends data
   */
  async analyzeWithPATrends(request: TopProductRequest): Promise<TopProductBatchResponse> {
    // Build query parameters - backend expects Query params for filters
    const params = new URLSearchParams()

    // Add ISNs (required) - use 'dut_isn' as the query parameter name (backend alias)
    request.dut_isns.forEach((isn) => {
      params.append('dut_isn', isn)
    })

    // Add optional parameters
    if (request.stations && request.stations.length > 0) {
      request.stations.forEach((station) => {
        params.append('stations', station)
      })
    }

    if (request.site_identifier) {
      params.append('site_identifier', request.site_identifier)
    }

    if (request.model_identifier) {
      params.append('model_identifier', request.model_identifier)
    }

    if (request.device_identifiers && request.device_identifiers.length > 0) {
      request.device_identifiers.forEach((device) => {
        params.append('device_identifiers', device)
      })
    }

    if (request.test_item_filters && request.test_item_filters.length > 0) {
      request.test_item_filters.forEach((filter) => {
        params.append('test_item_filters', filter)
      })
    }

    if (request.exclude_test_item_filters && request.exclude_test_item_filters.length > 0) {
      request.exclude_test_item_filters.forEach((filter) => {
        params.append('exclude_test_item_filters', filter)
      })
    }

    // Add per-station filters as JSON string
    if (request.station_filters && Object.keys(request.station_filters).length > 0) {
      params.append('station_filters', JSON.stringify(request.station_filters))
    }

    // Backend expects criteria_file as multipart/form-data File parameter
    if (request.criteria_file) {
      const formData = new FormData()
      formData.append('criteria_file', request.criteria_file)

      const { data } = await apiClient.post<TopProductBatchResponse>(
        `${BASE_URL}/top-product/with-pa-trends?${params.toString()}`,
        formData,
      )
      return data
    }

    // When no criteria file, send POST with empty body
    const { data } = await apiClient.post<TopProductBatchResponse>(
      `${BASE_URL}/top-product/with-pa-trends?${params.toString()}`,
    )

    return data
  },

  /**
   * Analyze DUT performance with hierarchical scoring
   *
   * Uses the hierarchical scoring endpoint which provides more detailed
   * breakdown of scores by category/subcategory.
   *
   * @param request - Top product request parameters
   * @returns Batch response with hierarchical scoring results
   */
  async analyzeHierarchical(request: TopProductRequest): Promise<TopProductBatchResponse> {
    // Build query parameters - backend expects Query params for filters
    const params = new URLSearchParams()

    // Add ISNs (required) - use 'dut_isn' as the query parameter name (backend alias)
    request.dut_isns.forEach((isn) => {
      params.append('dut_isn', isn)
    })

    // Add optional parameters
    if (request.stations && request.stations.length > 0) {
      request.stations.forEach((station) => {
        params.append('stations', station)
      })
    }

    if (request.site_identifier) {
      params.append('site_identifier', request.site_identifier)
    }

    if (request.model_identifier) {
      params.append('model_identifier', request.model_identifier)
    }

    if (request.device_identifiers && request.device_identifiers.length > 0) {
      request.device_identifiers.forEach((device) => {
        params.append('device_identifiers', device)
      })
    }

    if (request.test_item_filters && request.test_item_filters.length > 0) {
      request.test_item_filters.forEach((filter) => {
        params.append('test_item_filters', filter)
      })
    }

    if (request.exclude_test_item_filters && request.exclude_test_item_filters.length > 0) {
      request.exclude_test_item_filters.forEach((filter) => {
        params.append('exclude_test_item_filters', filter)
      })
    }

    // Add per-station filters as JSON string (backend expects 'station_filters' query param)
    if (request.station_filters && Object.keys(request.station_filters).length > 0) {
      params.append('station_filters', JSON.stringify(request.station_filters))
    }

    // Backend expects criteria_file as multipart/form-data File parameter
    // We must use FormData when criteria_file is present
    if (request.criteria_file) {
      const formData = new FormData()
      formData.append('criteria_file', request.criteria_file)

      // CRITICAL: Do NOT set Content-Type header manually!
      // Browser/axios must set it automatically with the multipart boundary
      // The auth interceptor will remove any manual Content-Type header for FormData
      const { data } = await apiClient.post<TopProductBatchResponse>(
        `${BASE_URL}/top-product/hierarchical?${params.toString()}`,
        formData,
      )
      return data
    }

    // When no criteria file, send POST with empty body
    // Backend will use default criteria rules
    const { data } = await apiClient.post<TopProductBatchResponse>(
      `${BASE_URL}/top-product/hierarchical?${params.toString()}`,
    )

    return data
  },

  /**
   * Fetch test items for multiple stations at once
   *
   * Efficiently loads available test items for selected stations.
   * Useful for populating filter dropdowns.
   *
   * @param request - Batch test items request
   * @returns Test items grouped by station
   *
   * @example
   * ```typescript
   * const response = await dutTopProductApi.getTestItemsBatch({
   *   station_identifiers: ['144', 'Wireless_Test_6G'],
   *   site_identifier: 'PTB',
   *   status: 'Active'
   * })
   * ```
   */
  async getTestItemsBatch(request: BatchTestItemsRequest): Promise<BatchTestItemsResponse> {
    const { data } = await apiClient.post<BatchTestItemsResponse>(
      `${BASE_URL}/test-items/batch`,
      request,
    )

    return data
  },

  /**
   * Fetch filtered test items for multiple stations (excludes items with both limits as 0)
   *
   * Efficiently loads test items for selected stations, excluding items where both
   * upperlimit=0 AND lowerlimit=0. These items are not useful for top product analysis.
   * Items with only one limit as 0 are still included.
   *
   * @param request - Batch test items request
   * @returns Filtered test items grouped by station
   *
   * @example
   * ```typescript
   * const response = await dutTopProductApi.getTestItemsBatchFiltered({
   *   station_identifiers: ['144', 'Wireless_Test_6G'],
   *   site_identifier: 'PTB',
   *   status: 'Active'
   * })
   * ```
   */
  async getTestItemsBatchFiltered(request: BatchTestItemsRequest): Promise<BatchTestItemsResponse> {
    const { data } = await apiClient.post<BatchTestItemsResponse>(
      `${BASE_URL}/test-items/batch/filtered`,
      request,
    )

    return data
  },

  /**
   * Fetch devices for multiple stations at once
   *
   * Efficiently loads available devices for selected stations.
   * Useful for populating device filter dropdowns.
   *
   * @param request - Batch devices request
   * @returns Devices grouped by station
   *
   * @example
   * ```typescript
   * const response = await dutTopProductApi.getDevicesBatch({
   *   station_identifiers: ['144', 'Wireless_Test_6G'],
   *   site_identifier: 'PTB',
   *   status: 'Active'
   * })
   * ```
   */
  async getDevicesBatch(request: BatchDevicesRequest): Promise<BatchDevicesResponse> {
    const { data } = await apiClient.post<BatchDevicesResponse>(
      `${BASE_URL}/devices/batch`,
      request,
    )

    return data
  },
}
