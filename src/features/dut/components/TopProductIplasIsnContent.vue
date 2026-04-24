<template>
  <div class="top-product-iplas-isn-shell">
    <AppPanel
      eyebrow="Selection Controls"
      title="ISN Search"
      description="Build an ISN batch, optionally expand the identifier search, then hand the resulting station set into the same migrated station-configuration workflow used by the station search pane."
      tone="cool"
      split-header
    >
      <template #header-aside>
        <button
          v-if="isnProjectInfo"
          type="button"
          class="top-product-iplas-isn-button top-product-iplas-isn-button--ghost"
          :disabled="loadingTestItems"
          @click="handleClearAll"
        >
          Clear All
        </button>
      </template>

      <div class="top-product-iplas-isn-stack">
        <div class="top-product-iplas-isn-toolbar">
          <div class="top-product-iplas-isn-toggle-row">
            <button
              type="button"
              class="top-product-iplas-isn-toggle-chip"
              :class="{ 'is-active': inputMode === 'multiple' }"
              @click="inputMode = 'multiple'"
            >
              Multiple ISNs
            </button>
            <button
              type="button"
              class="top-product-iplas-isn-toggle-chip"
              :class="{ 'is-active': inputMode === 'bulk' }"
              @click="inputMode = 'bulk'"
            >
              Bulk Paste
            </button>
          </div>

          <label class="top-product-iplas-isn-toggle-card">
            <input v-model="enableUnifiedSearch" type="checkbox">
            <div>
              <strong>Unified Search</strong>
              <p>Search related identifiers through SFISTSP to pull DUT history even when different ISN, SSN, or MAC variants were used.</p>
            </div>
          </label>
        </div>

        <label v-if="inputMode === 'multiple'" class="top-product-iplas-isn-field">
          <span>DUT ISNs</span>
          <div class="top-product-iplas-isn-entry-row">
            <input
              v-model="multipleIsnSearchText"
              type="text"
              placeholder="Type ISN and press Enter"
              @keydown.enter.prevent="commitMultipleIdentifier"
            >
            <button type="button" class="top-product-iplas-isn-button top-product-iplas-isn-button--secondary" :disabled="!multipleIsnSearchText.trim()" @click="commitMultipleIdentifier">
              Add
            </button>
            <button type="button" class="top-product-iplas-isn-button top-product-iplas-isn-button--primary" :disabled="multipleModeIdentifiers.length === 0" @click="handleLookupStations">
              {{ loadingStationLookup ? 'Searching...' : 'Search' }}
            </button>
          </div>
          <small>Press Enter or use Add to queue identifiers, then Search to resolve site, project, and station coverage.</small>
          <div v-if="selectedISNs.length > 0" class="top-product-iplas-isn-token-row">
            <button
              v-for="(isn, index) in selectedISNs"
              :key="`${isn}-${index}`"
              type="button"
              class="top-product-iplas-isn-token"
              @click="removeSelectedISN(index)"
            >
              <span>{{ isn }}</span>
              <span aria-hidden="true">x</span>
            </button>
          </div>
        </label>

        <label v-else class="top-product-iplas-isn-field">
          <span>Bulk ISN Input</span>
          <textarea
            v-model="searchIsn"
            rows="4"
            placeholder="Paste multiple ISNs, one per line, comma-separated, or space-separated"
          />
          <div class="top-product-iplas-isn-entry-row top-product-iplas-isn-entry-row--end">
            <small>Paste ISNs separated by newlines, commas, or spaces.</small>
            <button type="button" class="top-product-iplas-isn-button top-product-iplas-isn-button--primary" :disabled="!searchIsn.trim()" @click="handleLookupStations">
              {{ loadingStationLookup ? 'Searching...' : 'Search' }}
            </button>
          </div>
        </label>

        <section v-if="isnProjectInfo" class="top-product-iplas-isn-lookup-card">
          <div class="top-product-iplas-isn-chip-row">
            <span class="top-product-iplas-isn-pill top-product-iplas-isn-pill--primary">{{ parsedIsns.length }} ISN(s)</span>
            <span class="top-product-iplas-isn-pill top-product-iplas-isn-pill--info">Site: {{ isnProjectInfo.site }}</span>
            <span class="top-product-iplas-isn-pill top-product-iplas-isn-pill--info">Project: {{ isnProjectInfo.project }}</span>
            <span class="top-product-iplas-isn-pill top-product-iplas-isn-pill--success">{{ availableStations.length }} Stations</span>
          </div>
          <p>The lookup has resolved a project scope. Configure stations next to refine device selection and scoring rules before ranking the returned records.</p>
        </section>

        <div v-if="isnProjectInfo" class="top-product-iplas-isn-action-card">
          <div>
            <strong>Configure Stations</strong>
            <p>Use the shared station-selection and station-configuration dialogs to scope the resolved ISN history.</p>
          </div>
          <button
            type="button"
            class="top-product-iplas-isn-button top-product-iplas-isn-button--secondary"
            :disabled="availableStations.length === 0"
            @click="openStationSelectionDialog"
          >
            {{ loadingStations ? 'Loading...' : 'Configure Stations' }}
            <strong v-if="configuredStationsCount > 0">{{ configuredStationsCount }}</strong>
          </button>
        </div>

        <section v-if="configuredStationsCount > 0" class="top-product-iplas-isn-summary-panel">
          <div class="top-product-iplas-isn-summary-panel__header">
            <div>
              <p class="top-product-iplas-isn-summary-panel__eyebrow">Configured Stations</p>
              <h3>Selection Summary</h3>
            </div>
          </div>

          <div class="top-product-iplas-isn-token-grid">
            <button
              v-for="(config, displayName) in stationConfigs"
              :key="displayName"
              type="button"
              class="top-product-iplas-isn-token-card"
              @click="editStationConfig(displayName)"
            >
              <div>
                <strong>{{ displayName }}</strong>
                <p>{{ config.deviceIds.length || config.totalDeviceCount || 'All' }} device(s)</p>
              </div>
              <div class="top-product-iplas-isn-token-card__meta">
                <span class="top-product-iplas-isn-pill top-product-iplas-isn-pill--info">
                  {{ config.deviceIds.length || config.totalDeviceCount || 'All' }} Device(s)
                </span>
                <span class="top-product-iplas-isn-pill" :class="(config.minimumItemScoreEnabled ?? true) ? 'top-product-iplas-isn-pill--warning' : 'top-product-iplas-isn-pill--muted'">
                  {{ (config.minimumItemScoreEnabled ?? true) ? `Min ${(config.minimumItemScore ?? 6.5).toFixed(1)}` : 'Min Off' }}
                </span>
                <span
                  role="button"
                  tabindex="0"
                  class="top-product-iplas-isn-remove"
                  @click.stop="removeStationConfig(displayName)"
                  @keydown.enter.stop.prevent="removeStationConfig(displayName)"
                  @keydown.space.stop.prevent="removeStationConfig(displayName)"
                >
                  Remove
                </span>
              </div>
            </button>
          </div>
        </section>
      </div>
    </AppPanel>

    <div v-if="error" class="top-product-iplas-isn-notice top-product-iplas-isn-notice--error">
      {{ error }}
    </div>

    <!-- UPDATED: Results Section with TopProductIplasRanking (like Station Search) -->
    <TopProductIplasRanking v-if="testItemData.length > 0" :records="testItemData" :scores="recordScores"
      :forced-failures="forcedFailures"
      :calculating-scores="calculatingScores" :exporting-all="exportingAll" @row-click="handleRowClick"
      @download="handleDownloadRecord" @bulk-download="handleBulkDownloadRecords" @export="handleExportRecords"
      @export-all="handleExportAllRecords" @calculate-scores="handleCalculateScores"
      @save-to-db="handleSaveToDb" />

    <!-- Station Selection Dialog -->
    <StationSelectionDialog v-model:show="showStationSelectionDialog" :stations="(availableStations as any)"
      :site="isnProjectInfo?.site || ''" :project="isnProjectInfo?.project || ''" :selected-configs="stationConfigs"
      :loading="loadingStations" @station-click="handleStationClick" @confirm="handleStationSelectionConfirm" />

    <!-- Station Config Dialog -->
    <StationConfigDialog v-model:show="showStationConfigDialog" :station="selectedStationForConfig"
      :site="isnProjectInfo?.site || ''" :project="isnProjectInfo?.project || ''"
      :existing-config="currentStationConfig" :available-device-ids="currentStationDeviceIds"
      :loading-devices="loadingCurrentStationDevices" :device-error="deviceError"
      :available-test-items="currentStationTestItems" test-item-source="iplas"
      :loading-test-items="loadingCurrentStationTestItems"
      :test-items-error="testItemsError" @save="handleStationConfigSave" @remove="handleStationConfigRemove"
      @refresh-devices="refreshCurrentStationDevices" @refresh-test-items="refreshCurrentStationTestItems"
      @change-test-item-source="() => {}" />

    <!-- Details Dialog -->
    <TopProductIplasDetailsDialog v-model="showDetailsDialog" :record="detailsRecord" :downloading="detailsDownloading"
      @download="handleDownloadFromDetails" />
  </div>
