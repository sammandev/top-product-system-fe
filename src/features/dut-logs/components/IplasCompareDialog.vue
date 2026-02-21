<template>
  <v-dialog :model-value="modelValue" :fullscreen="isFullscreen" :max-width="isFullscreen ? undefined : 1400" scrollable
    @update:model-value="emit('update:modelValue', $event)"
    :transition="isFullscreen ? 'dialog-bottom-transition' : undefined">
    <v-card v-if="isn" class="d-flex flex-column"
      :style="isFullscreen ? 'height: 100vh; overflow: hidden;' : 'max-height: 90vh; overflow: hidden;'">
      <v-card-title class="d-flex align-center bg-primary flex-shrink-0">
        <v-icon start color="white">mdi-compare-horizontal</v-icon>
        <span class="text-white">Compare with iPLAS - {{ isn }}</span>
        <v-spacer />
        <v-btn :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" variant="text" color="white"
          @click="isFullscreen = !isFullscreen" />
        <v-btn icon="mdi-close" variant="text" color="white" @click="emit('update:modelValue', false)" />
      </v-card-title>

      <v-card-text class="pa-4 flex-grow-1 d-flex flex-column" style="overflow: hidden;">
        <!-- Loading State -->
        <div v-if="loading" class="d-flex flex-column align-center justify-center py-8">
          <v-progress-circular indeterminate color="primary" size="64" />
          <div class="mt-4 text-medium-emphasis">Fetching iPLAS data for {{ isn }}...</div>
        </div>

        <!-- Error State -->
        <v-alert v-else-if="errorMessage" type="error" variant="tonal" class="mb-4">
          {{ errorMessage }}
        </v-alert>

        <!-- No iPLAS Data -->
        <v-alert v-else-if="!iplasTestItems.length" type="warning" variant="tonal" class="mb-4">
          No iPLAS data found for ISN: {{ isn }}
        </v-alert>

        <!-- Comparison Table -->
        <template v-else>
          <!-- Controls Row: Search, Filter, Score Filter -->
          <v-row dense class="mb-3 flex-shrink-0">
            <v-col cols="12" md="3">
              <v-text-field v-model="searchQuery" label="Search (Regex)" placeholder="e.g. ^RF.*|Power"
                prepend-inner-icon="mdi-regex" variant="outlined" density="compact" hide-details clearable />
            </v-col>
            <v-col cols="6" md="2">
              <v-select v-model="typeFilter" :items="typeFilterOptions" label="Filter" variant="outlined"
                density="compact" hide-details />
            </v-col>
            <v-col cols="6" md="2">
              <v-select v-model="scoreFilter" :items="scoreFilterOptions" label="Score Filter" variant="outlined"
                density="compact" hide-details />
            </v-col>
            <v-col cols="6" md="3" class="d-flex align-center gap-2">
              <v-btn color="info" variant="tonal" prepend-icon="mdi-tune-variant" @click="showScoringConfig = true">
                Scoring
                <v-badge v-if="customScoringCount > 0" :content="customScoringCount" color="warning" inline
                  class="ml-1" />
              </v-btn>
            </v-col>
            <v-col cols="6" md="2" class="d-flex align-center">
              <v-btn color="success" variant="tonal" prepend-icon="mdi-microsoft-excel" block @click="exportToExcel"
                :loading="exporting">
                Export
              </v-btn>
            </v-col>
          </v-row>

          <!-- Filter Chips -->
          <v-chip-group v-model="comparisonFilter" mandatory class="mb-4 flex-shrink-0">
            <v-chip value="match" color="success" variant="flat">Match Items ({{ matchCount }})</v-chip>
            <v-chip value="mismatch" color="error" variant="flat">Mismatch Items ({{ mismatchCount }})</v-chip>
            <v-chip value="upload-only" color="warning" variant="flat">Uploaded Items ({{ uploadOnlyCount }})</v-chip>
            <v-chip value="iplas-only" color="info" variant="flat">iPLAS Items ({{ iplasOnlyCount }})</v-chip>
            <v-chip value="all" color="primary" variant="outlined">All ({{ comparisonItems.length }})</v-chip>
          </v-chip-group>

          <div class="flex-grow-1" style="overflow: auto;">
            <v-data-table :headers="comparisonHeaders" :items="filteredComparisonItems" :items-per-page="50"
              density="comfortable" class="elevation-1">
              <template #item.test_item="{ item }">
                <span class="font-weight-medium">{{ item.test_item }}</span>
              </template>
              <template #item.usl="{ item }">
                <span v-if="item.usl !== null">{{ item.usl }}</span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>
              <template #item.lsl="{ item }">
                <span v-if="item.lsl !== null">{{ item.lsl }}</span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>
              <template #item.upload_value="{ item }">
                <span v-if="item.upload_value !== null">{{ item.upload_value }}</span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>
              <template #item.iplas_value="{ item }">
                <span v-if="item.iplas_value !== null">{{ item.iplas_value }}</span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>
              <template #item.upload_score="{ item }">
                <v-chip v-if="item.upload_score !== null" :color="getScoreColor(item.upload_score)" size="small"
                  class="cursor-pointer" @click="showScoreBreakdown(item, 'upload')">
                  {{ item.upload_score?.toFixed(2) }}
                </v-chip>
                <span v-else class="text-medium-emphasis">-</span>
              </template>
              <template #item.iplas_score="{ item }">
                <v-chip v-if="item.iplas_score !== null" :color="getScoreColor(item.iplas_score)" size="small"
                  class="cursor-pointer" @click="showScoreBreakdown(item, 'iplas')">
                  {{ item.iplas_score?.toFixed(2) }}
                </v-chip>
                <span v-else class="text-medium-emphasis">-</span>
              </template>
            </v-data-table>
          </div>
        </template>
      </v-card-text>


    </v-card>
  </v-dialog>

  <!-- Score Breakdown Dialog -->
  <v-dialog v-model="showBreakdownDialog" :fullscreen="breakdownFullscreen"
    :max-width="breakdownFullscreen ? undefined : 600"
    :transition="breakdownFullscreen ? 'dialog-bottom-transition' : undefined">
    <v-card v-if="breakdownItem">
      <v-card-title class="d-flex align-center bg-info">
        <v-icon start color="white">mdi-calculator-variant</v-icon>
        <span class="text-white">Score Breakdown - {{ breakdownSource === 'upload' ? 'Uploaded' : 'iPLAS' }}</span>
        <v-spacer />
        <v-btn :icon="breakdownFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" variant="text" color="white"
          @click="breakdownFullscreen = !breakdownFullscreen" />
        <v-btn icon="mdi-close" variant="text" color="white" @click="showBreakdownDialog = false" />
      </v-card-title>
      <v-card-text class="pa-4">
        <v-table density="compact">
          <tbody>
            <tr>
              <td class="font-weight-medium">Test Item</td>
              <td>{{ breakdownItem.test_item }}</td>
            </tr>
            <tr>
              <td class="font-weight-medium">Value</td>
              <td>{{ breakdownSource === 'upload' ? breakdownItem.upload_value : breakdownItem.iplas_value }}</td>
            </tr>
            <tr>
              <td class="font-weight-medium">Score</td>
              <td>
                <v-chip
                  :color="getScoreColor(breakdownSource === 'upload' ? breakdownItem.upload_score! : breakdownItem.iplas_score!)"
                  size="small">
                  {{ (breakdownSource === 'upload' ? breakdownItem.upload_score : breakdownItem.iplas_score)?.toFixed(2)
                  }}
                </v-chip>
              </td>
            </tr>
            <tr v-if="breakdownItem.usl !== null">
              <td class="font-weight-medium">UCL</td>
              <td>{{ breakdownItem.usl }}</td>
            </tr>
            <tr v-if="breakdownItem.lsl !== null">
              <td class="font-weight-medium">LCL</td>
              <td>{{ breakdownItem.lsl }}</td>
            </tr>
            <tr>
              <td class="font-weight-medium">Scoring Type</td>
              <td>
                <v-chip size="small" color="primary" variant="tonal">
                  {{ breakdownScoringType }}
                </v-chip>
              </td>
            </tr>
            <tr v-if="breakdownTarget !== null">
              <td class="font-weight-medium">Target</td>
              <td>{{ breakdownTarget?.toFixed(4) }}</td>
            </tr>
            <tr v-if="breakdownDeviation !== null">
              <td class="font-weight-medium">Deviation</td>
              <td>{{ breakdownDeviation?.toFixed(4) }}</td>
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

  <!-- UPDATED: Use shared UploadScoringConfigDialog instead of inline scoring config -->
  <UploadScoringConfigDialog v-model="showScoringConfig" :test-items="scoringDialogTestItems"
    :existing-configs="localScoringConfigs" @apply="handleScoringConfigApply" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { IplasIsnTestItem } from '@/features/dut-logs/api/iplasProxyApi'
