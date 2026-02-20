<template>
    <v-card class="mb-4">
        <v-card-title class="d-flex justify-space-between align-center flex-wrap">
            <div>
                <v-icon class="mr-2" color="warning">mdi-podium-gold</v-icon>
                <!-- UPDATED: Change title based on whether scores are calculated -->
                {{ hasScores ? 'iPLAS Data Ranking by Test Station' : 'iPLAS Data Result' }}
            </div>
            <div class="d-flex align-center gap-2 flex-wrap">
                <!-- Export All Button -->
                <v-btn v-if="totalRecords > 0" color="primary" variant="outlined" size="small"
                    prepend-icon="mdi-file-export" :loading="props.exportingAll"
                    @click="handleExportAll">
                    Export All ({{ totalRecords }})
                </v-btn>
                <!-- Export Selected Button -->
                <v-btn v-if="selectedItems.length > 0" color="info" variant="outlined" size="small"
                    prepend-icon="mdi-file-export-outline" :loading="exporting"
                    @click="handleExport">
                    Export Selected ({{ selectedItems.length }})
                </v-btn>
                <!-- Bulk Download Button -->
                <v-btn v-if="selectedItems.length > 0" color="success" variant="outlined" size="small"
                    prepend-icon="mdi-download-multiple" :loading="bulkDownloading"
                    @click="handleBulkDownload">
                    Download Selected ({{ selectedItems.length }})
                </v-btn>
                <!-- UPDATED: Show Calculate/Re-calculate button -->
                <v-btn v-if="!hasScores" color="primary" variant="outlined" size="small" prepend-icon="mdi-calculator"
                    :loading="calculatingScores" :disabled="loading" @click="emit('calculate-scores')">
                    Calculate Scores
                </v-btn>
                <v-btn v-else color="secondary" variant="outlined" size="small" prepend-icon="mdi-refresh"
                    :loading="calculatingScores" :disabled="loading" @click="emit('calculate-scores')">
                    Re-calculate
                </v-btn>
                <v-chip size="small" color="success" variant="tonal" prepend-icon="mdi-barcode">
                    {{ totalRecords }} Records
                </v-chip>
            </div>
        </v-card-title>

        <v-card-subtitle class="text-caption text-medium-emphasis pb-0">
            <span v-if="hasScores">Rankings are based on scoring. Higher scores indicate better performance.</span>
            <span v-else>Click "Calculate Scores" to rank records by performance score. Records with errors are shown at
                the bottom.</span>
        </v-card-subtitle>

        <v-card-text>
            <!-- Station Tabs -->
            <v-tabs v-model="selectedTab" color="primary" density="compact" show-arrows>
                <v-tab v-for="(ranking, station) in rankingByStation" :key="station" :value="station">
                    <v-icon start size="small">mdi-router-wireless</v-icon>
                    {{ getStationDisplayName(station) }}
                    <v-chip size="x-small" class="ml-2" :color="hasStationErrors(station) ? 'error' : 'success'">
                        {{ ranking.length }}
                    </v-chip>
                </v-tab>
            </v-tabs>

            <!-- Station Rankings -->
            <v-window v-model="selectedTab" class="pt-4">
                <v-window-item v-for="(_, station) in rankingByStation" :key="station" :value="station">
                    <!-- Filters Row: Search, Device, Score Filter -->
                    <v-row class="mb-2" dense>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="searchQuery" label="Search Records" prepend-inner-icon="mdi-magnify"
                                variant="outlined" density="compact" hide-details clearable
                                placeholder="Search ISN, Device ID..." />
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-autocomplete v-model="deviceFilter" :items="getUniqueDevices(station)" label="Device ID"
                                variant="outlined" density="compact" prepend-inner-icon="mdi-chip" hide-details
                                clearable multiple chips closable-chips>
                                <template #chip="{ props, item }">
                                    <v-chip v-bind="props" :text="item.raw" size="small" />
                                </template>
                            </v-autocomplete>
                        </v-col>
                        <!-- Score Filter (only shown when scores are calculated) -->
                        <template v-if="hasScores">
                            <v-col cols="12" md="2">
                                <v-select v-model="scoreFilterType" :items="scoreFilterTypeOptions" item-title="title"
                                    item-value="value" label="Score Filter" variant="outlined" density="compact" 
                                    prepend-inner-icon="mdi-filter-variant" hide-details clearable
                                    @update:model-value="() => { if (!scoreFilterType) { scoreFilterValue = null; scoreFilterValue2 = null; scoreRangeInput = '' } }" />
                            </v-col>
                            <v-col v-if="scoreFilterType === 'between'" cols="12" md="2">
                                <v-text-field v-model="scoreRangeInput" label="Range (e.g. 8-10)" 
                                    variant="outlined" density="compact" hide-details
                                    placeholder="8-10" @update:model-value="parseScoreRange" />
                            </v-col>
                            <v-col v-else-if="scoreFilterType" cols="12" md="2">
                                <v-text-field v-model.number="scoreFilterValue" label="Score Value" type="number"
                                    variant="outlined" density="compact" hide-details
                                    min="0" max="10" step="0.1" placeholder="0-10" />
                            </v-col>
                        </template>
                        <v-col cols="12" :md="hasScores ? 1 : 5" class="d-flex align-center justify-end">
                            <v-btn v-if="hasActiveFilters" variant="text" size="small" color="primary"
                                @click="clearAllFilters">
                                <v-icon start size="small">mdi-filter-off</v-icon>
                                Clear
                                <v-chip size="x-small" color="primary" class="ml-1">{{ activeFilterCount }}</v-chip>
                            </v-btn>
                        </v-col>
                    </v-row>

                    <!-- Data Table with Selection -->
                    <v-data-table v-model="selectedItems" :headers="rankingHeaders" :items="filteredRanking" 
                        :items-per-page="25" density="comfortable" class="elevation-1 ranking-table cursor-pointer" 
                        :row-props="getRowProps" show-select item-value="key" return-object
                        @click:row="(_event: unknown, data: any) => handleRowClick(data.item, station as string)">
                        <!-- Rank Column -->
                        <template #item.rank="{ item }">
                            <div class="d-flex align-center">
                                <template v-if="item.hasError">
                                    <v-icon color="error" size="small">mdi-alert-circle</v-icon>
                                </template>
                                <template v-else-if="item.rank === 1">
                                    <v-icon color="warning">mdi-trophy</v-icon>
                                    <span class="ml-1 font-weight-bold">1</span>
                                </template>
                                <template v-else-if="item.rank === 2">
                                    <v-icon color="grey-lighten-1">mdi-medal</v-icon>
                                    <span class="ml-1">2</span>
                                </template>
                                <template v-else-if="item.rank === 3">
                                    <v-icon color="orange-darken-3">mdi-medal-outline</v-icon>
                                    <span class="ml-1">3</span>
                                </template>
                                <template v-else>
                                    <span class="text-medium-emphasis">{{ item.rank }}</span>
                                </template>
                            </div>
                        </template>

                        <!-- ISN Column with Copy Icon on Left -->
                        <template #item.isn="{ item }">
                            <div class="d-flex align-center gap-1">
                                <v-btn icon size="x-small" variant="text" color="primary" @click.stop="copyToClipboard(item.isn)">
                                    <v-icon size="small">mdi-content-copy</v-icon>
                                    <v-tooltip activator="parent" location="top">Copy ISN</v-tooltip>
                                </v-btn>
                                <span class="font-weight-medium font-mono">{{ item.isn }}</span>
                            </div>
                        </template>

                        <!-- Device Column -->
                        <template #item.device="{ item }">
                            <v-chip size="small" variant="outlined">{{ item.device || '-' }}</v-chip>
                        </template>

                        <!-- Test End Time Column -->
                        <template #item.testDate="{ item }">
                            <span class="text-caption">{{ item.testDate }}</span>
                        </template>

                        <!-- Duration Column -->
                        <template #item.duration="{ item }">
                            <span class="text-caption text-medium-emphasis">{{ item.duration }}</span>
                        </template>

                        <!-- Status Column -->
                        <template #item.status="{ item }">
                            <v-chip :color="item.hasError ? 'error' : 'success'" size="small">
                                {{ item.hasError ? item.errorCode : 'PASS' }}
                            </v-chip>
                        </template>

                        <!-- Score Column -->
                        <template #item.score="{ item }">
                            <template v-if="item.hasError">
                                <v-chip size="small" color="error" variant="tonal">FAIL</v-chip>
                            </template>
                            <template v-else-if="item.score !== null">
                                <v-chip size="small" :color="getScoreColor(item.score)" variant="flat"
                                    class="font-weight-bold">
                                    {{ (item.score * 10).toFixed(2) }}
                                </v-chip>
                            </template>
                            <template v-else>
                                <span class="text-medium-emphasis">-</span>
                            </template>
                        </template>

                        <!-- Actions Column -->
                        <template #item.actions="{ item }">
                            <v-btn icon size="small" variant="text" color="success"
                                @click.stop="handleDownloadDetails(item, station as string)">
                                <v-icon>mdi-download</v-icon>
                                <v-tooltip activator="parent" location="top">Download Attachment</v-tooltip>
                            </v-btn>
                        </template>
                    </v-data-table>
                </v-window-item>
            </v-window>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import type { CsvTestItemData } from '@/features/dut_logs/composables/useIplasApi'
