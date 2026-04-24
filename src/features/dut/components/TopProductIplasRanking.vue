<template>
  <AppPanel
    eyebrow="Results"
    :title="hasScores ? 'Ranking by Station' : 'Station Results'"
    :description="hasScores ? 'Review scored records by station.' : 'Calculate scores to rank records by station.'"
    tone="warm"
    split-header
  >
    <template #header-aside>
      <div class="ranking-actions">
        <button
          v-if="selectedItems.length > 0"
          type="button"
          class="ranking-button ranking-button--primary"
          :disabled="savingToDb"
          @click="handleSaveToDb"
        >
          Save to DB ({{ selectedItems.length }})
        </button>
        <button
          v-if="totalRecords > 0"
          type="button"
          class="ranking-button ranking-button--ghost"
          :disabled="props.exportingAll"
          @click="handleExportAll"
        >
          Export All ({{ totalRecords }})
        </button>
        <button
          v-if="selectedItems.length > 0"
          type="button"
          class="ranking-button ranking-button--ghost"
          :disabled="exporting"
          @click="handleExport"
        >
          Export Selected ({{ selectedItems.length }})
        </button>
        <button
          v-if="selectedItems.length > 0"
          type="button"
          class="ranking-button ranking-button--success"
          :disabled="bulkDownloading"
          @click="handleBulkDownload"
        >
          Download Selected ({{ selectedItems.length }})
        </button>
        <button
          type="button"
          class="ranking-button ranking-button--secondary"
          :disabled="loading || calculatingScores"
          @click="emit('calculate-scores')"
        >
          {{ hasScores ? 'Re-calculate' : 'Calculate Scores' }}
        </button>
        <span class="ranking-pill ranking-pill--success">{{ totalRecords }} Records</span>
      </div>
    </template>

    <AppTabs v-model="selectedTab" :items="stationTabItems" scrollable>
      <template v-for="item in stationTabItems" :key="String(item.value)" #[`panel-${item.value}`]>
        <section class="ranking-panel">
          <div class="ranking-filter-grid">
            <label class="ranking-field">
              <span>Search Records</span>
              <input v-model="searchQuery" type="text" placeholder="Search ISN, Device ID, Error Code...">
            </label>

            <label class="ranking-field">
              <span>Device IDs</span>
              <input
                v-model="deviceFilterEntry"
                type="text"
                list="ranking-device-filter-options"
                placeholder="Type a device and press Enter"
                @keydown.enter.prevent="commitDeviceFilter"
                @blur="commitDeviceFilter"
              >
              <datalist id="ranking-device-filter-options">
                <option v-for="device in getUniqueDevices(String(item.value))" :key="device" :value="device" />
              </datalist>
              <div v-if="deviceFilter.length > 0" class="ranking-token-row">
                <button
                  v-for="device in deviceFilter"
                  :key="device"
                  type="button"
                  class="ranking-token"
                  @click="removeDeviceFilter(device)"
                >
                  <span>{{ device }}</span>
                  <span aria-hidden="true">x</span>
                </button>
              </div>
            </label>

            <template v-if="hasScores">
              <label class="ranking-field">
                <span>Score Filter</span>
                <AppSelect v-model="scoreFilterType" :options="scoreFilterTypeSelectOptions" placeholder="No filter"
                  :searchable="false" @change="handleScoreFilterTypeChange" />
              </label>

              <label class="ranking-field">
                <span>{{ scoreFilterType === 'between' ? 'Range (e.g. 8-10)' : 'Score Value' }}</span>
                <input
                  v-if="scoreFilterType === 'between'"
                  v-model="scoreRangeInput"
                  type="text"
                  placeholder="8-10"
                  @input="parseScoreRange"
                >
                <input
                  v-else
                  v-model.number="scoreFilterValue"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="0-10"
                  :disabled="!scoreFilterType"
                >
              </label>
            </template>

            <div class="ranking-filter-actions">
              <button v-if="hasActiveFilters" type="button" class="ranking-button ranking-button--ghost" @click="clearAllFilters">
                Clear Filters
              </button>
              <span v-if="hasActiveFilters" class="ranking-pill ranking-pill--primary">{{ activeFilterCount }} active</span>
            </div>
          </div>

          <div class="ranking-table-shell">
            <AppDataGrid
              :columns="gridColumns"
              :rows="filteredRanking"
              data-key="key"
              :selection="selectedItems"
              selection-mode="multiple"
              :show-selection-column="true"
              :loading="loading"
              :paginator="true"
              :rows-per-page="25"
              scroll-height="40rem"
              :row-class="getRankingRowClass"
              :table-style="{ minWidth: '72rem' }"
              @update:selection="selectedItems = ($event as RankingItem[])"
              @row-click="handleGridRowClick($event, String(item.value))"
            >
            <template #cell-rank="{ data }">
              <div class="ranking-rank-cell">
                <template v-if="data.hasError">
                  <span class="ranking-rank-icon ranking-rank-icon--danger">!</span>
                </template>
                <template v-else-if="data.rank === 1">
                  <span class="ranking-rank-icon ranking-rank-icon--gold">1</span>
                </template>
                <template v-else-if="data.rank === 2">
                  <span class="ranking-rank-icon ranking-rank-icon--silver">2</span>
                </template>
                <template v-else-if="data.rank === 3">
                  <span class="ranking-rank-icon ranking-rank-icon--bronze">3</span>
                </template>
                <template v-else>
                  <span class="ranking-rank-fallback">{{ data.rank }}</span>
                </template>
              </div>
            </template>

            <template #cell-isn="{ data }">
              <div class="ranking-isn-cell">
                <button type="button" class="ranking-inline-icon" @click.stop="copyToClipboard(String(data.isn))" title="Copy ISN">
                  Copy
                </button>
                <span class="ranking-isn-value">{{ data.isn }}</span>
              </div>
            </template>

            <template #cell-device="{ value }">
              <span class="ranking-pill ranking-pill--muted">{{ value || '-' }}</span>
            </template>

            <template #cell-testDate="{ value }">
              <span class="ranking-muted">{{ value }}</span>
            </template>

            <template #cell-duration="{ value }">
              <span class="ranking-muted">{{ value }}</span>
            </template>

            <template #cell-status="{ data }">
              <span
                class="ranking-pill"
                :class="data.isForcedFailure ? 'ranking-pill--warning' : (data.hasError ? 'ranking-pill--danger' : 'ranking-pill--success')"
              >
                {{ data.status }}
              </span>
            </template>

            <template #cell-score="{ data }">
              <template v-if="data.hasError && !data.isForcedFailure">
                <span class="ranking-pill ranking-pill--danger">FAIL</span>
              </template>
              <template v-else-if="data.score !== null">
                <span class="ranking-score-chip" :class="`ranking-score-chip--${scoreTone(data.score)}`">
                  {{ (data.score * 10).toFixed(2) }}
                </span>
              </template>
              <template v-else>
                <span class="ranking-muted">-</span>
              </template>
            </template>

            <template #cell-actions="{ data }">
              <button type="button" class="ranking-inline-icon ranking-inline-icon--success" @click.stop="handleDownloadDetails(data as RankingItem, String(item.value))" title="Download Attachment">
                Download
              </button>
            </template>
            </AppDataGrid>
          </div>
        </section>
      </template>
    </AppTabs>
  </AppPanel>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import { AppPanel, AppSelect, AppTabs } from '@/shared/ui'
