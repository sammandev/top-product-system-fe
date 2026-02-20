/**
 * File Parsing Composable
 *
 * Handles file upload, preview, column/row selection, and download operations.
 * Provides reactive state and helper methods for parsing workflows.
 */

import { computed, ref } from 'vue'
import type { ParseDataResponse, UploadPreviewResponse } from '@/core/types/api.types'
import { getApiErrorDetail, getErrorMessage } from '@/shared/utils'
import { parsingApi } from '../api'

export interface UseFileParsingOptions {
  hasHeader?: boolean
  delimiter?: string
  persist?: boolean
}

export interface ColumnSelection {
  selected: string[]
  excluded: string[]
}

export interface RowSelection {
  selected: number[]
  excluded: number[]
}

/**
 * File parsing composable for upload, preview, and data extraction
 *
 * @param options - Default upload options (header, delimiter, persist)
 * @returns Parsing state and operations
 *
 * @example
 * ```ts
 * const {
 *   file,
 *   uploadFile,
 *   preview,
 *   loading,
 *   error,
 *   parseData,
 *   downloadParsed
 * } = useFileParsing({ hasHeader: true, delimiter: ',' })
 *
 * // Upload and preview
 * await uploadFile(selectedFile)
 * console.log(preview.value.columns)
 *
 * // Parse with selections
 * const result = await parseData('columns', { selected: ['col1', 'col3'] })
 *
 * // Download as CSV
 * await downloadParsed('rows', { selected: [0, 2, 4] })
 * ```
 */
