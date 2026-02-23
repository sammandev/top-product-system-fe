<template>
  <!-- Section 1: Upload and Configure Section -->
  <v-row>
    <v-col cols="12">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary">mdi-upload</v-icon>
          Upload and Configure
        </v-card-title>

        <v-card-text>
          <v-row class="align-stretch">
            <!-- Upload Log Field -->
            <v-col cols="12" md="6" class="d-flex">
              <v-card variant="outlined" class="flex-grow-1">
                <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
                  <v-icon start size="small">mdi-file-document-multiple</v-icon>
                  Upload Test Logs
                </v-card-title>
                <v-card-text class="mt-4">
                  <v-file-input v-model="logFiles" label="Test log files (.txt, .zip, .rar, .7z)"
                    accept=".txt,.zip,.rar,.7z" multiple prepend-icon="mdi-file-document" show-size :clearable="true"
                    :disabled="loading" variant="outlined">
                    <template #selection="{ fileNames }">
                      <template v-for="(fileName, index) in fileNames" :key="fileName">
                        <v-chip v-if="index < 3" size="small" class="me-2">{{ fileName }}</v-chip>
                      </template>
                      <span v-if="fileNames.length > 3" class="text-caption text-medium-emphasis">
                        +{{ fileNames.length - 3 }} more {{ fileNames.length - 3 === 1 ? 'file' : 'files' }}
                      </span>
                    </template>
                  </v-file-input>
                  <div v-if="logFiles && logFiles.length > 0" class="text-caption text-medium-emphasis mt-2">
                    {{ logFiles.length }} {{ logFiles.length === 1 ? 'file' : 'files' }} selected
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Custom Criteria (Optional) -->
            <v-col cols="12" md="6" class="d-flex">
              <v-card variant="outlined" class="flex-grow-1">
                <v-card-title class="text-subtitle-1 bg-grey-lighten-4 d-flex align-center">
                  <v-icon start size="small">mdi-filter-variant</v-icon>
                  Custom Criteria (Optional)
                  <v-spacer />
                  <v-btn size="x-small" variant="text" color="primary" prepend-icon="mdi-download"
                    @click="downloadCriteriaTemplate" title="Download JSON template">
                    Template
                  </v-btn>
                </v-card-title>
                <v-card-text class="mt-4">
                  <v-file-input v-model="criteriaFile" label="Criteria file (.json)" accept=".json"
                    prepend-icon="mdi-file-cog" show-size :clearable="true" :disabled="loading" variant="outlined"
                    density="compact" />

                  <v-checkbox v-model="showOnlyCriteria" label="Show only criteria items"
                    :disabled="!criteriaFile || loading" density="compact" color="primary" hide-details
                    class="mt-0 mb-2" />

                  <v-btn block variant="outlined" color="primary" prepend-icon="mdi-cog-outline" size="small"
                    :disabled="loading" @click="openCriteriaBuilder">
                    Build Criteria
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Action Buttons -->
          <v-row class="mt-3">
            <v-col cols="12">
              <div class="d-flex gap-2 flex-wrap">
                <!-- Configure Scoring Button -->
                <v-btn color="secondary" size="large" variant="outlined" :loading="extractingItems"
                  :disabled="!hasFiles || loading" prepend-icon="mdi-cog-outline" @click="handleConfigureScoring">
                  Configure Scoring
                  <v-chip v-if="appliedScoringConfigs.length > 0" size="x-small" color="success" class="ml-2">
                    {{ appliedScoringConfigs.length }}
                  </v-chip>
                </v-btn>
                <!-- Analyze Button -->
                <v-btn color="primary" size="large" style="flex: 1" :loading="loading" :disabled="!canAnalyze"
                  prepend-icon="mdi-play" @click="handleAnalyze">
                  Analyze Logs
                </v-btn>
                <!-- Reset Button -->
                <v-btn v-if="hasResults" variant="outlined" size="large" :disabled="loading" prepend-icon="mdi-refresh"
                  @click="handleReset">
                  Reset
                </v-btn>
              </div>

              <!-- Scoring Config Status -->
              <div v-if="appliedScoringConfigs.length > 0" class="mt-2">
                <v-chip size="small" color="success" variant="tonal" prepend-icon="mdi-check-circle">
                  Scoring configured: {{ appliedScoringConfigs.length }} items
                </v-chip>
                <v-btn size="x-small" variant="text" color="warning" class="ml-2" @click="clearScoringConfigs">
                  Clear
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>

  <!-- Section 2: Ranking Summary Section -->
  <v-row v-if="hasResults" class="mt-4">
    <v-col cols="12">
      <TopProductRankingUploadLog :parse-result="parsingResult" :compare-result="compareResult"
        :scoring-configs="appliedScoringConfigs" />
    </v-col>
  </v-row>

  <!-- Section 3: Comparison Section (for 2+ logs) -->
  <v-row v-if="hasResults && isMultipleFiles" class="mt-4">
    <v-col cols="12">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="info">mdi-compare</v-icon>
          Test Item Comparison
          <v-chip class="ml-2" size="small" color="info">{{ totalFiles }} files</v-chip>
          <v-spacer />
          <v-btn variant="tonal" color="success" size="small" prepend-icon="mdi-microsoft-excel"
            :loading="exportingComparison" @click="exportComparisonToExcel" class="mr-2">
            Export
          </v-btn>
          <v-icon size="large" color="primary" @click="comparisonFullscreen = true" class="mr-2">mdi-fullscreen</v-icon>
          <v-progress-circular v-if="iplasLoading" indeterminate size="20" width="2" color="primary" class="mr-2" />
          <v-chip v-if="iplasDataByIsn.size > 0" size="small" color="success" variant="tonal">
            iPLAS: {{ iplasDataByIsn.size }} ISN(s)
          </v-chip>
        </v-card-title>

        <v-card-text>
          <!-- UPDATED: Controls Row with Station filters, ISN filter, and Search -->
          <v-row dense class="mb-4">
            <v-col cols="6" md="2">
              <v-select v-model="selectedUploadedStation" :items="uploadedStationOptions" label="Station (Uploaded)"
                variant="outlined" density="compact" prepend-inner-icon="mdi-access-point" hide-details clearable />
            </v-col>
            <v-col cols="6" md="2">
              <v-select v-model="selectedIplasStation" :items="iplasStationOptions" label="Station (iPLAS)"
                variant="outlined" density="compact" prepend-inner-icon="mdi-router-wireless" hide-details clearable
                :disabled="iplasDataByIsn.size === 0" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="selectedCompareIsns" :items="allCompareIsns" label="ISNs to Compare" variant="outlined"
                density="compact" prepend-inner-icon="mdi-identifier" hide-details multiple chips closable-chips />
            </v-col>
            <v-col cols="6" md="2">
              <v-select v-model="itemFilterType" :items="itemFilterOptions" label="Filter Items" variant="outlined"
                density="compact" prepend-inner-icon="mdi-filter" hide-details />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field v-model="searchQuery" label="Search Test Items" variant="outlined" density="compact"
                prepend-inner-icon="mdi-magnify" hide-details clearable />
            </v-col>
          </v-row>

          <!-- iPLAS Loading Indicator -->
          <v-alert v-if="iplasLoading" type="info" variant="tonal" density="compact" class="mb-3">
            <template #prepend>
              <v-progress-circular indeterminate size="18" width="2" />
            </template>
            Fetching iPLAS data for {{ allCompareIsns.length }} ISN(s)...
          </v-alert>
          <v-alert v-else-if="iplasDataByIsn.size > 0" type="success" variant="tonal" density="compact" class="mb-3">
            iPLAS data loaded for {{ iplasDataByIsn.size }} ISN(s)
            <template v-if="selectedIplasStation"> — Station: {{ selectedIplasStation }}</template>
          </v-alert>

          <!-- UPDATED: Comparison Table with Parent-Children Headers per ISN -->
          <v-data-table :headers="comparisonHeaders" :items="comparisonTableItems" :items-per-page="25"
            density="comfortable" class="elevation-1" fixed-header height="840">
            <!-- Custom row rendering for dynamic columns -->
            <template #item="{ item, columns }">
              <tr>
                <td v-for="column in (columns as any[])" :key="column.key"
                  :class="column.key === 'test_item' ? '' : 'text-center'">
                  <!-- Test Item name -->
                  <span v-if="column.key === 'test_item'" class="font-weight-medium">
                    {{ item.test_item }}
                  </span>
                  <!-- UCL / LCL -->
                  <span v-else-if="column.key === 'usl' || column.key === 'lsl'" class="text-medium-emphasis">
                    {{ item[column.key] ?? '-' }}
                  </span>
                  <!-- Score columns (chips) -->
                  <template v-else-if="isScoreColumn(column.key)">
                    <v-chip v-if="item[column.key] != null" :color="getScoreColor(Number(item[column.key]))"
                      size="x-small" class="font-weight-bold">
                      {{ Number(item[column.key]).toFixed(2) }}
                    </v-chip>
                    <span v-else class="text-medium-emphasis">-</span>
                  </template>
                  <!-- Value columns -->
                  <span v-else>{{ item[column.key] ?? '-' }}</span>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>

  <!-- Comparison Fullscreen Dialog -->
  <v-dialog v-model="comparisonFullscreen" fullscreen transition="dialog-bottom-transition">
    <v-card class="d-flex flex-column" style="height: 100vh; overflow: hidden;">
      <v-card-title class="d-flex align-center flex-shrink-0">
        <v-icon start color="info">mdi-compare</v-icon>
        Test Item Comparison
        <v-chip class="ml-2" size="small" color="info">{{ totalFiles }} files</v-chip>
        <v-spacer />
        <v-btn variant="tonal" color="success" size="small" prepend-icon="mdi-microsoft-excel"
          :loading="exportingComparison" @click="exportComparisonToExcel" class="mr-2">
          Export
        </v-btn>
        <v-progress-circular v-if="iplasLoading" indeterminate size="20" width="2" color="primary" class="mr-2" />
        <v-chip v-if="iplasDataByIsn.size > 0" size="small" color="success" variant="tonal" class="mr-3">
          iPLAS: {{ iplasDataByIsn.size }} ISN(s)
        </v-chip>
        <v-btn icon="mdi-close" variant="text" @click="comparisonFullscreen = false" />
      </v-card-title>

      <v-card-text class="pb-2 pt-3 flex-shrink-0">
        <!-- Controls Row with Station filters, ISN filter, and Search -->
        <v-row dense>
          <v-col cols="6" md="2">
            <v-select v-model="selectedUploadedStation" :items="uploadedStationOptions" label="Station (Uploaded)"
              variant="outlined" density="compact" prepend-inner-icon="mdi-access-point" hide-details clearable />
          </v-col>
          <v-col cols="6" md="2">
            <v-select v-model="selectedIplasStation" :items="iplasStationOptions" label="Station (iPLAS)"
              variant="outlined" density="compact" prepend-inner-icon="mdi-router-wireless" hide-details clearable
              :disabled="iplasDataByIsn.size === 0" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="selectedCompareIsns" :items="allCompareIsns" label="ISNs to Compare" variant="outlined"
              density="compact" prepend-inner-icon="mdi-identifier" hide-details multiple chips closable-chips />
          </v-col>
          <v-col cols="6" md="2">
            <v-select v-model="itemFilterType" :items="itemFilterOptions" label="Filter Items" variant="outlined"
              density="compact" prepend-inner-icon="mdi-filter" hide-details />
          </v-col>
          <v-col cols="6" md="3">
            <v-text-field v-model="searchQuery" label="Search Test Items" variant="outlined" density="compact"
              prepend-inner-icon="mdi-magnify" hide-details clearable />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-text class="pa-0 flex-grow-1" style="overflow: hidden;">
        <!-- Comparison Table Fullscreen -->
        <v-data-table :headers="comparisonHeaders" :items="comparisonTableItems" :items-per-page="-1"
          density="comfortable" class="elevation-1" fixed-header :height="'calc(100vh - 180px)'">
          <!-- Custom row rendering -->
          <template #item="{ item, columns }">
            <tr>
              <td v-for="column in (columns as any[])" :key="column.key"
                :class="column.key === 'test_item' ? '' : 'text-center'">
                <span v-if="column.key === 'test_item'" class="font-weight-medium">
                  {{ item.test_item }}
                </span>
                <span v-else-if="column.key === 'usl' || column.key === 'lsl'" class="text-medium-emphasis">
                  {{ item[column.key] ?? '-' }}
                </span>
                <template v-else-if="isScoreColumn(column.key)">
                  <v-chip v-if="item[column.key] != null" :color="getScoreColor(Number(item[column.key]))"
                    size="x-small" class="font-weight-bold">
                    {{ Number(item[column.key]).toFixed(2) }}
                  </v-chip>
                  <span v-else class="text-medium-emphasis">-</span>
                </template>
                <span v-else>{{ item[column.key] ?? '-' }}</span>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Score Breakdown Dialog (new universal scoring) -->
  <v-dialog v-model="showBreakdownDialog" :fullscreen="breakdownFullscreen"
    :max-width="breakdownFullscreen ? undefined : 650" scrollable
    :transition="breakdownFullscreen ? 'dialog-bottom-transition' : undefined">
    <v-card v-if="breakdownItem">
      <v-card-title class="d-flex align-center bg-info">
        <v-icon start color="white">mdi-calculator-variant</v-icon>
        <span class="text-white">Score Breakdown</span>
        <v-spacer />
        <v-btn :icon="breakdownFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" variant="text" color="white"
          @click="breakdownFullscreen = !breakdownFullscreen" />
        <v-btn icon="mdi-close" variant="text" color="white" @click="showBreakdownDialog = false" />
      </v-card-title>

      <v-card-text class="pa-4">
        <!-- Test Item Info -->
        <v-card variant="tonal" class="mb-4">
          <v-card-text>
            <div class="text-h6 mb-2">{{ breakdownItem.test_item }}</div>
            <v-row dense>
              <v-col cols="4">
                <div class="text-caption text-medium-emphasis">Actual Value</div>
                <div class="text-h6 font-weight-bold">{{ breakdownItem.value }}</div>
              </v-col>
              <v-col cols="4">
                <div class="text-caption text-medium-emphasis">Score</div>
                <div class="text-h6 font-weight-bold">
                  <v-chip :color="getScoreColor(breakdownItem.score ?? 0)" size="small">
                    {{ breakdownItem.score?.toFixed(2) ?? 'N/A' }}
                  </v-chip>
                </div>
              </v-col>
              <v-col cols="4">
                <div class="text-caption text-medium-emphasis">Scoring Type</div>
                <v-chip :color="getScoringTypeColor(breakdownItem.score_breakdown?.scoring_type ?? '')" size="small">
                  {{ breakdownItem.score_breakdown?.scoring_type ?? 'N/A' }}
                </v-chip>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Breakdown Details Table -->
        <v-table density="compact">
          <tbody>
            <tr>
              <td class="font-weight-medium">Scoring Type</td>
              <td>
                <v-chip size="small" :color="getScoringTypeColor(breakdownItem.score_breakdown?.scoring_type ?? '')">
                  {{ breakdownItem.score_breakdown?.scoring_type }}
                </v-chip>
              </td>
            </tr>
            <tr v-if="breakdownItem.score_breakdown?.ucl !== null && breakdownItem.score_breakdown?.ucl !== undefined">
              <td class="font-weight-medium">UCL (Upper Limit)</td>
              <td>{{ breakdownItem.score_breakdown.ucl }}</td>
            </tr>
            <tr v-if="breakdownItem.score_breakdown?.lcl !== null && breakdownItem.score_breakdown?.lcl !== undefined">
              <td class="font-weight-medium">LCL (Lower Limit)</td>
              <td>{{ breakdownItem.score_breakdown.lcl }}</td>
            </tr>
            <tr
              v-if="breakdownItem.score_breakdown?.target !== null && breakdownItem.score_breakdown?.target !== undefined">
              <td class="font-weight-medium">Target</td>
              <td class="font-weight-bold text-primary">{{ breakdownItem.score_breakdown.target?.toFixed(2) }}
              </td>
            </tr>
            <tr
              v-if="breakdownItem.score_breakdown?.actual !== null && breakdownItem.score_breakdown?.actual !== undefined">
              <td class="font-weight-medium">Actual Value</td>
              <td class="font-weight-bold">{{ breakdownItem.score_breakdown.actual }}</td>
            </tr>
            <tr
              v-if="breakdownItem.score_breakdown?.deviation !== null && breakdownItem.score_breakdown?.deviation !== undefined">
              <td class="font-weight-medium">Deviation</td>
              <td :class="Math.abs(breakdownItem.score_breakdown.deviation!) > 1 ? 'text-error font-weight-bold' : ''">
                {{ breakdownItem.score_breakdown.deviation?.toFixed(2) }}
              </td>
            </tr>
            <tr v-if="breakdownItem.score_breakdown?.policy">
              <td class="font-weight-medium">Policy</td>
              <td>
                <v-chip size="x-small" variant="tonal">{{ breakdownItem.score_breakdown.policy }}</v-chip>
              </td>
            </tr>
            <tr>
              <td class="font-weight-medium">Weight</td>
              <td>{{ breakdownItem.score_breakdown?.weight ?? 1.0 }}</td>
            </tr>
            <tr class="bg-surface-variant">
              <td class="font-weight-bold">Score (0-10)</td>
              <td class="font-weight-bold">
                <v-chip :color="getScoreColor(breakdownItem.score_breakdown?.score ?? 0)" size="small">
                  {{ breakdownItem.score_breakdown?.score?.toFixed(2) ?? 'N/A' }}
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="text" @click="showBreakdownDialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Error Display -->
  <v-snackbar v-model="errorSnackbar" color="error" :timeout="5000" location="bottom">
    {{ errorMessage }}
    <template #actions>
      <v-btn variant="text" @click="errorSnackbar = false">Close</v-btn>
    </template>
  </v-snackbar>

  <!-- Criteria Builder Dialog -->
  <CriteriaBuilderDialog v-model="criteriaBuilderOpen" @criteria-created="handleCriteriaCreated" />

  <!-- UPDATED: Upload Scoring Config Dialog -->
  <UploadScoringConfigDialog v-model="showScoringConfigDialog" :test-items="extractedTestItems"
    :existing-configs="appliedScoringConfigs" :stations="extractedStations" :test-item-stations="testItemStationsMap"
    :default-station="selectedUploadedStation" @apply="handleScoringConfigApply" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { IplasIsnSearchRecord } from '@/features/dut-logs/api/iplasProxyApi'
