<template>
  <v-dialog :model-value="modelValue" max-width="1400" scrollable @update:model-value="emit('update:modelValue', $event)">
    <v-card v-if="isn">
      <v-card-title class="d-flex align-center bg-primary">
        <v-icon start color="white">mdi-compare-horizontal</v-icon>
        <span class="text-white">Compare with iPLAS - {{ isn }}</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" @click="emit('update:modelValue', false)" />
      </v-card-title>

      <v-card-text class="pa-4">
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
          <v-row dense class="mb-3">
            <v-col cols="12" md="3">
              <v-text-field
                v-model="searchQuery"
                label="Search (Regex)"
                placeholder="e.g. ^RF.*|Power"
                prepend-inner-icon="mdi-regex"
                variant="outlined"
                density="compact"
                hide-details
                clearable
              />
            </v-col>
            <v-col cols="6" md="2">
              <v-select
                v-model="typeFilter"
                :items="typeFilterOptions"
                label="Filter"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="6" md="2">
              <v-select
                v-model="scoreFilter"
                :items="scoreFilterOptions"
                label="Score Filter"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="6" md="3" class="d-flex align-center gap-2">
              <v-btn
                color="info"
                variant="tonal"
                prepend-icon="mdi-tune-variant"
                @click="showScoringConfig = true"
              >
                Scoring
                <v-badge
                  v-if="localScoringConfigs.filter(c => c.enabled && c.scoring_type !== 'symmetrical').length > 0"
                  :content="localScoringConfigs.filter(c => c.enabled && c.scoring_type !== 'symmetrical').length"
                  color="warning"
                  inline
                  class="ml-1"
                />
              </v-btn>
            </v-col>
            <v-col cols="6" md="2" class="d-flex align-center">
              <v-btn
                color="success"
                variant="tonal"
                prepend-icon="mdi-microsoft-excel"
                block
                @click="exportToExcel"
                :loading="exporting"
              >
                Export
              </v-btn>
            </v-col>
          </v-row>

          <!-- Filter Chips -->
          <v-chip-group v-model="comparisonFilter" mandatory class="mb-4">
            <v-chip value="match" color="success" variant="flat">Match ({{ matchCount }})</v-chip>
            <v-chip value="mismatch" color="error" variant="flat">Mismatch ({{ mismatchCount }})</v-chip>
            <v-chip value="upload-only" color="warning" variant="flat">Upload Only ({{ uploadOnlyCount }})</v-chip>
            <v-chip value="iplas-only" color="info" variant="flat">iPLAS Only ({{ iplasOnlyCount }})</v-chip>
            <v-chip value="all" color="primary" variant="outlined">All ({{ comparisonItems.length }})</v-chip>
          </v-chip-group>

          <v-data-table :headers="comparisonHeaders" :items="filteredComparisonItems" 
            :items-per-page="50" density="comfortable" class="elevation-1">
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
              <v-chip 
                v-if="item.upload_score !== null" 
                :color="getScoreColor(item.upload_score)" 
                size="small"
                class="cursor-pointer"
                @click="showScoreBreakdown(item, 'upload')"
              >
                {{ item.upload_score?.toFixed(2) }}
              </v-chip>
              <span v-else class="text-medium-emphasis">-</span>
            </template>
            <template #item.iplas_score="{ item }">
              <v-chip 
                v-if="item.iplas_score !== null" 
                :color="getScoreColor(item.iplas_score)" 
                size="small"
                class="cursor-pointer"
                @click="showScoreBreakdown(item, 'iplas')"
              >
                {{ item.iplas_score?.toFixed(2) }}
              </v-chip>
              <span v-else class="text-medium-emphasis">-</span>
            </template>
          </v-data-table>
        </template>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="text" @click="emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Score Breakdown Dialog -->
  <v-dialog v-model="showBreakdownDialog" max-width="600">
    <v-card v-if="breakdownItem">
      <v-card-title class="d-flex align-center bg-info">
        <v-icon start color="white">mdi-calculator-variant</v-icon>
        <span class="text-white">Score Breakdown - {{ breakdownSource === 'upload' ? 'Uploaded' : 'iPLAS' }}</span>
        <v-spacer />
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
                  size="small"
                >
                  {{ (breakdownSource === 'upload' ? breakdownItem.upload_score : breakdownItem.iplas_score)?.toFixed(2) }}
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

  <!-- Scoring Configuration Dialog -->
  <v-dialog v-model="showScoringConfig" max-width="900" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center bg-info">
        <v-icon start color="white">mdi-tune-variant</v-icon>
        <span class="text-white">Configure Scoring</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" @click="showScoringConfig = false" />
      </v-card-title>

      <v-card-text class="pa-0">
        <v-row no-gutters>
          <!-- Left Panel: Test Items List -->
          <v-col cols="5" class="border-e">
            <div class="pa-3">
              <v-text-field
                v-model="scoringSearchQuery"
                label="Search Test Items"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
                clearable
                class="mb-3"
              />

              <!-- Quick Actions -->
              <div class="d-flex flex-wrap gap-1 mb-3">
                <v-btn size="x-small" variant="tonal" color="primary" @click="setAllScoringType('symmetrical')">
                  All Symmetrical
                </v-btn>
                <v-btn size="x-small" variant="tonal" color="secondary" @click="setAllScoringType('asymmetrical')">
                  All Asymmetrical
                </v-btn>
              </div>

              <!-- Test Items List -->
              <v-virtual-scroll :items="filteredScoringItems" :height="400" item-height="48">
                <template #default="{ item }">
                  <v-list-item
                    :key="item.test_item_name"
                    density="compact"
                    :class="{ 'bg-primary-lighten-5': selectedScoringItem === item.test_item_name }"
                    @click="selectScoringItem(item.test_item_name)"
                  >
                    <v-list-item-title class="text-body-2 text-truncate">
                      {{ item.test_item_name }}
                    </v-list-item-title>

                    <template #append>
                      <v-chip :color="getScoringTypeColor(item.scoring_type)" size="x-small" variant="tonal">
                        {{ getScoringTypeLabel(item.scoring_type) }}
                      </v-chip>
                    </template>
                  </v-list-item>
                </template>
              </v-virtual-scroll>

              <div class="text-caption text-medium-emphasis pa-2">
                {{ filteredScoringItems.length }} of {{ localScoringConfigs.length }} items
              </div>
            </div>
          </v-col>

          <!-- Right Panel: Selected Item Configuration -->
          <v-col cols="7">
            <div class="pa-4">
              <template v-if="selectedScoringConfig">
                <div class="d-flex align-center mb-4">
                  <v-icon color="primary" class="mr-2">mdi-cog</v-icon>
                  <span class="text-h6 text-truncate">{{ selectedScoringConfig.test_item_name }}</span>
                </div>

                <!-- Scoring Type Selection -->
                <v-select
                  v-model="selectedScoringConfig.scoring_type"
                  :items="scoringTypeOptions"
                  item-title="label"
                  item-value="value"
                  label="Scoring Type"
                  variant="outlined"
                  density="compact"
                  class="mb-4"
                >
                  <template #prepend-inner>
                    <v-icon :color="getScoringTypeColor(selectedScoringConfig.scoring_type)">
                      {{ getScoringTypeIcon(selectedScoringConfig.scoring_type) }}
                    </v-icon>
                  </template>
                </v-select>

                <!-- Type Description -->
                <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                  <div class="text-body-2">
                    {{ getScoringTypeDescription(selectedScoringConfig.scoring_type) }}
                  </div>
                </v-alert>

                <!-- Asymmetrical Policy -->
                <v-select
                  v-if="selectedScoringConfig.scoring_type === 'asymmetrical'"
                  v-model="selectedScoringConfig.policy"
                  :items="policyOptions"
                  item-title="label"
                  item-value="value"
                  label="Policy"
                  variant="outlined"
                  density="compact"
                  class="mb-4"
                />

                <!-- Weight -->
                <v-text-field
                  v-model.number="selectedScoringConfig.weight"
                  label="Weight"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  variant="outlined"
                  density="compact"
                  hint="Weight for aggregate scoring (0-10)"
                  persistent-hint
                >
                  <template #append-inner>
                    <v-chip size="x-small" color="primary">×{{ selectedScoringConfig.weight.toFixed(1) }}</v-chip>
                  </template>
                </v-text-field>
              </template>

              <v-alert v-else type="info" variant="tonal" class="mt-4">
                Select a test item to configure its scoring parameters.
              </v-alert>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-btn variant="text" color="grey" @click="resetScoringConfigs">
          <v-icon start>mdi-restore</v-icon>
          Reset All
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="showScoringConfig = false">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" @click="applyScoringConfigs">
          <v-icon start>mdi-check</v-icon>
          Apply
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ParsedTestItemEnhanced, RescoreScoringConfig, RescoreItemResult } from '@/features/dut_logs/composables/useTestLogUpload'
import { useTestLogUpload } from '@/features/dut_logs/composables/useTestLogUpload'
import type { IplasIsnTestItem } from '@/features/dut_logs/api/iplasProxyApi'
import { useIplasApi } from '@/features/dut_logs/composables/useIplasApi'

