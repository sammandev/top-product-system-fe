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
            <v-window-item value="station" eager>
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
                                    :loading="loadingStations" :disabled="!selectedProject" multiple chips
                                    closable-chips clearable hide-details @update:model-value="handleStationChange">
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

                        <!-- Search Test Data Section -->
                        <v-row v-if="selectedDeviceIds.length > 0" class="mt-4">
                            <v-col cols="12" class="d-flex align-center gap-3">
                                <v-select v-model="testStatusFilter" :items="['ALL', 'PASS', 'FAIL']"
                                    label="Test Status" variant="outlined" density="compact" hide-details
                                    style="max-width: 150px" />
                                <v-btn color="primary" :loading="loadingTestItems" @click="fetchTestItems">
                                    <v-icon start>mdi-download</v-icon>
                                    Search Test Data ({{ selectedDeviceIds.length }} device{{
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
                            <v-icon class="mr-2" color="info">mdi-format-list-checks</v-icon>
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
                                {{ allVisibleSelected ? 'Deselect All' : `Select All (${visibleRecordsCount})` }}
                            </v-btn>
                        </div>
                    </v-card-title>
                    <v-card-text>
                        <!-- Station Sub-Tabs -->
                        <v-tabs v-model="activeStationTab" color="secondary" class="mb-4" show-arrows>
                            <v-tab v-for="(stationGroup, index) in groupedByStation" :key="stationGroup.stationName"
                                :value="index">
                                <v-icon start size="small">mdi-router-wireless</v-icon>
                                {{ stationGroup.displayName }}
                                <v-chip size="x-small" color="info" class="ml-2">{{
                                    getFilteredStationRecords(stationGroup).length
                                }}</v-chip>
                            </v-tab>
                        </v-tabs>

                        <v-window v-model="activeStationTab">
                            <v-window-item v-for="(stationGroup, stationIndex) in groupedByStation"
                                :key="stationGroup.stationName" :value="stationIndex" eager>
                                <!-- Search, Status and Device ID Filter -->
                                <v-row class="mb-4" dense>
                                    <v-col cols="12" md="4">
                                        <v-text-field v-model="recordSearchQueries[stationGroup.stationName]"
                                            label="Search Records" prepend-inner-icon="mdi-magnify"
                                            variant="outlined" density="compact" hide-details clearable
                                            placeholder="Search ISN, Device ID, Error Code, Error Name..." />
                                    </v-col>
                                    <v-col cols="12" md="2">
                                        <v-select v-model="stationStatusFilters[stationGroup.stationName]"
                                            :items="['ALL', 'PASS', 'FAIL']" label="Status"
                                            variant="outlined" density="compact" hide-details />
                                    </v-col>
                                    <v-col cols="12" md="6">
                                        <v-autocomplete v-model="selectedFilterDeviceIds[stationGroup.stationName]"
                                            :items="getUniqueDeviceIdsForStation(stationGroup)" label="Filter by Device ID"
                                            variant="outlined" density="compact" prepend-inner-icon="mdi-chip" multiple
                                            chips closable-chips clearable hide-details placeholder="All Device IDs">
                                            <template #chip="{ props, item }">
                                                <v-chip v-bind="props" :text="item.raw" size="small" />
                                            </template>
                                        </v-autocomplete>
                                    </v-col>
                                </v-row>

                                <!-- Station Records -->
                                <v-expansion-panels v-model="expandedPanels[stationIndex]" multiple>
                                    <v-expansion-panel
                                        v-for="(record, recordIndex) in getDisplayedStationRecords(stationGroup)"
                                        :key="`${stationIndex}-${recordIndex}`">
                                        <v-expansion-panel-title>
                                            <div class="d-flex align-center justify-space-between w-100 pr-4">
                                                <div class="d-flex align-center gap-2">
                                                    <v-checkbox
                                                        :model-value="isRecordSelected(stationGroup.stationName, recordIndex)"
                                                        density="compact" hide-details class="flex-grow-0" @click.stop
                                                        @update:model-value="toggleRecordSelection(stationGroup.stationName, recordIndex)" />
                                                    <v-btn icon size="x-small" variant="text" color="primary"
                                                        @click.stop="copyToClipboard(record.ISN)">
                                                        <v-icon size="small">mdi-content-copy</v-icon>
                                                        <v-tooltip activator="parent" location="top">Copy ISN</v-tooltip>
                                                    </v-btn>
                                                    <span class="font-weight-bold">{{ record.ISN || '-' }}</span>
                                                    <!-- DeviceId chip - clickable to copy -->
                                                    <v-chip size="x-small" color="secondary" variant="outlined"
                                                        class="cursor-pointer" @click.stop="copyToClipboard(record.DeviceId)">
                                                        {{ record.DeviceId }}
                                                        <v-tooltip activator="parent" location="top">Click to copy Device ID</v-tooltip>
                                                    </v-chip>
                                                    <!-- ErrorCode chip - clickable to copy -->
                                                    <v-chip :color="record.ErrorCode === 'PASS' ? 'success' : 'error'"
                                                        size="x-small" class="cursor-pointer"
                                                        @click.stop="copyToClipboard(record.ErrorCode)">
                                                        {{ record.ErrorCode }}
                                                        <v-tooltip activator="parent" location="top">Click to copy Error Code</v-tooltip>
                                                    </v-chip>
                                                    <!-- ErrorName chip - clickable to copy -->
                                                    <template v-if="record.ErrorName && record.ErrorName !== 'N/A' && record.ErrorCode !== 'PASS'">
                                                        <v-chip color="error" size="x-small" variant="outlined"
                                                            class="cursor-pointer" @click.stop="copyToClipboard(record.ErrorName)">
                                                            {{ record.ErrorName }}
                                                            <v-tooltip activator="parent" location="top">Click to copy Error Name</v-tooltip>
                                                        </v-chip>
                                                    </template>
                                                </div>
                                                <div
                                                    class="d-flex align-center gap-2 text-caption text-medium-emphasis">
                                                    <v-chip size="x-small" color="info" variant="outlined">
                                                        {{ formatLocalTime(record['Test end Time']) }}
                                                    </v-chip>
                                                    <v-chip size="x-small" variant="outlined">
                                                        <!-- <v-icon start size="x-small">mdi-timer</v-icon> -->
                                                        {{ calculateDuration(record['Test Start Time'], record['Test end Time']) }}
                                                    </v-chip>
                                                    <v-btn icon size="x-small" variant="outlined" color="secondary"
                                                        @click.stop="openFullscreen(record)">
                                                        <v-icon size="small">mdi-fullscreen</v-icon>
                                                        <v-tooltip activator="parent" location="top">Fullscreen View</v-tooltip>
                                                    </v-btn>
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
                                                <v-col cols="12" sm="6" md="2">
                                                    <div class="text-caption text-medium-emphasis">ISN</div>
                                                    <div class="font-weight-medium">{{ record.ISN || '-' }}</div>
                                                </v-col>
                                                <v-col cols="12" sm="6" md="2">
                                                    <div class="text-caption text-medium-emphasis">Station Name</div>
                                                    <div class="font-weight-medium">{{ record.station || '-' }}</div>
                                                </v-col>
                                                <v-col cols="12" sm="6" md="2">
                                                    <div class="text-caption text-medium-emphasis">TSP</div>
                                                    <div class="font-weight-medium">{{ record.TSP || '-' }}</div>
                                                </v-col>
                                                <v-col cols="12" sm="6" md="2">
                                                    <div class="text-caption text-medium-emphasis">Test Start</div>
                                                    <div class="font-weight-medium">{{ formatLocalTime(record['Test Start Time']) }}</div>
                                                </v-col>
                                                <v-col cols="12" sm="6" md="2">
                                                    <div class="text-caption text-medium-emphasis">Test End</div>
                                                    <div class="font-weight-medium">{{ formatLocalTime(record['Test end Time']) }}</div>
                                                </v-col>
                                                <v-col cols="12" sm="6" md="2">
                                                    <div class="text-caption text-medium-emphasis">Test Duration</div>
                                                    <div class="font-weight-medium">{{ calculateDuration(record['Test Start Time'], record['Test end Time']) }}</div>
                                                </v-col>
                                            </v-row>

                                            <!-- Search Box and Filter Items Row -->
                                            <v-row class="mb-3" dense>
                                                <v-col cols="12" md="6">
                                                    <v-combobox
                                                        v-model="testItemSearchTerms[`${stationGroup.stationName}-${recordIndex}`]"
                                                        label="Search Test Items (Regex, OR logic)"
                                                        prepend-inner-icon="mdi-magnify"
                                                        variant="outlined" density="compact" hide-details
                                                        multiple chips closable-chips clearable
                                                        placeholder="Type pattern and press Enter (e.g., tx, rx)...">
                                                        <template #chip="{ props, item }">
                                                            <v-chip v-bind="props" :text="String(item.value || item)" size="small" color="primary" />
                                                        </template>
                                                    </v-combobox>
                                                </v-col>
                                                <v-col cols="12" md="6">
                                                    <div class="d-flex align-center flex-wrap gap-2 h-100">
                                                        <span class="text-caption text-medium-emphasis">Filter:</span>
                                                        <v-chip-group v-model="testItemFilters[`${stationGroup.stationName}-${recordIndex}`]" mandatory class="flex-grow-1">
                                                            <v-chip value="all" filter label variant="outlined" color="primary" size="small">
                                                                All
                                                            </v-chip>
                                                            <v-chip value="value" filter label variant="outlined" color="success" size="small">
                                                                Value
                                                            </v-chip>
                                                            <v-chip value="non-value" filter label variant="outlined" color="warning" size="small">
                                                                Non-Value
                                                            </v-chip>
                                                            <v-chip value="bin" filter label variant="outlined" color="info" size="small">
                                                                Bin
                                                            </v-chip>
                                                        </v-chip-group>
                                                    </div>
                                                </v-col>
                                            </v-row>

                                            <!-- Test Items Table (scrollable with sticky header/footer) -->
                                            <v-data-table :headers="testItemHeaders"
                                                :items="filterAndSearchTestItems(record.TestItem, `${stationGroup.stationName}-${recordIndex}`)"
                                                :items-per-page="25" density="compact" fixed-header
                                                height="400" class="elevation-1 v-table--striped">
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
                                                Showing {{ filterAndSearchTestItems(record.TestItem,
                                                    `${stationGroup.stationName}-${recordIndex}`).length }} of {{
                                                    record.TestItem?.length || 0 }} test items
                                            </div>
                                        </v-expansion-panel-text>
                                    </v-expansion-panel>
                                </v-expansion-panels>

                                <!-- Performance: Show More Button -->
                                <div v-if="hasMoreRecords(stationGroup)" class="text-center mt-4">
                                    <v-btn color="primary" variant="outlined" @click="showMoreRecords(stationGroup.stationName)">
                                        <v-icon start>mdi-chevron-down</v-icon>
                                        Show More ({{ getRemainingRecordsCount(stationGroup) }} remaining)
                                    </v-btn>
                                    <div class="text-caption text-medium-emphasis mt-1">
                                        Showing {{ getDisplayLimit(stationGroup.stationName) }} of {{ getFilteredStationRecords(stationGroup).length }} records
                                    </div>
                                </div>
                            </v-window-item>
                        </v-window>
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
            <v-window-item value="isn" eager>
                <IplasIsnSearchContent />
            </v-window-item>
        </v-window>

        <!-- Fullscreen Dialog -->
        <IplasTestItemsFullscreenDialog v-model="showFullscreenDialog" :record="fullscreenRecord"
            :downloading="fullscreenDownloading" @download="downloadFromFullscreen" />

        <!-- Copy Success Snackbar -->
        <v-snackbar v-model="showCopySuccess" :timeout="2000" color="success" location="top">
            <v-icon start>mdi-check</v-icon>
            Copied to clipboard!
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useIplasApi } from '@/features/dut_logs/composables/useIplasApi'
import IplasIsnSearchContent from './IplasIsnSearchContent.vue'
import IplasTestItemsFullscreenDialog from './IplasTestItemsFullscreenDialog.vue'
import type { NormalizedRecord } from './IplasTestItemsFullscreenDialog.vue'
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
const expandedPanels = ref<Record<number, number[]>>({})

// Per-station status filters (for filtering records within each station tab)
const stationStatusFilters = ref<Record<string, 'ALL' | 'PASS' | 'FAIL'>>({})

// Per-record test item filters (default to 'value')
const testItemFilters = ref<Record<string, 'all' | 'value' | 'non-value' | 'bin'>>({})
// Per-record test item status filters
const testItemStatusFilters = ref<Record<string, 'ALL' | 'PASS' | 'FAIL'>>({})
// Per-record multi-search terms (array of patterns)
const testItemSearchTerms = ref<Record<string, string[]>>({})

// Record search queries (for searching ISN, Device ID, Error Code, Error Name)
const recordSearchQueries = ref<Record<string, string>>({})

// Copy success snackbar
const showCopySuccess = ref(false)

// Station tab and device filter controls
const activeStationTab = ref(0)
const selectedFilterDeviceIds = ref<Record<string, string[]>>({})

// Performance: Limit displayed records per station group
const INITIAL_DISPLAY_LIMIT = 50
const displayLimits = ref<Record<string, number>>({})

function getDisplayLimit(stationName: string): number {
    return displayLimits.value[stationName] || INITIAL_DISPLAY_LIMIT
}

function showMoreRecords(stationName: string): void {
    displayLimits.value[stationName] = (displayLimits.value[stationName] || INITIAL_DISPLAY_LIMIT) + 50
}

// Copy to clipboard function
async function copyToClipboard(text: string): Promise<void> {
    if (!text) return
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text)
        } else {
            // Fallback for older browsers or non-HTTPS contexts
            const textArea = document.createElement('textarea')
            textArea.value = text
            textArea.style.position = 'fixed'
            textArea.style.left = '-9999px'
            document.body.appendChild(textArea)
            textArea.select()
            document.execCommand('copy')
            document.body.removeChild(textArea)
        }
        showCopySuccess.value = true
    } catch (err) {
        console.error('Failed to copy:', err)
    }
}

