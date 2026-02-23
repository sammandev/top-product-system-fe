<template>
  <v-row>
    <!-- DUT ISN Input with Site/Model Selection -->
    <v-col cols="12">
      <DUTISNInput ref="dutISNInputRef" v-model="dutISNs" v-model:site-identifiers="siteIdentifier"
        v-model:model-identifiers="modelIdentifier" :max-i-s-ns="20" class="mb-4" />
    </v-col>

    <!-- Station Selection (Optional) -->
    <v-col cols="12" md="6">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-access-point</v-icon>
          Station Selection (Optional)
        </v-card-title>

        <v-card-text>
          <v-combobox v-model="selectedStations" :items="availableStations" :loading="loadingStations"
            label="Select Stations" placeholder="Leave empty to evaluate all stations" multiple chips closable-chips
            clearable hint="Stations are automatically loaded based on DUT ISN. Leave empty for all stations."
            persistent-hint>
            <template #chip="{ props: chipProps, item }">
              <v-chip v-bind="chipProps" :text="String(item.value || item)" closable />
            </template>
          </v-combobox>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Criteria Configuration -->
    <v-col cols="12" md="6">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-file-cog</v-icon>
          Criteria Configuration
          <v-spacer />
          <v-btn size="small" variant="outlined" color="primary" prepend-icon="mdi-download"
            @click="downloadCriteriaTemplate" title="Download criteria configuration template">
            Download Template
          </v-btn>
        </v-card-title>

        <v-card-text>
          <v-file-input v-model="criteriaFile" label="Criteria File (Optional)" placeholder="Upload criteria file"
            accept=".ini,.txt,.conf" prepend-icon="mdi-paperclip" clearable
            hint="Upload custom criteria file or use default rules" persistent-hint>
            <template #selection="{ fileNames }">
              <v-chip v-for="fileName in fileNames" :key="fileName" color="primary" size="small">
                {{ fileName }}
              </v-chip>
            </template>
          </v-file-input>

          <!-- Debug info -->
          <v-alert v-if="criteriaFile" type="info" density="compact" class="mt-2">
            File selected: {{ criteriaFileActual?.name }} ({{ formatFileSize(criteriaFileActual?.size || 0) }})
          </v-alert>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Advanced Filters (Collapsible) -->
    <v-col cols="12">
      <v-expansion-panels>
        <v-expansion-panel>
          <v-expansion-panel-title>
            <v-icon class="mr-2">mdi-filter-variant</v-icon>
            Universal Filters (Apply to All Stations)
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <v-row>
              <!-- Device Identifiers -->
              <v-col cols="12">
                <v-combobox v-model="deviceIdentifiers" label="Device Identifiers (Optional)"
                  placeholder="e.g., 1351, 614670" multiple chips closable-chips clearable
                  hint="Filter by specific device IDs or names (applies to all stations unless overridden)"
                  persistent-hint />
              </v-col>

              <!-- Test Item Include Filters -->
              <v-col cols="12" md="6">
                <v-combobox v-model="testItemFilters" label="Include Test Items (Regex)"
                  placeholder="e.g., WiFi_TX_POW.*" multiple chips closable-chips clearable
                  hint="Regex patterns to include specific test items (applies to all stations unless overridden)"
                  persistent-hint />
              </v-col>

              <!-- Test Item Exclude Filters -->
              <v-col cols="12" md="6">
                <v-combobox v-model="excludeTestItemFilters" label="Exclude Test Items (Regex)"
                  placeholder="e.g., WiFi_PA_POW_OLD.*" multiple chips closable-chips clearable
                  hint="Regex patterns to exclude test items (applies to all stations unless overridden)"
                  persistent-hint />
              </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-col>

    <!-- Per-Station Filter Configuration -->
    <v-col v-if="selectedStations.length > 0" cols="12">
      <v-expansion-panels>
        <v-expansion-panel>
          <v-expansion-panel-title>
            <v-icon class="mr-2">mdi-tune-variant</v-icon>
            Per-Station Filter Configuration (Optional)
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <v-alert type="info" variant="tonal" density="compact" class="mb-4">
              Configure specific filters for each selected station. Per-station filters
              <strong>override</strong>
              universal filters.
              Leave empty to use universal filters for all stations.
            </v-alert>

            <!-- Loading Test Items & Devices -->
            <v-progress-linear v-if="loadingTestItems || loadingDevices" indeterminate color="primary" class="mb-4" />

            <v-row>
              <v-col v-for="station in selectedStations" :key="station" cols="12" md="6">
                <StationFilterConfig :station-identifier="station" :station-name="station"
                  :available-test-items="stationTestItems[station] || []"
                  :available-devices="stationDevices[station] || []" :loading="loadingTestItems || loadingDevices"
                  v-model="stationFilterConfigs[station]" />
              </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-col>

    <!-- Action Buttons -->
    <v-col cols="12">
      <v-card>
        <v-card-text>
          <v-row class="align-stretch">
            <v-col cols="12" sm="6" lg="3">
              <v-btn color="primary" size="large" block :loading="loading" :disabled="!canAnalyze"
                @click="handleAnalyze">
                <v-icon class="mr-2">mdi-chart-line</v-icon>
                Analyze DUTs
              </v-btn>
            </v-col>

            <v-col cols="12" sm="6" lg="3">
              <v-btn color="secondary" size="large" block variant="tonal" :loading="loading" :disabled="!canAnalyze"
                @click="handleAnalyzeWithPATrends">
                <v-icon class="mr-2">mdi-chart-timeline-variant</v-icon>
                Analyze with PA Trends
              </v-btn>
            </v-col>

            <v-col cols="12" sm="6" lg="3">
              <v-btn color="info" size="large" block variant="tonal" :loading="loading" :disabled="!canAnalyze"
                @click="handleAnalyzeHierarchical">
                <v-icon class="mr-2">mdi-sitemap</v-icon>
                Hierarchical Scoring
              </v-btn>
            </v-col>

            <v-col cols="12" sm="6" lg="3">
              <FormulaSelectorDialog v-model="showFormulaSelectorDialog" :universal-formula="universalFormula"
                @update:universal-formula="universalFormula = $event" v-model:category-formulas="categoryFormulas"
                @reset="handleResetFormulas" @apply="handleApplyFormulas">
                <template #activator="{ props: dialogProps }">
                  <v-btn v-bind="dialogProps" color="primary" variant="outlined" prepend-icon="mdi-function-variant"
                    block>
                    Formula Selection
                    <v-badge v-if="formulaSelectionEnabled" :content="activeFormulaStats.enabledCount" color="success"
                      inline />
                  </v-btn>
                </template>
              </FormulaSelectorDialog>
            </v-col>
          </v-row>

          <!-- Validation Alert -->
          <v-alert v-if="attemptedAnalysis && !canAnalyze" type="warning" variant="tonal" density="compact"
            class="mt-4">
            <template #prepend>
              <v-icon>mdi-alert</v-icon>
            </template>
            Please add at least one DUT ISN to continue
          </v-alert>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Error Display -->
    <v-col v-if="error" cols="12">
      <v-alert type="error" variant="tonal" closable @click:close="clearError">
        <div class="font-weight-medium">Analysis Failed</div>
        <div class="text-caption">{{ error }}</div>
      </v-alert>
    </v-col>

    <!-- Results Display -->
    <v-col v-if="hasResults" ref="resultsSection" cols="12">
      <TopProductISNResults :results="processedResults!.results" :errors="processedResults!.errors"
        :custom-scoring-enabled="formulaSelectionEnabled" :universal-formula="universalFormula"
        :category-formulas="categoryFormulas" @export="handleExport" />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed, nextTick, provide, ref, watch } from 'vue'
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
// biome-ignore lint/style/useImportType: value import required for template component resolution
import DUTISNInput from './DUTISNInput.vue'
import FormulaSelectorDialog from './FormulaSelectorDialog.vue'
import StationFilterConfig from './StationFilterConfig.vue'
import TopProductISNResults from './TopProductISNResults.vue'