import { useIplasApi } from '@/features/dut-logs/composables/useIplasApi'
import type {
  ParsedTestItemEnhanced,
  RescoreItemResult,
  RescoreScoringConfig,
} from '@/features/dut-logs/composables/useTestLogUpload'
import { useTestLogUpload } from '@/features/dut-logs/composables/useTestLogUpload'

const props = defineProps<{
  modelValue: boolean
  isn: string | null
  uploadTestItems: ParsedTestItemEnhanced[]
  // UPDATED: Accept existing scoring configs from parent for unified scoring
  scoringConfigs?: RescoreScoringConfig[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

interface ComparisonItem {
  test_item: string
  usl: number | null
  lsl: number | null
  upload_value: string | null
  iplas_value: string | null
  upload_score: number | null
  iplas_score: number | null
  upload_scoring_type?: string
  iplas_scoring_type?: string
  upload_target?: number | null
  iplas_target?: number | null
  upload_deviation?: number | null
  iplas_deviation?: number | null
  // UPDATED: 'mismatch' no longer a status - mismatch filter combines upload-only + iplas-only
  status: 'match' | 'upload-only' | 'iplas-only'
}

const { searchByIsn } = useIplasApi()
const { rescoreItems } = useTestLogUpload()

const loading = ref(false)
const exporting = ref(false)
const isFullscreen = ref(false)
const errorMessage = ref<string | null>(null)
const iplasTestItems = ref<IplasIsnTestItem[]>([])
const comparisonFilter = ref('match')
const searchQuery = ref('')
const typeFilter = ref('all')
const scoreFilter = ref('all')

// Score breakdown dialog state
const showBreakdownDialog = ref(false)
const breakdownFullscreen = ref(false)
const breakdownItem = ref<ComparisonItem | null>(null)
const breakdownSource = ref<'upload' | 'iplas'>('upload')

// Rescored data
const uploadScoredMap = ref<Map<string, RescoreItemResult>>(new Map())
const iplasScoredMap = ref<Map<string, RescoreItemResult>>(new Map())

// Scoring configuration dialog state
const showScoringConfig = ref(false)
const localScoringConfigs = ref<RescoreScoringConfig[]>([])

// Count of custom scoring configs (extracted from template to avoid Biome parser crash)
const customScoringCount = computed(
  () =>
    localScoringConfigs.value.filter((c) => c.enabled && c.scoring_type !== 'symmetrical').length,
)

// UPDATED: Build test items for the shared UploadScoringConfigDialog - preserving original order
const scoringDialogTestItems = computed<ParsedTestItemEnhanced[]>(() => {
  const items: ParsedTestItemEnhanced[] = []
  const seenKeys = new Set<string>()

  // Add upload test items first (preserve original order from uploaded data)
  props.uploadTestItems.forEach((item) => {
    const key = item.test_item.toLowerCase()
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      items.push({ ...item })
    }
  })

  // Add iPLAS test items (only if not already from upload)
  iplasTestItems.value.forEach((iplasItem) => {
    const key = iplasItem.NAME.toLowerCase()
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      items.push({
        test_item: iplasItem.NAME,
        value: iplasItem.VALUE,
        usl: iplasItem.UCL ? parseFloat(iplasItem.UCL) : null,
        lsl: iplasItem.LCL ? parseFloat(iplasItem.LCL) : null,
        is_value_type: true,
        numeric_value: parseFloat(iplasItem.VALUE) || null,
        is_hex: false,
        hex_decimal: null,
        matched_criteria: false,
        target: null,
        score: null,
        score_breakdown: null,
      })
    }
  })

  return items
})

