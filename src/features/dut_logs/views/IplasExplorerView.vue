<template>
    <DefaultLayout>
        <v-container fluid class="py-6">
            <!-- Page Header -->
            <v-row class="mb-4">
                <v-col cols="12">
                    <div class="d-flex align-center justify-space-between flex-wrap">
                        <div>
                            <h1 class="text-h4 font-weight-bold mb-1">iPLAS Data Explorer</h1>
                            <p class="text-body-2 text-medium-emphasis">
                                Browse sites, projects, stations, and devices from the iPLAS system
                            </p>
                        </div>
                        <v-btn color="primary" variant="tonal" prepend-icon="mdi-refresh" :loading="loading"
                            @click="handleRefresh">
                            Refresh
                        </v-btn>
                    </div>
                </v-col>
            </v-row>

            <!-- Error Alert -->
            <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
                {{ error }}
            </v-alert>

            <!-- Combined Data Selection Card -->
            <v-row>
                <v-col cols="12">
                    <v-card elevation="2">
                        <v-card-title class="d-flex align-center bg-primary">
                            <v-icon class="mr-2">mdi-filter-variant</v-icon>
                            Data Selection
                        </v-card-title>
                        <v-card-text class="pt-4">
                            <v-row>
                                <!-- Site Selection -->
                                <v-col cols="12" md="3">
                                    <v-autocomplete v-model="selectedSite" :items="uniqueSites" label="Site"
                                        variant="outlined" density="comfortable" prepend-inner-icon="mdi-map-marker"
                                        :loading="loading" clearable hide-details
                                        @update:model-value="handleSiteChange" />
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
                                        item-title="displayText" item-value="value"
                                        label="Select Test Stations (Multiple)" variant="outlined" density="comfortable"
                                        prepend-inner-icon="mdi-router-wireless" :loading="loadingStations"
                                        :disabled="!selectedProject" multiple chips closable-chips clearable
                                        hide-details @update:model-value="handleStationChange">
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

                                <!-- Search Button -->
                                <v-col cols="12" md="6" class="d-flex align-center gap-2">
                                    <v-btn color="primary" size="large" :loading="loadingDevices"
                                        :disabled="selectedStations.length === 0 || !startTime || !endTime"
                                        @click="fetchDevices">
                                        <v-icon start>mdi-magnify</v-icon>
                                        Search Devices
                                    </v-btn>

                                    <v-chip v-if="selectedSite && selectedProject" color="success" size="small">
                                        <v-icon start size="small">mdi-check-circle</v-icon>
                                        Access Verified
                                    </v-chip>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <!-- Device Results -->
            <v-row v-if="deviceIds.length > 0" class="mt-4">
                <v-col cols="12">
                    <v-card elevation="2">
                        <v-card-title class="d-flex align-center justify-space-between">
                            <div class="d-flex align-center">
                                <v-icon class="mr-2" color="info">mdi-chip</v-icon>
                                Devices Found
                                <v-chip size="small" color="success" class="ml-2">{{ deviceIds.length }}</v-chip>
                            </div>
                            <div class="d-flex align-center gap-2">
                                <v-btn variant="text" size="small" @click="showAllDevices = !showAllDevices">
                                    {{ showAllDevices ? 'Show Less' : 'Show All' }}
                                </v-btn>
                                <v-btn v-if="selectedDeviceIds.length > 0" variant="text" size="small" color="error"
                                    @click="selectedDeviceIds = []">
                                    Clear Selection
                                </v-btn>
                            </div>
                        </v-card-title>
                        <v-card-text>
                            <v-chip-group v-model="selectedDeviceIds" multiple>
                                <v-chip v-for="deviceId in displayedDevices" :key="deviceId" :value="deviceId" filter
                                    variant="outlined">
                                    {{ deviceId }}
                                </v-chip>
                            </v-chip-group>

                            <v-alert v-if="deviceIds.length > 20 && !showAllDevices" type="info" density="compact"
                                class="mt-3">
                                Showing first 20 devices. Click "Show All" to see all {{ deviceIds.length }} devices.
                            </v-alert>

                            <!-- Search Test Data Button -->
                            <div v-if="selectedDeviceIds.length > 0" class="mt-4 d-flex align-center gap-3">
                                <v-select v-model="testStatusFilter" :items="['ALL', 'PASS', 'FAIL']"
                                    label="Test Status" variant="outlined" density="compact" hide-details
                                    style="max-width: 150px" />
                                <v-btn color="primary" :loading="loadingTestItems" @click="fetchTestItems">
                                    <v-icon start>mdi-download</v-icon>
                                    Search Test Data ({{ selectedDeviceIds.length }} device{{ selectedDeviceIds.length >
                                        1 ? 's' :
                                        '' }})
                                </v-btn>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <!-- Test Items Results -->
            <v-row v-if="testItemData.length > 0" class="mt-4">
                <v-col cols="12">
                    <v-card elevation="2">
                        <v-card-title class="d-flex align-center justify-space-between flex-wrap">
                            <div class="d-flex align-center">
                                <v-icon class="mr-2" color="purple">mdi-format-list-checks</v-icon>
                                Test Results
                                <v-chip size="small" color="info" class="ml-2">{{ testItemData.length }}
                                    records</v-chip>
                            </div>
                            <div class="d-flex align-center gap-2">
                                <v-btn v-if="selectedRecordIndices.length > 0" color="success" variant="tonal"
                                    size="small" :loading="downloading" @click="downloadSelectedRecords">
                                    <v-icon start size="small">mdi-download-multiple</v-icon>
                                    Download Selected ({{ selectedRecordIndices.length }})
                                </v-btn>
                                <v-btn variant="text" size="small" @click="toggleSelectAllRecords">
                                    {{ selectedRecordIndices.length === testItemData.length ? 'Deselect All' : 'Select All' }}
                                </v-btn>
                            </div>
                        </v-card-title>
                        <v-card-text>
                            <!-- Test Item Filter Chips -->
                            <div class="mb-4">
                                <span class="text-caption text-medium-emphasis mr-2">Filter Test Items:</span>
                                <v-chip-group v-model="testItemFilter" multiple>
                                    <v-chip value="all" filter variant="outlined" color="primary">
                                        <v-icon start size="small">mdi-format-list-bulleted</v-icon>
                                        Show All
                                    </v-chip>
                                    <v-chip value="value" filter variant="outlined" color="success">
                                        <v-icon start size="small">mdi-numeric</v-icon>
                                        Criteria Data
                                    </v-chip>
                                    <v-chip value="non-value" filter variant="outlined" color="warning">
                                        <v-icon start size="small">mdi-text</v-icon>
                                        Non-Criteria Data
                                    </v-chip>
                                    <v-chip value="pass-fail" filter variant="outlined" color="info">
                                        <v-icon start size="small">mdi-check-decagram</v-icon>
                                        PASS/FAIL Data
                                    </v-chip>
                                </v-chip-group>
                            </div>

                            <!-- Grouped Test Data by ISN -->
                            <v-expansion-panels v-model="expandedPanels" multiple>
                                <v-expansion-panel v-for="(record, index) in testItemData" :key="index">
                                    <v-expansion-panel-title>
                                        <div class="d-flex align-center justify-space-between w-100 pr-4">
                                            <div class="d-flex align-center gap-2">
                                                <v-checkbox :model-value="selectedRecordIndices.includes(index)"
                                                    density="compact" hide-details class="flex-grow-0" @click.stop
                                                    @update:model-value="toggleRecordSelection(index)" />
                                                <v-icon size="small" color="primary">mdi-tag</v-icon>
                                                <span class="font-weight-bold">{{ record.ISN || record.DeviceId
                                                    }}</span>
                                                <v-chip :color="getStatusColor(record.ErrorCode)" size="x-small">
                                                    {{ record.ErrorCode }}
                                                </v-chip>
                                                <v-chip v-if="record.ErrorName && record.ErrorName !== 'N/A'"
                                                    color="error" size="x-small" variant="outlined">
                                                    {{ record.ErrorName }}
                                                </v-chip>
                                            </div>
                                            <div class="d-flex align-center gap-2 text-caption text-medium-emphasis">
                                                <span>
                                                    <v-icon size="x-small">mdi-clock-start</v-icon>
                                                    {{ formatLocalTime(record['Test Start Time']) }}
                                                </span>
                                                <span>→</span>
                                                <span>
                                                    <v-icon size="x-small">mdi-clock-end</v-icon>
                                                    {{ formatLocalTime(record['Test end Time']) }}
                                                </span>
                                                <v-chip size="x-small" color="secondary">
                                                    {{ record.station }}
                                                </v-chip>
                                                <v-chip size="x-small">
                                                    Device: {{ record.DeviceId }}
                                                </v-chip>
                                                <v-btn icon size="x-small" variant="text" color="primary"
                                                    :loading="downloadingIndex === index"
                                                    @click.stop="downloadSingleRecord(record, index)">
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
                                            <v-col cols="12" sm="6" md="2">
                                                <div class="text-caption text-medium-emphasis">ISN</div>
                                                <div class="font-weight-medium">{{ record.ISN || '-' }}</div>
                                            </v-col>
                                            <v-col cols="12" sm="6" md="2">
                                                <div class="text-caption text-medium-emphasis">Line</div>
                                                <div class="font-weight-medium">{{ record.Line || '-' }}</div>
                                            </v-col>
                                            <v-col cols="12" sm="6" md="2">
                                                <div class="text-caption text-medium-emphasis">Model</div>
                                                <div class="font-weight-medium">{{ record.Model || '-' }}</div>
                                            </v-col>
                                            <v-col cols="12" sm="6" md="2">
                                                <div class="text-caption text-medium-emphasis">TSP</div>
                                                <div class="font-weight-medium">{{ record.TSP || '-' }}</div>
                                            </v-col>
                                            <v-col cols="12" sm="6" md="2">
                                                <div class="text-caption text-medium-emphasis">Test Duration</div>
                                                <div class="font-weight-medium">
                                                    {{ calculateDuration(record['Test Start Time'], record['Test end Time']) }}
                                                </div>
                                            </v-col>
                                            <v-col cols="12" sm="6" md="2">
                                                <div class="text-caption text-medium-emphasis">Total Cycle Time</div>
                                                <div class="font-weight-medium">{{
                                                    calculateTotalCycleTime(record.TestItem) }}</div>
                                            </v-col>
                                        </v-row>

                                        <!-- Test Items Table -->
                                        <v-data-table :headers="testItemHeaders"
                                            :items="filterTestItems(record.TestItem)" :items-per-page="25"
                                            density="compact" class="elevation-1">
                                            <template #item.STATUS="{ item }">
                                                <v-chip :color="getStatusColor(item.STATUS)" size="x-small">
                                                    {{ normalizeStatus(item.STATUS) }}
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
                                            Showing {{ filterTestItems(record.TestItem).length }} of {{
                                                record.TestItem?.length || 0
                                            }} test items
                                        </div>
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <!-- Statistics Summary -->
            <v-row v-if="siteProjects.length > 0" class="mt-4">
                <v-col cols="12">
                    <v-card variant="outlined">
                        <v-card-text>
                            <v-row>
                                <v-col cols="6" sm="3">
                                    <div class="text-center">
                                        <div class="text-h4 font-weight-bold text-primary">{{ uniqueSites.length }}
                                        </div>
                                        <div class="text-caption text-medium-emphasis">Sites</div>
                                    </div>
                                </v-col>
                                <v-col cols="6" sm="3">
                                    <div class="text-center">
                                        <div class="text-h4 font-weight-bold text-success">{{ siteProjects.length }}
                                        </div>
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
                                        <div class="text-h4 font-weight-bold text-info">{{ deviceIds.length }}</div>
                                        <div class="text-caption text-medium-emphasis">Devices</div>
                                    </div>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useIplasApi } from '@/features/dut_logs/composables/useIplasApi'
