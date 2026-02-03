<template>
    <div>
        <!-- Error Alert -->
        <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
            {{ error }}
        </v-alert>

        <!-- Combined Data Selection Card -->
        <v-card elevation="2" class="mb-4">
            <v-card-title class="d-flex align-center justify-space-between bg-primary">
                <div class="d-flex align-center">
                    <v-icon class="mr-2">mdi-filter-variant</v-icon>
                    Data Selection
                </div>
                <div class="d-flex align-center gap-2">
                    <v-btn color="white" variant="outlined" size="small" prepend-icon="mdi-cog"
                        @click="emit('show-settings')">
                        iPLAS Settings
                    </v-btn>
                    <v-btn color="white" variant="outlined" size="small" prepend-icon="mdi-refresh" :loading="loading"
                        @click="handleRefresh">
                        Refresh
                    </v-btn>
                </div>
            </v-card-title>
            <v-card-text class="pt-4">
                <v-row>
                    <!-- Site Selection -->
                    <v-col cols="12" md="3">
                        <v-autocomplete v-model="selectedSite" :items="uniqueSites" label="Site" variant="outlined"
                            density="comfortable" prepend-inner-icon="mdi-map-marker" :loading="loading" clearable
                            hide-details @update:model-value="handleSiteChange" />
                    </v-col>

                    <!-- Project Selection -->
                    <v-col cols="12" md="3">
                        <v-autocomplete v-model="selectedProject" :items="availableProjects" label="Project"
                            variant="outlined" density="comfortable" prepend-inner-icon="mdi-folder"
                            :loading="loadingStations" :disabled="!selectedSite" clearable hide-details
                            @update:model-value="handleProjectChange" />
                    </v-col>

                    <!-- Date Range Preset -->
                    <v-col cols="12" md="6">
                        <v-select v-model="dateRangePreset" :items="dateRangePresets" label="Date Range"
                            variant="outlined" density="comfortable" prepend-inner-icon="mdi-calendar-clock"
                            hide-details @update:model-value="applyDateRangePreset" />
                    </v-col>
                </v-row>

                <v-row class="mt-2">
                    <!-- Start Time -->
                    <v-col cols="12" md="6">
                        <v-text-field v-model="startTime" label="Start Time" type="datetime-local" variant="outlined"
                            density="comfortable" prepend-inner-icon="mdi-calendar-start" hide-details
                            :disabled="dateRangePreset !== 'custom'" />
                    </v-col>

                    <!-- End Time -->
                    <v-col cols="12" md="6">
                        <v-text-field v-model="endTime" label="End Time" type="datetime-local" variant="outlined"
                            density="comfortable" prepend-inner-icon="mdi-calendar-end" hide-details
                            :disabled="dateRangePreset !== 'custom'" />
                    </v-col>
                </v-row>

                <v-row class="mt-2">
                    <!-- Station Selection (Multiple) -->
                    <v-col cols="12">
                        <v-autocomplete v-model="selectedStations" :items="stationOptions" item-title="displayText"
                            item-value="value" label="Select Test Stations (Multiple)" variant="outlined"
                            density="comfortable" prepend-inner-icon="mdi-router-wireless" :loading="loadingStations"
                            :disabled="!selectedProject" multiple chips closable-chips clearable hide-details
                            @update:model-value="handleStationChange">
                            <template #chip="{ props, item }">
                                <v-chip v-bind="props" :text="item.raw.chipText" size="small" />
                            </template>
                            <template #item="{ props, item }">
                                <v-list-item v-bind="props" :title="undefined">
                                    <v-list-item-title class="font-weight-medium">
                                        {{ item.raw.displayName }}
                                    </v-list-item-title>
                                    <v-list-item-subtitle class="text-caption">
                                        {{ item.raw.stationName }}
                                    </v-list-item-subtitle>
                                </v-list-item>
                            </template>
                        </v-autocomplete>
                    </v-col>
                </v-row>

                <!-- Device ID Selection per Station -->
                <v-row v-if="selectedStations.length > 0" class="mt-2">
                    <v-col v-for="stationValue in selectedStations" :key="stationValue" cols="12"
                        :md="selectedStations.length === 1 ? 12 : 6">
                        <v-autocomplete v-model="stationDeviceIds[stationValue]"
                            :items="getDeviceIdsForStation(stationValue)"
                            :label="`Select Device IDs - ${getStationDisplayName(stationValue)}`" variant="outlined"
                            density="comfortable" prepend-inner-icon="mdi-chip"
                            :loading="loadingDevicesByStation[stationValue]" multiple chips closable-chips clearable
                            hide-details placeholder="Leave empty for ALL devices">
                            <template #chip="{ props, item }">
                                <v-chip v-bind="props" :text="item.value" size="small" />
                            </template>
                        </v-autocomplete>
                    </v-col>
                </v-row>

                <!-- Search Test Data Section -->
                <v-row v-if="selectedStations.length > 0" class="mt-4">
                    <v-col cols="12" class="d-flex align-center gap-3">
                        <v-select v-model="testStatusFilter" :items="['ALL', 'PASS', 'FAIL']" label="Test Status"
                            variant="outlined" density="compact" hide-details style="max-width: 150px" />
                        <v-btn color="primary" :loading="loadingTestItems" @click="fetchTestItems">
                            <v-icon start>mdi-download</v-icon>
                            Search Test Data ({{ selectedStations.length }} station{{
                                selectedStations.length > 1 ? 's' : '' }})
                        </v-btn>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- Ranking Table Results -->
        <TopProductIplasRanking v-if="testItemData.length > 0" :records="testItemData"
            :station-display-names="stationDisplayNameMap" @row-click="handleRowClick"
            @download="handleDownloadRecord" />

        <!-- Download Section -->
        <v-card v-if="testItemData.length > 0" elevation="2" class="mb-4">
            <v-card-title class="d-flex align-center justify-space-between">
                <div class="d-flex align-center">
                    <v-icon class="mr-2" color="success">mdi-download-multiple</v-icon>
                    Download Options
                </div>
                <v-chip size="small" color="info">{{ testItemData.length }} records available</v-chip>
            </v-card-title>
            <v-card-text>
                <div class="d-flex align-center gap-2 flex-wrap">
                    <v-btn v-if="selectedRecordIndices.length > 0" color="success" variant="outlined"
                        :loading="downloading" @click="downloadSelectedRecords">
                        <v-icon start>mdi-download-multiple</v-icon>
                        Download Selected ({{ selectedRecordIndices.length }})
                    </v-btn>
                    <v-btn variant="text" size="small" @click="toggleSelectAllRecords">
                        {{ allSelected ? 'Deselect All' : `Select All (${testItemData.length})` }}
                    </v-btn>
                </div>
            </v-card-text>
        </v-card>

        <!-- Statistics Summary -->
        <v-card v-if="siteProjects.length > 0" variant="outlined">
            <v-card-text>
                <v-row>
                    <v-col cols="6" sm="3">
                        <div class="text-center">
                            <div class="text-h4 font-weight-bold text-primary">{{ uniqueSites.length }}</div>
                            <div class="text-caption text-medium-emphasis">Sites</div>
                        </div>
                    </v-col>
                    <v-col cols="6" sm="3">
                        <div class="text-center">
                            <div class="text-h4 font-weight-bold text-success">{{ siteProjects.length }}</div>
                            <div class="text-caption text-medium-emphasis">Projects</div>
                        </div>
                    </v-col>
                    <v-col cols="6" sm="3">
                        <div class="text-center">
                            <div class="text-h4 font-weight-bold text-warning">{{ stations.length }}</div>
                            <div class="text-caption text-medium-emphasis">Stations</div>
                        </div>
                    </v-col>
                    <v-col cols="6" sm="3">
                        <div class="text-center">
                            <div class="text-h4 font-weight-bold text-info">{{ totalDeviceCount }}</div>
                            <div class="text-caption text-medium-emphasis">Devices</div>
                        </div>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- Copy Success Snackbar -->
        <v-snackbar v-model="showCopySuccess" :timeout="2000" color="success" location="bottom">
            <v-icon start>mdi-check</v-icon>
            Copied to clipboard!
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useIplasApi } from '@/features/dut_logs/composables/useIplasApi'
import TopProductIplasRanking from './TopProductIplasRanking.vue'
import type { NormalizedRecord, NormalizedTestItem } from './IplasTestItemsFullscreenDialog.vue'
import type { Station, TestItem, CsvTestItemData, DownloadAttachmentInfo } from '@/features/dut_logs/composables/useIplasApi'