// UPDATED: Handle scoring config apply from shared dialog
function handleScoringConfigApply(configs: RescoreScoringConfig[]) {
  localScoringConfigs.value = configs
  rescoreAllItems()
}

function initializeScoringConfigs() {
  // Build scoring configs from all test items
  const allTestItems = new Set<string>()
  props.uploadTestItems.forEach((item) => allTestItems.add(item.test_item))
  iplasTestItems.value.forEach((item) => allTestItems.add(item.NAME))

  // UPDATED: Use provided configs as base (unified with parent tab scoring)
  const existingMap = new Map<string, RescoreScoringConfig>()
  if (props.scoringConfigs && props.scoringConfigs.length > 0) {
    props.scoringConfigs.forEach((cfg) => existingMap.set(cfg.test_item_name, cfg))
  }

  localScoringConfigs.value = Array.from(allTestItems).map((name) => {
    const existing = existingMap.get(name)
    if (existing) {
      return { ...existing }
    }
    return {
      test_item_name: name,
      scoring_type: 'symmetrical' as const,
      enabled: true,
      weight: 1.0,
      policy: 'symmetrical' as const,
    }
  })
}

const typeFilterOptions = [
  { title: 'Show All', value: 'all' },
  { title: 'Criteria', value: 'criteria' },
  { title: 'Non-Criteria', value: 'non-criteria' },
]