import type { Station, TestItem, CsvTestItemData, DownloadAttachmentInfo } from '@/features/dut_logs/composables/useIplasApi'
import { adjustIplasDisplayTime, getStatusColor, normalizeStatus, isStatusPass, isStatusFail } from '@/shared/utils/helpers'

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
    clearTestItemData
} = useIplasApi()

// Selection state - UPDATED: Support multiple stations and device IDs
const selectedSite = ref<string | null>(null)
const selectedProject = ref<string | null>(null)
const selectedStations = ref<string[]>([])
const selectedDeviceIds = ref<string[]>([])

// Time range (default to last 24 hours)
const now = new Date()
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
const startTime = ref(yesterday.toISOString().slice(0, 16))
const endTime = ref(now.toISOString().slice(0, 16))

// Display controls
const showAllDevices = ref(false)
const testStatusFilter = ref<'ALL' | 'PASS' | 'FAIL'>('ALL')
const testItemFilter = ref<('all' | 'value' | 'non-value' | 'pass-fail')[]>(['value'])
const expandedPanels = ref<number[]>([0])

// Download controls
const selectedRecordIndices = ref<number[]>([])
const downloadingIndex = ref<number | null>(null)

// Computed
const availableProjects = computed(() => {
    if (!selectedSite.value) return []
    return projectsBySite.value[selectedSite.value] || []
})

