/**
 * API for Parse & Download Format feature
 */

import apiClient from '@/core/api/client'

export interface ParseDownloadParams {
  fileId: string
  mode: 'columns' | 'rows' | 'both'
  format: 'csv' | 'xlsx' | 'both'
  hasHeader: boolean
  selectedColumns?: string[]
  selectedRows?: number[]
  excludeColumns?: string[]
  excludeRows?: number[]
}

/**
 * Parse and download file in specified format
 */
export async function parseDownloadFormat(
  params: ParseDownloadParams,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const formData = new FormData()
  formData.append('file_id', params.fileId)
  formData.append('mode', params.mode)
  formData.append('format', params.format)
  formData.append('has_header', params.hasHeader.toString())

  if (params.selectedColumns && params.selectedColumns.length > 0) {
    formData.append('selected_columns', JSON.stringify(params.selectedColumns))
  }

  if (params.selectedRows && params.selectedRows.length > 0) {
    formData.append('selected_rows', JSON.stringify(params.selectedRows))
  }

  if (params.excludeColumns && params.excludeColumns.length > 0) {
    formData.append('exclude_columns', JSON.stringify(params.excludeColumns))
  }

  if (params.excludeRows && params.excludeRows.length > 0) {
    formData.append('exclude_rows', JSON.stringify(params.excludeRows))
  }

  const response = await apiClient.post('/api/parse-download-format', formData, {
    responseType: 'blob',
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(progress)
      }
    }
  })

  return response.data
}

/**
 * Download the blob with appropriate filename
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Get filename based on format
 */
export function getDownloadFilename(format: string): string {
  switch (format) {
    case 'csv':
      return 'parsed.csv'
    case 'xlsx':
      return 'parsed.xlsx'
    case 'both':
      return 'parsed.zip'
    default:
      return 'parsed.csv'
  }
}
