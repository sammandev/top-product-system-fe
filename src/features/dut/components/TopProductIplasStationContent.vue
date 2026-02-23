<template>
  <div>
    <!-- Data Selection Card -->
    <v-card elevation="2" class="mb-4">
      <v-card-title class="d-flex align-center justify-space-between bg-primary">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-database-search</v-icon>
          Station Search - Custom Configuration
        </div>
        <v-btn color="white" variant="outlined" size="small" prepend-icon="mdi-cog" @click="emit('show-settings')">
          iPLAS Settings
        </v-btn>
      </v-card-title>
      <v-card-text class="pt-4">
        <!-- Site Selection -->
        <v-row dense>
          <v-col cols="12" md="6">
            <v-autocomplete v-model="selectedSite" :items="uniqueSites" label="Site" variant="outlined"
              density="comfortable" prepend-inner-icon="mdi-map-marker" clearable hide-details
              :disabled="loading || loadingStations" @update:model-value="handleSiteChange" />
          </v-col>
          <v-col cols="12" md="6">
            <v-autocomplete v-model="selectedProject" :items="projectsForSelectedSite" label="Project"
              variant="outlined" density="comfortable" prepend-inner-icon="mdi-folder" hide-details
              :disabled="!selectedSite || loading || loadingStations" clearable
              @update:model-value="handleProjectChange" />
          </v-col>
        </v-row>

        <!-- UPDATED: Date Range Preset and Date Range fields in same row -->
        <v-row dense class="mt-4">
          <v-col cols="12" md="4">
            <v-select v-model="dateRangePreset" :items="dateRangePresets" item-value="value" label="Date Range Preset"
              variant="outlined" density="comfortable" prepend-inner-icon="mdi-calendar-clock"
              @update:model-value="applyDateRangePreset" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="startTime" label="Start Time" type="datetime-local" variant="outlined"
              density="comfortable" prepend-inner-icon="mdi-calendar-start" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="endTime" label="End Time" type="datetime-local" variant="outlined"
              density="comfortable" prepend-inner-icon="mdi-calendar-end" />
          </v-col>
        </v-row>

        <!-- Station Configuration Button -->
        <v-row dense>
          <v-col cols="12">
            <v-btn color="secondary" block size="large" prepend-icon="mdi-format-list-checkbox"
              :disabled="!selectedSite || !selectedProject || loadingStations" :loading="loadingStations"
              @click="openStationSelectionDialog">
              Configure Stations
              <v-chip v-if="configuredStationsCount > 0" size="small" color="success" variant="flat" class="ml-2">
                {{ configuredStationsCount }} Selected
              </v-chip>
            </v-btn>
          </v-col>
        </v-row>

        <!-- Configured Stations Summary -->
        <v-card v-if="configuredStationsCount > 0" variant="outlined" class="mt-4">
          <v-card-title class="text-subtitle-1 bg-grey-lighten-5">
            Configured Stations Summary
          </v-card-title>
          <v-card-text class="pa-2">
            <v-chip v-for="(config, displayName) in stationConfigs" :key="displayName" class="ma-1" color="primary"
              variant="tonal" closable @click="editStationConfig(displayName)"
              @click:close="removeStationConfig(displayName)">
              {{ displayName }}
              <v-badge :content="config.deviceIds.length || config.totalDeviceCount || 'All'" color="success" inline
                class="ml-1" />
              <v-chip size="x-small" class="ml-1" variant="outlined">{{ config.testStatus }}</v-chip>
            </v-chip>
          </v-card-text>
        </v-card>

        <!-- Action Buttons -->
        <v-divider class="my-4" />
        <div class="d-flex justify-end gap-2">
          <v-btn color="error" variant="outlined" prepend-icon="mdi-refresh" :disabled="loading"
            @click="handleClearAll">
            Clear All
          </v-btn>
          <v-btn color="primary" variant="flat" prepend-icon="mdi-magnify" :loading="loadingTestItems"
            :disabled="!canFetchData" @click="fetchTestItems">
            Search
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Error Alert -->
    <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
      {{ error }}
    </v-alert>

    <!-- Loading Indicator -->
    <v-card v-if="loadingTestItems" class="mb-4">
      <v-card-text class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="48" />
        <p class="text-medium-emphasis mt-4">Fetching test data from iPLAS...</p>
      </v-card-text>
    </v-card>

    <!-- Results Section with Ranking Table -->
    <TopProductIplasRanking v-if="testItemData.length > 0" :records="testItemData" :scores="recordScores"
      :calculating-scores="calculatingScores" :loading="loadingTestItems" :exporting-all="exportingAll"
      @row-click="handleRowClick" @download="handleDownloadRecord" @bulk-download="handleBulkDownloadRecords"
      @export="handleExportRecords" @export-all="handleExportAllRecords" @calculate-scores="handleCalculateScores" />

    <!-- Station Selection Dialog -->
    <StationSelectionDialog v-model:show="showStationSelectionDialog" :site="selectedSite || ''"
      :project="selectedProject || ''" :stations="stations" :selected-configs="stationConfigs"
      @station-click="handleStationClick" @confirm="handleStationSelectionConfirm" @clear-all="clearAllStations" />

    <!-- Station Config Dialog -->
    <StationConfigDialog v-model:show="showStationConfigDialog" :station="selectedStationForConfig"
      :site="selectedSite || ''" :project="selectedProject || ''" :start-time="startTime" :end-time="endTime"
      :existing-config="currentStationConfig" :available-device-ids="currentStationDeviceIds"
      :loading-devices="loadingCurrentStationDevices" :device-error="deviceError"
      :available-test-items="currentStationTestItems" :loading-test-items="loadingCurrentStationTestItems"
      :test-items-error="testItemsError" @save="handleStationConfigSave" @remove="handleStationConfigRemove"
      @refresh-devices="refreshCurrentStationDevices" @refresh-test-items="refreshCurrentStationTestItems" />
  </div>
