/**
 * Composable for test log upload and API interaction
 */

import axios, { type AxiosError } from 'axios'
import { ref } from 'vue'

const API_BASE_URL = '/api/test-log'

export interface TestLogMetadata {
  test_date: string | null
  device: string | null
  station: string | null
  script_version: string | null
  duration_seconds: number | null
  sfis_status: string | null
  result: string | null
  counter: number | null
}

export interface ScoreBreakdown {
  // UPDATED: Universal scoring fields (used by Upload Log tab)
  scoring_type?: string // symmetrical, asymmetrical, per_mask, evm, binary, throughput
  score?: number // 0-10 score
  target?: number | null
  deviation?: number | null
  weight?: number
  policy?: string | null // symmetrical, higher, lower
  ucl?: number | null
  lcl?: number | null
  actual?: number | null
  // Legacy fields (used by Station/ISN Search tabs via old scoring format)
  category?: string
  method?: string
  usl?: number | null
  lsl?: number | null
  target_used?: number
  raw_score?: number
  final_score?: number
  formula_latex?: string
  // PA Trend specific (legacy)
  comparison?: string
  threshold?: number
  current_value?: number
  trend_mean?: number
  deviation_from_mean?: number
  abs_deviation?: number
  interpretation?: string
}

export interface ParsedTestItemEnhanced {
  test_item: string
  usl: number | null
  lsl: number | null
  value: string
  is_value_type: boolean
  numeric_value: number | null
  is_hex: boolean
  hex_decimal: number | null
  matched_criteria: boolean
  target: number | null
  score: number | null
  score_breakdown: ScoreBreakdown | null
  is_calculated?: boolean
}

export interface TestLogParseResponseEnhanced {
  filename: string
  isn: string | null
  station: string
  metadata: TestLogMetadata
  parsed_count: number
  parsed_items_enhanced: ParsedTestItemEnhanced[]
  value_type_count: number
  non_value_type_count: number
  hex_value_count: number
  avg_score: number | null
  median_score: number | null
}

export interface PerIsnData {
  isn: string | null
  value: string
  is_value_type: boolean
  numeric_value: number | null
  is_hex: boolean
  hex_decimal: number | null
  deviation: number | null
  score: number | null
  score_breakdown: ScoreBreakdown | null
  is_calculated?: boolean
}

export interface CompareItemEnhanced {
  test_item: string
  usl: number | null
  lsl: number | null
  baseline: number | null
  per_isn_data: PerIsnData[]
  avg_deviation: number | null
  avg_score: number | null
  median_score: number | null
  matched_criteria: boolean
}

export interface FileSummaryEnhanced {
  filename: string
  isn: string | null
  metadata: TestLogMetadata
  parsed_count: number
  avg_score: number | null
}

export interface CompareResponseEnhanced {
  total_files: number
  total_value_items: number
  total_non_value_items: number
  file_summaries: FileSummaryEnhanced[]
  comparison_value_items: CompareItemEnhanced[]
  comparison_non_value_items: CompareItemEnhanced[]
}

// Rescore types - using same scoring as iPLAS API
export interface RescoreTestItem {
  test_item: string
  value: string
  usl: number | null
  lsl: number | null
  status?: string
}

export interface RescoreScoringConfig {
  test_item_name: string
  scoring_type:
    | 'symmetrical'
    | 'asymmetrical'
    | 'per_mask'
    | 'evm'
    | 'binary'
    | 'symmetrical_nl'
    | 'throughput'
  enabled: boolean
  weight: number
  target?: number
  policy?: 'symmetrical' | 'higher' | 'lower'
  limit_score?: number
  alpha?: number
}

export interface RescoreItemResult {
  test_item: string
  value: number | null
  usl: number | null
  lsl: number | null
  status: string
  scoring_type: string
  policy: string | null
  score: number
  deviation: number | null
  weight: number
  target: number | null
}

export interface RescoreResponse {
  test_item_scores: RescoreItemResult[]
  overall_score: number
  value_items_score: number | null
  total_items: number
  scored_items: number
}

export function useTestLogUpload() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Parse a single test log file or archive
   */
  const parseLog = async (
    logFile: File,
    criteriaFile: File | null = null,
    showOnlyCriteria: boolean = false,
    scoringConfigs: RescoreScoringConfig[] = [],
  ): Promise<TestLogParseResponseEnhanced> => {
    loading.value = true
    error.value = null

    try {
      const formData = new FormData()
      formData.append('file', logFile)

      if (criteriaFile) {
        formData.append('criteria_file', criteriaFile)
      }

      formData.append('show_only_criteria', showOnlyCriteria.toString())

      if (scoringConfigs.length > 0) {
        formData.append('scoring_configs', JSON.stringify(scoringConfigs))
      }

      const response = await axios.post(`${API_BASE_URL}/parse`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      return response.data
    } catch (err) {
      const axiosError = err as AxiosError<{ detail: string }>
      const detail = axiosError.response?.data?.detail || 'Failed to parse log file'
      console.error('Parse log error:', detail, axiosError.response?.data)
      error.value = detail
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  /**
   * Compare multiple test log files or archives
   */
  const compareLogs = async (
    logFiles: File[],
    criteriaFile: File | null = null,
    showOnlyCriteria: boolean = false,
    scoringConfigs: RescoreScoringConfig[] = [],
  ): Promise<CompareResponseEnhanced> => {
    if (logFiles.length < 1) {
      throw new Error('At least 1 file is required for comparison')
    }

    loading.value = true
    error.value = null

    try {
      const formData = new FormData()

      logFiles.forEach((file) => {
        formData.append('files', file)
      })

      if (criteriaFile) {
        formData.append('criteria_file', criteriaFile)
      }

      formData.append('show_only_criteria', showOnlyCriteria.toString())

      if (scoringConfigs.length > 0) {
        formData.append('scoring_configs', JSON.stringify(scoringConfigs))
      }

      const response = await axios.post(`${API_BASE_URL}/compare`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      return response.data
    } catch (err) {
      const axiosError = err as AxiosError<{ detail: string }>
      const detail = axiosError.response?.data?.detail || 'Failed to compare log files'
      console.error('Compare logs error:', detail, axiosError.response?.data)
      error.value = detail
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  /**
   * Rescore test log items using universal scoring system (same as iPLAS API)
   */
  const rescoreItems = async (
    testItems: RescoreTestItem[],
    scoringConfigs: RescoreScoringConfig[] = [],
    includeBinaryInOverall: boolean = true,
  ): Promise<RescoreResponse> => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post(`${API_BASE_URL}/rescore`, {
        test_items: testItems,
        scoring_configs: scoringConfigs,
        include_binary_in_overall: includeBinaryInOverall,
      })

      return response.data
    } catch (err) {
      const axiosError = err as AxiosError<{ detail: string }>
      const detail = axiosError.response?.data?.detail || 'Failed to rescore items'
      console.error('Rescore error:', detail, axiosError.response?.data)
      error.value = detail
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    parseLog,
    compareLogs,
    rescoreItems,
  }
}
