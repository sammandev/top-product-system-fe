/**
 * API Type Definitions
 * Types for API requests and responses
 */

import type { PaginationParams } from './common.types'

// Parsing Types
export interface ParseRequest {
  file: File
  format?: 'csv' | 'xlsx' | 'auto'
  options?: ParseOptions
}

export interface ParseOptions {
  delimiter?: string
  encoding?: string
  skipRows?: number
  maxRows?: number
}

export interface ParseResponse {
  file_id: string
  filename: string
  format: string
  rows_count: number
  columns: string[]
  preview_data: any[]
  metadata?: Record<string, any>
}

// Upload Preview Types (used by /api/upload-preview)
export interface UploadPreviewRequest {
  file: File
  has_header?: boolean
  delimiter?: string
  persist?: boolean
}

export interface UploadPreviewResponse {
  file_id: string
  filename: string
  columns: string[]
  preview: Record<string, any>[]
}

// Parse Data Types (used by /api/parse)
export interface ParseDataRequest {
  file_id: string
  mode: 'columns' | 'rows' | 'both'
  selected_columns?: string[]
  selected_rows?: number[]
  exclude_columns?: string[]
  exclude_rows?: number[]
}

export interface ParseDataResponse {
  columns: string[]
  rows: Record<string, any>[]
}

// Compare Data Types (used by /api/compare)
export interface CompareDataRequest {
  file_a: string
  file_b: string
  mode: 'columns' | 'rows' | 'both'
  a_selected_columns?: string[]
  a_selected_rows?: number[]
  a_exclude_columns?: string[]
  a_exclude_rows?: number[]
  b_selected_columns?: string[]
  b_selected_rows?: number[]
  b_exclude_columns?: string[]
  b_exclude_rows?: number[]
  a_join_on?: string[]
  b_join_on?: string[]
}

export interface CompareDataResponse {
  rows: Record<string, any>[]
  summary?: {
    total_rows: number
    matching_rows?: number
    different_rows?: number
    columns_compared?: string[]
  }
}

export interface ParsedData {
  headers: string[]
  rows: any[]
  total_rows: number
  parsed_rows: number
  errors?: ParseError[]
}

export interface ParseError {
  row: number
  column?: string
  message: string
  code?: string
}

// Comparison Types
export interface CompareRequest {
  file1: File
  file2: File
  format?: string
  comparison_type?: 'full' | 'keys' | 'values'
  options?: CompareOptions
}

export interface CompareOptions {
  key_columns?: string[]
  ignore_columns?: string[]
  case_sensitive?: boolean
  trim_whitespace?: boolean
}

export interface CompareResponse {
  comparison_id: string
  file1_name: string
  file2_name: string
  differences: Difference[]
  summary: ComparisonSummary
  statistics?: ComparisonStatistics
}

export interface Difference {
  type: 'added' | 'removed' | 'modified'
  row_number: number
  column?: string
  file1_value?: any
  file2_value?: any
  key?: string
}

export interface ComparisonSummary {
  total_records: number
  matching_records: number
  differences_count: number
  added_count: number
  removed_count: number
  modified_count: number
}

export interface ComparisonStatistics {
  processing_time: number
  memory_used: number
  columns_compared: number
}

// Multi-DUT Analysis Types
export interface MultiDUTAnalysisRequest {
  files: File[]
  criteria_file?: File
  analysis_type?: 'comparison' | 'aggregation' | 'trend'
  options?: AnalysisOptions
}

export interface AnalysisOptions {
  include_charts?: boolean
  export_format?: 'xlsx' | 'csv' | 'json'
  filters?: Record<string, any>
}

export interface MultiDUTAnalysisResponse {
  analysis_id: string
  results: AnalysisResult[]
  summary: AnalysisSummary
  charts?: ChartData[]
  download_url?: string
}

export interface AnalysisResult {
  file_name: string
  device_count: number
  pass_rate: number
  fail_rate: number
  average_score: number
  details: any[]
}

export interface AnalysisSummary {
  total_devices: number
  total_files: number
  overall_pass_rate: number
  processing_time: number
  generated_at: string
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter'
  title: string
  labels: string[]
  datasets: ChartDataset[]
  options?: any
}

export interface ChartDataset {
  label: string
  data: number[]
  backgroundColor?: string | string[]
  borderColor?: string
  borderWidth?: number
}

// File Download Types
export interface DownloadRequest {
  file_id: string
  format?: 'xlsx' | 'csv' | 'json'
  filename?: string
}

export interface DownloadResponse {
  url: string
  filename: string
  size: number
  expires_at: string
}

// Batch Operations
export interface BatchOperation<T = any> {
  operation: 'create' | 'update' | 'delete'
  data: T
  id?: string | number
}

export interface BatchOperationResponse {
  success: boolean
  processed: number
  failed: number
  errors?: BatchError[]
}

export interface BatchError {
  index: number
  operation: string
  error: string
  data?: any
}

// Upload Types
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
  speed?: number
  remaining_time?: number
}

export interface UploadResponse {
  file_id: string
  filename: string
  size: number
  mime_type: string
  url?: string
  uploaded_at: string
}

// Search Types
export interface SearchRequest {
  query: string
  filters?: Record<string, any>
  pagination?: PaginationParams
  fields?: string[]
}

export interface SearchResponse<T = any> {
  results: T[]
  total: number
  query: string
  took: number
  suggestions?: string[]
}

// Export types
export interface ExportRequest {
  format: 'xlsx' | 'csv' | 'json' | 'pdf'
  data?: any[]
  filters?: Record<string, any>
  options?: ExportOptions
}

export interface ExportOptions {
  filename?: string
  columns?: string[]
  include_headers?: boolean
  date_format?: string
}

export interface ExportResponse {
  file_id: string
  filename: string
  size: number
  download_url: string
  expires_at: string
}