</template>

<script setup lang="ts">
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
import { getErrorMessage } from '@/shared/utils'
import { useScoring } from '../composables/useScoring'
import type { NormalizedRecord, NormalizedTestItem } from './IplasTestItemsFullscreenDialog.vue'
import StationConfigDialog, { type TestItemInfo } from './StationConfigDialog.vue'
import StationSelectionDialog, { type StationConfig } from './StationSelectionDialog.vue'
import TopProductIplasRanking from './TopProductIplasRanking.vue'

// Emits
const emit = defineEmits<{
  (e: 'show-details', record: NormalizedRecord): void
  (e: 'show-settings'): void
}>()

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
const calculatingScores = ref(false)
const exportingAll = ref(false)

const {
  loading,
  loadingStations,
  loadingTestItems,
  error,
  stations,
  testItemData,
  uniqueSites,
  projectsBySite,
  fetchSiteProjects,
  fetchStations,
  fetchDeviceIds,
  fetchTestItems: fetchTestItemsApi,
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
const currentStationTestItems = ref<TestItemInfo[]>([])
const loadingCurrentStationTestItems = ref(false)
const testItemsError = ref<string | null>(null)

// UPDATED: Cache for test item names to avoid repeated API calls
// Key format: `${site}_${project}_${station}_${deviceId}`
const testItemNamesCache = ref<Map<string, TestItemInfo[]>>(new Map())

// For download
const selectedRecordKeys = ref<Set<string>>(new Set())

// Computed
const projectsForSelectedSite = computed(() => {
  if (!selectedSite.value) return []
  return projectsBySite.value[selectedSite.value] || []
})

const configuredStationsCount = computed(() => {
  return Object.keys(stationConfigs.value).length
})

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

    testItemData.value.forEach((record, index) => {
      const isn = record.ISN || record.DeviceId || '-'
      const station = record.station
      const testEndTime = record['Test end Time'] || ''
      const key = `${isn}_${station}_${testEndTime}`

      // Get score by index (order is preserved from backend)
      const scoredRecord = scoredRecords.value[index]
      if (scoredRecord) {
        newScores[key] = scoredRecord.overallScore
      }
    })

    recordScores.value = newScores
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
  showStationConfigDialog.value = true
  // Load device IDs first, then test items (test items need a device ID)
  loadDeviceIdsForStation(station).then(() => {
    loadTestItemsForStation(station)
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

async function loadTestItemsForStation(station: Station, forceRefresh = false): Promise<void> {
  if (!selectedSite.value || !selectedProject.value) {
    return
  }

  // Use database-backed cache with session in-memory cache for instant response
  const cacheKey = `${selectedSite.value}_${selectedProject.value}_${station.display_station_name}`

  // Check in-memory cache first (for instant response during session)
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
    // UPDATED: Pass user's selected time range for use when fetching fresh data on cache miss
    const response = await fetchTestItemNamesCached(
      selectedSite.value,
      selectedProject.value,
      station.display_station_name,
      true, // Exclude BIN items - not needed for scoring
      forceRefresh, // Force cache refresh if requested
      startTime.value ? new Date(startTime.value) : undefined, // Pass current time range
      endTime.value ? new Date(endTime.value) : undefined,
    )

    // Convert to TestItemInfo format expected by StationConfigDialog
    const testItemInfos: TestItemInfo[] = response.test_items.map((item) => ({
      name: item.name,
      isValue: item.is_value,
      isBin: item.is_bin,
      hasUcl: item.has_ucl,
      hasLcl: item.has_lcl,
    }))

    currentStationTestItems.value = testItemInfos

    // Store in session cache for instant response
    testItemNamesCache.value.set(cacheKey, testItemInfos)

    // Log cache info
    if (response.cached) {
      console.log(`[TestItems] Loaded from DB cache (${response.cache_age_hours?.toFixed(1)}h old)`)
    } else {
      console.log('[TestItems] Fetched fresh from iPLAS and cached to DB')
    }
  } catch (err: unknown) {
    testItemsError.value = getErrorMessage(err) || 'Failed to load test items'
  } finally {
    loadingCurrentStationTestItems.value = false
  }
}

async function refreshCurrentStationTestItems(): Promise<void> {
  if (selectedStationForConfig.value) {
    // UPDATED: Clear session cache and force-refresh from database
    if (selectedSite.value && selectedProject.value) {
      const cacheKey = `${selectedSite.value}_${selectedProject.value}_${selectedStationForConfig.value.display_station_name}`
      testItemNamesCache.value.delete(cacheKey)
    }
    await loadTestItemsForStation(selectedStationForConfig.value, true) // forceRefresh=true
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
  selectedRecordKeys.value.clear()
}

async function handleProjectChange(): Promise<void> {
  stationConfigs.value = {}
  stations.value = []
  clearTestItemData()
  selectedRecordKeys.value.clear()

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
  // UPDATED: Clear test item names cache
  testItemNamesCache.value.clear()
}

async function fetchTestItems(): Promise<void> {
  if (!selectedSite.value || !selectedProject.value || configuredStationsCount.value === 0) {
    return
  }

  clearTestItemData()
  // Clear scores when fetching new data
  recordScores.value = {}

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

    const hasTestItemFilters = config.selectedTestItems && config.selectedTestItems.length > 0

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
          config.testStatus,
          config.selectedTestItems,
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
          config.testStatus,
        )
      }
    }
  }
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
.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 0.75rem;
}
</style>