import { useIplasApi } from '@/features/dut-logs/composables/useIplasApi'
import {
  type CompareItemEnhanced,
  type CompareResponseEnhanced,
  type FileSummaryEnhanced,
  type ParsedTestItemEnhanced,
  type PerIsnData,
  type RescoreItemResult,
  type RescoreScoringConfig,
  type TestLogParseResponseEnhanced,
  useTestLogUpload,
} from '@/features/dut-logs/composables/useTestLogUpload'
import { getErrorMessage } from '@/shared/utils'
import CriteriaBuilderDialog from './CriteriaBuilderDialog.vue'
import TopProductRankingUploadLog from './TopProductRankingUploadLog.vue'
import UploadScoringConfigDialog from './UploadScoringConfigDialog.vue'

// File inputs
const logFiles = ref<File[] | null>(null)
const criteriaFile = ref<File | null>(null)
const showOnlyCriteria = ref(false)

// Results
const parsingResult = ref<TestLogParseResponseEnhanced | null>(null)
const compareResult = ref<CompareResponseEnhanced | null>(null)

// UI state
const loading = ref(false)
const extractingItems = ref(false)
const errorSnackbar = ref(false)
const errorMessage = ref('')
const criteriaBuilderOpen = ref(false)

// Comparison section state
const itemFilterType = ref<string>('all')
const searchQuery = ref('')
const exportingComparison = ref(false)

