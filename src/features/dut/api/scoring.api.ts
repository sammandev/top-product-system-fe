/**
 * Scoring API Client
 * 
 * API client for the backend scoring endpoints.
 */
import apiClient from '@/core/api/client'
import type {
  ScoringConfig,
  RecordScoreResult,
  ScoreSummary,
  CalculateScoresResponse,
  ScoringType
} from '../types/scoring.types'

// Transform helpers (camelCase to snake_case for backend)
function toSnakeCase(config: ScoringConfig): Record<string, unknown> {
  return {
    test_item_name: config.testItemName,
    scoring_type: config.scoringType,
    enabled: config.enabled,
    weight: config.weight,
    alpha: config.alpha,
    target: config.target,
    target_score: config.targetScore,
    target_deviation: config.targetDeviation,
    min_score: config.minScore,
    max_deviation: config.maxDeviation
  }
}

function fromSnakeCaseRecord(data: Record<string, unknown>): RecordScoreResult {
  return {
    isn: data.isn as string,
    deviceId: data.device_id as string,
    station: data.station as string,
    testStartTime: data.test_start_time as string,
    testStatus: data.test_status as string,
    overallScore: data.overall_score as number,
    valueItemsScore: data.value_items_score as number | null,
    binItemsScore: data.bin_items_score as number | null,
    testItemScores: ((data.test_item_scores as unknown[]) || []).map((ts: unknown) => {
      const item = ts as Record<string, unknown>
      return {
        testItemName: item.test_item_name as string,
        value: item.value as number | null,
        ucl: item.ucl as number | null,
        lcl: item.lcl as number | null,
        status: item.status as string,
        scoringType: item.scoring_type as ScoringType,
        policy: item.policy as 'symmetrical' | 'higher' | 'lower' | null | undefined,
        score: item.score as number,
        deviation: item.deviation as number | undefined,
        weight: (item.weight as number) ?? 1.0,
        target: item.target as number | null | undefined
      }
    }),
    totalItems: data.total_items as number,
    scoredItems: data.scored_items as number,
    failedItems: data.failed_items as number
  }
}

function fromSnakeCaseSummary(data: Record<string, unknown>): ScoreSummary {
  return {
    averageScore: data.average_score as number,
    minScore: data.min_score as number,
    maxScore: data.max_score as number,
    medianScore: data.median_score as number,
    stdDeviation: data.std_deviation as number,
    totalRecords: data.total_records as number,
    passRecords: data.pass_records as number,
    failRecords: data.fail_records as number
  }
}

/**
 * Scoring API methods
 */
export const scoringApi = {
  /**
   * Calculate scores for a batch of test records
   */
  async calculateScores(
    records: unknown[],
    scoringConfigs: ScoringConfig[],
    includeBinaryInOverall = true
  ): Promise<CalculateScoresResponse> {
    const payload = {
      records,
      scoring_configs: scoringConfigs.map(toSnakeCase),
      include_binary_in_overall: includeBinaryInOverall
    }

    const response = await apiClient.post<{
      scored_records: Record<string, unknown>[]
      summary: Record<string, unknown>
    }>('/api/scoring/calculate', payload)

    return {
      scoredRecords: response.data.scored_records.map(fromSnakeCaseRecord),
      summary: fromSnakeCaseSummary(response.data.summary)
    }
  },

  /**
   * Auto-detect scoring types for test items in a record
   */
  async detectScoringTypes(record: unknown): Promise<{
    testItemName: string
    detectedType: ScoringType
    value: string
    ucl: string
    lcl: string
    defaultParams: Record<string, unknown>
  }[]> {
    const response = await apiClient.post<{
      test_item_name: string
      detected_type: string
      value: string
      ucl: string
      lcl: string
      default_params: Record<string, unknown>
    }[]>('/api/scoring/detect-types', record)

    return response.data.map(item => ({
      testItemName: item.test_item_name,
      detectedType: item.detected_type as ScoringType,
      value: item.value,
      ucl: item.ucl,
      lcl: item.lcl,
      defaultParams: item.default_params
    }))
  },

  /**
   * Get all available scoring types with descriptions
   */
  async getScoringTypes(): Promise<{
    type: ScoringType
    label: string
    description: string
    useCase: string
    params: string[]
    defaults: Record<string, unknown>
  }[]> {
    const response = await apiClient.get<{
      type: string
      label: string
      description: string
      use_case: string
      params: string[]
      defaults: Record<string, unknown>
    }[]>('/api/scoring/types')

    return response.data.map(item => ({
      type: item.type as ScoringType,
      label: item.label,
      description: item.description,
      useCase: item.use_case,
      params: item.params,
      defaults: item.defaults
    }))
  },

  /**
   * Preview score calculation for a single value
   */
  async previewScore(
    value: number,
    scoringType: ScoringType,
    ucl?: number,
    lcl?: number,
    config?: Partial<ScoringConfig>
  ): Promise<{
    value: number
    scoringType: ScoringType
    ucl: number | null
    lcl: number | null
    score: number
    deviation: number | null
    scorePercent: string
  }> {
    const params = new URLSearchParams()
    params.append('value', String(value))
    params.append('scoring_type', scoringType)
    if (ucl !== undefined) params.append('ucl', String(ucl))
    if (lcl !== undefined) params.append('lcl', String(lcl))

    const response = await apiClient.post<{
      value: number
      scoring_type: string
      ucl: number | null
      lcl: number | null
      score: number
      deviation: number | null
      score_percent: string
    }>(`/api/scoring/preview?${params.toString()}`, config ? toSnakeCase(config as ScoringConfig) : null)

    return {
      value: response.data.value,
      scoringType: response.data.scoring_type as ScoringType,
      ucl: response.data.ucl,
      lcl: response.data.lcl,
      score: response.data.score,
      deviation: response.data.deviation,
      scorePercent: response.data.score_percent
    }
  }
}

export default scoringApi