// Emits
const emit = defineEmits<{
    (e: 'show-details', record: NormalizedRecord): void
    (e: 'show-settings'): void
}>()

const {
    loading,
    loadingStations,
    loadingTestItems,
    downloading,
    error,
    siteProjects,
    stations,
    testItemData,
    uniqueSites,
    projectsBySite,
    fetchSiteProjects,
    fetchStations,
    fetchDeviceIds,
    fetchTestItems: fetchTestItemsApi,
    downloadAttachments,
    clearTestItemData
} = useIplasApi()

// Selection state
const selectedSite = ref<string | null>(null)
const selectedProject = ref<string | null>(null)
const selectedStations = ref<string[]>([])
const stationDeviceIds = ref<Record<string, string[]>>({})
const loadingDevicesByStation = ref<Record<string, boolean>>({})

// Date range preset
const dateRangePreset = ref<string>('current_shift')
const dateRangePresets = [
    { title: 'Current Shift', value: 'current_shift' },
    { title: 'Today', value: 'today' },
    { title: 'Yesterday', value: 'yesterday' },
    { title: 'This Week', value: 'week' },
    { title: 'Last Week', value: 'last_week' },
    { title: 'This Month', value: 'month' },
    { title: 'Custom Date Range', value: 'custom' }
]

const deviceIdsByStation = ref<Record<string, string[]>>({})

