<template>
    <div>
        <!-- UPDATED: Step 1: ISN Input & Station Lookup Card (like Station Search) -->
        <v-card elevation="2" class="mb-4">
            <v-card-title class="d-flex align-center justify-space-between bg-primary">
                <div class="d-flex align-center">
                    <v-icon class="mr-2">mdi-barcode-scan</v-icon>
                    ISN Search - Custom Configuration
                </div>
            </v-card-title>
            <v-card-text class="pt-4">
                <!-- Input Mode Toggle -->
                <v-btn-toggle v-model="inputMode" mandatory color="primary" class="mb-4">
                    <v-btn value="single" size="small">
                        <v-icon start>mdi-numeric-1-box</v-icon>
                        Single ISN
                    </v-btn>
                    <v-btn value="multiple" size="small">
                        <v-icon start>mdi-format-list-bulleted</v-icon>
                        Multiple ISNs
                    </v-btn>
                    <v-btn value="bulk" size="small">
                        <v-icon start>mdi-text-box-multiple</v-icon>
                        Bulk Paste
                    </v-btn>
                </v-btn-toggle>

                <!-- Single ISN Input -->
                <v-row v-if="inputMode === 'single'">
                    <v-col cols="12" md="10">
                        <v-text-field v-model="searchIsn" label="DUT ISN" placeholder="e.g., DM2520270073965"
                            prepend-inner-icon="mdi-barcode-scan" variant="outlined" density="comfortable" clearable
                            hint="Enter ISN to lookup available stations" persistent-hint
                            @keyup.enter="handleLookupStations" />
                    </v-col>
                    <v-col cols="12" md="2" class="d-flex align-center">
                        <v-btn color="secondary" size="large" :loading="loadingStationLookup"
                            :disabled="!searchIsn?.trim()" prepend-icon="mdi-magnify" block class="mb-5"
                            @click="handleLookupStations">
                            Search
                        </v-btn>
                    </v-col>
                </v-row>

                <!-- Multiple ISNs Combobox -->
                <v-row v-if="inputMode === 'multiple'">
                    <v-col cols="12">
                        <v-combobox v-model="selectedISNs" label="DUT ISNs" placeholder="Type ISN and press Enter"
                            prepend-inner-icon="mdi-barcode-scan" variant="outlined" chips multiple closable-chips
                            clearable hint="Type ISN and press Enter to add multiple" persistent-hint>
                            <template #chip="{ props, item }">
                                <v-chip v-bind="props" :text="String(item.value || item)" closable />
                            </template>
                            <template #append>
                                <v-btn color="secondary" variant="flat" size="small" :loading="loadingStationLookup"
                                    :disabled="!selectedISNs || selectedISNs.length === 0" prepend-icon="mdi-magnify"
                                    @click="handleLookupStations">
                                    Search
                                </v-btn>
                            </template>
                        </v-combobox>
                    </v-col>
                </v-row>

                <!-- Bulk Paste Textarea -->
                <v-row v-if="inputMode === 'bulk'">
                    <v-col cols="12">
                        <v-textarea v-model="searchIsn" label="Bulk ISN Input"
                            placeholder="Paste multiple ISNs (one per line, comma-separated, or space-separated)&#10;Example:&#10;DM2520270073965&#10;DM2527470036123"
                            prepend-inner-icon="mdi-text-box-multiple" variant="outlined" rows="4" clearable
                            hint="Paste ISNs separated by newlines, commas, or spaces" persistent-hint>
                            <template #append>
                                <v-btn color="secondary" variant="flat" size="small" :loading="loadingStationLookup"
                                    :disabled="!searchIsn?.trim()" prepend-icon="mdi-magnify"
                                    @click="handleLookupStations">
                                    Search
                                </v-btn>
                            </template>
                        </v-textarea>
                    </v-col>
                </v-row>

                <!-- UPDATED: ISN Lookup Results - Site/Project Info -->
                <v-card v-if="isnProjectInfo" variant="outlined" class="mt-4">
                    <v-card-text class="py-3">
                        <v-row align="center">
                            <v-col cols="auto">
                                <v-icon color="success" size="large">mdi-check-circle</v-icon>
                            </v-col>
                            <v-col>
                                <div class="d-flex flex-wrap align-center gap-3">
                                    <v-chip color="primary" label>
                                        <v-icon start>mdi-barcode-scan</v-icon>
                                        {{ parsedIsns.length }} ISN(s)
                                    </v-chip>
                                    <v-chip color="info" label>
                                        <v-icon start>mdi-map-marker</v-icon>
                                        Site: {{ isnProjectInfo.site }}
                                    </v-chip>
                                    <v-chip color="info" label>
                                        <v-icon start>mdi-folder</v-icon>
                                        Project: {{ isnProjectInfo.project }}
                                    </v-chip>
                                    <v-chip color="success" label>
                                        <v-icon start>mdi-router-wireless</v-icon>
                                        {{ availableStations.length }} Stations Available
                                    </v-chip>
                                </div>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- UPDATED: Configure Stations Button (like Station Search) -->
                <v-row v-if="isnProjectInfo" dense class="mt-2">
                    <v-col cols="12">
                        <v-btn color="secondary" block size="large" prepend-icon="mdi-format-list-checkbox"
                            :disabled="availableStations.length === 0" :loading="loadingStations"
                            @click="openStationSelectionDialog">
                            Configure Stations
                            <v-chip v-if="configuredStationsCount > 0" size="small" color="success" variant="flat"
                                class="ml-2">
                                {{ configuredStationsCount }} Selected
                            </v-chip>
                        </v-btn>
                    </v-col>
                </v-row>

                <!-- UPDATED: Configured Stations Summary (like Station Search) -->
                <v-card v-if="configuredStationsCount > 0" variant="outlined" class="mt-4">
                    <v-card-title class="text-subtitle-1">
                        Configured Stations Summary
                    </v-card-title>
                    <v-card-text class="pa-2">
                        <v-chip v-for="(config, displayName) in stationConfigs" :key="displayName" class="ma-1"
                            color="primary" variant="tonal" closable @click="editStationConfig(displayName)"
                            @click:close="removeStationConfig(displayName)">
                            {{ displayName }}
                            <v-badge :content="config.deviceIds.length || 'All'" color="success" inline class="ml-1" />
                            <v-chip size="x-small" class="ml-1" variant="outlined">{{ config.testStatus }}</v-chip>
                        </v-chip>
                    </v-card-text>
                </v-card>

                <!-- UPDATED: Action Buttons (like Station Search) -->
                <v-divider v-if="isnProjectInfo" class="my-4" />
                <div v-if="isnProjectInfo" class="d-flex justify-end gap-2">
                    <v-btn color="error" variant="outlined" prepend-icon="mdi-refresh" :disabled="loadingTestItems"
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

        <!-- UPDATED: Results Section with TopProductIplasRanking (like Station Search) -->
        <TopProductIplasRanking v-if="testItemData.length > 0" :records="testItemData" :scores="recordScores"
            :calculating-scores="calculatingScores" @row-click="handleRowClick" @download="handleDownloadRecord"
            @bulk-download="handleBulkDownloadRecords" @calculate-scores="handleCalculateScores" />

        <!-- Station Selection Dialog -->
        <StationSelectionDialog v-model:show="showStationSelectionDialog" :stations="(availableStations as any)"
            :site="isnProjectInfo?.site || ''" :project="isnProjectInfo?.project || ''"
            :selected-configs="stationConfigs" :loading="loadingStations" @station-click="handleStationClick"
            @confirm="handleStationSelectionConfirm" />

        <!-- Station Config Dialog -->
        <StationConfigDialog v-model:show="showStationConfigDialog" :station="selectedStationForConfig"
            :site="isnProjectInfo?.site || ''" :project="isnProjectInfo?.project || ''"
            :existing-config="currentStationConfig" :available-device-ids="currentStationDeviceIds"
            :loading-devices="loadingCurrentStationDevices" :device-error="deviceError"
            :available-test-items="currentStationTestItems" :loading-test-items="loadingCurrentStationTestItems"
            :test-items-error="testItemsError" @save="handleStationConfigSave" @remove="handleStationConfigRemove"
            @refresh-devices="refreshCurrentStationDevices" @refresh-test-items="refreshCurrentStationTestItems" />

        <!-- Details Dialog -->
        <TopProductIplasDetailsDialog v-model="showDetailsDialog" :record="detailsRecord"
            :downloading="detailsDownloading" @download="handleDownloadFromDetails" />
    </div>
