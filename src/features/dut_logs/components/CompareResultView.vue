<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon start>mdi-compare</v-icon>
      Comparison Results
      <v-chip class="ml-2" color="primary" size="small">
        {{ result.total_files }} files
      </v-chip>
      <v-spacer />
      <!-- Export Buttons -->
      <v-btn variant="outlined" color="success" prepend-icon="mdi-microsoft-excel" size="default" class="mr-2"
        @click="$emit('export-excel')">
        Excel
      </v-btn>
      <v-btn variant="outlined" color="error" prepend-icon="mdi-file-pdf-box" size="default" class="mr-2"
        @click="$emit('export-pdf')">
        PDF
      </v-btn>
      <v-btn variant="outlined" prepend-icon="mdi-content-copy" size="default" @click="$emit('copy-clipboard')">
        Copy
      </v-btn>
    </v-card-title>

    <v-card-text>
      <!-- Summary Statistics -->
      <v-row dense class="mb-4">
        <v-col cols="12" md="4">
          <v-card variant="tonal" color="primary">
            <v-card-text class="text-center py-3">
              <div class="text-h5 font-weight-bold">{{ result.total_value_items }}</div>
              <div class="text-caption">Value Items</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card variant="tonal" color="secondary">
            <v-card-text class="text-center py-3">
              <div class="text-h5 font-weight-bold">{{ result.total_non_value_items }}</div>
              <div class="text-caption">Non-Value Items</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card variant="tonal" color="info">
            <v-card-text class="text-center py-3">
              <div class="text-h5 font-weight-bold">{{ result.total_files }}</div>
              <div class="text-caption">ISNs Compared</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Value Items Table -->
      <v-card variant="outlined" class="mb-4">
        <v-card-title class="bg-primary-lighten-5 d-flex align-center">
          <v-icon start>mdi-numeric</v-icon>
          Value Items (Numeric Data)
          <v-chip class="ml-2" size="small">{{ filteredValueItems.length }}</v-chip>
          <v-spacer />
          <v-icon color="primary" size="large" @click="valueFullscreen = true">mdi-fullscreen</v-icon>
        </v-card-title>
        <v-card-text class="pa-0">
          <v-data-table :headers="valueHeaders" :items="paginatedValueItems" :items-per-page="valueItemsPerPage"
            density="compact" fixed-header height="500" hide-default-footer striped="even">
            <template #top>
              <div class="pa-3">
                <!-- Search and Filters Row -->
                <v-row dense>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="valueSearch" prepend-inner-icon="mdi-magnify" label="Search test items..."
                      variant="outlined" density="compact" clearable hide-details />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-select v-model="valueScoreFilter" :items="scoreFilterOptions" label="Score Filter"
                      variant="outlined" density="compact" clearable hide-details />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-select v-model="valueLimitFilter" :items="limitFilterOptions" label="Limit Status"
                      variant="outlined" density="compact" clearable hide-details />
                  </v-col>
                </v-row>
              </div>
            </template>
            <template #item.test_item="{ item }">
              <div class="text-body-2 font-weight-medium text-no-wrap">{{ item.test_item }}</div>
            </template>
            <template #item.usl="{ item }">
              <span class="text-caption">{{ formatRawNumber(item.usl) }}</span>
            </template>
            <template #item.lsl="{ item }">
              <span class="text-caption">{{ formatRawNumber(item.lsl) }}</span>
            </template>
            <template #item.target="{ item }">
              <v-chip size="small" color="info" variant="tonal">
                {{ formatRawNumber(item.per_isn_data?.[0]?.score_breakdown?.target_used ?? item.baseline) }}
              </v-chip>
            </template>
            <template v-for="(_, index) in Array(getIsnCount())" :key="`isn-${index}`"
              #[`item.isn_${index}`]="{ item: rowItem }">
              <div v-if="rowItem.per_isn_data && rowItem.per_isn_data[index]" class="d-flex flex-column gap-1 py-1">
                <div class="text-caption">
                  <strong>V:</strong> {{ rowItem.per_isn_data[index].value }}
                </div>
                <div class="text-caption"
                  :class="getDeviationClass(rowItem.per_isn_data[index].score_breakdown?.deviation)">
                  <strong>D:</strong> {{ formatDeviation(rowItem.per_isn_data[index].score_breakdown?.deviation) }}
                </div>
                <v-chip v-if="rowItem.per_isn_data[index].score !== null" size="x-small"
                  :color="getScoreColor(rowItem.per_isn_data[index].score!)" class="cursor-pointer"
                  @click="openScoreBreakdown(rowItem.test_item, index)">
                  {{ rowItem.per_isn_data[index].score!.toFixed(2) }}
                </v-chip>
              </div>
              <div v-else class="text-caption text-medium-emphasis">N/A</div>
            </template>
            <template #item.max_meas="{ item }">
              <span class="text-caption">{{ getMaxMeasurement(item) }}</span>
            </template>
            <template #item.min_meas="{ item }">
              <span class="text-caption">{{ getMinMeasurement(item) }}</span>
            </template>
            <template #item.avg_deviation="{ item }">
              <span class="text-body-2" :class="getDeviationClass(item.avg_deviation)">
                {{ formatDeviation(item.avg_deviation) }}
              </span>
            </template>
            <template #item.avg_score="{ item }">
              <v-chip v-if="item.avg_score !== null" size="small" :color="getScoreColor(item.avg_score)">
                {{ item.avg_score.toFixed(2) }}
              </v-chip>
            </template>
          </v-data-table>
          <div class="d-flex align-center justify-space-between pa-2">
            <div class="d-flex align-center gap-2">
              <span class="text-caption text-medium-emphasis">Show</span>
              <v-select v-model="valueItemsPerPage" :items="itemsPerPageOptions" variant="outlined" density="compact"
                class="mx-2" size="small" hide-details />
              <span class="text-caption text-medium-emphasis">items</span>
            </div>
            <v-pagination
              v-if="valueItemsPerPage !== -1 && valueItemsPerPage !== 0 && filteredValueItems.length > valueItemsPerPage"
              v-model="valueCurrentPage" :length="valueTotalPages" :total-visible="7" size="large" density="compact" />
            <div style="width: 150px;"></div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Non-Value Items Table -->
      <v-card variant="outlined">
        <v-card-title class="bg-secondary-lighten-5 d-flex align-center">
          <v-icon start>mdi-text</v-icon>
          Non-Value Items (Status/Text Data)
          <v-chip class="ml-2" size="small">{{ filteredNonValueItems.length }}</v-chip>
          <v-spacer />
          <v-icon color="primary" size="large" @click="nonValueFullscreen = true">mdi-fullscreen</v-icon>
        </v-card-title>
        <v-card-text class="pa-0">
          <v-data-table :headers="nonValueHeaders" :items="paginatedNonValueItems"
            :items-per-page="nonValueItemsPerPage" density="compact" fixed-header height="400" hide-default-footer
            striped="even">
            <template #top>
              <div class="pa-3">
                <v-text-field v-model="nonValueSearch" prepend-inner-icon="mdi-magnify" label="Search test items..."
                  variant="outlined" density="compact" clearable hide-details />
              </div>
            </template>
            <template #item.test_item="{ item }">
              <div class="text-body-2 font-weight-medium"
                :class="{ 'text-primary font-weight-bold': item.per_isn_data?.[0]?.is_calculated }">
                {{ item.test_item }}
              </div>
            </template>
            <template v-for="(_, index) in Array(getNonValueIsnCount())" :key="`nv-isn-${index}`"
              #[`item.isn_${index}`]="{ item: rowItem }">
              <v-chip v-if="rowItem.per_isn_data && rowItem.per_isn_data[index]" size="small"
                :color="rowItem.per_isn_data[index].is_calculated ? 'primary' : getStatusColor(rowItem.per_isn_data[index].value)"
                :class="{ 'font-weight-bold': rowItem.per_isn_data[index].is_calculated }">
                {{ rowItem.per_isn_data[index].value }}
              </v-chip>
              <span v-else class="text-caption text-medium-emphasis">N/A</span>
            </template>
          </v-data-table>
          <div class="d-flex align-center justify-space-between pa-2">
            <div class="d-flex align-center gap-2">
              <span class="text-caption text-medium-emphasis">Show</span>
              <v-select v-model="nonValueItemsPerPage" :items="itemsPerPageOptions" variant="outlined" density="compact"
                class="mx-2" size="small" hide-details />
              <span class="text-caption text-medium-emphasis">items</span>
            </div>
            <v-pagination
              v-if="nonValueItemsPerPage !== -1 && nonValueItemsPerPage !== 0 && filteredNonValueItems.length > nonValueItemsPerPage"
              v-model="nonValueCurrentPage" :length="nonValueTotalPages" :total-visible="7" size="large"
              density="compact" />
            <div style="width: 150px;"></div>
          </div>
        </v-card-text>
      </v-card>
    </v-card-text>
  </v-card>

  <!-- Value Items Fullscreen Dialog -->
  <v-dialog v-model="valueFullscreen" fullscreen transition="dialog-bottom-transition">
    <v-card class="d-flex flex-column" style="height: 100vh; overflow: hidden;">
      <v-card-title class="d-flex justify-space-between align-center flex-shrink-0">
        <div>
          <v-icon class="mr-2">mdi-numeric</v-icon>
          Value Items (Numeric Data)
        </div>
        <v-btn icon="mdi-close" variant="text" @click="valueFullscreen = false" />
      </v-card-title>
      <v-card-text class="pa-0 flex-grow-1 d-flex flex-column" style="overflow: hidden;">
        <div class="flex-grow-1" style="overflow: auto;">
          <v-data-table :headers="valueHeaders" :items="paginatedValueItems" :items-per-page="valueItemsPerPage"
            density="compact" fixed-header :height="'calc(100vh - 200px)'" hide-default-footer striped="even">
            <template #top>
              <div class="pa-3">
                <v-row dense>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="valueSearch" prepend-inner-icon="mdi-magnify" label="Search test items..."
                      variant="outlined" density="compact" clearable hide-details />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-select v-model="valueScoreFilter" :items="scoreFilterOptions" label="Score Filter"
                      variant="outlined" density="compact" clearable hide-details />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-select v-model="valueLimitFilter" :items="limitFilterOptions" label="Limit Status"
                      variant="outlined" density="compact" clearable hide-details />
                  </v-col>
                </v-row>
              </div>
            </template>
            <template #item.test_item="{ item }">
              <div class="text-body-2 font-weight-medium text-no-wrap">{{ item.test_item }}</div>
            </template>
            <template #item.usl="{ item }">
              <span class="text-caption">{{ formatRawNumber(item.usl) }}</span>
            </template>
            <template #item.lsl="{ item }">
              <span class="text-caption">{{ formatRawNumber(item.lsl) }}</span>
            </template>
            <template #item.target="{ item }">
              <v-chip size="small" color="info" variant="tonal">
                {{ formatRawNumber(item.per_isn_data?.[0]?.score_breakdown?.target_used ?? item.baseline) }}
              </v-chip>
            </template>
            <template v-for="(_, index) in Array(getIsnCount())" :key="`isn-fs-${index}`"
              #[`item.isn_${index}`]="{ item: rowItem }">
              <div v-if="rowItem.per_isn_data && rowItem.per_isn_data[index]" class="d-flex flex-column gap-1 py-1">
                <div class="text-caption">
                  <strong>V:</strong> {{ rowItem.per_isn_data[index].value }}
                </div>
                <div class="text-caption"
                  :class="getDeviationClass(rowItem.per_isn_data[index].score_breakdown?.deviation)">
                  <strong>D:</strong> {{ formatDeviation(rowItem.per_isn_data[index].score_breakdown?.deviation) }}
                </div>
                <v-chip v-if="rowItem.per_isn_data[index].score !== null" size="x-small"
                  :color="getScoreColor(rowItem.per_isn_data[index].score!)" class="cursor-pointer"
                  @click="openScoreBreakdown(rowItem.test_item, index)">
                  {{ rowItem.per_isn_data[index].score!.toFixed(2) }}
                </v-chip>
              </div>
              <div v-else class="text-caption text-medium-emphasis">N/A</div>
            </template>
            <template #item.max_meas="{ item }">
              <span class="text-caption">{{ getMaxMeasurement(item) }}</span>
            </template>
            <template #item.min_meas="{ item }">
              <span class="text-caption">{{ getMinMeasurement(item) }}</span>
            </template>
            <template #item.avg_deviation="{ item }">
              <span class="text-body-2" :class="getDeviationClass(item.avg_deviation)">
                {{ formatDeviation(item.avg_deviation) }}
              </span>
            </template>
            <template #item.avg_score="{ item }">
              <v-chip v-if="item.avg_score !== null" size="small" :color="getScoreColor(item.avg_score)">
                {{ item.avg_score.toFixed(2) }}
              </v-chip>
            </template>
          </v-data-table>
        </div>
        <div class="flex-shrink-0 pa-2" style="border-top: 1px solid rgba(0,0,0,0.12);">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-2">
              <span class="text-caption text-medium-emphasis">Show</span>
              <v-select v-model="valueItemsPerPage" :items="itemsPerPageOptions" variant="outlined" density="compact"
                hide-details style="width: 100px;" />
              <span class="text-caption text-medium-emphasis">items</span>
            </div>
            <v-pagination
              v-if="valueItemsPerPage !== -1 && valueItemsPerPage !== 0 && filteredValueItems.length > valueItemsPerPage"
              v-model="valueCurrentPage" :length="valueTotalPages" :total-visible="5" size="small" density="compact" />
            <div style="width: 150px;"></div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Non-Value Items Fullscreen Dialog -->
  <v-dialog v-model="nonValueFullscreen" fullscreen transition="dialog-bottom-transition">
    <v-card class="d-flex flex-column" style="height: 100vh; overflow: hidden;">
      <v-card-title class="d-flex justify-space-between align-center flex-shrink-0">
        <div>
          <v-icon class="mr-2">mdi-text</v-icon>
          Non-Value Items (Status/Text Data)
        </div>
        <v-btn icon="mdi-close" variant="text" @click="nonValueFullscreen = false" />
      </v-card-title>
      <v-card-text class="pa-0 flex-grow-1 d-flex flex-column" style="overflow: hidden;">
        <div class="flex-grow-1" style="overflow: auto;">
          <v-data-table :headers="nonValueHeaders" :items="paginatedNonValueItems"
            :items-per-page="nonValueItemsPerPage" density="compact" fixed-header :height="'calc(100vh - 200px)'"
            hide-default-footer striped="even">
            <template #top>
              <div class="pa-3">
                <v-text-field v-model="nonValueSearch" prepend-inner-icon="mdi-magnify" label="Search test items..."
                  variant="outlined" density="compact" clearable hide-details />
              </div>
            </template>
            <template #item.test_item="{ item }">
              <div class="text-body-2 font-weight-medium"
                :class="{ 'text-primary font-weight-bold': item.per_isn_data?.[0]?.is_calculated }">
                {{ item.test_item }}
              </div>
            </template>
            <template v-for="(_, index) in Array(getNonValueIsnCount())" :key="`nv-isn-fs-${index}`"
              #[`item.isn_${index}`]="{ item: rowItem }">
              <v-chip v-if="rowItem.per_isn_data && rowItem.per_isn_data[index]" size="small"
                :color="rowItem.per_isn_data[index].is_calculated ? 'primary' : getStatusColor(rowItem.per_isn_data[index].value)"
                :class="{ 'font-weight-bold': rowItem.per_isn_data[index].is_calculated }">
                {{ rowItem.per_isn_data[index].value }}
              </v-chip>
              <span v-else class="text-caption text-medium-emphasis">N/A</span>
            </template>
          </v-data-table>
        </div>
        <div class="flex-shrink-0 pa-2" style="border-top: 1px solid rgba(0,0,0,0.12);">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-2">
              <span class="text-caption text-medium-emphasis">Show</span>
              <v-select v-model="nonValueItemsPerPage" :items="itemsPerPageOptions" variant="outlined" density="compact"
                hide-details style="width: 100px;" />
              <span class="text-caption text-medium-emphasis">items</span>
            </div>
            <v-pagination
              v-if="nonValueItemsPerPage !== -1 && nonValueItemsPerPage !== 0 && filteredNonValueItems.length > nonValueItemsPerPage"
              v-model="nonValueCurrentPage" :length="nonValueTotalPages" :total-visible="5" size="large"
              density="compact" />
            <div style="width: 150px;"></div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Custom Items Per Page Dialog -->
  <v-dialog v-model="showCustomInput" max-width="400">
    <v-card>
      <v-card-title>Custom Items Per Page</v-card-title>
      <v-card-text>
        <v-text-field v-model.number="customItemsPerPage" type="number" label="Enter number of items" variant="outlined"
          density="comfortable" min="1" autofocus @keyup.enter="applyCustomItemsPerPage" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="cancelCustomInput">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" @click="applyCustomItemsPerPage">Apply</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Score Breakdown Dialog -->
  <ScoreBreakdownDialog v-model="scoreDialogOpen" :item="selectedItemForScore" />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CompareResponseEnhanced, CompareItemEnhanced, ParsedTestItemEnhanced } from '@/features/dut_logs/composables/useTestLogUpload'