// UPDATED: iPLAS comparison state
const iplasDataByIsn = ref<Map<string, IplasIsnSearchRecord[]>>(new Map())
const iplasLoading = ref(false)
const selectedIplasStation = ref<string | null>(null)
const selectedCompareIsns = ref<string[]>([])
const iplasScoredByIsn = ref<Map<string, Map<string, { score: number }>>>(new Map())

// Uploaded files station filter
const selectedUploadedStation = ref<string | null>(null)

// Scoring config state
const showScoringConfigDialog = ref(false)
const extractedTestItems = ref<ParsedTestItemEnhanced[]>([])
const extractedStations = ref<string[]>([])
const testItemStationsMap = ref<Map<string, Set<string>>>(new Map()) // Maps test item -> stations
const appliedScoringConfigs = ref<RescoreScoringConfig[]>([])

// Score breakdown dialog (new universal scoring)
const showBreakdownDialog = ref(false)
const breakdownFullscreen = ref(false)
const breakdownItem = ref<ParsedTestItemEnhanced | null>(null)

// Comparison section fullscreen
const comparisonFullscreen = ref(false)

// Composables
const { parseLog, compareLogs, rescoreItems } = useTestLogUpload()
const { searchByIsnBatch } = useIplasApi()

// Filter options for comparison section
const itemFilterOptions = [
  { title: 'Show All', value: 'all' },
  { title: 'Criteria Items', value: 'criteria' },
  { title: 'Non-Criteria Items', value: 'non-criteria' },
]

