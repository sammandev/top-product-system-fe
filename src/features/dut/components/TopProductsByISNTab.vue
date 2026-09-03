<template>
  <section class="top-products-isn-shell">
    <section class="top-products-isn-workflow">
      <div class="top-products-isn-step" :class="{ 'is-complete': dutISNs.length > 0 }">
        <header class="top-products-isn-step__header">
          <span class="top-products-isn-step__index">1</span>
          <div>
            <p>DUT identifiers</p>
            <span>Add one or more ISNs to resolve site, model, and available stations.</span>
          </div>
        </header>
      <DUTISNInput ref="dutISNInputRef" v-model="dutISNs" v-model:site-identifiers="siteIdentifier"
        v-model:model-identifiers="modelIdentifier" :max-i-s-ns="20" :show-scope-editor="false"
        :show-selected-tokens="false" />

        <div v-if="dutISNs.length > 0" class="top-products-isn-resolved-scope">
          <header class="top-product-isn-scope-header">
            <div class="top-product-isn-scope-header__left">
              <span>{{ loadingStations ? 'Resolving DUT scopes...' : `${dutScopeGroups.length} site / model scope${dutScopeGroups.length === 1 ? '' : 's'}` }}</span>
              <small v-if="!loadingStations">({{ dutISNs.length }} ISN{{ dutISNs.length === 1 ? '' : 's' }} selected)</small>
            </div>
            <div class="top-product-isn-scope-header__right">
              <strong>{{ loadingStations ? '—' : `${availableStations.length} unique stations` }}</strong>
              <button v-if="!loadingStations && dutISNs.length > 0" type="button" class="top-product-isn-scope-clear-btn" @click="clearAllDUTs">
                Clear all
              </button>
            </div>
          </header>
          <article v-for="scope in dutScopeGroups" :key="scope.key" class="top-product-isn-scope-card">
            <div class="top-product-isn-scope-card__header">
              <div class="top-product-isn-scope-title-box">
                <div>
                  <span>Site / Model</span>
                  <strong>{{ scope.site }} / {{ scope.model }}</strong>
                </div>
              </div>
              <div class="top-product-isn-scope-meta">
                <span class="top-product-isn-scope-badge top-product-isn-scope-badge--dut">
                  <span>{{ scope.isns.length }} DUT{{ scope.isns.length === 1 ? '' : 's' }}</span>
                </span>
                <span class="top-product-isn-scope-badge top-product-isn-scope-badge--station">
                  <span>{{ scope.stations.length }} station{{ scope.stations.length === 1 ? '' : 's' }}</span>
                </span>
              </div>
            </div>
            <div class="top-product-isn-scope-token-row">
              <button
                v-for="isn in scope.isns"
                :key="isn"
                type="button"
                class="top-product-isn-scope-token"
                :title="`Remove ${isn}`"
                @click="removeScopeISN(isn)"
              >
                <span>{{ isn }}</span>
                <Icon icon="mdi:close" aria-hidden="true" />
              </button>
            </div>
          </article>
        </div>
      </div>

      <div class="top-products-isn-step"
        :class="{ 'is-locked': dutISNs.length === 0, 'is-complete': selectedStations.length > 0 }">
        <header class="top-products-isn-step__header">
          <span class="top-products-isn-step__index">2</span>
          <div>
            <p>Station scope</p>
            <span>{{ dutISNs.length > 0 ? 'Required. Select at least one station.' : 'Add DUT identifiers first.' }}</span>
          </div>
        </header>

        <p v-if="loadingStations" class="top-products-isn-inline-note">Loading stations from DUT summaries...</p>
        <AppMultiSelect v-else v-model="selectedStations" :options="stationSelectOptions"
          :option-groups="stationOptionGroups"
          placeholder="Select required station(s)" :disabled="dutISNs.length === 0 || availableStations.length === 0" />
        <div v-if="dutISNs.length > 0 && !loadingStations && availableStations.length === 0"
          class="top-products-isn-notice top-products-isn-notice--warning">
          No stations resolved for selected DUT identifiers.
        </div>
      </div>

      <details
        ref="analysisOptionsRef"
        class="top-products-isn-accordion top-products-isn-options"
        :class="{ 'is-locked': selectedStations.length === 0 }"
      >
        <summary
          class="top-products-isn-options__summary"
          :class="{ 'is-disabled': selectedStations.length === 0 }"
          @click="handleOptionsSummaryClick"
        >
          <span class="top-products-isn-step__index">3</span>
          <div>
            <p>Analysis options</p>
            <span>{{ selectedStations.length > 0 ? 'Optional criteria and station-specific filters.' : 'Select station scope first.' }}</span>
          </div>
          <Icon class="top-products-isn-disclosure-icon" icon="mdi:chevron-down" />
        </summary>
        <div class="top-products-isn-accordion__body top-products-isn-accordion__body--stacked">
          <section class="top-products-isn-option-group">
            <div class="top-products-isn-option-group__header">
              <div class="top-products-isn-option-group__title">
                <span class="top-products-isn-option-group__index">01</span>
                <div>
                <strong>Criteria file</strong>
                <span>{{ criteriaFileActual ? criteriaFileActual.name : 'Default rules' }}</span>
                </div>
              </div>
              <button type="button" class="top-products-isn-link" @click="downloadCriteriaTemplate">
                Download template
              </button>
            </div>
            <AppFilePicker v-model="criteriaFile" label="Criteria JSON File" accept=".json,application/json"
              helperText="Leave empty to use the default rules."
              placeholder="Drop a criteria file here or browse from disk." />
          </section>

          <section v-if="selectedStations.length > 0" class="top-products-isn-option-group">
            <div class="top-products-isn-option-group__header">
              <div class="top-products-isn-option-group__title">
                <span class="top-products-isn-option-group__index">02</span>
                <div>
                <strong>Per-station filters</strong>
                <span>Choose devices and test items for each station. Empty fields include all data.</span>
                </div>
              </div>
              <span class="top-products-isn-option-count">{{ selectedStations.length }} station{{ selectedStations.length === 1 ? '' : 's' }}</span>
            </div>

            <div v-if="loadingTestItems || loadingDevices" class="top-products-isn-loading-bar" />

            <div class="top-products-isn-station-config-list">
              <details v-for="station in selectedStations" :key="station"
                class="top-products-isn-station-config-card">
                <summary>
                  <div>
                    <strong>{{ station }}</strong>
                    <span>{{ getStationFilterSummary(station) }}</span>
                  </div>
                  <Icon class="top-products-isn-disclosure-icon" icon="mdi:chevron-down" />
                </summary>
                <StationFilterConfig :station-identifier="station" :station-name="station"
                  :available-test-items="stationTestItems[station] || []"
                  :available-devices="stationDevices[station] || []"
                  :loading="loadingTestItems || loadingDevices" v-model="stationFilterConfigs[station]" />
              </details>
            </div>
          </section>
        </div>
      </details>

      <footer class="top-products-isn-runbar">
        <div class="top-products-isn-stat-row">
          <span>{{ dutISNs.length }} DUT{{ dutISNs.length === 1 ? '' : 's' }}</span>
          <span>{{ selectedStations.length }} station{{ selectedStations.length === 1 ? '' : 's' }}</span>
          <span>{{ criteriaFileActual ? 'Custom criteria' : 'Default criteria' }}</span>
        </div>
        <button type="button" class="top-products-isn-primary-button" :disabled="loading || !canAnalyze"
          @click="handleAnalyze">
          {{ loading ? 'Analyzing...' : 'Analyze DUTs' }}
        </button>
      </footer>

      <div v-if="attemptedAnalysis && !canAnalyze" class="top-products-isn-notice top-products-isn-notice--warning">
        Add at least one DUT ISN and select at least one station.
      </div>
    </section>

    <div v-if="error" class="top-products-isn-notice top-products-isn-notice--error">
      <div>
        <strong>Analysis Failed</strong>
        <p>{{ error }}</p>
      </div>
      <button type="button" class="top-products-isn-link" @click="clearError">Dismiss</button>
    </div>

    <section v-if="hasResults" ref="resultsSection" class="top-products-isn-results">
      <TopProductISNResults :results="processedResults!.results" :errors="processedResults!.errors"
        :custom-scoring-enabled="formulaSelectionEnabled" :universal-formula="universalFormula"
        :category-formulas="categoryFormulas" @export="handleExport" />
    </section>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, nextTick, provide, ref, watch } from 'vue'
