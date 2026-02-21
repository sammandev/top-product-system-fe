import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  HierarchicalDUTResult,
  HierarchicalError,
  HierarchicalRequest,
  HierarchicalResponse,
} from '@/core/types'
import { dutHierarchicalApi } from '../api'

/**
 * DUT Hierarchical Analysis Store
 * Manages state for hierarchical top product analysis
 */
export const useHierarchicalStore = defineStore('hierarchical', () => {
  // State
  const results = ref<HierarchicalDUTResult[]>([])
  const errors = ref<HierarchicalError[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedDUTs = ref<string[]>([]) // For comparison view

  // Actions
  /**
   * Fetch hierarchical analysis for DUT(s)
   */
  async function fetchHierarchicalAnalysis(request: HierarchicalRequest): Promise<void> {
    loading.value = true
    error.value = null
    errors.value = []

    try {
      const response: HierarchicalResponse = await dutHierarchicalApi.analyzeHierarchical(request)

      results.value = response.results
      errors.value = response.errors

      // Set error message if there are any errors
      if (response.errors.length > 0) {
        error.value = `${response.errors.length} DUT(s) failed analysis: ${response.errors
          .map((e) => e.dut_isn)
          .join(', ')}`
      }

      // Auto-select DUTs for comparison (max 5)
      selectedDUTs.value = response.results.slice(0, 5).map((r) => r.dut_isn)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      error.value = `Failed to fetch hierarchical analysis: ${errorMessage}`
      console.error('Hierarchical analysis error:', err)
      results.value = []
      errors.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggle DUT selection for comparison
   */
  function toggleDUTSelection(dutISN: string): void {
    const index = selectedDUTs.value.indexOf(dutISN)
    if (index === -1) {
      // Add to selection (max 5)
      if (selectedDUTs.value.length < 5) {
        selectedDUTs.value.push(dutISN)
      }
    } else {
      // Remove from selection
      selectedDUTs.value.splice(index, 1)
    }
  }

  /**
   * Select all DUTs for comparison (max 5)
   */
  function selectAllDUTs(): void {
    selectedDUTs.value = results.value.slice(0, 5).map((r) => r.dut_isn)
  }

  /**
   * Clear DUT selection
   */
  function clearDUTSelection(): void {
    selectedDUTs.value = []
  }

  /**
   * Clear all data
   */
  function clearData(): void {
    results.value = []
    errors.value = []
    error.value = null
    selectedDUTs.value = []
  }

  /**
   * Get result for specific DUT ISN
   */
  function getResultByISN(isn: string): HierarchicalDUTResult | undefined {
    return results.value.find((r) => r.dut_isn === isn)
  }

  /**
   * Get selected DUT results
   */
  function getSelectedResults(): HierarchicalDUTResult[] {
    return results.value.filter((r) => selectedDUTs.value.includes(r.dut_isn))
  }

  return {
    // State
    results,
    errors,
    loading,
    error,
    selectedDUTs,

    // Actions
    fetchHierarchicalAnalysis,
    toggleDUTSelection,
    selectAllDUTs,
    clearDUTSelection,
    clearData,
    getResultByISN,
    getSelectedResults,
  }
})