</template>

<script setup lang="ts">
// UPDATED: Complete rewrite of script section for new UX flow
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useScoring } from '@/features/dut/composables/useScoring'
import { evaluateForcedFailure } from '@/features/dut/utils/iplasForcedFailure'
import type { IplasDownloadCsvLogInfo } from '@/features/dut-logs/api/iplasProxyApi'
import {
  type ExportRecord,
  type ExportTestItem,
  type IplasIsnProjectInfo,
  type IplasIsnSearchRecord,
  iplasProxyApi,
} from '@/features/dut-logs/api/iplasProxyApi'
import {
  lookupIsnsBatch,
  type SfistspIsnReferenceResponse,
} from '@/features/dut-logs/api/sfistspApi'
import {
  type CsvTestItemData,
  type Station,
  type TestItem,
  useIplasApi,
} from '@/features/dut-logs/composables/useIplasApi'
import {
  createTopProductsBulk,
  type TopProductCreate,
  type TopProductMeasurementCreate,
} from '@/features/top-products/api/topProducts.api'
import { useNotification } from '@/shared/composables/useNotification'
import { AppPanel } from '@/shared/ui'
import { getErrorMessage } from '@/shared/utils'
import { getApiErrorDetail } from '@/shared/utils/error'
import { isStatusPass } from '@/shared/utils/helpers'
import type { NormalizedRecord, NormalizedTestItem } from './IplasTestItemsFullscreenDialog.vue'
import StationConfigDialog, { type TestItemInfo } from './StationConfigDialog.vue'
import StationSelectionDialog, { type StationConfig } from './StationSelectionDialog.vue'
import TopProductIplasDetailsDialog from './TopProductIplasDetailsDialog.vue'
import TopProductIplasRanking from './TopProductIplasRanking.vue'

const { showSuccess, showError: showErrorNotification } = useNotification()
const ISN_SEARCH_BATCH_LIMIT = 100

// ============================================================================
// State: ISN Input
// ============================================================================
const inputMode = ref<'multiple' | 'bulk'>('multiple')
const searchIsn = ref('')
const selectedISNs = ref<string[]>([])
const multipleIsnSearchText = ref('')

// ============================================================================
// State: SFISTSP Reference Lookup
// ============================================================================
/** All unique identifiers to search (ISN, SSN, MAC) */
const allIdentifiersToSearch = ref<string[]>([])
/** SFISTSP lookup results for reference */
const sfistspReferences = ref<SfistspIsnReferenceResponse[]>([])
/** Loading state for SFISTSP lookup */
const loadingSfistsp = ref(false)
/** Toggle for unified search (ISN/SSN/MAC reference lookup) */
const enableUnifiedSearch = ref(true)

// ============================================================================
// State: Station Lookup
// ============================================================================
const loadingStationLookup = ref(false)
const isnProjectInfo = ref<IplasIsnProjectInfo | null>(null)
const availableStations = ref<Station[]>([])
const parsedIsns = ref<string[]>([])
/** Raw ISN search records from the API - contains all test data */
const isnSearchRecords = ref<IplasIsnSearchRecord[]>([])
const activeLookupRequestId = ref(0)

// ============================================================================
// State: Configuration (like Station Search)
// ============================================================================
const loadingStations = ref(false)
const stationConfigs = ref<Record<string, StationConfig>>({})
const showStationSelectionDialog = ref(false)
const showStationConfigDialog = ref(false)
const selectedStationForConfig = ref<Station | null>(null)
const currentStationDeviceIds = ref<string[]>([])
const loadingCurrentStationDevices = ref(false)
const deviceError = ref<string | null>(null)
const currentStationTestItems = ref<TestItemInfo[]>([])
const loadingCurrentStationTestItems = ref(false)
const testItemsError = ref<string | null>(null)
const testItemNamesCache = ref<Map<string, TestItemInfo[]>>(new Map())

// ============================================================================
// State: Data Fetching & Results
// ============================================================================
const {
  loadingTestItems,
  error,
  testItemData,
  fetchTestItemNamesCached,
  downloadAttachments,
  downloadCsvLogs,
  clearTestItemData,
} = useIplasApi()

// Local loading state for ISN-based data processing
const processingIsnData = ref(false)

// ============================================================================
// State: Scoring
// ============================================================================
const {
  initializeConfigs,
  calculateScores,
  scoredRecords,
  error: scoringError,
  updateConfig: updateScoringConfig,
  setScoringType,
} = useScoring()
const recordScores = ref<Record<string, number>>({})
const forcedFailures = ref<Record<string, { minimumItemScore: number; failingItems: { name: string; score: number }[] }>>({})
const calculatingScores = ref(false)

// ============================================================================
// State: Details Dialog
// ============================================================================
const showDetailsDialog = ref(false)
const detailsRecord = ref<NormalizedRecord | null>(null)
const detailsDownloading = ref(false)

// ============================================================================
// State: Export
// ============================================================================
const exportingAll = ref(false)

// ============================================================================
// Computed
// ============================================================================
const configuredStationsCount = computed(() => {
  return Object.keys(stationConfigs.value).length
})

const multipleModeIdentifiers = computed(() =>
  normalizeIdentifierList([...selectedISNs.value.map((value) => String(value)), multipleIsnSearchText.value]),
)

const currentStationConfig = computed(() => {
  if (!selectedStationForConfig.value) return undefined
  return stationConfigs.value[selectedStationForConfig.value.display_station_name]
})

function commitMultipleIdentifier(): void {
  const value = multipleIsnSearchText.value.trim()
  if (!value) {
    return
  }

  const nextIdentifiers = normalizeIdentifierList([...selectedISNs.value, value])
  selectedISNs.value = nextIdentifiers
  multipleIsnSearchText.value = ''
}

function removeSelectedISN(index: number): void {
  selectedISNs.value.splice(index, 1)
}