const scoreFilterOptions = [
  { title: 'All Scores', value: 'all' },
  { title: 'Score ≥ 9', value: 'gte9' },
  { title: 'Score 7-9', value: '7to9' },
  { title: 'Score < 7', value: 'lt7' },
  { title: 'Has Score', value: 'hasScore' },
  { title: 'No Score', value: 'noScore' },
]

const comparisonHeaders = [
  { title: 'Test Item', key: 'test_item', sortable: true },
  { title: 'UCL', key: 'usl', sortable: true, width: '100px', align: 'center' as const },
  { title: 'LCL', key: 'lsl', sortable: true, width: '100px', align: 'center' as const },
  { title: 'Uploaded Value', key: 'upload_value', sortable: true, width: '130px' },
  { title: 'iPLAS Value', key: 'iplas_value', sortable: true, width: '130px' },
  {
    title: 'Uploaded Score',
    key: 'upload_score',
    sortable: true,
    width: '120px',
    align: 'center' as const,
  },
  {
    title: 'iPLAS Score',
    key: 'iplas_score',
    sortable: true,
    width: '120px',
    align: 'center' as const,
  },
]

// Computed for breakdown dialog
const breakdownScoringType = computed(() => {
  if (!breakdownItem.value) return 'N/A'
  return breakdownSource.value === 'upload'
    ? breakdownItem.value.upload_scoring_type || 'symmetrical'
    : breakdownItem.value.iplas_scoring_type || 'symmetrical'
})

const breakdownTarget = computed(() => {
  if (!breakdownItem.value) return null
  return breakdownSource.value === 'upload'
    ? breakdownItem.value.upload_target
    : breakdownItem.value.iplas_target
})

const breakdownDeviation = computed(() => {
  if (!breakdownItem.value) return null
  return breakdownSource.value === 'upload'
    ? breakdownItem.value.upload_deviation
    : breakdownItem.value.iplas_deviation
})

// Scoring config helper functions are now in UploadScoringConfigDialog

// Build comparison items - preserving original order from uploaded data
const comparisonItems = computed<ComparisonItem[]>(() => {
  const items: ComparisonItem[] = []
  const uploadItemMap = new Map<string, ParsedTestItemEnhanced>()
  const iplasItemMap = new Map<string, IplasIsnTestItem>()
  const processedKeys = new Set<string>()

  // Build upload map
  props.uploadTestItems.forEach((item) => {
    uploadItemMap.set(item.test_item.toLowerCase(), item)
  })

  // Build iPLAS map
  iplasTestItems.value.forEach((item) => {
    iplasItemMap.set(item.NAME.toLowerCase(), item)
  })

  // Helper function to build a comparison item
  const buildComparisonItem = (testItemKey: string): ComparisonItem => {
    const uploadItem = uploadItemMap.get(testItemKey)
    const iplasItem = iplasItemMap.get(testItemKey)

    let status: ComparisonItem['status']
    if (uploadItem && iplasItem) {
      status = 'match'
    } else if (uploadItem) {
      status = 'upload-only'
    } else {
      status = 'iplas-only'
    }

    const uploadScored = uploadScoredMap.value.get(testItemKey)
    const iplasScored = iplasScoredMap.value.get(testItemKey)

    return {
      test_item: uploadItem?.test_item || iplasItem?.NAME || testItemKey,
      usl: uploadItem?.usl ?? (iplasItem?.UCL ? parseFloat(iplasItem.UCL) : null),
      lsl: uploadItem?.lsl ?? (iplasItem?.LCL ? parseFloat(iplasItem.LCL) : null),
      upload_value: uploadItem?.value ?? null,
      iplas_value: iplasItem?.VALUE ?? null,
      upload_score: uploadScored?.score ?? uploadItem?.score ?? null,
      iplas_score: iplasScored?.score ?? null,
      upload_scoring_type: uploadScored?.scoring_type ?? 'symmetrical',
      iplas_scoring_type: iplasScored?.scoring_type ?? 'symmetrical',
      upload_target: uploadScored?.target ?? null,
      iplas_target: iplasScored?.target ?? null,
      upload_deviation: uploadScored?.deviation ?? null,
      iplas_deviation: iplasScored?.deviation ?? null,
      status,
    }
  }

  // First, add items in the order they appear in uploaded data
  props.uploadTestItems.forEach((item) => {
    const key = item.test_item.toLowerCase()
    if (!processedKeys.has(key)) {
      processedKeys.add(key)
      items.push(buildComparisonItem(key))
    }
  })

  // Then, add iPLAS-only items that weren't in uploaded data
  iplasTestItems.value.forEach((item) => {
    const key = item.NAME.toLowerCase()
    if (!processedKeys.has(key)) {
      processedKeys.add(key)
      items.push(buildComparisonItem(key))
    }
  })

  return items
})