// UPDATED: Station options now show display_station_name on first line, station_name on second line
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

const displayedDevices = computed(() => {
    if (showAllDevices.value) return deviceIds.value
    return deviceIds.value.slice(0, 20)
})

const testItemHeaders = [
    { title: 'Test Item', key: 'NAME', sortable: true },
    { title: 'Status', key: 'STATUS', sortable: true },
    { title: 'Value', key: 'VALUE', sortable: true },
    { title: 'UCL', key: 'UCL', sortable: true },
    { title: 'LCL', key: 'LCL', sortable: true }
]

// Helper functions for filtering test items
function isValueData(item: TestItem): boolean {
    const value = item.VALUE?.toUpperCase() || ''
    // Value data: not PASS, FAIL, 1, 0, or -999 and has at least 2 numeric fields
    if (value === 'PASS' || value === 'FAIL' || value === '1' || value === '0' || value === '-999') {
        return false
    }
    // Check if VALUE, UCL, or LCL contain numeric data
    const hasNumericValue = !isNaN(parseFloat(item.VALUE)) && item.VALUE !== ''
    const hasNumericUcl = !isNaN(parseFloat(item.UCL)) && item.UCL !== ''
    const hasNumericLcl = !isNaN(parseFloat(item.LCL)) && item.LCL !== ''
    const numericCount = [hasNumericValue, hasNumericUcl, hasNumericLcl].filter(Boolean).length
    return numericCount >= 2
}

