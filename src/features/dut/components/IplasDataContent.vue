<template>
    <div>
        <!-- Sub-tabs for different search modes -->
        <v-tabs v-model="searchMode" color="secondary" class="mb-4" density="compact">
            <v-tab value="station">
                <v-icon start>mdi-router-wireless</v-icon>
                Station Search
            </v-tab>
            <v-tab value="isn">
                <v-icon start>mdi-barcode-scan</v-icon>
                ISN Search
            </v-tab>
        </v-tabs>

        <v-window v-model="searchMode">
            <!-- Station Search Mode -->
            <v-window-item value="station">
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
                        <v-btn color="white" variant="outlined" size="small" prepend-icon="mdi-refresh"
                            :loading="loading" @click="handleRefresh">
                            Refresh
                        </v-btn>
                    </v-card-title>
                    <v-card-text class="pt-4">
                        <v-row>
                            <!-- Site Selection -->
                            <v-col cols="12" md="3">
                                <v-autocomplete v-model="selectedSite" :items="uniqueSites" label="Site"
                                    variant="outlined" density="comfortable" prepend-inner-icon="mdi-map-marker"
                                    :loading="loading" clearable hide-details @update:model-value="handleSiteChange" />
                            </v-col>

                            <!-- Project Selection -->
                            <v-col cols="12" md="3">
                                <v-autocomplete v-model="selectedProject" :items="availableProjects" label="Project"
                                    variant="outlined" density="comfortable" prepend-inner-icon="mdi-folder"
                                    :loading="loadingStations" :disabled="!selectedSite" clearable hide-details
                                    @update:model-value="handleProjectChange" />
                            </v-col>

                            <!-- Start Time -->
                            <v-col cols="12" md="3">
                                <v-text-field v-model="startTime" label="Start Time" type="datetime-local"
                                    variant="outlined" density="comfortable" prepend-inner-icon="mdi-calendar-start"
                                    hide-details />
                            </v-col>

                            <!-- End Time -->
                            <v-col cols="12" md="3">
                                <v-text-field v-model="endTime" label="End Time" type="datetime-local"
                                    variant="outlined" density="comfortable" prepend-inner-icon="mdi-calendar-end"
                                    hide-details />
                            </v-col>
                        </v-row>

                        <v-row class="mt-2">
                            <!-- Station Selection (Multiple) -->
                            <v-col cols="12" md="6">
                                <v-autocomplete v-model="selectedStations" :items="stationOptions"
                                    item-title="displayText" item-value="value" label="Test Stations" variant="outlined"
                                    density="comfortable" prepend-inner-icon="mdi-router-wireless"
                                    :loading="loadingStations" :disabled="!selectedProject" multiple chips closable-chips
                                    clearable hide-details @update:model-value="handleStationChange">
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

                            <!-- Device Selection (Multiple, searchable) -->
                            <v-col cols="12" md="6">
                                <v-autocomplete v-model="selectedDeviceIds" :items="groupedDeviceOptions"
                                    item-title="displayText" item-value="value" label="Device IDs" variant="outlined"
                                    density="comfortable" prepend-inner-icon="mdi-chip" :loading="loadingDevices"
                                    :disabled="selectedStations.length === 0" multiple chips closable-chips clearable
                                    hide-details>
                                    <template #chip="{ props, item }">
                                        <v-chip v-bind="props" :text="item.raw.deviceId" size="small" />
                                    </template>
                                    <template #item="{ props, item }">
                                        <v-list-item v-bind="props" :title="undefined">
                                            <v-list-item-title class="font-weight-medium">
                                                {{ item.raw.deviceId }}
                                            </v-list-item-title>
                                            <v-list-item-subtitle class="text-caption">
                                                {{ item.raw.stationName }}
                                            </v-list-item-subtitle>
                                        </v-list-item>
                                    </template>
                                </v-autocomplete>
                            </v-col>
                        </v-row>

                        <!-- Fetch Test Items Section -->
                        <v-row v-if="selectedDeviceIds.length > 0" class="mt-4">
                            <v-col cols="12" class="d-flex align-center gap-3">
                                <v-select v-model="testStatusFilter" :items="['ALL', 'PASS', 'FAIL']" label="Test Status"
                                    variant="outlined" density="compact" hide-details style="max-width: 150px" />
                                <v-btn color="primary" :loading="loadingTestItems" @click="fetchTestItems">
                                    <v-icon start>mdi-download</v-icon>
                                    Fetch Test Items ({{ selectedDeviceIds.length }} device{{
                                        selectedDeviceIds.length > 1 ? 's' : '' }})
                                </v-btn>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- Test Items Results -->
                <v-card v-if="testItemData.length > 0" elevation="2" class="mb-4">
                    <v-card-title class="d-flex align-center justify-space-between flex-wrap">
                        <div class="d-flex align-center">
                            <v-icon class="mr-2" color="purple">mdi-format-list-checks</v-icon>
                            Test Results
                            <v-chip size="small" color="info" class="ml-2">{{ testItemData.length }} records</v-chip>
                        </div>
                        <div class="d-flex align-center gap-2">
                            <v-btn v-if="selectedRecordIndices.length > 0" color="success" variant="outlined"
                                size="small" :loading="downloading" @click="downloadSelectedRecords">
                                <v-icon start size="small">mdi-download-multiple</v-icon>
                                Download Selected ({{ selectedRecordIndices.length }})
                            </v-btn>
                            <v-btn variant="text" size="small" @click="toggleSelectAllRecords">
                                {{ selectedRecordIndices.length === testItemData.length ? 'Deselect All' : 'Select All'
                                }}
                            </v-btn>
                        </div>
                    </v-card-title>
                    <v-card-text>
                        <!-- Test Item Filter Chips -->
                        <div class="mb-4">
                            <span class="text-caption text-medium-emphasis mr-2">Filter Test Items:</span>
                            <v-chip-group v-model="testItemFilter" mandatory>
                                <v-chip value="all" filter variant="outlined" color="primary">
                                    <v-icon start size="small">mdi-format-list-bulleted</v-icon>
                                    Show All
                                </v-chip>
                                <v-chip value="value" filter variant="outlined" color="success">
                                    <v-icon start size="small">mdi-numeric</v-icon>
                                    Value Data
                                </v-chip>
                                <v-chip value="non-value" filter variant="outlined" color="warning">
                                    <v-icon start size="small">mdi-text</v-icon>
                                    Non-Value Data
                                </v-chip>
                                <v-chip value="pass-fail" filter variant="outlined" color="info">
                                    <v-icon start size="small">mdi-check-decagram</v-icon>
                                    PASS/FAIL Data
                                </v-chip>
                            </v-chip-group>
                        </div>

                        <!-- Grouped Test Data by Station -->
                        <div v-for="(stationGroup, stationIndex) in groupedByStation" :key="stationGroup.stationName"
                            class="mb-4">
                            <div class="d-flex align-center mb-2">
                                <v-icon size="small" color="secondary" class="mr-2">mdi-router-wireless</v-icon>
                                <span class="font-weight-bold text-subtitle-1">{{ stationGroup.displayName }}</span>
                                <v-chip size="x-small" color="info" class="ml-2">{{ stationGroup.records.length }}
                                    records</v-chip>
                            </div>

                            <v-expansion-panels v-model="expandedPanels[stationIndex]" multiple>
                                <v-expansion-panel v-for="(record, recordIndex) in stationGroup.records"
                                    :key="`${stationIndex}-${recordIndex}`">
                                    <v-expansion-panel-title>
                                        <div class="d-flex align-center justify-space-between w-100 pr-4">
                                            <div class="d-flex align-center gap-2">
                                                <v-checkbox
                                                    :model-value="isRecordSelected(stationGroup.stationName, recordIndex)"
                                                    density="compact" hide-details class="flex-grow-0" @click.stop
                                                    @update:model-value="toggleRecordSelection(stationGroup.stationName, recordIndex)" />
                                                <v-icon size="small" color="primary">mdi-chip</v-icon>
                                                <span class="font-weight-bold">{{ record.DeviceId }}</span>
                                                <v-chip :color="record.ErrorCode === 'PASS' ? 'success' : 'error'"
                                                    size="x-small">
                                                    {{ record.ErrorCode }}
                                                </v-chip>
                                                <v-chip v-if="record.ErrorName && record.ErrorName !== 'N/A'"
                                                    color="error" size="x-small" variant="outlined">
                                                    {{ record.ErrorName }}
                                                </v-chip>
                                            </div>
                                            <div class="d-flex align-center gap-2 text-caption text-medium-emphasis">
                                                <v-chip size="x-small" color="secondary" variant="outlined">
                                                    <v-icon start size="x-small">mdi-clock-end</v-icon>
                                                    {{ formatLocalTime(record['Test end Time']) }}
                                                </v-chip>
                                                <v-chip size="x-small" variant="outlined">
                                                    <v-icon start size="x-small">mdi-timer</v-icon>
                                                    {{ calculateTotalCycleTime(record.TestItem) }}
                                                </v-chip>
                                                <v-btn icon size="x-small" variant="outlined" color="primary"
                                                    :loading="downloadingKey === `${stationGroup.stationName}-${recordIndex}`"
                                                    @click.stop="downloadSingleRecord(record, stationGroup.stationName, recordIndex)">
                                                    <v-icon size="small">mdi-download</v-icon>
                                                    <v-tooltip activator="parent" location="top">Download Test
                                                        Log</v-tooltip>
                                                </v-btn>
                                            </div>
                                        </div>
                                    </v-expansion-panel-title>
                                    <v-expansion-panel-text>
                                        <!-- Record Details -->
                                        <v-row class="mb-3">
                                            <v-col cols="12" sm="6" md="3">
                                                <div class="text-caption text-medium-emphasis">ISN</div>
                                                <div class="font-weight-medium">{{ record.ISN || '-' }}</div>
                                            </v-col>
                                            <v-col cols="12" sm="6" md="3">
                                                <div class="text-caption text-medium-emphasis">Line</div>
                                                <div class="font-weight-medium">{{ record.Line || '-' }}</div>
                                            </v-col>
                                            <v-col cols="12" sm="6" md="3">
                                                <div class="text-caption text-medium-emphasis">TSP</div>
                                                <div class="font-weight-medium">{{ record.TSP || '-' }}</div>
                                            </v-col>
                                            <v-col cols="12" sm="6" md="3">
                                                <div class="text-caption text-medium-emphasis">Test Duration</div>
                                                <div class="font-weight-medium">
                                                    {{ calculateDuration(record['Test Start Time'], record['Test end Time']) }}
                                                </div>
                                            </v-col>
                                        </v-row>

                                        <!-- Test Items Search -->
                                        <v-text-field
                                            v-model="testItemSearchQueries[`${stationGroup.stationName}-${recordIndex}`]"
                                            label="Search Test Items"
                                            prepend-inner-icon="mdi-magnify"
                                            variant="outlined"
                                            density="compact"
                                            hide-details
                                            clearable
                                            class="mb-3"
                                            placeholder="Search by test item name, status, or value..."
                                        />

                                        <!-- Test Items Table -->
                                        <v-data-table :headers="testItemHeaders"
                                            :items="filterAndSearchTestItems(record.TestItem, `${stationGroup.stationName}-${recordIndex}`)"
                                            :items-per-page="25"
                                            density="compact" class="elevation-1">
                                            <template #item.STATUS="{ item }">
                                                <v-chip :color="item.STATUS === 'PASS' ? 'success' : 'error'"
                                                    size="x-small">
                                                    {{ item.STATUS }}
                                                </v-chip>
                                            </template>
                                            <template #item.VALUE="{ item }">
                                                <span :class="getValueClass(item)">{{ item.VALUE }}</span>
                                            </template>
                                            <template #item.UCL="{ item }">
                                                <span class="text-medium-emphasis">{{ item.UCL || '-' }}</span>
                                            </template>
                                            <template #item.LCL="{ item }">
                                                <span class="text-medium-emphasis">{{ item.LCL || '-' }}</span>
                                            </template>
                                        </v-data-table>

                                        <div class="text-caption text-medium-emphasis mt-2">
                                            Showing {{ filterAndSearchTestItems(record.TestItem, `${stationGroup.stationName}-${recordIndex}`).length }} of {{
                                                record.TestItem?.length || 0 }} test items
                                        </div>
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
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
            </v-window-item>

            <!-- ISN Search Mode -->
            <v-window-item value="isn">
                <IplasIsnSearchContent />
            </v-window-item>
        </v-window>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useIplasApi } from '@/features/dut_logs/composables/useIplasApi'
