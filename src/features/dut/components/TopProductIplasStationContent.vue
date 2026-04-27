<template>
  <div class="top-product-iplas-station-shell">
    <AppPanel eyebrow="Scope" title="Station Search" tone="cool" split-header>
      <template #header-aside>
        <button type="button" class="top-product-iplas-station-button top-product-iplas-station-button--ghost"
          @click="emit('show-settings')">
          iPLAS Settings
        </button>
      </template>

      <div class="top-product-iplas-station-stack">
        <div class="top-product-iplas-station-grid top-product-iplas-station-grid--two">
          <label class="top-product-iplas-station-field">
            <span>Site</span>
            <AppSelect v-model="selectedSite" :options="siteSelectOptions" placeholder="Select a site"
              :disabled="loading || loadingStations" @change="handleSiteChange" />
          </label>

          <label class="top-product-iplas-station-field">
            <span>Project</span>
            <AppSelect v-model="selectedProject" :options="projectSelectOptions" placeholder="Select a project"
              :disabled="!selectedSite || loading || loadingStations" @change="handleProjectChange" />
          </label>
        </div>

        <div class="top-product-iplas-station-grid top-product-iplas-station-grid--three">
          <label class="top-product-iplas-station-field">
            <span>Date Range Preset</span>
            <AppSelect v-model="dateRangePreset" :options="dateRangePresetOptions" :searchable="false"
              @change="applyDateRangePreset()" />
          </label>

          <label class="top-product-iplas-station-field">
            <span>Start Time</span>
            <input v-model="startTime" type="datetime-local">
          </label>

          <label class="top-product-iplas-station-field">
            <span>End Time</span>
            <input v-model="endTime" type="datetime-local">
          </label>
        </div>

        <div class="top-product-iplas-station-action-card">
          <div>
            <strong>Configure Stations</strong>
            <p>Set device scope and scoring for each station.</p>
          </div>
          <button type="button" class="top-product-iplas-station-button top-product-iplas-station-button--secondary"
            :disabled="!selectedSite || !selectedProject || loadingStations" @click="openStationSelectionDialog">
            {{ loadingStations ? 'Loading...' : 'Configure Stations' }}
            <strong v-if="configuredStationsCount > 0">{{ configuredStationsCount }}</strong>
          </button>
        </div>

        <section v-if="configuredStationsCount > 0" class="top-product-iplas-station-summary-panel">
          <div class="top-product-iplas-station-summary-panel__header">
            <div>
              <p class="top-product-iplas-station-summary-panel__eyebrow">Configured</p>
              <h3>Stations</h3>
            </div>
          </div>

          <div class="top-product-iplas-station-token-grid">
            <article v-for="(config, displayName) in stationConfigs" :key="displayName"
              class="top-product-iplas-station-token-card" role="button" tabindex="0"
              @click="editStationConfig(displayName)" @keydown.enter.prevent="editStationConfig(displayName)"
              @keydown.space.prevent="editStationConfig(displayName)">
              <div class="top-product-iplas-station-token-card__copy">
                <strong>{{ displayName }}</strong>
                <p>{{ config.deviceIds.length || config.totalDeviceCount || 'All' }} device(s) scoped</p>
              </div>
              <div class="top-product-iplas-station-token-card__meta">
                <span class="top-product-iplas-station-pill top-product-iplas-station-pill--info">
                  {{ getConfiguredItemCountLabel(config) }}
                </span>
                <span class="top-product-iplas-station-pill"
                  :class="(config.minimumItemScoreEnabled ?? true) ? 'top-product-iplas-station-pill--warning' : 'top-product-iplas-station-pill--muted'">
                  {{ (config.minimumItemScoreEnabled ?? true) ? `Min ${(config.minimumItemScore ?? 6.5).toFixed(1)}` : 'MinOff' }}
                </span>
                <button type="button" class="top-product-iplas-station-icon-button"
                  title="Delete station configuration" @click.stop="removeStationConfig(displayName)">
                  <Icon icon="mdi:delete-outline" />
                </button>
              </div>
            </article>
          </div>
        </section>

        <div class="top-product-iplas-station-footer-actions">
          <button type="button" class="top-product-iplas-station-button top-product-iplas-station-button--ghost"
            :disabled="loading" @click="handleClearAll">
            Clear All
          </button>
          <button type="button" class="top-product-iplas-station-button top-product-iplas-station-button--primary"
            :disabled="!canFetchData" @click="fetchTestItems">
            {{ loadingTestItems ? 'Searching...' : 'Search' }}
          </button>
        </div>
      </div>
    </AppPanel>

    <div v-if="error" class="top-product-iplas-station-notice top-product-iplas-station-notice--error">
      {{ error }}
    </div>

    <div v-if="loadingTestItems" class="top-product-iplas-station-loading-card">
      <div class="top-product-iplas-station-spinner"></div>
      <div>
        <strong>Fetching test data from iPLAS...</strong>
        <p>The ranking view updates when the current station set finishes loading.</p>
      </div>
    </div>

    <Teleport v-if="props.rankingTarget && props.isActive && testItemData.length > 0" :to="props.rankingTarget">
      <TopProductIplasRanking :records="testItemData" :scores="recordScores"
        :forced-failures="forcedFailures" :calculating-scores="calculatingScores" :loading="loadingTestItems"
        :exporting-all="exportingAll" @row-click="handleRowClick" @download="handleDownloadRecord"
        @bulk-download="handleBulkDownloadRecords" @export="handleExportRecords" @export-all="handleExportAllRecords"
        @calculate-scores="handleCalculateScores" @save-to-db="handleSaveToDb" />
    </Teleport>

    <TopProductIplasRanking v-else-if="!props.rankingTarget && testItemData.length > 0" :records="testItemData" :scores="recordScores"
      :forced-failures="forcedFailures" :calculating-scores="calculatingScores" :loading="loadingTestItems"
      :exporting-all="exportingAll" @row-click="handleRowClick" @download="handleDownloadRecord"
      @bulk-download="handleBulkDownloadRecords" @export="handleExportRecords" @export-all="handleExportAllRecords"
      @calculate-scores="handleCalculateScores" @save-to-db="handleSaveToDb" />

    <!-- Station Selection Dialog -->
    <StationSelectionDialog v-model:show="showStationSelectionDialog" :site="selectedSite || ''"
      :project="selectedProject || ''" :stations="stations" :selected-configs="stationConfigs"
      @station-click="handleStationClick" @confirm="handleStationSelectionConfirm" @clear-all="clearAllStations" />

    <!-- Station Config Dialog -->
    <StationConfigDialog v-model:show="showStationConfigDialog" :station="selectedStationForConfig"
      :site="selectedSite || ''" :project="selectedProject || ''" :start-time="startTime" :end-time="endTime"
      :existing-config="currentStationConfig" :available-device-ids="currentStationDeviceIds"
      :loading-devices="loadingCurrentStationDevices" :device-error="deviceError"
      :available-test-items="currentStationTestItems" :test-item-source="currentStationTestItemSource"
      :loading-test-items="loadingCurrentStationTestItems" :test-items-error="testItemsError"
      @save="handleStationConfigSave" @remove="handleStationConfigRemove"
      @refresh-devices="refreshCurrentStationDevices" @refresh-test-items="refreshCurrentStationTestItems"
      @change-test-item-source="handleTestItemSourceChange" />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  type ExportRecord,
  type ExportTestItem,
  iplasProxyApi,
} from '@/features/dut-logs/api/iplasProxyApi'
import type {
  CsvTestItemData,
  DownloadCsvLogInfo,
  Station,
  TestItem,
} from '@/features/dut-logs/composables/useIplasApi'
import { useIplasApi } from '@/features/dut-logs/composables/useIplasApi'
import { useIplasSettings } from '@/features/dut-logs/composables/useIplasSettings'
import {
  createTopProductsBulk,
  type TopProductCreate,
  type TopProductMeasurementCreate,
} from '@/features/top-products/api/topProducts.api'
import { useNotification } from '@/shared/composables/useNotification'
import { AppPanel, AppSelect } from '@/shared/ui'
import { getErrorMessage } from '@/shared/utils'
import { getApiErrorDetail } from '@/shared/utils/error'
import { isStatusPass } from '@/shared/utils/helpers'
import { dutApi } from '../api/dut.api'
import { useScoring } from '../composables/useScoring'
import { evaluateForcedFailure } from '../utils/iplasForcedFailure'
import type { NormalizedRecord, NormalizedTestItem } from './IplasTestItemsFullscreenDialog.vue'
import StationConfigDialog, { type TestItemInfo } from './StationConfigDialog.vue'
import StationSelectionDialog, { type StationConfig } from './StationSelectionDialog.vue'
import TopProductIplasRanking from './TopProductIplasRanking.vue'

