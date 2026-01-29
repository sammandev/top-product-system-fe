/**
 * useScoring Composable
 * 
 * Provides reactive state and methods for the iPLAS scoring system.
 */
import { ref, shallowRef, computed } from 'vue'
import { scoringApi } from '../api/scoring.api'
import {
  type ScoringConfig,
  type ScoringType,
  type RecordScoreResult,
  type ScoreSummary,
  SCORING_TYPE_INFO,
  createDefaultScoringConfig,
  getScoreColor,
  formatScore
} from '../types/scoring.types'

// Module-level state (shared across components)
const scoringConfigs = ref<Map<string, ScoringConfig>>(new Map())
// Large array uses shallowRef - Vue only tracks array replacement, not nested changes
const scoredRecords = shallowRef<RecordScoreResult[]>([])
const summary = ref<ScoreSummary | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

/**
 * Composable for scoring operations
 */
export function useScoring() {
  // Computed properties
  const configList = computed(() => Array.from(scoringConfigs.value.values()))
  
  const hasConfigs = computed(() => scoringConfigs.value.size > 0)
  
  const hasScores = computed(() => scoredRecords.value.length > 0)
  
  const enabledConfigs = computed(() => 
    configList.value.filter(c => c.enabled)
  )

  /**
   * Auto-detect scoring type based on test item characteristics
   */
  function detectScoringType(testItem: {
    VALUE?: string
    UCL?: string
    LCL?: string
    STATUS?: string
  }): ScoringType {
    const value = testItem.VALUE?.toUpperCase() || ''
    const ucl = parseFloat(testItem.UCL || '')
    const lcl = parseFloat(testItem.LCL || '')
    const numValue = parseFloat(testItem.VALUE || '')
    
    // Check if binary (PASS/FAIL)
    if (value === 'PASS' || value === 'FAIL' || value === '-999') {
      return 'binary'
    }
    
    // Check if non-numeric
    if (isNaN(numValue)) {
      return 'binary'
    }
    
    // Only UCL defined (no LCL)
    if (!isNaN(ucl) && isNaN(lcl)) {
      // Negative values suggest EVM-like
      if (numValue < 0) return 'evm'
      // Values near 0 suggest PER/MASK
      if (Math.abs(numValue) < ucl * 0.5) return 'per_mask'
      return 'evm'
    }
    
    // Only LCL defined (throughput-like)
    if (isNaN(ucl) && !isNaN(lcl)) {
      return 'throughput'
    }
    
    // Both limits defined - default to symmetrical
    if (!isNaN(ucl) && !isNaN(lcl)) {
      return 'symmetrical'
    }
    
    // No limits - treat as binary
    return 'binary'
  }

  /**
   * Initialize scoring configs from test items
   * Uses auto-detection for scoring type, defaults to symmetrical for value items
   */
  function initializeConfigs(testItems: { NAME: string; VALUE?: string; UCL?: string; LCL?: string; STATUS?: string }[]): void {
    const seen = new Set<string>()
    
    for (const item of testItems) {
      const name = item.NAME
      if (!name || seen.has(name)) continue
      seen.add(name)
      
      const scoringType = detectScoringType(item)
      const config = createDefaultScoringConfig(name, scoringType)
      
      scoringConfigs.value.set(name, config)
    }
  }

  /**
   * Get config for a test item
   */
  function getConfig(testItemName: string): ScoringConfig | undefined {
    return scoringConfigs.value.get(testItemName)
  }

  /**
   * Update scoring config for a test item
   */
  function updateConfig(testItemName: string, updates: Partial<ScoringConfig>): void {
    const existing = scoringConfigs.value.get(testItemName)
    if (existing) {
      scoringConfigs.value.set(testItemName, { ...existing, ...updates })
    }
  }

  /**
   * Set scoring type for a test item (resets parameters to defaults)
   */
  function setScoringType(testItemName: string, scoringType: ScoringType): void {
    const newConfig = createDefaultScoringConfig(testItemName, scoringType)
    const existing = scoringConfigs.value.get(testItemName)
    if (existing) {
      newConfig.enabled = existing.enabled
      newConfig.weight = existing.weight
    }
    scoringConfigs.value.set(testItemName, newConfig)
  }

  /**
   * Set all configs to a specific scoring type
   */
  function setAllScoringType(scoringType: ScoringType): void {
    for (const [name] of scoringConfigs.value) {
      setScoringType(name, scoringType)
    }
  }

  /**
   * Enable/disable all configs
   */
  function setAllEnabled(enabled: boolean): void {
    for (const [name, config] of scoringConfigs.value) {
      scoringConfigs.value.set(name, { ...config, enabled })
    }
  }

  /**
   * Enable/disable configs by scoring type
   */
  function setEnabledByType(scoringType: ScoringType, enabled: boolean): void {
    for (const [name, config] of scoringConfigs.value) {
      if (config.scoringType === scoringType) {
        scoringConfigs.value.set(name, { ...config, enabled })
      }
    }
  }

  /**
   * Calculate scores for records using the backend API
   */
  async function calculateScores(
    records: unknown[],
    includeBinaryInOverall = true
  ): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await scoringApi.calculateScores(
        records,
        configList.value,
        includeBinaryInOverall
      )

      scoredRecords.value = result.scoredRecords
      summary.value = result.summary
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to calculate scores'
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Auto-detect and initialize configs from a sample record using backend
   */
  async function detectAndInitialize(sampleRecord: unknown): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const detectedTypes = await scoringApi.detectScoringTypes(sampleRecord)
      
      for (const item of detectedTypes) {
        const config = createDefaultScoringConfig(item.testItemName, item.detectedType)
        
        // Apply default params from backend
        if (item.defaultParams) {
          Object.assign(config, item.defaultParams)
        }
        
        scoringConfigs.value.set(item.testItemName, config)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to detect scoring types'
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get score for a specific record by ISN
   */
  function getRecordScore(isn: string): RecordScoreResult | undefined {
    return scoredRecords.value.find(r => r.isn === isn)
  }

  /**
   * Get sorted records by score (descending)
   */
  function getSortedRecords(ascending = false): RecordScoreResult[] {
    return [...scoredRecords.value].sort((a, b) => 
      ascending ? a.overallScore - b.overallScore : b.overallScore - a.overallScore
    )
  }

  /**
   * Filter records by score threshold
   */
  function filterByScoreThreshold(minScore: number): RecordScoreResult[] {
    return scoredRecords.value.filter(r => r.overallScore >= minScore)
  }

  /**
   * Get statistics by scoring type
   */
  function getStatsByType(scoringType: ScoringType): {
    count: number
    avgScore: number
    configs: ScoringConfig[]
  } {
    const configs = configList.value.filter(c => c.scoringType === scoringType)
    
    // Calculate average score for items of this type
    let totalScore = 0
    let scoreCount = 0
    
    for (const record of scoredRecords.value) {
      for (const itemScore of record.testItemScores) {
        if (itemScore.scoringType === scoringType) {
          totalScore += itemScore.score
          scoreCount++
        }
      }
    }
    
    return {
      count: configs.length,
      avgScore: scoreCount > 0 ? totalScore / scoreCount : 0,
      configs
    }
  }

  /**
   * Clear all scores
   */
  function clearScores(): void {
    scoredRecords.value = []
    summary.value = null
  }

  /**
   * Clear all configs
   */
  function clearConfigs(): void {
    scoringConfigs.value.clear()
  }

  /**
   * Reset to initial state
   */
  function reset(): void {
    clearScores()
    clearConfigs()
    error.value = null
  }

  /**
   * Export configs to JSON
   */
  function exportConfigs(): string {
    return JSON.stringify(configList.value, null, 2)
  }

  /**
   * Import configs from JSON
   */
  function importConfigs(json: string): void {
    try {
      const configs = JSON.parse(json) as ScoringConfig[]
      scoringConfigs.value.clear()
      for (const config of configs) {
        scoringConfigs.value.set(config.testItemName, config)
      }
    } catch {
      throw new Error('Invalid configuration JSON')
    }
  }

  return {
    // State
    scoringConfigs,
    scoredRecords,
    summary,
    loading,
    error,

    // Computed
    configList,
    hasConfigs,
    hasScores,
    enabledConfigs,

    // Methods
    detectScoringType,
    initializeConfigs,
    getConfig,
    updateConfig,
    setScoringType,
    setAllScoringType,
    setAllEnabled,
    setEnabledByType,
    calculateScores,
    detectAndInitialize,
    getRecordScore,
    getSortedRecords,
    filterByScoreThreshold,
    getStatsByType,
    clearScores,
    clearConfigs,
    reset,
    exportConfigs,
    importConfigs,

    // Utilities (re-exported for convenience)
    getScoreColor,
    formatScore,
    SCORING_TYPE_INFO
  }
}

export default useScoring
