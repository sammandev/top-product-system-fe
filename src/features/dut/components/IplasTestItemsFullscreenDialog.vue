<template>
  <AppDialog
    v-model="isOpen"
    v-model:fullscreen="isFullscreen"
    width="min(96vw, 78rem)"
    fullscreen-width="98vw"
    :breakpoints="{ '1200px': '94vw', '768px': '98vw' }"
    fullscreenable
    :show-footer="false"
    sticky-header
    class="fullscreen-dialog"
  >
    <template #header>
      <div class="fullscreen-dialog__dialog-title">
        <Icon icon="mdi:table-eye" />
        <h2>Test Items Details</h2>
      </div>
    </template>
    <template #header-actions>
      <button type="button" class="fullscreen-dialog__download-button" :disabled="downloading"
        :title="downloading ? 'Downloading...' : 'Download'" @click="handleDownload">
        <Icon :icon="downloading ? 'mdi:loading' : 'solar:download-minimalistic-bold-duotone'" :class="{ 'fullscreen-dialog__spin': downloading }" />
        <span>{{ downloading ? 'DOWNLOADING...' : 'DOWNLOAD' }}</span>
      </button>
    </template>

    <div v-if="record" class="fullscreen-dialog__body" :class="{ 'fullscreen-dialog__body--fullscreen': isFullscreen }">
      <section class="fullscreen-dialog__summary-grid">
        <article class="fullscreen-dialog__summary-card fullscreen-dialog__summary-card--highlight">
          <button type="button" class="fullscreen-dialog__info-button" @click="copyToClipboard(record.isn)">
            <span class="fullscreen-dialog__info-icon"><Icon icon="mdi:barcode" /></span>
            <span>
              <small>DUT ISN</small>
              <strong>{{ record.isn || '-' }}</strong>
            </span>
          </button>
        </article>

        <article class="fullscreen-dialog__summary-card">
          <div class="fullscreen-dialog__info-button fullscreen-dialog__info-button--static">
            <span class="fullscreen-dialog__info-icon"><Icon icon="mdi:factory" /></span>
            <span>
              <small>Station</small>
              <strong>{{ record.displayStationName || record.stationName }}</strong>
            </span>
          </div>
        </article>
      </section>

      <section class="fullscreen-dialog__metadata-grid">
        <article class="fullscreen-dialog__metadata-card">
          <button type="button" class="fullscreen-dialog__copy-row" @click="copyToClipboard(record.deviceId)">
            <Icon icon="mdi:chip" />
            <span><strong>Device ID</strong> {{ record.deviceId }}</span>
          </button>
        </article>
        <article class="fullscreen-dialog__metadata-card">
          <div class="fullscreen-dialog__copy-row fullscreen-dialog__copy-row--static">
            <Icon icon="mdi:map-marker" />
            <span><strong>Site</strong> {{ record.site }}</span>
          </div>
        </article>
        <article class="fullscreen-dialog__metadata-card">
          <div class="fullscreen-dialog__copy-row fullscreen-dialog__copy-row--static">
            <Icon icon="mdi:folder" />
            <span><strong>Project</strong> {{ record.project }}</span>
          </div>
        </article>
      </section>

      <section class="fullscreen-dialog__meta-pills">
        <span class="fullscreen-dialog__pill fullscreen-dialog__pill--cool">
          <Icon icon="mdi:calendar-clock" />
          <strong>Start:</strong>
          <span>{{ formatTime(record.testStartTime) }}</span>
        </span>
        <span class="fullscreen-dialog__pill fullscreen-dialog__pill--cool">
          <Icon icon="mdi:calendar-check" />
          <strong>End:</strong>
          <span>{{ formatTime(record.testEndTime) }}</span>
        </span>
        <span class="fullscreen-dialog__pill fullscreen-dialog__pill--neutral">
          <Icon icon="mdi:timer" />
          <strong>Duration:</strong>
          <span>{{ calculateDuration(record.testStartTime, record.testEndTime) }}</span>
        </span>
        <span class="fullscreen-dialog__pill fullscreen-dialog__pill--neutral">
          <Icon icon="mdi:list-box" />
          <strong>Test Items:</strong>
          <span>{{ record.testItems?.length || 0 }}</span>
        </span>
        <button type="button" class="fullscreen-dialog__pill" :class="statusPillClass(record.errorCode)" @click="copyToClipboard(record.errorCode)">
          <Icon :icon="isStatusPass(record.errorCode) ? 'mdi:check-circle' : 'mdi:alert-circle'" />
          <strong>Status:</strong>
          <span>{{ record.errorCode }}</span>
        </button>
        <button
          v-if="record.errorName && record.errorName !== 'N/A' && !isStatusPass(record.errorCode)"
          type="button"
          class="fullscreen-dialog__pill fullscreen-dialog__pill--danger"
          @click="copyToClipboard(record.errorName)"
        >
          <Icon icon="mdi:alert-octagon" />
          <strong>Error:</strong>
          <span>{{ record.errorName }}</span>
        </button>
      </section>

      <section class="fullscreen-dialog__filters">
        <label class="fullscreen-dialog__field">
          <span>Search Test Items (Regex)</span>
          <div class="fullscreen-dialog__search-shell">
            <input
              v-model="searchEntry"
              type="text"
              placeholder="Type regex or text and press Enter"
              @keydown.enter.prevent="commitSearchEntry"
              @blur="commitSearchEntry"
            >
            <button v-if="searchEntry" type="button" class="fullscreen-dialog__inline-button" @click="commitSearchEntry">
              Add
            </button>
          </div>
          <div v-if="searchTerms.length > 0" class="fullscreen-dialog__token-row">
            <button v-for="term in searchTerms" :key="term" type="button" class="fullscreen-dialog__token" @click="removeSearchTerm(term)">
              <span>{{ term }}</span>
              <span aria-hidden="true">x</span>
            </button>
          </div>
        </label>

        <label class="fullscreen-dialog__field">
          <span>Data Type</span>
          <AppSelect v-model="testItemFilter" :options="testItemFilterSelectOptions" placeholder="Show All"
            :searchable="false" />
        </label>

        <label class="fullscreen-dialog__field">
          <span>Status</span>
          <AppSelect v-model="testStatusFilter" :options="testStatusFilterOptions" placeholder="All statuses"
            :searchable="false" />
        </label>

        <div class="fullscreen-dialog__filter-actions">
          <button v-if="hasActiveFilters" type="button" class="fullscreen-dialog__button fullscreen-dialog__button--ghost" @click="clearFilters">
            Clear Filters
          </button>
        </div>
      </section>

      <section class="fullscreen-dialog__table-shell">
        <AppDataGrid
          :columns="testItemColumns"
          :rows="filteredTestItems"
          data-key="NAME"
          :paginator="true"
          :rows-per-page="50"
          :scroll-height="isFullscreen ? 'flex' : '32rem'"
          :table-style="{ minWidth: '54rem' }"
          sticky-header
        >
          <template #cell-STATUS="{ data }">
            <span class="fullscreen-dialog__pill" :class="statusPillClass(String(data.STATUS))">
              {{ normalizeStatus(String(data.STATUS)) }}
            </span>
          </template>
          <template #cell-VALUE="{ data }">
            <span :class="getValueClass(data as NormalizedTestItem)">{{ data.VALUE }}</span>
          </template>
          <template #cell-UCL="{ value }">
            <span class="fullscreen-dialog__muted">{{ value || '-' }}</span>
          </template>
          <template #cell-LCL="{ value }">
            <span class="fullscreen-dialog__muted">{{ value || '-' }}</span>
          </template>
        </AppDataGrid>
      </section>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import { useNotification } from '@/shared/composables/useNotification'