const props = withDefaults(defineProps<{
  rankingTarget?: string
  isActive?: boolean
}>(), {
  rankingTarget: '',
  isActive: false,
})

// Emits
const emit = defineEmits<{
  (e: 'show-details', record: NormalizedRecord): void
  (e: 'show-settings'): void
}>()

const { showSuccess, showError: showErrorNotification } = useNotification()

// Scoring composable
const {
  initializeConfigs,
  calculateScores,
  scoredRecords,
  updateConfig: updateScoringConfig,
  setScoringType,
  error: scoringError,
} = useScoring()

// Scoring state
const recordScores = ref<Record<string, number>>({})
const forcedFailures = ref<Record<string, { minimumItemScore: number; failingItems: { name: string; score: number }[] }>>({})
const calculatingScores = ref(false)
const exportingAll = ref(false)

const {
  loading,
  loadingStations,
  loadingTestItems,
  error,
  stationSearchCacheMetadata,
  stations,
  testItemData,
  uniqueSites,
  projectsBySite,
  fetchSiteProjects,
  fetchStations,
  fetchDeviceIds,
  fetchTestItemsFull: fetchTestItemsApi,
  fetchTestItemNamesCached,
  fetchTestItemsFiltered,
  downloadAttachments,
  downloadCsvLogs,
  clearTestItemData,
} = useIplasApi()

// Selection state
const selectedSite = ref<string | null>(null)
const selectedProject = ref<string | null>(null)
const stationConfigs = ref<Record<string, StationConfig>>({})

// Date range preset
const dateRangePreset = ref<string>('current_shift')
const dateRangePresets = [
  { title: 'Current Shift', value: 'current_shift' },
  { title: 'Today', value: 'today' },
  { title: 'Yesterday', value: 'yesterday' },
  { title: 'Last 7 Days', value: 'last_7_days' },
  { title: 'Last 30 Days', value: 'last_30_days' },
]

