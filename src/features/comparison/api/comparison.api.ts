/**
 * Comparison API Client
 *
 * Handles file comparison operations between two uploaded files.
 * Backend endpoints: /api/compare, /api/compare-download
 */

import apiClient from '@/core/api/client'
import type { CompareDataResponse } from '@/core/types/api.types'

/**
 * Compare two uploaded files
 *
 * @param request - FormData with file IDs, mode, selections, and join columns
 * @returns Comparison results with differences and summary
 *
 * @example
 * ```ts
 * const formData = new FormData()
 * formData.append('file_a', '9f2d1c3e_A.csv')
 * formData.append('file_b', '4b7d8e2f_B.csv')
 * formData.append('mode', 'both')
 * formData.append('a_selected_columns', JSON.stringify(['ISN', 'Result']))
 * formData.append('b_selected_columns', JSON.stringify(['ISN', 'Result']))
 * formData.append('a_join_on', JSON.stringify(['ISN']))
 * formData.append('b_join_on', JSON.stringify(['ISN']))
 *
 * const result = await comparisonApi.compare(formData)
 * console.log(result.summary, result.rows)
 * ```
 */
export async function compare(request: FormData): Promise<CompareDataResponse> {
  // CRITICAL: Do NOT set Content-Type header manually for FormData!
  // Browser/axios must set it automatically with the multipart boundary
  const { data } = await apiClient.post<CompareDataResponse>('/api/compare', request)
  return data
}

/**
 * Compare and download as CSV
 *
 * @param request - FormData with file IDs, mode, selections, and join columns
 * @returns CSV blob for download
 *
 * @example
 * ```ts
 * const formData = new FormData()
 * formData.append('file_a', '9f2d1c3e_A.csv')
 * formData.append('file_b', '4b7d8e2f_B.csv')
 * formData.append('mode', 'columns')
 *
 * const blob = await comparisonApi.compareDownload(formData)
 * // Trigger browser download
 * const url = URL.createObjectURL(blob)
 * const link = document.createElement('a')
 * link.href = url
 * link.download = 'comparison.csv'
 * link.click()
 * ```
 */
export async function compareDownload(request: FormData): Promise<Blob> {
  // CRITICAL: Do NOT set Content-Type header manually for FormData!
  // Browser/axios must set it automatically with the multipart boundary
  const { data } = await apiClient.post('/api/compare-download', request, {
    responseType: 'blob',
  })
  return data
}

/**
 * Compare MasterControl and DVT formatted files (upload + compare in one step)
 *
 * @param request - FormData with master_file, dvt_file, and optional parameters
 * @returns Comparison result as JSON or downloadable blob (CSV/XLSX) based on human flag
 *
 * @example
 * ```ts
 * // JSON comparison
 * const formData = new FormData()
 * formData.append('master_file', masterFileBlob)
 * formData.append('dvt_file', dvtFileBlob)
 * formData.append('threshold', '0.5')
 *
 * const result = await comparisonApi.compareFormats(formData)
 * console.log(result.summary, result.rows)
 * ```
 *
 * @example
 * ```ts
 * // CSV download
 * const formData = new FormData()
 * formData.append('master_file', masterFileBlob)
 * formData.append('dvt_file', dvtFileBlob)
 * formData.append('human', 'true')
 *
 * const blob = await comparisonApi.compareFormats(formData)
 * // Trigger browser download
 * ```
 *
 * @example
 * ```ts
 * // XLSX download
 * const formData = new FormData()
 * formData.append('master_file', masterFileBlob)
 * formData.append('dvt_file', dvtFileBlob)
 * formData.append('human', 'true')
 * formData.append('return_xlsx', 'true')
 *
 * const blob = await comparisonApi.compareFormats(formData)
 * ```
 */
export async function compareFormats(request: FormData, expectBlob = false): Promise<unknown> {
  // CRITICAL: Do NOT set Content-Type header manually for FormData!
  // Browser/axios must set it automatically with the multipart boundary
  const config = expectBlob ? { responseType: 'blob' as const } : {}
  const { data } = await apiClient.post('/api/compare-formats', request, config)
  return data
}

// Export as namespace for cleaner imports
export const comparisonApi = {
  compare,
  compareDownload,
  compareFormats,
}
