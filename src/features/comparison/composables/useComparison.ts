/**
 * File Comparison Composable
 *
 * Handles dual file upload, preview, comparison configuration, and result display.
 * Provides reactive state and helper methods for comparing two files.
 */

import { computed, ref } from 'vue'
import type { CompareDataResponse, UploadPreviewResponse } from '@/core/types/api.types'
import { parsingApi } from '@/features/parsing/api'
import { getApiErrorDetail, getErrorMessage } from '@/shared/utils'
import { comparisonApi } from '../api'

export interface FileSelection {
  selected: string[]
  excluded: string[]
}

export interface RowSelection {
  selected: number[]
  excluded: number[]
}

export interface ComparisonOptions {
  hasHeader?: boolean
  delimiter?: string
  persist?: boolean
}

/**
 * File comparison composable for dual file upload and comparison
 *
 * @returns Comparison state and operations
 *
 * @example
 * ```ts
 * const {
 *   fileA,
 *   fileB,
 *   uploadFileA,
 *   uploadFileB,
 *   compareFiles,
 *   downloadComparison
 * } = useComparison()
 *
 * // Upload both files
 * await uploadFileA(selectedFileA)
 * await uploadFileB(selectedFileB)
 *
 * // Compare with selections
 * await compareFiles('both', {
 *   aColumns: { selected: ['ISN', 'Result'] },
 *   bColumns: { selected: ['ISN', 'Result'] },
 *   joinOn: { a: ['ISN'], b: ['ISN'] }
 * })
 * ```
 */