const startTime = ref('')
const endTime = ref('')

// Dialog state
const showStationSelectionDialog = ref(false)
const showStationConfigDialog = ref(false)
const selectedStationForConfig = ref<Station | null>(null)
const currentStationDeviceIds = ref<string[]>([])
const loadingCurrentStationDevices = ref(false)
const deviceError = ref<string | null>(null)

// Test items state for config dialog
type TestItemSource = 'default' | 'iplas'

const currentStationTestItemSource = ref<TestItemSource>('default')
const currentStationDefaultTestItems = ref<TestItemInfo[]>([])
const currentStationIplasTestItems = ref<TestItemInfo[]>([])
const currentStationTestItems = computed(() =>
  currentStationTestItemSource.value === 'default'
    ? currentStationDefaultTestItems.value
    : currentStationIplasTestItems.value,
)
const loadingCurrentStationDefaultTestItems = ref(false)
const loadingCurrentStationIplasTestItems = ref(false)
const loadingCurrentStationTestItems = computed(() =>
  currentStationTestItemSource.value === 'default'
    ? loadingCurrentStationDefaultTestItems.value
    : loadingCurrentStationIplasTestItems.value,
)
const currentStationDefaultTestItemsError = ref<string | null>(null)
const currentStationIplasTestItemsError = ref<string | null>(null)
const testItemsError = computed(() =>
  currentStationTestItemSource.value === 'default'
    ? currentStationDefaultTestItemsError.value
    : currentStationIplasTestItemsError.value,
)

// UPDATED: Cache for test item names to avoid repeated API calls
// Key format: `${site}_${project}_${station}_${deviceId}`
const iplasTestItemNamesCache = ref<Map<string, TestItemInfo[]>>(new Map())
const defaultLatestTestItemsCache = ref<Map<string, TestItemInfo[]>>(new Map())

// For download
const selectedRecordKeys = ref<Set<string>>(new Set())

// Computed
const projectsForSelectedSite = computed(() => {
  if (!selectedSite.value) return []
  return projectsBySite.value[selectedSite.value] || []
})

const siteSelectOptions = computed(() => uniqueSites.value.map((site) => ({
  label: site,
  value: site,
})))

const projectSelectOptions = computed(() => projectsForSelectedSite.value.map((project) => ({
  label: project,
  value: project,
})))

const dateRangePresetOptions = computed(() => dateRangePresets.map((preset) => ({
  label: preset.title,
  value: preset.value,
})))

const configuredStationsCount = computed(() => {
  return Object.keys(stationConfigs.value).length
})

function getConfiguredItemCount(config: StationConfig): number {
  const includeCount = config.includedTestItems?.length ?? 0
  const excludeCount = config.excludedTestItems?.length ?? 0
  const legacyCount = config.selectedTestItems?.length ?? 0

  if (includeCount === 0 && excludeCount === 0) {
    return legacyCount
  }

  return includeCount + excludeCount
}

function getConfiguredItemCountLabel(config: StationConfig): string {
  const count = getConfiguredItemCount(config)
  return count > 0 ? `${count} Item(s)` : 'All Items'
}

const currentStationConfig = computed(() => {
  if (!selectedStationForConfig.value) return undefined
  return stationConfigs.value[selectedStationForConfig.value.display_station_name]
})

const canFetchData = computed(() => {
  return (
    selectedSite.value &&
    selectedProject.value &&
    configuredStationsCount.value > 0 &&
    startTime.value &&
    endTime.value
  )
})

function formatCacheTimestamp(value: string | null | undefined): string {
  if (!value) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString()
}

function logStationSearchCacheStatus(): void {
  const metadata = stationSearchCacheMetadata.value
  if (!metadata || metadata.bucketStats.length === 0) {
    return
  }

  const cachedBuckets = metadata.bucketStats.filter((stat) => stat.source === 'cache').length
  const refreshedBuckets = metadata.bucketStats.filter((stat) => stat.source === 'refresh').length
  const unstableBuckets = metadata.bucketStats.filter((stat) =>
    ['partial', 'hot', 'empty_hot'].includes(stat.state),
  ).length

  console.groupCollapsed('[Station Search] Cache bucket status')
  console.log('Coverage:', metadata.cacheCoverage)
  console.log('Validated until:', formatCacheTimestamp(metadata.validatedUntil) || 'N/A')
  console.log('Cached buckets:', cachedBuckets)
  console.log('Refreshed buckets:', refreshedBuckets)
  console.log('Live/partial buckets:', unstableBuckets)
  console.table(
    metadata.bucketStats.map((stat) => ({
      bucketStart: formatCacheTimestamp(stat.bucket_start),
      bucketEnd: formatCacheTimestamp(stat.bucket_end),
      state: stat.state,
      source: stat.source,
      recordCount: stat.record_count,
      validatedUntil: formatCacheTimestamp(stat.validated_until) || 'N/A',
      latestRecordTime: formatCacheTimestamp(stat.latest_record_time) || 'N/A',
    })),
  )
  console.groupEnd()
}