function isPassFailData(item: TestItem): boolean {
    const value = item.VALUE?.toUpperCase() || ''
    // STATUS must be PASS, FAIL, 1, 0, or -1 AND VALUE must be PASS, FAIL, 1, 0, or -999
    const isStatusPF = isStatusPass(item.STATUS) || isStatusFail(item.STATUS) || item.STATUS === '-1'
    const isValuePF = value === 'PASS' || value === 'FAIL' || value === '1' || value === '0' || value === '-999'
    return isStatusPF && isValuePF
}

function isNonValueData(item: TestItem): boolean {
    return !isValueData(item) && !isPassFailData(item)
}

function filterTestItems(items: TestItem[] | undefined): TestItem[] {
    if (!items) return []

    // If no filters or 'all' is selected, return all items
    if (testItemFilter.value.length === 0 || testItemFilter.value.includes('all')) {
        return items
    }

    // Filter items based on selected types (OR logic)
    return items.filter(item => {
        return testItemFilter.value.some(filterType => {
            switch (filterType) {
                case 'value':
                    return isValueData(item)
                case 'non-value':
                    return isNonValueData(item)
                case 'pass-fail':
                    return isPassFailData(item)
                default:
                    return true
            }
        })
    })
}

function getValueClass(item: TestItem): string {
    const value = item.VALUE?.toUpperCase() || ''
    if (value === 'PASS' || value === '1') return 'text-success font-weight-medium'
    if (value === 'FAIL' || value === '0') return 'text-error font-weight-medium'
    if (value === '-999') return 'text-warning'
    return ''
}