// Download controls
const selectedRecordKeys = ref<Set<string>>(new Set())
const downloadingKey = ref<string | null>(null)

// Fullscreen dialog controls
const showFullscreenDialog = ref(false)
const fullscreenRecord = ref<NormalizedRecord | null>(null)
const fullscreenOriginalRecord = ref<CsvTestItemData | null>(null)
const fullscreenDownloading = ref(false)

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

// Helper functions for station sub-tabs and device ID filtering
function getUniqueDeviceIdsForStation(stationGroup: StationGroup): string[] {
    return [...new Set(stationGroup.records.map(r => r.DeviceId))]
}

function getFilteredStationRecords(stationGroup: StationGroup): CsvTestItemData[] {
    let records = stationGroup.records

    // Apply per-station status filter (ALL/PASS/FAIL)
    const statusFilter = stationStatusFilters.value[stationGroup.stationName] || 'ALL'
    if (statusFilter !== 'ALL') {
        records = records.filter(r => r['Test Status'] === statusFilter)
    }

    // Apply device ID filter
    const filterIds = selectedFilterDeviceIds.value[stationGroup.stationName]
    if (filterIds && filterIds.length > 0) {
        records = records.filter(r => filterIds.includes(r.DeviceId))
    }

    // Apply record search filter (ISN, Device ID, Error Code, Error Name)
    const searchQuery = recordSearchQueries.value[stationGroup.stationName]?.toLowerCase().trim()
    if (searchQuery) {
        records = records.filter(r =>
            (r.ISN?.toLowerCase() || '').includes(searchQuery) ||
            (r.DeviceId?.toLowerCase() || '').includes(searchQuery) ||
            (r.ErrorCode?.toLowerCase() || '').includes(searchQuery) ||
            (r.ErrorName?.toLowerCase() || '').includes(searchQuery)
        )
    }

    return records
}