import {
  buildTopProductWorkbook,
  downloadTopProductWorkbook,
  type TopProductExcelRecord,
} from '@/features/dut-logs/utils/topProductExcelExport'
import AppFilePicker from '@/shared/ui/forms/AppFilePicker.vue'
import AppMultiSelect from '@/shared/ui/forms/AppMultiSelect.vue'
import { getApiErrorDetail, getErrorMessage } from '@/shared/utils'
import { formatDate } from '@/shared/utils/helpers'
import { dutApi } from '../api/dut.api'
import { dutTopProductApi } from '../api/dutTopProduct.api'
import { useFormulaSelector } from '../composables/useFormulaSelector'
import type {
  DUTTestSummary,
  ScoreBreakdown,
  StationDeviceList,
  StationFilterConfig as StationFilterConfigType,
  StationTestItemList,
  TestItem,
  TopProductBatchResponse,
  TopProductMeasurement,
  TopProductResult,
  TopProductStationResult,
} from '../types/dutTopProduct.types'
import { downloadCriteriaJsonTemplate } from '../utils/criteriaTemplate'
// biome-ignore lint/style/useImportType: value import required for template component resolution
import DUTISNInput from './DUTISNInput.vue'
import StationFilterConfig from './StationFilterConfig.vue'
import TopProductISNResults from './TopProductISNResults.vue'

interface LatestStationItemsResponse {
  station_name?: string
  station_id?: string | number
  error?: unknown
  value_test_items?: Array<{
    name: string
    usl: number | null
    lsl: number | null
    status?: unknown
  }>
}

// Formula Selector (New approach)
const {
  universalFormula,
  categoryFormulas,
  formulaSelectionEnabled,
  applyFormulaSelectionToResults,
} = useFormulaSelector()

// Apply formula selection to results when enabled
const processedResults = computed(() => {
  if (!results.value || !formulaSelectionEnabled.value) {
    return results.value
  }

  // Apply selected formulas to results
  const enhanced = applyFormulaSelectionToResults(results.value.results)

  return {
    ...results.value,
    results: enhanced,
  }
})

// State
const dutISNInputRef = ref<InstanceType<typeof DUTISNInput> | null>(null)
const analysisOptionsRef = ref<HTMLDetailsElement | null>(null)
const resultsSection = ref<HTMLElement | null>(null)
const dutISNs = ref<string[]>([])
const selectedStations = ref<string[]>([])
const criteriaFile = ref<File[] | File | null>(null)
const siteIdentifier = ref<string[]>([])
const modelIdentifier = ref<string[]>([])
const dutScopes = ref<Array<{ isn: string; site: string; model: string; stations: string[] }>>([])