// UPDATED: Format UTC time to local timezone with 1 hour deduction for iPLAS display
function formatLocalTime(utcTimeStr: string): string {
    // Use the centralized helper to adjust time by -1 hour for display
    return adjustIplasDisplayTime(utcTimeStr, 1)
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

/**
 * Calculate total cycle time from all test items
 * Sums up all CYCLE values (which are float strings)
 */
function calculateTotalCycleTime(testItems: TestItem[] | undefined): string {
    if (!testItems || testItems.length === 0) return '-'

    let totalSeconds = 0
    for (const item of testItems) {
        if (item.CYCLE && item.CYCLE !== '') {
            const cycleTime = parseFloat(item.CYCLE)
            if (!isNaN(cycleTime)) {
                totalSeconds += cycleTime
            }
        }
    }

    if (totalSeconds === 0) return '-'

    const minutes = Math.floor(totalSeconds / 60)
    const seconds = (totalSeconds % 60).toFixed(2)
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
}

/**
 * Toggle selection of a record for download
 */
function toggleRecordSelection(index: number): void {
    const idx = selectedRecordIndices.value.indexOf(index)
    if (idx === -1) {
        selectedRecordIndices.value.push(index)
    } else {
        selectedRecordIndices.value.splice(idx, 1)
    }
}

/**
 * Toggle select/deselect all records
 */
function toggleSelectAllRecords(): void {
    if (selectedRecordIndices.value.length === testItemData.value.length) {
        selectedRecordIndices.value = []
    } else {
        selectedRecordIndices.value = testItemData.value.map((_, i) => i)
    }
}

/**
 * Convert test time from API format to download attachment format
 * API format: "2026-01-05 14:46:14" -> Download format: "2026/01/05 14:46:14"
 */
function formatTimeForDownload(timeStr: string): string {
    if (!timeStr) return ''
    // Replace dashes with slashes, handle ISO format with T
    return timeStr.replace('T', ' ').replace(/-/g, '/').split('.')[0] || ''
}

/**
 * Create download attachment info from a test record
 */
function createAttachmentInfo(record: CsvTestItemData): DownloadAttachmentInfo {
    // Use ISN if available, otherwise use DeviceId
    const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
    return {
        isn,
        time: formatTimeForDownload(record['Test Start Time']),
        deviceid: record.DeviceId,
        station: record.station
    }
}

/**
 * Download a single test record
 */
async function downloadSingleRecord(record: CsvTestItemData, index: number): Promise<void> {
    if (!selectedSite.value || !selectedProject.value) return

    downloadingIndex.value = index
    try {
        const attachmentInfo = createAttachmentInfo(record)
        console.log('Download attachment info:', attachmentInfo)
        await downloadAttachments(selectedSite.value, selectedProject.value, [attachmentInfo])
    } catch (err) {
        console.error('Failed to download test log:', err)
    } finally {
        downloadingIndex.value = null
    }
}

/**
 * Download all selected records
 */
async function downloadSelectedRecords(): Promise<void> {
    if (!selectedSite.value || !selectedProject.value || selectedRecordIndices.value.length === 0) return

    try {
        const attachments = selectedRecordIndices.value
            .map(idx => testItemData.value[idx])
            .filter((record): record is CsvTestItemData => record !== undefined)
            .map(createAttachmentInfo)

        await downloadAttachments(selectedSite.value, selectedProject.value, attachments)
    } catch (err) {
        console.error('Failed to download test logs:', err)
    }
}

// Handlers
function handleSiteChange() {
    selectedProject.value = null
    selectedStations.value = []
    selectedDeviceIds.value = []
    stations.value = []
    deviceIds.value = []
    clearTestItemData()
    selectedRecordIndices.value = []
}

async function handleProjectChange() {
    selectedStations.value = []
    selectedDeviceIds.value = []
    deviceIds.value = []
    clearTestItemData()
    selectedRecordIndices.value = []

    if (selectedSite.value && selectedProject.value) {
        await fetchStations(selectedSite.value, selectedProject.value)
    }
}

function handleStationChange() {
    selectedDeviceIds.value = []
    deviceIds.value = []
    clearTestItemData()
    selectedRecordIndices.value = []
}

async function fetchDevices() {
    if (!selectedSite.value || !selectedProject.value || selectedStations.value.length === 0) return

    const firstStation = selectedStations.value[0]
    if (!firstStation) return

    const start = new Date(startTime.value).toISOString()
    const end = new Date(endTime.value).toISOString()

    // Fetch devices for the first selected station
    // TODO: In the future, could aggregate devices from multiple stations
    await fetchDeviceIds(
        selectedSite.value,
        selectedProject.value,
        firstStation,
        start,
        end
    )
}

async function fetchTestItems() {
    if (!selectedSite.value || !selectedProject.value || selectedStations.value.length === 0 || selectedDeviceIds.value.length === 0) return

    const stationInfo = stations.value.find((s: Station) => s.display_station_name === selectedStations.value[0])
    if (!stationInfo) return

    // Pass Date objects - the composable handles ISO format conversion
    const begintime = new Date(startTime.value)
    const endtime = new Date(endTime.value)

    // Clear existing data before fetching
    clearTestItemData()
    selectedRecordIndices.value = []

    // UPDATED: Fetch test items for each selected device
    for (const deviceId of selectedDeviceIds.value) {
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

    // Expand first panel after fetching
    if (testItemData.value.length > 0) {
        expandedPanels.value = [0]
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