// Formula Selector (New approach)
const {
  universalFormula,
  categoryFormulas,
  formulaSelectionEnabled,
  activeFormulaStats,
  resetFormulas,
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
const showFormulaSelectorDialog = ref(false)
const dutISNs = ref<string[]>([])
const selectedStations = ref<string[]>([])
// NOTE: Vuetify 3 v-file-input without 'multiple' prop returns File[] (array with one file) or null
// We need to handle both single File and File[] for compatibility
const criteriaFile = ref<File[] | File | null>(null)
const siteIdentifier = ref<string[]>([])
const modelIdentifier = ref<string[]>([])
const deviceIdentifiers = ref<string[]>([])
const testItemFilters = ref<string[]>([])
const excludeTestItemFilters = ref<string[]>([])

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
  return siteIdentifier.value.length > 0 ? siteIdentifier.value[0] : undefined
})

const modelIdentifierValue = computed(() => {
  return modelIdentifier.value.length > 0 ? modelIdentifier.value[0] : undefined
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
    if (newISNs.length === 0) {
      availableStations.value = []
      selectedStations.value = []
      stationTestItems.value = {}
      stationDevices.value = {}
      stationFilterConfigs.value = {}
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

      // Extract unique station names, sites, and models
      const allStationNames: string[] = []
      const allSites: string[] = []
      const allModels: string[] = []

      summaries.forEach((summary) => {
        if (!summary) return
        const s = summary as DUTTestSummary

        // Collect station names
        s.stations.forEach((station) => {
          allStationNames.push(station.station_name)
        })

        // Collect site and model names
        if (s.site_name) allSites.push(s.site_name)
        if (s.model_name) allModels.push(s.model_name)
      })

      // Set unique values
      availableStations.value = [...new Set(allStationNames)]

      // Update sites and models in DUTISNInput component
      const uniqueSites = [...new Set(allSites)]
      const uniqueModels = [...new Set(allModels)]

      if (dutISNInputRef.value) {
        dutISNInputRef.value.updateAvailableSites(uniqueSites)
        dutISNInputRef.value.updateAvailableModels(uniqueModels)
      }

      // Auto-fill site and model identifiers
      // If sites or models are currently empty, auto-populate with first available values
      if (siteIdentifier.value.length === 0 && uniqueSites.length > 0) {
        const firstSite = uniqueSites[0]
        if (firstSite) siteIdentifier.value = [firstSite]
      } else {
        // If sites or models have been removed from available list, update selected ones
        // Remove sites that are no longer in the available list
        siteIdentifier.value = siteIdentifier.value.filter((site) => uniqueSites.includes(site))
      }

      if (modelIdentifier.value.length === 0 && uniqueModels.length > 0) {
        const firstModel = uniqueModels[0]
        if (firstModel) modelIdentifier.value = [firstModel]
      } else {
        // Remove models that are no longer in the available list
        modelIdentifier.value = modelIdentifier.value.filter((model) =>
          uniqueModels.includes(model),
        )
      }
    } catch (err) {
      console.warn('Could not fetch stations for DUT ISNs:', err)
      availableStations.value = []
    } finally {
      loadingStations.value = false
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
      // Determine if we should use latest test items based on DUT ISN
      const firstDutISN = dutISNs.value.length > 0 ? dutISNs.value[0] : null
      const shouldUseLatestTestItems = firstDutISN !== null && firstDutISN !== undefined
      let testItemsMap: Record<string, TestItem[]> = {}

      if (shouldUseLatestTestItems && firstDutISN) {
        // Fetch latest test items for the DUT ISN (more relevant for Per-Station Filter)
        try {
          const latestItemsResponse = (await dutApi.getLatestTestItemsBatch(
            firstDutISN,
            newStations,
          )) as { stations: Record<string, unknown>[] }

          // Convert test item definitions to TestItem objects for compatibility
          // biome-ignore lint/suspicious/noExplicitAny: dynamic station data from backend API
          latestItemsResponse.stations.forEach((station: any) => {
            const key = station.station_name || String(station.station_id)
            if (station.error) {
              console.warn(`Station ${key} returned error:`, station.error)
            } else {
              // Only include value test items (exclude nonvalue_bin and nonvalue for filter dropdown)
              const valueTestItems: TestItem[] = []

              // Add value test items only
              if (station.value_test_items && station.value_test_items.length > 0) {
                // biome-ignore lint/suspicious/noExplicitAny: dynamic test item data from backend API
                station.value_test_items.forEach((item: any) => {
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
                testItemsMap[key] = valueTestItems
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
const canAnalyze = computed(() => dutISNs.value.length > 0)
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
      device_identifiers: deviceIdentifiers.value.length > 0 ? deviceIdentifiers.value : undefined,
      test_item_filters: testItemFilters.value.length > 0 ? testItemFilters.value : undefined,
      exclude_test_item_filters:
        excludeTestItemFilters.value.length > 0 ? excludeTestItemFilters.value : undefined,
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
      device_identifiers: deviceIdentifiers.value.length > 0 ? deviceIdentifiers.value : undefined,
      test_item_filters: testItemFilters.value.length > 0 ? testItemFilters.value : undefined,
      exclude_test_item_filters:
        excludeTestItemFilters.value.length > 0 ? excludeTestItemFilters.value : undefined,
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
      device_identifiers: deviceIdentifiers.value.length > 0 ? deviceIdentifiers.value : undefined,
      test_item_filters: testItemFilters.value.length > 0 ? testItemFilters.value : undefined,
      exclude_test_item_filters:
        excludeTestItemFilters.value.length > 0 ? excludeTestItemFilters.value : undefined,
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

// Custom Scoring Handlers
function handleResetFormulas() {
  resetFormulas()
  console.log('Custom formulas reset to default')
}

function handleApplyFormulas() {
  console.log('Custom formulas applied:', {
    universal: universalFormula.value.enabled,
    categories: activeFormulaStats.value.activeCategories,
  })
  showFormulaSelectorDialog.value = false
  // Results will automatically recalculate when passed to TopProductISNResults
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
  if (!results.value || !results.value.results || results.value.results.length === 0) {
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
      // For single DUT: [Test_Items],[USL],[LSL],[Measured],[Deviation],,[Score]
      // For multiple DUTs: [Test_Items],[USL],[LSL],[Measured],[Measured],...,[Deviation],[Deviation],...,Score_ISN1,Score_ISN2,...
      // biome-ignore lint/suspicious/noExplicitAny: Excel row contains mixed string/number values
      let headerRow: any[]
      if (duts.length === 1) {
        headerRow = ['[Test_Items]', '[USL]', '[LSL]', '[Measured]', '[Deviation]', '', '[Score]']
      } else {
        headerRow = ['[Test_Items]', '[USL]', '[LSL]']
        // Add [Measured] columns for each DUT
        duts.forEach(() => {
          headerRow.push('[Measured]')
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
  const templateContent = `; TOP PRODUCT CRITERIA CONFIGURATION TEMPLATE
; ================================================================
; Format: (can define multiple [Model|Station] sections)
; --------
; [ModelName|StationName]
; "TEST_ITEM" <USL,LSL>  ===> "TargetValue" (Test item names are case-insensitive)
; ================================================================
; Explanation of the fields:
; ---------------------------
; ModelName = DUT model name as defined in the DUT configuration file.
; StationName = Station name as defined in the test plan.
; TEST_ITEM = Uses regex function to determine the same item 
;			  - Exact: "WiFi_TX1_POW_6175_11AX_MCS9_B20"
;			  - Pattern: "WiFi_TX_POW_6175_11AX_MCS9_B20" (matches TX1, TX2, TX3, TX4)
; USL = Upper Specification Limit. If empty: "<,10>", then the higher (>10) the better.
; LSL = Lower Specification Limit. If empty: "<0,>", then the lower (<0) the better.
; TargetValue = Target value to be achieved. If empty, ensure data complies with USL or LSL.
; ================================================================
; Example: HH5K project
; ----------------------
; [HH5K|Wireless_Test_2_5G]
; "WiFi_TX_FIXTURE_OR_DUT_PROBLEM_POW_2437_11N_MCS0_B20" <20,10>  ===> "15"
; "WiFi_TX_FIXTURE_OR_DUT_PROBLEM_POW_5300_11AC_MCS8_B20" <20,10>  ===> "15"
; "WiFi_RX_PER_2462_11B_CCK11_B20" <10,>  ===> "16"
; "WiFi_TX1_POW_5190_11N_MCS7_B40" <19,16>  ===> "17.5"
; 
; [HH5K|Wireless_Test_6G]
; "WiFi_TX_FIXTURE_OR_DUT_PROBLEM_POW_6175_11AX_MCS9_B20" <20,10>  ===> "15"
; "WiFi_TX_POW_6185_11AX_MCS11_B160" <17,14>  ===> "16"
; ================================================================

[ModelName|StationName]
"TEST_ITEM" <USL,LSL>  ===> "TargetValue"
`

  const blob = new Blob([templateContent], { type: 'text/plain;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'top_product_criteria_configuration.ini'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
}
</script>