import { adjustIplasDisplayTime, isStatusPass } from '@/shared/utils/helpers'
import { getScoreColor } from '../types/scoring.types'

interface Props {
  records: CsvTestItemData[]
  stationDisplayNames?: Record<string, string>
  scores?: Record<string, number> // Map of ISN+station+time to score
  calculatingScores?: boolean
  loading?: boolean // Whether data is still being fetched
  exportingAll?: boolean // Whether export all is in progress (controlled by parent)
}

interface RankingItem {
  key: string // Unique key for selection
  rank: number
  isn: string
  device: string
  testDate: string
  testStartTime: string
  testEndTime: string
  duration: string // Formatted duration string
  score: number | null
  hasError: boolean
  errorCode: string
  errorName: string
  originalRecord: CsvTestItemData
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'row-click', payload: { record: CsvTestItemData; stationName: string }): void
  (e: 'download', payload: { record: CsvTestItemData; stationName: string }): void
  (e: 'bulk-download', payload: { records: CsvTestItemData[]; stationName: string }): void
  (e: 'export', payload: { records: CsvTestItemData[]; stationName: string }): void
  (e: 'export-all', payload: { records: CsvTestItemData[]; filenamePrefix: string }): void
  (e: 'calculate-scores'): void
}>()

const selectedTab = ref<string>('')
const searchQuery = ref<string>('')
// Debounced search query for performance - actual filtering uses this
const debouncedSearchQuery = ref<string>('')
const deviceFilter = ref<string[]>([])