</template>

<script setup lang="ts">
// UPDATED: Complete rewrite of script section for new UX flow
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useIplasApi, type Station, type CsvTestItemData, type TestItem } from '@/features/dut_logs/composables/useIplasApi'
import { useScoring } from '@/features/dut/composables/useScoring'
import { iplasProxyApi, type IplasIsnProjectInfo, type IplasIsnSearchRecord } from '@/features/dut_logs/api/iplasProxyApi'
import StationSelectionDialog, { type StationConfig } from './StationSelectionDialog.vue'
import StationConfigDialog, { type TestItemInfo } from './StationConfigDialog.vue'
import TopProductIplasRanking from './TopProductIplasRanking.vue'
import TopProductIplasDetailsDialog from './TopProductIplasDetailsDialog.vue'
import type { NormalizedRecord, NormalizedTestItem } from './IplasTestItemsFullscreenDialog.vue'
import type { IplasDownloadCsvLogInfo } from '@/features/dut_logs/api/iplasProxyApi'

// ============================================================================
// State: ISN Input
// ============================================================================
const inputMode = ref<'single' | 'multiple' | 'bulk'>('single')
const searchIsn = ref('')
const selectedISNs = ref<string[]>([])

// ============================================================================
// State: Station Lookup
// ============================================================================
const loadingStationLookup = ref(false)
const isnProjectInfo = ref<IplasIsnProjectInfo | null>(null)
const availableStations = ref<Station[]>([])
const parsedIsns = ref<string[]>([])
/** Raw ISN search records from the API - contains all test data */
const isnSearchRecords = ref<IplasIsnSearchRecord[]>([])

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
    clearTestItemData
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
    setScoringType
} = useScoring()
const recordScores = ref<Record<string, number>>({})
const calculatingScores = ref(false)