import { AppDialog } from '@/shared/ui'
import AppDataGrid from '@/shared/ui/data-grid/AppDataGrid.vue'
import AppSelect from '@/shared/ui/forms/AppSelect.vue'
import {
  adjustIplasDisplayTime,
  getStatusColor,
  isStatusFail,
  isStatusPass,
  normalizeStatus,
} from '@/shared/utils/helpers'
import type { ScoringType } from '../types/scoring.types'

type TestItemFilterValue = 'all' | 'value' | 'non-value' | 'bin'

// Normalized test item interface with optional scoring data
export interface NormalizedTestItem {
  NAME: string
  STATUS: 'PASS' | 'FAIL' | string
  VALUE: string
  UCL: string
  LCL: string
  CYCLE?: string
  // Optional scoring data (populated when scores are calculated)
  score?: number
  scoringType?: ScoringType
  deviation?: number
  // UPDATED: Added policy, target, and weight for scoring display
  policy?: 'symmetrical' | 'higher' | 'lower'
  target?: number
  weight?: number // Weight used for this test item in scoring (default 1.0)
  forcedFailureThreshold?: number
  maxDeviation?: number | null
  exceedsMaxDeviation?: boolean
}

export interface ForcedFailureItemDetail {
  name: string
  score: number
  deviation?: number
  scoreFail?: boolean
  deviationFail?: boolean
  reasonLabel?: string
}