function handleOptionsSummaryClick(event: MouseEvent) {
  if (selectedStations.value.length === 0) {
    event.preventDefault()
  }
}

function removeScopeISN(isn: string) {
  dutISNs.value = dutISNs.value.filter((item) => item !== isn)
}

function clearAllDUTs() {
  dutISNs.value = []
}

const stationSelectOptions = computed(() =>
  availableStations.value.map((station) => ({ label: station, value: station })),
)

const dutScopeGroups = computed(() => {
  const groups = new Map<
    string,
    { key: string; site: string; model: string; isns: string[]; stations: string[] }
  >()

  dutScopes.value.forEach((scope) => {
    const key = `${scope.site}\u0000${scope.model}`
    const group = groups.get(key) || {
      key,
      site: scope.site,
      model: scope.model,
      isns: [],
      stations: [],
    }
    group.isns.push(scope.isn)
    group.stations = [...new Set([...group.stations, ...scope.stations])]
    groups.set(key, group)
  })

  return [...groups.values()]
})

const stationOptionGroups = computed(() =>
  dutScopeGroups.value.map((scope) => ({
    label: `${scope.site} - ${scope.model}`,
    items: scope.stations.map((station) => ({ label: station, value: station })),
  })),
)

function getStationFilterSummary(station: string): string {
  const config = stationFilterConfigs.value[station]
  if (!config) return 'All devices and test items'
  const devices = config.device_identifiers?.length ?? 0
  const include = config.test_item_filters?.length ?? 0
  const exclude = config.exclude_test_item_filters?.length ?? 0
  if (devices + include + exclude === 0) return 'All devices and test items'
  return `${devices} devices, ${include} include, ${exclude} exclude`
}

const loading = ref(false)
const loadingStations = ref(false)
const loadingTestItems = ref(false)
const loadingDevices = ref(false)
const attemptedAnalysis = ref(false)
const error = ref<string | null>(null)
const results = ref<TopProductBatchResponse | null>(null)

// Provide results to child components (e.g., CustomScoringDialogV2)
provide('topProductResults', results)

// Available stations (dynamically loaded based on DUT ISN)
const availableStations = ref<string[]>([])

// Per-station filter configurations
const stationFilterConfigs = ref<Record<string, StationFilterConfigType>>({})

// Available test items per station
const stationTestItems = ref<Record<string, TestItem[]>>({})

// Available devices per station
const stationDevices = ref<Record<string, string[]>>({})
let stationScopeRequestId = 0

// Computed: Extract actual File from criteriaFile (handles both File and File[] formats)
const criteriaFileActual = computed<File | undefined>(() => {
  if (!criteriaFile.value) return undefined
  if (Array.isArray(criteriaFile.value)) {
    return criteriaFile.value.length > 0 ? criteriaFile.value[0] : undefined
  }
  return criteriaFile.value
})

// Computed: Convert site and model arrays to single values for API calls
// If multiple values exist, use the first one
const siteIdentifierValue = computed(() => {
  return siteIdentifier.value.length === 1 ? siteIdentifier.value[0] : undefined
})

const modelIdentifierValue = computed(() => {
  return modelIdentifier.value.length === 1 ? modelIdentifier.value[0] : undefined
})

// Helper function to fetch all test items for stations
async function fetchAllTestItems(stationIds: string[], targetMap: Record<string, TestItem[]>) {
  const testItemsResponse = await dutTopProductApi.getTestItemsBatchFiltered({
    station_identifiers: stationIds,
    site_identifier: siteIdentifierValue.value,
    model_identifier: modelIdentifierValue.value,
    status: 'Active', // Only show active test items
  })

  testItemsResponse.stations.forEach((station: StationTestItemList) => {
    const key = station.station_name || String(station.station_id)
    targetMap[key] = station.data
  })
}

// Watch dutISNs and fetch stations when ISN is entered
watch(
  dutISNs,
  async (newISNs) => {
    const requestId = ++stationScopeRequestId
    if (newISNs.length === 0) {
      availableStations.value = []
      selectedStations.value = []
      stationTestItems.value = {}
      stationDevices.value = {}
      stationFilterConfigs.value = {}
      dutScopes.value = []
      // Clear site and model identifiers when all ISNs are removed
      siteIdentifier.value = []
      modelIdentifier.value = []
      return
    }

    // Fetch stations for all ISNs and update sites/models
    loadingStations.value = true
    try {
      // Fetch summaries for all ISNs to extract sites and models
      const summaries = await Promise.all(
        newISNs.map((isn) =>
          dutApi.getDUTSummary(isn).catch((err) => {
            console.warn(`Could not fetch summary for ISN ${isn}:`, err)
            return null
          }),
        ),
      )
      if (requestId !== stationScopeRequestId) return

      // Extract unique station names, sites, and models
      const allStationNames: string[] = []
      const allSites: string[] = []
      const allModels: string[] = []

      dutScopes.value = []
      summaries.forEach((summary, index) => {
        if (!summary) return
        const s = summary as DUTTestSummary

        // Collect station names
        s.stations.forEach((station) => {
          allStationNames.push(station.station_name)
        })

        // Collect site and model names
        if (s.site_name) allSites.push(s.site_name)
        if (s.model_name) allModels.push(s.model_name)
        dutScopes.value.push({
          isn: newISNs[index] || s.dut_isn,
          site: s.site_name || 'Unknown site',
          model: s.model_name || 'Unknown model',
          stations: [...new Set(s.stations.map((station) => station.station_name))],
        })
      })

      // Set unique values
      availableStations.value = [...new Set(allStationNames)]
      selectedStations.value = selectedStations.value.filter((station) =>
        availableStations.value.includes(station),
      )

      // Update sites and models in DUTISNInput component
      const uniqueSites = [...new Set(allSites)]
      const uniqueModels = [...new Set(allModels)]

      if (dutISNInputRef.value) {
        dutISNInputRef.value.updateAvailableSites(uniqueSites)
        dutISNInputRef.value.updateAvailableModels(uniqueModels)
      }

      siteIdentifier.value = uniqueSites
      modelIdentifier.value = uniqueModels
    } catch (err) {
      if (requestId !== stationScopeRequestId) return
      console.warn('Could not fetch stations for DUT ISNs:', err)
      availableStations.value = []
      dutScopes.value = []
    } finally {
      if (requestId === stationScopeRequestId) loadingStations.value = false
    }
  },
  { immediate: false },
)