import IplasIsnSearchContent from './IplasIsnSearchContent.vue'
import type { Station, TestItem, CsvTestItemData, DownloadAttachmentInfo } from '@/features/dut_logs/api/iplasApi'

interface StationGroup {
    stationName: string
    displayName: string
    records: CsvTestItemData[]
}

interface DeviceOption {
    deviceId: string
    stationName: string
    displayStationName: string
    displayText: string
    value: string
}

// Search mode tab
const searchMode = ref<'station' | 'isn'>('station')

const {
    loading,
    loadingStations,
    loadingDevices,
    loadingTestItems,
    downloading,
    error,
    siteProjects,
    stations,
    deviceIds,
    testItemData,
    uniqueSites,
    projectsBySite,
    fetchSiteProjects,
    fetchStations,
    fetchDeviceIds,
    fetchTestItems: fetchTestItemsApi,
    downloadAttachments,
    formatDateForV1Api,
    clearTestItemData
} = useIplasApi()

// Selection state
const selectedSite = ref<string | null>(null)
const selectedProject = ref<string | null>(null)
const selectedStations = ref<string[]>([])
const selectedDeviceIds = ref<string[]>([])

// Device IDs grouped by station
const deviceIdsByStation = ref<Record<string, string[]>>({})

// Time range (default to current local time - 8 hours to now)
function getLocalTimeString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
}