// ============================================================================
// Utility Functions
// ============================================================================
/** Generate export filename in format: {Site}_{Project}_{YYYYMMDD}_{hhmmss} */
function generateExportFilename(): string {
  const site = isnProjectInfo.value?.site || 'Unknown'
  const project = isnProjectInfo.value?.project || 'Unknown'
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  return `${site}_${project}_${dateStr}_${timeStr}`
}

/**
 * Get timezone offset in hours based on site
 * PTB (Vietnam), PVN (Vietnam) = UTC+8
 * PSZ (China), PTY (Taiwan) = UTC+8
 */
function getSiteTimezoneOffset(site: string): number {
  const siteUpper = (site || '').toUpperCase()
  if (siteUpper === 'PTB' || siteUpper === 'PVN') {
    return 8 // UTC+8
  } else if (siteUpper === 'PSZ' || siteUpper === 'PTY') {
    return 8 // UTC+8
  }
  // Default to UTC+8 for unknown sites
  return 8
}

/**
 * Format time for display in tables
 * Input: "2025-09-16 13:23:57%:z" (UTC+0 time from isn_search API)
 * Output: "2025/09/16, 21:23:57" (local time in display format)
 *
 * CRITICAL: isn_search API returns UTC+0 time. We need to convert to local time.
 */
function formatTimeForDisplay(timeStr: string, site: string): string {
  if (!timeStr) return ''

  // Clean the time string: remove %:z suffix
  const cleanedTime = timeStr.replace('%:z', '').replace('T', ' ')

  // Parse as UTC
  const utcDate = new Date(`${cleanedTime.replace(' ', 'T')}Z`)

  // Get timezone offset based on site
  const offsetHours = getSiteTimezoneOffset(site)

  // Add timezone offset
  const localDate = new Date(utcDate.getTime() + offsetHours * 60 * 60 * 1000)

  // Format as YYYY/MM/DD, HH:mm:ss (consistent with iPLAS display format)
  const year = localDate.getUTCFullYear()
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(localDate.getUTCDate()).padStart(2, '0')
  const hours = String(localDate.getUTCHours()).padStart(2, '0')
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0')
  const seconds = String(localDate.getUTCSeconds()).padStart(2, '0')

  return `${year}/${month}/${day}, ${hours}:${minutes}:${seconds}`
}