// Watch selectedStations and fetch test items and devices
watch(
  selectedStations,
  async (newStations) => {
    if (newStations.length === 0) {
      if (analysisOptionsRef.value) {
        analysisOptionsRef.value.open = false
      }
      stationTestItems.value = {}
      stationDevices.value = {}
      stationFilterConfigs.value = {}
      return
    }

    // Fetch test items and devices for all selected stations
    loadingTestItems.value = true
    loadingDevices.value = true

    try {
      const shouldUseLatestTestItems = dutISNs.value.length > 0
      let testItemsMap: Record<string, TestItem[]> = {}

      if (shouldUseLatestTestItems) {
        // Fetch latest test items for the DUT ISN (more relevant for Per-Station Filter)
        try {
          const latestItemsResponses = (await Promise.all(
            dutISNs.value.map((dutISN) => dutApi.getLatestTestItemsBatch(dutISN, newStations)),
          )) as Array<{ stations: LatestStationItemsResponse[] }>

          // Convert test item definitions to TestItem objects for compatibility
          latestItemsResponses
            .flatMap((response) => response.stations)
            .forEach((station) => {
              const key = station.station_name || String(station.station_id)
              if (station.error) {
                // Station not applicable or nonvalue items unavailable; ignore without spamming console
                return
              }
              // Only include value test items (exclude nonvalue_bin and nonvalue for filter dropdown)
              const valueTestItems: TestItem[] = []

              // Add value test items only
              if (station.value_test_items && station.value_test_items.length > 0) {
                station.value_test_items.forEach((item) => {
                  valueTestItems.push({
                    id: 0,
                    name: item.name,
                    upperlimit: item.usl,
                    lowerlimit: item.lsl,
                    status: item.status ? 1 : null,
                  })
                })
              }

              if (valueTestItems.length > 0) {
                const mergedItems = [...(testItemsMap[key] || []), ...valueTestItems]
                testItemsMap[key] = [
                  ...new Map(mergedItems.map((item) => [item.name, item])).values(),
                ]
              }
            })
        } catch (err) {
          console.warn('Could not fetch latest test items, falling back to all test items:', err)
          // Fall back to fetching all test items
          await fetchAllTestItems(newStations, testItemsMap)
        }
      } else {
        // No DUT ISN provided, fetch all test items for the stations
        await fetchAllTestItems(newStations, testItemsMap)
      }

      stationTestItems.value = testItemsMap

      // Fetch devices in parallel
      const devicesResponse = await dutTopProductApi.getDevicesBatch({
        station_identifiers: newStations,
        site_identifier: siteIdentifierValue.value,
        model_identifier: modelIdentifierValue.value,
        status: 'ALL', // Show all devices (will be filtered client-side for Lab/Golden/Test)
      })

      // Map devices by station name (or ID if name is unavailable)
      const devicesMap: Record<string, string[]> = {}
      devicesResponse.stations.forEach((station: StationDeviceList) => {
        const key = station.station_name || String(station.station_id)
        // Extract device names and filter out Lab/Golden/Test devices
        devicesMap[key] = station.data
          .map((device) => device.device_name || (device.id ? String(device.id) : null))
          .filter((name): name is string => {
            if (name === null) return false
            // Exclude devices with Lab, Golden, or Test in their names (case-insensitive)
            const lowerName = name.toLowerCase()
            return (
              !lowerName.includes('lab') &&
              !lowerName.includes('golden') &&
              !lowerName.includes('test')
            )
          })
      })
      stationDevices.value = devicesMap

      // Initialize filter configs for new stations (preserve existing configs)
      newStations.forEach((stationId) => {
        if (!stationFilterConfigs.value[stationId]) {
          stationFilterConfigs.value[stationId] = {
            station_identifier: stationId,
          }
        }
      })

      // Remove configs for deselected stations
      Object.keys(stationFilterConfigs.value).forEach((stationId) => {
        if (!newStations.includes(stationId)) {
          delete stationFilterConfigs.value[stationId]
        }
      })
    } catch (err) {
      console.error('Failed to fetch test items or devices:', err)
      // Keep existing data on error
    } finally {
      loadingTestItems.value = false
      loadingDevices.value = false
    }
  },
  { immediate: false },
)

// Computed
const canAnalyze = computed(() => dutISNs.value.length > 0 && selectedStations.value.length > 0)
const hasResults = computed(() => results.value !== null)