import { sortTestItems } from '@/features/dut_logs/utils/sorting'
import ScoreBreakdownDialog from '@/features/dut_logs/components/ScoreBreakdownDialog.vue'

const props = defineProps<{
  result: CompareResponseEnhanced
}>()

const emit = defineEmits<{
  'export-excel': []
  'export-pdf': []
  'copy-clipboard': []
}>()

// Pagination - separate for value and non-value tables
const valueItemsPerPage = ref(10)
const nonValueItemsPerPage = ref(10)
const itemsPerPageOptions = [
  { title: '5', value: 5 },
  { title: '10', value: 10 },
  { title: '25', value: 25 },
  { title: '50', value: 50 },
  { title: '100', value: 100 },
  { title: 'All', value: -1 },
  { title: 'Custom', value: 0 }
]
const showCustomInput = ref(false)
const customItemsPerPage = ref(10)
const customInputTarget = ref<'value' | 'non-value'>('value')

// Value Items State
const valueCurrentPage = ref(1)
const valueSearch = ref('')
const valueScoreFilter = ref<string | null>(null)
const valueLimitFilter = ref<string | null>(null)
const valueFullscreen = ref(false)

// Non-Value Items State
const nonValueCurrentPage = ref(1)
const nonValueSearch = ref('')
const nonValueFullscreen = ref(false)

