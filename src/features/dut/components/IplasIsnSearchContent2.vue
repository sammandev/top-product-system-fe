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
                        <v-btn color="secondary" size="large" :loading="loadingStationLookup" :disabled="!searchIsn?.trim()"
                            prepend-icon="mdi-magnify" block class="mb-5" @click="handleLookupStations">
                            Lookup Stations
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
                                    Lookup Stations
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
                                    :disabled="!searchIsn?.trim()" prepend-icon="mdi-magnify" @click="handleLookupStations">
                                    Lookup Stations
                                </v-btn>
                            </template>
                        </v-textarea>
                    </v-col>
                </v-row>

                <!-- UPDATED: ISN Lookup Results - Site/Project Info -->
                <v-card v-if="isnProjectInfo" variant="outlined" class="mt-4 bg-grey-lighten-5">
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

                <!-- UPDATED: Date Range Configuration (shown after ISN lookup) -->
                <v-row v-if="isnProjectInfo" dense class="mt-4">
                    <v-col cols="12" md="4">
                        <v-select v-model="dateRangePreset" :items="dateRangePresets" item-value="value"
                            label="Date Range Preset" variant="outlined" density="comfortable"
                            prepend-inner-icon="mdi-calendar-clock" @update:model-value="applyDateRangePreset" />
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
                    <v-card-title class="text-subtitle-1 bg-grey-lighten-5">
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
        <StationSelectionDialog v-model:show="showStationSelectionDialog" :stations="availableStations"
            :station-configs="stationConfigs" :loading="loadingStations" @station-click="handleStationClick"
            @confirm="handleStationSelectionConfirm" />

        <!-- Station Config Dialog -->
        <StationConfigDialog v-model:show="showStationConfigDialog" :station="selectedStationForConfig"
            :site="isnProjectInfo?.site || ''" :project="isnProjectInfo?.project || ''" :start-time="startTime"
            :end-time="endTime" :existing-config="currentStationConfig"
            :available-device-ids="currentStationDeviceIds" :loading-devices="loadingCurrentStationDevices"
            :device-error="deviceError" :available-test-items="currentStationTestItems"
            :loading-test-items="loadingCurrentStationTestItems" :test-items-error="testItemsError"
            @save="handleStationConfigSave" @remove="handleStationConfigRemove"
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
import { useIplasSettings } from '@/features/dut_logs/composables/useIplasSettings'
import { iplasProxyApi, type IplasIsnProjectInfo, type IplasStation } from '@/features/dut_logs/api/iplasProxyApi'
import StationSelectionDialog, { type StationConfig } from './StationSelectionDialog.vue'
import StationConfigDialog, { type TestItemInfo } from './StationConfigDialog.vue'
import TopProductIplasRanking from './TopProductIplasRanking.vue'
import TopProductIplasDetailsDialog from './TopProductIplasDetailsDialog.vue'
import type { NormalizedRecord, NormalizedTestItem } from './IplasTestItemsFullscreenDialog.vue'
import type { DownloadCsvLogInfo } from '@/features/dut_logs/api/iplasProxyApi'
import { getScoreColor } from '../types/scoring.types'

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
// State: Date Range
// ============================================================================
const dateRangePreset = ref<string>('current_shift')
const dateRangePresets = [
    { title: 'Current Shift', value: 'current_shift' },
    { title: 'Today', value: 'today' },
    { title: 'Yesterday', value: 'yesterday' },
    { title: 'Last 7 Days', value: 'last_7_days' },
    { title: 'Last 30 Days', value: 'last_30_days' }
]
const startTime = ref('')
const endTime = ref('')

// ============================================================================
// State: Data Fetching & Results
// ============================================================================
const {
    loading,
    loadingTestItems,
    error,
    testItemData,
    fetchDeviceIds,
    fetchTestItems: fetchTestItemsApi,
    fetchTestItemNamesCached,
    fetchTestItemsFiltered,
    downloadAttachments,
    downloadCsvLogs,
    clearTestItemData
} = useIplasApi()

// ============================================================================
// State: Scoring
// ============================================================================
const {
    initializeConfigs,
    calculateScores,
    scoredRecords,
    scoringError,
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
    return isnProjectInfo.value && configuredStationsCount.value > 0 && startTime.value && endTime.value
})