// Computed
const hasFiles = computed(() => {
  return logFiles.value && logFiles.value.length > 0
})

const canAnalyze = computed(() => {
  if (!logFiles.value) return false
  return logFiles.value.length >= 1
})

const hasResults = computed(() => {
  return parsingResult.value !== null || compareResult.value !== null
})

const isMultipleFiles = computed(() => {
  return (compareResult.value?.total_files ?? 0) > 1
})

const totalFiles = computed(() => {
  return compareResult.value?.total_files || 0
})

// UPDATED: All ISNs from comparison results
const allCompareIsns = computed<string[]>(() => {
  if (!compareResult.value?.file_summaries) return []
  return compareResult.value.file_summaries
    .map((s: FileSummaryEnhanced) => s.isn)
    .filter((isn: string | null): isn is string => isn !== null)
})

// Available stations from uploaded files
const uploadedStationOptions = computed(() => {
  if (!compareResult.value?.file_summaries) return []
  const stations = new Set<string>()
  compareResult.value.file_summaries.forEach((s: FileSummaryEnhanced) => {
    if (s.metadata?.station) {
      stations.add(s.metadata.station)
    }
  })
  return Array.from(stations).sort()
})

// ISNs currently displayed in the table columns (with station filter support)
const displayedIsns = computed(() => {
  // Start with manually selected ISNs, or all ISNs
  let isns = selectedCompareIsns.value.length > 0 ? selectedCompareIsns.value : allCompareIsns.value

  // Filter by uploaded station if selected
  if (selectedUploadedStation.value && compareResult.value?.file_summaries) {
    const isnsFromStation = new Set(
      compareResult.value.file_summaries
        .filter((s: FileSummaryEnhanced) => s.metadata?.station === selectedUploadedStation.value)
        .map((s: FileSummaryEnhanced) => s.isn)
        .filter((isn: string | null): isn is string => isn !== null),
    )
    isns = isns.filter((isn) => isnsFromStation.has(isn))
  }

  return isns
})