// Score breakdown dialog
const scoreDialogOpen = ref(false)
const selectedItemForScore = ref<ParsedTestItemEnhanced | null>(null)

// Filter Options
const scoreFilterOptions = [
  { title: 'All Scores', value: null },
  { title: 'Score >= 9', value: 'high' },
  { title: 'Score 7-9', value: 'medium' },
  { title: 'Score < 7', value: 'low' }
]

const limitFilterOptions = [
  { title: 'All', value: null },
  { title: 'Within Limits', value: 'within' },
  { title: 'Out of Limits', value: 'out' }
]

// Headers
const valueHeaders = computed(() => {
  const firstItem = reclassifiedValueItems.value[0]
  if (!firstItem) return []

  const baseHeaders = [
    { title: 'Test Item', key: 'test_item', sortable: true, width: '250px', fixed: true },
    { title: 'USL', key: 'usl', sortable: true, align: 'center' as const, width: '80px' },
    { title: 'LSL', key: 'lsl', sortable: true, align: 'center' as const, width: '80px' },
    { title: 'Target', key: 'target', sortable: true, align: 'center' as const, width: '100px' }
  ]

  const isnHeaders = firstItem.per_isn_data.map((isnData, index) => ({
    title: `Meas.\n${isnData.isn || 'N/A'}`,
    key: `isn_${index}`,
    sortable: false,
    align: 'center' as const,
    width: '120px'
  }))

  const aggregateHeaders = [
    { title: 'Max. Meas.', key: 'max_meas', sortable: false, align: 'center' as const, width: '100px' },
    { title: 'Min. Meas.', key: 'min_meas', sortable: false, align: 'center' as const, width: '100px' },
    { title: 'Avg. Dev', key: 'avg_deviation', sortable: true, align: 'center' as const, width: '100px' },
    { title: 'Avg. Score', key: 'avg_score', sortable: true, align: 'center' as const, width: '100px' }
  ]

  return [...baseHeaders, ...isnHeaders, ...aggregateHeaders]
})