function getLocalTimeString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
}

function getDateRangeForPreset(preset: string): { start: Date; end: Date } {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinutes = now.getMinutes()

    switch (preset) {
        case 'current_shift': {
            const dayShiftStart = 6 * 60 + 50
            const dayShiftEnd = 20 * 60
            const currentTimeMinutes = currentHour * 60 + currentMinutes

            if (currentTimeMinutes >= dayShiftStart && currentTimeMinutes < dayShiftEnd) {
                const start = new Date(now)
                start.setHours(6, 50, 0, 0)
                const end = new Date(now)
                end.setHours(20, 0, 0, 0)
                return { start, end }
            } else {
                const start = new Date(now)
                const end = new Date(now)
                if (currentTimeMinutes >= dayShiftEnd) {
                    start.setHours(20, 0, 0, 0)
                    end.setDate(end.getDate() + 1)
                    end.setHours(6, 50, 0, 0)
                } else {
                    start.setDate(start.getDate() - 1)
                    start.setHours(20, 0, 0, 0)
                    end.setHours(6, 50, 0, 0)
                }
                return { start, end }
            }
        }
        case 'today': {
            const start = new Date(now)
            start.setHours(0, 0, 1, 0)
            const end = new Date(now)
            end.setHours(23, 59, 59, 999)
            return { start, end }
        }
        case 'yesterday': {
            const start = new Date(now)
            start.setDate(start.getDate() - 1)
            start.setHours(0, 0, 1, 0)
            const end = new Date(now)
            end.setDate(end.getDate() - 1)
            end.setHours(23, 59, 59, 999)
            return { start, end }
        }
        case 'week': {
            const start = new Date(now)
            const dayOfWeek = start.getDay()
            const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
            start.setDate(start.getDate() - diffToMonday)
            start.setHours(0, 0, 1, 0)
            const end = new Date(now)
            end.setHours(23, 59, 59, 999)
            return { start, end }
        }
        case 'last_week': {
            const start = new Date(now)
            const dayOfWeek = start.getDay()
            const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
            start.setDate(start.getDate() - diffToMonday - 7)
            start.setHours(0, 0, 1, 0)
            const end = new Date(start)
            end.setDate(end.getDate() + 6)
            end.setHours(23, 59, 59, 999)
            return { start, end }
        }
        case 'month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1)
            start.setHours(0, 0, 1, 0)
            const end = new Date(now)
            end.setHours(23, 59, 59, 999)
            return { start, end }
        }
        default: {
            const start = new Date(now)
            start.setHours(0, 0, 1, 0)
            const end = new Date(now)
            end.setHours(23, 59, 59, 999)
            return { start, end }
        }
    }
}

