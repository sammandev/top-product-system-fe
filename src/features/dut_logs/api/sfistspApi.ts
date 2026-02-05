/**
 * SFISTSP API Client for ISN Reference Lookup.
 *
 * This module provides functions for interacting with the SFISTSP Web Service
 * to look up ISN references (SSN, MAC address) via the backend proxy.
 *
 * Endpoints:
 * - GET /sfistsp/isn/{isn} - Look up a single ISN
 * - POST /sfistsp/isn/batch - Look up multiple ISNs
 * - GET /sfistsp/config - Get SFISTSP configuration info
 */

import api from '@/core/api/client'

// ============================================================================
// Types
// ============================================================================

/**
 * Response for a single ISN lookup
 */
export interface SfistspIsnReferenceResponse {
    isn: string
    ssn: string | null
    mac: string | null
    success: boolean
    error_message: string | null
    isn_references: string[]
}

/**
 * Response for batch ISN lookup
 */
export interface SfistspIsnBatchLookupResponse {
    results: SfistspIsnReferenceResponse[]
    total_count: number
    success_count: number
    failed_count: number
}

/**
 * SFISTSP configuration info
 */
export interface SfistspConfigResponse {
    base_url: string
    endpoint: string
    available: boolean
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Look up ISN references from SFISTSP.
 *
 * @param isn - The ISN to look up
 * @returns Promise with ISN reference data
 */
export async function lookupIsn(isn: string): Promise<SfistspIsnReferenceResponse> {
    const response = await api.get<SfistspIsnReferenceResponse>(`/api/sfistsp/isn/${encodeURIComponent(isn)}`)
    return response.data
}

/**
 * Look up multiple ISNs from SFISTSP in batch.
 *
 * @param isns - Array of ISNs to look up
 * @returns Promise with batch lookup results
 */
export async function lookupIsnsBatch(isns: string[]): Promise<SfistspIsnBatchLookupResponse> {
    const response = await api.post<SfistspIsnBatchLookupResponse>('/api/sfistsp/isn/batch', { isns })
    return response.data
}

/**
 * Get SFISTSP configuration info.
 *
 * @returns Promise with configuration details
 */
export async function getSfistspConfig(): Promise<SfistspConfigResponse> {
    const response = await api.get<SfistspConfigResponse>('/api/sfistsp/config')
    return response.data
}

// ============================================================================
// Exported API Object
// ============================================================================

export const sfistspApi = {
    lookupIsn,
    lookupIsnsBatch,
    getSfistspConfig,
}

export default sfistspApi