// Methods
async function handleAnalyze() {
  attemptedAnalysis.value = true

  if (!canAnalyze.value) return

  loading.value = true
  error.value = null

  try {
    // Build station filters map (only include stations with actual filters configured)
    const stationFilters: Record<string, StationFilterConfigType> = {}
    Object.entries(stationFilterConfigs.value).forEach(([station, config]) => {
      // Guard against undefined config
      if (!config) return

      if (
        config.device_identifiers?.length ||
        config.test_item_filters?.length ||
        config.exclude_test_item_filters?.length
      ) {
        stationFilters[station] = config
      }
    })

    const response = await dutTopProductApi.analyzeByISN({
      dut_isns: dutISNs.value,
      stations: selectedStations.value.length > 0 ? selectedStations.value : undefined,
      site_identifier: siteIdentifierValue.value,
      model_identifier: modelIdentifierValue.value,
      station_filters: Object.keys(stationFilters).length > 0 ? stationFilters : undefined,
      criteria_file: criteriaFileActual.value,
    })

    results.value = response

    // Auto-scroll to results after successful analysis
    await scrollToResults()
  } catch (err: unknown) {
    console.error('Analysis failed:', err)
    error.value =
      getApiErrorDetail(err) || getErrorMessage(err) || 'Failed to analyze DUT performance'
  } finally {
    loading.value = false
  }
}

async function handleAnalyzeWithPATrends() {
  attemptedAnalysis.value = true

  if (!canAnalyze.value) return

  loading.value = true
  error.value = null

  try {
    // Build station filters map (only include stations with actual filters configured)
    const stationFilters: Record<string, StationFilterConfigType> = {}
    Object.entries(stationFilterConfigs.value).forEach(([station, config]) => {
      // Guard against undefined config
      if (!config) return

      if (
        config.device_identifiers?.length ||
        config.test_item_filters?.length ||
        config.exclude_test_item_filters?.length
      ) {
        stationFilters[station] = config
      }
    })

    const response = await dutTopProductApi.analyzeWithPATrends({
      dut_isns: dutISNs.value,
      stations: selectedStations.value.length > 0 ? selectedStations.value : undefined,
      site_identifier: siteIdentifierValue.value,
      model_identifier: modelIdentifierValue.value,
      station_filters: Object.keys(stationFilters).length > 0 ? stationFilters : undefined,
      criteria_file: criteriaFileActual.value,
    })

    results.value = response

    // Auto-scroll to results after successful analysis
    await scrollToResults()
  } catch (err: unknown) {
    console.error('PA trends analysis failed:', err)
    error.value =
      getApiErrorDetail(err) ||
      getErrorMessage(err) ||
      'Failed to analyze DUT performance with PA trends'
  } finally {
    loading.value = false
  }
}

async function handleAnalyzeHierarchical() {
  attemptedAnalysis.value = true

  if (!canAnalyze.value) return

  loading.value = true
  error.value = null

  try {
    // Build station filters map (only include stations with actual filters configured)
    const stationFilters: Record<string, StationFilterConfigType> = {}
    Object.entries(stationFilterConfigs.value).forEach(([station, config]) => {
      if (!config) return

      if (
        config.device_identifiers?.length ||
        config.test_item_filters?.length ||
        config.exclude_test_item_filters?.length
      ) {
        stationFilters[station] = config
      }
    })

    const response = await dutTopProductApi.analyzeHierarchical({
      dut_isns: dutISNs.value,
      stations: selectedStations.value.length > 0 ? selectedStations.value : undefined,
      site_identifier: siteIdentifierValue.value,
      model_identifier: modelIdentifierValue.value,
      station_filters: Object.keys(stationFilters).length > 0 ? stationFilters : undefined,
      criteria_file: criteriaFileActual.value,
    })

    results.value = response

    // Auto-scroll to results after successful analysis
    await scrollToResults()
  } catch (err: unknown) {
    console.error('Hierarchical analysis failed:', err)
    error.value =
      getApiErrorDetail(err) ||
      getErrorMessage(err) ||
      'Failed to analyze DUT performance with hierarchical scoring'
  } finally {
    loading.value = false
  }
}

function clearError() {
  error.value = null
}

// Scroll to results section after analysis completes
async function scrollToResults() {
  await nextTick()
  if (resultsSection.value) {
    // Access the actual DOM element from the Vue component ref
    // biome-ignore lint/suspicious/noExplicitAny: Vue component ref may be a component instance with $el
    const element = (resultsSection.value as any).$el || resultsSection.value
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }
}

function parseMeasurements(data: unknown[]): TopProductMeasurement[] {
  if (!data || data.length === 0) return []

  const measurements: TopProductMeasurement[] = []

  for (let index = 0; index < data.length; index += 1) {
    const item = data[index]
    if (!item) continue

    const isObjectFormat =
      typeof item === 'object' && item !== null && !Array.isArray(item) && 'test_item' in item

    let testItem: string
    let usl: number | null
    let lsl: number | null
    let actual: number
    let target: number | null
    let systemScore: number
    let breakdown: ScoreBreakdown | null

    if (isObjectFormat) {
      const objectItem = item as Record<string, unknown>
      testItem = String(objectItem.test_item || '')
      usl = objectItem.usl !== null && objectItem.usl !== undefined ? Number(objectItem.usl) : null
      lsl = objectItem.lsl !== null && objectItem.lsl !== undefined ? Number(objectItem.lsl) : null
      actual =
        objectItem.actual !== null && objectItem.actual !== undefined
          ? Number(objectItem.actual)
          : 0

      breakdown =
        objectItem.score_breakdown && typeof objectItem.score_breakdown === 'object'
          ? (objectItem.score_breakdown as ScoreBreakdown)
          : null

      systemScore = breakdown?.final_score ?? (breakdown as { score?: number } | null)?.score ?? 0
      target = breakdown?.target_used ?? null
    } else {
      const row = item as Array<string | number | null | ScoreBreakdown>
      if (row.length < 6) continue

      testItem = String(row[0] || '')
      usl = row[1] !== null ? Number(row[1]) : null
      lsl = row[2] !== null ? Number(row[2]) : null
      actual = row[3] !== null && row[3] !== undefined ? Number(row[3]) : 0
      target = row[4] !== null ? Number(row[4]) : null
      systemScore = Number(row[5] || 0)
      breakdown = row[6] && typeof row[6] === 'object' ? (row[6] as ScoreBreakdown) : null
    }

    measurements.push({
      test_item: testItem,
      usl,
      lsl,
      actual: String(actual),
      target: target !== null ? String(target) : null,
      expected: target !== null ? String(target) : null,
      score: systemScore,
      breakdown,
      systemScore,
      scoreSource: 'system',
    })
  }

  return measurements
}