function applyDateRangePreset(preset: string): void {
    if (preset === 'custom') return
    const { start, end } = getDateRangeForPreset(preset)
    startTime.value = getLocalTimeString(start)
    endTime.value = getLocalTimeString(end)
}

const { start: initialStart, end: initialEnd } = getDateRangeForPreset('current_shift')
const startTime = ref(getLocalTimeString(initialStart))
const endTime = ref(getLocalTimeString(initialEnd))

const testStatusFilter = ref<'ALL' | 'PASS' | 'FAIL'>('ALL')
const showCopySuccess = ref(false)

// Download controls
const selectedRecordKeys = ref<Set<string>>(new Set())

const selectedRecordIndices = computed(() => {
    return Array.from(selectedRecordKeys.value)
})

const allSelected = computed(() => {
    return testItemData.value.length > 0 && selectedRecordKeys.value.size === testItemData.value.length
})

// Computed
const availableProjects = computed(() => {
    if (!selectedSite.value) return []
    return projectsBySite.value[selectedSite.value] || []
})

const stationOptions = computed(() => {
    return stations.value
        .sort((a: Station, b: Station) => a.order - b.order)
        .map((s: Station) => ({
            displayName: s.display_station_name,
            stationName: s.station_name,
            displayText: `${s.display_station_name} - ${s.station_name}`,
            chipText: s.display_station_name,
            value: s.display_station_name,
            order: s.order,
            dataSource: s.data_source
        }))
})

const stationDisplayNameMap = computed(() => {
    const map: Record<string, string> = {}
    for (const s of stations.value) {
        map[s.station_name] = s.display_station_name
    }
    return map
})

const totalDeviceCount = computed(() => {
    let count = 0
    for (const deviceList of Object.values(deviceIdsByStation.value)) {
        count += deviceList.length
    }
    return count
})

// Helper functions
function getDeviceIdsForStation(stationValue: string): string[] {
    return deviceIdsByStation.value[stationValue] || []
}

function getStationDisplayName(stationValue: string): string {
    const station = stations.value.find((s: Station) => s.display_station_name === stationValue)
    return station?.display_station_name || stationValue
}

// Normalize record for dialog
function normalizeStationRecord(record: CsvTestItemData): NormalizedRecord {
    const stationInfo = stations.value.find((s: Station) => s.station_name === record.station)
    return {
        isn: record.ISN || '-',
        deviceId: record.DeviceId || '-',
        stationName: record.station,
        displayStationName: stationInfo?.display_station_name || record.station,
        tsp: record.TSP,
        site: selectedSite.value || '-',
        project: selectedProject.value || '-',
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
            CYCLE: item.CYCLE
        }))
    }
}

// Handle row click from ranking table
function handleRowClick(payload: { record: CsvTestItemData; stationName: string }) {
    const normalized = normalizeStationRecord(payload.record)
    emit('show-details', normalized)
}

// Handle download from ranking table action button
async function handleDownloadRecord(payload: { record: CsvTestItemData; stationName: string }): Promise<void> {
    if (!selectedSite.value || !selectedProject.value) return

    const attachmentInfo = createAttachmentInfo(payload.record)
    await downloadAttachments(selectedSite.value, selectedProject.value, [attachmentInfo])
}

// Download functions
function toggleSelectAllRecords(): void {
    if (allSelected.value) {
        selectedRecordKeys.value.clear()
    } else {
        selectedRecordKeys.value = new Set(
            testItemData.value.map((_, index) => String(index))
        )
    }
}

/**
 * Format time for download_attachment API
 * Input: "2026-01-05 14:46:14" (from API response - already in local time)
 * Output: "2026/01/05 14:46:14" (required by download API)
 * Note: get_csv_testitem returns local time, so no timezone conversion needed
 */
function formatTimeForDownload(timeStr: string): string {
    if (!timeStr) return ''
    // Replace dashes with slashes for the date part
    // Handle both "YYYY-MM-DD HH:mm:ss" and ISO formats
    return timeStr.replace('T', ' ').replace(/-/g, '/').split('.')[0] || ''
}

