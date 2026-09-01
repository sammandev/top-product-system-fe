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
        v-model:model-identifiers="modelIdentifier" :max-i-s-ns="20" :show-scope-editor="false" />

        <div v-if="dutISNs.length > 0" class="top-products-isn-resolved-scope">
          <header>
            <span>{{ loadingStations ? 'Resolving DUT scopes...' : `${dutScopeGroups.length} site / model scope${dutScopeGroups.length === 1 ? '' : 's'}` }}</span>
            <strong>{{ loadingStations ? '—' : `${availableStations.length} unique stations` }}</strong>
          </header>
          <article v-for="scope in dutScopeGroups" :key="scope.key">
            <div>
              <span>Site / Model</span>
              <strong>{{ scope.site }} / {{ scope.model }}</strong>
            </div>
            <div>
              <span>DUT identifiers</span>
              <strong>{{ scope.isns.join(', ') }}</strong>
            </div>
            <span>{{ scope.stations.length }} station{{ scope.stations.length === 1 ? '' : 's' }}</span>
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

      <details class="top-products-isn-accordion top-products-isn-options">
        <summary class="top-products-isn-options__summary">
          <span class="top-products-isn-step__index">3</span>
          <div>
            <p>Analysis options</p>
            <span>Optional criteria and station-specific filters.</span>
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
import AppFilePicker from '@/shared/ui/forms/AppFilePicker.vue'
import AppMultiSelect from '@/shared/ui/forms/AppMultiSelect.vue'
import { getApiErrorDetail, getErrorMessage } from '@/shared/utils'
import { dutApi } from '../api/dut.api'
import { dutTopProductApi } from '../api/dutTopProduct.api'
import { useFormulaSelector } from '../composables/useFormulaSelector'
import type {
  DUTTestSummary,
  StationDeviceList,
  StationFilterConfig as StationFilterConfigType,
  StationTestItemList,
  TestItem,
  TopProductBatchResponse,
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
const resultsSection = ref<HTMLElement | null>(null)
const dutISNs = ref<string[]>([])
const selectedStations = ref<string[]>([])
const criteriaFile = ref<File[] | File | null>(null)
const siteIdentifier = ref<string[]>([])
const modelIdentifier = ref<string[]>([])
const dutScopes = ref<Array<{ isn: string; site: string; model: string; stations: string[] }>>([])

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
    group.stations = [...new Set([...group.stations, ...scope.stations])].sort((first, second) =>
      first.localeCompare(second),
    )
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
                console.warn(`Station ${key} returned error:`, station.error)
              } else {
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

function handleExport() {
  if (!results.value?.results || results.value.results.length === 0) {
    console.warn('No results to export')
    return
  }

  // Dynamic import for exceljs and jszip
  Promise.all([import('exceljs'), import('jszip')])
    .then(([ExcelJS, JSZip]) => {
      exportToExcelZip(ExcelJS.default || ExcelJS, JSZip.default || JSZip)
    })
    .catch((err) => {
      console.error('Failed to load export libraries:', err)
      alert('Failed to load export libraries. Please ensure exceljs and jszip are installed.')
    })
}

// biome-ignore lint/suspicious/noExplicitAny: dynamically imported ExcelJS library
async function exportToExcelZip(ExcelJS: any, JSZip: any) {
  // Helper function to parse measurements from latest_data array (new API format)
  // biome-ignore lint/suspicious/noExplicitAny: dynamic measurement data from backend API
  function parseMeasurements(latest_data: Array<any>) {
    if (!latest_data || latest_data.length === 0) {
      return []
    }
    const measurements = []
    for (let i = 0; i < latest_data.length; i++) {
      const item = latest_data[i]
      if (!item) continue
      // New API format: {test_item, usl, lsl, actual, score_breakdown}
      const score = item.score_breakdown?.final_score ?? 0
      const deviation = item.score_breakdown?.deviation
      measurements.push({
        test_item: String(item.test_item || ''),
        usl: item.usl,
        lsl: item.lsl,
        actual: String(item.actual || ''),
        target: item.score_breakdown?.target_used,
        deviation: deviation !== undefined && deviation !== null ? Number(deviation) : undefined,
        score: Number(score),
      })
    }
    return measurements
  }

  // Group data by Site and Model
  // biome-ignore lint/suspicious/noExplicitAny: dynamic export data with computed measurements
  const groupedData = new Map<string, Map<string, any[]>>()

  results.value?.results.forEach((result) => {
    const site = result.site_name || 'Unknown_Site'
    const model = result.model_name || 'Unknown_Model'
    const groupKey = `${site}_${model}`

    if (!groupedData.has(groupKey)) {
      groupedData.set(groupKey, new Map())
    }

    // biome-ignore lint/style/noNonNullAssertion: key was just inserted in the check above
    const siteModelGroup = groupedData.get(groupKey)!

    result.test_result.forEach((station) => {
      const stationName = station.station_name

      if (!siteModelGroup.has(stationName)) {
        siteModelGroup.set(stationName, [])
      }

      siteModelGroup.get(stationName)?.push({
        dut_isn: result.dut_isn,
        site_name: result.site_name,
        model_name: result.model_name,
        station_name: station.station_name,
        station_id: station.station_id,
        test_date: station.test_date,
        device: station.device,
        overall_score:
          station.error_item && station.error_item.trim() !== ''
            ? 'N/A'
            : station.overall_data_score.toFixed(2),
        measurements: parseMeasurements(station.data || []),
        error_item: station.error_item,
      })
    })
  })

  // Create ZIP file
  const zip = new JSZip()

  // Process each Site/Model group
  for (const [groupKey, stations] of groupedData.entries()) {
    const workbook = new ExcelJS.Workbook()

    // Process each station
    for (const [stationName, duts] of stations.entries()) {
      // Collect all unique test items across all DUTs
      const allTestItems = new Set<string>()
      duts.forEach((dut) => {
        // biome-ignore lint/suspicious/noExplicitAny: dynamic measurement from parseMeasurements
        dut.measurements.forEach((m: any) => allTestItems.add(m.test_item))
      })
      const testItems = Array.from(allTestItems)

      // Sanitize sheet name (Excel limits: 31 chars, no special characters)
      let sheetName = stationName.replace(/[:\\/?*[\]]/g, '_').substring(0, 31)

      // Create worksheet
      const worksheet = workbook.addWorksheet(sheetName)

      // Header rows with metadata - format: Label,,,Value1,Value2,...
      // Test Date row
      const testDateRow = ['Test Date', '', '']
      duts.forEach((dut) => testDateRow.push(dut.test_date))
      worksheet.addRow(testDateRow)

      // Site row
      const siteRow = ['Site', '', '']
      duts.forEach((dut) => siteRow.push(dut.site_name || ''))
      worksheet.addRow(siteRow)

      // Model row
      const modelRow = ['Model', '', '']
      duts.forEach((dut) => modelRow.push(dut.model_name || ''))
      worksheet.addRow(modelRow)

      // Station Name row
      const stationRow = ['Station Name', '', '']
      duts.forEach(() => stationRow.push(stationName))
      worksheet.addRow(stationRow)

      // Device row
      const deviceRow = ['Device', '', '']
      duts.forEach((dut) => deviceRow.push(dut.device || ''))
      worksheet.addRow(deviceRow)

      // DUT ISN row
      const isnRow = ['DUT ISN', '', '']
      duts.forEach((dut) => isnRow.push(dut.dut_isn))
      worksheet.addRow(isnRow)

      // Overall Score row
      const scoreRow = ['Overall Score', '', '']
      duts.forEach((dut) => scoreRow.push(dut.overall_score))
      worksheet.addRow(scoreRow)

      // Data table headers
      // For single DUT: [Test_Items],[USL],[LSL],[VALUE],[Deviation],,[Score]
      // For multiple DUTs: [Test_Items],[USL],[LSL],[VALUE],[VALUE],...,[Deviation],[Deviation],...,Score_ISN1,Score_ISN2,...
      // biome-ignore lint/suspicious/noExplicitAny: Excel row contains mixed string/number values
      let headerRow: any[]
      if (duts.length === 1) {
        headerRow = ['[Test_Items]', '[USL]', '[LSL]', '[VALUE]', '[Deviation]', '', '[Score]']
      } else {
        headerRow = ['[Test_Items]', '[USL]', '[LSL]']
        // Add [VALUE] columns for each DUT
        duts.forEach(() => {
          headerRow.push('[VALUE]')
        })
        // Add [Deviation] columns for each DUT
        duts.forEach((dut) => {
          headerRow.push(`Deviation_${dut.dut_isn}`)
        })
        headerRow.push('') // Empty column separator
        // Add Score columns for each DUT
        duts.forEach((dut) => {
          headerRow.push(`Score_${dut.dut_isn}`)
        })
      }
      worksheet.addRow(headerRow)

      // Data rows - one row per test item
      testItems.forEach((testItem) => {
        // biome-ignore lint/suspicious/noExplicitAny: Excel row contains mixed string/number values
        const row: any[] = [testItem]

        if (duts.length === 1) {
          // Single DUT: Test_Item, USL, LSL, Measured, Deviation, empty, Score
          // biome-ignore lint/suspicious/noExplicitAny: dynamic measurement from parseMeasurements
          const measurement = duts[0].measurements.find((m: any) => m.test_item === testItem)
          if (measurement) {
            // biome-ignore lint/suspicious/noExplicitAny: deviation may not exist on all measurement shapes
            const deviation = (measurement as any).deviation ?? ''
            row.push(
              measurement.usl !== null ? measurement.usl : '',
              measurement.lsl !== null ? measurement.lsl : '',
              measurement.actual || '',
              deviation !== '' ? deviation.toFixed(2) : '',
              '', // Empty column
              measurement.score.toFixed(2),
            )
          } else {
            row.push('', '', '', '', '', '')
          }
        } else {
          // Multiple DUTs: Test_Item, USL, LSL, Measured1, Measured2, ..., Deviation1, Deviation2, ..., empty, Score1, Score2, ...
          // Get USL and LSL from first DUT (should be same across all DUTs)
          // biome-ignore lint/suspicious/noExplicitAny: dynamic measurement from parseMeasurements
          const firstMeasurement = duts[0].measurements.find((m: any) => m.test_item === testItem)
          if (firstMeasurement) {
            row.push(
              firstMeasurement.usl !== null ? firstMeasurement.usl : '',
              firstMeasurement.lsl !== null ? firstMeasurement.lsl : '',
            )
          } else {
            row.push('', '')
          }

          // Add Measured values for all DUTs
          duts.forEach((dut) => {
            // biome-ignore lint/suspicious/noExplicitAny: dynamic measurement from parseMeasurements
            const measurement = dut.measurements.find((m: any) => m.test_item === testItem)
            if (measurement) {
              row.push(measurement.actual || '')
            } else {
              row.push('')
            }
          })

          // Add Deviation values for all DUTs
          duts.forEach((dut) => {
            // biome-ignore lint/suspicious/noExplicitAny: dynamic measurement from parseMeasurements
            const measurement = dut.measurements.find((m: any) => m.test_item === testItem)
            // biome-ignore lint/suspicious/noExplicitAny: deviation may not exist on all measurement shapes
            if (measurement && (measurement as any).deviation !== undefined) {
              // biome-ignore lint/suspicious/noExplicitAny: deviation may not exist on all measurement shapes
              row.push((measurement as any).deviation.toFixed(2))
            } else {
              row.push('')
            }
          })

          row.push('') // Empty column separator

          // Add Score values for all DUTs
          duts.forEach((dut) => {
            // biome-ignore lint/suspicious/noExplicitAny: dynamic measurement from parseMeasurements
            const measurement = dut.measurements.find((m: any) => m.test_item === testItem)
            if (measurement) {
              row.push(measurement.score.toFixed(2))
            } else {
              row.push('')
            }
          })
        }

        worksheet.addRow(row)
      })
    }

    // Generate Excel file buffer
    const excelBuffer = await workbook.xlsx.writeBuffer()

    // Create filename with format: <Model>_<Site>_YYYY_MM_DD_HHmmss.xlsx
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const timestamp = `${year}_${month}_${day}_${hours}${minutes}${seconds}`

    // Extract model and site from groupKey (format: Site_Model)
    const [site, model] = groupKey.split('_')
    const fileName = `${model}_${site}_${timestamp}.xlsx`

    // Add to ZIP
    zip.file(fileName, excelBuffer)
  }

  // Generate ZIP with maximum compression and download
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9, // Maximum compression level
    },
  })
  const url = URL.createObjectURL(zipBlob)
  const link = document.createElement('a')
  link.href = url

  const timestamp = new Date().toISOString().replace(/[:.]/g, '_').slice(0, 19).replace('T', '_')
  link.download = `TopProducts_Export_${timestamp}.zip`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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

.top-products-isn-resolved-scope > header,
.top-products-isn-resolved-scope > article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
}

.top-products-isn-resolved-scope > header {
  background: var(--app-surface);
  border-bottom: 1px solid var(--app-border);
}

.top-products-isn-resolved-scope > article {
  display: grid;
  grid-template-columns: minmax(10rem, 0.8fr) minmax(14rem, 1.2fr) auto;
  border-top: 1px solid var(--app-border);
}

.top-products-isn-resolved-scope > article:first-of-type {
  border-top: 0;
}

.top-products-isn-resolved-scope article > div {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
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