async function handleExport() {
  const currentResults = processedResults.value?.results
  if (!currentResults || currentResults.length === 0) {
    console.warn('No results to export')
    return
  }

  try {
    const records: TopProductExcelRecord[] = []

    currentResults.forEach((result: TopProductResult) => {
      ;(result.test_result || []).forEach((station: TopProductStationResult) => {
        const measurements = parseMeasurements(station.data || [])
        const items = measurements.map((m) => ({
          testItem: m.test_item,
          ucl: m.usl,
          lcl: m.lsl,
          target: m.target !== null ? Number(m.target) : null,
          weight: (m.breakdown as { weight?: number } | null | undefined)?.weight ?? 1,
          value: m.actual,
          deviation: m.breakdown?.deviation ?? null,
          score: m.score,
        }))

        records.push({
          isn: result.dut_isn,
          project: result.model_name || '',
          tsp: station.station_name,
          deviceId: station.device || '',
          errorCode: station.error_item && station.error_item.trim() !== '' ? 'FAIL' : 'PASS',
          errorName: station.error_item || 'N/A',
          type: 'ONLINE',
          testStartTime: station.test_date || '',
          testEndTime: station.test_date || '',
          station: station.station_name,
          overallScore:
            station.error_item && station.error_item.trim() !== ''
              ? null
              : station.overall_data_score,
          items,
        })
      })
    })

    const workbook = await buildTopProductWorkbook(records)
    const filename = `top-products-analysis-${formatDate(new Date(), 'YYYY-MM-DD_HHmmss')}.xlsx`
    await downloadTopProductWorkbook(workbook, filename)
  } catch (err) {
    console.error('Failed to export top product results:', err)
  }
}

function downloadCriteriaTemplate() {
  downloadCriteriaJsonTemplate()
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
}
</script>

<style scoped>
.top-products-isn-shell {
  display: grid;
  gap: 1rem;
}

.top-products-isn-workflow {
  display: grid;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel);
  overflow: hidden;
}

.top-products-isn-step {
  display: grid;
  grid-template-columns: minmax(10rem, 13rem) minmax(0, 1fr);
  gap: 1rem 1.25rem;
  padding: 1.15rem;
  border-bottom: 1px solid var(--app-border);
}

.top-products-isn-step.is-locked {
  background: var(--app-surface);
  opacity: 0.58;
}

.top-products-isn-step__header {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}

.top-products-isn-step__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  flex: 0 0 auto;
  border: 1px solid var(--app-border);
  border-radius: 50%;
  color: var(--app-muted);
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
  text-align: center;
  padding-top: 1px;
}

.top-products-isn-step.is-complete .top-products-isn-step__index {
  border-color: var(--app-success-line);
  background: var(--app-success-soft);
  color: var(--app-success-strong);
}

.top-products-isn-step__header div > p,
.top-products-isn-step__header div > span {
  display: block;
  margin: 0;
}

.top-products-isn-step__header p {
  color: var(--app-ink);
  font-size: 0.9rem;
  font-weight: 700;
}