const filteredComparisonItems = computed(() => {
  let items = comparisonItems.value

  // UPDATED: Filter by comparison status (chips)
  if (comparisonFilter.value === 'match') {
    // Match Items: test items that exist in BOTH upload and iPLAS (same name)
    items = items.filter((item) => item.status === 'match')
  } else if (comparisonFilter.value === 'mismatch') {
    // Mismatch Items: test items that do NOT exist in both (only in one source)
    items = items.filter((item) => item.status === 'upload-only' || item.status === 'iplas-only')
  } else if (comparisonFilter.value === 'upload-only') {
    // Uploaded Items: ALL test items from the uploaded test logs
    items = items.filter((item) => item.status === 'match' || item.status === 'upload-only')
  } else if (comparisonFilter.value === 'iplas-only') {
    // iPLAS Items: ALL test items from iPLAS data
    items = items.filter((item) => item.status === 'match' || item.status === 'iplas-only')
  }
  // 'all' shows everything

  // Filter by type (Criteria / Non-Criteria)
  if (typeFilter.value === 'criteria') {
    items = items.filter((item) => item.usl !== null || item.lsl !== null)
  } else if (typeFilter.value === 'non-criteria') {
    items = items.filter((item) => item.usl === null && item.lsl === null)
  }

  // Filter by score
  if (scoreFilter.value === 'gte9') {
    items = items.filter((item) => item.upload_score !== null && item.upload_score >= 9)
  } else if (scoreFilter.value === '7to9') {
    items = items.filter(
      (item) => item.upload_score !== null && item.upload_score >= 7 && item.upload_score < 9,
    )
  } else if (scoreFilter.value === 'lt7') {
    items = items.filter((item) => item.upload_score !== null && item.upload_score < 7)
  } else if (scoreFilter.value === 'hasScore') {
    items = items.filter((item) => item.upload_score !== null)
  } else if (scoreFilter.value === 'noScore') {
    items = items.filter((item) => item.upload_score === null)
  }

  // Filter by search (regex)
  if (searchQuery.value) {
    try {
      const regex = new RegExp(searchQuery.value, 'i')
      items = items.filter((item) => regex.test(item.test_item))
    } catch {
      // Invalid regex, fall back to simple includes
      const query = searchQuery.value.toLowerCase()
      items = items.filter((item) => item.test_item.toLowerCase().includes(query))
    }
  }

  return items
})

// UPDATED: Counts reflect new filter semantics
const matchCount = computed(() => comparisonItems.value.filter((i) => i.status === 'match').length)
const mismatchCount = computed(
  () =>
    comparisonItems.value.filter((i) => i.status === 'upload-only' || i.status === 'iplas-only')
      .length,
)
const uploadOnlyCount = computed(
  () =>
    comparisonItems.value.filter((i) => i.status === 'match' || i.status === 'upload-only').length,
)
const iplasOnlyCount = computed(
  () =>
    comparisonItems.value.filter((i) => i.status === 'match' || i.status === 'iplas-only').length,
)

// Show score breakdown dialog
function showScoreBreakdown(item: ComparisonItem, source: 'upload' | 'iplas') {
  breakdownItem.value = item
  breakdownSource.value = source
  showBreakdownDialog.value = true
}