// Apply date range preset
function applyDateRangePreset(): void {
  const now = new Date()
  let start = new Date()
  let end = new Date()

  switch (dateRangePreset.value) {
    case 'current_shift': {
      const currentHour = now.getHours()
      if (currentHour >= 8 && currentHour < 20) {
        start.setHours(8, 0, 0, 0)
        end.setHours(20, 0, 0, 0)
      } else if (currentHour >= 20) {
        start.setHours(20, 0, 0, 0)
        end.setDate(end.getDate() + 1)
        end.setHours(8, 0, 0, 0)
      } else {
        start.setDate(start.getDate() - 1)
        start.setHours(20, 0, 0, 0)
        end.setHours(8, 0, 0, 0)
      }
      break
    }
    case 'today':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'yesterday':
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end.setDate(end.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      break
    case 'last_7_days':
      start.setDate(start.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'last_30_days':
      start.setDate(start.getDate() - 30)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
  }

  startTime.value = formatDatetimeLocal(start)
  endTime.value = formatDatetimeLocal(end)
}

function formatDatetimeLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/** Generate export filename in format: {Site}_{Project}_{YYYYMMDD}_{hhmmss} */
function generateExportFilename(): string {
  const site = selectedSite.value || 'Unknown'
  const project = selectedProject.value || 'Unknown'
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  return `${site}_${project}_${dateStr}_${timeStr}`
}

// Normalize record for dialog - includes scoring data if available
function normalizeRecord(record: CsvTestItemData): NormalizedRecord {
  // Find matching scored record (by index in original data)
  const recordIndex = testItemData.value.findIndex(
    (r) =>
      (r.ISN === record.ISN || r.DeviceId === record.DeviceId) &&
      r.station === record.station &&
      r['Test end Time'] === record['Test end Time'],
  )
  const scoredRecord = recordIndex >= 0 ? scoredRecords.value[recordIndex] : null
  const forcedFailureKey = `${record.ISN || record.DeviceId || '-'}_${record.station}_${record['Test end Time'] || ''}`
  const forcedFailure = forcedFailures.value[forcedFailureKey]

  // Build test items with scoring data
  const testItems: NormalizedTestItem[] = (record.TestItem || []).map(
    (item: TestItem): NormalizedTestItem => {
      // Find matching score for this test item
      const itemScore = scoredRecord?.testItemScores?.find((s) => s.testItemName === item.NAME)

      return {
        NAME: item.NAME,
        STATUS: item.STATUS,
        VALUE: item.VALUE,
        UCL: item.UCL,
        LCL: item.LCL,
        CYCLE: item.CYCLE || '',
        // Include scoring data if available
        score: itemScore?.score,
        scoringType: itemScore?.scoringType,
        deviation: itemScore?.deviation,
        // UPDATED: Include policy, target, and weight for scoring display
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
    // Include overall scoring data if available
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

// Handle row click from ranking table
function handleRowClick(payload: { record: CsvTestItemData; stationName: string }) {
  const normalized = normalizeRecord(payload.record)
  emit('show-details', normalized)
}

// Handle download from ranking table action button
// Downloads both TXT attachments and CSV test logs
async function handleDownloadRecord(payload: {
  record: CsvTestItemData
  stationName: string
}): Promise<void> {
  if (!selectedSite.value || !selectedProject.value) return

  try {
    const record = payload.record
    const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
    const time =
      (record['Test end Time'] || '').replace('T', ' ').replace(/-/g, '/').split('.')[0] || ''
    const deviceid = record.DeviceId
    const station = record.TSP || record.station

    // Download TXT attachments
    await downloadAttachments(selectedSite.value, selectedProject.value, [
      { isn, time, deviceid, station },
    ])

    // Also download CSV test log via iPLAS API
    // Format test_end_time with .000 milliseconds as required by iPLAS API
    const testEndTime = record['Test end Time'] || ''
    const formattedEndTime = testEndTime.includes('.') ? testEndTime : `${testEndTime}.000`
    // Convert from 2026-01-22 18:57:05 format to 2026/01/22 18:57:05.000 format
    const apiEndTime = formattedEndTime.replace(/-/g, '/').replace('T', ' ')

    const csvLogInfo: DownloadCsvLogInfo = {
      site: selectedSite.value,
      project: selectedProject.value,
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

// Handle bulk download from ranking table
// Downloads both TXT attachments and CSV test logs for all selected records
async function handleBulkDownloadRecords(payload: {
  records: CsvTestItemData[]
  stationName: string
}): Promise<void> {
  if (!selectedSite.value || !selectedProject.value) return
  if (payload.records.length === 0) return

  const attachments = payload.records.map((record) => {
    const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
    const time =
      (record['Test end Time'] || '').replace('T', ' ').replace(/-/g, '/').split('.')[0] || ''
    const deviceid = record.DeviceId
    const station = record.TSP || record.station
    return { isn, time, deviceid, station }
  })

  // Download TXT attachments
  await downloadAttachments(selectedSite.value, selectedProject.value, attachments)

  // Also download CSV test logs via iPLAS API
  const csvLogInfos: DownloadCsvLogInfo[] = payload.records.map((record) => {
    const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
    const deviceid = record.DeviceId
    const station = record.TSP || record.station

    // Format test_end_time with .000 milliseconds as required by iPLAS API
    const testEndTime = record['Test end Time'] || ''
    const formattedEndTime = testEndTime.includes('.') ? testEndTime : `${testEndTime}.000`
    // Convert from 2026-01-22 18:57:05 format to 2026/01/22 18:57:05.000 format
    const apiEndTime = formattedEndTime.replace(/-/g, '/').replace('T', ' ')

    return {
      // biome-ignore lint/style/noNonNullAssertion: selectedSite is checked before calling this function
      site: selectedSite.value!,
      // biome-ignore lint/style/noNonNullAssertion: selectedProject is checked before calling this function
      project: selectedProject.value!,
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

// Handle export selected records to CSV/XLSX
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
  } catch (error) {
    console.error('Export failed:', error)
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
  } catch (error) {
    console.error('Export all failed:', error)
  } finally {
    exportingAll.value = false
  }
}

// Handle save selected records to database
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
        site_name: record.Site || selectedSite.value || null,
        project_name: record.Project || selectedProject.value || null,
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

// Handle calculate scores request from ranking table
async function handleCalculateScores(): Promise<void> {
  // Prevent calculation while data is still loading
  if (loadingTestItems.value) return
  if (testItemData.value.length === 0) return

  calculatingScores.value = true
  try {
    // Convert iPLAS records to format expected by scoring API
    const records = testItemData.value.map((record) => ({
      ISN: record.ISN || record.DeviceId,
      DeviceId: record.DeviceId,
      station: record.station,
      'Test Start Time': record['Test Start Time'],
      'Test end Time': record['Test end Time'],
      TestItem: record.TestItem || [],
    }))

    // Initialize scoring configs from first record's test items if needed
    const firstRecord = testItemData.value[0]
    if (firstRecord?.TestItem && firstRecord.TestItem.length > 0) {
      initializeConfigs(firstRecord.TestItem)
    }

    // Apply user-selected scoring configs from station configurations
    applyUserScoringConfigs()

    // Calculate scores via backend API
    await calculateScores(records)

    // Map scored records back to our score map
    // Ranking component uses key: `${ISN}_${station}_${Test end Time}`
    // We need to match scored records back to original records by index
    // since scoring order is preserved
    const newScores: Record<string, number> = {}
    const nextForcedFailures: Record<string, { minimumItemScore: number; failingItems: { name: string; score: number }[] }> =
      {}

    testItemData.value.forEach((record, index) => {
      const isn = record.ISN || record.DeviceId || '-'
      const station = record.station
      const testEndTime = record['Test end Time'] || ''
      const key = `${isn}_${station}_${testEndTime}`

      // Get score by index (order is preserved from backend)
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

// Apply user-selected scoring configurations from station configs
function applyUserScoringConfigs(): void {
  // Iterate through all station configs and apply custom scoring settings
  for (const config of Object.values(stationConfigs.value)) {
    if (!config.testItemScoringConfigs) continue

    for (const [testItemName, scoringConfig] of Object.entries(config.testItemScoringConfigs)) {
      // Update scoring type for this test item
      setScoringType(testItemName, scoringConfig.scoringType)

      // Build update object with target and weight if specified
      const updates: { target?: number; weight?: number } = {}

      // If target is specified (for asymmetrical or throughput), add to updates
      if (scoringConfig.target !== undefined) {
        updates.target = scoringConfig.target
      }

      // If weight is specified, add to updates
      if (scoringConfig.weight !== undefined) {
        updates.weight = scoringConfig.weight
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        updateScoringConfig(testItemName, updates)
      }
    }
  }
}

// Station selection dialog handlers
async function openStationSelectionDialog(): Promise<void> {
  if (!selectedSite.value || !selectedProject.value) return

  // Fetch stations if not already loaded
  if (stations.value.length === 0) {
    await fetchStations(selectedSite.value, selectedProject.value)
  }

  showStationSelectionDialog.value = true
}

function handleStationClick(station: Station): void {
  selectedStationForConfig.value = station
  currentStationTestItemSource.value = 'default'
  currentStationDefaultTestItems.value = []
  currentStationIplasTestItems.value = []
  currentStationDefaultTestItemsError.value = null
  currentStationIplasTestItemsError.value = null
  showStationConfigDialog.value = true
  // Load device IDs first, then test items (test items need a device ID)
  loadDeviceIdsForStation(station).then(() => {
    loadDefaultTestItemsForStation(station)
  })
}

async function loadDeviceIdsForStation(station: Station): Promise<void> {
  if (!selectedSite.value || !selectedProject.value || !startTime.value || !endTime.value) {
    return
  }

  loadingCurrentStationDevices.value = true
  deviceError.value = null
  currentStationDeviceIds.value = []

  try {
    const start = new Date(startTime.value).toISOString()
    const end = new Date(endTime.value).toISOString()
    const deviceIds = await fetchDeviceIds(
      selectedSite.value,
      selectedProject.value,
      station.display_station_name,
      start,
      end,
    )
    currentStationDeviceIds.value = deviceIds
  } catch (err: unknown) {
    deviceError.value = getErrorMessage(err) || 'Failed to load device IDs'
  } finally {
    loadingCurrentStationDevices.value = false
  }
}

async function refreshCurrentStationDevices(): Promise<void> {
  if (selectedStationForConfig.value) {
    await loadDeviceIdsForStation(selectedStationForConfig.value)
  }
}

function mapIplasTestItemInfos(
  response: Awaited<ReturnType<typeof fetchTestItemNamesCached>>,
): TestItemInfo[] {
  return dedupeTestItemInfos(
    response.test_items.map((item) => ({
      name: item.name,
      isValue: item.is_value,
      isBin: item.is_bin,
      hasUcl: item.has_ucl,
      hasLcl: item.has_lcl,
    })),
  )
}

function dedupeTestItemInfos(items: TestItemInfo[]): TestItemInfo[] {
  const merged = new Map<string, TestItemInfo>()

  for (const item of items) {
    const name = item.name.trim()
    if (!name) {
      continue
    }

    const existing = merged.get(name)
    if (!existing) {
      merged.set(name, { ...item, name })
      continue
    }

    merged.set(name, {
      ...existing,
      name,
      isValue: existing.isValue || item.isValue,
      isBin: existing.isBin || item.isBin,
      hasUcl: existing.hasUcl || item.hasUcl,
      hasLcl: existing.hasLcl || item.hasLcl,
    })
  }

  return Array.from(merged.values())
}

function mapDefaultLatestTestItemInfos(
  items: Array<{ name: string; upperlimit: number | null; lowerlimit: number | null }>,
): TestItemInfo[] {
  return dedupeTestItemInfos(
    items.map((item) => {
      const hasUcl = item.upperlimit !== null && item.upperlimit !== 0
      const hasLcl = item.lowerlimit !== null && item.lowerlimit !== 0

      return {
        name: item.name,
        isValue: true,
        isBin: false,
        hasUcl,
        hasLcl,
      }
    }),
  )
}

async function loadDefaultTestItemsForStation(
  station: Station,
  forceRefresh = false,
): Promise<void> {
  if (!selectedSite.value || !selectedProject.value) {
    return
  }

  const cacheKey = `${selectedSite.value}_${selectedProject.value}_${station.display_station_name}_${startTime.value}_${endTime.value}`

  if (!forceRefresh) {
    const cachedData = defaultLatestTestItemsCache.value.get(cacheKey)
    if (cachedData) {
      currentStationDefaultTestItems.value = cachedData
      return
    }
  }

  loadingCurrentStationDefaultTestItems.value = true
  currentStationDefaultTestItemsError.value = null
  currentStationDefaultTestItems.value = []

  try {
    const response = await dutApi.getLatestTestItemsByRange({
      site_name: selectedSite.value,
      project_name: selectedProject.value,
      station_name: station.display_station_name,
      start_time: new Date(startTime.value).toISOString(),
      end_time: new Date(endTime.value).toISOString(),
    })

    if (!Array.isArray(response.data)) {
      throw new Error('Default test items API returned an invalid response')
    }
    if (response.data.length === 0) {
      throw new Error('No default test items were returned for the selected station and time range')
    }

    const testItemInfos = mapDefaultLatestTestItemInfos(response.data)
    currentStationDefaultTestItems.value = testItemInfos
    defaultLatestTestItemsCache.value.set(cacheKey, testItemInfos)
    if (response.source === 'fallback_station_items') {
      console.warn('[TestItems] Latest endpoint unavailable, loaded broader station test item list instead')
    } else {
      console.log('[TestItems] Loaded fast default test items from external DUT latest endpoint')
    }
  } catch (err: unknown) {
    currentStationDefaultTestItemsError.value =
      getErrorMessage(err) || 'Failed to load default test items'
  } finally {
    loadingCurrentStationDefaultTestItems.value = false
  }
}

async function loadIplasTestItemsForStation(station: Station, forceRefresh = false): Promise<void> {
  if (!selectedSite.value || !selectedProject.value) {
    return
  }

  const cacheKey = `${selectedSite.value}_${selectedProject.value}_${station.display_station_name}`

  if (!forceRefresh) {
    const cachedData = iplasTestItemNamesCache.value.get(cacheKey)
    if (cachedData) {
      currentStationIplasTestItems.value = cachedData
      return
    }
  }

  loadingCurrentStationIplasTestItems.value = true
  currentStationIplasTestItemsError.value = null
  currentStationIplasTestItems.value = []

  try {
    const response = await fetchTestItemNamesCached(
      selectedSite.value,
      selectedProject.value,
      station.display_station_name,
      true,
      forceRefresh,
      startTime.value ? new Date(startTime.value) : undefined,
      endTime.value ? new Date(endTime.value) : undefined,
    )

    const testItemInfos = mapIplasTestItemInfos(response)
    if (testItemInfos.length === 0) {
      throw new Error('No iPLAS test items were returned for the selected station and time range')
    }

    currentStationIplasTestItems.value = testItemInfos
    iplasTestItemNamesCache.value.set(cacheKey, testItemInfos)

    if (response.cached) {
      console.log(`[TestItems] Loaded from DB cache (${response.cache_age_hours?.toFixed(1)}h old)`)
    } else {
      console.log('[TestItems] Fetched fresh from iPLAS and cached to DB')
    }
  } catch (err: unknown) {
    currentStationIplasTestItemsError.value =
      getErrorMessage(err) || 'Failed to load iPLAS test items'
  } finally {
    loadingCurrentStationIplasTestItems.value = false
  }
}

async function refreshCurrentStationTestItems(): Promise<void> {
  if (!selectedStationForConfig.value) {
    return
  }

  if (currentStationTestItemSource.value === 'default') {
    if (selectedSite.value && selectedProject.value) {
      const cacheKey = `${selectedSite.value}_${selectedProject.value}_${selectedStationForConfig.value.display_station_name}_${startTime.value}_${endTime.value}`
      defaultLatestTestItemsCache.value.delete(cacheKey)
    }
    await loadDefaultTestItemsForStation(selectedStationForConfig.value, true)
    return
  }

  if (selectedSite.value && selectedProject.value) {
    const cacheKey = `${selectedSite.value}_${selectedProject.value}_${selectedStationForConfig.value.display_station_name}`
    iplasTestItemNamesCache.value.delete(cacheKey)
  }

  await loadIplasTestItemsForStation(selectedStationForConfig.value, true)
}

async function handleTestItemSourceChange(source: TestItemSource): Promise<void> {
  currentStationTestItemSource.value = source

  if (
    source === 'iplas' &&
    selectedStationForConfig.value &&
    currentStationIplasTestItems.value.length === 0
  ) {
    await loadIplasTestItemsForStation(selectedStationForConfig.value)
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
  // Only auto-fetch if we have all required fields
  if (
    !selectedSite.value ||
    !selectedProject.value ||
    configuredStationsCount.value === 0 ||
    !startTime.value ||
    !endTime.value
  ) {
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

function clearAllStations(): void {
  stationConfigs.value = {}
}

function editStationConfig(displayName: string): void {
  const station = stations.value.find((s) => s.display_station_name === displayName)
  if (station) {
    handleStationClick(station)
  }
}

function removeStationConfig(displayName: string): void {
  delete stationConfigs.value[displayName]
}

// Handlers
function handleSiteChange(): void {
  selectedProject.value = null
  stationConfigs.value = {}
  stations.value = []
  clearTestItemData()
  defaultLatestTestItemsCache.value.clear()
  iplasTestItemNamesCache.value.clear()
  selectedRecordKeys.value.clear()
  forcedFailures.value = {}
}

async function handleProjectChange(): Promise<void> {
  stationConfigs.value = {}
  stations.value = []
  clearTestItemData()
  defaultLatestTestItemsCache.value.clear()
  iplasTestItemNamesCache.value.clear()
  selectedRecordKeys.value.clear()
  forcedFailures.value = {}

  if (selectedSite.value && selectedProject.value) {
    await fetchStations(selectedSite.value, selectedProject.value)
  }
}

function handleClearAll(): void {
  selectedSite.value = null
  selectedProject.value = null
  stationConfigs.value = {}
  clearTestItemData()
  selectedRecordKeys.value.clear()
  forcedFailures.value = {}
  defaultLatestTestItemsCache.value.clear()
  iplasTestItemNamesCache.value.clear()
}

async function fetchTestItems(): Promise<void> {
  if (!selectedSite.value || !selectedProject.value || configuredStationsCount.value === 0) {
    return
  }

  clearTestItemData()
  // Clear scores when fetching new data
  recordScores.value = {}
  forcedFailures.value = {}

  // Iterate through each configured station
  for (const config of Object.values(stationConfigs.value)) {
    let deviceIds = config.deviceIds

    // UPDATED: When user leaves device ID empty, fetch all available device IDs
    // instead of using 'ALL' which is slower on the iPLAS API side
    if (deviceIds.length === 0) {
      try {
        deviceIds = await fetchDeviceIds(
          selectedSite.value,
          selectedProject.value,
          config.displayName,
          new Date(startTime.value),
          new Date(endTime.value),
        )
      } catch (_err) {
        console.warn(`Failed to fetch device IDs for ${config.displayName}, falling back to ALL`)
        deviceIds = ['ALL']
      }
    }

    const includeFilters = config.includedTestItems?.length ? config.includedTestItems : undefined
    const excludeFilters = config.excludedTestItems?.length ? config.excludedTestItems : undefined
    const hasTestItemFilters = !!(includeFilters?.length || excludeFilters?.length)

    // Fetch data for each device ID
    for (const deviceId of deviceIds) {
      if (hasTestItemFilters) {
        // Use the filtered backend proxy endpoint (server-side filtering + caching)
        await fetchTestItemsFiltered(
          selectedSite.value,
          selectedProject.value,
          config.displayName,
          deviceId,
          new Date(startTime.value),
          new Date(endTime.value),
          'PASS',
          includeFilters,
          excludeFilters,
        )
      } else {
        // Use the direct API endpoint (no filtering needed)
        // Pass Date objects - the composable handles ISO format conversion
        await fetchTestItemsApi(
          selectedSite.value,
          selectedProject.value,
          config.displayName,
          deviceId,
          new Date(startTime.value),
          new Date(endTime.value),
          'PASS',
        )
      }
    }
  }

  if (testItemData.value.length === 0) {
    error.value =
      'No iPLAS data was returned for the selected station configuration, device IDs, and time range.'
  }

  logStationSearchCacheStatus()
}

// Initialize
onMounted(async () => {
  await fetchSiteProjects()
  applyDateRangePreset()

  // UPDATED: Set default site based on connected iPLAS server
  const { selectedServer } = useIplasSettings()
  const serverId = selectedServer.value?.id?.toUpperCase()
  if (serverId && uniqueSites.value.includes(serverId) && !selectedSite.value) {
    selectedSite.value = serverId
  }
})

// Cleanup on unmount to free memory
onUnmounted(() => {
  clearTestItemData()
  recordScores.value = {}
  stationConfigs.value = {}
})
</script>

<style scoped>
.top-product-iplas-station-shell,
.top-product-iplas-station-stack,
.top-product-iplas-station-field,
.top-product-iplas-station-action-card,
.top-product-iplas-station-summary-panel,
.top-product-iplas-station-summary-panel__header,
.top-product-iplas-station-footer-actions,
.top-product-iplas-station-token-card {
  display: grid;
  gap: 0.9rem;
}

.top-product-iplas-station-shell {
  gap: 0.9rem;
}

.top-product-iplas-station-summary-row,
.top-product-iplas-station-token-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.top-product-iplas-station-grid {
  display: grid;
  gap: 0.9rem;
}

.top-product-iplas-station-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.top-product-iplas-station-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.top-product-iplas-station-field span,
.top-product-iplas-station-action-card strong,
.top-product-iplas-station-summary-panel h3,
.top-product-iplas-station-token-card strong,
.top-product-iplas-station-loading-card strong {
  color: var(--app-ink);
}

.top-product-iplas-station-field span,
.top-product-iplas-station-summary-panel__eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: none;
}

.top-product-iplas-station-summary-panel__eyebrow {
  margin: 0;
  color: var(--app-accent);
}

.top-product-iplas-station-action-card p,
.top-product-iplas-station-token-card p,
.top-product-iplas-station-loading-card p,
.top-product-iplas-station-notice {
  margin: 0;
  color: var(--app-muted);
  line-height: 1.55;
}

.top-product-iplas-station-field select,
.top-product-iplas-station-field input {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 0.75rem;
  background: var(--app-panel-strong);
  color: var(--app-ink);
  padding: 0.72rem 0.82rem;
  font: inherit;
}

.top-product-iplas-station-button,
.top-product-iplas-station-token-card,
.top-product-iplas-station-remove {
  min-height: 2.75rem;
  border-radius: 0.75rem;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-ink);
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.top-product-iplas-station-button {
  padding: 0.62rem 0.9rem;
}

.top-product-iplas-station-button--secondary {
  min-width: 15rem;
  justify-content: center;
}

.top-product-iplas-station-button:hover,
.top-product-iplas-station-token-card:hover,
.top-product-iplas-station-remove:hover {
  border-color: rgba(15, 118, 110, 0.24);
}

.top-product-iplas-station-button--primary {
  background: var(--app-accent);
  border-color: var(--app-accent);
  color: var(--app-canvas);
}

.top-product-iplas-station-button--secondary {
  background: var(--app-info-soft);
  border-color: var(--app-info-line);
  color: var(--app-info);
}

.top-product-iplas-station-button--ghost {
  background: var(--app-panel);
}

.top-product-iplas-station-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.1rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
}

.top-product-iplas-station-pill--primary {
  background: rgba(15, 118, 110, 0.1);
  border-color: rgba(15, 118, 110, 0.16);
  color: var(--app-accent);
}

.top-product-iplas-station-pill--info {
  background: var(--app-info-soft);
  border-color: var(--app-info-line);
  color: var(--app-info);
}

.top-product-iplas-station-pill--warning {
  background: var(--app-warning-soft);
  border-color: var(--app-warning-line);
  color: var(--app-warning);
}

.top-product-iplas-station-pill--muted {
  background: rgba(95, 103, 122, 0.1);
  border-color: rgba(95, 103, 122, 0.16);
  color: var(--app-muted);
}

.top-product-iplas-station-action-card,
.top-product-iplas-station-summary-panel,
.top-product-iplas-station-loading-card,
.top-product-iplas-station-notice {
  padding: 0.9rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(15, 118, 110, 0.12);
  background: var(--app-panel);
}

.top-product-iplas-station-action-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.top-product-iplas-station-summary-panel h3 {
  margin: 0;
}

.top-product-iplas-station-token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 0.75rem;
}

.top-product-iplas-station-token-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  width: 100%;
  min-height: 0;
  padding: 0.72rem 0.8rem;
  text-align: left;
}

.top-product-iplas-station-token-card__copy {
  display: grid;
  gap: 0.28rem;
}

.top-product-iplas-station-token-card__meta {
  gap: 0.45rem;
  align-self: start;
  justify-content: flex-end;
}

.top-product-iplas-station-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  border: 1px solid var(--app-border);
  border-radius: 0.7rem;
  background: var(--app-panel-strong);
  color: var(--app-danger);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}

.top-product-iplas-station-icon-button:hover {
  border-color: var(--app-danger-line);
  background: var(--app-danger-soft);
  transform: translateY(-1px);
}

.top-product-iplas-station-remove {
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
}

.top-product-iplas-station-footer-actions {
  grid-auto-flow: column;
  justify-content: end;
}

.top-product-iplas-station-notice--error {
  border-color: var(--app-danger-line);
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

.top-product-iplas-station-loading-card {
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
}

.top-product-iplas-station-spinner {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 3px solid rgba(15, 118, 110, 0.16);
  border-top-color: var(--app-accent);
  animation: top-product-iplas-station-spin 0.9s linear infinite;
}

@keyframes top-product-iplas-station-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 840px) {

  .top-product-iplas-station-grid--two,
  .top-product-iplas-station-grid--three,
  .top-product-iplas-station-action-card,
  .top-product-iplas-station-token-card {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 620px) {
  .top-product-iplas-station-footer-actions {
    grid-auto-flow: row;
    justify-content: stretch;
  }
}
</style>