const nonValueHeaders = computed(() => {
  const firstItem = reclassifiedNonValueItems.value[0]
  if (!firstItem) return []

  const baseHeaders = [
    { title: 'Test Item', key: 'test_item', sortable: true, width: '300px' }
  ]

  const isnHeaders = firstItem.per_isn_data.map((isnData, index) => ({
    title: isnData.isn || 'N/A',
    key: `isn_${index}`,
    sortable: false,
    align: 'center' as const,
    width: '150px'
  }))

  return [...baseHeaders, ...isnHeaders]
})

// Reclassify items: move ADJUSTED_POW from value to non-value
const reclassifiedValueItems = computed(() => {
  return props.result.comparison_value_items.filter(item => 
    !item.test_item.includes('ADJUSTED_POW')
  )
})

const reclassifiedNonValueItems = computed(() => {
  const adjustedPowItems = props.result.comparison_value_items.filter(item => 
    item.test_item.includes('ADJUSTED_POW')
  )
  return [...props.result.comparison_non_value_items, ...adjustedPowItems]
})

// Filter items
const filteredValueItems = computed(() => {
  let items = sortTestItems(reclassifiedValueItems.value)

  // Search filter
  if (valueSearch.value) {
    const searchLower = valueSearch.value.toLowerCase()
    items = items.filter(item => item.test_item.toLowerCase().includes(searchLower))
  }

  // Score filter
  if (valueScoreFilter.value) {
    items = items.filter(item => {
      const avgScore = item.avg_score
      if (avgScore === null) return false
      if (valueScoreFilter.value === 'high') return avgScore >= 9
      if (valueScoreFilter.value === 'medium') return avgScore >= 7 && avgScore < 9
      if (valueScoreFilter.value === 'low') return avgScore < 7
      return true
    })
  }

  // Limit filter
  if (valueLimitFilter.value) {
    items = items.filter(item => {
      const hasData = item.per_isn_data.some(isn => isn.numeric_value !== null)
      if (!hasData) return false

      const measurements = item.per_isn_data.map(isn => isn.numeric_value ?? 0)
      const maxVal = Math.max(...measurements)
      const minVal = Math.min(...measurements)

      const withinLimits = (item.usl === null || maxVal <= item.usl) &&
        (item.lsl === null || minVal >= item.lsl)

      return valueLimitFilter.value === 'within' ? withinLimits : !withinLimits
    })
  }

  return items
})

