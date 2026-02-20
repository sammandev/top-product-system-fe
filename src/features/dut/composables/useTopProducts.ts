import { computed, ref } from 'vue'
import type { TopProductsRequest } from '@/core/types'
import { getApiErrorDetail } from '@/shared/utils'
import { useDUTStore } from '../store'

/**
 * Top Products Composable
 *
 * Manages top products analysis workflow including:
 * - Form state management
 * - Cascade selection (site → model → station)
 * - Date range validation
 * - Analysis execution
 *
 * @example
 * ```typescript
 * const {
 *   selectedSite,
 *   selectedModel,
 *   selectedStation,
 *   dateRange,
 *   criteriaScore,
 *   executeAnalysis,
 *   results
 * } = useTopProducts()
 *
 * // Set selections
 * selectedSite.value = sites[0].site_id
 * selectedModel.value = models[0].model_id
 * selectedStation.value = stations[0].station_id
 *
 * // Run analysis
 * await executeAnalysis()
 * ```
 */
export function useTopProducts() {
  const dutStore = useDUTStore()

  // Form state
  const selectedSite = ref<number | null>(null)
  const selectedModel = ref<number | null>(null)
  const selectedStation = ref<number | null>(null)
  const dateRange = ref<{ start: string; end: string }>({
    start: '',
    end: '',
  })
  const criteriaScore = ref<number>(80)
  const criteriaFile = ref<File | null>(null)
  const limit = ref<number | undefined>(undefined)

  // Loading states
  const analyzing = ref(false)
  const analysisError = ref<string | null>(null)

  // Computed
  const results = computed(() => dutStore.topProducts)
  const canAnalyze = computed(() => {
    return !!(
      selectedSite.value &&
      selectedModel.value &&
      selectedStation.value &&
      dateRange.value.start &&
      dateRange.value.end &&
      criteriaScore.value
    )
  })

  /**
   * Reset form to initial state
   */
  function resetForm() {
    selectedSite.value = null
    selectedModel.value = null
    selectedStation.value = null
    dateRange.value = { start: '', end: '' }
    criteriaScore.value = 80
    criteriaFile.value = null
    limit.value = undefined
    analysisError.value = null
  }

  /**
   * Reset dependent fields when site changes
   */
  function onSiteChange() {
    selectedModel.value = null
    selectedStation.value = null
  }

  /**
   * Reset station when model changes
   */
  function onModelChange() {
    selectedStation.value = null
  }

  /**
   * Execute top products analysis
   */
  async function executeAnalysis() {
    if (!canAnalyze.value) {
      analysisError.value = 'Please fill in all required fields'
      return
    }

    analyzing.value = true
    analysisError.value = null

    if (!selectedSite.value || !selectedModel.value || !selectedStation.value) {
      analysisError.value = 'Please select site, model, and station'
      return
    }

    try {
      const params: TopProductsRequest = {
        site_id: selectedSite.value,
        model_id: selectedModel.value,
        station_id: selectedStation.value,
        start_time: dateRange.value.start,
        end_time: dateRange.value.end,
        criteria_score: criteriaScore.value,
        limit: limit.value,
        criteria_file: criteriaFile.value || undefined,
      }

      await dutStore.fetchTopProducts(selectedStation.value, params)
      return results.value
    } catch (error: unknown) {
      analysisError.value = getApiErrorDetail(error, 'Analysis failed')
      throw error
    } finally {
      analyzing.value = false
    }
  }

  /**
   * Validate date range (max 7 days as per backend requirements)
   */
  function validateDateRange(): { valid: boolean; message?: string } {
    if (!dateRange.value.start || !dateRange.value.end) {
      return { valid: false, message: 'Please select both start and end dates' }
    }

    const start = new Date(dateRange.value.start)
    const end = new Date(dateRange.value.end)
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays > 7) {
      return { valid: false, message: 'Date range cannot exceed 7 days' }
    }

    if (diffDays < 0) {
      return { valid: false, message: 'End date must be after start date' }
    }

    return { valid: true }
  }

  return {
    // Form state
    selectedSite,
    selectedModel,
    selectedStation,
    dateRange,
    criteriaScore,
    criteriaFile,
    limit,

    // Loading & errors
    analyzing,
    analysisError,

    // Computed
    results,
    canAnalyze,

    // Actions
    executeAnalysis,
    resetForm,
    onSiteChange,
    onModelChange,
    validateDateRange,
  }
}