function formatTimeForDownload(timeStr: string): string {
  if (!timeStr) return ''

  return timeStr
    .replace(',', '')
    .replace('T', ' ')
    .replace(/-/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .split('.')[0] || ''
}

function formatTimeForCsvDownload(timeStr: string): string {
  const formatted = formatTimeForDownload(timeStr)
  return formatted ? `${formatted}.000` : ''
}

function normalizeIdentifierList(values: string[]): string[] {
  const uniqueValues = new Set<string>()

  for (const value of values) {
    const trimmed = value.trim()
    if (trimmed) {
      uniqueValues.add(trimmed)
    }
  }

  return Array.from(uniqueValues)
}

function parseBulkIdentifiers(input: string): string[] {
  return normalizeIdentifierList(input.split(/[\n,\s]+/))
}

function getCurrentInputIdentifiers(): string[] {
  if (inputMode.value === 'multiple') {
    return multipleModeIdentifiers.value
  }

  return parseBulkIdentifiers(searchIsn.value)
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}

function startLookupRequest(): number {
  activeLookupRequestId.value += 1
  return activeLookupRequestId.value
}

function isLookupRequestActive(requestId: number): boolean {
  return activeLookupRequestId.value === requestId
}

async function handleMultipleIsnsEnter(event: KeyboardEvent): Promise<void> {
  if (loadingStationLookup.value) {
    event.preventDefault()
    return
  }

  if (multipleIsnSearchText.value.trim()) {
    return
  }

  if (multipleModeIdentifiers.value.length === 0) {
    return
  }

  event.preventDefault()
  await handleLookupStations()
}

async function searchIdentifiersInBatches(identifiers: string[]): Promise<{
  allRecords: IplasIsnSearchRecord[]
  foundIdentifiers: string[]
  notFoundIdentifiers: string[]
}> {
  const allRecords: IplasIsnSearchRecord[] = []
  const foundIdentifiers: string[] = []
  const notFoundIdentifiers: string[] = []
  const recordKeys = new Set<string>()

  for (const batch of chunkArray(identifiers, ISN_SEARCH_BATCH_LIMIT)) {
    const response = await iplasProxyApi.searchByIsnBatch({ isns: batch })

    if (!Array.isArray(response.results)) {
      throw new Error('iPLAS API returned an invalid batch ISN search response')
    }

    for (const result of response.results) {
      const records = Array.isArray(result.data) ? result.data : []

      if (records.length === 0) {
        notFoundIdentifiers.push(result.isn)
        if (result.error) {
          console.warn(`Failed to search identifier "${result.isn}":`, result.error)
        }
        continue
      }

      foundIdentifiers.push(result.isn)

      for (const record of records) {
        const key = `${record.isn}_${record.display_station_name}_${record.test_end_time}`
        if (!recordKeys.has(key)) {
          recordKeys.add(key)
          allRecords.push(record)
        }
      }
    }
  }

  return {
    allRecords,
    foundIdentifiers,
    notFoundIdentifiers,
  }
}

async function refreshStationOrderingForLookup(
  identifier: string,
  records: IplasIsnSearchRecord[],
  requestId: number,
): Promise<void> {
  loadingStations.value = true

  try {
    const stationsFromApi = await fetchStationListFromIsn(identifier)

    if (!isLookupRequestActive(requestId) || stationsFromApi.length === 0) {
      return
    }

    const stationsWithRecords = new Set(records.map((record) => record.display_station_name))
    availableStations.value = stationsFromApi
      .filter((station) => stationsWithRecords.has(station.display_station_name))
      .sort((stationA, stationB) => stationA.order - stationB.order)

    console.info(`Using ${availableStations.value.length} stations from API list (ordered)`)
  } catch (err) {
    console.warn(`Failed to refresh ordered station list for identifier ${identifier}:`, err)
  } finally {
    if (isLookupRequestActive(requestId)) {
      loadingStations.value = false
    }
  }
}

// ============================================================================
// Helper Functions: Transform ISN Search Data to CsvTestItemData
// ============================================================================
function transformIsnRecordToCsvData(record: IplasIsnSearchRecord): CsvTestItemData {
  // Transform test items from ISN format to standard TestItem format
  const testItems: TestItem[] = (record.test_item || []).map((item) => ({
    NAME: item.NAME,
    STATUS: item.STATUS,
    VALUE: item.VALUE,
    UCL: item.UCL || '',
    LCL: item.LCL || '',
    CYCLE: item.CYCLE || '',
  }))

  // UPDATED: Convert UTC times from ISN API to local time for display
  // ISN API returns UTC+0 time with %:z suffix, need to convert to local time
  const localStartTime = formatTimeForDisplay(record.test_start_time, record.site)
  const localEndTime = formatTimeForDisplay(record.test_end_time, record.site)

  return {
    Site: record.site,
    Project: record.project,
    station: record.display_station_name,
    TSP: record.station_name,
    Model: '',
    MO: record.mo || '',
    Line: record.line,
    ISN: record.isn,
    DeviceId: record.device_id,
    'Test Status': record.test_status,
    'Test Start Time': localStartTime,
    'Test end Time': localEndTime,
    ErrorCode: record.error_code,
    ErrorName: record.error_name || 'N/A',
    TestItem: testItems,
  }
}

/** Extract unique stations from ISN search records */
function extractStationsFromIsnRecords(records: IplasIsnSearchRecord[]): Station[] {
  const stationMap = new Map<string, Station>()

  for (const record of records) {
    if (!stationMap.has(record.display_station_name)) {
      stationMap.set(record.display_station_name, {
        station_name: record.station_name,
        display_station_name: record.display_station_name,
        order: 0,
        data_source: 'ISN Search',
      })
    }
  }

  return Array.from(stationMap.values())
}

/** Extract unique device IDs from ISN search records for a specific station */
function extractDeviceIdsFromRecords(
  records: IplasIsnSearchRecord[],
  stationName: string,
): string[] {
  const deviceIds = new Set<string>()

  for (const record of records) {
    // Match by display_station_name (primary) or station_name (fallback)
    const stationMatches =
      record.display_station_name === stationName || record.station_name === stationName
    if (stationMatches && record.device_id) {
      deviceIds.add(record.device_id)
    }
  }

  return Array.from(deviceIds).sort()
}

/** Extract unique test item names from ISN search records for a specific station */
function extractTestItemsFromRecords(
  records: IplasIsnSearchRecord[],
  stationName: string,
): TestItemInfo[] {
  const testItemMap = new Map<string, TestItemInfo>()

  for (const record of records) {
    // Match by display_station_name (primary) or station_name (fallback)
    if (record.display_station_name !== stationName && record.station_name !== stationName) continue

    for (const item of record.test_item || []) {
      if (!testItemMap.has(item.NAME)) {
        // Determine if value or bin based on UCL/LCL presence and value format
        const hasUcl = Boolean(item.UCL?.trim())
        const hasLcl = Boolean(item.LCL?.trim())
        const hasLimits = hasUcl || hasLcl

        // It's a BIN item if no limits and value is a pass/fail type string
        const binValues = ['PASS', 'FAIL', 'FAILURE', '1', '0', '-1']
        const isBinValue = binValues.includes(String(item.VALUE).toUpperCase())
        const isBin = !hasLimits && isBinValue

        testItemMap.set(item.NAME, {
          name: item.NAME,
          isValue: !isBin,
          isBin: isBin,
          hasUcl: hasUcl,
          hasLcl: hasLcl,
        })
      }
    }
  }

  return Array.from(testItemMap.values())
}

// ============================================================================
// ISN Lookup Functions
// ============================================================================

/**
 * Lookup ISN references from SFISTSP to get SSN and MAC.
 * Returns a list of all unique identifiers (ISN, SSN, MAC) to search in iPLAS.
 */
async function lookupSfistspReferences(isnList: string[]): Promise<string[]> {
  loadingSfistsp.value = true
  sfistspReferences.value = []

  try {
    // Use batch lookup for efficiency
    const batchResponse = await lookupIsnsBatch(isnList)
    sfistspReferences.value = batchResponse.results

    // Collect only primary identifiers: isn (or isn_searched if isn not present), ssn, mac
    // Do NOT collect isn_references to avoid searching all related ISNs
    const identifiers = new Set<string>()

    for (const ref of batchResponse.results) {
      // Add the primary ISN: use 'isn' if present, otherwise use 'isn_searched'
      if (ref.isn?.trim()) {
        identifiers.add(ref.isn.trim())
      } else if (ref.isn_searched?.trim()) {
        // If 'isn' is not present, user's input is the primary ISN
        identifiers.add(ref.isn_searched.trim())
      }
      // Add SSN if available
      if (ref.ssn?.trim()) {
        identifiers.add(ref.ssn.trim())
      }
      // Add MAC if available
      if (ref.mac?.trim()) {
        identifiers.add(ref.mac.trim())
      }
      // NOTE: Intentionally not adding isn_references to limit search scope
    }

    console.info(
      `SFISTSP lookup found ${identifiers.size} unique identifiers from ${isnList.length} ISNs`,
    )
    return Array.from(identifiers)
  } catch (err) {
    console.warn('SFISTSP lookup failed, using original ISNs only:', err)
    // If SFISTSP fails, just use the original ISNs
    return isnList
  } finally {
    loadingSfistsp.value = false
  }
}

/**
 * Fetch station list with proper ordering from iPLAS v2 API.
 * Uses the /isn/stations or /isn-batch/stations endpoint.
 */
async function fetchStationListFromIsn(identifier: string): Promise<Station[]> {
  try {
    const response = await iplasProxyApi.getStationsFromIsn({ isn: identifier })

    if (!response.isn_info.found) {
      console.warn(`Station list not found for identifier: ${identifier}`)
      return []
    }

    // Convert IplasStation to Station format with proper ordering
    return response.stations.map((s) => ({
      station_name: s.station_name,
      display_station_name: s.display_station_name,
      order: s.order,
      data_source: s.data_source,
    }))
  } catch (err) {
    console.warn(`Failed to fetch station list for identifier ${identifier}:`, err)
    return []
  }
}

async function handleLookupStations(): Promise<void> {
  const isnList = getCurrentInputIdentifiers()

  if (isnList.length === 0) {
    error.value = 'Please enter at least one valid ISN'
    return
  }

  const requestId = startLookupRequest()

  // Store parsed ISNs
  parsedIsns.value = isnList

  // Clear previous state
  isnProjectInfo.value = null
  availableStations.value = []
  stationConfigs.value = {}
  isnSearchRecords.value = []
  allIdentifiersToSearch.value = []
  sfistspReferences.value = []
  clearTestItemData()
  recordScores.value = {}
  forcedFailures.value = {}
  loadingStations.value = false

  loadingStationLookup.value = true
  error.value = null

  try {
    // STEP 1: Conditionally lookup SFISTSP to get all ISN, SSN, MAC references
    let allIdentifiers: string[]
    if (enableUnifiedSearch.value) {
      allIdentifiers = await lookupSfistspReferences(isnList)
    } else {
      // Skip SFISTSP lookup - use original ISN list only
      allIdentifiers = isnList
    }

    if (!isLookupRequestActive(requestId)) {
      return
    }

    allIdentifiersToSearch.value = allIdentifiers

    // STEP 2: Search for all identifiers in batch requests and aggregate results
    const { allRecords, foundIdentifiers, notFoundIdentifiers } = await searchIdentifiersInBatches(
      allIdentifiers,
    )

    if (!isLookupRequestActive(requestId)) {
      return
    }

    if (allRecords.length === 0) {
      error.value = `No data found for identifier(s): ${allIdentifiers.slice(0, 5).join(', ')}${allIdentifiers.length > 5 ? '...' : ''}`
      return
    }

    // Log summary
    console.info(
      `Found ${allRecords.length} unique records from ${foundIdentifiers.length} identifiers (${notFoundIdentifiers.length} not found)`,
    )

    // Store the raw ISN search records for later use (aggregated and deduplicated)
    isnSearchRecords.value = allRecords

    // Extract project info from first record (assume same project for all)
    // biome-ignore lint/style/noNonNullAssertion: allRecords.length > 0 is checked above
    const firstRecord = allRecords[0]!
    isnProjectInfo.value = {
      isn: firstRecord.isn,
      site: firstRecord.site,
      project: firstRecord.project,
      found: true,
    }

    availableStations.value = extractStationsFromIsnRecords(allRecords)
    console.info(`Using ${availableStations.value.length} stations from search results`)

    preCacheStationData(allRecords, isnProjectInfo.value)

    // STEP 3: Refresh station ordering in the background without blocking initial results
    void refreshStationOrderingForLookup(firstRecord.isn, allRecords, requestId)
  } catch (err) {
    if (!isLookupRequestActive(requestId)) {
      return
    }

    console.error('ISN lookup failed:', err)
    error.value = err instanceof Error ? getErrorMessage(err) : 'Failed to lookup ISN'
  } finally {
    if (isLookupRequestActive(requestId)) {
      loadingStationLookup.value = false
    }
  }
}

/** Pre-cache test items and device IDs for all stations from ISN search data */
function preCacheStationData(
  records: IplasIsnSearchRecord[],
  projectInfo: IplasIsnProjectInfo,
): void {
  // Group records by station
  const stationNames = new Set<string>()
  for (const record of records) {
    stationNames.add(record.display_station_name)
  }

  // Pre-cache for each station
  for (const stationName of stationNames) {
    const cacheKey = `${projectInfo.site}_${projectInfo.project}_${stationName}`

    // Cache test items (only if not already cached)
    if (!testItemNamesCache.value.has(cacheKey)) {
      const testItems = extractTestItemsFromRecords(records, stationName)
      if (testItems.length > 0) {
        testItemNamesCache.value.set(cacheKey, testItems)
      }
    }
  }

  console.info(`Pre-cached data for ${stationNames.size} stations from ISN search`)
}

// ============================================================================
// Station Selection Dialog Functions
// ============================================================================
function openStationSelectionDialog(): void {
  if (availableStations.value.length === 0) return
  showStationSelectionDialog.value = true
}

function handleStationClick(station: Station): void {
  selectedStationForConfig.value = station
  showStationConfigDialog.value = true
  // Load device IDs and test items in parallel (performance optimization)
  Promise.all([loadDeviceIdsForStation(station), loadTestItemsForStation(station)])
}

async function loadDeviceIdsForStation(station: Station): Promise<void> {
  if (!isnProjectInfo.value || isnSearchRecords.value.length === 0) return

  loadingCurrentStationDevices.value = true
  deviceError.value = null
  currentStationDeviceIds.value = []

  try {
    // Extract device IDs from stored ISN search records (no API call needed)
    currentStationDeviceIds.value = extractDeviceIdsFromRecords(
      isnSearchRecords.value,
      station.display_station_name,
    )
  } catch (err: unknown) {
    deviceError.value = getErrorMessage(err) || 'Failed to extract device IDs'
  } finally {
    loadingCurrentStationDevices.value = false
  }
}

async function refreshCurrentStationDevices(): Promise<void> {
  if (selectedStationForConfig.value) {
    await loadDeviceIdsForStation(selectedStationForConfig.value)
  }
}

async function loadTestItemsForStation(station: Station, forceRefresh = false): Promise<void> {
  if (!isnProjectInfo.value) return

  const cacheKey = `${isnProjectInfo.value.site}_${isnProjectInfo.value.project}_${station.display_station_name}`

  // Check in-memory cache first
  if (!forceRefresh) {
    const cachedData = testItemNamesCache.value.get(cacheKey)
    if (cachedData) {
      currentStationTestItems.value = cachedData
      return
    }
  }

  loadingCurrentStationTestItems.value = true
  testItemsError.value = null
  currentStationTestItems.value = []

  try {
    // First try to extract from ISN search records (no API call needed)
    if (isnSearchRecords.value.length > 0) {
      const testItemInfos = extractTestItemsFromRecords(
        isnSearchRecords.value,
        station.display_station_name,
      )

      if (testItemInfos.length > 0) {
        currentStationTestItems.value = testItemInfos
        testItemNamesCache.value.set(cacheKey, testItemInfos)
        loadingCurrentStationTestItems.value = false
        return
      }
    }

    // Fallback: fetch from cached API if ISN records don't have data for this station
    const response = await fetchTestItemNamesCached(
      isnProjectInfo.value.site,
      isnProjectInfo.value.project,
      station.display_station_name,
      true, // Exclude BIN items
      forceRefresh,
    )

    const testItemInfos: TestItemInfo[] = response.test_items.map((item) => ({
      name: item.name,
      isValue: item.is_value,
      isBin: item.is_bin,
      hasUcl: item.has_ucl,
      hasLcl: item.has_lcl,
    }))

    currentStationTestItems.value = testItemInfos
    testItemNamesCache.value.set(cacheKey, testItemInfos)
  } catch (err: unknown) {
    testItemsError.value = getErrorMessage(err) || 'Failed to load test items'
  } finally {
    loadingCurrentStationTestItems.value = false
  }
}

async function refreshCurrentStationTestItems(): Promise<void> {
  if (selectedStationForConfig.value && isnProjectInfo.value) {
    const cacheKey = `${isnProjectInfo.value.site}_${isnProjectInfo.value.project}_${selectedStationForConfig.value.display_station_name}`
    testItemNamesCache.value.delete(cacheKey)
    await loadTestItemsForStation(selectedStationForConfig.value, true)
  }
}

function handleStationSelectionConfirm(configs: Record<string, StationConfig>): void {
  stationConfigs.value = { ...configs }
  showStationSelectionDialog.value = false

  // UPDATED: Auto-fetch data and calculate scores after station selection confirmation
  autoFetchAndScore()
}

async function handleStationConfigSave(config: StationConfig): Promise<void> {
  // Store total device count if deviceIds is empty (user selected "All")
  const configWithCount = { ...config }
  if (configWithCount.deviceIds.length === 0 && currentStationDeviceIds.value.length > 0) {
    configWithCount.totalDeviceCount = currentStationDeviceIds.value.length
  }
  stationConfigs.value[config.displayName] = configWithCount

  // UPDATED: Auto-fetch data and calculate scores after station config is saved
  await autoFetchAndScore()
}

/** Automatically fetch data and calculate scores */
async function autoFetchAndScore(): Promise<void> {
  // Only auto-fetch if we have configured stations and project info
  if (configuredStationsCount.value === 0 || !isnProjectInfo.value) {
    return
  }

  try {
    // First, fetch the test item data
    await fetchTestItems()

    // Then calculate scores if we have data
    if (testItemData.value.length > 0) {
      await handleCalculateScores()
    }
  } catch (err) {
    console.error('Auto-fetch and score failed:', err)
    // Don't show error - user can manually retry
  }
}

function handleStationConfigRemove(displayName: string): void {
  delete stationConfigs.value[displayName]
}

function editStationConfig(displayName: string): void {
  const station = availableStations.value.find((s) => s.display_station_name === displayName)
  if (station) {
    handleStationClick(station)
  }
}

function removeStationConfig(displayName: string): void {
  delete stationConfigs.value[displayName]
}

// ============================================================================
// Data Fetching - Using stored ISN search data (no additional API calls)
// ============================================================================
async function fetchTestItems(): Promise<void> {
  if (
    !isnProjectInfo.value ||
    configuredStationsCount.value === 0 ||
    isnSearchRecords.value.length === 0
  )
    return

  processingIsnData.value = true
  clearTestItemData()
  recordScores.value = {}
  forcedFailures.value = {}

  try {
    // Filter ISN search records based on configured stations
    const configuredStationNames = new Set(Object.keys(stationConfigs.value))

    let filteredRecords = isnSearchRecords.value.filter((record) =>
      configuredStationNames.has(record.display_station_name),
    )

    // Apply additional filters from station configs
    for (const config of Object.values(stationConfigs.value)) {
      // Filter by device IDs if specified
      if (config.deviceIds && config.deviceIds.length > 0) {
        const deviceIdSet = new Set(config.deviceIds)
        filteredRecords = filteredRecords.filter(
          (record) =>
            record.display_station_name !== config.displayName || deviceIdSet.has(record.device_id),
        )
      }

      // Filter by test status if not ALL
      if (config.testStatus !== 'ALL') {
        filteredRecords = filteredRecords.filter(
          (record) =>
            record.display_station_name !== config.displayName ||
            record.test_status.toUpperCase() === config.testStatus,
        )
      }
    }

    // Transform ISN records to CsvTestItemData format
    const transformedRecords: CsvTestItemData[] = filteredRecords.map((record) => {
      const csvRecord = transformIsnRecordToCsvData(record)

      // Apply test item filters if configured
      const config = stationConfigs.value[record.display_station_name]
      const includeSet = new Set(config?.includedTestItems ?? [])
      const excludeSet = new Set(config?.excludedTestItems ?? [])

      if (includeSet.size > 0) {
        csvRecord.TestItem = csvRecord.TestItem.filter((item) => includeSet.has(item.NAME))
      }

      if (excludeSet.size > 0) {
        csvRecord.TestItem = csvRecord.TestItem.filter((item) => !excludeSet.has(item.NAME))
      }

      return csvRecord
    }).filter((record) => (record.TestItem?.length ?? 0) > 0)

    if (transformedRecords.length === 0) {
      error.value = 'No iPLAS data was returned for the selected station configuration.'
      return
    }

    // Update testItemData using the composable's internal array
    // Since we can't directly set, push to the reactive array after clearing
    for (const record of transformedRecords) {
      testItemData.value.push(record)
    }

    // Trigger reactivity update
    testItemData.value = [...testItemData.value]
  } finally {
    processingIsnData.value = false
  }
}

// ============================================================================
// Save to Database
// ============================================================================
async function handleSaveToDb(payload: {
  records: CsvTestItemData[]
  scores: Record<string, number>
}): Promise<void> {
  if (payload.records.length === 0) return

  try {
    const products: TopProductCreate[] = payload.records.map((record) => {
      const isn = record.ISN || record.DeviceId || 'UNKNOWN'
      const station = record.station || record.TSP || ''
      const testEndTime = record['Test end Time'] || ''
      const key = `${isn}_${station}_${testEndTime}`
      const score = (payload.scores[key] ?? recordScores.value[key] ?? 0) * 10

      const measurements: TopProductMeasurementCreate[] = (record.TestItem || []).map((item) => {
        const usl = item.UCL ? parseFloat(item.UCL) : null
        const lsl = item.LCL ? parseFloat(item.LCL) : null
        const actualValue = parseFloat(item.VALUE)
        return {
          test_item: item.NAME,
          usl: usl !== null && !Number.isNaN(usl) ? usl : null,
          lsl: lsl !== null && !Number.isNaN(lsl) ? lsl : null,
          target_value: null,
          actual_value: !Number.isNaN(actualValue) ? actualValue : null,
          deviation: null,
        }
      })

      // Calculate duration from start/end times
      const startTime = record['Test Start Time']
      const endTime = record['Test end Time']
      let duration: number | undefined
      if (startTime && endTime) {
        const start = new Date(startTime).getTime()
        const end = new Date(endTime).getTime()
        if (!Number.isNaN(start) && !Number.isNaN(end)) {
          duration = Math.floor((end - start) / 1000)
        }
      }

      const isPassed = isStatusPass(record.ErrorCode)
      const forcedFailure = forcedFailures.value[key]

      return {
        dut_isn: isn,
        site_name: record.Site || isnProjectInfo.value?.site || null,
        project_name: record.Project || isnProjectInfo.value?.project || null,
        station_name: station,
        device_name: record.DeviceId || null,
        test_date: endTime ? new Date(endTime).toISOString() : null,
        test_duration: duration,
        pass_count: isPassed && !forcedFailure ? 1 : 0,
        fail_count: isPassed && !forcedFailure ? 0 : 1,
        retest_count: 0,
        score,
        measurements,
      } satisfies TopProductCreate
    })

    const response = await createTopProductsBulk({ products })

    if (response.success) {
      showSuccess(`Saved ${response.created_count} item(s) to database`)
    }
  } catch (err: unknown) {
    console.error('Failed to save to database:', err)
    showErrorNotification(getApiErrorDetail(err, 'Failed to save to database'))
  }
}

// ============================================================================
// Scoring Functions
// ============================================================================
async function handleCalculateScores(): Promise<void> {
  if (testItemData.value.length === 0) return

  calculatingScores.value = true
  try {
    const records = testItemData.value.map((record) => ({
      ISN: record.ISN || record.DeviceId,
      DeviceId: record.DeviceId,
      station: record.station,
      'Test Start Time': record['Test Start Time'],
      'Test end Time': record['Test end Time'],
      TestItem: record.TestItem || [],
    }))

    // Initialize scoring configs from first record's test items
    const firstRecord = testItemData.value[0]
    if (firstRecord?.TestItem && firstRecord.TestItem.length > 0) {
      initializeConfigs(firstRecord.TestItem)
    }

    // Apply user-selected scoring configs from station configurations
    applyUserScoringConfigs()

    await calculateScores(records)

    // Map scored records back to score map
    const newScores: Record<string, number> = {}
    const nextForcedFailures: Record<string, { minimumItemScore: number; failingItems: { name: string; score: number }[] }> =
      {}
    testItemData.value.forEach((record, index) => {
      const isn = record.ISN || record.DeviceId || '-'
      const station = record.station
      const testEndTime = record['Test end Time'] || ''
      const key = `${isn}_${station}_${testEndTime}`

      const scoredRecord = scoredRecords.value[index]
      if (scoredRecord) {
        const stationConfig = stationConfigs.value[record.TSP || record.station]
        const forcedFailure = evaluateForcedFailure(scoredRecord, stationConfig)

        if (forcedFailure.isForcedFailure && forcedFailure.minimumItemScore !== null) {
          nextForcedFailures[key] = {
            minimumItemScore: forcedFailure.minimumItemScore,
            failingItems: forcedFailure.failingItems,
          }
          newScores[key] = scoredRecord.overallScore
        } else {
          newScores[key] = scoredRecord.overallScore
        }
      }
    })

    recordScores.value = newScores
    forcedFailures.value = nextForcedFailures
  } catch (err) {
    console.error('Failed to calculate scores:', err)
    error.value = scoringError.value || 'Failed to calculate scores'
  } finally {
    calculatingScores.value = false
  }
}

function applyUserScoringConfigs(): void {
  for (const config of Object.values(stationConfigs.value)) {
    if (!config.testItemScoringConfigs) continue

    for (const [testItemName, scoringConfig] of Object.entries(config.testItemScoringConfigs)) {
      setScoringType(testItemName, scoringConfig.scoringType)

      const updates: { target?: number; weight?: number } = {}
      if (scoringConfig.target !== undefined) {
        updates.target = scoringConfig.target
      }
      if (scoringConfig.weight !== undefined) {
        updates.weight = scoringConfig.weight
      }
      if (Object.keys(updates).length > 0) {
        updateScoringConfig(testItemName, updates)
      }
    }
  }
}

// ============================================================================
// Record Normalization & Details
// ============================================================================
function normalizeRecord(record: CsvTestItemData): NormalizedRecord {
  const recordIndex = testItemData.value.findIndex(
    (r) =>
      (r.ISN === record.ISN || r.DeviceId === record.DeviceId) &&
      r.station === record.station &&
      r['Test end Time'] === record['Test end Time'],
  )
  const scoredRecord = recordIndex >= 0 ? scoredRecords.value[recordIndex] : null
  const forcedFailureKey = `${record.ISN || record.DeviceId || '-'}_${record.station}_${record['Test end Time'] || ''}`
  const forcedFailure = forcedFailures.value[forcedFailureKey]

  const testItems: NormalizedTestItem[] = (record.TestItem || []).map(
    (item: TestItem): NormalizedTestItem => {
      const itemScore = scoredRecord?.testItemScores?.find((s) => s.testItemName === item.NAME)
      return {
        NAME: item.NAME,
        STATUS: item.STATUS,
        VALUE: item.VALUE,
        UCL: item.UCL,
        LCL: item.LCL,
        CYCLE: item.CYCLE || '',
        score: itemScore?.score,
        scoringType: itemScore?.scoringType,
        deviation: itemScore?.deviation,
        policy: itemScore?.policy ?? undefined,
        target: itemScore?.target ?? undefined,
        weight: itemScore?.weight ?? 1.0,
        forcedFailureThreshold: forcedFailure?.minimumItemScore,
      }
    },
  )

  return {
    isn: record.ISN || '-',
    deviceId: record.DeviceId || '-',
    stationName: record.station,
    displayStationName: record.TSP || record.station,
    site: record.Site || '-',
    project: record.Project || '-',
    line: record.Line || '-',
    errorCode: record.ErrorCode || '-',
    errorName: record.ErrorName || '-',
    testStatus: record['Test Status'] || '-',
    testStartTime: record['Test Start Time'] || '-',
    testEndTime: record['Test end Time'] || '-',
    testItems,
    overallScore: scoredRecord?.overallScore,
    valueItemsScore: scoredRecord?.valueItemsScore,
    binItemsScore: scoredRecord?.binItemsScore,
    isForcedFailure: !!forcedFailure,
    forcedFailureReason: forcedFailure
      ? `Forced failure: one or more scored numeric items are below ${forcedFailure.minimumItemScore.toFixed(1)} / 10`
      : undefined,
    forcedFailureItems: forcedFailure?.failingItems.map((item) => item.name),
    forcedFailureDetails: forcedFailure?.failingItems,
    forcedFailureMinimumScore: forcedFailure?.minimumItemScore,
  }
}

function handleRowClick(payload: { record: CsvTestItemData; stationName: string }): void {
  const normalized = normalizeRecord(payload.record)
  detailsRecord.value = normalized
  showDetailsDialog.value = true
}

// ============================================================================
// Download Functions
// ============================================================================
async function handleDownloadRecord(payload: {
  record: CsvTestItemData
  stationName: string
}): Promise<void> {
  if (!isnProjectInfo.value) return

  try {
    const record = payload.record
    const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
    // UPDATED: Time is already in local time format (YYYY-MM-DD HH:mm:ss) from transformIsnRecordToCsvData
    // Just need to convert dashes to slashes for the download attachment API
    const time = formatTimeForDownload(record['Test end Time'] || '')
    const deviceid = record.DeviceId
    // Prefer raw station name (TSP) — display_station_name may not be recognized by iPLAS download API
    const station = record.TSP || record.station

    await downloadAttachments(isnProjectInfo.value.site, isnProjectInfo.value.project, [
      { isn, time, deviceid, station },
    ])

    // Format time for CSV log download (needs .000 milliseconds)
    const apiEndTime = formatTimeForCsvDownload(record['Test end Time'] || '')

    const csvLogInfo: IplasDownloadCsvLogInfo = {
      site: isnProjectInfo.value.site,
      project: isnProjectInfo.value.project,
      station,
      line: record.Line || 'NA',
      model: record.Model || 'ALL',
      deviceid,
      isn,
      test_end_time: apiEndTime,
      data_source: 0,
    }

    await downloadCsvLogs([csvLogInfo])
  } catch (err) {
    console.error('Failed to download test log:', err)
    showErrorNotification(err instanceof Error ? err.message : 'Failed to download test log')
  }
}

async function handleBulkDownloadRecords(payload: {
  records: CsvTestItemData[]
  stationName: string
}): Promise<void> {
  if (!isnProjectInfo.value || payload.records.length === 0) return

  const attachments = payload.records.map((record) => {
    const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
    // UPDATED: Time is already in local time format from transformIsnRecordToCsvData
    const time = formatTimeForDownload(record['Test end Time'] || '')
    const deviceid = record.DeviceId
    // Prefer raw station name (TSP) — display_station_name may not be recognized by iPLAS download API
    const station = record.TSP || record.station
    return { isn, time, deviceid, station }
  })

  await downloadAttachments(isnProjectInfo.value.site, isnProjectInfo.value.project, attachments)

  const csvLogInfos: IplasDownloadCsvLogInfo[] = payload.records.map((record) => {
    const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
    const deviceid = record.DeviceId
    // Prefer raw station name (TSP)
    const station = record.TSP || record.station
    const apiEndTime = formatTimeForCsvDownload(record['Test end Time'] || '')

    return {
      site: isnProjectInfo.value?.site ?? '',
      project: isnProjectInfo.value?.project ?? '',
      station,
      line: record.Line || 'NA',
      model: record.Model || 'ALL',
      deviceid,
      isn,
      test_end_time: apiEndTime,
      data_source: 0,
    }
  })

  await downloadCsvLogs(csvLogInfos)
}

// ============================================================================
// Export Handlers
// ============================================================================
async function handleExportRecords(payload: {
  records: CsvTestItemData[]
  stationName: string
}): Promise<void> {
  if (payload.records.length === 0) return

  // Transform CsvTestItemData to ExportRecord format
  const exportRecords: ExportRecord[] = payload.records.map((record) => {
    const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
    const station = record.TSP || record.station

    // Map test items from the TestItem array
    const testItems: ExportTestItem[] = (record.TestItem || []).map((item) => ({
      NAME: item.NAME,
      STATUS: item.STATUS || '',
      VALUE: item.VALUE || '',
      UCL: item.UCL || '',
      LCL: item.LCL || '',
    }))

    return {
      ISN: isn,
      Project: record.Project || '',
      Station: station,
      DeviceId: record.DeviceId,
      Line: record.Line || 'NA',
      ErrorCode: record.ErrorCode || '',
      ErrorName: record.ErrorName || '',
      Type: 'ONLINE',
      TestStartTime: record['Test Start Time'] || '',
      TestEndTime: record['Test end Time'] || '',
      TestItems: testItems,
    }
  })

  try {
    const response = await iplasProxyApi.exportTestItems({
      records: exportRecords,
      format: 'xlsx', // Default to XLSX for multi-sheet support
      filename_prefix: generateExportFilename(),
    })

    iplasProxyApi.downloadExportFile(response)
  } catch (err) {
    console.error('Export failed:', err)
  }
}

// Handle export ALL records to XLSX (all stations)
async function handleExportAllRecords(payload: {
  records: CsvTestItemData[]
  filenamePrefix: string
}): Promise<void> {
  if (payload.records.length === 0) return

  exportingAll.value = true
  try {
    // Transform CsvTestItemData to ExportRecord format
    const exportRecords: ExportRecord[] = payload.records.map((record) => {
      const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
      const station = record.TSP || record.station

      // Map test items from the TestItem array
      const testItems: ExportTestItem[] = (record.TestItem || []).map((item) => ({
        NAME: item.NAME,
        STATUS: item.STATUS || '',
        VALUE: item.VALUE || '',
        UCL: item.UCL || '',
        LCL: item.LCL || '',
      }))

      return {
        ISN: isn,
        Project: record.Project || '',
        Station: station,
        DeviceId: record.DeviceId,
        Line: record.Line || 'NA',
        ErrorCode: record.ErrorCode || '',
        ErrorName: record.ErrorName || '',
        Type: 'ONLINE',
        TestStartTime: record['Test Start Time'] || '',
        TestEndTime: record['Test end Time'] || '',
        TestItems: testItems,
      }
    })

    const response = await iplasProxyApi.exportTestItems({
      records: exportRecords,
      format: 'xlsx', // XLSX for multi-sheet support (each station is a sheet)
      filename_prefix: generateExportFilename(),
    })

    iplasProxyApi.downloadExportFile(response)
  } catch (err) {
    console.error('Export all failed:', err)
  } finally {
    exportingAll.value = false
  }
}

async function handleDownloadFromDetails(): Promise<void> {
  if (!detailsRecord.value || !isnProjectInfo.value) return
  detailsDownloading.value = true
  try {
    const record = testItemData.value.find(
      (r) =>
        (r.ISN === detailsRecord.value?.isn || r.DeviceId === detailsRecord.value?.deviceId) &&
        (r.station === detailsRecord.value?.stationName ||
          r.TSP === detailsRecord.value?.displayStationName),
    )
    if (record) {
      await handleDownloadRecord({ record, stationName: record.station })
    }
  } finally {
    detailsDownloading.value = false
  }
}

// ============================================================================
// Clear & Lifecycle
// ============================================================================
function handleClearAll(): void {
  activeLookupRequestId.value += 1
  searchIsn.value = ''
  selectedISNs.value = []
  multipleIsnSearchText.value = ''
  parsedIsns.value = []
  isnProjectInfo.value = null
  availableStations.value = []
  isnSearchRecords.value = []
  stationConfigs.value = {}
  loadingStations.value = false
  loadingStationLookup.value = false
  clearTestItemData()
  recordScores.value = {}
  forcedFailures.value = {}
  testItemNamesCache.value.clear()
}

onMounted(() => {
  // No initialization needed - ISN search data is fetched on demand
})

onUnmounted(() => {
  activeLookupRequestId.value += 1
  clearTestItemData()
  recordScores.value = {}
  forcedFailures.value = {}
  stationConfigs.value = {}
})
</script>

<style scoped>
.top-product-iplas-isn-shell,
.top-product-iplas-isn-stack,
.top-product-iplas-isn-field,
.top-product-iplas-isn-lookup-card,
.top-product-iplas-isn-action-card,
.top-product-iplas-isn-summary-panel,
.top-product-iplas-isn-summary-panel__header,
.top-product-iplas-isn-token-card {
  display: grid;
  gap: 0.9rem;
}

.top-product-iplas-isn-shell {
  gap: 1rem;
}

.top-product-iplas-isn-toolbar,
.top-product-iplas-isn-toggle-row,
.top-product-iplas-isn-chip-row,
.top-product-iplas-isn-token-row,
.top-product-iplas-isn-entry-row,
.top-product-iplas-isn-token-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.top-product-iplas-isn-entry-row--end {
  justify-content: space-between;
}

.top-product-iplas-isn-field span,
.top-product-iplas-isn-toggle-card strong,
.top-product-iplas-isn-summary-panel h3,
.top-product-iplas-isn-token-card strong {
  color: var(--app-ink);
}

.top-product-iplas-isn-field span,
.top-product-iplas-isn-summary-panel__eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: none;
}