import type { CsvTestItemData } from '@/features/dut-logs/composables/useIplasApi'
import { adjustIplasDisplayTime, isStatusPass } from '@/shared/utils/helpers'
import { getScoreColor } from '../types/scoring.types'

interface Props {
  records: CsvTestItemData[]
  stationDisplayNames?: Record<string, string>
  scores?: Record<string, number> // Map of ISN+station+time to score
  forcedFailures?: Record<string, { minimumItemScore: number; failingItems: { name: string; score: number }[] }>
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
  status: string // Sortable status: 'PASS', 'Min. Score Fail', or error code
  hasError: boolean
  isForcedFailure: boolean
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
  (e: 'save-to-db', payload: { records: CsvTestItemData[]; scores: Record<string, number> }): void
}>()

const selectedTab = ref<string>('')
const searchQuery = ref<string>('')
// Debounced search query for performance - actual filtering uses this
const debouncedSearchQuery = ref<string>('')
const deviceFilter = ref<string[]>([])
const deviceFilterEntry = ref('')

// Score filter state
const scoreFilterType = ref<string | null>(null)
const scoreFilterValue = ref<number | null>(null)
const scoreFilterValue2 = ref<number | null>(null) // For "between" filter
const scoreRangeInput = ref<string>('') // For "between" filter input (e.g., "8-10")

// Selection state for bulk actions
const selectedItems = ref<RankingItem[]>([])
const bulkDownloading = ref(false)
const exporting = ref(false)
const savingToDb = ref(false)

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

const scoreFilterTypeSelectOptions = [
  { label: 'No filter', value: null },
  ...scoreFilterTypeOptions.map((option) => ({
    label: option.title,
    value: option.value,
  })),
]

// Check if we have scores - must be defined before rankingHeaders
const hasScores = computed(() => {
  return Object.keys(props.scores || {}).length > 0
})

const stationTabItems = computed(() =>
  Object.entries(rankingByStation.value).map(([station, ranking]) => ({
    value: station,
    label: getStationDisplayName(station),
    icon: 'mdi-router-wireless',
    badgeCount: getStationFailCount(station) > 0 ? getStationFailCount(station) : ranking.length,
  })),
)

