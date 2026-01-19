<template>
  <v-container fluid class="pa-6">
    <!-- Page Header -->
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-4">
          <div>
            <h1 class="text-h4 font-weight-bold mb-2">
              <v-icon icon="mdi-chart-tree" class="mr-2" />
              Top Product Hierarchical Analysis
            </h1>
            <p class="text-subtitle-1 text-medium-emphasis">
              Deep dive into hierarchical scoring structure: Group → Subgroup → Antenna → Category
            </p>
          </div>
          <div>
            <v-btn v-if="hasResults" color="primary" variant="outlined" prepend-icon="mdi-download" :disabled="loading"
              @click="showExportDialog = true">
              Export
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Input Section -->
    <v-row>
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title class="bg-primary">
            <v-icon icon="mdi-database-search" class="mr-2" />
            1. DUT Selection & Filters
          </v-card-title>
          <v-card-text class="pa-4">
            <!-- DUT ISN Input -->
            <DUTISNInput v-model="dutISNs" :max-i-s-ns="10" @change="onISNChange" />

            <v-divider class="my-4" />

            <!-- Advanced Filters Panel -->
            <AdvancedFiltersPanel v-model="filters" @apply="onFiltersApply" />

            <v-divider class="my-4" />

            <!-- Action Buttons -->
            <div class="d-flex justify-end gap-2">
              <v-btn color="error" variant="outlined" prepend-icon="mdi-close-circle" :disabled="loading"
                @click="clearAll">
                Clear All
              </v-btn>
              <v-btn color="primary" variant="flat" prepend-icon="mdi-chart-timeline-variant" :loading="loading"
                :disabled="!canAnalyze" @click="performAnalysis">
                Analyze Hierarchical Scores
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Error Display -->
    <v-row v-if="error">
      <v-col cols="12">
        <v-alert type="error" variant="tonal" closable @click:close="clearError">
          <v-alert-title>Analysis Error</v-alert-title>
          {{ error }}
        </v-alert>
      </v-col>
    </v-row>

    <!-- Results Display -->
    <v-row v-if="hasResults">
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title class="bg-success">
            <v-icon icon="mdi-check-circle" class="mr-2" />
            2. Hierarchical Results
          </v-card-title>
          <v-card-text class="pa-4">
            <!-- DUT Selection Tabs -->
            <v-tabs v-model="selectedTab" bg-color="transparent" color="primary" show-arrows>
              <v-tab v-for="result in results" :key="result.dut_isn" :value="result.dut_isn">
                <v-icon icon="mdi-chip" class="mr-2" />
                DUT {{ result.dut_isn }}
                <v-chip v-if="errors.some(e => e.dut_isn === result.dut_isn)" color="error" size="x-small" class="ml-2">
                  Error
                </v-chip>
              </v-tab>
            </v-tabs>

            <v-divider class="my-4" />

            <!-- Tab Content -->
            <v-window v-model="selectedTab">
              <v-window-item v-for="result in results" :key="result.dut_isn" :value="result.dut_isn">
                <!-- Error Display for This DUT -->
                <v-alert v-if="getDUTError(result.dut_isn)" type="error" variant="tonal" class="mb-4">
                  <v-alert-title>DUT {{ result.dut_isn }} Error</v-alert-title>
                  {{ getDUTError(result.dut_isn)?.detail }}
                </v-alert>

                <!-- Station Results -->
                <div v-else-if="result.test_result && result.test_result.length > 0">
                  <v-expansion-panels v-model="expandedStations" multiple>
                    <v-expansion-panel v-for="(station, idx) in result.test_result" :key="idx" :value="idx">
                      <v-expansion-panel-title>
                        <div class="d-flex align-center justify-space-between w-100">
                          <span class="font-weight-bold">
                            <v-icon icon="mdi-factory" class="mr-2" />
                            {{ station.station_name }}
                          </span>
                          <v-chip v-if="station.overall_group_scores" color="info" size="small" class="mr-4">
                            {{ Object.keys(station.overall_group_scores).length }} Subgroups
                          </v-chip>
                        </div>
                      </v-expansion-panel-title>
                      <v-expansion-panel-text>
                        <!-- Overall Group Scores Chart -->
                        <v-row v-if="station.overall_group_scores">
                          <v-col cols="12">
                            <SubgroupComparisonChart :overall-group-scores="station.overall_group_scores"
                              :title="`Overall Subgroup Scores - ${station.station_name}`" />
                          </v-col>
                        </v-row>

                        <v-divider class="my-4" />

                        <!-- Hierarchical Tree View -->
                        <v-row v-if="station.group_scores">
                          <v-col cols="12">
                            <h3 class="text-h6 mb-3">
                              <v-icon icon="mdi-file-tree" class="mr-2" />
                              Hierarchical Score Tree
                            </h3>
                            <HierarchicalScoreTree :group-scores="station.group_scores"
                              :overall-group-scores="station.overall_group_scores" />
                          </v-col>
                        </v-row>

                        <v-divider class="my-4" />

                        <!-- Category Heatmap -->
                        <v-row v-if="station.group_scores">
                          <v-col cols="12">
                            <h3 class="text-h6 mb-3">
                              <v-icon icon="mdi-view-grid" class="mr-2" />
                              Category Performance Heatmap
                            </h3>
                            <CategoryHeatmap :group-scores="station.group_scores" />
                          </v-col>
                        </v-row>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </div>

                <!-- No Station Data -->
                <v-alert v-else type="info" variant="tonal">
                  No station data available for DUT {{ result.dut_isn }}
                </v-alert>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-else-if="!loading">
      <v-col cols="12">
        <v-card elevation="2" class="text-center pa-8">
          <v-icon icon="mdi-information-outline" size="64" color="info" class="mb-4" />
          <h2 class="text-h5 mb-2">No Analysis Results Yet</h2>
          <p class="text-body-1 text-medium-emphasis mb-4">
            Enter DUT ISN(s) above and click "Analyze Hierarchical Scores" to get started.
          </p>
          <p class="text-body-2 text-medium-emphasis">
            This feature provides deep hierarchical analysis with 4 levels:
            <strong>Group → Subgroup → Antenna → Category</strong>
          </p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Export Dialog -->
    <v-dialog v-model="showExportDialog" max-width="500">
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon icon="mdi-download" class="mr-2" />
          Export Hierarchical Results
        </v-card-title>
        <v-card-text class="pa-4">
          <p class="mb-4">Choose export format:</p>
          <v-radio-group v-model="exportFormat">
            <v-radio label="JSON (Full hierarchical structure)" value="json" />
            <v-radio label="CSV (Flattened scores)" value="csv" />
          </v-radio-group>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showExportDialog = false">
            Cancel
          </v-btn>
          <v-btn color="primary" variant="flat" @click="performExport">
            Export
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useHierarchicalStore } from '../store'
import {
  DUTISNInput,
  AdvancedFiltersPanel,
  HierarchicalScoreTree,
  SubgroupComparisonChart,
  CategoryHeatmap
} from '../components'
import type { HierarchicalError, GroupScores } from '@/core/types/dut.types'