// Score filter state
const scoreFilterType = ref<string | null>(null)
const scoreFilterValue = ref<number | null>(null)
const scoreFilterValue2 = ref<number | null>(null) // For "between" filter
const scoreRangeInput = ref<string>('') // For "between" filter input (e.g., "8-10")

// Selection state for bulk actions
const selectedItems = ref<RankingItem[]>([])
const bulkDownloading = ref(false)
const exporting = ref(false)

// Debounce search query updates (300ms delay)
const updateDebouncedSearch = useDebounceFn((value: string) => {
  debouncedSearchQuery.value = value
}, 300)

// Watch for search query changes and debounce
watch(searchQuery, (value) => updateDebouncedSearch(value))

// Clear selection when tab changes
watch(selectedTab, () => {
  selectedItems.value = []
})

// Parse score range input (e.g., "8-10") into min/max values
function parseScoreRange() {
  const input = scoreRangeInput.value.trim()
  if (!input) {
    scoreFilterValue.value = null
    scoreFilterValue2.value = null
    return
  }

  // Parse format like "8-10" or "8 - 10"
  const match = input.match(/^\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*$/)
  if (match?.[1] && match[2]) {
    scoreFilterValue.value = parseFloat(match[1])
    scoreFilterValue2.value = parseFloat(match[2])
  } else {
    // Invalid format, clear values
    scoreFilterValue.value = null
    scoreFilterValue2.value = null
  }
}