const filteredNonValueItems = computed(() => {
  const sorted = sortTestItems(reclassifiedNonValueItems.value)
  if (!nonValueSearch.value) return sorted
  const searchLower = nonValueSearch.value.toLowerCase()
  return sorted.filter(item => item.test_item.toLowerCase().includes(searchLower))
})

// Pagination
const valueTotalPages = computed(() => {
  const perPage = valueItemsPerPage.value === -1 ? filteredValueItems.value.length :
    valueItemsPerPage.value === 0 ? 10 : valueItemsPerPage.value
  return Math.ceil(filteredValueItems.value.length / perPage)
})

const nonValueTotalPages = computed(() => {
  const perPage = nonValueItemsPerPage.value === -1 ? filteredNonValueItems.value.length :
    nonValueItemsPerPage.value === 0 ? 10 : nonValueItemsPerPage.value
  return Math.ceil(filteredNonValueItems.value.length / perPage)
})

const paginatedValueItems = computed(() => {
  const perPage = valueItemsPerPage.value === -1 ? filteredValueItems.value.length :
    valueItemsPerPage.value === 0 ? 10 : valueItemsPerPage.value
  const start = (valueCurrentPage.value - 1) * perPage
  const end = start + perPage
  return filteredValueItems.value.slice(start, end)
})