export function useFileParsing(options: UseFileParsingOptions = {}) {
  // State
  const file = ref<File | null>(null)
  const preview = ref<UploadPreviewResponse | null>(null)
  const parsedData = ref<ParseDataResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const uploadProgress = ref(0)

  // Options with defaults
  const defaultOptions = {
    hasHeader: options.hasHeader ?? true,
    delimiter: options.delimiter ?? ',',
    persist: options.persist ?? false,
  }

  // Computed
  const hasFile = computed(() => file.value !== null)
  const hasPreview = computed(() => preview.value !== null)
  const hasParsedData = computed(() => parsedData.value !== null)
  const fileId = computed(() => preview.value?.file_id || null)
  const columns = computed(() => preview.value?.columns || [])
  const previewRows = computed(() => preview.value?.preview || [])

  /**
   * Upload file and get preview
   *
   * @param selectedFile - File to upload
   * @param uploadOptions - Override default upload options
   * @returns Upload preview response
   */
  async function uploadFile(
    selectedFile: File,
    uploadOptions?: Partial<UseFileParsingOptions>,
  ): Promise<UploadPreviewResponse | null> {
    try {
      loading.value = true
      error.value = null
      uploadProgress.value = 0
      file.value = selectedFile

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('has_header', String(uploadOptions?.hasHeader ?? defaultOptions.hasHeader))
      if (uploadOptions?.delimiter || defaultOptions.delimiter) {
        formData.append('delimiter', uploadOptions?.delimiter || defaultOptions.delimiter)
      }
      if (uploadOptions?.persist !== undefined) {
        formData.append('persist', String(uploadOptions.persist))
      } else if (defaultOptions.persist !== undefined) {
        formData.append('persist', String(defaultOptions.persist))
      }

      const response = await parsingApi.uploadPreview(formData)
      preview.value = response
      uploadProgress.value = 100

      return response
    } catch (err: unknown) {
      error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Upload failed'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Parse data with column/row selections
   *
   * @param mode - Selection mode ('columns', 'rows', 'both')
   * @param columnSelection - Column selections (selected/excluded)
   * @param rowSelection - Row selections (selected/excluded)
   * @returns Parsed data response
   */
  async function parseData(
    mode: 'columns' | 'rows' | 'both',
    columnSelection?: Partial<ColumnSelection>,
    rowSelection?: Partial<RowSelection>,
  ): Promise<ParseDataResponse | null> {
    if (!fileId.value) {
      error.value = 'No file uploaded. Please upload a file first.'
      return null
    }

    try {
      loading.value = true
      error.value = null

      const formData = new FormData()
      formData.append('file_id', fileId.value)
      formData.append('mode', mode)

      if (columnSelection?.selected && columnSelection.selected.length > 0) {
        formData.append('selected_columns', JSON.stringify(columnSelection.selected))
      }
      if (columnSelection?.excluded && columnSelection.excluded.length > 0) {
        formData.append('exclude_columns', JSON.stringify(columnSelection.excluded))
      }
      if (rowSelection?.selected && rowSelection.selected.length > 0) {
        formData.append('selected_rows', JSON.stringify(rowSelection.selected))
      }
      if (rowSelection?.excluded && rowSelection.excluded.length > 0) {
        formData.append('exclude_rows', JSON.stringify(rowSelection.excluded))
      }

      const response = await parsingApi.parse(formData)
      parsedData.value = response

      return response
    } catch (err: unknown) {
      error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Parsing failed'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Parse and download as CSV
   *
   * @param mode - Selection mode ('columns', 'rows', 'both')
   * @param columnSelection - Column selections (selected/excluded)
   * @param rowSelection - Row selections (selected/excluded)
   * @param filename - Custom filename for download (default: 'parsed.csv')
   */
  async function downloadParsed(
    mode: 'columns' | 'rows' | 'both',
    columnSelection?: Partial<ColumnSelection>,
    rowSelection?: Partial<RowSelection>,
    filename = 'parsed.csv',
  ): Promise<void> {
    if (!fileId.value) {
      error.value = 'No file uploaded. Please upload a file first.'
      return
    }

    try {
      loading.value = true
      error.value = null

      const formData = new FormData()
      formData.append('file_id', fileId.value)
      formData.append('mode', mode)

      if (columnSelection?.selected && columnSelection.selected.length > 0) {
        formData.append('selected_columns', JSON.stringify(columnSelection.selected))
      }
      if (columnSelection?.excluded && columnSelection.excluded.length > 0) {
        formData.append('exclude_columns', JSON.stringify(columnSelection.excluded))
      }
      if (rowSelection?.selected && rowSelection.selected.length > 0) {
        formData.append('selected_rows', JSON.stringify(rowSelection.selected))
      }
      if (rowSelection?.excluded && rowSelection.excluded.length > 0) {
        formData.append('exclude_rows', JSON.stringify(rowSelection.excluded))
      }

      const blob = await parsingApi.parseDownload(formData)

      // Trigger browser download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Download failed'
    } finally {
      loading.value = false
    }
  }

  /**
   * Parse and download with format selection (CSV, XLSX, or both as ZIP)
   *
   * @param mode - Selection mode ('columns', 'rows', 'both')
   * @param columnSelection - Column selections (selected/excluded)
   * @param rowSelection - Row selections (selected/excluded)
   * @param format - Download format ('csv', 'xlsx', 'both')
   * @param filename - Custom filename for download
   * @param hasHeader - Whether first row is header (affects first-row-as-header logic)
   */
  async function downloadParsedFormat(
    mode: 'columns' | 'rows' | 'both',
    columnSelection?: Partial<ColumnSelection>,
    rowSelection?: Partial<RowSelection>,
    format: 'csv' | 'xlsx' | 'both' = 'csv',
    filename = 'parsed',
    hasHeader: boolean = true,
  ): Promise<void> {
    if (!fileId.value) {
      error.value = 'No file uploaded. Please upload a file first.'
      return
    }

    try {
      loading.value = true
      error.value = null

      const formData = new FormData()
      formData.append('file_id', fileId.value)
      formData.append('mode', mode)
      formData.append('format', format)
      formData.append('has_header', String(hasHeader))

      if (columnSelection?.selected && columnSelection.selected.length > 0) {
        formData.append('selected_columns', JSON.stringify(columnSelection.selected))
      }
      if (columnSelection?.excluded && columnSelection.excluded.length > 0) {
        formData.append('exclude_columns', JSON.stringify(columnSelection.excluded))
      }
      if (rowSelection?.selected && rowSelection.selected.length > 0) {
        formData.append('selected_rows', JSON.stringify(rowSelection.selected))
      }
      if (rowSelection?.excluded && rowSelection.excluded.length > 0) {
        formData.append('exclude_rows', JSON.stringify(rowSelection.excluded))
      }

      const blob = await parsingApi.parseDownloadFormat(formData)

      // Generate timestamp in YYYYMMDD_HHmmss format
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`

      // Determine file extension based on format
      let downloadFilename = `${filename}_${timestamp}`
      if (format === 'csv') {
        downloadFilename += '.csv'
      } else if (format === 'xlsx') {
        downloadFilename += '.xlsx'
      } else if (format === 'both') {
        downloadFilename += '.zip'
      }

      // Trigger browser download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = downloadFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Download failed'
    } finally {
      loading.value = false
    }
  }

  /**
   * Reset all state
   */
  function reset() {
    file.value = null
    preview.value = null
    parsedData.value = null
    loading.value = false
    error.value = null
    uploadProgress.value = 0
  }

  /**
   * Clear error message
   */
  function clearError() {
    error.value = null
  }

  return {
    // State
    file,
    preview,
    parsedData,
    loading,
    error,
    uploadProgress,

    // Computed
    hasFile,
    hasPreview,
    hasParsedData,
    fileId,
    columns,
    previewRows,

    // Methods
    uploadFile,
    parseData,
    downloadParsed,
    downloadParsedFormat,
    reset,
    clearError,
  }
}