const now = new Date()
const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000)
const startTime = ref(getLocalTimeString(eightHoursAgo))
const endTime = ref(getLocalTimeString(now))

// Display controls
const testStatusFilter = ref<'ALL' | 'PASS' | 'FAIL'>('ALL')
const testItemFilter = ref<'all' | 'value' | 'non-value' | 'pass-fail'>('value')
const expandedPanels = ref<Record<number, number[]>>({})
const testItemSearchQueries = ref<Record<string, string>>({})

// Download controls
const selectedRecordKeys = ref<Set<string>>(new Set())
const downloadingKey = ref<string | null>(null)

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

const groupedDeviceOptions = computed<DeviceOption[]>(() => {
    const options: DeviceOption[] = []
    for (const [stationName, devices] of Object.entries(deviceIdsByStation.value)) {
        const stationInfo = stations.value.find((s: Station) => s.display_station_name === stationName)
        for (const deviceId of devices) {
            options.push({
                deviceId,
                stationName: stationInfo?.station_name || stationName,
                displayStationName: stationName,
                displayText: `${deviceId} (${stationName})`,
                value: `${stationName}::${deviceId}`
            })
        }
    }
    return options
})

const totalDeviceCount = computed(() => {
    let count = 0
    for (const devices of Object.values(deviceIdsByStation.value)) {
        count += devices.length
    }
    return count
})