// ============================================================================
// State: Details Dialog
// ============================================================================
const showDetailsDialog = ref(false)
const detailsRecord = ref<NormalizedRecord | null>(null)
const detailsDownloading = ref(false)

// ============================================================================
// Computed
// ============================================================================
const configuredStationsCount = computed(() => {
    return Object.keys(stationConfigs.value).length
})

const currentStationConfig = computed(() => {
    if (!selectedStationForConfig.value) return undefined
    return stationConfigs.value[selectedStationForConfig.value.display_station_name]
})

const canFetchData = computed(() => {
    return isnProjectInfo.value && configuredStationsCount.value > 0
})

// ============================================================================
// Helper Functions: Transform ISN Search Data to CsvTestItemData
// ============================================================================
function transformIsnRecordToCsvData(record: IplasIsnSearchRecord): CsvTestItemData {
    // Transform test items from ISN format to standard TestItem format
    const testItems: TestItem[] = (record.test_item || []).map(item => ({
        NAME: item.NAME,
        STATUS: item.STATUS,
        VALUE: item.VALUE,
        UCL: item.UCL || '',
        LCL: item.LCL || '',
        CYCLE: item.CYCLE || ''
    }))

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
        'Test Start Time': record.test_start_time,
        'Test end Time': record.test_end_time,
        ErrorCode: record.error_code,
        ErrorName: record.error_name || 'N/A',
        TestItem: testItems
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
                data_source: 'ISN Search'
            })
        }
    }

    return Array.from(stationMap.values())
}

/** Extract unique device IDs from ISN search records for a specific station */
function extractDeviceIdsFromRecords(records: IplasIsnSearchRecord[], stationName: string): string[] {
    const deviceIds = new Set<string>()

    for (const record of records) {
        // Match by display_station_name (primary) or station_name (fallback)
        const stationMatches = record.display_station_name === stationName || record.station_name === stationName
        if (stationMatches && record.device_id) {
            deviceIds.add(record.device_id)
        }
    }

    return Array.from(deviceIds).sort()
}

/** Extract unique test item names from ISN search records for a specific station */
function extractTestItemsFromRecords(records: IplasIsnSearchRecord[], stationName: string): TestItemInfo[] {
    const testItemMap = new Map<string, TestItemInfo>()

    for (const record of records) {
        // Match by display_station_name (primary) or station_name (fallback)
        if (record.display_station_name !== stationName && record.station_name !== stationName) continue

        for (const item of record.test_item || []) {
            if (!testItemMap.has(item.NAME)) {
                // Determine if value or bin based on UCL/LCL presence and value format
                const hasUcl = Boolean(item.UCL && item.UCL.trim())
                const hasLcl = Boolean(item.LCL && item.LCL.trim())
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
                    hasLcl: hasLcl
                })
            }
        }
    }

    return Array.from(testItemMap.values())
}