// Score filter type options
const scoreFilterTypeOptions = [
  { title: 'Greater Than', value: 'gt' },
  { title: 'Greater Than or Equal', value: 'gte' },
  { title: 'Equals To', value: 'eq' },
  { title: 'Lower Than', value: 'lt' },
  { title: 'Lower Than or Equal', value: 'lte' },
  { title: 'In Between', value: 'between' },
]

// Check if we have scores - must be defined before rankingHeaders
const hasScores = computed(() => {
  return Object.keys(props.scores || {}).length > 0
})

// Updated headers: conditional rank column based on hasScores
// [Checkbox] [#] [DUT ISN] [Device ID] [Test End] [Duration] [Status] [Score] [Actions]
const rankingHeaders = computed(() => {
  const headers = [
    { title: 'DUT ISN', key: 'isn', sortable: true, width: '180px' },
    { title: 'Device ID', key: 'device', sortable: true, width: '100px' },
    { title: 'Test End', key: 'testDate', sortable: true, width: '160px' },
    { title: 'Duration', key: 'duration', sortable: true, width: '90px' },
    { title: 'Status', key: 'status', sortable: true, width: '90px' },
    { title: 'Score', key: 'score', sortable: true, width: '80px' },
    { title: 'Actions', key: 'actions', sortable: false, width: '80px' },
  ]

  // UPDATED: Show rank column when scores are calculated, now sortable
  if (hasScores.value) {
    headers.unshift({ title: '#', key: 'rank', sortable: true, width: '60px' })
  }

  return headers
})

// Compute rankings grouped by station
const rankingByStation = computed(() => {
  const stationMap: Record<string, RankingItem[]> = {}

  props.records.forEach((record, recordIndex) => {
    const stationName = record.station

    if (!stationMap[stationName]) {
      stationMap[stationName] = []
    }

    const hasError = !isStatusPass(record.ErrorCode)
    // Get score from scores map if available
    const scoreKey = `${record.ISN || record.DeviceId}_${stationName}_${record['Test end Time']}`
    const score = props.scores?.[scoreKey] ?? null

    // Calculate duration from start and end times
    const startTime = record['Test Start Time']
    const endTime = record['Test end Time']
    const duration = calculateDuration(startTime, endTime)

    // Generate unique key for selection (include index to guarantee uniqueness)
    const uniqueKey = `${record.ISN}_${stationName}_${record['Test Start Time']}_${recordIndex}`

    stationMap[stationName].push({
      key: uniqueKey,
      rank: 0,
      isn: record.ISN || '-',
      device: record.DeviceId || '-',
      testDate: adjustIplasDisplayTime(record['Test end Time'], 1) || '-',
      testStartTime: record['Test Start Time'] || '',
      testEndTime: record['Test end Time'] || '',
      duration: duration,
      score: hasError ? null : score,
      hasError: hasError,
      errorCode: record.ErrorCode || '-',
      errorName: record.ErrorName || '',
      originalRecord: record,
    })
  })

  // Sort by score (if available) or test date, and assign ranks
  Object.keys(stationMap).forEach((station) => {
    const items = stationMap[station]

    if (!items) return

    // Separate passed and failed
    const passed = items.filter((item) => !item.hasError)
    const failed = items.filter((item) => item.hasError)

    // Check if we have scores to sort by
    const hasScores = passed.some((item) => item.score !== null)

    // Sort passed by score (if available, descending) or test date
    passed.sort((a, b) => {
      if (hasScores) {
        // Sort by score descending (higher is better)
        const scoreA = a.score ?? -Infinity
        const scoreB = b.score ?? -Infinity
        if (scoreA !== scoreB) return scoreB - scoreA
      }
      // Fallback to test date descending
      const dateA = new Date(a.testDate).getTime()
      const dateB = new Date(b.testDate).getTime()
      return dateB - dateA
    })

    // Assign ranks to passed
    passed.forEach((item, index) => {
      item.rank = index + 1
    })

    // Failed don't get a rank
    failed.forEach((item) => {
      item.rank = 999
    })

    // Sort failed by test date descending
    failed.sort((a, b) => {
      const dateA = new Date(a.testDate).getTime()
      const dateB = new Date(b.testDate).getTime()
      return dateB - dateA
    })

    stationMap[station] = [...passed, ...failed]
  })

  // Set initial tab
  const firstStation = Object.keys(stationMap)[0]
  if (selectedTab.value === '' && firstStation) {
    selectedTab.value = firstStation
  }

  return stationMap
})