// Normalized record interface that works for both Station Search and ISN Search
export interface NormalizedRecord {
  // Identifiers
  isn: string
  deviceId: string
  // Station info
  stationName: string
  displayStationName: string
  tsp?: string // TSP from Station Search
  // Location
  site: string
  project: string
  line: string
  // Test result
  errorCode: string
  errorName: string
  testStatus: string
  // Time
  testStartTime: string
  testEndTime: string
  // Test items
  testItems: NormalizedTestItem[]
  // Optional overall scoring data
  overallScore?: number
  valueItemsScore?: number | null
  binItemsScore?: number | null
  isForcedFailure?: boolean
  forcedFailureReason?: string
  forcedFailureItems?: string[]
  forcedFailureDetails?: ForcedFailureItemDetail[]
  forcedFailureMinimumScore?: number
}

interface Props {
  modelValue: boolean
  record: NormalizedRecord | null
  downloading?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'download'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Dialog state
const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// Filter controls
const testItemFilter = ref<TestItemFilterValue>('all')
const testStatusFilter = ref<'ALL' | 'PASS' | 'FAIL'>('ALL')
const searchTerms = ref<string[]>([])
const searchEntry = ref('')
const isFullscreen = ref(false)
const { showInfo: showInfoNotification } = useNotification()

// Filter options for dropdown (Criteria Data is default)
const testItemFilterOptions: Array<{ title: string; value: TestItemFilterValue }> = [
  { title: 'Show All', value: 'all' },
  { title: 'Criteria Data', value: 'value' },
  { title: 'Non-Criteria', value: 'non-value' },
  { title: 'Bin Data', value: 'bin' },
]

const testItemFilterSelectOptions = testItemFilterOptions.map((option) => ({
  label: option.title,
  value: option.value,
}))

const testStatusFilterOptions: Array<{ label: string; value: 'ALL' | 'PASS' | 'FAIL' }> = [
  { label: 'All statuses', value: 'ALL' },
  { label: 'Pass', value: 'PASS' },
  { label: 'Fail', value: 'FAIL' },
]

const testItemColumns = [
  { key: 'NAME', field: 'NAME', header: 'Test Item', sortable: true, style: { width: '24rem' } },
  { key: 'STATUS', field: 'STATUS', header: 'Status', sortable: true, style: { width: '10rem' } },
  { key: 'VALUE', field: 'VALUE', header: 'Value', sortable: true, style: { width: '10rem' } },
  { key: 'UCL', field: 'UCL', header: 'UCL', sortable: true, style: { width: '8rem' } },
  { key: 'LCL', field: 'LCL', header: 'LCL', sortable: true, style: { width: '8rem' } },
]

const FULLSCREEN_DIALOG_BREAKPOINTS: Record<string, string> = {
  '960px': '98vw',
  '640px': '100vw',
}

const STANDARD_DIALOG_BREAKPOINTS: Record<string, string> = {
  '1200px': '94vw',
  '768px': '98vw',
}

const dialogWidth = computed(() => (isFullscreen.value ? '98vw' : 'min(96vw, 88rem)'))
const dialogBreakpoints = computed<Record<string, string>>(() =>
  isFullscreen.value ? FULLSCREEN_DIALOG_BREAKPOINTS : STANDARD_DIALOG_BREAKPOINTS,
)

const hasActiveFilters = computed(() => {
  return (
    searchTerms.value.length > 0 ||
    testStatusFilter.value !== 'ALL' ||
    testItemFilter.value !== 'all'
  )
})

// Helper functions
function isValueData(item: NormalizedTestItem): boolean {
  const value = item.VALUE?.toUpperCase() || ''
  // Value data: not PASS, FAIL, 1, 0, or -999
  if (value === 'PASS' || value === 'FAIL' || value === '1' || value === '0' || value === '-999') {
    return false
  }
  const hasNumericValue = !Number.isNaN(parseFloat(item.VALUE)) && item.VALUE !== ''
  const hasNumericUcl = !Number.isNaN(parseFloat(item.UCL)) && item.UCL !== ''
  const hasNumericLcl = !Number.isNaN(parseFloat(item.LCL)) && item.LCL !== ''
  const numericCount = [hasNumericValue, hasNumericUcl, hasNumericLcl].filter(Boolean).length
  return numericCount >= 2
}

function isPassFailData(item: NormalizedTestItem): boolean {
  const value = item.VALUE?.toUpperCase() || ''
  // STATUS must be PASS, FAIL, 1, 0, or -1 AND VALUE must be PASS, FAIL, 1, 0, or -999
  const isStatusPF = isStatusPass(item.STATUS) || isStatusFail(item.STATUS) || item.STATUS === '-1'
  const isValuePF =
    value === 'PASS' || value === 'FAIL' || value === '1' || value === '0' || value === '-999'
  return isStatusPF && isValuePF
}

// Alias for better naming consistency
function isBinData(item: NormalizedTestItem): boolean {
  return isPassFailData(item)
}

function isNonValueData(item: NormalizedTestItem): boolean {
  return !isValueData(item) && !isBinData(item)
}

function getValueClass(item: NormalizedTestItem): string {
  const value = item.VALUE?.toUpperCase() || ''
  if (value === 'PASS' || value === '1') return 'text-success font-weight-medium'
  if (value === 'FAIL' || value === '0') return 'text-error font-weight-medium'
  if (value === '-999') return 'text-warning'
  return ''
}

function formatTime(timeStr: string): string {
  // Use the centralized helper to adjust time by -1 hour for display
  return adjustIplasDisplayTime(timeStr, 1)
}

function calculateDuration(startStr: string, endStr: string): string {
  if (!startStr || !endStr) return '-'
  try {
    // Handle both formats:
    // 1. API format: "2025-09-16 13:23:57%:z" or "2025-09-16T13:23:57"
    // 2. Display format: "2025/09/16, 21:23:57"
    let start: Date
    let end: Date

    if (startStr.includes('/') && startStr.includes(',')) {
      // Display format: "YYYY/MM/DD, HH:mm:ss"
      const startParts = startStr.replace(',', '').replace(/\//g, '-').replace(/\s+/g, 'T')
      const endParts = endStr.replace(',', '').replace(/\//g, '-').replace(/\s+/g, 'T')
      start = new Date(startParts)
      end = new Date(endParts)
    } else {
      // API format: clean and parse
      const cleanStart = startStr.replace('%:z', '').replace('T', ' ')
      const cleanEnd = endStr.replace('%:z', '').replace('T', ' ')
      start = new Date(`${cleanStart.replace(' ', 'T')}Z`)
      end = new Date(`${cleanEnd.replace(' ', 'T')}Z`)
    }

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-'

    const diffMs = end.getTime() - start.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const minutes = Math.floor(diffSeconds / 60)
    const seconds = diffSeconds % 60
    return `${minutes}m ${seconds}s`
  } catch {
    return '-'
  }
}

async function copyToClipboard(text: string): Promise<void> {
  if (!text) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for older browsers or non-HTTPS contexts
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    showInfoNotification('Copied to clipboard!')
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

function commitSearchEntry(): void {
  const entry = searchEntry.value.trim()
  searchEntry.value = ''
  if (!entry || searchTerms.value.includes(entry)) {
    return
  }
  searchTerms.value = [...searchTerms.value, entry]
}

function removeSearchTerm(term: string): void {
  searchTerms.value = searchTerms.value.filter((value) => value !== term)
}

function clearFilters(): void {
  searchEntry.value = ''
  searchTerms.value = []
  testStatusFilter.value = 'ALL'
  testItemFilter.value = 'all'
}

function statusPillClass(status: string): string {
  return isStatusPass(status)
    ? 'fullscreen-dialog__pill--success'
    : 'fullscreen-dialog__pill--danger'
}

// Computed filtered test items
const filteredTestItems = computed(() => {
  if (!props.record?.testItems) return []

  let items = [...props.record.testItems]

  if (testItemFilter.value !== 'all') {
    items = items.filter((item) => {
      switch (testItemFilter.value) {
        case 'value':
          return isValueData(item)
        case 'non-value':
          return isNonValueData(item)
        case 'bin':
          return isBinData(item)
        default:
          return true
      }
    })
  }

  // Apply test status filter
  if (testStatusFilter.value !== 'ALL') {
    items = items.filter((item) => item.STATUS === testStatusFilter.value)
  }

  // Apply multi-term regex search (OR logic - any term must match)
  if (searchTerms.value.length > 0) {
    items = items.filter((item) => {
      const searchableText =
        `${item.NAME || ''} ${item.STATUS || ''} ${item.VALUE || ''}`.toLowerCase()
      // OR logic: at least one term must match
      return searchTerms.value.some((term) => {
        const trimmedTerm = term.trim().toLowerCase()
        if (!trimmedTerm) return false
        try {
          const regex = new RegExp(trimmedTerm, 'i')
          return regex.test(searchableText)
        } catch {
          // If invalid regex, fall back to simple includes
          return searchableText.includes(trimmedTerm)
        }
      })
    })
  }

  return items
})

// Methods
function close(): void {
  isOpen.value = false
  // Reset filters when closing - will be set again by watcher when reopened
  clearFilters()
  isFullscreen.value = false
}

function handleDownload(): void {
  emit('download')
}

// Reset filters when record changes - show all data if record has error
watch(
  () => props.record,
  (newRecord) => {
    // If record has error (errorCode !== 'PASS'), show all data by default
    if (newRecord && !isStatusPass(newRecord.errorCode)) {
      testItemFilter.value = 'all'
    } else {
      testItemFilter.value = 'value'
    }
    testStatusFilter.value = 'ALL'
    searchTerms.value = []
    searchEntry.value = ''
  },
)
</script>

<style scoped>
.fullscreen-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  height: 100%;
}

.fullscreen-dialog__body--fullscreen {
  flex: 1;
}

.fullscreen-dialog__header,
.fullscreen-dialog__header-copy,
.fullscreen-dialog__header-actions,
.fullscreen-dialog__summary-grid,
.fullscreen-dialog__metadata-grid,
.fullscreen-dialog__meta-pills,
.fullscreen-dialog__filters,
.fullscreen-dialog__token-row,
.fullscreen-dialog__option-row,
.fullscreen-dialog__filter-actions,
.fullscreen-dialog__search-shell {
  display: grid;
  gap: 0.9rem;
}

.fullscreen-dialog__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.fullscreen-dialog__header-copy {
  grid-template-columns: auto 1fr;
  align-items: start;
}

.fullscreen-dialog__dialog-title {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
}

.fullscreen-dialog__dialog-title h2 {
  margin: 0;
  color: inherit;
  font-size: 1.18rem;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.fullscreen-dialog__dialog-title :deep(svg) {
  font-size: 1.08rem;
  color: currentColor;
  flex-shrink: 0;
}

.fullscreen-dialog__header-copy h2 {
  margin: 0.2rem 0;
  color: var(--app-ink);
}

.fullscreen-dialog__header-copy p {
  margin: 0;
  color: var(--app-muted);
}

.fullscreen-dialog__eyebrow {
  color: var(--app-accent);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
}

.fullscreen-dialog__header-icon,
.fullscreen-dialog__info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 1rem;
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-accent);
}

.fullscreen-dialog__header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

.fullscreen-dialog__button,
.fullscreen-dialog__inline-button,
.fullscreen-dialog__token,
.fullscreen-dialog__option,
.fullscreen-dialog__copy-row,
.fullscreen-dialog__info-button,
.fullscreen-dialog__pill,
.fullscreen-dialog__download-button {
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-panel);
  color: var(--app-ink);
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.fullscreen-dialog__button,
.fullscreen-dialog__inline-button,
.fullscreen-dialog__token,
.fullscreen-dialog__option,
.fullscreen-dialog__copy-row,
.fullscreen-dialog__info-button,
.fullscreen-dialog__pill,
.fullscreen-dialog__download-button {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font: inherit;
}

.fullscreen-dialog__button,
.fullscreen-dialog__inline-button,
.fullscreen-dialog__token,
.fullscreen-dialog__option,
.fullscreen-dialog__copy-row,
.fullscreen-dialog__info-button,
.fullscreen-dialog__download-button {
  cursor: pointer;
}

.fullscreen-dialog__button:hover,
.fullscreen-dialog__inline-button:hover,
.fullscreen-dialog__token:hover,
.fullscreen-dialog__option:hover,
.fullscreen-dialog__copy-row:hover,
.fullscreen-dialog__info-button:hover,
.fullscreen-dialog__download-button:hover {
  transform: translateY(-1px);
}

.fullscreen-dialog__button,
.fullscreen-dialog__inline-button,
.fullscreen-dialog__token,
.fullscreen-dialog__option,
.fullscreen-dialog__copy-row,
.fullscreen-dialog__info-button,
.fullscreen-dialog__download-button {
  padding: 0.7rem 0.95rem;
}

.fullscreen-dialog__download-button {
  font-weight: 700;
  border-radius: 0.5rem;
  border: 1.5px solid #fff;
  background: transparent;
  color: #fff;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
}

.fullscreen-dialog__button--ghost {
  background: var(--app-panel);
}

.fullscreen-dialog__summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.fullscreen-dialog__summary-card,
.fullscreen-dialog__metadata-card {
  border: 1px solid var(--app-border);
  border-radius: 0.82rem;
  background: var(--app-panel-strong);
  padding: 0.32rem;
}

.fullscreen-dialog__summary-card--highlight {
  border-color: color-mix(in srgb, var(--app-info) 18%, var(--app-border));
  background: var(--app-panel);
}

.fullscreen-dialog__info-button {
  width: 100%;
  justify-content: flex-start;
}

.fullscreen-dialog__info-button--static,
.fullscreen-dialog__copy-row--static {
  cursor: default;
}

.fullscreen-dialog__info-button span,
.fullscreen-dialog__copy-row span {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
}

.fullscreen-dialog__info-button small {
  color: var(--app-muted);
  font-size: 0.72rem;
  letter-spacing: 0;
  text-transform: none;
}

.fullscreen-dialog__metadata-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.fullscreen-dialog__meta-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.fullscreen-dialog__pill {
  padding: 0.42rem 0.72rem;
  font-weight: 700;
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 0.78rem;
}

.fullscreen-dialog__pill--cool {
  background: var(--app-info-soft);
  border-color: var(--app-info-line);
  color: var(--app-info);
}

.fullscreen-dialog__pill--neutral {
  background: rgba(95, 103, 122, 0.08);
  border-color: rgba(95, 103, 122, 0.16);
  color: var(--app-muted);
}

.fullscreen-dialog__pill--success {
  background: var(--app-success-soft);
  border-color: var(--app-success-line);
  color: var(--app-success);
}

.fullscreen-dialog__pill--danger {
  background: var(--app-danger-soft);
  border-color: var(--app-danger-line);
  color: var(--app-danger);
}

.fullscreen-dialog__filters {
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1.2fr) minmax(0, 0.8fr) auto;
  align-items: end;
  padding: 0.82rem 0.9rem;
  border: 1px solid var(--app-border);
  border-radius: 0.82rem;
  background: var(--app-panel);
}

.fullscreen-dialog__field {
  display: grid;
  gap: 0.55rem;
}

.fullscreen-dialog__field span {
  color: var(--app-ink);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: none;
}

.fullscreen-dialog__field input,
.fullscreen-dialog__field select {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--app-info) 16%, var(--app-border));
  border-radius: 0.72rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.68rem 0.8rem;
  font: inherit;
}