// Store
const hierarchicalStore = useHierarchicalStore()

// State
const dutISNs = ref<string[]>([])
const filters = ref({
  stations: [] as string[],
  devices: [] as string[],
  site: '',
  model: '',
  include_patterns: [] as string[],
  exclude_patterns: [] as string[],
  criteria_file: null as File | null
})
const selectedTab = ref<string>()
const expandedStations = ref<number[]>([])
const showExportDialog = ref(false)
const exportFormat = ref<'json' | 'csv'>('json')
const isValidISNInput = ref(true)

// Computed
const loading = computed(() => hierarchicalStore.loading)
const error = computed(() => hierarchicalStore.error)
const results = computed(() => hierarchicalStore.results)
const errors = computed(() => hierarchicalStore.errors)

const hasResults = computed(() => results.value.length > 0)

const canAnalyze = computed(() => {
  return dutISNs.value.length > 0 && isValidISNInput.value && !loading.value
})

// Methods
function onISNChange(validation: { valid: boolean }) {
  isValidISNInput.value = validation.valid
}

function onFiltersApply() {
  // Optional: Auto-trigger analysis on filter apply
  // performAnalysis()
}

async function performAnalysis() {
  if (!canAnalyze.value) return

  // Build request
  const request: any = {
    dut_isns: dutISNs.value
  }

  // Add optional filters
  if (filters.value.stations.length > 0) {
    request.stations = filters.value.stations
  }
  if (filters.value.devices.length > 0) {
    request.devices = filters.value.devices
  }
  if (filters.value.site) {
    request.site = filters.value.site
  }
  if (filters.value.model) {
    request.model = filters.value.model
  }
  if (filters.value.include_patterns.length > 0) {
    request.include_patterns = filters.value.include_patterns
  }
  if (filters.value.exclude_patterns.length > 0) {
    request.exclude_patterns = filters.value.exclude_patterns
  }
  if (filters.value.criteria_file) {
    request.criteria_file = filters.value.criteria_file
  }

  // Perform analysis
  await hierarchicalStore.fetchHierarchicalAnalysis(request)

  // Auto-select first tab if results available
  if (results.value.length > 0 && !selectedTab.value && results.value[0]) {
    selectedTab.value = results.value[0].dut_isn
  }

  // Auto-expand first station
  if (expandedStations.value.length === 0) {
    expandedStations.value = [0]
  }
}