// Performance: Get limited records for display to avoid rendering thousands of items
function getDisplayedStationRecords(stationGroup: StationGroup): CsvTestItemData[] {
    const filtered = getFilteredStationRecords(stationGroup)
    const limit = getDisplayLimit(stationGroup.stationName)
    return filtered.slice(0, limit)
}

function hasMoreRecords(stationGroup: StationGroup): boolean {
    const filtered = getFilteredStationRecords(stationGroup)
    const limit = getDisplayLimit(stationGroup.stationName)
    return filtered.length > limit
}

function getRemainingRecordsCount(stationGroup: StationGroup): number {
    const filtered = getFilteredStationRecords(stationGroup)
    const limit = getDisplayLimit(stationGroup.stationName)
    return Math.max(0, filtered.length - limit)
}

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

function isBinData(item: TestItem): boolean {
    const value = item.VALUE?.toUpperCase() || ''
    const status = item.STATUS?.toUpperCase() || ''
    return (status === 'PASS' || status === 'FAIL' || status === '-1') &&
        (value === 'PASS' || value === 'FAIL' || value === '-999')
}

function isNonValueData(item: TestItem): boolean {
    return !isValueData(item) && !isBinData(item)
}

function filterTestItemsByType(items: TestItem[] | undefined, filterType: 'all' | 'value' | 'non-value' | 'bin'): TestItem[] {
    if (!items) return []

    switch (filterType) {
        case 'value':
            return items.filter(isValueData)
        case 'non-value':
            return items.filter(isNonValueData)
        case 'bin':
            return items.filter(isBinData)
        default:
            return items
    }
}