const paginatedNonValueItems = computed(() => {
  const perPage = nonValueItemsPerPage.value === -1 ? filteredNonValueItems.value.length :
    nonValueItemsPerPage.value === 0 ? 10 : nonValueItemsPerPage.value
  const start = (nonValueCurrentPage.value - 1) * perPage
  const end = start + perPage
  return filteredNonValueItems.value.slice(start, end)
})

// Reset pagination when filters change
watch([valueSearch, valueScoreFilter, valueLimitFilter], () => {
  valueCurrentPage.value = 1
})

watch(nonValueSearch, () => {
  nonValueCurrentPage.value = 1
})

// Reset filters when closing fullscreen
watch(valueFullscreen, (isOpen) => {
  if (!isOpen) {
    valueSearch.value = ''
    valueScoreFilter.value = null
    valueLimitFilter.value = null
  }
})

watch(nonValueFullscreen, (isOpen) => {
  if (!isOpen) {
    nonValueSearch.value = ''
  }
})

// Watch for custom items per page selection - value table
watch(valueItemsPerPage, (newVal) => {
  if (newVal === 0) {
    customInputTarget.value = 'value'
    showCustomInput.value = true
  } else {
    valueCurrentPage.value = 1
  }
})

// Watch for custom items per page selection - non-value table
watch(nonValueItemsPerPage, (newVal) => {
  if (newVal === 0) {
    customInputTarget.value = 'non-value'
    showCustomInput.value = true
  } else {
    nonValueCurrentPage.value = 1
  }
})