const props = defineProps<{
  modelValue: boolean
  isn: string | null
  uploadTestItems: ParsedTestItemEnhanced[]
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
  status: 'match' | 'mismatch' | 'upload-only' | 'iplas-only'
}

const { searchByIsn } = useIplasApi()
const { rescoreItems } = useTestLogUpload()

const loading = ref(false)
const exporting = ref(false)
const errorMessage = ref<string | null>(null)
const iplasTestItems = ref<IplasIsnTestItem[]>([])
const comparisonFilter = ref('match')
const searchQuery = ref('')
const typeFilter = ref('all')
const scoreFilter = ref('all')

// Score breakdown dialog state
const showBreakdownDialog = ref(false)
const breakdownItem = ref<ComparisonItem | null>(null)
const breakdownSource = ref<'upload' | 'iplas'>('upload')

// Rescored data
const uploadScoredMap = ref<Map<string, RescoreItemResult>>(new Map())
const iplasScoredMap = ref<Map<string, RescoreItemResult>>(new Map())

// Scoring configuration dialog state
const showScoringConfig = ref(false)
const scoringSearchQuery = ref('')
const selectedScoringItem = ref<string | null>(null)
const localScoringConfigs = ref<RescoreScoringConfig[]>([])

// Scoring type options for the config dialog
const scoringTypeOptions = [
  { label: 'Symmetrical', value: 'symmetrical' },
  { label: 'Asymmetrical', value: 'asymmetrical' }
]