// Available iPLAS stations across all fetched ISN data
const iplasStationOptions = computed(() => {
  const stations = new Set<string>()
  for (const [, records] of iplasDataByIsn.value) {
    records.forEach((r) => {
      const name = r.display_station_name || r.station_name
      if (name) stations.add(name)
    })
  }
  return Array.from(stations)
})

// UPDATED: Dynamic parent-children headers for multi-ISN comparison
const comparisonHeaders = computed(() => {
  const isns = displayedIsns.value
  const headers: Record<string, unknown>[] = [
    { title: 'Test Item', key: 'test_item', sortable: true },
    { title: 'UCL', key: 'usl', sortable: true, width: '80px', align: 'center' as const },
    { title: 'LCL', key: 'lsl', sortable: true, width: '80px', align: 'center' as const },
  ]

  isns.forEach((isn, idx) => {
    headers.push({
      title: isn,
      align: 'center' as const,
      children: [
        { title: 'Uploaded', key: `uploaded_val_${idx}`, sortable: true, width: '100px' },
        { title: 'iPLAS', key: `iplas_val_${idx}`, sortable: true, width: '100px' },
      ],
    })
  })

  if (isns.length > 0) {
    const scoreChildren: Record<string, unknown>[] = []
    isns.forEach((isn, idx) => {
      const label = isn.length > 10 ? `...${isn.slice(-8)}` : isn
      scoreChildren.push(
        {
          title: `${label} (Upl)`,
          key: `uploaded_score_${idx}`,
          sortable: true,
          width: '100px',
          align: 'center' as const,
        },
        {
          title: `${label} (iPLAS)`,
          key: `iplas_score_${idx}`,
          sortable: true,
          width: '100px',
          align: 'center' as const,
        },
      )
    })
    headers.push({
      title: 'Score',
      align: 'center' as const,
      children: scoreChildren,
    })
  }

  return headers
})