// Apply custom value
const applyCustomItemsPerPage = () => {
  if (customItemsPerPage.value > 0) {
    if (customInputTarget.value === 'value') {
      valueItemsPerPage.value = customItemsPerPage.value
    } else {
      nonValueItemsPerPage.value = customItemsPerPage.value
    }
  }
  showCustomInput.value = false
}

const cancelCustomInput = () => {
  if (customInputTarget.value === 'value') {
    valueItemsPerPage.value = 10
  } else {
    nonValueItemsPerPage.value = 10
  }
  showCustomInput.value = false
}

// Helper functions
const formatRawNumber = (value: number | null): string => {
  return value !== null ? value.toString() : 'N/A'
}

const formatDeviation = (deviation: number | null | undefined): string => {
  if (deviation === null || deviation === undefined) return 'N/A'
  return Math.abs(deviation).toFixed(2)
}

const getDeviationClass = (deviation: number | null | undefined): string => {
  if (deviation === null || deviation === undefined) return ''
  const abs = Math.abs(deviation)
  if (abs < 0.5) return 'text-success'
  if (abs < 2.0) return 'text-warning'
  return 'text-error font-weight-bold'
}

const getScoreColor = (score: number): string => {
  if (score >= 9) return 'success'
  if (score >= 7) return 'warning'
  return 'error'
}

const getStatusColor = (value: string): string => {
  const upper = value.toUpperCase()
  if (upper === 'PASS' || upper === 'OK') return 'success'
  if (upper === 'FAIL' || upper === 'ERROR') return 'error'
  return 'grey'
}

const getIsnCount = (): number => {
  const firstItem = props.result.comparison_value_items[0]
  return firstItem?.per_isn_data?.length || 0
}

const getMaxMeasurement = (item: CompareItemEnhanced): string => {
  const measurements = item.per_isn_data.map(isn => isn.numeric_value ?? 0)
  if (measurements.length === 0) return 'N/A'
  return Math.max(...measurements).toFixed(2)
}

const getMinMeasurement = (item: CompareItemEnhanced): string => {
  const measurements = item.per_isn_data.map(isn => isn.numeric_value ?? 0)
  if (measurements.length === 0) return 'N/A'
  return Math.min(...measurements).toFixed(2)
}

const getNonValueIsnCount = (): number => {
  const firstItem = props.result.comparison_non_value_items[0]
  return firstItem?.per_isn_data?.length || 0
}

const openScoreBreakdown = (testItem: string, isnIndex: number) => {
  const compareItem = props.result.comparison_value_items.find(item => item.test_item === testItem)
  if (!compareItem || !compareItem.per_isn_data[isnIndex]) return

  const isnData = compareItem.per_isn_data[isnIndex]
  if (!isnData.score_breakdown) return

  selectedItemForScore.value = {
    test_item: testItem,
    usl: compareItem.usl,
    lsl: compareItem.lsl,
    value: isnData.value,
    is_value_type: isnData.is_value_type,
    numeric_value: isnData.numeric_value,
    is_hex: isnData.is_hex,
    hex_decimal: isnData.hex_decimal,
    matched_criteria: compareItem.matched_criteria,
    target: null,
    score: isnData.score,
    score_breakdown: isnData.score_breakdown
  }

  scoreDialogOpen.value = true
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.text-no-wrap {
  white-space: nowrap;
}

:deep(.v-data-table__td) {
  font-size: 0.75rem !important;
}

:deep(.v-chip) {
  text-align: center;
}

:deep(.v-chip__content) {
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 600;
  width: 100%;
}
</style>