const policyOptions = [
  { label: 'Higher is Better', value: 'higher' },
  { label: 'Lower is Better', value: 'lower' }
]

const typeFilterOptions = [
  { title: 'Show All', value: 'all' },
  { title: 'Criteria', value: 'criteria' },
  { title: 'Non-Criteria', value: 'non-criteria' }
]

const scoreFilterOptions = [
  { title: 'All Scores', value: 'all' },
  { title: 'Score ≥ 9', value: 'gte9' },
  { title: 'Score 7-9', value: '7to9' },
  { title: 'Score < 7', value: 'lt7' },
  { title: 'Has Score', value: 'hasScore' },
  { title: 'No Score', value: 'noScore' }
]

const comparisonHeaders = [
  { title: 'Test Item', key: 'test_item', sortable: true },
  { title: 'UCL', key: 'usl', sortable: true, width: '100px', align: 'center' as const },
  { title: 'LCL', key: 'lsl', sortable: true, width: '100px', align: 'center' as const },
  { title: 'Uploaded Value', key: 'upload_value', sortable: true, width: '130px' },
  { title: 'iPLAS Value', key: 'iplas_value', sortable: true, width: '130px' },
  { title: 'Uploaded Score', key: 'upload_score', sortable: true, width: '120px', align: 'center' as const },
  { title: 'iPLAS Score', key: 'iplas_score', sortable: true, width: '120px', align: 'center' as const }
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

// Filtered scoring items for the config dialog
const filteredScoringItems = computed(() => {
  if (!scoringSearchQuery.value) return localScoringConfigs.value
  const query = scoringSearchQuery.value.toLowerCase()
  return localScoringConfigs.value.filter(item =>
    item.test_item_name.toLowerCase().includes(query)
  )
})

// Selected scoring config
const selectedScoringConfig = computed(() => {
  if (!selectedScoringItem.value) return null
  return localScoringConfigs.value.find(c => c.test_item_name === selectedScoringItem.value) || null
})

// Scoring config helper functions
function getScoringTypeColor(type: string): string {
  switch (type) {
    case 'symmetrical': return 'success'
    case 'asymmetrical': return 'warning'
    case 'binary': return 'grey'
    default: return 'primary'
  }
}

function getScoringTypeLabel(type: string): string {
  switch (type) {
    case 'symmetrical': return 'Sym'
    case 'asymmetrical': return 'Asym'
    case 'binary': return 'Bin'
    default: return type
  }
}

function getScoringTypeIcon(type: string): string {
  switch (type) {
    case 'symmetrical': return 'mdi-arrow-left-right'
    case 'asymmetrical': return 'mdi-arrow-up'
    default: return 'mdi-help'
  }
}

function getScoringTypeDescription(type: string): string {
  switch (type) {
    case 'symmetrical': return 'Score based on distance from target (center of UCL/LCL). Equal penalty for above or below target.'
    case 'asymmetrical': return 'Score based on distance from limit. Use Higher or Lower policy to set preferred direction.'
    default: return 'Unknown scoring type'
  }
}

function selectScoringItem(testItemName: string) {
  selectedScoringItem.value = testItemName
}

function setAllScoringType(type: 'symmetrical' | 'asymmetrical') {
  localScoringConfigs.value.forEach(config => {
    config.scoring_type = type
  })
}

function resetScoringConfigs() {
  initializeScoringConfigs()
  selectedScoringItem.value = null
}

function applyScoringConfigs() {
  showScoringConfig.value = false
  rescoreAllItems()
}

function initializeScoringConfigs() {
  // Build scoring configs from all test items
  const allTestItems = new Set<string>()
  props.uploadTestItems.forEach(item => allTestItems.add(item.test_item))
  iplasTestItems.value.forEach(item => allTestItems.add(item.NAME))

  localScoringConfigs.value = Array.from(allTestItems).map(name => ({
    test_item_name: name,
    scoring_type: 'symmetrical' as const,
    enabled: true,
    weight: 1.0,
    policy: 'symmetrical' as const
  }))
}

// Build comparison items
const comparisonItems = computed<ComparisonItem[]>(() => {
  const items: ComparisonItem[] = []
  const uploadItemMap = new Map<string, ParsedTestItemEnhanced>()
  const iplasItemMap = new Map<string, IplasIsnTestItem>()

  // Build upload map
  props.uploadTestItems.forEach(item => {
    uploadItemMap.set(item.test_item.toLowerCase(), item)
  })

  // Build iPLAS map
  iplasTestItems.value.forEach(item => {
    iplasItemMap.set(item.NAME.toLowerCase(), item)
  })

  // Get all unique test item names
  const allTestItems = new Set([
    ...Array.from(uploadItemMap.keys()),
    ...Array.from(iplasItemMap.keys())
  ])

  allTestItems.forEach(testItemKey => {
    const uploadItem = uploadItemMap.get(testItemKey)
    const iplasItem = iplasItemMap.get(testItemKey)

    let status: ComparisonItem['status']
    if (uploadItem && iplasItem) {
      // Compare values
      const uploadVal = uploadItem.value?.toString().trim()
      const iplasVal = iplasItem.VALUE?.toString().trim()
      status = uploadVal === iplasVal ? 'match' : 'mismatch'
    } else if (uploadItem) {
      status = 'upload-only'
    } else {
      status = 'iplas-only'
    }

    // Get rescored data if available
    const uploadScored = uploadScoredMap.value.get(testItemKey)
    const iplasScored = iplasScoredMap.value.get(testItemKey)

    items.push({
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
      status
    })
  })

  // Sort by test item name
  return items.sort((a, b) => a.test_item.localeCompare(b.test_item))
})

const filteredComparisonItems = computed(() => {
  let items = comparisonItems.value

  // Filter by comparison status (chips)
  if (comparisonFilter.value !== 'all') {
    items = items.filter(item => item.status === comparisonFilter.value)
  }

  // Filter by type (Criteria / Non-Criteria)
  if (typeFilter.value === 'criteria') {
    items = items.filter(item => item.usl !== null || item.lsl !== null)
  } else if (typeFilter.value === 'non-criteria') {
    items = items.filter(item => item.usl === null && item.lsl === null)
  }

  // Filter by score
  if (scoreFilter.value === 'gte9') {
    items = items.filter(item => item.upload_score !== null && item.upload_score >= 9)
  } else if (scoreFilter.value === '7to9') {
    items = items.filter(item => item.upload_score !== null && item.upload_score >= 7 && item.upload_score < 9)
  } else if (scoreFilter.value === 'lt7') {
    items = items.filter(item => item.upload_score !== null && item.upload_score < 7)
  } else if (scoreFilter.value === 'hasScore') {
    items = items.filter(item => item.upload_score !== null)
  } else if (scoreFilter.value === 'noScore') {
    items = items.filter(item => item.upload_score === null)
  }

  // Filter by search (regex)
  if (searchQuery.value) {
    try {
      const regex = new RegExp(searchQuery.value, 'i')
      items = items.filter(item => regex.test(item.test_item))
    } catch {
      // Invalid regex, fall back to simple includes
      const query = searchQuery.value.toLowerCase()
      items = items.filter(item => item.test_item.toLowerCase().includes(query))
    }
  }

  return items
})

const matchCount = computed(() => comparisonItems.value.filter(i => i.status === 'match').length)
const mismatchCount = computed(() => comparisonItems.value.filter(i => i.status === 'mismatch').length)
const uploadOnlyCount = computed(() => comparisonItems.value.filter(i => i.status === 'upload-only').length)
const iplasOnlyCount = computed(() => comparisonItems.value.filter(i => i.status === 'iplas-only').length)

// Show score breakdown dialog
function showScoreBreakdown(item: ComparisonItem, source: 'upload' | 'iplas') {
  breakdownItem.value = item
  breakdownSource.value = source
  showBreakdownDialog.value = true
}

// Rescore items using the backend API
async function rescoreAllItems() {
  if (localScoringConfigs.value.length === 0) return

  try {
    // Rescore uploaded items
    const uploadItems = props.uploadTestItems.map(item => ({
      test_item: item.test_item,
      value: item.value,
      usl: item.usl,
      lsl: item.lsl,
      status: 'PASS'
    }))

    if (uploadItems.length > 0) {
      const uploadResult = await rescoreItems(uploadItems, localScoringConfigs.value)
      uploadScoredMap.value.clear()
      uploadResult.test_item_scores.forEach(score => {
        uploadScoredMap.value.set(score.test_item.toLowerCase(), score)
      })
    }

    // Rescore iPLAS items with the same config
    const iplasItems = iplasTestItems.value.map(item => ({
      test_item: item.NAME,
      value: item.VALUE,
      usl: item.UCL ? parseFloat(item.UCL) : null,
      lsl: item.LCL ? parseFloat(item.LCL) : null,
      status: item.STATUS || 'PASS'
    }))

    if (iplasItems.length > 0) {
      const iplasResult = await rescoreItems(iplasItems, localScoringConfigs.value)
      iplasScoredMap.value.clear()
      iplasResult.test_item_scores.forEach(score => {
        iplasScoredMap.value.set(score.test_item.toLowerCase(), score)
      })
    }
  } catch (err) {
    console.error('Failed to rescore items:', err)
  }
}

// Fetch iPLAS data when dialog opens
watch(() => props.modelValue, async (isOpen) => {
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
        results.forEach(record => {
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
    } catch (err: any) {
      errorMessage.value = err.message || 'Failed to fetch iPLAS data'
    } finally {
      loading.value = false
    }
  }
})

// No longer need to watch props.scoringConfigs since we use local state

function getScoreColor(score: number): string {
  if (score >= 9) return 'success'
  if (score >= 7) return 'warning'
  return 'error'
}

async function exportToExcel() {
  exporting.value = true
  try {
    // Prepare data for export
    const exportData = filteredComparisonItems.value.map(item => ({
      'Test Item': item.test_item,
      'UCL': item.usl ?? '',
      'LCL': item.lsl ?? '',
      'Uploaded Value': item.upload_value ?? '',
      'iPLAS Value': item.iplas_value ?? '',
      'Uploaded Score': item.upload_score ?? '',
      'iPLAS Score': item.iplas_score ?? '',
      'Status': item.status
    }))

    // Dynamic import for xlsx
    const XLSX = await import('xlsx')
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, props.isn || 'Comparison')
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `iPLAS_Compare_${props.isn}_${timestamp}.xlsx`
    
    XLSX.writeFile(workbook, filename)
  } catch (err: any) {
    console.error('Export failed:', err)
    errorMessage.value = 'Export failed: ' + (err.message || 'Unknown error')
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