// UPDATED: Comparison table items with per-ISN uploaded + iPLAS data
const comparisonTableItems = computed(() => {
  if (!compareResult.value) return []

  let items: CompareItemEnhanced[] = [
    ...(compareResult.value.comparison_value_items || []),
    ...(compareResult.value.comparison_non_value_items || []),
  ]

  const isns = displayedIsns.value

  // Filter to only items that have data for at least one of the displayed ISNs
  // This ensures station filter applies to test items as well
  if (isns.length > 0) {
    items = items.filter((item) =>
      item.per_isn_data.some((d) => d.isn !== null && isns.includes(d.isn)),
    )
  }

  // Apply criteria filters
  if (itemFilterType.value === 'criteria') {
    items = items.filter((item) => item.usl !== null || item.lsl !== null)
  } else if (itemFilterType.value === 'non-criteria') {
    items = items.filter((item) => item.usl === null && item.lsl === null)
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter((item) => item.test_item.toLowerCase().includes(query))
  }

  return items.map((item) => {
    const row: Record<string, unknown> = {
      test_item: item.test_item,
      usl: item.usl,
      lsl: item.lsl,
    }

    isns.forEach((isn, idx) => {
      // Uploaded data from comparison result
      const perIsn = item.per_isn_data.find((d) => d.isn === isn)
      row[`uploaded_val_${idx}`] = perIsn?.value ?? null
      row[`uploaded_score_${idx}`] = perIsn?.score ?? null

      // iPLAS data from fetched records
      const iplasRecords = iplasDataByIsn.value.get(isn)
      if (iplasRecords && iplasRecords.length > 0) {
        const stationRecord = selectedIplasStation.value
          ? iplasRecords.find(
              (r) =>
                r.display_station_name === selectedIplasStation.value ||
                r.station_name === selectedIplasStation.value,
            )
          : iplasRecords[0]
        if (stationRecord) {
          const iplasItem = stationRecord.test_item.find(
            (t) => t.NAME.toLowerCase() === item.test_item.toLowerCase(),
          )
          row[`iplas_val_${idx}`] = iplasItem?.VALUE ?? null
        }
      }

      // iPLAS score from rescored data
      const iplasScoredMap = iplasScoredByIsn.value.get(isn)
      if (iplasScoredMap) {
        const scored = iplasScoredMap.get(item.test_item.toLowerCase())
        row[`iplas_score_${idx}`] = scored?.score ?? null
      }
    })

    return row
  })
})

// Methods

/**
 * Quick-parse files to extract test item names and stations for scoring config dialog
 */
const extractTestItems = async (): Promise<void> => {
  if (!logFiles.value || logFiles.value.length === 0) return

  extractingItems.value = true
  try {
    const stations = new Set<string>()
    const itemsMap = new Map<string, ParsedTestItemEnhanced>()
    const itemStationsMap = new Map<string, Set<string>>() // Track which items appear in which stations

    // Helper to check if file is archive
    const isArchiveFile = (file: File) => {
      const ext = file.name.toLowerCase()
      return ext.endsWith('.zip') || ext.endsWith('.rar') || ext.endsWith('.7z')
    }

    const hasArchive = logFiles.value.some(isArchiveFile)

    if (hasArchive || logFiles.value.length > 1) {
      // Use compareLogs for archives or multiple files
      try {
        const result = await compareLogs(logFiles.value, criteriaFile.value, showOnlyCriteria.value)

        // Extract stations from file_summaries
        result.file_summaries?.forEach((summary: FileSummaryEnhanced) => {
          const station = summary.metadata?.station || 'Unknown'
          stations.add(station)
        })

        // Extract items from comparison_value_items and comparison_non_value_items
        const allItems = [
          ...(result.comparison_value_items || []),
          ...(result.comparison_non_value_items || []),
        ]

        // Build itemsMap and itemStationsMap from per_isn_data
        allItems.forEach((item: CompareItemEnhanced) => {
          if (!itemsMap.has(item.test_item)) {
            const firstData = item.per_isn_data?.[0]
            itemsMap.set(item.test_item, {
              test_item: item.test_item,
              value: firstData?.value || '',
              usl: item.usl,
              lsl: item.lsl,
              is_value_type: firstData?.is_value_type ?? false,
              numeric_value: firstData?.numeric_value ?? null,
              is_hex: firstData?.is_hex ?? false,
              hex_decimal: firstData?.hex_decimal ?? null,
              matched_criteria: item.matched_criteria || false,
              target: item.baseline,
              score: item.avg_score,
              score_breakdown: firstData?.score_breakdown ?? null,
            } as ParsedTestItemEnhanced)
          }

          // Track stations per item from file_summaries + per_isn_data
          if (!itemStationsMap.has(item.test_item)) {
            itemStationsMap.set(item.test_item, new Set())
          }
          item.per_isn_data?.forEach((data: PerIsnData) => {
            // Find the station for this ISN from file_summaries
            const summary = result.file_summaries?.find(
              (s: FileSummaryEnhanced) => s.isn === data.isn,
            )
            if (summary?.metadata?.station) {
              itemStationsMap.get(item.test_item)?.add(summary.metadata.station)
            }
          })
        })
      } catch (err: unknown) {
        console.warn(`Failed to compare files:`, getErrorMessage(err))
      }
    } else {
      // Single .txt file - use parseLog
      for (const file of logFiles.value) {
        try {
          const result = await parseLog(file, criteriaFile.value, showOnlyCriteria.value)
          const station = result.station || 'Unknown'
          stations.add(station)

          // Track items and their stations
          for (const item of result.parsed_items_enhanced || []) {
            // Keep first occurrence of each item
            if (!itemsMap.has(item.test_item)) {
              itemsMap.set(item.test_item, item)
            }
            // Track which stations have this item
            if (!itemStationsMap.has(item.test_item)) {
              itemStationsMap.set(item.test_item, new Set())
            }
            itemStationsMap.get(item.test_item)?.add(station)
          }
        } catch (err: unknown) {
          console.warn(`Failed to parse file ${file.name}:`, getErrorMessage(err))
        }
      }
    }

    extractedTestItems.value = Array.from(itemsMap.values())
    extractedStations.value = Array.from(stations).sort()
    testItemStationsMap.value = itemStationsMap
  } catch (err: unknown) {
    // If quick-parse fails, we can still open config dialog with empty items
    console.warn('Failed to extract test items for scoring config:', getErrorMessage(err))
    extractedTestItems.value = []
    extractedStations.value = []
    testItemStationsMap.value = new Map()
  } finally {
    extractingItems.value = false
  }
}

