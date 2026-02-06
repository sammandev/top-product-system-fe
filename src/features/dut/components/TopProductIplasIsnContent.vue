<template>
    <div>
        <!-- UPDATED: Step 1: ISN Input & Station Lookup Card (like Station Search) -->
        <v-card elevation="2" class="mb-4">
            <v-card-title class="d-flex align-center justify-space-between bg-primary">
                <div class="d-flex align-center">
                    <v-icon class="mr-2">mdi-barcode-scan</v-icon>
                    ISN Search - Custom Configuration
                </div>
                <v-btn v-if="isnProjectInfo" color="white" variant="text" prepend-icon="mdi-refresh" size="small"
                    :disabled="loadingTestItems" @click="handleClearAll">
                    Clear All
                </v-btn>
            </v-card-title>
            <v-card-text class="pt-4">
                <!-- Input Mode Toggle -->
                <div class="d-flex align-center mb-4">
                    <v-btn-toggle v-model="inputMode" mandatory color="primary">
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

                    <v-switch v-model="enableUnifiedSearch" label="Unified Search" color="primary" hide-details
                        density="compact" class="ml-4">
                        <template #label>
                            <span class="text-body-2">Unified Search</span>
                            <v-tooltip activator="parent" location="top" max-width="400">
                                <span>When enabled, searches for all related identifiers (ISN, SSN, MAC) using SFISTSP
                                    lookup (Slower).
                                    This finds all test data from all stations that tested the same DUT, even if
                                    different identifiers were used.</span>
                            </v-tooltip>
                        </template>
                    </v-switch>
                </div>

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
                                        {{ availableStations.length }} Stations
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
                            <v-badge :content="config.deviceIds.length || config.totalDeviceCount || 'All'" color="success" inline class="ml-1" />
                            <v-chip size="x-small" class="ml-1" variant="outlined">{{ config.testStatus }}</v-chip>
                        </v-chip>
                    </v-card-text>
                </v-card>
            </v-card-text>
        </v-card>

        <!-- Error Alert -->
        <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
            {{ error }}
        </v-alert>

        <!-- UPDATED: Results Section with TopProductIplasRanking (like Station Search) -->
        <TopProductIplasRanking v-if="testItemData.length > 0" :records="testItemData" :scores="recordScores"
            :calculating-scores="calculatingScores" :exporting-all="exportingAll" @row-click="handleRowClick"
            @download="handleDownloadRecord" @bulk-download="handleBulkDownloadRecords" @export="handleExportRecords"
            @export-all="handleExportAllRecords" @calculate-scores="handleCalculateScores" />

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
import { iplasProxyApi, type IplasIsnProjectInfo, type IplasIsnSearchRecord, type ExportRecord, type ExportTestItem } from '@/features/dut_logs/api/iplasProxyApi'
import { lookupIsnsBatch, type SfistspIsnReferenceResponse } from '@/features/dut_logs/api/sfistspApi'
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
// State: Export
// ============================================================================
const exportingAll = ref(false)

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
    const utcDate = new Date(cleanedTime.replace(' ', 'T') + 'Z')

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
            if (ref.isn && ref.isn.trim()) {
                identifiers.add(ref.isn.trim())
            } else if (ref.isn_searched && ref.isn_searched.trim()) {
                // If 'isn' is not present, user's input is the primary ISN
                identifiers.add(ref.isn_searched.trim())
            }
            // Add SSN if available
            if (ref.ssn && ref.ssn.trim()) {
                identifiers.add(ref.ssn.trim())
            }
            // Add MAC if available
            if (ref.mac && ref.mac.trim()) {
                identifiers.add(ref.mac.trim())
            }
            // NOTE: Intentionally not adding isn_references to limit search scope
        }

        console.info(`SFISTSP lookup found ${identifiers.size} unique identifiers from ${isnList.length} ISNs`)
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
        return response.stations.map(s => ({
            station_name: s.station_name,
            display_station_name: s.display_station_name,
            order: s.order,
            data_source: s.data_source
        }))
    } catch (err) {
        console.warn(`Failed to fetch station list for identifier ${identifier}:`, err)
        return []
    }
}

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
    allIdentifiersToSearch.value = []
    sfistspReferences.value = []
    clearTestItemData()
    recordScores.value = {}

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
        allIdentifiersToSearch.value = allIdentifiers

        // STEP 2: Search for ALL identifiers in parallel and aggregate results
        const searchPromises = allIdentifiers.map(identifier =>
            iplasProxyApi.searchByIsn({ isn: identifier }).catch(err => {
                console.warn(`Failed to search identifier "${identifier}":`, err)
                return { data: [] as IplasIsnSearchRecord[] }
            })
        )

        const responses = await Promise.all(searchPromises)

        // Aggregate all records from all ISN/SSN/MAC searches
        const allRecords: IplasIsnSearchRecord[] = []
        const foundIdentifiers: string[] = []
        const notFoundIdentifiers: string[] = []

        // Use a Set to deduplicate records by unique key (ISN + station + test_end_time)
        const recordKeys = new Set<string>()

        for (let i = 0; i < responses.length; i++) {
            const response = responses[i]!
            const identifier = allIdentifiers[i]!

            if (response.data.length === 0) {
                notFoundIdentifiers.push(identifier)
            } else {
                foundIdentifiers.push(identifier)
                for (const record of response.data) {
                    // Create unique key to avoid duplicates
                    const key = `${record.isn}_${record.display_station_name}_${record.test_end_time}`
                    if (!recordKeys.has(key)) {
                        recordKeys.add(key)
                        allRecords.push(record)
                    }
                }
            }
        }

        if (allRecords.length === 0) {
            error.value = `No data found for identifier(s): ${allIdentifiers.slice(0, 5).join(', ')}${allIdentifiers.length > 5 ? '...' : ''}`
            return
        }

        // Log summary
        console.info(`Found ${allRecords.length} unique records from ${foundIdentifiers.length} identifiers (${notFoundIdentifiers.length} not found)`)

        // Store the raw ISN search records for later use (aggregated and deduplicated)
        isnSearchRecords.value = allRecords

        // Extract project info from first record (assume same project for all)
        const firstRecord = allRecords[0]!
        isnProjectInfo.value = {
            isn: firstRecord.isn,
            site: firstRecord.site,
            project: firstRecord.project,
            found: true
        }

        // STEP 3: Get station list with proper ordering from iPLAS API
        // Use the first found identifier to get the station list
        const stationsFromApi = await fetchStationListFromIsn(firstRecord.isn)

        if (stationsFromApi.length > 0) {
            // Use API station list with proper ordering
            // But only keep stations that have records in the search results
            const stationsWithRecords = new Set(allRecords.map(r => r.display_station_name))
            availableStations.value = stationsFromApi
                .filter(s => stationsWithRecords.has(s.display_station_name))
                .sort((a, b) => a.order - b.order)

            console.info(`Using ${availableStations.value.length} stations from API list (ordered)`)
        } else {
            // Fallback: Extract unique stations from search results (no ordering)
            availableStations.value = extractStationsFromIsnRecords(allRecords)
            console.info(`Fallback: Using ${availableStations.value.length} stations from search results`)
        }

        // Pre-cache test items and device IDs for all stations (performance optimization)
        preCacheStationData(allRecords, isnProjectInfo.value)

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
    // UPDATED: Time is already in local time format (YYYY-MM-DD HH:mm:ss) from transformIsnRecordToCsvData
    // Just need to convert dashes to slashes for the download attachment API
    const time = (record['Test end Time'] || '').replace('T', ' ').replace(/-/g, '/').split('.')[0] || ''
    const deviceid = record.DeviceId
    // UPDATED: Use display_station_name (record.station) first, as expected by iPLAS API
    const station = record.station || record.TSP

    await downloadAttachments(isnProjectInfo.value.site, isnProjectInfo.value.project, [{ isn, time, deviceid, station }])

    // Format time for CSV log download (needs .000 milliseconds)
    const testEndTime = record['Test end Time'] || ''
    const formattedEndTime = testEndTime.replace(/-/g, '/').replace('T', ' ')
    const apiEndTime = formattedEndTime.includes('.') ? formattedEndTime : `${formattedEndTime}.000`

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
        // UPDATED: Time is already in local time format from transformIsnRecordToCsvData
        const time = (record['Test end Time'] || '').replace('T', ' ').replace(/-/g, '/').split('.')[0] || ''
        const deviceid = record.DeviceId
        // UPDATED: Use display_station_name (record.station) first, as expected by iPLAS API
        const station = record.station || record.TSP
        return { isn, time, deviceid, station }
    })

    await downloadAttachments(isnProjectInfo.value.site, isnProjectInfo.value.project, attachments)

    const csvLogInfos: IplasDownloadCsvLogInfo[] = payload.records.map(record => {
        const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
        const deviceid = record.DeviceId
        // UPDATED: Use display_station_name (record.station) first
        const station = record.station || record.TSP
        const testEndTime = record['Test end Time'] || ''
        const formattedEndTime = testEndTime.replace(/-/g, '/').replace('T', ' ')
        const apiEndTime = formattedEndTime.includes('.') ? formattedEndTime : `${formattedEndTime}.000`

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

// ============================================================================
// Export Handlers
// ============================================================================
async function handleExportRecords(payload: { records: CsvTestItemData[]; stationName: string }): Promise<void> {
    if (payload.records.length === 0) return

    // Transform CsvTestItemData to ExportRecord format
    const exportRecords: ExportRecord[] = payload.records.map(record => {
        const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
        const station = record.TSP || record.station

        // Map test items from the TestItem array
        const testItems: ExportTestItem[] = (record.TestItem || []).map(item => ({
            NAME: item.NAME,
            STATUS: item.STATUS || '',
            VALUE: item.VALUE || '',
            UCL: item.UCL || '',
            LCL: item.LCL || ''
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
            TestItems: testItems
        }
    })

    try {
        const response = await iplasProxyApi.exportTestItems({
            records: exportRecords,
            format: 'xlsx', // Default to XLSX for multi-sheet support
            filename_prefix: generateExportFilename()
        })

        iplasProxyApi.downloadExportFile(response)
    } catch (err) {
        console.error('Export failed:', err)
    }
}

// Handle export ALL records to XLSX (all stations)
async function handleExportAllRecords(payload: { records: CsvTestItemData[]; filenamePrefix: string }): Promise<void> {
    if (payload.records.length === 0) return

    exportingAll.value = true
    try {
        // Transform CsvTestItemData to ExportRecord format
        const exportRecords: ExportRecord[] = payload.records.map(record => {
            const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
            const station = record.TSP || record.station

            // Map test items from the TestItem array
            const testItems: ExportTestItem[] = (record.TestItem || []).map(item => ({
                NAME: item.NAME,
                STATUS: item.STATUS || '',
                VALUE: item.VALUE || '',
                UCL: item.UCL || '',
                LCL: item.LCL || ''
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
                TestItems: testItems
            }
        })

        const response = await iplasProxyApi.exportTestItems({
            records: exportRecords,
            format: 'xlsx', // XLSX for multi-sheet support (each station is a sheet)
            filename_prefix: generateExportFilename()
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