.top-products-isn-step__header div > span {
  margin-top: 0.2rem;
  color: var(--app-muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

.top-products-isn-step > .dut-isn-input,
.top-products-isn-step > .app-multi-select,
.top-products-isn-step > .top-products-isn-inline-note,
.top-products-isn-step > .top-products-isn-notice,
.top-products-isn-resolved-scope {
  grid-column: 2;
}

.top-products-isn-resolved-scope {
  display: grid;
  border: 1px solid var(--app-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.top-product-isn-scope-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  background: var(--app-surface);
  border-bottom: 1px solid var(--app-border);
}

.top-product-isn-scope-header__left,
.top-product-isn-scope-header__right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.top-product-isn-scope-header__left small {
  color: var(--app-muted);
  font-size: 0.75rem;
}

.top-product-isn-scope-clear-btn {
  background: transparent;
  border: 0;
  color: var(--app-danger, #ef4444);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
}

.top-product-isn-scope-clear-btn:hover {
  background: var(--app-danger-soft, rgba(239, 68, 68, 0.1));
}

.top-product-isn-scope-card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  border-top: 1px solid var(--app-border);
}

.top-product-isn-scope-card:first-of-type {
  border-top: 0;
}

.top-product-isn-scope-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.top-product-isn-scope-title-box {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.top-product-isn-scope-icon {
  font-size: 1.4rem;
  color: var(--app-accent, #0f766e);
  flex-shrink: 0;
}

.top-product-isn-scope-title-box > div {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.top-product-isn-scope-token-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.top-product-isn-scope-token {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  color: var(--app-ink);
  font-size: 0.78rem;
  font-family: var(--app-font-mono, monospace);
  cursor: pointer;
  transition: all 120ms ease;
}

.top-product-isn-scope-token:hover {
  border-color: var(--app-danger-line, #ef4444);
  background: var(--app-danger-soft, rgba(239, 68, 68, 0.1));
  color: var(--app-danger, #ef4444);
}

.top-product-isn-scope-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.top-product-isn-scope-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--app-border);
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1;
}

.top-product-isn-scope-badge--dut {
  background: var(--app-accent-soft, rgba(15, 118, 110, 0.08));
  border-color: color-mix(in srgb, var(--app-accent) 20%, var(--app-border));
  color: var(--app-accent, #0f766e);
}

.top-product-isn-scope-badge--station {
  background: var(--app-info-soft, rgba(14, 165, 233, 0.08));
  border-color: var(--app-info-line, rgba(14, 165, 233, 0.25));
  color: var(--app-info, #0284c7);
}

.top-products-isn-resolved-scope span {
  color: var(--app-muted);
  font-size: 0.72rem;
}

.top-products-isn-resolved-scope strong {
  color: var(--app-ink);
  overflow-wrap: anywhere;
}

.top-products-isn-intake {
  display: grid;
  gap: 0.85rem;
}

.top-products-isn-runbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.15rem;
  background: var(--app-surface);
}

.top-products-isn-section {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--app-border);
  border-radius: 0.95rem;
  background: var(--app-panel);
}

.top-products-isn-section__header {
  display: grid;
  gap: 0.35rem;
}

.top-products-isn-section__header--split {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.top-products-isn-section__eyebrow {
  margin: 0;
  color: var(--app-accent);
  font-size: 0.78rem;
  font-weight: 700;
}

.top-products-isn-section__header h2 {
  margin: 0;
  color: var(--app-ink);
  font-size: 1.12rem;
}

.top-products-isn-section__description {
  margin: 0.25rem 0 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.top-products-isn-grid,
.top-products-isn-filter-grid,
.top-products-isn-station-config-grid {
  display: grid;
  gap: 1rem;
}

.top-products-isn-grid {
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

.top-products-isn-filter-grid {
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
}

.top-products-isn-field {
  display: grid;
  gap: 0.45rem;
}

.top-products-isn-field--full {
  grid-column: 1 / -1;
}

.top-products-isn-field span {
  color: var(--app-ink);
  font-weight: 600;
}

.top-products-isn-field small,
.top-products-isn-inline-note {
  color: var(--app-muted);
  line-height: 1.5;
}

.top-products-isn-entry-row {
  display: flex;
  gap: 0.65rem;
}

.top-products-isn-field input,
.top-products-isn-field textarea {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  padding: 0.74rem 0.85rem;
  font: inherit;
  color: var(--app-ink);
  background: var(--app-panel-strong);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.top-products-isn-field textarea {
  resize: vertical;
  min-height: 7rem;
}

.top-products-isn-field input:focus,
.top-products-isn-field textarea:focus {
  outline: none;
  border-color: var(--app-accent);
  box-shadow: none;
}

.top-products-isn-entry-row button,
.top-products-isn-primary-button,
.top-products-isn-link,
.top-products-isn-choice,
.top-products-isn-token {
  font: inherit;
}

.top-products-isn-entry-row button,
.top-products-isn-primary-button {
  border: 1px solid transparent;
  border-radius: 0.75rem;
  cursor: pointer;
}

.top-products-isn-entry-row button {
  min-width: 5rem;
  padding: 0.78rem 0.95rem;
  background: var(--app-info-soft);
  border-color: var(--app-info-line);
  color: var(--app-info);
  font-weight: 700;
}

.top-products-isn-choice-grid,
.top-products-isn-token-row,
.top-products-isn-actions,
.top-products-isn-stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.top-products-isn-choice {
  padding: 0.55rem 0.8rem;
  border-radius: 999px;
  border: 1px solid var(--app-info-line);
  background: var(--app-info-soft);
  color: var(--app-info);
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease;
}

.top-products-isn-choice:hover,
.top-products-isn-token:hover,
.top-products-isn-primary-button:hover:not(:disabled),
.top-products-isn-entry-row button:hover {
  border-color: rgba(15, 118, 110, 0.24);
}

.top-products-isn-choice.is-active {
  border-color: rgba(15, 118, 110, 0.24);
  background: var(--app-accent-soft);
  color: var(--app-accent);
}

.top-products-isn-token {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.42rem 0.78rem;
  border: 1px solid var(--app-info-line);
  border-radius: 999px;
  background: var(--app-info-soft);
  color: var(--app-info);
  cursor: pointer;
}

.top-products-isn-link {
  align-self: center;
  border: 0;
  background: transparent;
  color: var(--app-accent);
  cursor: pointer;
  font-weight: 700;
}

.top-products-isn-template-link {
  justify-self: start;
  min-height: 2.75rem;
}

.top-products-isn-file-summary,
.top-products-isn-notice,
.top-products-isn-stat-row span,
.top-products-isn-results {
  border: 1px solid var(--app-border);
  border-radius: 0.8rem;
}

.top-products-isn-file-summary,
.top-products-isn-notice {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: var(--app-panel);
}

.top-products-isn-notice {
  color: var(--app-ink);
}

.top-products-isn-notice p {
  margin: 0.25rem 0 0;
  color: var(--app-muted);
}

.top-products-isn-notice--warning {
  background: var(--app-warning-soft);
  border-color: var(--app-warning-line);
  color: var(--app-warning);
}

.top-products-isn-notice--error {
  background: var(--app-danger-soft);
  border-color: var(--app-danger-line);
  color: var(--app-danger);
}

.top-products-isn-accordion {
  border: 0;
  border-bottom: 1px solid var(--app-border);
  border-radius: 0;
  background: var(--app-panel);
  overflow: hidden;
}

.top-products-isn-option-group {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border-left: 3px solid var(--app-border);
  border-radius: 0.5rem;
  background: var(--app-surface);
}

.top-products-isn-option-group:focus-within {
  border-left-color: var(--app-accent);
}

.top-products-isn-option-group__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.top-products-isn-option-group__title {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 0;
}

.top-products-isn-option-group__index {
  flex: 0 0 auto;
  color: var(--app-accent) !important;
  font-size: 0.72rem !important;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 1.4;
}

.top-products-isn-option-group__header strong,
.top-products-isn-option-group__header span {
  display: block;
}

.top-products-isn-option-count {
  flex: 0 0 auto;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: var(--app-accent-soft);
  color: var(--app-accent-strong) !important;
  font-weight: 700;
}

.top-products-isn-option-group__header strong {
  color: var(--app-ink);
}

.top-products-isn-option-group__header span {
  margin-top: 0.2rem;
  color: var(--app-muted);
  font-size: 0.78rem;
  line-height: 1.4;
}

.top-products-isn-accordion summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  list-style: none;
  padding: 1rem 1.15rem;
}

.top-products-isn-accordion summary::-webkit-details-marker {
  display: none;
}

.top-products-isn-accordion summary p {
  margin: 0;
  color: var(--app-ink);
  font-weight: 700;
}

.top-products-isn-accordion summary span {
  display: block;
  margin-top: 0.25rem;
  color: var(--app-muted);
  line-height: 1.5;
}

.top-products-isn-options.is-locked {
  background: var(--app-surface);
  opacity: 0.58;
}

.top-products-isn-options__summary.is-disabled {
  cursor: not-allowed;
}

.top-products-isn-options__summary {
  display: grid !important;
  grid-template-columns: auto minmax(0, 1fr) auto;
  justify-content: start !important;
  gap: 0.65rem !important;
}

.top-products-isn-disclosure-icon {
  flex: 0 0 auto;
  color: var(--app-muted);
  transition: transform 160ms ease-out;
}

.top-products-isn-options[open] > summary .top-products-isn-disclosure-icon,
.top-products-isn-station-config-card[open] > summary .top-products-isn-disclosure-icon {
  transform: rotate(180deg);
}

.top-products-isn-options__summary > .top-products-isn-step__index {
  display: inline-flex;
  margin: 0;
  color: var(--app-muted);
  line-height: 1;
}

.top-products-isn-accordion__body {
  padding: 0 1.15rem 1.25rem 3.55rem;
}

.top-products-isn-accordion__body--stacked {
  display: grid;
  gap: 0.85rem;
}

.top-products-isn-loading-bar {
  height: 0.42rem;
  border-radius: 999px;
  background: var(--app-border);
  background-size: 200% 100%;
  animation: top-products-isn-loading 1.1s linear infinite;
}

.top-products-isn-station-config-list {
  display: grid;
  gap: 0.65rem;
}

.top-products-isn-station-config-card {
  border: 1px solid var(--app-border);
  border-radius: 0.65rem;
  background: var(--app-panel);
  overflow: hidden;
}

.top-products-isn-station-config-card > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 2.75rem;
  padding: 0.75rem 0.9rem;
  background: var(--app-surface);
}

.top-products-isn-station-config-card > summary strong,
.top-products-isn-station-config-card > summary span {
  display: block;
}

.top-products-isn-station-config-card > summary strong {
  color: var(--app-ink);
}

.top-products-isn-station-config-card > summary span {
  margin-top: 0.15rem;
  color: var(--app-muted);
  font-size: 0.75rem;
}

.top-products-isn-primary-button {
  min-height: 3rem;
  padding: 0.85rem 1.2rem;
  background: var(--app-accent);
  border-color: var(--app-accent);
  color: var(--app-canvas);
  font-weight: 700;
}

.top-products-isn-primary-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  box-shadow: none;
}

.top-products-isn-stat-row span {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.7rem;
  background: var(--app-panel-strong);
  color: var(--app-muted);
  font-size: 0.82rem;
  font-weight: 700;
}

.top-products-isn-results {
  min-width: 0;
  padding: 1rem;
  background: var(--app-panel);
}

@keyframes top-products-isn-loading {
  from {
    background-position: 0% 0;
  }

  to {
    background-position: 200% 0;
  }
}

@media (max-width: 960px) {

  .top-products-isn-grid,
  .top-products-isn-filter-grid,
  .top-products-isn-step {
    grid-template-columns: minmax(0, 1fr);
  }

  .top-products-isn-step > .dut-isn-input,
  .top-products-isn-step > .app-multi-select,
  .top-products-isn-step > .top-products-isn-inline-note,
  .top-products-isn-step > .top-products-isn-notice,
  .top-products-isn-resolved-scope {
    grid-column: 1;
  }
}

@media (max-width: 720px) {

  .top-products-isn-entry-row,
  .top-products-isn-file-summary,
  .top-products-isn-notice,
  .top-products-isn-actions,
  .top-products-isn-section__header--split {
    flex-direction: column;
  }

  .top-products-isn-entry-row button,
  .top-products-isn-primary-button {
    width: 100%;
  }

  .top-products-isn-accordion summary,
  .top-products-isn-accordion__body {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .top-products-isn-option-group__header {
    flex-direction: column;
  }

  .top-products-isn-resolved-scope > header,
  .top-products-isn-resolved-scope > article {
    align-items: flex-start;
    grid-template-columns: minmax(0, 1fr);
  }

  .top-products-isn-resolved-scope > header {
    flex-direction: column;
  }
}
</style>
