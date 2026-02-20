/**
 * Parsing API Client
 *
 * Handles file upload, preview, parsing, and download operations.
 * Backend endpoints: /api/upload-preview, /api/parse, /api/parse-download
 */

import apiClient from '@/core/api/client'
import type { ParseDataResponse, UploadPreviewResponse } from '@/core/types/api.types'

/**
 * Upload file and get preview
 *
 * @param request - Upload request with file, header flag, delimiter, persist option
 * @returns File ID, columns, and preview data
 *
 * @example
 * ```ts
 * const formData = new FormData()
 * formData.append('file', fileBlob)
 * formData.append('has_header', 'true')
 * formData.append('delimiter', ',')
 *
 * const preview = await parsingApi.uploadPreview(formData)
 * console.log(preview.file_id, preview.columns)
 * ```
 */
export async function uploadPreview(request: FormData): Promise<UploadPreviewResponse> {
  // CRITICAL: Do NOT set Content-Type header manually for FormData!
  // Browser/axios must set it automatically with the multipart boundary
  // The auth interceptor will remove any manual Content-Type header for FormData
  const { data } = await apiClient.post<UploadPreviewResponse>('/api/upload-preview', request)
  return data
}

/**
 * Parse uploaded file with column/row selection
 *
 * @param request - Parse request with file ID, mode, selections
 * @returns Parsed columns and rows as JSON
 *
 * @example
 * ```ts
 * const formData = new FormData()
 * formData.append('file_id', '9f2d1c3e_sample.csv')
 * formData.append('mode', 'columns')
 * formData.append('selected_columns', JSON.stringify(['col1', 'col3']))
 *
 * const result = await parsingApi.parse(formData)
 * console.log(result.columns, result.rows)
 * ```
 */
export async function parse(request: FormData): Promise<ParseDataResponse> {
  // CRITICAL: Do NOT set Content-Type header manually for FormData!
  // Browser/axios must set it automatically with the multipart boundary
  const { data } = await apiClient.post<ParseDataResponse>('/api/parse', request)
  return data
}

/**
 * Parse and download as CSV
 *
 * @param request - Parse request with file ID, mode, selections
 * @returns CSV blob for download
 *
 * @example
 * ```ts
 * const formData = new FormData()
 * formData.append('file_id', '9f2d1c3e_sample.csv')
 * formData.append('mode', 'rows')
 * formData.append('selected_rows', JSON.stringify([0, 2, 4]))
 *
 * const blob = await parsingApi.parseDownload(formData)
 * // Trigger browser download
 * const url = URL.createObjectURL(blob)
 * const link = document.createElement('a')
 * link.href = url
 * link.download = 'parsed.csv'
 * link.click()
 * ```
 */
export async function parseDownload(request: FormData): Promise<Blob> {
  // CRITICAL: Do NOT set Content-Type header manually for FormData!
  // Browser/axios must set it automatically with the multipart boundary
  const { data } = await apiClient.post('/api/parse-download', request, {
    responseType: 'blob',
  })
  return data
}

/**
 * Parse and download in specified format (CSV, XLSX, or both as ZIP)
 *
 * @param request - Parse request with file ID, mode, format, selections
 * @returns Blob for download in requested format
 *
 * @example
 * ```ts
 * const formData = new FormData()
 * formData.append('file_id', '9f2d1c3e_sample.csv')
 * formData.append('mode', 'both')
 * formData.append('format', 'xlsx')
 * formData.append('selected_columns', JSON.stringify(['col1', 'col3']))
 * formData.append('selected_rows', JSON.stringify([0, 2, 4]))
 *
 * const blob = await parsingApi.parseDownloadFormat(formData)
 * // Trigger browser download
 * const url = URL.createObjectURL(blob)
 * const link = document.createElement('a')
 * link.href = url
 * link.download = 'parsed.xlsx'
 * link.click()
 * ```
 */
export async function parseDownloadFormat(request: FormData): Promise<Blob> {
  // CRITICAL: Do NOT set Content-Type header manually for FormData!
  // Browser/axios must set it automatically with the multipart boundary
  const { data } = await apiClient.post('/api/parse-download-format', request, {
    responseType: 'blob',
  })
  return data
}

/**
 * Cleanup expired uploads (admin operation)
 *
 * @param adminKey - Admin authorization key
 * @param ttl - Time-to-live override in seconds
 * @returns List of removed file IDs
 *
 * @example
 * ```ts
 * const formData = new FormData()
 * formData.append('admin_key', 'supersecretkey')
 * formData.append('ttl', '3600')
 *
 * const result = await parsingApi.cleanupUploads(formData)
 * console.log('Removed:', result.removed)
 * ```
 */
export async function cleanupUploads(request: FormData): Promise<{ removed: string[] }> {
  // CRITICAL: Do NOT set Content-Type header manually for FormData!
  // Browser/axios must set it automatically with the multipart boundary
  const { data } = await apiClient.post<{ removed: string[] }>('/api/cleanup-uploads', request)
  return data
}

// Export as namespace for cleaner imports
export const parsingApi = {
  uploadPreview,
  parse,
  parseDownload,
  parseDownloadFormat,
  cleanupUploads,
}