const totalRecords = computed(() => props.records.length)

function getStationDisplayName(stationName: string): string {
  return props.stationDisplayNames?.[stationName] || stationName
}

function hasStationErrors(stationName: string): boolean {
  const ranking = rankingByStation.value[stationName]
  return ranking?.some((item) => item.hasError) || false
}

function getUniqueDevices(stationName: string): string[] {
  const ranking = rankingByStation.value[stationName] || []
  const devices = new Set<string>()
  ranking.forEach((item) => {
    if (item.device && item.device !== '-') {
      devices.add(item.device)
    }
  })
  return Array.from(devices)
}

// Filtered ranking (uses debounced search for better performance)
const filteredRanking = computed(() => {
  const currentStation = selectedTab.value
  if (!currentStation || !rankingByStation.value[currentStation]) {
    return []
  }

  let items = rankingByStation.value[currentStation]

  // Apply debounced search
  if (debouncedSearchQuery.value) {
    const query = debouncedSearchQuery.value.toLowerCase()
    items = items.filter((item) => {
      return (
        item.isn.toLowerCase().includes(query) ||
        item.device.toLowerCase().includes(query) ||
        item.errorCode.toLowerCase().includes(query) ||
        item.errorName.toLowerCase().includes(query)
      )
    })
  }

  // Apply device filter
  if (deviceFilter.value.length > 0) {
    items = items.filter((item) => deviceFilter.value.includes(item.device))
  }

  // Apply score filter (only when scores are available and filter is set)
  if (hasScores.value && scoreFilterType.value && scoreFilterValue.value !== null) {
    // Score is stored as 0-1, but displayed as 0-100 (score * 10 = 0-10 scale, displayed as 0-100)
    // User inputs score in 0-100 scale, so we compare against item.score * 100
    const filterValue = scoreFilterValue.value
    const filterValue2 = scoreFilterValue2.value

    items = items.filter((item) => {
      // Skip items without score (errors)
      if (item.score === null) return false

      const displayScore = item.score * 100 // Convert to 0-100 scale

      switch (scoreFilterType.value) {
        case 'gt':
          return displayScore > filterValue
        case 'gte':
          return displayScore >= filterValue
        case 'eq':
          // Use small tolerance for floating point comparison
          return Math.abs(displayScore - filterValue) < 0.01
        case 'lt':
          return displayScore < filterValue
        case 'lte':
          return displayScore <= filterValue
        case 'between': {
          if (filterValue2 === null) return true
          const min = Math.min(filterValue, filterValue2)
          const max = Math.max(filterValue, filterValue2)
          return displayScore >= min && displayScore <= max
        }
        default:
          return true
      }
    })
  }

  return items
})

const hasActiveFilters = computed(() => {
  return !!(
    debouncedSearchQuery.value ||
    deviceFilter.value.length > 0 ||
    (scoreFilterType.value && scoreFilterValue.value !== null)
  )
})

const activeFilterCount = computed(() => {
  let count = 0
  if (debouncedSearchQuery.value) count++
  if (deviceFilter.value.length > 0) count++
  if (scoreFilterType.value && scoreFilterValue.value !== null) count++
  return count
})