// ============================================================================
// ISN Lookup Functions
// ============================================================================
async function handleLookupStations(): Promise<void> {
    // Parse ISN list based on input mode
    let isnList: string[] = []

    if (inputMode.value === 'multiple') {
        isnList = selectedISNs.value.map(isn => String(isn).trim()).filter(isn => isn.length > 0)
    } else {
        if (!searchIsn.value?.trim()) return
        isnList = searchIsn.value
            .split(/[\n,\s]+/)
            .map(isn => isn.trim())
            .filter(isn => isn && isn.length > 0)
    }

    if (isnList.length === 0) {
        error.value = 'Please enter at least one valid ISN'
        return
    }

    // Store parsed ISNs
    parsedIsns.value = isnList

    // Clear previous state
    isnProjectInfo.value = null
    availableStations.value = []
    stationConfigs.value = {}
    isnSearchRecords.value = []
    clearTestItemData()
    recordScores.value = {}

    loadingStationLookup.value = true
    error.value = null

    try {
        // Use searchByIsn to get ALL test data directly (no date range needed)
        // For multiple ISNs, use the first one (batch ISN search could be added later)
        const firstIsn = isnList[0]!
        const response = await iplasProxyApi.searchByIsn({ isn: firstIsn })

        if (response.data.length === 0) {
            error.value = `ISN "${firstIsn}" not found in iPLAS database`
            return
        }

        // Store the raw ISN search records for later use
        isnSearchRecords.value = response.data

        // Extract project info from first record
        const firstRecord = response.data[0]!
        isnProjectInfo.value = {
            isn: firstRecord.isn,
            site: firstRecord.site,
            project: firstRecord.project,
            found: true
        }

        // Extract unique stations from ISN search results
        availableStations.value = extractStationsFromIsnRecords(response.data)

        // Pre-cache test items and device IDs for all stations (performance optimization)
        preCacheStationData(response.data, isnProjectInfo.value)

    } catch (err) {
        console.error('ISN lookup failed:', err)
        error.value = err instanceof Error ? err.message : 'Failed to lookup ISN'
    } finally {
        loadingStationLookup.value = false
    }
}

/** Pre-cache test items and device IDs for all stations from ISN search data */
function preCacheStationData(records: IplasIsnSearchRecord[], projectInfo: IplasIsnProjectInfo): void {
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
    Promise.all([
        loadDeviceIdsForStation(station),
        loadTestItemsForStation(station)
    ])
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
            station.display_station_name
        )
    } catch (err: any) {
        deviceError.value = err.message || 'Failed to extract device IDs'
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
                station.display_station_name
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
            true,         // Exclude BIN items
            forceRefresh
        )

        const testItemInfos: TestItemInfo[] = response.test_items.map(item => ({
            name: item.name,
            isValue: item.is_value,
            isBin: item.is_bin,
            hasUcl: item.has_ucl,
            hasLcl: item.has_lcl
        }))

        currentStationTestItems.value = testItemInfos
        testItemNamesCache.value.set(cacheKey, testItemInfos)
    } catch (err: any) {
        testItemsError.value = err.message || 'Failed to load test items'
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
}

function handleStationConfigSave(config: StationConfig): void {
    stationConfigs.value[config.displayName] = { ...config }
}

function handleStationConfigRemove(displayName: string): void {
    delete stationConfigs.value[displayName]
}

