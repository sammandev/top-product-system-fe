/**
 * DUT ISN-based Top Product Analysis Types
 *
 * These types support the /api/dut/top-product endpoint which evaluates
 * specific DUT ISN(s) across multiple stations.
 */

import type { ScoreSource } from '../composables/useCustomScoring'

/**
 * Score Breakdown Details (LaTeX Support)
 *
 * Detailed breakdown of how a measurement score was calculated, including LaTeX formula.
 * Supports both standard measurements and PA trend comparisons.
 */
export interface ScoreBreakdown {
  category: string
  method: string
  // Standard measurement fields
  usl?: number | null
  lsl?: number | null
  target_used?: number | null
  actual?: number
  deviation?: number | null
  // PA Trend specific fields
  comparison?: string // e.g., "current vs trend_mean"
  threshold?: number // Threshold for deviation scoring
  current_value?: number // Current PA measurement
  trend_mean?: number // Historical trend average
  deviation_from_mean?: number // Deviation from trend mean
  abs_deviation?: number // Absolute deviation value
  interpretation?: string // Human-readable result interpretation
  // Common fields
  raw_score: number
  final_score: number
  formula_latex: string
}

// Custom scoring result from frontend formulas
export interface CustomScoringResult {
  systemScore: number // From backend
  customScore: number // From frontend formula
  difference: number // customScore - systemScore
  formula: string // Formula name/description used
  method: 'system' | 'custom' | 'both'
  category?: string // Detected category
}

export interface TopProductMeasurement {
  test_item: string
  usl: number | null
  lsl: number | null
  target: string | null
  actual: string
  expected: string | null
  score: number
  breakdown?: ScoreBreakdown | null // Added for score breakdown
  systemScore?: number // Original backend score (for comparison)
  scoreSource?: ScoreSource // Which formula was used: 'category' | 'universal' | 'system'
  custom_scoring?: CustomScoringResult // NEW: Custom formula comparison data
}

export interface LatestDataItem {
  test_item: string
  usl: number | null
  lsl: number | null
  actual: number | null
  score_breakdown: ScoreBreakdown | null
}

export interface TopProductStationResult {
  station_id: number | null
  station_name: string
  dut_id: number | null
  isn: string
  device_id: number | null
  device: string | null // Backend uses 'device' not 'device_name'
  test_date: string
  status: number | null
  order: number | null
  test_duration: number | null
  test_count: number
  pass_count: number
  fail_count: number
  error_item: string | null
  data: Array<Array<string | number | null | ScoreBreakdown>> // Backend uses 'data' not 'measurement' - Added ScoreBreakdown
  latest_data?: LatestDataItem[] // New API format - array of measurement objects
  overall_data_score: number
  metadata?: Record<string, unknown>
  group_scores?: Record<string, unknown> | null
  overall_group_scores?: Record<string, number> | null

  // Computed fields for easier access
  measurement?: TopProductMeasurement[] // Parse from 'data' field
  measurement_count?: number // Count of measurements
  device_name?: string | null // Alias for 'device'
}

export interface TopProductResult {
  dut_isn: string
  site_name: string | null
  model_name: string | null
  criteria_path: string | null
  test_result: TopProductStationResult[]
}

export interface TopProductError {
  dut_isn: string
  detail: string
}

export interface TopProductBatchResponse {
  results: TopProductResult[]
  errors: TopProductError[]
}

/**
 * Per-Station Filter Configuration
 *
 * Allows configuring different filters for each selected station
 */
export interface StationFilterConfig {
  station_identifier: string
  device_identifiers?: string[]
  test_item_filters?: string[]
  exclude_test_item_filters?: string[]
}

export interface TopProductRequest {
  dut_isns: string[]
  stations?: string[]
  site_identifier?: string
  model_identifier?: string
  device_identifiers?: string[]
  test_item_filters?: string[]
  exclude_test_item_filters?: string[]
  station_filters?: Record<string, StationFilterConfig> // UPDATED: Added per-station filters
  criteria_file?: File
}

/**
 * Test Item Types
 *
 * For fetching available test items per station
 */
export interface TestItem {
  id: number
  name: string
  upperlimit: number | null
  lowerlimit: number | null
  status: number | null
}

export interface StationTestItemList {
  station_id: number | null
  station_name: string | null
  site_id: number | null
  site_name: string | null
  model_id: number | null
  model_name: string | null
  data: TestItem[]
}

export interface BatchTestItemsRequest {
  station_identifiers: string[]
  site_identifier?: string
  model_identifier?: string
  status?: string
}

export interface BatchTestItemsResponse {
  stations: StationTestItemList[]
}

/**
 * Device Types
 *
 * For fetching available devices per station
 */
export interface Device {
  id: number | null
  device_name: string | null
  line: string | null
  status: number | null
}

export interface StationDeviceList {
  station_id: number | null
  station_name: string | null
  site_id: number | null
  site_name: string | null
  model_id: number | null
  model_name: string | null
  data: Device[]
}

export interface BatchDevicesRequest {
  station_identifiers: string[]
  site_identifier?: string
  model_identifier?: string
  status?: string
}

export interface BatchDevicesResponse {
  stations: StationDeviceList[]
}

/**
 * DUT Summary Types
 *
 * Used for fetching station information based on DUT ISN
 */
export interface DeviceSummary {
  device_id: number | null
  device_name: string | null
  total_runs: number
  pass_runs: number
  fail_runs: number
}

export interface StationTestSummary {
  station_id: number | null
  station_name: string
  svn_name: string | null
  svn_url: string | null
  dut_id: number | null
  dut_isn: string
  test_runs: number
  devices: DeviceSummary[]
}

export interface DUTTestSummary {
  dut_isn: string
  site_name: string | null
  model_name: string | null
  station_count: number
  stations: StationTestSummary[]
}