const selectedRecordIndices = computed(() => {
    return Array.from(selectedRecordKeys.value)
})

const groupedByStation = computed<StationGroup[]>(() => {
    const groups: Record<string, StationGroup> = {}

    for (const record of testItemData.value) {
        const stationName = record.station
        if (!groups[stationName]) {
            const stationInfo = stations.value.find((s: Station) => s.station_name === stationName)
            groups[stationName] = {
                stationName,
                displayName: stationInfo?.display_station_name || stationName,
                records: []
            }
        }
        groups[stationName].records.push(record)
    }

    return Object.values(groups)
})

const testItemHeaders = [
    { title: 'Test Item', key: 'NAME', sortable: true },
    { title: 'Status', key: 'STATUS', sortable: true },
    { title: 'Value', key: 'VALUE', sortable: true },
    { title: 'UCL', key: 'UCL', sortable: true },
    { title: 'LCL', key: 'LCL', sortable: true }
]

// Watch for station selection changes to fetch device IDs
watch(selectedStations, async (newStations, oldStations) => {
    // Find newly added stations
    const addedStations = newStations.filter(s => !oldStations.includes(s))
    // Find removed stations
    const removedStations = oldStations.filter(s => !newStations.includes(s))

    // Remove device IDs for removed stations
    for (const station of removedStations) {
        delete deviceIdsByStation.value[station]
    }

    // Clear selected device IDs that no longer exist
    const validDeviceIds = new Set(groupedDeviceOptions.value.map(d => d.value))
    selectedDeviceIds.value = selectedDeviceIds.value.filter(id => validDeviceIds.has(id))

    // Fetch device IDs for newly added stations
    if (selectedSite.value && selectedProject.value && startTime.value && endTime.value) {
        for (const station of addedStations) {
            try {
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
            } catch (err) {
                console.error(`Failed to fetch devices for station ${station}:`, err)
            }
        }
    }
}, { deep: true })