function clearAllFilters() {
  searchQuery.value = ''
  debouncedSearchQuery.value = ''
  deviceFilter.value = []
  scoreFilterType.value = null
  scoreFilterValue.value = null
  scoreFilterValue2.value = null
  scoreRangeInput.value = ''
}

function getRowProps({ item }: { item: RankingItem }) {
  return {
    class: getRankingRowClass(item),
  }
}

function getRankingRowClass(item: RankingItem): string {
  if (item.hasError) return 'error-row'
  if (item.rank === 1) return 'rank-1-row'
  if (item.rank === 2) return 'rank-2-row'
  if (item.rank === 3) return 'rank-3-row'
  return ''
}

function handleRowClick(item: RankingItem, stationName: string) {
  emit('row-click', { record: item.originalRecord, stationName })
}

function handleDownloadDetails(item: RankingItem, stationName: string) {
  emit('download', { record: item.originalRecord, stationName })
}

/**
 * Calculate duration between start and end times
 * Returns formatted string like "5m 30s" or "1h 15m"
 */
function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '-'

  try {
    // Clean up time strings - remove timezone markers like %:z or similar
    const cleanStart = startTime.replace(/%:z/gi, '').replace(/T/, ' ').trim()
    const cleanEnd = endTime.replace(/%:z/gi, '').replace(/T/, ' ').trim()

    const start = new Date(cleanStart).getTime()
    const end = new Date(cleanEnd).getTime()

    if (Number.isNaN(start) || Number.isNaN(end)) return '-'

    const diffMs = end - start
    if (diffMs < 0) return '-'

    const seconds = Math.floor(diffMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  } catch {
    return '-'
  }
}

/**
 * Copy text to clipboard with user feedback and fallback
 */
async function copyToClipboard(text: string): Promise<void> {
  if (!text || text === '-') return

  try {
    await navigator.clipboard.writeText(text)
    console.log(`Copied to clipboard: ${text}`)
  } catch (_err) {
    // Fallback for browsers that don't support clipboard API or non-secure contexts
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      console.log(`Copied to clipboard (fallback): ${text}`)
    } catch (e) {
      console.error('Failed to copy to clipboard:', e)
    }
    document.body.removeChild(textArea)
  }
}

/**
 * Handle bulk download of selected items
 */
async function handleBulkDownload(): Promise<void> {
  if (selectedItems.value.length === 0) return

  bulkDownloading.value = true
  try {
    const records = selectedItems.value.map((item) => item.originalRecord)
    emit('bulk-download', { records, stationName: selectedTab.value })
  } finally {
    bulkDownloading.value = false
  }
}

/**
 * Handle export of selected items
 */
async function handleExport(): Promise<void> {
  if (selectedItems.value.length === 0) return

  exporting.value = true
  try {
    const records = selectedItems.value.map((item) => item.originalRecord)
    emit('export', { records, stationName: selectedTab.value })
  } finally {
    exporting.value = false
  }
}

/**
 * Handle export of ALL records from all stations
 */
function handleExportAll(): void {
  if (props.records.length === 0) return
  // Export all records - backend will group by station into separate sheets
  // Loading state is managed by parent via exportingAll prop
  emit('export-all', { records: props.records, filenamePrefix: 'all_stations' })
}
</script>

<style scoped>
:deep(.rank-1-row) {
    background-color: rgba(255, 215, 0, 0.1) !important;
}

:deep(.rank-2-row) {
    background-color: rgba(192, 192, 192, 0.1) !important;
}

:deep(.rank-3-row) {
    background-color: rgba(205, 127, 50, 0.1) !important;
}

:deep(.error-row) {
    background-color: rgba(244, 67, 54, 0.05) !important;
}

.ranking-table {
    border-radius: 8px;
    overflow: hidden;
}

.cursor-pointer {
    cursor: pointer;
}

.gap-2 {
    gap: 0.5rem;
}
</style>
