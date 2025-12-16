import apiClient from '@/core/api/client'
import type { HierarchicalRequest, HierarchicalResponse } from '@/core/types'

/**
 * DUT Hierarchical Analysis API Service
 * Handles hierarchical top product analysis with multi-level scoring
 */
export const dutHierarchicalApi = {
    /**
     * Analyze DUT(s) with hierarchical scoring
     * @param request - Hierarchical analysis request parameters
     * @returns Hierarchical analysis response with group scores
     */
    async analyzeHierarchical(request: HierarchicalRequest): Promise<HierarchicalResponse> {
        // Build query parameters
        const params = new URLSearchParams()

        // Add required DUT ISNs
        request.dut_isns.forEach(isn => {
            params.append('dut_isn', isn)
        })

        // Add optional filters
        if (request.stations && request.stations.length > 0) {
            request.stations.forEach(station => {
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
            request.device_identifiers.forEach(device => {
                params.append('device_identifiers', device)
            })
        }

        if (request.test_item_filters && request.test_item_filters.length > 0) {
            request.test_item_filters.forEach(filter => {
                params.append('test_item_filters', filter)
            })
        }

        if (request.exclude_test_item_filters && request.exclude_test_item_filters.length > 0) {
            request.exclude_test_item_filters.forEach(filter => {
                params.append('exclude_test_item_filters', filter)
            })
        }

        // Handle file upload if present
        if (request.criteria_file) {
            const formData = new FormData()

            // Add all query parameters to FormData
            params.forEach((value, key) => {
                formData.append(key, value)
            })

            // Add criteria file
            formData.append('criteria_file', request.criteria_file)

            // CRITICAL: Do NOT set Content-Type header manually for FormData!
            // Browser/axios must set it automatically with the multipart boundary
            const response = await apiClient.post<HierarchicalResponse>(
                '/api/dut/top-product/hierarchical',
                formData
            )

            return response.data
        } else {
            // No file, use query parameters only
            const response = await apiClient.post<HierarchicalResponse>(
                `/api/dut/top-product/hierarchical?${params.toString()}`
            )

            return response.data
        }
    }
}
