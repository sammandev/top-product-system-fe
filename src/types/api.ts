// Authentication Types
export interface LoginRequest {
  username: string
  password: string
}

export interface ExternalLoginRequest {
  username: string
  password: string
  dut_username?: string
  dut_password?: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  dut_access_token?: string
  dut_refresh_token?: string
}

export interface User {
  id: number
  username: string
  email?: string
  roles: string[]
  permissions: string[]
}

// DUT Types
export interface DUTSite {
  site_id: number
  site_name: string
}

export interface DUTModel {
  model_id: number
  model_name: string
}

export interface DUTStation {
  station_id: number
  station_name: string
}

export interface MeasurementData {
  test_item: string
  usl: number | null
  lsl: number | null
  target: string | null
  actual: string
  expected: string | null
  score: number
}

export interface TopProduct {
  isn: string
  device: string
  station_name: string
  test_date: string
  overall_data_score: number
  latest_data: MeasurementData[]
}

export interface TopProductsRequest {
  site_id: string | number
  model_id: string | number
  start_time: string
  end_time: string
  criteria_score: string | number
  limit?: number
  criteria_file?: File
}

export interface TopProductsResponse {
  site_name: string
  model_name: string
  station_name: string
  criteria_score: string
  requested_data: TopProduct[]
}

// Parsing Types
export interface ParseRequest {
  file: File
  format?: string
}

export interface ParseResponse {
  file_id: string
  filename: string
  format: string
  rows_count: number
  preview_data: any[]
}

// Comparison Types
export interface CompareRequest {
  file1: File
  file2: File
  format?: string
}

export interface CompareResponse {
  comparison_id: string
  differences: any[]
  summary: {
    total_records: number
    matching_records: number
    differences_count: number
  }
}

// Analysis Types
export interface MultiDUTAnalysisRequest {
  files: File[]
  criteria_file?: File
}

export interface MultiDUTAnalysisResponse {
  analysis_id: string
  results: any[]
  summary: any
}

// Common Types
export interface ApiError {
  detail: string
  status_code: number
}

export interface PaginationParams {
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// PA Trend Types
export interface PATrendStationItemSchema {
  test_item_name: string
  mid: number | null
  mean: number | null
}

export interface PATrendStationDataSchema {
  isn: string | null
  station_id: number
  station_name: string
  device: string | null
  test_date: string | null
  trend_items: PATrendStationItemSchema[]
}

export interface PADiffStationDataSchema {
  isn: string | null
  station_id: number
  station_name: string
  device: string | null
  test_date: string | null
  trend_diff_items: PATrendStationItemSchema[]
}

export interface PATrendRequest {
  dut_isn: string[]
  station_id: string[]
  site_identifier?: string
  model_identifier?: string
  start_time?: string
  end_time?: string
  srom_filter?: 'all' | 'old' | 'new'
}