function clearAll() {
  dutISNs.value = []
  filters.value = {
    stations: [],
    devices: [],
    site: '',
    model: '',
    include_patterns: [],
    exclude_patterns: [],
    criteria_file: null
  }
  hierarchicalStore.clearData()
  selectedTab.value = undefined
  expandedStations.value = []
}

function clearError() {
  hierarchicalStore.error = null
}

function getDUTError(dutISN: string): HierarchicalError | undefined {
  return errors.value.find(e => e.dut_isn === dutISN)
}

function performExport() {
  if (!hasResults.value) return

  if (exportFormat.value === 'json') {
    exportJSON()
  } else {
    exportCSV()
  }

  showExportDialog.value = false
}

function exportJSON() {
  const data = {
    timestamp: new Date().toISOString(),
    dut_isns: dutISNs.value,
    filters: filters.value,
    results: results.value,
    errors: errors.value
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `hierarchical_analysis_${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function exportCSV() {
  const rows: string[] = []

  // Header with both Bayesian and Average scores
  rows.push('DUT_ISN,Station,Group,Subgroup,Antenna,Category,Bayesian_Score,Average_Score')

  // Data rows
  results.value.forEach(result => {
    result.test_result?.forEach((station: any) => {
      if (!station.group_scores) return

      const groupData = station.group_scores as GroupScores
      Object.entries(groupData).forEach(([groupKey, subgroupsData]) => {
        if (typeof subgroupsData !== 'object' || !subgroupsData) return

        Object.entries(subgroupsData).forEach(([subgroupKey, antennasData]) => {
          // Skip score fields at subgroup level
          if (subgroupKey === 'final_group_score' || subgroupKey === 'group_avg_score') return
          if (typeof antennasData !== 'object' || !antennasData) return

          Object.entries(antennasData).forEach(([antennaKey, categoriesData]) => {
            // Skip score fields at antenna level
            if (antennaKey.endsWith('_group_score') || antennaKey.endsWith('_avg_score')) return
            if (typeof categoriesData !== 'object' || !categoriesData) return

            Object.entries(categoriesData).forEach(([categoryKey, scoreData]) => {
              // Skip score fields at category level
              if (categoryKey.endsWith('_score') || categoryKey.endsWith('_group_score') || categoryKey.endsWith('_avg_score')) return
              
              // Handle both old format (number) and new format (object)
              let bayesScore = ''
              let avgScore = ''
              
              if (typeof scoreData === 'number') {
                bayesScore = scoreData.toString()
              } else if (typeof scoreData === 'object') {
                bayesScore = scoreData.category_bayes_score?.toString() || ''
                avgScore = scoreData.category_avg_score?.toString() || ''
              }
              
              if (bayesScore) {
                rows.push(
                  `${result.dut_isn},${station.station_name},${groupKey},${subgroupKey},${antennaKey},${categoryKey},${bayesScore},${avgScore}`
                )
              }
            })
          })
        })
      })
    })
  })

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `hierarchical_analysis_${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// Watch for tab changes to reset expanded stations
watch(selectedTab, () => {
  expandedStations.value = [0]
})
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}

.w-100 {
  width: 100%;
}
</style>