function filterAndSearchTestItems(items: TestItem[] | undefined, key: string): TestItem[] {
    // Get per-record filter (default to 'value')
    const filterType = testItemFilters.value[key] || 'value'
    let filtered = filterTestItemsByType(items, filterType)

    // Apply test item status filter (PASS/FAIL)
    const statusFilter = testItemStatusFilters.value[key] || 'ALL'
    if (statusFilter !== 'ALL') {
        filtered = filtered.filter(item => item.STATUS === statusFilter)
    }
    
    // Get per-record search terms (multi-pattern regex with OR logic)
    const searchTerms = testItemSearchTerms.value[key] || []
    if (searchTerms.length > 0) {
        filtered = filtered.filter(item => {
            const searchableText = `${item.NAME || ''} ${item.STATUS || ''} ${item.VALUE || ''}`.toLowerCase()
            // OR logic: at least one search term must match
            return searchTerms.some(term => {
                const trimmedTerm = term.trim().toLowerCase()
                if (!trimmedTerm) return false
                try {
                    const regex = new RegExp(trimmedTerm, 'i')
                    return regex.test(searchableText)
                } catch {
                    // If regex is invalid, fall back to simple includes
                    return searchableText.includes(trimmedTerm)
                }
            })
        })
    }
    return filtered
}