// Rescore items using the backend API
async function rescoreAllItems() {
  if (localScoringConfigs.value.length === 0) return

  // UPDATED: Build a set of explicitly configured item names for criteria-only default
  const explicitlyConfigured = new Set(localScoringConfigs.value.map((c) => c.test_item_name))

  try {
    // Rescore uploaded items - only criteria items by default
    const uploadItems = props.uploadTestItems
      .filter((item) => {
        const hasCriteria = item.usl !== null || item.lsl !== null
        return hasCriteria || explicitlyConfigured.has(item.test_item)
      })
      .map((item) => ({
        test_item: item.test_item,
        value: item.value,
        usl: item.usl,
        lsl: item.lsl,
        status: 'PASS',
      }))

    if (uploadItems.length > 0) {
      const uploadResult = await rescoreItems(uploadItems, localScoringConfigs.value)
      uploadScoredMap.value.clear()
      uploadResult.test_item_scores.forEach((score) => {
        uploadScoredMap.value.set(score.test_item.toLowerCase(), score)
      })
    }

    // Rescore iPLAS items with the same config - only criteria items by default
    const iplasItems = iplasTestItems.value
      .filter((item) => {
        const hasCriteria = (item.UCL && item.UCL !== '') || (item.LCL && item.LCL !== '')
        return hasCriteria || explicitlyConfigured.has(item.NAME)
      })
      .map((item) => ({
        test_item: item.NAME,
        value: item.VALUE,
        usl: item.UCL ? parseFloat(item.UCL) : null,
        lsl: item.LCL ? parseFloat(item.LCL) : null,
        status: item.STATUS || 'PASS',
      }))

    if (iplasItems.length > 0) {
      const iplasResult = await rescoreItems(iplasItems, localScoringConfigs.value)
      iplasScoredMap.value.clear()
      iplasResult.test_item_scores.forEach((score) => {
        iplasScoredMap.value.set(score.test_item.toLowerCase(), score)
      })
    }
  } catch (err) {
    console.error('Failed to rescore items:', err)
  }
}

// Fetch iPLAS data when dialog opens
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen && props.isn) {
      loading.value = true
      errorMessage.value = null
      iplasTestItems.value = []
      uploadScoredMap.value.clear()
      iplasScoredMap.value.clear()
      // Reset filters
      searchQuery.value = ''
      typeFilter.value = 'all'
      scoreFilter.value = 'all'
      comparisonFilter.value = 'match'

      try {
        const results = await searchByIsn(props.isn)
        // Combine all test items from all stations
        if (results && results.length > 0) {
          const allItems: IplasIsnTestItem[] = []
          results.forEach((record) => {
            if (record.test_item) {
              allItems.push(...record.test_item)
            }
          })
          iplasTestItems.value = allItems
        }

        // Initialize scoring configs
        initializeScoringConfigs()
        // Initial rescore with default symmetrical scoring
        await rescoreAllItems()
      } catch (err: unknown) {
        errorMessage.value = err instanceof Error ? err.message : 'Failed to fetch iPLAS data'
      } finally {
        loading.value = false
      }
    }
  },
)

// No longer need to watch props.scoringConfigs since we use local state

function getScoreColor(score: number): string {
  if (score >= 9) return 'success' // 9-10: green
  if (score >= 7) return 'info' // 7-8.99: blue
  if (score >= 6) return 'warning' // 6-6.99: yellow/orange
  return 'error' // <6: red
}

async function exportToExcel() {
  exporting.value = true
  try {
    // Prepare data for export
    const exportData = filteredComparisonItems.value.map((item) => ({
      'Test Item': item.test_item,
      UCL: item.usl ?? '',
      LCL: item.lsl ?? '',
      'Uploaded Value': item.upload_value ?? '',
      'iPLAS Value': item.iplas_value ?? '',
      'Uploaded Score': item.upload_score ?? '',
      'iPLAS Score': item.iplas_score ?? '',
      Status: item.status,
    }))

    const ExcelJS = await import('exceljs')
    const workbook = new (ExcelJS.default || ExcelJS).Workbook()
    const worksheet = workbook.addWorksheet(props.isn || 'Comparison')

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
    const filename = `iPLAS_Compare_${props.isn}_${timestamp}.xlsx`

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
    errorMessage.value = `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