// Helper functions
function isValueData(item: TestItem): boolean {
    const value = item.VALUE?.toUpperCase() || ''
    if (value === 'PASS' || value === 'FAIL' || value === '-999') {
        return false
    }
    const hasNumericValue = !isNaN(parseFloat(item.VALUE)) && item.VALUE !== ''
    const hasNumericUcl = !isNaN(parseFloat(item.UCL)) && item.UCL !== ''
    const hasNumericLcl = !isNaN(parseFloat(item.LCL)) && item.LCL !== ''
    const numericCount = [hasNumericValue, hasNumericUcl, hasNumericLcl].filter(Boolean).length
    return numericCount >= 2
}

function isPassFailData(item: TestItem): boolean {
    const value = item.VALUE?.toUpperCase() || ''
    const status = item.STATUS?.toUpperCase() || ''
    return (status === 'PASS' || status === 'FAIL' || status === '-1') &&
        (value === 'PASS' || value === 'FAIL' || value === '-999')
}

function isNonValueData(item: TestItem): boolean {
    return !isValueData(item) && !isPassFailData(item)
}

function filterTestItems(items: TestItem[] | undefined): TestItem[] {
    if (!items) return []

    switch (testItemFilter.value) {
        case 'value':
            return items.filter(isValueData)
        case 'non-value':
            return items.filter(isNonValueData)
        case 'pass-fail':
            return items.filter(isPassFailData)
        default:
            return items
    }
}

function filterAndSearchTestItems(items: TestItem[] | undefined, key: string): TestItem[] {
    let filtered = filterTestItems(items)
    const query = testItemSearchQueries.value[key]?.toLowerCase().trim()
    if (query) {
        filtered = filtered.filter(item => 
            item.NAME?.toLowerCase().includes(query) ||
            item.STATUS?.toLowerCase().includes(query) ||
            item.VALUE?.toLowerCase().includes(query) ||
            item.UCL?.toLowerCase().includes(query) ||
            item.LCL?.toLowerCase().includes(query)
        )
    }
    return filtered
}