/**
 * Open scoring config dialog - extracts test items first if needed
 */
const handleConfigureScoring = async () => {
  if (extractedTestItems.value.length === 0) {
    await extractTestItems()
  }
  showScoringConfigDialog.value = true
}

/**
 * Handle scoring config applied from dialog
 */
const handleScoringConfigApply = (configs: RescoreScoringConfig[]) => {
  appliedScoringConfigs.value = configs
}

/**
 * Clear scoring configs
 */
const clearScoringConfigs = () => {
  appliedScoringConfigs.value = []
}

// ============================================
// iPLAS Comparison Data
// ============================================

/**
 * Fetch iPLAS data for all ISNs in the comparison using batch search
 */
const fetchIplasForComparison = async () => {
  const isns = allCompareIsns.value
  if (isns.length === 0) return

  iplasLoading.value = true
  try {
    const results = await searchByIsnBatch(isns)
    iplasDataByIsn.value = results

    // Auto-select first available station
    const stations = iplasStationOptions.value
    if (stations.length > 0 && !selectedIplasStation.value) {
      selectedIplasStation.value = stations[0] ?? null
    }

    // Rescore iPLAS data with current scoring configs
    await rescoreIplasData()
  } catch (err: unknown) {
    console.error('Failed to fetch iPLAS comparison data:', err)
  } finally {
    iplasLoading.value = false
  }
}

/**
 * Rescore iPLAS data for all ISNs using the applied scoring configs
 */
/**
 * Rescore iPLAS data for all ISNs using the applied scoring configs
 * UPDATED: Only score criteria items (with UCL or LCL) by default
 */
const rescoreIplasData = async () => {
  const isns = allCompareIsns.value
  iplasScoredByIsn.value = new Map()

  // Build set of explicitly configured item names
  const explicitlyConfigured = new Set(appliedScoringConfigs.value.map((c) => c.test_item_name))

  for (const isn of isns) {
    const records = iplasDataByIsn.value.get(isn) || []
    const stationRecord = selectedIplasStation.value
      ? records.find(
          (r) =>
            r.display_station_name === selectedIplasStation.value ||
            r.station_name === selectedIplasStation.value,
        )
      : records[0]

    if (!stationRecord || !stationRecord.test_item.length) continue

    // UPDATED: Filter to only criteria items (with limits) or explicitly configured items
    const testItems = stationRecord.test_item
      .filter((t) => {
        const hasLimits = (t.UCL && t.UCL !== '') || (t.LCL && t.LCL !== '')
        return hasLimits || explicitlyConfigured.has(t.NAME)
      })
      .map((t) => ({
        test_item: t.NAME,
        value: t.VALUE,
        usl: t.UCL ? parseFloat(t.UCL) : null,
        lsl: t.LCL ? parseFloat(t.LCL) : null,
        status: t.STATUS || 'PASS',
      }))

    if (testItems.length === 0) continue

    try {
      const result = await rescoreItems(testItems, appliedScoringConfigs.value)
      const scoreMap = new Map<string, { score: number }>()
      result.test_item_scores.forEach((score: RescoreItemResult) => {
        // Only add to map if score is not null
        if (score.score !== null) {
          scoreMap.set(score.test_item.toLowerCase(), { score: score.score })
        }
      })
      iplasScoredByIsn.value.set(isn, scoreMap)
    } catch (err: unknown) {
      console.error(`Failed to rescore iPLAS data for ${isn}:`, err)
    }
  }
}

/**
 * Check if a column key represents a score column (for chip rendering)
 */
function isScoreColumn(key: string | undefined): boolean {
  if (!key) return false
  return key.startsWith('uploaded_score_') || key.startsWith('iplas_score_')
}

const handleAnalyze = async () => {
  loading.value = true
  errorSnackbar.value = false

  try {
    const files = logFiles.value || []

    // Helper to check if file is archive
    const isArchiveFile = (file: File) => {
      const ext = file.name.toLowerCase()
      return ext.endsWith('.zip') || ext.endsWith('.rar') || ext.endsWith('.7z')
    }

    // Use compareLogs if multiple files OR single archive file
    const hasArchive = files.some(isArchiveFile)

    if (files.length === 1 && !hasArchive) {
      // Single .txt file - use parseLog
      const file = files[0]
      if (!file) {
        throw new Error('No file selected')
      }
      const result = await parseLog(
        file,
        criteriaFile.value,
        showOnlyCriteria.value,
        appliedScoringConfigs.value,
      )
      parsingResult.value = result
      compareResult.value = null

      // Also update extracted test items from latest parse
      extractedTestItems.value = result.parsed_items_enhanced || []
    } else {
      // Multiple files OR archive file - use compareLogs
      const result = await compareLogs(
        files,
        criteriaFile.value,
        showOnlyCriteria.value,
        appliedScoringConfigs.value,
      )
      compareResult.value = result
      parsingResult.value = null
    }
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error) || 'Analysis failed. Please try again.'
    errorSnackbar.value = true
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  logFiles.value = null
  criteriaFile.value = null
  showOnlyCriteria.value = false
  parsingResult.value = null
  compareResult.value = null
  searchQuery.value = ''
  itemFilterType.value = 'all'
  extractedTestItems.value = []
  extractedStations.value = []
  appliedScoringConfigs.value = []
  // UPDATED: Clear iPLAS comparison state
  iplasDataByIsn.value = new Map()
  iplasScoredByIsn.value = new Map()
  selectedIplasStation.value = null
  selectedCompareIsns.value = []
}