function formatLocalTime(utcTimeStr: string): string {
    if (!utcTimeStr) return '-'
    try {
        const utcDate = new Date(utcTimeStr.replace(' ', 'T') + 'Z')
        return utcDate.toLocaleString(undefined, {
            year: 'numeric',
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
    // Get total visible (filtered + limited) records count
    const visibleRecordKeys = new Set<string>()
    for (const group of groupedByStation.value) {
        const displayedRecords = getDisplayedStationRecords(group)
        for (let i = 0; i < displayedRecords.length; i++) {
            visibleRecordKeys.add(`${group.stationName}::${i}`)
        }
    }

    // Check if all visible records are selected
    const allVisibleSelected = [...visibleRecordKeys].every(key => selectedRecordKeys.value.has(key))

    if (allVisibleSelected && visibleRecordKeys.size > 0) {
        // Deselect all visible records
        for (const key of visibleRecordKeys) {
            selectedRecordKeys.value.delete(key)
        }
    } else {
        // Select all visible records
        for (const key of visibleRecordKeys) {
            selectedRecordKeys.value.add(key)
        }
    }
}

// Get count of visible records for Select All label
const visibleRecordsCount = computed(() => {
    let count = 0
    for (const group of groupedByStation.value) {
        count += getDisplayedStationRecords(group).length
    }
    return count
})

// Check if all visible records are selected
const allVisibleSelected = computed(() => {
    if (visibleRecordsCount.value === 0) return false
    for (const group of groupedByStation.value) {
        const displayedRecords = getDisplayedStationRecords(group)
        for (let i = 0; i < displayedRecords.length; i++) {
            if (!selectedRecordKeys.value.has(`${group.stationName}::${i}`)) {
                return false
            }
        }
    }
    return true
})

// Fullscreen functions
function normalizeStationRecord(record: CsvTestItemData): NormalizedRecord {
    return {
        isn: record.ISN,
        deviceId: record.DeviceId,
        stationName: record.station,
        displayStationName: record.TSP || record.station,
        tsp: record.TSP,
        site: record.Site,
        project: record.Project,
        line: record.Line,
        errorCode: record.ErrorCode,
        errorName: record.ErrorName,
        testStatus: record['Test Status'],
        testStartTime: record['Test Start Time'],
        testEndTime: record['Test end Time'],
        testItems: record.TestItem || []
    }
}

function openFullscreen(record: CsvTestItemData): void {
    fullscreenOriginalRecord.value = record
    fullscreenRecord.value = normalizeStationRecord(record)
    showFullscreenDialog.value = true
}

async function downloadFromFullscreen(): Promise<void> {
    if (!fullscreenOriginalRecord.value || !selectedSite.value || !selectedProject.value) return
    fullscreenDownloading.value = true
    try {
        const attachmentInfo = createAttachmentInfo(fullscreenOriginalRecord.value)
        await downloadAttachments(selectedSite.value, selectedProject.value, [attachmentInfo])
    } catch (err) {
        console.error('Failed to download test log:', err)
    } finally {
        fullscreenDownloading.value = false
    }
}

/**
 * Format time for v1 API download (get_csv_testitem data)
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

        // Use display_station_name for API request as per API documentation
        await fetchTestItemsApi(
            selectedSite.value,
            selectedProject.value,
            stationInfo.display_station_name,
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

.cursor-pointer {
    cursor: pointer;
}

/* Striped table styling */
:deep(.v-table--striped tbody tr:nth-of-type(even)) {
    background-color: rgba(0, 0, 0, 0.02);
}

:deep(.v-theme--dark .v-table--striped tbody tr:nth-of-type(even)) {
    background-color: rgba(255, 255, 255, 0.02);
}
</style>