function createAttachmentInfo(record: CsvTestItemData): DownloadAttachmentInfo {
    // Use ISN if available, otherwise use DeviceId
    const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
    // CRITICAL: Use 'Test end Time' for download_attachment API
    const time = formatTimeForDownload(record['Test end Time'])
    const deviceid = record.DeviceId
    // Use TSP as per API documentation - TSP corresponds to display_station_name
    const station = record.TSP || record.station

    return { isn, time, deviceid, station }
}

async function downloadSelectedRecords(): Promise<void> {
    if (!selectedSite.value || !selectedProject.value || selectedRecordIndices.value.length === 0) return

    const attachments: DownloadAttachmentInfo[] = selectedRecordIndices.value
        .map(key => {
            const index = parseInt(key)
            const record = testItemData.value[index]
            return record ? createAttachmentInfo(record) : null
        })
        .filter((a): a is DownloadAttachmentInfo => a !== null)

    if (attachments.length > 0) {
        await downloadAttachments(selectedSite.value, selectedProject.value, attachments)
    }
    selectedRecordKeys.value.clear()
}

// Watch for station changes to fetch device IDs
watch(selectedStations, async (newStations, oldStations) => {
    const addedStations = newStations.filter(s => !oldStations.includes(s))
    const removedStations = oldStations.filter(s => !newStations.includes(s))

    for (const station of removedStations) {
        delete deviceIdsByStation.value[station]
        delete stationDeviceIds.value[station]
        delete loadingDevicesByStation.value[station]
    }

    if (selectedSite.value && selectedProject.value && startTime.value && endTime.value) {
        for (const station of addedStations) {
            try {
                loadingDevicesByStation.value[station] = true
                const start = new Date(startTime.value).toISOString()
                const end = new Date(endTime.value).toISOString()
                const devices = await fetchDeviceIds(
                    selectedSite.value,
                    selectedProject.value,
                    station,
                    start,
                    end
                )
                deviceIdsByStation.value[station] = devices
                if (!stationDeviceIds.value[station]) {
                    stationDeviceIds.value[station] = []
                }
            } catch (error) {
                console.error(`Failed to fetch device IDs for ${station}:`, error)
                deviceIdsByStation.value[station] = []
                stationDeviceIds.value[station] = []
            } finally {
                loadingDevicesByStation.value[station] = false
            }
        }
    }
}, { deep: true })

// Handlers
function handleSiteChange() {
    selectedProject.value = null
    selectedStations.value = []
    stationDeviceIds.value = {}
    deviceIdsByStation.value = {}
    clearTestItemData()
}

async function handleProjectChange() {
    selectedStations.value = []
    stationDeviceIds.value = {}
    deviceIdsByStation.value = {}
    clearTestItemData()
    if (selectedSite.value && selectedProject.value) {
        await fetchStations(selectedSite.value, selectedProject.value)
    }
}

function handleStationChange() {
    clearTestItemData()
}

async function fetchTestItems() {
    if (!selectedSite.value || !selectedProject.value || selectedStations.value.length === 0) {
        return
    }

    clearTestItemData()

    // Pass Date objects - the composable handles ISO format conversion
    const begintime = new Date(startTime.value)
    const endtime = new Date(endTime.value)

    // Iterate through each selected station
    for (const stationDisplayName of selectedStations.value) {
        const stationInfo = stations.value.find(
            (s: Station) => s.display_station_name === stationDisplayName
        )
        if (!stationInfo) continue

        // Get device IDs for this station (empty array means use 'ALL')
        const deviceIds = stationDeviceIds.value[stationDisplayName] || []

        if (deviceIds.length === 0) {
            // No devices selected - use 'ALL'
            await fetchTestItemsApi(
                selectedSite.value!,
                selectedProject.value!,
                stationInfo.display_station_name,
                'ALL',
                begintime,
                endtime,
                testStatusFilter.value
            )
        } else {
            // Fetch data for each selected device
            for (const deviceId of deviceIds) {
                await fetchTestItemsApi(
                    selectedSite.value!,
                    selectedProject.value!,
                    stationInfo.display_station_name,
                    deviceId,
                    begintime,
                    endtime,
                    testStatusFilter.value
                )
            }
        }
    }
}

async function handleRefresh() {
    await fetchSiteProjects()
}

// Initialize
onMounted(async () => {
    await fetchSiteProjects()
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