function editStationConfig(displayName: string): void {
    const station = availableStations.value.find(s => s.display_station_name === displayName)
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
    if (!isnProjectInfo.value || configuredStationsCount.value === 0 || isnSearchRecords.value.length === 0) return

    processingIsnData.value = true
    clearTestItemData()
    recordScores.value = {}

    try {
        // Filter ISN search records based on configured stations
        const configuredStationNames = new Set(Object.keys(stationConfigs.value))

        let filteredRecords = isnSearchRecords.value.filter(record =>
            configuredStationNames.has(record.display_station_name)
        )

        // Apply additional filters from station configs
        for (const config of Object.values(stationConfigs.value)) {
            // Filter by device IDs if specified
            if (config.deviceIds && config.deviceIds.length > 0) {
                const deviceIdSet = new Set(config.deviceIds)
                filteredRecords = filteredRecords.filter(record =>
                    record.display_station_name !== config.displayName ||
                    deviceIdSet.has(record.device_id)
                )
            }

            // Filter by test status if not ALL
            if (config.testStatus !== 'ALL') {
                filteredRecords = filteredRecords.filter(record =>
                    record.display_station_name !== config.displayName ||
                    record.test_status.toUpperCase() === config.testStatus
                )
            }
        }

        // Transform ISN records to CsvTestItemData format
        const transformedRecords: CsvTestItemData[] = filteredRecords.map(record => {
            const csvRecord = transformIsnRecordToCsvData(record)

            // Apply test item filters if configured
            const config = stationConfigs.value[record.display_station_name]
            if (config?.selectedTestItems && config.selectedTestItems.length > 0) {
                const testItemSet = new Set(config.selectedTestItems)
                csvRecord.TestItem = csvRecord.TestItem.filter(item => testItemSet.has(item.NAME))
            }

            return csvRecord
        })

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
// Scoring Functions
// ============================================================================
async function handleCalculateScores(): Promise<void> {
    if (testItemData.value.length === 0) return

    calculatingScores.value = true
    try {
        const records = testItemData.value.map(record => ({
            ISN: record.ISN || record.DeviceId,
            DeviceId: record.DeviceId,
            station: record.station,
            'Test Start Time': record['Test Start Time'],
            'Test end Time': record['Test end Time'],
            TestItem: record.TestItem || []
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
        testItemData.value.forEach((record, index) => {
            const isn = record.ISN || record.DeviceId || '-'
            const station = record.station
            const testEndTime = record['Test end Time'] || ''
            const key = `${isn}_${station}_${testEndTime}`

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
    const recordIndex = testItemData.value.findIndex(r =>
        (r.ISN === record.ISN || r.DeviceId === record.DeviceId) &&
        r.station === record.station &&
        r['Test end Time'] === record['Test end Time']
    )
    const scoredRecord = recordIndex >= 0 ? scoredRecords.value[recordIndex] : null

    const testItems: NormalizedTestItem[] = (record.TestItem || []).map((item: TestItem): NormalizedTestItem => {
        const itemScore = scoredRecord?.testItemScores?.find(s => s.testItemName === item.NAME)
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
            weight: itemScore?.weight ?? 1.0
        }
    })

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
        binItemsScore: scoredRecord?.binItemsScore
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
async function handleDownloadRecord(payload: { record: CsvTestItemData; stationName: string }): Promise<void> {
    if (!isnProjectInfo.value) return

    const record = payload.record
    const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
    const time = (record['Test end Time'] || '').replace('T', ' ').replace(/-/g, '/').split('.')[0] || ''
    const deviceid = record.DeviceId
    const station = record.TSP || record.station

    await downloadAttachments(isnProjectInfo.value.site, isnProjectInfo.value.project, [{ isn, time, deviceid, station }])

    const testEndTime = record['Test end Time'] || ''
    const formattedEndTime = testEndTime.includes('.') ? testEndTime : `${testEndTime}.000`
    const apiEndTime = formattedEndTime.replace(/-/g, '/').replace('T', ' ')

    const csvLogInfo: IplasDownloadCsvLogInfo = {
        site: isnProjectInfo.value.site,
        project: isnProjectInfo.value.project,
        station,
        line: record.Line || 'NA',
        model: record.Model || 'ALL',
        deviceid,
        isn,
        test_end_time: apiEndTime,
        data_source: 0
    }

    await downloadCsvLogs([csvLogInfo])
}

async function handleBulkDownloadRecords(payload: { records: CsvTestItemData[]; stationName: string }): Promise<void> {
    if (!isnProjectInfo.value || payload.records.length === 0) return

    const attachments = payload.records.map(record => {
        const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
        const time = (record['Test end Time'] || '').replace('T', ' ').replace(/-/g, '/').split('.')[0] || ''
        const deviceid = record.DeviceId
        const station = record.TSP || record.station
        return { isn, time, deviceid, station }
    })

    await downloadAttachments(isnProjectInfo.value.site, isnProjectInfo.value.project, attachments)

    const csvLogInfos: IplasDownloadCsvLogInfo[] = payload.records.map(record => {
        const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
        const deviceid = record.DeviceId
        const station = record.TSP || record.station
        const testEndTime = record['Test end Time'] || ''
        const formattedEndTime = testEndTime.includes('.') ? testEndTime : `${testEndTime}.000`
        const apiEndTime = formattedEndTime.replace(/-/g, '/').replace('T', ' ')

        return {
            site: isnProjectInfo.value!.site,
            project: isnProjectInfo.value!.project,
            station,
            line: record.Line || 'NA',
            model: record.Model || 'ALL',
            deviceid,
            isn,
            test_end_time: apiEndTime,
            data_source: 0
        }
    })

    await downloadCsvLogs(csvLogInfos)
}

async function handleDownloadFromDetails(): Promise<void> {
    if (!detailsRecord.value || !isnProjectInfo.value) return
    detailsDownloading.value = true
    try {
        const record = testItemData.value.find(r =>
            (r.ISN === detailsRecord.value?.isn || r.DeviceId === detailsRecord.value?.deviceId) &&
            (r.station === detailsRecord.value?.stationName || r.TSP === detailsRecord.value?.displayStationName)
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
    searchIsn.value = ''
    selectedISNs.value = []
    parsedIsns.value = []
    isnProjectInfo.value = null
    availableStations.value = []
    isnSearchRecords.value = []
    stationConfigs.value = {}
    clearTestItemData()
    recordScores.value = {}
    testItemNamesCache.value.clear()
}

onMounted(() => {
    // No initialization needed - ISN search data is fetched on demand
})

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