.fullscreen-dialog__search-shell {
  grid-template-columns: minmax(0, 1fr) auto;
  border: 1px solid color-mix(in srgb, var(--app-info) 16%, var(--app-border));
  border-radius: 0.72rem;
  background: var(--app-panel-strong);
  padding: 0.24rem;
  align-items: center;
}

.fullscreen-dialog__token-row,
.fullscreen-dialog__option-row {
  display: flex;
  flex-wrap: wrap;
}

.fullscreen-dialog__option--active {
  background: rgba(15, 118, 110, 0.1);
  border-color: rgba(15, 118, 110, 0.18);
  color: var(--app-accent);
}

.fullscreen-dialog__filter-actions {
  display: flex;
  justify-content: flex-end;
}

.fullscreen-dialog__table-shell {
  min-height: 0;
  flex: 1;
  display: flex;
  padding: 0.55rem 0.55rem 0;
  border: 1px solid var(--app-border);
  border-radius: 0.82rem;
  background: var(--app-panel);
  overflow: hidden;
}

.fullscreen-dialog__body--fullscreen .fullscreen-dialog__table-shell {
  min-height: 0;
}

:deep(.fullscreen-dialog.app-dialog--fullscreen .p-dialog-content) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

:deep(.fullscreen-dialog.app-dialog--fullscreen .app-dialog__body) {
  flex: 1;
  min-height: 0;
}

.fullscreen-dialog__table-shell > .app-data-grid {
  display: flex;
  flex: 1;
  min-height: 0;
}

.fullscreen-dialog__table-shell :deep(.p-datatable) {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.fullscreen-dialog__table-shell :deep(.p-datatable-wrapper),
.fullscreen-dialog__table-shell :deep(.p-datatable-table-container) {
  flex: 1 1 auto;
  min-height: 0;
}

.fullscreen-dialog__muted {
  color: var(--app-muted);
}

.fullscreen-dialog__spin {
  animation: fullscreen-dialog-spin 1s linear infinite;
}

@keyframes fullscreen-dialog-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 960px) {
  .fullscreen-dialog__summary-grid,
  .fullscreen-dialog__metadata-grid,
  .fullscreen-dialog__filters {
    grid-template-columns: minmax(0, 1fr);
  }

  .fullscreen-dialog__header {
    flex-direction: column;
  }

  .fullscreen-dialog__header-actions,
  .fullscreen-dialog__filter-actions {
    justify-content: flex-start;
  }
}
</style>