const gridColumns = computed(() => {
  const columns = [
    { key: 'isn', field: 'isn', header: 'DUT ISN', sortable: true, style: { width: '14rem' } },
    { key: 'device', field: 'device', header: 'Device ID', sortable: true, style: { width: '9rem' } },
    { key: 'testDate', field: 'testDate', header: 'Test End', sortable: true, style: { width: '12rem' } },
    { key: 'duration', field: 'duration', header: 'Duration', sortable: true, style: { width: '8rem' } },
    { key: 'status', field: 'status', header: 'Status', sortable: true, style: { width: '10rem' } },
    { key: 'score', field: 'score', header: 'Score', sortable: true, style: { width: '7rem' } },
    { key: 'actions', field: 'actions', header: 'Actions', style: { width: '8rem' } },
  ]

  if (hasScores.value) {
    columns.unshift({ key: 'rank', field: 'rank', header: '#', sortable: true, style: { width: '5rem' } })
  }

  return columns
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
    const forcedFailure = props.forcedFailures?.[scoreKey]

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
      score: hasError ? (forcedFailure ? score : 0) : score,
      status: forcedFailure ? 'Min. Score Fail' : (hasError ? (record.ErrorCode || '-') : 'PASS'),
      hasError: hasError || !!forcedFailure,
      isForcedFailure: !!forcedFailure,
      errorCode: forcedFailure ? 'MIN_SCORE_FAIL' : record.ErrorCode || '-',
      errorName: forcedFailure
        ? `One or more scored numeric items are below ${forcedFailure.minimumItemScore.toFixed(1)} / 10`
        : record.ErrorName || '',
      originalRecord: record,
    })
  })

  // Sort by score (if available) or test date, and assign ranks
  // Order: PASS first, then Min. Score Fail (by score desc), then real errors
  Object.keys(stationMap).forEach((station) => {
    const items = stationMap[station]

    if (!items) return

    // Separate into three groups: passed, forced failures, real errors
    const passed = items.filter((item) => !item.hasError)
    const forcedFails = items.filter((item) => item.isForcedFailure)
    const realErrors = items.filter((item) => item.hasError && !item.isForcedFailure)

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

    // Sort forced failures by score descending (highest score first)
    forcedFails.sort((a, b) => {
      const scoreA = a.score ?? -Infinity
      const scoreB = b.score ?? -Infinity
      if (scoreA !== scoreB) return scoreB - scoreA
      // Fallback to test date descending
      const dateA = new Date(a.testDate).getTime()
      const dateB = new Date(b.testDate).getTime()
      return dateB - dateA
    })

    // Forced failures don't get a numbered rank
    forcedFails.forEach((item) => {
      item.rank = 999
    })

    // Sort real errors by test date descending
    realErrors.sort((a, b) => {
      const dateA = new Date(a.testDate).getTime()
      const dateB = new Date(b.testDate).getTime()
      return dateB - dateA
    })

    // Real errors don't get a rank
    realErrors.forEach((item) => {
      item.rank = 999
    })

    stationMap[station] = [...passed, ...forcedFails, ...realErrors]
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

function getStationFailCount(stationName: string): number {
  const ranking = rankingByStation.value[stationName]
  return ranking?.filter((item) => item.isForcedFailure).length ?? 0
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
    // Score is stored as 0-1 and displayed/filtered on the 0-10 scale.
    const filterValue = scoreFilterValue.value
    const filterValue2 = scoreFilterValue2.value

    items = items.filter((item) => {
      // Skip items without score (errors)
      if (item.score === null) return false

      const displayScore = item.score * 10

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
  deviceFilterEntry.value = ''
  scoreFilterType.value = null
  scoreFilterValue.value = null
  scoreFilterValue2.value = null
  scoreRangeInput.value = ''
}

function commitDeviceFilter() {
  const value = deviceFilterEntry.value.trim()
  deviceFilterEntry.value = ''
  if (!value || deviceFilter.value.includes(value)) {
    return
  }

  deviceFilter.value = [...deviceFilter.value, value]
}

function removeDeviceFilter(device: string) {
  deviceFilter.value = deviceFilter.value.filter((value) => value !== device)
}

function handleScoreFilterTypeChange() {
  if (!scoreFilterType.value) {
    scoreFilterValue.value = null
    scoreFilterValue2.value = null
    scoreRangeInput.value = ''
  }
}

function getRowProps({ item }: { item: RankingItem }) {
  return {
    class: getRankingRowClass(item),
  }
}

function handleGridRowClick(event: unknown, stationName: string) {
  const payload = event as { data?: RankingItem; value?: RankingItem }
  const row = payload?.data || payload?.value
  if (row) {
    handleRowClick(row, stationName)
  }
}

function getRankingRowClass(item: RankingItem): string {
  if (item.isForcedFailure) return 'forced-fail-row'
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
 * Handle save selected records to database
 */
function handleSaveToDb(): void {
  if (selectedItems.value.length === 0) return

  savingToDb.value = true
  const records = selectedItems.value.map((item) => item.originalRecord)
  // Build a scores map for the selected records
  const selectedScores: Record<string, number> = {}
  for (const item of selectedItems.value) {
    if (item.score !== null) {
      const key = `${item.isn}_${selectedTab.value}_${item.testEndTime}`
      selectedScores[key] = item.score
    }
  }
  emit('save-to-db', { records, scores: selectedScores })
  savingToDb.value = false
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

function scoreTone(score: number) {
  const color = getScoreColor(score)
  if (color.includes('green') || color.includes('success')) return 'success'
  if (color.includes('warning') || color.includes('orange')) return 'warning'
  if (color.includes('error') || color.includes('red')) return 'danger'
  return 'info'
}
</script>

<style scoped>
:deep(.rank-1-row),
:deep(.rank-2-row),
:deep(.rank-3-row),
:deep(.error-row),
:deep(.forced-fail-row) {
  transition: background-color 0.15s ease;
}

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

:deep(.forced-fail-row) {
  background-color: rgba(255, 152, 0, 0.05) !important;
}

.ranking-panel,
.ranking-filter-grid,
.ranking-field {
  display: grid;
  gap: 0.85rem;
}

.ranking-panel {
  min-width: 0;
}

.ranking-actions,
.ranking-token-row,
.ranking-isn-cell,
.ranking-filter-actions,
.ranking-rank-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
}

.ranking-actions {
  justify-content: end;
}

.ranking-filter-grid {
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  margin-bottom: 1rem;
}

.ranking-field span {
  color: var(--app-ink);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: none;
}

.ranking-field input,
.ranking-field select {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.72rem 0.82rem;
  font: inherit;
}

.ranking-button,
.ranking-token,
.ranking-inline-icon {
  min-height: 2.6rem;
  border-radius: 0.75rem;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.ranking-button,
.ranking-token,
.ranking-inline-icon {
  padding: 0.6rem 0.9rem;
}

.ranking-button:hover,
.ranking-token:hover,
.ranking-inline-icon:hover {
  border-color: rgba(15, 118, 110, 0.24);
}

.ranking-button--primary {
  background: var(--app-accent);
  border-color: var(--app-accent);
  color: var(--app-canvas);
}

.ranking-button--secondary {
  background: var(--app-info-soft);
  border-color: var(--app-info-line);
  color: var(--app-info);
}

.ranking-button--success,
.ranking-inline-icon--success {
  background: rgba(15, 118, 110, 0.08);
  border-color: rgba(15, 118, 110, 0.16);
  color: var(--app-accent);
}

.ranking-button--ghost {
  background: var(--app-panel);
}

.ranking-pill,
.ranking-score-chip,
.ranking-rank-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
}

.ranking-pill--success,
.ranking-score-chip--success {
  background: rgba(15, 118, 110, 0.1);
  border-color: rgba(15, 118, 110, 0.16);
  color: var(--app-accent);
}

.ranking-pill--primary,
.ranking-score-chip--info {
  background: var(--app-info-soft);
  border-color: var(--app-info-line);
  color: var(--app-info);
}

.ranking-pill--warning,
.ranking-score-chip--warning {
  background: var(--app-warning-soft);
  border-color: var(--app-warning-line);
  color: var(--app-warning);
}

.ranking-pill--danger,
.ranking-score-chip--danger {
  background: var(--app-danger-soft);
  border-color: var(--app-danger-line);
  color: var(--app-danger);
}

.ranking-pill--muted {
  background: rgba(95, 103, 122, 0.1);
  border-color: rgba(95, 103, 122, 0.16);
  color: var(--app-muted);
}

.ranking-rank-icon--gold {
  background: rgba(255, 215, 0, 0.16);
  color: #8a5b00;
}

.ranking-rank-icon--silver {
  background: rgba(192, 192, 192, 0.22);
  color: #5c6872;
}

.ranking-rank-icon--bronze {
  background: rgba(205, 127, 50, 0.18);
  color: #8f4a1d;
}

.ranking-rank-icon--danger {
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

.ranking-table-shell {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.ranking-rank-fallback,
.ranking-muted {
  color: var(--app-muted);
}

.ranking-isn-value {
  color: var(--app-ink);
  font-family: var(--app-mono, 'Consolas', monospace);
  font-weight: 700;
}

.ranking-panel :deep(.p-datatable-table-container),
.ranking-panel :deep(.p-datatable-wrapper) {
  max-width: 100%;
  overflow-x: auto;
  touch-action: pan-x pan-y;
}

@media (max-width: 1100px) {
  .ranking-filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .ranking-filter-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .ranking-actions {
    justify-content: start;
  }
}
</style>