.top-product-iplas-isn-summary-panel__eyebrow {
  margin: 0;
  color: var(--app-accent);
}

.top-product-iplas-isn-toggle-card p,
.top-product-iplas-isn-lookup-card p,
.top-product-iplas-isn-action-card p,
.top-product-iplas-isn-token-card p,
.top-product-iplas-isn-notice,
.top-product-iplas-isn-field small {
  margin: 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.top-product-iplas-isn-field input,
.top-product-iplas-isn-field textarea {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.95rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.8rem 0.9rem;
  font: inherit;
}

.top-product-iplas-isn-field textarea {
  resize: vertical;
}

.top-product-iplas-isn-button,
.top-product-iplas-isn-toggle-chip,
.top-product-iplas-isn-token,
.top-product-iplas-isn-token-card,
.top-product-iplas-isn-remove {
  min-height: 2.75rem;
  border-radius: 0.95rem;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.top-product-iplas-isn-button,
.top-product-iplas-isn-toggle-chip,
.top-product-iplas-isn-token {
  padding: 0.65rem 0.95rem;
}

.top-product-iplas-isn-button:hover,
.top-product-iplas-isn-toggle-chip:hover,
.top-product-iplas-isn-token:hover,
.top-product-iplas-isn-token-card:hover,
.top-product-iplas-isn-remove:hover {
  transform: translateY(-1px);
}

.top-product-iplas-isn-button--primary,
.top-product-iplas-isn-toggle-chip.is-active {
  background: linear-gradient(135deg, #0f766e, #1b6c58);
  border-color: var(--app-accent);
  color: white;
}

.top-product-iplas-isn-button--secondary {
  background: linear-gradient(135deg, #165d92, #1d7fb7);
  border-color: #165d92;
  color: white;
}

.top-product-iplas-isn-button--ghost {
  background: var(--app-panel);
}

.top-product-iplas-isn-toggle-card,
.top-product-iplas-isn-lookup-card,
.top-product-iplas-isn-action-card,
.top-product-iplas-isn-summary-panel,
.top-product-iplas-isn-notice {
  padding: 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(15, 118, 110, 0.12);
  background: rgba(255, 255, 255, 0.72);
}

.top-product-iplas-isn-toggle-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.85rem;
  align-items: start;
}

.top-product-iplas-isn-toggle-card input {
  margin-top: 0.2rem;
}

.top-product-iplas-isn-action-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.top-product-iplas-isn-token {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.top-product-iplas-isn-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.1rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
}

.top-product-iplas-isn-pill--primary {
  background: rgba(15, 118, 110, 0.1);
  border-color: rgba(15, 118, 110, 0.16);
  color: var(--app-accent);
}

.top-product-iplas-isn-pill--info {
  background: rgba(40, 96, 163, 0.08);
  border-color: rgba(40, 96, 163, 0.16);
  color: #1f4f89;
}

.top-product-iplas-isn-pill--success {
  background: rgba(15, 118, 110, 0.08);
  border-color: rgba(15, 118, 110, 0.14);
  color: var(--app-accent);
}

.top-product-iplas-isn-pill--warning {
  background: rgba(169, 102, 34, 0.1);
  border-color: rgba(169, 102, 34, 0.18);
  color: #88551c;
}

.top-product-iplas-isn-pill--muted {
  background: rgba(95, 103, 122, 0.1);
  border-color: rgba(95, 103, 122, 0.16);
  color: #4c566a;
}

.top-product-iplas-isn-token-grid {
  display: grid;
  gap: 0.75rem;
}

.top-product-iplas-isn-token-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  padding: 0.95rem 1rem;
  text-align: left;
}

.top-product-iplas-isn-remove {
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
}

.top-product-iplas-isn-notice--error {
  border-color: rgba(164, 52, 58, 0.16);
  background: rgba(164, 52, 58, 0.08);
  color: #8e3037;
}

@media (max-width: 840px) {
  .top-product-iplas-isn-action-card,
  .top-product-iplas-isn-token-card {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 620px) {
  .top-product-iplas-isn-toolbar,
  .top-product-iplas-isn-toggle-row,
  .top-product-iplas-isn-entry-row,
  .top-product-iplas-isn-chip-row,
  .top-product-iplas-isn-token-row,
  .top-product-iplas-isn-token-card__meta {
    align-items: stretch;
  }
}
</style>