export function useComparison(options: ComparisonOptions = {}) {
  // State
  const fileA = ref<File | null>(null)
  const fileB = ref<File | null>(null)
  const previewA = ref<UploadPreviewResponse | null>(null)
  const previewB = ref<UploadPreviewResponse | null>(null)
  const comparisonResult = ref<CompareDataResponse | null>(null)
  const loading = ref(false)
  const loadingA = ref(false)
  const loadingB = ref(false)
  const error = ref<string | null>(null)
  const uploadProgressA = ref(0)
  const uploadProgressB = ref(0)

  // Options with defaults
  const defaultOptions = {
    hasHeader: options.hasHeader ?? true,
    delimiter: options.delimiter ?? ',',
    persist: options.persist ?? false,
  }

  // Computed
  const hasFileA = computed(() => fileA.value !== null)
  const hasFileB = computed(() => fileB.value !== null)
  const hasBothFiles = computed(() => hasFileA.value && hasFileB.value)
  const hasPreviewA = computed(() => previewA.value !== null)
  const hasPreviewB = computed(() => previewB.value !== null)
  const hasBothPreviews = computed(() => hasPreviewA.value && hasPreviewB.value)
  const hasComparisonResult = computed(() => comparisonResult.value !== null)

  const fileIdA = computed(() => previewA.value?.file_id || null)
  const fileIdB = computed(() => previewB.value?.file_id || null)
  const columnsA = computed(() => previewA.value?.columns || [])
  const columnsB = computed(() => previewB.value?.columns || [])
  const previewRowsA = computed(() => previewA.value?.preview || [])
  const previewRowsB = computed(() => previewB.value?.preview || [])

  /**
   * Upload file A and get preview
   */
  async function uploadFileA(
    selectedFile: File,
    uploadOptions?: Partial<ComparisonOptions>,
  ): Promise<UploadPreviewResponse | null> {
    try {
      loadingA.value = true
      loading.value = true
      error.value = null
      uploadProgressA.value = 0
      fileA.value = selectedFile

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
      previewA.value = response
      uploadProgressA.value = 100

      return response
    } catch (err: unknown) {
      error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Upload file A failed'
      return null
    } finally {
      loadingA.value = false
      loading.value = loadingB.value
    }
  }

  /**
   * Upload file B and get preview
   */
  async function uploadFileB(
    selectedFile: File,
    uploadOptions?: Partial<ComparisonOptions>,
  ): Promise<UploadPreviewResponse | null> {
    try {
      loadingB.value = true
      loading.value = true
      error.value = null
      uploadProgressB.value = 0
      fileB.value = selectedFile

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
      previewB.value = response
      uploadProgressB.value = 100

      return response
    } catch (err: unknown) {
      error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Upload file B failed'
      return null
    } finally {
      loadingB.value = false
      loading.value = loadingA.value
    }
  }

  /**
   * Compare files with optional selections and join columns
   */
  async function compareFiles(
    mode: 'columns' | 'rows' | 'both',
    selections?: {
      aColumns?: Partial<FileSelection>
      aRows?: Partial<RowSelection>
      bColumns?: Partial<FileSelection>
      bRows?: Partial<RowSelection>
      joinOn?: { a: string[]; b: string[] }
    },
  ): Promise<CompareDataResponse | null> {
    if (!fileIdA.value || !fileIdB.value) {
      error.value = 'Both files must be uploaded before comparison'
      return null
    }

    try {
      loading.value = true
      error.value = null

      const formData = new FormData()
      formData.append('file_a', fileIdA.value)
      formData.append('file_b', fileIdB.value)
      formData.append('mode', mode)

      // File A selections
      if (selections?.aColumns?.selected && selections.aColumns.selected.length > 0) {
        formData.append('a_selected_columns', JSON.stringify(selections.aColumns.selected))
      }
      if (selections?.aColumns?.excluded && selections.aColumns.excluded.length > 0) {
        formData.append('a_exclude_columns', JSON.stringify(selections.aColumns.excluded))
      }
      if (selections?.aRows?.selected && selections.aRows.selected.length > 0) {
        formData.append('a_selected_rows', JSON.stringify(selections.aRows.selected))
      }
      if (selections?.aRows?.excluded && selections.aRows.excluded.length > 0) {
        formData.append('a_exclude_rows', JSON.stringify(selections.aRows.excluded))
      }

      // File B selections
      if (selections?.bColumns?.selected && selections.bColumns.selected.length > 0) {
        formData.append('b_selected_columns', JSON.stringify(selections.bColumns.selected))
      }
      if (selections?.bColumns?.excluded && selections.bColumns.excluded.length > 0) {
        formData.append('b_exclude_columns', JSON.stringify(selections.bColumns.excluded))
      }
      if (selections?.bRows?.selected && selections.bRows.selected.length > 0) {
        formData.append('b_selected_rows', JSON.stringify(selections.bRows.selected))
      }
      if (selections?.bRows?.excluded && selections.bRows.excluded.length > 0) {
        formData.append('b_exclude_rows', JSON.stringify(selections.bRows.excluded))
      }

      // Join columns
      if (selections?.joinOn?.a && selections.joinOn.a.length > 0) {
        formData.append('a_join_on', JSON.stringify(selections.joinOn.a))
      }
      if (selections?.joinOn?.b && selections.joinOn.b.length > 0) {
        formData.append('b_join_on', JSON.stringify(selections.joinOn.b))
      }

      const response = await comparisonApi.compare(formData)
      comparisonResult.value = response

      return response
    } catch (err: unknown) {
      error.value = getApiErrorDetail(err) || getErrorMessage(err) || 'Comparison failed'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Compare and download as CSV
   */
  async function downloadComparison(
    mode: 'columns' | 'rows' | 'both',
    selections?: {
      aColumns?: Partial<FileSelection>
      aRows?: Partial<RowSelection>
      bColumns?: Partial<FileSelection>
      bRows?: Partial<RowSelection>
      joinOn?: { a: string[]; b: string[] }
    },
    filename = 'comparison.csv',
  ): Promise<void> {
    if (!fileIdA.value || !fileIdB.value) {
      error.value = 'Both files must be uploaded before comparison'
      return
    }

    try {
      loading.value = true
      error.value = null

      const formData = new FormData()
      formData.append('file_a', fileIdA.value)
      formData.append('file_b', fileIdB.value)
      formData.append('mode', mode)

      // File A selections
      if (selections?.aColumns?.selected && selections.aColumns.selected.length > 0) {
        formData.append('a_selected_columns', JSON.stringify(selections.aColumns.selected))
      }
      if (selections?.aColumns?.excluded && selections.aColumns.excluded.length > 0) {
        formData.append('a_exclude_columns', JSON.stringify(selections.aColumns.excluded))
      }
      if (selections?.aRows?.selected && selections.aRows.selected.length > 0) {
        formData.append('a_selected_rows', JSON.stringify(selections.aRows.selected))
      }
      if (selections?.aRows?.excluded && selections.aRows.excluded.length > 0) {
        formData.append('a_exclude_rows', JSON.stringify(selections.aRows.excluded))
      }

      // File B selections
      if (selections?.bColumns?.selected && selections.bColumns.selected.length > 0) {
        formData.append('b_selected_columns', JSON.stringify(selections.bColumns.selected))
      }
      if (selections?.bColumns?.excluded && selections.bColumns.excluded.length > 0) {
        formData.append('b_exclude_columns', JSON.stringify(selections.bColumns.excluded))
      }
      if (selections?.bRows?.selected && selections.bRows.selected.length > 0) {
        formData.append('b_selected_rows', JSON.stringify(selections.bRows.selected))
      }
      if (selections?.bRows?.excluded && selections.bRows.excluded.length > 0) {
        formData.append('b_exclude_rows', JSON.stringify(selections.bRows.excluded))
      }

      // Join columns
      if (selections?.joinOn?.a && selections.joinOn.a.length > 0) {
        formData.append('a_join_on', JSON.stringify(selections.joinOn.a))
      }
      if (selections?.joinOn?.b && selections.joinOn.b.length > 0) {
        formData.append('b_join_on', JSON.stringify(selections.joinOn.b))
      }

      const blob = await comparisonApi.compareDownload(formData)

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
   * Reset all state
   */
  function reset() {
    fileA.value = null
    fileB.value = null
    previewA.value = null
    previewB.value = null
    comparisonResult.value = null
    loading.value = false
    loadingA.value = false
    loadingB.value = false
    error.value = null
    uploadProgressA.value = 0
    uploadProgressB.value = 0
  }

  /**
   * Clear error message
   */
  function clearError() {
    error.value = null
  }

  return {
    // State
    fileA,
    fileB,
    previewA,
    previewB,
    comparisonResult,
    loading,
    loadingA,
    loadingB,
    error,
    uploadProgressA,
    uploadProgressB,

    // Computed
    hasFileA,
    hasFileB,
    hasBothFiles,
    hasPreviewA,
    hasPreviewB,
    hasBothPreviews,
    hasComparisonResult,
    fileIdA,
    fileIdB,
    columnsA,
    columnsB,
    previewRowsA,
    previewRowsB,

    // Methods
    uploadFileA,
    uploadFileB,
    compareFiles,
    downloadComparison,
    reset,
    clearError,
  }
}
