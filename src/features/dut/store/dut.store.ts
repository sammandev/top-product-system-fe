import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  DUTModel,
  DUTSite,
  DUTStation,
  TopProductsRequest,
  TopProductsResponse,
} from '@/core/types'
import { getApiErrorDetail } from '@/shared/utils'
import type { PADiffStationDataSchema, PATrendRequest, PATrendStationDataSchema } from '@/types/api'
import { dutApi } from '../api'

/**
 * DUT Management Store
 *
 * Manages DUT (Device Under Test) data including sites, models, stations, and analysis results.
 * Provides centralized state management for DUT-related features.
 */
export const useDUTStore = defineStore('dut', () => {
  // State
  const sites = ref<DUTSite[]>([])
  const models = ref<DUTModel[]>([])
  const stations = ref<DUTStation[]>([])
  const topProducts = ref<TopProductsResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // PA Trend State
  const paTrendAutoData = ref<PATrendStationDataSchema[]>([])
  const paTrendDexData = ref<PATrendStationDataSchema[]>([])
  const paDiffData = ref<PADiffStationDataSchema[]>([])
  const paTrendLoading = ref(false)
  const paTrendError = ref<string | null>(null)

  // Actions

  /**
   * Fetch all available DUT test sites
   */
  async function fetchSites() {
    loading.value = true
    error.value = null

    try {
      sites.value = await dutApi.getSites()
    } catch (err: unknown) {
      error.value = getApiErrorDetail(err, 'Failed to fetch sites')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch models for a specific site
   * @param siteId - Site ID or name
   */
  async function fetchModels(siteId: string | number) {
    loading.value = true
    error.value = null

    try {
      models.value = await dutApi.getModels(siteId)
    } catch (err: unknown) {
      error.value = getApiErrorDetail(err, 'Failed to fetch models')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch test stations for a specific model
   * @param modelId - Model ID or name
   */
  async function fetchStations(modelId: string | number) {
    loading.value = true
    error.value = null

    try {
      stations.value = await dutApi.getStations(modelId)
    } catch (err: unknown) {
      error.value = getApiErrorDetail(err, 'Failed to fetch stations')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch top products analysis for a station
   * @param stationId - Station ID
   * @param params - Query parameters for analysis
   */
  async function fetchTopProducts(stationId: string | number, params: TopProductsRequest) {
    loading.value = true
    error.value = null

    try {
      topProducts.value = await dutApi.getTopProducts(stationId, params)
      return topProducts.value
    } catch (err: unknown) {
      error.value = getApiErrorDetail(err, 'Failed to fetch top products')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch PA Trend Auto analysis
   * @param params - PA trend request parameters
   */
  async function fetchPATrendAuto(params: PATrendRequest) {
    paTrendLoading.value = true
    paTrendError.value = null

    try {
      paTrendAutoData.value = await dutApi.getPATrendAuto(params)
      return paTrendAutoData.value
    } catch (err: unknown) {
      paTrendError.value = getApiErrorDetail(err, 'Failed to fetch PA Trend Auto data')
      throw err
    } finally {
      paTrendLoading.value = false
    }
  }

  /**
   * Fetch PA Trend Dex analysis
   * @param params - PA trend request parameters
   */
  async function fetchPATrendDex(params: PATrendRequest) {
    paTrendLoading.value = true
    paTrendError.value = null

    try {
      paTrendDexData.value = await dutApi.getPATrendDex(params)
      return paTrendDexData.value
    } catch (err: unknown) {
      paTrendError.value = getApiErrorDetail(err, 'Failed to fetch PA Trend Dex data')
      throw err
    } finally {
      paTrendLoading.value = false
    }
  }

  /**
   * Fetch PA Trend Differential analysis
   * @param params - PA trend request parameters
   */
  async function fetchPATrendDiff(params: PATrendRequest) {
    paTrendLoading.value = true
    paTrendError.value = null

    try {
      paDiffData.value = await dutApi.getPATrendDiff(params)
      return paDiffData.value
    } catch (err: unknown) {
      paTrendError.value = getApiErrorDetail(err, 'Failed to fetch PA Trend Diff data')
      throw err
    } finally {
      paTrendLoading.value = false
    }
  }

  /**
   * Clear all cached DUT data
   */
  function clearData() {
    sites.value = []
    models.value = []
    stations.value = []
    topProducts.value = null
    error.value = null
  }

  /**
   * Clear PA Trend cached data
   */
  function clearPATrendData() {
    paTrendAutoData.value = []
    paTrendDexData.value = []
    paDiffData.value = []
    paTrendError.value = null
  }

  return {
    // State
    sites,
    models,
    stations,
    topProducts,
    loading,
    error,

    // PA Trend State
    paTrendAutoData,
    paTrendDexData,
    paDiffData,
    paTrendLoading,
    paTrendError,

    // Actions
    fetchSites,
    fetchModels,
    fetchStations,
    fetchTopProducts,
    clearData,

    // PA Trend Actions
    fetchPATrendAuto,
    fetchPATrendDex,
    fetchPATrendDiff,
    clearPATrendData,
  }
})
