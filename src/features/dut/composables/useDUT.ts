import { computed } from 'vue'
import type { TopProductsRequest } from '@/core/types'
import { useDUTStore } from '../stores'

/**
 * DUT Composable
 *
 * Provides a convenient interface for DUT operations.
 * Wraps the DUT store with additional business logic.
 *
 * @example
 * ```typescript
 * const { sites, models, stations, fetchSites, loading } = useDUT()
 *
 * // Load sites
 * await fetchSites()
 *
 * // Load models for a site
 * await fetchModels(sites.value[0].id)
 * ```
 */
export function useDUT() {
  const dutStore = useDUTStore()

  // Computed properties
  const sites = computed(() => dutStore.sites)
  const models = computed(() => dutStore.models)
  const stations = computed(() => dutStore.stations)
  const topProducts = computed(() => dutStore.topProducts)
  const loading = computed(() => dutStore.loading)
  const error = computed(() => dutStore.error)

  /**
   * Fetch all available sites
   */
  async function fetchSites() {
    return dutStore.fetchSites()
  }

  /**
   * Fetch models for a specific site
   * @param siteId - Site ID or name
   */
  async function fetchModels(siteId: string | number) {
    return dutStore.fetchModels(siteId)
  }

  /**
   * Fetch stations for a specific model
   * @param modelId - Model ID or name
   */
  async function fetchStations(modelId: string | number) {
    return dutStore.fetchStations(modelId)
  }

  /**
   * Fetch top products for a station
   * @param stationId - Station ID
   * @param params - Analysis parameters
   */
  async function fetchTopProducts(stationId: string | number, params: TopProductsRequest) {
    return dutStore.fetchTopProducts(stationId, params)
  }

  /**
   * Clear all cached DUT data
   */
  function clearData() {
    dutStore.clearData()
  }

  /**
   * Get site by ID or name
   */
  function getSiteById(id: string | number) {
    return sites.value.find((s) => s.id === id || s.name === id)
  }

  /**
   * Get model by ID or name
   */
  function getModelById(id: string | number) {
    return models.value.find((m) => m.id === id || m.name === id)
  }

  /**
   * Get station by ID or name
   */
  function getStationById(id: string | number) {
    return stations.value.find((s) => s.id === id || s.name === id)
  }

  return {
    // State
    sites,
    models,
    stations,
    topProducts,
    loading,
    error,

    // Actions
    fetchSites,
    fetchModels,
    fetchStations,
    fetchTopProducts,
    clearData,

    // Utilities
    getSiteById,
    getModelById,
    getStationById,
  }
}