function formatLocalTime(utcTimeStr: string): string {
    if (!utcTimeStr) return '-'
    try {
        const utcDate = new Date(utcTimeStr.replace(' ', 'T') + 'Z')
        return utcDate.toLocaleString(undefined, {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    } catch {
        return utcTimeStr
    }
}

function getValueClass(item: TestItem): string {
    if (item.VALUE === 'PASS') return 'text-success font-weight-medium'
    if (item.VALUE === 'FAIL') return 'text-error font-weight-medium'
    if (item.VALUE === '-999') return 'text-warning'
    return ''
}

function calculateDuration(startStr: string, endStr: string): string {
    if (!startStr || !endStr) return '-'
    try {
        const start = new Date(startStr.replace(' ', 'T') + 'Z')
        const end = new Date(endStr.replace(' ', 'T') + 'Z')
        const diffMs = end.getTime() - start.getTime()
        const diffSeconds = Math.floor(diffMs / 1000)
        const minutes = Math.floor(diffSeconds / 60)
        const seconds = diffSeconds % 60
        return `${minutes}m ${seconds}s`
    } catch {
        return '-'
    }
}

function calculateTotalCycleTime(testItems: TestItem[] | undefined): string {
    if (!testItems || testItems.length === 0) return '-'

    let totalSeconds = 0
    for (const item of testItems) {
        if (item.CYLCE && item.CYLCE !== '') {
            const cycleTime = parseFloat(item.CYLCE)
            if (!isNaN(cycleTime)) {
                totalSeconds += cycleTime
            }
        }
    }

    if (totalSeconds === 0) return '-'

    const minutes = Math.floor(totalSeconds / 60)
    const seconds = (totalSeconds % 60).toFixed(0)
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
}

function isRecordSelected(stationName: string, recordIndex: number): boolean {
    return selectedRecordKeys.value.has(`${stationName}::${recordIndex}`)
}

function toggleRecordSelection(stationName: string, recordIndex: number): void {
    const key = `${stationName}::${recordIndex}`
    if (selectedRecordKeys.value.has(key)) {
        selectedRecordKeys.value.delete(key)
    } else {
        selectedRecordKeys.value.add(key)
    }
}

function toggleSelectAllRecords(): void {
    if (selectedRecordKeys.value.size === testItemData.value.length) {
        selectedRecordKeys.value.clear()
    } else {
        selectedRecordKeys.value.clear()
        for (const group of groupedByStation.value) {
            for (let i = 0; i < group.records.length; i++) {
                selectedRecordKeys.value.add(`${group.stationName}::${i}`)
            }
        }
    }
}

/**
 * Format time for v1 API download
 * Input: "2026-01-05 14:46:14" (from API response)
 * Output: "2026/01/05 14:46:14" (required by download API)
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
    const time = formatTimeForDownload(record['Test Start Time'])
    const deviceid = record.DeviceId
    // Use TSP if available (as noted in API docs, TSP could be different from station)
    // But for download, we should use the station name that was used in the query
    const station = record.station

    return { isn, time, deviceid, station }
}

async function downloadSingleRecord(record: CsvTestItemData, stationName: string, recordIndex: number): Promise<void> {
    if (!selectedSite.value || !selectedProject.value) return

    downloadingKey.value = `${stationName}-${recordIndex}`
    try {
        const attachmentInfo = createAttachmentInfo(record)
        console.log('Download attachment info:', attachmentInfo)
        await downloadAttachments(selectedSite.value, selectedProject.value, [attachmentInfo])
    } catch (err) {
        console.error('Failed to download test log:', err)
    } finally {
        downloadingKey.value = null
    }
}

async function downloadSelectedRecords(): Promise<void> {
    if (!selectedSite.value || !selectedProject.value || selectedRecordKeys.value.size === 0) return

    try {
        const attachments: DownloadAttachmentInfo[] = []

        for (const group of groupedByStation.value) {
            for (let i = 0; i < group.records.length; i++) {
                const key = `${group.stationName}::${i}`
                if (selectedRecordKeys.value.has(key)) {
                    const record = group.records[i]
                    if (record) {
                        attachments.push(createAttachmentInfo(record))
                    }
                }
            }
        }

        if (attachments.length > 0) {
            console.log('Download attachments:', attachments)
            await downloadAttachments(selectedSite.value, selectedProject.value, attachments)
        }
    } catch (err) {
        console.error('Failed to download test logs:', err)
    }
}

// Handlers
function handleSiteChange() {
    selectedProject.value = null
    selectedStations.value = []
    selectedDeviceIds.value = []
    deviceIdsByStation.value = {}
    stations.value = []
    clearTestItemData()
    selectedRecordKeys.value.clear()
}

async function handleProjectChange() {
    selectedStations.value = []
    selectedDeviceIds.value = []
    deviceIdsByStation.value = {}
    clearTestItemData()
    selectedRecordKeys.value.clear()

    if (selectedSite.value && selectedProject.value) {
        await fetchStations(selectedSite.value, selectedProject.value)
    }
}

function handleStationChange() {
    selectedDeviceIds.value = []
    clearTestItemData()
    selectedRecordKeys.value.clear()
}

async function fetchTestItems() {
    if (!selectedSite.value || !selectedProject.value || selectedDeviceIds.value.length === 0) return

    const begintime = formatDateForV1Api(new Date(startTime.value))
    const endtime = formatDateForV1Api(new Date(endTime.value))

    clearTestItemData()
    selectedRecordKeys.value.clear()

    // Parse selected device IDs to get station and device info
    for (const selectedValue of selectedDeviceIds.value) {
        const [stationDisplayName, deviceId] = selectedValue.split('::')
        if (!stationDisplayName || !deviceId) continue

        // Find the actual station name
        const stationInfo = stations.value.find((s: Station) => s.display_station_name === stationDisplayName)
        if (!stationInfo) continue

        await fetchTestItemsApi(
            selectedSite.value,
            selectedProject.value,
            stationInfo.station_name,
            deviceId,
            begintime,
            endtime,
            testStatusFilter.value
        )
    }

    // Initialize expanded panels for first group
    if (groupedByStation.value.length > 0) {
        expandedPanels.value[0] = [0]
    }
}

async function handleRefresh() {
    await fetchSiteProjects(true)
}

// Initialize
onMounted(async () => {
    await fetchSiteProjects()
})
</script>

<style scoped>
.w-100 {
    width: 100%;
}

.gap-2 {
    gap: 0.5rem;
}

.gap-3 {
    gap: 0.75rem;
}
</style>
