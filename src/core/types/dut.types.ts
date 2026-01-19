/**
 * DUT (Device Under Test) Type Definitions
 * All types related to DUT Management API
 */

// UPDATED: Changed field names to match backend API response
// Backend returns: { id, name } not { site_id, site_name }
export interface DUTSite {
  id: number
  name: string
  iplas_url?: string | null
  ftp_url?: string | null
}

export interface DUTModel {
  id: number
  name: string
  site_id: number
}

export interface DUTStation {
  id: number
  name: string
  model_id?: number
}

export interface MeasurementData {
  test_item: string
  usl: number | null
  lsl: number | null
  target: string | null
  actual: string
  expected: string | null
  score: number
  delta_actual_target?: number | null
  unit?: string
  test_time?: string
}

export interface TopProduct {
  isn: string
  device: string
  station_name: string
  test_date: string
  overall_data_score: number
  latest_data: MeasurementData[]
  metadata?: Record<string, any>
}

export interface TopProductsRequest {
  site_id: string | number
  model_id: string | number
  station_id: string | number
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
  total_count?: number
  processing_time?: number
}

export interface DUTAnalysisRequest {
  site_id: number
  model_id: number
  station_id: number
  start_date: string
  end_date: string
  filters?: Record<string, any>
}

export interface DUTAnalysisResponse {
  analysis_id: string
  results: any[]
  summary: {
    total_devices: number
    pass_rate: number
    fail_rate: number
    average_score: number
  }
  charts?: any[]
}

export interface DUTStoreState {
  sites: DUTSite[]
  models: DUTModel[]
  stations: DUTStation[]
  topProducts: TopProduct[]
  loading: boolean
  error: string | null
}

// ============================================
// Hierarchical Analysis Types (Feature 4)
// ============================================

/**
 * Category score object with both Bayesian and average scores
 * Example: { "category_bayes_score": 94.5, "category_avg_score": 92.3 }
 */
export interface CategoryScore {
  category_bayes_score: number
  category_avg_score: number
}

/**
 * Category scores within an antenna group
 * Keys are category names (e.g., "POW", "EVM")
 * Values are CategoryScore objects with bayes and avg scores
 * Example: { "POW": { category_bayes_score: 94.5, category_avg_score: 92.3 }, "tx1_group_score": 93.2, "tx1_avg_score": 91.5 }
 */
export interface CategoryScores {
  [key: string]: CategoryScore | number
}

/**
 * Antenna group scores within a subgroup
 * Contains antenna category scores plus antenna-level aggregate scores
 * Example: { "TX1": {...}, "TX2": {...}, "tx_group_score": 92.5, "tx_avg_score": 91.0 }
 */
export interface AntennaGroup {
  [key: string]: CategoryScores | number
}

/**
 * Subgroup scores within a measurement group
 * Contains antenna groups plus subgroup-level aggregate scores
 * Example: { "TX": {...}, "RX": {...}, "tx_group_score": 93.0, "tx_avg_score": 91.5, "rx_group_score": 94.0, "rx_avg_score": 92.0 }
 */
export interface SubgroupScores {
  [key: string]: AntennaGroup | number
}

/**
 * Complete hierarchical group scores
 * Key = group identifier (e.g., "6185_11AX_MCS11_B160")
 * Value = subgroup scores with final_group_score (Bayesian) and group_avg_score
 * Example: { "6185_11AX_MCS11_B160": { ...subgroups, "final_group_score": 92.5, "group_avg_score": 90.0 } }
 */
export interface GroupScores {
  [groupKey: string]: SubgroupScores & {
    final_group_score?: number  // Bayesian aggregate score for the entire group
    group_avg_score?: number    // Arithmetic mean score for the entire group
  }
}

/**
 * Overall scores aggregated across all groups by subgroup type
 * Example: { "TX": 88.7, "RX": 95.2, "PA": 87.3 }
 */
export interface OverallGroupScores {
  [subgroup: string]: number
}

/**
 * Station result with hierarchical scoring
 */
export interface HierarchicalStationResult {
  station_id: number | null
  station_name: string
  dut_id: number | null
  isn: string
  device_id: number | null
  device: string | null
  test_date: string | null
  status: number | null
  order: number | null
  test_duration: number | null
  test_count: number
  pass_count: number
  fail_count: number
  error_item: string | null
  data: Array<Array<string | number | null>>
  overall_data_score: number
  metadata: Record<string, any>
  
  // Hierarchical additions
  group_scores: GroupScores
  overall_group_scores: OverallGroupScores | null
}

/**
 * DUT result with hierarchical station data
 */
export interface HierarchicalDUTResult {
  dut_isn: string
  site_name: string | null
  model_name: string | null
  criteria_path: string | null
  test_result: HierarchicalStationResult[]
}

/**
 * Error entry for failed DUT evaluation
 */
export interface HierarchicalError {
  dut_isn: string
  detail: string
}

/**
 * Complete hierarchical analysis response
 */
export interface HierarchicalResponse {
  results: HierarchicalDUTResult[]
  errors: HierarchicalError[]
}

/**
 * Request parameters for hierarchical analysis
 */
export interface HierarchicalRequest {
  dut_isns: string[]
  stations?: string[]
  site_identifier?: string
  model_identifier?: string
  device_identifiers?: string[]
  test_item_filters?: string[]
  exclude_test_item_filters?: string[]
  criteria_file?: File | null
}

/**
 * Hierarchical store state
 */
export interface HierarchicalStoreState {
  results: HierarchicalDUTResult[]
  errors: HierarchicalError[]
  loading: boolean
  error: string | null
  selectedDUTs: string[] // Currently selected DUT ISNs for comparison
}

// ============================================
// DUT Identifier Types
// ============================================

/**
 * Single DUT identifier entry
 */
export interface DUTIdentifier {
  dut_id: number | null
  station_id: number | null
  station_name: string | null
  dut_isn: string | null
}

/**
 * List of DUT identifiers linked to an ISN
 */
export interface DUTIdentifierList {
  dut_isn: string
  site_name: string | null
  model_name: string | null
  identifiers: DUTIdentifier[]
}
