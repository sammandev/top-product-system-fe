<template>
    <div>
        <!-- Step 1: ISN Input Card -->
        <v-card elevation="2" class="mb-4">
            <v-card-title class="d-flex align-center bg-primary">
                <v-icon class="mr-2">mdi-barcode-scan</v-icon>
                ISN Search 2 - Custom Scoring
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
                            hint="Enter ISN to search and configure stations" persistent-hint
                            @keyup.enter="handleSearch" />
                    </v-col>
                    <v-col cols="12" md="2" class="d-flex align-center">
                        <v-btn color="primary" size="large" :loading="loadingIsnSearch" :disabled="!searchIsn?.trim()"
                            prepend-icon="mdi-magnify" block class="mb-5" @click="handleSearch">
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
                                <v-btn color="primary" variant="flat" size="small" :loading="loadingIsnSearch"
                                    :disabled="!selectedISNs || selectedISNs.length === 0" prepend-icon="mdi-magnify"
                                    @click="handleSearch">
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
                                <v-btn color="primary" variant="flat" size="small" :loading="loadingIsnSearch"
                                    :disabled="!searchIsn?.trim()" prepend-icon="mdi-magnify" @click="handleSearch">
                                    Search
                                </v-btn>
                            </template>
                        </v-textarea>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- Error Alert -->
        <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
            {{ error }}
        </v-alert>

        <!-- Step 2: Discovered Stations Configuration -->
        <v-card v-if="discoveredStations.length > 0" elevation="2" class="mb-4">
            <v-card-title class="bg-secondary d-flex justify-space-between align-center">
                <div>
                    <v-icon icon="mdi-router-wireless" class="mr-2" />
                    Discovered Stations
                    <v-chip size="small" color="white" variant="outlined" class="ml-2">
                        {{ discoveredStations.length }} station(s)
                    </v-chip>
                    <v-chip size="small" color="info" variant="outlined" class="ml-2">
                        {{ totalRecordCount }} record(s)
                    </v-chip>
                </div>
                <div class="d-flex align-center gap-2">
                    <v-btn size="small" color="white" variant="outlined" prepend-icon="mdi-cog"
                        :disabled="configuredStationsCount === 0" @click="showConfigSummary = true">
                        View Config ({{ configuredStationsCount }})
                    </v-btn>
                    <v-btn size="small" color="success" variant="flat" prepend-icon="mdi-calculator"
                        :loading="calculatingScores"
                        :disabled="configuredStationsCount === 0 || isnRecords.length === 0"
                        @click="handleCalculateScores">
                        Calculate Scores
                    </v-btn>
                </div>
            </v-card-title>
            <v-card-text class="pa-0">
                <!-- Station Tabs -->
                <v-tabs v-model="activeStationTab" color="primary" show-arrows>
                    <v-tab v-for="(station, index) in discoveredStations" :key="station.stationName" :value="index">
                        <v-icon start :color="stationConfigs[station.displayName] ? 'success' : 'grey'">
                            {{ stationConfigs[station.displayName] ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                        </v-icon>
                        {{ station.displayName }}
                        <v-badge :content="station.recordCount" color="info" inline class="ml-1" />
                    </v-tab>
                </v-tabs>

                <v-divider />

                <!-- Station Content -->
                <v-window v-model="activeStationTab">
                    <v-window-item v-for="(station, index) in discoveredStations" :key="station.stationName"
                        :value="index" eager>
                        <v-card flat class="pa-4">
                            <v-row>
                                <v-col cols="12" md="6">
                                    <div class="text-subtitle-2 mb-2">Station Info</div>
                                    <v-chip label class="mr-2 mb-2">
                                        <v-icon start>mdi-router-wireless</v-icon>
                                        {{ station.stationName }}
                                    </v-chip>
                                    <v-chip label class="mr-2 mb-2" color="info">
                                        <v-icon start>mdi-database</v-icon>
                                        {{ station.recordCount }} records
                                    </v-chip>
                                    <v-chip label class="mb-2" color="success">
                                        <v-icon start>mdi-barcode-scan</v-icon>
                                        {{ station.isnCount }} ISNs
                                    </v-chip>
                                </v-col>
                                <v-col cols="12" md="6" class="d-flex align-center justify-end">
                                    <v-btn v-if="!stationConfigs[station.displayName]" color="primary" variant="flat"
                                        prepend-icon="mdi-cog" @click="openStationConfig(station)">
                                        Configure Scoring
                                    </v-btn>
                                    <div v-else class="d-flex align-center gap-2">
                                        <v-chip color="success" variant="flat">
                                            <v-icon start>mdi-check</v-icon>
                                            {{ stationConfigs[station.displayName]?.selectedTestItems?.length || 0 }}
                                            items
                                        </v-chip>
                                        <v-btn color="secondary" variant="tonal" size="small" prepend-icon="mdi-pencil"
                                            @click="openStationConfig(station)">
                                            Edit
                                        </v-btn>
                                        <v-btn color="error" variant="text" size="small" icon="mdi-delete"
                                            @click="removeStationConfig(station.displayName)" />
                                    </div>
                                </v-col>
                            </v-row>

                            <!-- Device IDs in this station -->
                            <div class="mt-4">
                                <div class="text-subtitle-2 mb-2">
                                    Device IDs
                                    <v-chip size="x-small" class="ml-2">{{ station.deviceIds.length }}</v-chip>
                                </div>
                                <v-chip-group>
                                    <v-chip v-for="deviceId in station.deviceIds.slice(0, 10)" :key="deviceId"
                                        size="small" variant="outlined">
                                        {{ deviceId }}
                                    </v-chip>
                                    <v-chip v-if="station.deviceIds.length > 10" size="small" color="info">
                                        +{{ station.deviceIds.length - 10 }} more
                                    </v-chip>
                                </v-chip-group>
                            </div>
                        </v-card>
                    </v-window-item>
                </v-window>
            </v-card-text>
        </v-card>

        <!-- Step 3: Results with Ranking -->
        <TopProductIplasIsnRanking v-if="isnRecords.length > 0 && Object.keys(recordScores).length > 0"
            :isn-groups="isnGroups" :scores="recordScores" :calculating-scores="calculatingScores"
            @row-click="handleRowClick" @download-selected="handleDownloadSelected" />

        <!-- Alternative: Simple Results Table when no scores -->
        <v-card v-else-if="isnRecords.length > 0" elevation="2" class="mb-4">
            <v-card-title class="bg-grey-lighten-4 d-flex justify-space-between align-center">
                <div>
                    <v-icon icon="mdi-format-list-bulleted" class="mr-2" />
                    Search Results
                    <v-chip size="small" class="ml-2" color="info">{{ isnRecords.length }} records</v-chip>
                </div>
                <v-btn v-if="configuredStationsCount > 0" color="primary" variant="flat" size="small"
                    prepend-icon="mdi-calculator" :loading="calculatingScores" @click="handleCalculateScores">
                    Calculate Scores
                </v-btn>
            </v-card-title>
            <v-card-text>
                <v-alert type="info" variant="tonal" class="mb-4">
                    <v-icon start>mdi-information</v-icon>
                    Configure stations above to enable custom scoring. Click "Calculate Scores" after configuration.
                </v-alert>

                <!-- Group by Station -->
                <v-expansion-panels v-model="expandedResultPanels">
                    <v-expansion-panel v-for="station in discoveredStations" :key="station.stationName">
                        <v-expansion-panel-title>
                            <div class="d-flex align-center">
                                <v-icon class="mr-2" :color="stationConfigs[station.displayName] ? 'success' : 'grey'">
                                    {{ stationConfigs[station.displayName] ? 'mdi-check-circle' : 'mdi-circle-outline'
                                    }}
                                </v-icon>
                                <span class="font-weight-medium">{{ station.displayName }}</span>
                                <v-chip size="small" class="ml-2">{{ station.recordCount }} records</v-chip>
                            </div>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                            <v-data-table :headers="recordHeaders" :items="getStationRecords(station.stationName)"
                                :items-per-page="10" density="compact" class="elevation-1">
                                <template #item.test_status="{ item }">
                                    <v-chip :color="getStatusColor(item.test_status)" size="x-small">
                                        {{ normalizeStatus(item.test_status) }}
                                    </v-chip>
                                </template>
                                <template #item.test_end_time="{ item }">
                                    {{ formatTime(item.test_end_time) }}
                                </template>
                                <template #item.actions="{ item }">
                                    <v-btn icon="mdi-eye" size="x-small" variant="text" @click="handleRowClick(item)" />
                                </template>
                            </v-data-table>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>
            </v-card-text>
        </v-card>

        <!-- Station Config Dialog -->
        <StationConfigDialog v-model:show="showStationConfigDialog" :station="selectedStationForConfig"
            :site="currentSite" :project="currentProject" :start-time="''" :end-time="''"
            :existing-config="currentStationConfig" :available-device-ids="currentStationDeviceIds"
            :loading-devices="false" :device-error="null" :available-test-items="currentStationTestItems"
            :loading-test-items="loadingCurrentStationTestItems" :test-items-error="testItemsError"
            @save="handleStationConfigSave" @remove="handleStationConfigRemove"
            @refresh-test-items="refreshCurrentStationTestItems" />

        <!-- Config Summary Dialog -->
        <v-dialog v-model="showConfigSummary" max-width="800">
            <v-card>
                <v-card-title class="bg-primary">
                    <v-icon class="mr-2">mdi-cog</v-icon>
                    Scoring Configuration Summary
                </v-card-title>
                <v-card-text class="pa-4">
                    <v-expansion-panels v-if="configuredStationsCount > 0">
                        <v-expansion-panel v-for="(config, displayName) in stationConfigs" :key="displayName">
                            <v-expansion-panel-title>
                                <div class="d-flex align-center">
                                    <v-icon class="mr-2" color="success">mdi-check-circle</v-icon>
                                    {{ displayName }}
                                    <v-chip size="small" class="ml-2">
                                        {{ config.selectedTestItems?.length || 0 }} test items
                                    </v-chip>
                                </div>
                            </v-expansion-panel-title>
                            <v-expansion-panel-text>
                                <v-list density="compact">
                                    <v-list-item v-for="item in config.selectedTestItems || []" :key="item">
                                        <v-list-item-title>{{ item }}</v-list-item-title>
                                        <template #append>
                                            <v-chip size="x-small" color="info" class="mr-1">
                                                {{
                                                    config.scoringConfigs?.[item]?.type || 'Symmetrical'
                                                }}
                                            </v-chip>
                                            <v-chip v-if="config.scoringConfigs?.[item]?.weight !== 1" size="x-small"
                                                color="warning">
                                                Weight: {{ config.scoringConfigs?.[item]?.weight || 1 }}
                                            </v-chip>
                                        </template>
                                    </v-list-item>
                                </v-list>
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                    </v-expansion-panels>
                    <v-alert v-else type="info">No stations configured yet.</v-alert>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn color="primary" @click="showConfigSummary = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Details Dialog -->
        <TopProductIplasDetailsDialog v-model="showDetailsDialog" :record="detailsRecord"
            :downloading="detailsDownloading" @download="handleDownloadFromDetails" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIplasApi, type IsnSearchData } from '@/features/dut_logs/composables/useIplasApi'
import StationConfigDialog, { type TestItemInfo } from './StationConfigDialog.vue'
import TopProductIplasIsnRanking from './TopProductIplasIsnRanking.vue'
import TopProductIplasDetailsDialog from './TopProductIplasDetailsDialog.vue'
import type { StationConfig as ImportedStationConfig } from './StationSelectionDialog.vue'
import type { NormalizedRecord } from './IplasTestItemsFullscreenDialog.vue'
import type { IsnSearchTestItem } from '@/features/dut_logs/api/iplasApi'
import type { Station } from '@/features/dut_logs/composables/useIplasApi'
import {
    adjustIplasDisplayTime,
    getStatusColor,
    normalizeStatus,
    isStatusPass,
    isStatusFail
} from '@/shared/utils/helpers'

// Interfaces
interface TestItemScoringConfig {
    type: 'Symmetrical' | 'Asymmetrical' | 'Throughput' | 'EVM'
    weight: number
    target?: number
}

interface StationConfig extends ImportedStationConfig {
    scoringConfigs?: Record<string, TestItemScoringConfig>
}

interface DiscoveredStation {
    stationName: string
    displayName: string
    site: string
    project: string
    recordCount: number
    isnCount: number
    deviceIds: string[]
    records: IsnSearchData[]
}

// API composable
const {
    loadingIsnSearch,
    error,
    searchByIsn,
    downloadAttachments
} = useIplasApi()

// Scoring composable (currently unused - using custom scoring logic below)
// const { initializeConfigs, calculateScores, scoredRecords, updateConfig: updateScoringConfig, setScoringType } = useScoring()

// Input state
const inputMode = ref<'single' | 'multiple' | 'bulk'>('single')
const searchIsn = ref('')
const selectedISNs = ref<string[]>([])

// Search results state
const isnRecords = ref<IsnSearchData[]>([])
const discoveredStations = ref<DiscoveredStation[]>([])
const activeStationTab = ref(0)
const expandedResultPanels = ref<number[]>([])

// Station configuration state
const stationConfigs = ref<Record<string, StationConfig>>({})
const showStationConfigDialog = ref(false)
const selectedStationForConfig = ref<Station | null>(null)
const currentStationDeviceIds = ref<string[]>([])
const currentStationTestItems = ref<TestItemInfo[]>([])
const loadingCurrentStationTestItems = ref(false)
const testItemsError = ref<string | null>(null)

// Scoring state
const recordScores = ref<Record<string, number>>({})
const calculatingScores = ref(false)

// Dialog state
const showConfigSummary = ref(false)
const showDetailsDialog = ref(false)
const detailsRecord = ref<NormalizedRecord | null>(null)
const detailsDownloading = ref(false)
const detailsScoringConfigs = ref<Record<string, TestItemScoringConfig>>({})
const detailsScores = ref<Record<string, number>>({})

// Computed
const currentSite = computed(() => {
    return discoveredStations.value[0]?.site || ''
})

const isnGroups = computed(() => {
    // Group records by ISN
    const groups = new Map<string, IsnSearchData[]>()

    for (const record of isnRecords.value) {
        if (!groups.has(record.isn)) {
            groups.set(record.isn, [])
        }
        groups.get(record.isn)!.push(record)
    }

    return Array.from(groups.entries()).map(([isn, records]) => {
        const hasError = records.some(r => isStatusFail(r.test_status))
        const errorCount = records.filter(r => isStatusFail(r.test_status)).length
        const uniqueStations = new Set(records.map(r => r.display_station_name || r.station_name))

        // Transform station names into StationGroup objects
        const stationGroups = Array.from(uniqueStations).map(stationName => {
            const stationRecords = records.filter(r => (r.display_station_name || r.station_name) === stationName)
            const stationHasError = stationRecords.some(r => isStatusFail(r.test_status))
            const stationErrorCount = stationRecords.filter(r => isStatusFail(r.test_status)).length

            return {
                stationName,
                displayName: stationName,
                records: stationRecords,
                hasError: stationHasError,
                errorCount: stationErrorCount,
                recordCount: stationRecords.length
            }
        })

        return {
            isn,
            records,
            site: records[0]?.site || '',
            project: records[0]?.project || '',
            hasError,
            errorCount,
            stations: stationGroups
        }
    })
})

const currentProject = computed(() => {
    return discoveredStations.value[0]?.project || ''
})

const totalRecordCount = computed(() => {
    return isnRecords.value.length
})

const configuredStationsCount = computed(() => {
    return Object.keys(stationConfigs.value).length
})

const currentStationConfig = computed(() => {
    if (!selectedStationForConfig.value) return undefined
    return stationConfigs.value[selectedStationForConfig.value.display_station_name]
})

// Table headers
const recordHeaders = [
    { title: 'ISN', key: 'isn', sortable: true },
    { title: 'Device ID', key: 'device_id', sortable: true },
    { title: 'Status', key: 'test_status', sortable: true },
    { title: 'Error Code', key: 'error_code', sortable: true },
    { title: 'Test End Time', key: 'test_end_time', sortable: true },
    { title: 'Actions', key: 'actions', sortable: false }
]

// Search handler
async function handleSearch(): Promise<void> {
    // Determine ISN list based on input mode
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

    // Clear previous state
    isnRecords.value = []
    discoveredStations.value = []
    stationConfigs.value = {}
    recordScores.value = {}
    activeStationTab.value = 0

    try {
        const allRecords: IsnSearchData[] = []

        for (const isn of isnList) {
            try {
                const data = await searchByIsn(isn)
                // The searchByIsn function already returns data matching IsnSearchData interface
                // (lowercase field names from backend: isn, device_id, site, project, etc.)
                allRecords.push(...data)
            } catch (err) {
                console.warn(`Failed to fetch records for ISN ${isn}:`, err)
            }
        }

        isnRecords.value = allRecords

        // Group by station
        discoveredStations.value = groupRecordsByStation(allRecords)

        // Initialize expanded panels
        if (discoveredStations.value.length > 0) {
            expandedResultPanels.value = [0]
        }
    } catch (err) {
        console.error('Search failed:', err)
        error.value = err instanceof Error ? err.message : 'Search failed'
    }
}

// Group records by station
function groupRecordsByStation(records: IsnSearchData[]): DiscoveredStation[] {
    const stationMap = new Map<string, DiscoveredStation>()

    for (const record of records) {
        const key = record.station_name || record.display_station_name
        if (!stationMap.has(key)) {
            stationMap.set(key, {
                stationName: record.station_name,
                displayName: record.display_station_name || record.station_name,
                site: record.site,
                project: record.project,
                recordCount: 0,
                isnCount: 0,
                deviceIds: [],
                records: []
            })
        }

        const station = stationMap.get(key)!
        station.records.push(record)
        station.recordCount++

        if (!station.deviceIds.includes(record.device_id)) {
            station.deviceIds.push(record.device_id)
        }
    }

    // Calculate unique ISN count per station
    for (const station of stationMap.values()) {
        const uniqueIsns = new Set(station.records.map(r => r.isn))
        station.isnCount = uniqueIsns.size
    }

    return Array.from(stationMap.values()).sort((a, b) => b.recordCount - a.recordCount)
}

// Get records for a specific station
function getStationRecords(stationName: string): IsnSearchData[] {
    return isnRecords.value.filter(r => r.station_name === stationName || r.display_station_name === stationName)
}

// Open station config dialog
function openStationConfig(discoveredStation: DiscoveredStation): void {
    // Create a mock Station object for the dialog
    const mockStation: Station = {
        station_name: discoveredStation.stationName,
        display_station_name: discoveredStation.displayName,
        order: 0,
        data_source: 'ISN Search'
    }

    selectedStationForConfig.value = mockStation
    currentStationDeviceIds.value = discoveredStation.deviceIds

    // Extract test items from records
    extractTestItemsFromRecords(discoveredStation.records)

    showStationConfigDialog.value = true
}

// Extract test items from ISN search records
function extractTestItemsFromRecords(records: IsnSearchData[]): void {
    loadingCurrentStationTestItems.value = true
    testItemsError.value = null

    try {
        const testItemsMap = new Map<string, TestItemInfo>()

        for (const record of records) {
            if (!record.test_item) continue

            for (const item of record.test_item) {
                const name = item.NAME
                if (!name || testItemsMap.has(name)) continue

                // Determine item type
                const value = (item.VALUE || '').toUpperCase().trim()
                let isValue = false
                let isBin = false
                let hasUcl = false
                let hasLcl = false

                // Check for bin data
                if (value === 'PASS' || value === 'FAIL' || value === '1' || value === '0' || value === '-999') {
                    isBin = true
                } else if (value !== '') {
                    // Try to parse as numeric
                    const numVal = parseFloat(value)
                    if (!isNaN(numVal)) {
                        isValue = true
                    }
                }

                // Check for UCL/LCL
                const uclStr = (item.UCL || '').trim()
                const lclStr = (item.LCL || '').trim()
                if (uclStr && !isNaN(parseFloat(uclStr))) hasUcl = true
                if (lclStr && !isNaN(parseFloat(lclStr))) hasLcl = true

                testItemsMap.set(name, {
                    name,
                    isValue,
                    isBin,
                    hasUcl,
                    hasLcl
                })
            }
        }

        currentStationTestItems.value = Array.from(testItemsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    } catch (err) {
        console.error('Failed to extract test items:', err)
        testItemsError.value = 'Failed to extract test items from records'
    } finally {
        loadingCurrentStationTestItems.value = false
    }
}

// Refresh test items (for dialog compatibility)
function refreshCurrentStationTestItems(): void {
    const activeStation = discoveredStations.value[activeStationTab.value]
    if (activeStation) {
        extractTestItemsFromRecords(activeStation.records)
    }
}

// Handle station config save
function handleStationConfigSave(config: StationConfig): void {
    if (!selectedStationForConfig.value) return

    const displayName = selectedStationForConfig.value.display_station_name
    stationConfigs.value[displayName] = config
    showStationConfigDialog.value = false
}

// Handle station config remove
function handleStationConfigRemove(): void {
    if (!selectedStationForConfig.value) return

    const displayName = selectedStationForConfig.value.display_station_name
    delete stationConfigs.value[displayName]
    showStationConfigDialog.value = false
}

// Remove station config
function removeStationConfig(displayName: string): void {
    delete stationConfigs.value[displayName]
}

// Calculate scores
async function handleCalculateScores(): Promise<void> {
    if (configuredStationsCount.value === 0 || isnRecords.value.length === 0) return

    calculatingScores.value = true
    recordScores.value = {}

    try {
        // Build scoring configs from all configured stations
        const allConfigs: Record<string, TestItemScoringConfig> = {}

        for (const config of Object.values(stationConfigs.value)) {
            if (config.scoringConfigs) {
                Object.assign(allConfigs, config.scoringConfigs)
            }
        }

        // Convert records to normalized format for scoring
        for (const record of isnRecords.value) {
            const displayName = record.display_station_name || record.station_name
            const stationConfig = stationConfigs.value[displayName]
            if (!stationConfig) continue

            // Calculate score for this record
            const score = calculateRecordScore(record, stationConfig)
            const recordKey = `${record.isn}-${record.device_id}-${record.test_end_time}`
            recordScores.value[recordKey] = score
        }
    } catch (err) {
        console.error('Failed to calculate scores:', err)
        error.value = err instanceof Error ? err.message : 'Failed to calculate scores'
    } finally {
        calculatingScores.value = false
    }
}

// Calculate score for a single record
function calculateRecordScore(record: IsnSearchData, config: StationConfig): number {
    if (!config.selectedTestItems || config.selectedTestItems.length === 0) {
        return 0
    }

    let totalWeightedScore = 0
    let totalWeight = 0

    for (const testItemName of config.selectedTestItems) {
        const testItem = record.test_item?.find(ti => ti.NAME === testItemName)
        if (!testItem) continue

        const scoringConfig = config.scoringConfigs?.[testItemName]
        const weight = scoringConfig?.weight || 1

        // Calculate individual test item score
        const itemScore = calculateTestItemScore(testItem, scoringConfig)
        totalWeightedScore += itemScore * weight
        totalWeight += weight
    }

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0
}

// Calculate score for a single test item
function calculateTestItemScore(testItem: IsnSearchTestItem, config?: TestItemScoringConfig): number {
    const value = parseFloat(testItem.VALUE)
    if (isNaN(value)) return 0

    const ucl = parseFloat(testItem.UCL || '')
    const lcl = parseFloat(testItem.LCL || '')

    // Default to symmetrical scoring
    const scoringType = config?.type || 'Symmetrical'
    const target = config?.target

    if (isNaN(ucl) && isNaN(lcl)) {
        // No limits, return 1 if pass
        return isStatusPass(testItem.STATUS) ? 1 : 0
    }

    const hasUcl = !isNaN(ucl)
    const hasLcl = !isNaN(lcl)

    let score = 0

    switch (scoringType) {
        case 'Symmetrical': {
            // Symmetrical scoring with midpoint as target
            if (hasUcl && hasLcl) {
                const midpoint = (ucl + lcl) / 2
                const range = (ucl - lcl) / 2
                if (range > 0) {
                    const deviation = Math.abs(value - midpoint) / range
                    score = Math.max(0, 1 - deviation)
                }
            } else if (hasUcl) {
                score = value <= ucl ? 1 : Math.max(0, 1 - (value - ucl) / ucl)
            } else if (hasLcl) {
                score = value >= lcl ? 1 : Math.max(0, 1 - (lcl - value) / Math.abs(lcl))
            }
            break
        }
        case 'Asymmetrical': {
            // Asymmetrical scoring with custom target
            const targetValue = target !== undefined ? target : (hasUcl && hasLcl ? (ucl + lcl) / 2 : value)
            if (hasUcl && hasLcl) {
                if (value >= targetValue) {
                    const range = ucl - targetValue
                    score = range > 0 ? Math.max(0, 1 - (value - targetValue) / range) : 1
                } else {
                    const range = targetValue - lcl
                    score = range > 0 ? Math.max(0, 1 - (targetValue - value) / range) : 1
                }
            }
            break
        }
        case 'Throughput': {
            // Higher is better
            const targetValue = target !== undefined ? target : (hasUcl ? ucl : value)
            if (hasLcl && value >= lcl) {
                if (targetValue > lcl) {
                    score = Math.min(1, (value - lcl) / (targetValue - lcl))
                } else {
                    score = 1
                }
            } else if (hasLcl) {
                score = 0
            } else {
                score = 1
            }
            break
        }
        case 'EVM': {
            // Lower is better (like EVM, error rates)
            if (hasUcl && value <= ucl) {
                score = hasLcl ? Math.max(0, (ucl - value) / (ucl - lcl)) : (value <= 0 ? 1 : Math.max(0, 1 - value / ucl))
            } else if (hasUcl) {
                score = 0
            }
            break
        }
        default:
            score = isStatusPass(testItem.STATUS) ? 1 : 0
    }

    return Math.max(0, Math.min(1, score))
}

// Normalize record for details dialog
function normalizeRecord(record: IsnSearchData): NormalizedRecord {
    return {
        site: record.site,
        project: record.project,
        stationName: record.station_name,
        displayStationName: record.display_station_name,
        tsp: record.display_station_name,
        isn: record.isn,
        deviceId: record.device_id,
        testStatus: record.test_status,
        errorCode: record.error_code,
        errorName: record.error_name || '',
        testStartTime: record.test_start_time,
        testEndTime: record.test_end_time,
        line: record.line,
        testItems: record.test_item?.map(ti => ({
            NAME: ti.NAME,
            STATUS: ti.STATUS,
            VALUE: ti.VALUE,
            UCL: ti.UCL || '',
            LCL: ti.LCL || '',
            CYCLE: ti.CYCLE || ''
        })) || []
    }
}

// Handle row click
function handleRowClick(record: IsnSearchData): void {
    detailsRecord.value = normalizeRecord(record)

    // Get scoring configs for this station
    const displayName = record.display_station_name || record.station_name
    const stationConfig = stationConfigs.value[displayName]
    detailsScoringConfigs.value = stationConfig?.scoringConfigs || {}

    // Get scores for test items if calculated
    detailsScores.value = {}
    if (record.test_item && stationConfig) {
        for (const item of record.test_item) {
            if (stationConfig.selectedTestItems?.includes(item.NAME)) {
                const scoringConfig = stationConfig.scoringConfigs?.[item.NAME]
                detailsScores.value[item.NAME] = calculateTestItemScore(item, scoringConfig)
            }
        }
    }

    showDetailsDialog.value = true
}

// Handle download selected records
async function handleDownloadSelected(records: IsnSearchData[]): Promise<void> {
    if (records.length === 0) return

    try {
        const firstRecord = records[0]
        if (!firstRecord) return

        const site = firstRecord.site
        const project = firstRecord.project

        await downloadAttachments(
            site,
            project,
            records.map(r => ({
                isn: r.isn,
                time: r.test_end_time,
                deviceid: r.device_id,
                station: r.station_name
            }))
        )
    } catch (err) {
        console.error('Download failed:', err)
        error.value = err instanceof Error ? err.message : 'Download failed'
    }
}

// Handle download
async function handleDownloadRecord(record: NormalizedRecord): Promise<void> {
    // Find original record
    const originalRecord = isnRecords.value.find(r =>
        r.isn === record.isn &&
        r.device_id === record.deviceId &&
        (r.test_end_time === record.testEndTime || r.display_station_name === record.tsp)
    )

    if (!originalRecord) {
        error.value = 'Could not find record for download'
        return
    }

    await handleDownloadSelected([originalRecord])
}

// Handle download from details dialog
async function handleDownloadFromDetails(): Promise<void> {
    if (!detailsRecord.value) return
    detailsDownloading.value = true
    try {
        await handleDownloadRecord(detailsRecord.value)
    } finally {
        detailsDownloading.value = false
    }
}

// Format time
function formatTime(timeStr: string): string {
    if (!timeStr) return '-'
    return adjustIplasDisplayTime(timeStr, 1)
}
</script>

<style scoped>
.v-expansion-panel-title {
    min-height: 48px;
}
</style>