const openCriteriaBuilder = () => {
  criteriaBuilderOpen.value = true
}

const handleCriteriaCreated = (file: File) => {
  criteriaFile.value = file
}

const downloadCriteriaTemplate = () => {
  const template = {
    $comment: 'Criteria Configuration Template for Test Log Parser',
    criteria: [
      {
        test_item: 'WiFi_TX_POW_2462_11B_CCK11_B20',
        ucl: 20,
        lcl: 10,
        target: 15,
      },
      {
        test_item: 'BT_FREQ_KHZ',
        ucl: 2500000,
        lcl: 2400000,
        target: 2450000,
      },
    ],
  }
  const templateJson = JSON.stringify(template, null, 2)
  const blob = new Blob([templateJson], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'criteria_template.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const getScoreColor = (score: number): string => {
  if (score >= 9) return 'success' // 9-10: green
  if (score >= 7) return 'info' // 7-8.99: blue
  if (score >= 6) return 'warning' // 6-6.99: yellow/orange
  return 'error' // <6: red
}

/**
 * Export comparison table data to Excel
 */
async function exportComparisonToExcel() {
  exportingComparison.value = true
  try {
    const items = comparisonTableItems.value
    const isns = displayedIsns.value

    // Build export data with dynamic columns
    const exportData = items.map((item: Record<string, unknown>) => {
      const row: Record<string, unknown> = {
        'Test Item': item.test_item,
        UCL: item.usl ?? '',
        LCL: item.lsl ?? '',
      }

      isns.forEach((isn, idx) => {
        row[`${isn} Uploaded Value`] = item[`uploaded_val_${idx}`] ?? ''
        row[`${isn} iPLAS Value`] = item[`iplas_val_${idx}`] ?? ''
        row[`${isn} Uploaded Score`] = item[`uploaded_score_${idx}`] ?? ''
        row[`${isn} iPLAS Score`] = item[`iplas_score_${idx}`] ?? ''
      })

      return row
    })

    const ExcelJS = await import('exceljs')
    const workbook = new (ExcelJS.default || ExcelJS).Workbook()
    const worksheet = workbook.addWorksheet('Comparison')

    if (exportData.length > 0) {
      const rows = exportData as Array<Record<string, unknown>>
      const headers = Object.keys(rows[0] ?? {})
      worksheet.addRow(headers)
      rows.forEach((item) => {
        worksheet.addRow(headers.map((header) => item[header] ?? ''))
      })
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `Test_Item_Comparison_${timestamp}.xlsx`

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err: unknown) {
    console.error('Export failed:', err)
    errorMessage.value = `Export failed: ${getErrorMessage(err) || 'Unknown error'}`
    errorSnackbar.value = true
  } finally {
    exportingComparison.value = false
  }
}

const getScoringTypeColor = (type: string): string => {
  switch (type) {
    case 'symmetrical':
      return 'blue'
    case 'asymmetrical':
      return 'purple'
    case 'per_mask':
      return 'orange'
    case 'evm':
      return 'teal'
    case 'throughput':
      return 'green'
    case 'binary':
      return 'grey'
    default:
      return 'blue'
  }
}

/**
 * Show score breakdown for a comparison item (uses first ISN's data)
 */
// const showTestItemBreakdown = (item: CompareItemEnhanced) => {
//   const firstIsnData = item.per_isn_data?.[0]
//   if (firstIsnData) {
//     breakdownItem.value = {
//       test_item: item.test_item,
//       usl: item.usl,
//       lsl: item.lsl,
//       value: firstIsnData.value,
//       is_value_type: firstIsnData.is_value_type,
//       numeric_value: firstIsnData.numeric_value,
//       is_hex: firstIsnData.is_hex,
//       hex_decimal: firstIsnData.hex_decimal,
//       matched_criteria: item.matched_criteria,
//       target: null,
//       score: firstIsnData.score,
//       score_breakdown: firstIsnData.score_breakdown,
//     }
//     showBreakdownDialog.value = true
//   }
// }

// Watch for showOnlyCriteria changes and re-analyze if results exist
watch(showOnlyCriteria, async () => {
  if (hasResults.value && criteriaFile.value) {
    await handleAnalyze()
  }
})

// When files change, clear extracted items so they get re-extracted
watch(logFiles, () => {
  extractedTestItems.value = []
})

// UPDATED: Auto-fetch iPLAS data when comparison results are available
watch(compareResult, async (newVal) => {
  if (newVal) {
    await fetchIplasForComparison()
  }
})

// When iPLAS station changes, rescore iPLAS data
watch(selectedIplasStation, async () => {
  if (iplasDataByIsn.value.size > 0) {
    await rescoreIplasData()
  }
})
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}
</style>
