/**
 * Parsing Feature Type Definitions
 * 
 * TypeScript interfaces for file upload, preview, parsing operations
 */

/**
 * Upload options for file preview
 */
export interface UploadOptions {
  hasHeader: boolean
  delimiter?: string
  persist?: boolean
}

/**
 * Column information with metadata
 */
export interface ColumnInfo {
  name: string
  dataType: string
  uniqueCount: number
  nullCount: number
  sampleValues: (string | number | null)[]
}

/**
 * Column selection state
 */
export interface ColumnSelection {
  selected: string[]
  excluded: string[]
}

/**
 * Row selection mode types
 */
export type RowSelectionMode = 'all' | 'range' | 'exclude'

/**
 * Row range selection
 */
export interface RowRange {
  start: number
  end: number
}

/**
 * Row selection state
 */
export interface RowSelection {
  mode: RowSelectionMode
  range?: RowRange
  exclude?: number[]
}

/**
 * Parse mode types
 */
export type ParseMode = 'columns' | 'rows' | 'both'

/**
 * Parse request payload
 */
export interface ParseRequest {
  fileId: string
  mode: ParseMode
  columnSelection?: ColumnSelection
  rowSelection?: RowSelection
}

/**
 * File upload preview response
 */
export interface UploadPreviewResponse {
  file_id: string
  filename: string
  columns: string[]
  preview: Record<string, any>[]
  row_count: number
  has_header: boolean
  delimiter?: string
}

/**
 * Parse data response
 */
export interface ParseDataResponse {
  columns: string[]
  rows: Record<string, any>[]
  row_count: number
  column_count: number
}

/**
 * File metadata
 */
export interface FileMetadata {
  name: string
  size: number
  type: string
  lastModified: number
}

/**
 * Parsing error types
 */
export interface ParsingError {
  code: string
  message: string
  details?: Record<string, any>
}

/**
 * Export format types
 */
export type ExportFormat = 'csv' | 'xlsx' | 'json'

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat
  filename: string
  includeHeader: boolean
}
