<template>
    <div>
        <!-- Data Selection Card -->
        <v-card elevation="2" class="mb-4">
            <v-card-title class="d-flex align-center bg-primary">
                <v-icon class="mr-2">mdi-database-search</v-icon>
                Station Search 2 - Custom Configuration
            </v-card-title>
            <v-card-text class="pt-4">
                <!-- Site Selection -->
                <v-row dense>
                    <v-col cols="12" md="6">
                        <v-select v-model="selectedSite" :items="uniqueSites" label="Site" variant="outlined"
                            density="comfortable" prepend-inner-icon="mdi-map-marker" clearable
                            :disabled="loading || loadingStations" @update:model-value="handleSiteChange" />
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-select v-model="selectedProject" :items="projectsForSelectedSite" label="Project"
                            variant="outlined" density="comfortable" prepend-inner-icon="mdi-folder"
                            :disabled="!selectedSite || loading || loadingStations" clearable
                            @update:model-value="handleProjectChange" />
                    </v-col>
                </v-row>

                <!-- Date Range Preset -->
                <v-row dense>
                    <v-col cols="12">
                        <v-select v-model="dateRangePreset" :items="dateRangePresets" item-title="title"
                            item-value="value" label="Date Range Preset" variant="outlined" density="comfortable"
                            prepend-inner-icon="mdi-calendar-clock" @update:model-value="applyDateRangePreset" />
                    </v-col>
                </v-row>

                <!-- Date Range -->
                <v-row dense>
                    <v-col cols="12" md="6">
                        <v-text-field v-model="startTime" label="Start Time" type="datetime-local" variant="outlined"
                            density="comfortable" prepend-inner-icon="mdi-calendar-start" />
                    </v-col>
                    <v-col cols="12" md="6">
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
                            <v-chip v-if="configuredStationsCount > 0" size="small" color="success" variant="flat"
                                class="ml-2">
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
                        <v-chip v-for="(config, displayName) in stationConfigs" :key="displayName" class="ma-1"
                            color="primary" variant="tonal" closable @click="editStationConfig(displayName)"
                            @click:close="removeStationConfig(displayName)">
                            {{ displayName }}
                            <v-badge :content="config.deviceIds.length" color="success" inline class="ml-1" />
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

        <!-- Results Section with Ranking Table -->
        <TopProductIplasRanking v-if="testItemData.length > 0"
            :records="testItemData" @row-click="handleRowClick" />

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
import { ref, computed, onMounted } from 'vue'
import { useIplasApi } from '@/features/dut_logs/composables/useIplasApi'
import TopProductIplasRanking from './TopProductIplasRanking.vue'
import StationSelectionDialog from './StationSelectionDialog.vue'
import StationConfigDialog, { type TestItemInfo } from './StationConfigDialog.vue'
import type { StationConfig } from './StationSelectionDialog.vue'
import type { NormalizedRecord, NormalizedTestItem } from './IplasTestItemsFullscreenDialog.vue'
import type { Station, TestItem, CsvTestItemData } from '@/features/dut_logs/composables/useIplasApi'

// Emits
const emit = defineEmits<{
    (e: 'show-details', record: NormalizedRecord): void
}>()

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
    fetchTestItemNames,
    fetchTestItemsFiltered,
    formatDateForV1Api,
    clearTestItemData
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
    { title: 'Last 30 Days', value: 'last_30_days' }
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
    return selectedSite.value && selectedProject.value && configuredStationsCount.value > 0 && startTime.value && endTime.value
})

// Apply date range preset
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

// Normalize record for dialog
function normalizeRecord(record: CsvTestItemData): NormalizedRecord {
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
        testItems: (record.TestItem || []).map((item: TestItem): NormalizedTestItem => ({
            NAME: item.NAME,
            STATUS: item.STATUS,
            VALUE: item.VALUE,
            UCL: item.UCL,
            LCL: item.LCL,
            CYLCE: item.CYLCE || ''
        }))
    }
}

// Handle row click from ranking table
function handleRowClick(payload: { record: CsvTestItemData; stationName: string }) {
    const normalized = normalizeRecord(payload.record)
    emit('show-details', normalized)
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

async function loadTestItemsForStation(station: Station): Promise<void> {
    if (!selectedSite.value || !selectedProject.value || !startTime.value || !endTime.value) {
        return
    }

    loadingCurrentStationTestItems.value = true
    testItemsError.value = null
    currentStationTestItems.value = []

    try {
        // Use the lightweight backend proxy endpoint for test item names
        const deviceId = currentStationDeviceIds.value[0] ?? 'ALL'

        const testItems = await fetchTestItemNames(
            selectedSite.value,
            selectedProject.value,
            station.display_station_name,
            deviceId,
            new Date(startTime.value),
            new Date(endTime.value),
            'ALL'
        )

        // Convert to TestItemInfo format expected by StationConfigDialog
        currentStationTestItems.value = testItems.map(item => ({
            name: item.name,
            isValue: item.is_value
        }))
    } catch (err: any) {
        testItemsError.value = err.message || 'Failed to load test items'
    } finally {
        loadingCurrentStationTestItems.value = false
    }
}

async function refreshCurrentStationTestItems(): Promise<void> {
    if (selectedStationForConfig.value) {
        await loadTestItemsForStation(selectedStationForConfig.value)
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

function clearAllStations(): void {
    stationConfigs.value = {}
}

function editStationConfig(displayName: string): void {
    const station = stations.value.find(s => s.display_station_name === displayName)
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
}

async function fetchTestItems(): Promise<void> {
    if (!selectedSite.value || !selectedProject.value || configuredStationsCount.value === 0) {
        return
    }

    clearTestItemData()

    // Iterate through each configured station
    for (const config of Object.values(stationConfigs.value)) {
        const deviceIds = config.deviceIds.length > 0 ? config.deviceIds : ['ALL']
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
                    config.selectedTestItems
                )
            } else {
                // Use the direct API endpoint (no filtering needed)
                const begintime = formatDateForV1Api(new Date(startTime.value))
                const endtime = formatDateForV1Api(new Date(endTime.value))
                await fetchTestItemsApi(
                    selectedSite.value,
                    selectedProject.value,
                    config.displayName,
                    deviceId,
                    begintime,
                    endtime,
                    config.testStatus
                )
            }
        }
    }
}

// Initialize
onMounted(async () => {
    await fetchSiteProjects()
    applyDateRangePreset()
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