// ============================================================================
// Date Range Functions
// ============================================================================
function applyDateRangePreset(): void {
    const now = new Date()
    let start = new Date()
    let end = new Date()

    switch (dateRangePreset.value) {
        case 'current_shift':
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
    clearTestItemData()
    recordScores.value = {}

    loadingStationLookup.value = true
    error.value = null

    try {
        if (isnList.length === 1) {
            // Single ISN lookup
            const response = await iplasProxyApi.getStationsFromIsn({ isn: isnList[0]! })
            if (!response.isn_info.found) {
                error.value = `ISN "${isnList[0]}" not found in iPLAS database`
                return
            }
            isnProjectInfo.value = response.isn_info
            // Convert IplasStation to Station type
            availableStations.value = response.stations.map((s: IplasStation): Station => ({
                station_name: s.station_name,
                display_station_name: s.display_station_name,
                order: s.order,
                data_source: s.data_source || ''
            }))
        } else {
            // Batch ISN lookup
            const response = await iplasProxyApi.getStationsFromIsnBatch({ isns: isnList.slice(0, 50) })
            if (response.results.length === 0) {
                error.value = 'No ISNs found in iPLAS database'
                return
            }
            // Use first found ISN's info
            const firstFound = response.results.find(r => r.isn_info.found)
            if (!firstFound) {
                error.value = 'No ISNs found in iPLAS database'
                return
            }
            isnProjectInfo.value = firstFound.isn_info
            availableStations.value = firstFound.stations.map((s: IplasStation): Station => ({
                station_name: s.station_name,
                display_station_name: s.display_station_name,
                order: s.order,
                data_source: s.data_source || ''
            }))
        }

        // Apply default date range
        applyDateRangePreset()
    } catch (err) {
        console.error('Station lookup failed:', err)
        error.value = err instanceof Error ? err.message : 'Failed to lookup stations'
    } finally {
        loadingStationLookup.value = false
    }
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
    // Load device IDs first, then test items
    loadDeviceIdsForStation(station).then(() => {
        loadTestItemsForStation(station)
    })
}

async function loadDeviceIdsForStation(station: Station): Promise<void> {
    if (!isnProjectInfo.value || !startTime.value || !endTime.value) return

    loadingCurrentStationDevices.value = true
    deviceError.value = null
    currentStationDeviceIds.value = []

    try {
        const start = new Date(startTime.value).toISOString()
        const end = new Date(endTime.value).toISOString()
        const deviceIds = await fetchDeviceIds(
            isnProjectInfo.value.site,
            isnProjectInfo.value.project,
            station.display_station_name,
            start,
            end
        )
        currentStationDeviceIds.value = deviceIds
    } catch (err: any) {
        deviceError.value = err.message || 'Failed to load device IDs'
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
// Data Fetching (like Station Search)
// ============================================================================
async function fetchTestItems(): Promise<void> {
    if (!isnProjectInfo.value || configuredStationsCount.value === 0) return

    clearTestItemData()
    recordScores.value = {}

    // Iterate through each configured station
    for (const config of Object.values(stationConfigs.value)) {
        let deviceIds = config.deviceIds

        // When user leaves device ID empty, fetch all available device IDs
        if (deviceIds.length === 0) {
            try {
                deviceIds = await fetchDeviceIds(
                    isnProjectInfo.value.site,
                    isnProjectInfo.value.project,
                    config.displayName,
                    new Date(startTime.value),
                    new Date(endTime.value)
                )
            } catch (err) {
                console.warn(`Failed to fetch device IDs for ${config.displayName}, falling back to ALL`)
                deviceIds = ['ALL']
            }
        }

        const hasTestItemFilters = config.selectedTestItems && config.selectedTestItems.length > 0

        // Fetch data for each device ID
        for (const deviceId of deviceIds) {
            if (hasTestItemFilters) {
                await fetchTestItemsFiltered(
                    isnProjectInfo.value.site,
                    isnProjectInfo.value.project,
                    config.displayName,
                    deviceId,
                    new Date(startTime.value),
                    new Date(endTime.value),
                    config.testStatus,
                    config.selectedTestItems
                )
            } else {
                await fetchTestItemsApi(
                    isnProjectInfo.value.site,
                    isnProjectInfo.value.project,
                    config.displayName,
                    deviceId,
                    new Date(startTime.value),
                    new Date(endTime.value),
                    config.testStatus
                )
            }
        }
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

    const csvLogInfo: DownloadCsvLogInfo = {
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

    const csvLogInfos: DownloadCsvLogInfo[] = payload.records.map(record => {
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
    stationConfigs.value = {}
    clearTestItemData()
    recordScores.value = {}
    testItemNamesCache.value.clear()
}

onMounted(() => {
    applyDateRangePreset()
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
