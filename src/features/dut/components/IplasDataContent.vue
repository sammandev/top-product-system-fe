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
                        <!-- UPDATED: Added iPLAS Settings button and Refresh button -->
                        <div class="d-flex gap-2">
                            <v-btn color="white" variant="outlined" size="small" prepend-icon="mdi-cog"
                                @click="emit('show-settings')">
                                iPLAS Settings
                            </v-btn>
                            <v-btn color="white" variant="outlined" size="small" prepend-icon="mdi-refresh"
                                :loading="loading" @click="handleRefresh">
                                Refresh
                            </v-btn>
                        </div>
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
                                <v-text-field v-model="startTime" label="Start Time" type="datetime-local"
                                    variant="outlined" density="comfortable" prepend-inner-icon="mdi-calendar-start"
                                    hide-details :disabled="dateRangePreset !== 'custom'" />
                            </v-col>

                            <!-- End Time -->
                            <v-col cols="12" md="6">
                                <v-text-field v-model="endTime" label="End Time" type="datetime-local"
                                    variant="outlined" density="comfortable" prepend-inner-icon="mdi-calendar-end"
                                    hide-details :disabled="dateRangePreset !== 'custom'" />
                            </v-col>
                        </v-row>

                        <v-row class="mt-2">
                            <!-- Station Selection (Multiple) -->
                            <v-col cols="12">
                                <v-autocomplete v-model="selectedStations" :items="stationOptions"
                                    item-title="displayText" item-value="value" label="Select Test Stations (Multiple)"
                                    variant="outlined" density="comfortable" prepend-inner-icon="mdi-router-wireless"
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
                        </v-row>

                        <!-- Device ID Selection per Station -->
                        <v-row v-if="selectedStations.length > 0" class="mt-2">
                            <v-col v-for="stationValue in selectedStations" :key="stationValue" cols="12"
                                :md="selectedStations.length === 1 ? 12 : 6">
                                <v-autocomplete v-model="stationDeviceIds[stationValue]"
                                    :items="getDeviceIdsForStation(stationValue)"
                                    :label="`${getStationDisplayName(stationValue)} - Device IDs (Default All)`"
                                    variant="outlined" density="comfortable" prepend-inner-icon="mdi-chip"
                                    :loading="loadingDevicesByStation[stationValue]" multiple chips closable-chips
                                    clearable hide-details placeholder="Select Device IDs - (Empty = ALL)">
                                    <template #chip="{ props, item }">
                                        <v-chip v-bind="props" :text="item.value" size="small" />
                                    </template>
                                </v-autocomplete>
                            </v-col>
                        </v-row>

                        <!-- Search Test Data Section -->
                        <v-row v-if="selectedStations.length > 0" class="mt-4">
                            <v-col cols="12" class="d-flex align-center gap-3 flex-wrap">
                                <v-select v-model="testStatusFilter" :items="['ALL', 'PASS', 'FAIL']"
                                    label="Test Status" variant="outlined" density="compact" hide-details
                                    style="max-width: 150px" />

                                <!-- IndexedDB Mode Toggle -->
                                <v-tooltip location="top">
                                    <template #activator="{ props }">
                                        <v-switch v-bind="props" v-model="useIndexedDbMode" label="Stream to Disk"
                                            color="success" density="compact" hide-details class="flex-grow-0" />
                                    </template>
                                    <span>
                                        Enable IndexedDB streaming for large datasets (10,000+ records).<br>
                                        Data is stored locally on disk, reducing memory usage.
                                    </span>
                                </v-tooltip>

                                <v-btn color="primary" :loading="loadingTestItems || isStreaming"
                                    :disabled="isStreaming" @click="fetchTestItems">
                                    <v-icon start>mdi-download</v-icon>
                                    {{ useIndexedDbMode ? 'Stream' : 'Search' }} Test Data ({{ selectedStations.length
                                    }} station{{
                                        selectedStations.length > 1 ? 's' : '' }})
                                </v-btn>

                                <!-- Abort Stream Button -->
                                <v-btn v-if="isStreaming" color="error" variant="outlined" size="small"
                                    @click="abortIndexedDbStream">
                                    <v-icon start size="small">mdi-stop</v-icon>
                                    Stop Stream
                                </v-btn>

                                <!-- Chunk Progress Indicator (regular mode) -->
                                <div v-if="loadingTestItems && chunkProgress && !useIndexedDbMode"
                                    class="d-flex align-center gap-2">
                                    <v-progress-circular
                                        :model-value="(chunkProgress.fetched / chunkProgress.total) * 100" :size="24"
                                        :width="3" color="primary" />
                                    <span class="text-body-2 text-medium-emphasis">
                                        Fetching chunk {{ chunkProgress.fetched }} of {{ chunkProgress.total }}...
                                    </span>
                                </div>

                                <!-- IndexedDB Stream Progress Indicator -->
                                <div v-if="isStreaming" class="d-flex align-center gap-2">
                                    <v-progress-circular :model-value="streamProgress" :size="24" :width="3"
                                        color="success" />
                                    <span class="text-body-2 text-medium-emphasis">
                                        Streaming... {{ streamStatus.recordsWritten.toLocaleString() }} records saved
                                        <template v-if="streamStatus.totalEstimated > 0">
                                            of {{ streamStatus.totalEstimated.toLocaleString() }}
                                        </template>
                                    </span>
                                </div>
                            </v-col>
                        </v-row>
                        <!-- Possibly Truncated Warning -->
                        <v-row v-if="possiblyTruncated && hasRegularModeData" class="mt-2">
                            <v-col cols="12">
                                <v-alert type="warning" density="compact" variant="tonal" closable>
                                    <v-icon start>mdi-alert</v-icon>
                                    Results may be truncated due to iPLAS API limits. Consider narrowing your date range
                                    or filters.
                                </v-alert>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- Test Items Results (Regular Mode) -->
                <v-card v-if="!useIndexedDbMode && hasRegularModeData" elevation="2" class="mb-4">
                    <v-card-title class="d-flex align-center justify-space-between flex-wrap">
                        <div class="d-flex align-center">
                            <v-icon class="mr-2" color="info">mdi-format-list-checks</v-icon>
                            Test Results
                            <v-chip size="small" color="info" class="ml-2">{{ regularModeRecordCount }} records</v-chip>
                        </div>
                        <div class="d-flex align-center gap-2">
                            <!-- Download All (TXT + CSV) -->
                            <v-btn v-if="selectedRecordIndices.length > 0" color="secondary" variant="flat" size="small"
                                :loading="downloading || downloadingCsv" @click="downloadAllSelectedRecords">
                                <v-icon start size="small">mdi-download-multiple</v-icon>
                                Download All Logs ({{ selectedRecordIndices.length }})
                            </v-btn>
                            <!-- Bulk TXT Download -->
                            <v-btn v-if="selectedRecordIndices.length > 0" color="primary" variant="outlined"
                                size="small" :loading="downloading" @click="downloadSelectedRecords">
                                <v-icon start size="small">mdi-download-multiple</v-icon>
                                Download TXT ({{ selectedRecordIndices.length }})
                            </v-btn>
                            <!-- Bulk CSV Download -->
                            <v-btn v-if="selectedRecordIndices.length > 0" color="success" variant="outlined"
                                size="small" :loading="downloadingCsv" @click="downloadSelectedRecordsCsv">
                                <v-icon start size="small">mdi-file-delimited</v-icon>
                                Download CSV ({{ selectedRecordIndices.length }})
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
                                            label="Search Records" prepend-inner-icon="mdi-magnify" variant="outlined"
                                            density="compact" hide-details clearable
                                            placeholder="Search ISN, Device ID, Error Code, Error Name..." />
                                    </v-col>
                                    <v-col cols="12" md="2">
                                        <v-select v-model="stationStatusFilters[stationGroup.stationName]"
                                            :items="['ALL', 'PASS', 'FAIL']" label="Status" variant="outlined"
                                            density="compact" hide-details />
                                    </v-col>
                                    <v-col cols="12" md="6">
                                        <v-autocomplete v-model="selectedFilterDeviceIds[stationGroup.stationName]"
                                            :items="getUniqueDeviceIdsForStation(stationGroup)"
                                            label="Filter by Device ID" variant="outlined" density="compact"
                                            prepend-inner-icon="mdi-chip" multiple chips closable-chips clearable
                                            hide-details placeholder="All Device IDs">
                                            <template #chip="{ props, item }">
                                                <v-chip v-bind="props" :text="item.raw" size="small" />
                                            </template>
                                        </v-autocomplete>
                                    </v-col>
                                </v-row>

                                <!-- UPDATED: Client-Side Data Table with Selection (changed from server-side for better UX) -->
                                <IplasRecordTable :items="getFilteredStationRecords(stationGroup)"
                                    :total-items="getFilteredStationRecords(stationGroup).length" :loading="false"
                                    :downloading-record="downloadingKey" :downloading-csv-record="downloadingCsvKey"
                                    :selectable="true"
                                    :selected-keys="getSelectedKeysForStation(stationGroup.stationName)"
                                    :server-side="false"
                                    @update:selected-keys="(keys) => handleTableSelectionChange(stationGroup.stationName, keys)"
                                    @row-click="openFullscreen"
                                    @download="(record) => downloadSingleRecord(record, stationGroup.stationName, 0)"
                                    @download-csv="(record) => downloadCsvRecord(record, stationGroup.stationName, 0)" />
                            </v-window-item>
                        </v-window>
                    </v-card-text>
                </v-card>

                <!-- IndexedDB Mode Results -->
                <v-card v-if="useIndexedDbMode && (indexedDbTotalItems > 0 || isStreaming)" elevation="2" class="mb-4">
                    <v-card-title class="d-flex align-center justify-space-between flex-wrap">
                        <div class="d-flex align-center">
                            <v-icon class="mr-2" color="success">mdi-database</v-icon>
                            IndexedDB Results
                            <v-chip size="small" color="success" class="ml-2" variant="outlined">
                                <v-icon start size="small">mdi-harddisk</v-icon>
                                {{ indexedDbTotalItems.toLocaleString() }} records on disk
                            </v-chip>
                            <v-chip v-if="isStreaming" size="small" color="warning" class="ml-2">
                                <v-icon start size="small">mdi-loading mdi-spin</v-icon>
                                Streaming...
                            </v-chip>
                        </div>
                        <div class="d-flex align-center gap-2">
                            <!-- Bulk TXT Download for IndexedDB -->
                            <v-btn v-if="indexedDbSelectedKeys.length > 0" color="primary" variant="outlined"
                                size="small" :loading="downloading" @click="downloadIndexedDbSelectedRecords">
                                <v-icon start size="small">mdi-download-multiple</v-icon>
                                Download TXT ({{ indexedDbSelectedKeys.length }})
                            </v-btn>
                            <!-- Bulk CSV Download for IndexedDB -->
                            <v-btn v-if="indexedDbSelectedKeys.length > 0" color="success" variant="outlined"
                                size="small" :loading="downloadingCsv" @click="downloadIndexedDbSelectedRecordsCsv">
                                <v-icon start size="small">mdi-file-delimited</v-icon>
                                Download CSV ({{ indexedDbSelectedKeys.length }})
                            </v-btn>
                        </div>
                    </v-card-title>
                    <v-card-text>
                        <!-- Stream Status Alert -->
                        <v-alert v-if="streamStatus.error" type="error" class="mb-4" closable>
                            {{ streamStatus.error }}
                        </v-alert>

                        <!-- Station Tabs for IndexedDB Results -->
                        <v-tabs v-if="indexedDbStationList.length > 0 && !isStreaming"
                            v-model="indexedDbActiveStationTab" color="secondary" class="mb-4" show-arrows>
                            <v-tab :value="0">
                                <v-icon start size="small">mdi-view-list</v-icon>
                                All Stations
                                <v-chip size="x-small" color="info" class="ml-2">{{ indexedDbTotalItems }}</v-chip>
                            </v-tab>
                            <v-tab v-for="(stationName, index) in indexedDbStationList" :key="stationName"
                                :value="index + 1">
                                <v-icon start size="small">mdi-router-wireless</v-icon>
                                {{ stationName }}
                            </v-tab>
                        </v-tabs>

                        <!-- IndexedDB Table using v-data-table (client-side pagination) -->
                        <v-data-table v-model="indexedDbSelectedKeys"
                            v-model:items-per-page="indexedDbTableOptions.itemsPerPage"
                            v-model:page="indexedDbTableOptions.page" v-model:sort-by="indexedDbTableOptions.sortBy"
                            :headers="indexedDbHeaders" :items="indexedDbItems"
                            :loading="indexedDbLoading || isStreaming" item-value="id" show-select hover
                            class="elevation-1" @click:row="handleIndexedDbRowClick">
                            <!-- ISN Column with Copy Button -->
                            <template #item.ISN="{ item }">
                                <div class="d-flex align-center gap-1">
                                    <v-btn icon size="x-small" variant="text" color="primary"
                                        @click.stop="copyToClipboard(item.ISN)">
                                        <v-icon size="small">mdi-content-copy</v-icon>
                                        <v-tooltip activator="parent" location="top">Copy ISN</v-tooltip>
                                    </v-btn>
                                    <span class="font-weight-medium cursor-pointer">{{ item.ISN || '-' }}</span>
                                </div>
                            </template>

                            <!-- Device ID Column -->
                            <template #item.DeviceId="{ item }">
                                <v-chip size="x-small" color="secondary" variant="outlined" class="cursor-pointer"
                                    @click.stop="copyToClipboard(item.DeviceId)">
                                    {{ item.DeviceId }}
                                    <v-tooltip activator="parent" location="top">Click to copy</v-tooltip>
                                </v-chip>
                            </template>

                            <!-- Test End Time Column -->
                            <template #item.TestEndTime="{ item }">
                                {{ item.TestEndTime ? adjustIplasDisplayTime(item.TestEndTime, 1) :
                                    adjustIplasDisplayTime(item.TestStartTime, 1) }}
                            </template>

                            <!-- Duration Column -->
                            <template #item.Duration="{ item }">
                                <v-chip size="x-small" variant="outlined">
                                    {{ calculateIndexedDbDuration(item) }}
                                </v-chip>
                            </template>

                            <!-- Status Column -->
                            <template #item.TestStatus="{ item }">
                                <v-chip :color="item.TestStatus === 'PASS' ? 'success' : 'error'" size="x-small">
                                    {{ item.TestStatus }}
                                </v-chip>
                            </template>

                            <!-- Actions Column -->
                            <template #item.actions="{ item }">
                                <div class="d-flex gap-1">
                                    <v-btn icon size="x-small" variant="outlined" color="primary" :loading="downloading"
                                        @click.stop="downloadIndexedDbRecord(item)">
                                        <v-icon size="small">mdi-download</v-icon>
                                        <v-tooltip activator="parent" location="top">Download Test Log</v-tooltip>
                                    </v-btn>
                                </div>
                            </template>

                            <!-- No Data Template (during streaming) -->
                            <template #no-data>
                                <div v-if="isStreaming" class="text-center py-4">
                                    <v-progress-circular indeterminate color="success" size="32" />
                                    <div class="text-body-2 mt-2 text-medium-emphasis">
                                        Streaming data to disk...
                                        <br>
                                        {{ streamStatus.recordsWritten.toLocaleString() }} records saved
                                    </div>
                                </div>
                                <div v-else class="text-center py-4">
                                    <v-icon size="48" color="grey">mdi-database-off-outline</v-icon>
                                    <div class="text-h6 mt-2 text-grey">No data in IndexedDB</div>
                                    <div class="text-body-2 text-grey">Start a search with "Stream to Disk" enabled
                                    </div>
                                </div>
                            </template>

                            <!-- Loading Template -->
                            <template #loading>
                                <v-skeleton-loader type="table-row@5" />
                            </template>
                        </v-data-table>
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
                                    <div class="text-caption text-medium-emphasis">Stations (based on Selected Project)
                                    </div>
                                </div>
                            </v-col>
                            <v-col cols="6" sm="3">
                                <div class="text-center">
                                    <div class="text-h4 font-weight-bold text-info">{{ totalDeviceCount }}</div>
                                    <div class="text-caption text-medium-emphasis">Devices (based on Selected Station)
                                    </div>
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

        <!-- Test Items Details Dialog -->
        <TopProductIplasDetailsDialog v-model="showFullscreenDialog" :record="fullscreenRecord"
            :downloading="fullscreenDownloading" :loading-test-items="loadingFullscreenTestItems"
            @download="downloadFromFullscreen" />

        <!-- Copy Success Snackbar -->
        <v-snackbar v-model="showCopySuccess" :timeout="2000" color="success" location="bottom">
            <v-icon start>mdi-check</v-icon>
            Copied to clipboard!
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useIplasApi } from '@/features/dut_logs/composables/useIplasApi'
import { useIplasSettings } from '@/features/dut_logs/composables/useIplasSettings'
import { useIplasLocalData } from '@/features/dut_logs/composables/useIplasLocalData'
import { adjustIplasDisplayTime } from '@/shared/utils/helpers'
import IplasIsnSearchContent from './IplasIsnSearchContent.vue'
import TopProductIplasDetailsDialog from './TopProductIplasDetailsDialog.vue'
import IplasRecordTable from './IplasRecordTable.vue'
import type { NormalizedRecord } from './IplasTestItemsFullscreenDialog.vue'
import type { Station, TestItem, CsvTestItemData, DownloadAttachmentInfo } from '@/features/dut_logs/api/iplasApi'
import type { CompactCsvTestItemData } from '@/features/dut_logs/api/iplasProxyApi'
import type { DownloadCsvLogInfo } from '@/features/dut_logs/composables/useIplasApi'

// UPDATED: Define emits for iPLAS Settings button
const emit = defineEmits<{
    (e: 'show-settings'): void
}>()

// Station group - now supports both full and compact records
interface StationGroup {
    stationName: string
    displayName: string
    records: (CsvTestItemData | CompactCsvTestItemData)[]
}

// Search mode tab - persisted in URL
import { useTabPersistence } from '@/shared/composables/useTabPersistence'
const searchMode = useTabPersistence<'station' | 'isn'>('subTab', 'station')

const {
    loading,
    loadingStations,
    loadingTestItems,
    downloading,
    error,
    chunkProgress,
    possiblyTruncated,
    siteProjects,
    stations,
    testItemData,
    compactTestItemData,
    uniqueSites,
    projectsBySite,
    fetchSiteProjects,
    fetchStations,
    fetchDeviceIds,
    fetchTestItems: fetchTestItemsApi,
    fetchTestItemsCompact,
    fetchTestItemsPaginated,
    fetchRecordTestItems,
    downloadAttachments,
    downloadCsvLogs,
    batchDownloadLogs,
    clearTestItemData
} = useIplasApi()

// Selection state
const selectedSite = ref<string | null>(null)
const selectedProject = ref<string | null>(null)
const selectedStations = ref<string[]>([])
// Per-station device ID selection (key is station value from selectedStations)
const stationDeviceIds = ref<Record<string, string[]>>({})
// Loading state per station
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

// Device IDs grouped by station
const deviceIdsByStation = ref<Record<string, string[]>>({})

// Mode: 'full' loads complete records, 'compact' uses lazy loading for test items
// Compact mode is more memory efficient for large datasets
const useCompactMode = ref(true)

// Computed: Check if there's regular mode data (either testItemData or compactTestItemData)
const hasRegularModeData = computed(() => {
    return testItemData.value.length > 0 || compactTestItemData.value.length > 0
})

// Computed: Get the total count of regular mode records
const regularModeRecordCount = computed(() => {
    return useCompactMode.value && compactTestItemData.value.length > 0
        ? compactTestItemData.value.length
        : testItemData.value.length
})

// IndexedDB Mode: Stream data directly to disk instead of keeping in memory
// This is the most memory-efficient mode for large datasets (10,000+ records)
const useIndexedDbMode = ref(false)

// ============================================================================
// IndexedDB Mode Setup (Stream-to-Disk Architecture)
// ============================================================================

// Initialize the local data composable for IndexedDB table integration
const {
    items: indexedDbItems,
    totalItems: indexedDbTotalItems,
    loading: indexedDbLoading,
    tableOptions: indexedDbTableOptions,
    streamStatus,
    isStreaming,
    streamProgress,
    loadItems: loadIndexedDbItems,
    loadAllItems: loadAllIndexedDbItems,
    streamData: streamToIndexedDb,
    abortStream: abortIndexedDbStream,
    updateFilter: updateIndexedDbFilter
} = useIplasLocalData({
    initialItemsPerPage: 25,
    filterDebounceMs: 300
})

// Server-side pagination state (for table view mode)
const serverPaginationState = ref<Record<string, {
    page: number
    itemsPerPage: number
    sortBy: string
    sortDesc: boolean
    items: (CsvTestItemData | CompactCsvTestItemData)[]
    totalItems: number
    loading: boolean
}>>({})

// Local cache for lazy-loaded test items (keyed by ISN_TestStartTime)
const lazyLoadedTestItems = ref<Map<string, TestItem[]>>(new Map())
// Track which records are loading test items
const loadingTestItemsForRecord = ref<Set<string>>(new Set())
// Helper function to format date for datetime-local input
function getLocalTimeString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Get date range based on preset selection
 * Current Shift: 06:50:00 - 20:00:00 (Day) or 20:00:00 - 06:50:00 next day (Night)
 * Today: 00:00:01 - 23:59:59
 * Yesterday: Same as today but yesterday
 * Week: Current week 00:00:01 - 23:59:59
 * Last Week: Monday - Sunday last week
 * Month: Current month
 */
function getDateRangeForPreset(preset: string): { start: Date; end: Date } {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinutes = now.getMinutes()

    switch (preset) {
        case 'current_shift': {
            // Day Shift: 06:50:00 - 20:00:00
            // Night Shift: 20:00:00 - 06:50:00 (next day)
            const isDayShift = currentHour > 6 || (currentHour === 6 && currentMinutes >= 50)
            const isBeforeNightEnd = currentHour < 6 || (currentHour === 6 && currentMinutes < 50)

            if (isDayShift && currentHour < 20) {
                // Currently in day shift
                const start = new Date(now)
                start.setHours(6, 50, 0, 0)
                const end = new Date(now)
                end.setHours(20, 0, 0, 0)
                return { start, end }
            } else if (isBeforeNightEnd) {
                // Currently in night shift (before 06:50 AM)
                const start = new Date(now)
                start.setDate(start.getDate() - 1)
                start.setHours(20, 0, 0, 0)
                const end = new Date(now)
                end.setHours(6, 50, 0, 0)
                return { start, end }
            } else {
                // After 20:00 - start of night shift
                const start = new Date(now)
                start.setHours(20, 0, 0, 0)
                const end = new Date(now)
                end.setDate(end.getDate() + 1)
                end.setHours(6, 50, 0, 0)
                return { start, end }
            }
        }
        case 'today': {
            const start = new Date(now)
            start.setHours(0, 0, 1, 0)
            const end = new Date(now)
            end.setHours(23, 59, 59, 0)
            return { start, end }
        }
        case 'yesterday': {
            const start = new Date(now)
            start.setDate(start.getDate() - 1)
            start.setHours(0, 0, 1, 0)
            const end = new Date(now)
            end.setDate(end.getDate() - 1)
            end.setHours(23, 59, 59, 0)
            return { start, end }
        }
        case 'week': {
            // Start from Monday of current week
            const dayOfWeek = now.getDay()
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Sunday is 0, Monday is 1
            const start = new Date(now)
            start.setDate(start.getDate() + diff)
            start.setHours(0, 0, 1, 0)
            const end = new Date(now)
            end.setHours(23, 59, 59, 0)
            return { start, end }
        }
        case 'last_week': {
            // Last Monday to Last Sunday
            const dayOfWeek = now.getDay()
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
            const start = new Date(now)
            start.setDate(start.getDate() + diff - 7) // Last Monday
            start.setHours(0, 0, 1, 0)
            const end = new Date(start)
            end.setDate(end.getDate() + 6) // Last Sunday
            end.setHours(23, 59, 59, 0)
            return { start, end }
        }
        case 'month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1)
            start.setHours(0, 0, 1, 0)
            const end = new Date(now)
            end.setHours(23, 59, 59, 0)
            return { start, end }
        }
        default: {
            // Custom - return current values
            return { start: now, end: now }
        }
    }
}

/**
 * Apply selected date range preset
 */
function applyDateRangePreset(preset: string): void {
    if (preset === 'custom') {
        // Don't change times for custom selection
        return
    }

    const { start, end } = getDateRangeForPreset(preset)
    startTime.value = getLocalTimeString(start)
    endTime.value = getLocalTimeString(end)
}

// Time range - initialize with current shift
const { start: initialStart, end: initialEnd } = getDateRangeForPreset('current_shift')
const startTime = ref(getLocalTimeString(initialStart))
const endTime = ref(getLocalTimeString(initialEnd))

// Display controls
const testStatusFilter = ref<'ALL' | 'PASS' | 'FAIL'>('ALL')

// Per-station status filters (for filtering records within each station tab)
const stationStatusFilters = ref<Record<string, 'ALL' | 'PASS' | 'FAIL'>>({})

// Per-record test item filters (default to 'value') - supports multiple selections
const testItemFilters = ref<Record<string, ('all' | 'value' | 'non-value' | 'bin')[]>>({})
// Per-record test item status filters
const testItemStatusFilters = ref<Record<string, 'ALL' | 'PASS' | 'FAIL'>>({})
// Per-record multi-search terms (array of patterns)
const testItemSearchTerms = ref<Record<string, string[]>>({})

// Record search queries (for searching ISN, Device ID, Error Code, Error Name)
const recordSearchQueries = ref<Record<string, string>>({})
// Debounced search queries for performance
const debouncedRecordSearchQueries = ref<Record<string, string>>({})

// Debounce search query updates (300ms delay)
const updateDebouncedSearch = useDebounceFn((stationName: string, value: string) => {
    debouncedRecordSearchQueries.value = {
        ...debouncedRecordSearchQueries.value,
        [stationName]: value
    }
}, 300)

// Watch for search query changes and debounce
watch(recordSearchQueries, (newQueries) => {
    Object.entries(newQueries).forEach(([stationName, value]) => {
        updateDebouncedSearch(stationName, value)
    })
}, { deep: true })

// Copy success snackbar
const showCopySuccess = ref(false)

// Station tab and device filter controls
const activeStationTab = ref(0)
const selectedFilterDeviceIds = ref<Record<string, string[]>>({})

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

// Helper functions for per-station device IDs
function getDeviceIdsForStation(stationValue: string): string[] {
    return deviceIdsByStation.value[stationValue] || []
}

function getStationDisplayName(stationValue: string): string {
    const station = stations.value.find((s: Station) => s.display_station_name === stationValue)
    return station?.display_station_name || stationValue
}

// Download controls
const selectedRecordKeys = ref<Set<string>>(new Set())
const downloadingKey = ref<string | null>(null)
const downloadingCsvKey = ref<string | null>(null)
const downloadingCsv = ref(false)

// Fullscreen dialog controls
const showFullscreenDialog = ref(false)
const fullscreenRecord = ref<NormalizedRecord | null>(null)
const fullscreenOriginalRecord = ref<CsvTestItemData | null>(null)
const fullscreenDownloading = ref(false)
const loadingFullscreenTestItems = ref(false)

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

const totalDeviceCount = computed(() => {
    let count = 0
    for (const deviceList of Object.values(deviceIdsByStation.value)) {
        count += deviceList.length
    }
    return count
})

const selectedRecordIndices = computed(() => {
    return Array.from(selectedRecordKeys.value)
})

const groupedByStation = computed<StationGroup[]>(() => {
    const groups: Record<string, StationGroup> = {}

    // Choose data source based on mode
    const sourceData = useCompactMode.value && compactTestItemData.value.length > 0
        ? compactTestItemData.value
        : testItemData.value

    for (const record of sourceData) {
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

    // Sort records within each group by Test end Time descending (latest first)
    for (const group of Object.values(groups)) {
        group.records.sort((a, b) => {
            const timeA = new Date(a['Test end Time']).getTime()
            const timeB = new Date(b['Test end Time']).getTime()
            return timeB - timeA // Latest first
        })
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

// Headers for IndexedDB table - User requested columns:
// Checkbox (via show-select), ISN, Device ID, Test End, Duration, Status, Actions
const indexedDbHeaders = [
    { title: 'ISN', key: 'ISN', sortable: true, width: '180px' },
    { title: 'Device ID', key: 'DeviceId', sortable: true, width: '100px' },
    { title: 'Test End', key: 'TestEndTime', sortable: true, width: '160px' },
    { title: 'Duration', key: 'Duration', sortable: false, width: '90px' },
    { title: 'Status', key: 'TestStatus', sortable: true, width: '90px' },
    { title: 'Actions', key: 'actions', sortable: false, width: '100px' }
]

// Selected keys for IndexedDB table (for bulk download)
const indexedDbSelectedKeys = ref<string[]>([])

// Active station tab for IndexedDB results
const indexedDbActiveStationTab = ref(0)

// Get distinct stations from IndexedDB data
const indexedDbStationList = computed(() => {
    const stations = new Set<string>()
    for (const item of indexedDbItems.value) {
        if (item.Station) {
            stations.add(item.Station)
        }
    }
    return Array.from(stations).sort()
})

// Calculate duration for IndexedDB records
function calculateIndexedDbDuration(record: typeof indexedDbItems.value[0]): string {
    // First try to use pre-calculated TestDuration
    if (record.TestDuration && record.TestDuration > 0) {
        const mins = Math.floor(record.TestDuration / 60)
        const secs = record.TestDuration % 60
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    }

    // Fallback: calculate from TestStartTime and TestEndTime
    const startTime = record.TestStartTime
    const endTime = record.TestEndTime
    if (startTime && endTime) {
        try {
            const start = new Date(startTime).getTime()
            const end = new Date(endTime).getTime()
            const diffSecs = Math.floor((end - start) / 1000)
            if (diffSecs >= 0) {
                const mins = Math.floor(diffSecs / 60)
                const secs = diffSecs % 60
                return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
            }
        } catch {
            // Ignore parse errors
        }
    }
    return '-'
}

// Get record key for IndexedDB records
function getIndexedDbRecordKey(record: typeof indexedDbItems.value[0]): string {
    return record.id || `${record.ISN}_${record.TestStartTime}`
}

// Handle IndexedDB row click to show details dialog
async function handleIndexedDbRowClick(_event: Event, { item }: { item: typeof indexedDbItems.value[0] }): Promise<void> {
    if (!selectedSite.value || !selectedProject.value) return

    // Get station from record - use Station field for API calls (not TSP)
    // Per iPLAS API docs: "station" is used to make requests, "TSP" is display only
    const station = item.Station || (indexedDbStationList.value[indexedDbActiveStationTab.value - 1] ?? '')

    if (!station) {
        console.error('Cannot fetch record test items: station is undefined')
        return
    }

    // Fetch test items for this record
    const testItems = await fetchRecordTestItems(
        selectedSite.value,
        selectedProject.value,
        station,
        item.ISN,
        item.TestStartTime,
        item.DeviceId
    )

    // Create normalized record for dialog
    const normalizedRecord: NormalizedRecord = {
        isn: item.ISN,
        deviceId: item.DeviceId,
        stationName: item.Station,
        displayStationName: item.Station,
        tsp: item.Station,
        site: item.Site,
        project: item.Project,
        line: item.Slot || '',
        errorCode: item.ErrorCode || '',
        errorName: item.ErrorName || '',
        testStatus: item.TestStatus,
        testStartTime: item.TestStartTime,
        testEndTime: item.TestStartTime, // Will be computed from duration
        testItems: testItems || []
    }

    fullscreenRecord.value = normalizedRecord
    showFullscreenDialog.value = true
}

// Download selected IndexedDB records
async function downloadIndexedDbSelectedRecords(): Promise<void> {
    if (!selectedSite.value || !selectedProject.value || indexedDbSelectedKeys.value.length === 0) return

    try {
        const attachments: DownloadAttachmentInfo[] = []

        for (const item of indexedDbItems.value) {
            const key = getIndexedDbRecordKey(item)
            if (indexedDbSelectedKeys.value.includes(key)) {
                // Use ISN if available, otherwise use DeviceId
                const isn = item.ISN && item.ISN.trim() !== '' ? item.ISN : item.DeviceId
                // Use TestEndTime for download API (required format), fallback to TestStartTime
                const timeField = item.TestEndTime || item.TestStartTime
                attachments.push({
                    isn,
                    time: formatTimeForDownload(timeField),
                    deviceid: item.DeviceId,
                    station: item.Station || ''
                })
            }
        }

        if (attachments.length > 0) {
            console.log('Download IndexedDB attachments:', attachments)
            await downloadAttachments(selectedSite.value, selectedProject.value, attachments)
        }
    } catch (err) {
        console.error('Failed to download IndexedDB test logs:', err)
    }
}

// Download selected IndexedDB records as CSV files
async function downloadIndexedDbSelectedRecordsCsv(): Promise<void> {
    if (!selectedSite.value || !selectedProject.value || indexedDbSelectedKeys.value.length === 0) return

    downloadingCsv.value = true

    try {
        const csvContents: { content: string; filename: string }[] = []

        for (const item of indexedDbItems.value) {
            const key = getIndexedDbRecordKey(item)
            if (!indexedDbSelectedKeys.value.includes(key)) continue

            // Get station from indexedDbStationList if not available
            // Use Station field for API calls (not TSP) per iPLAS API docs
            const station = item.Station || indexedDbStationList.value[indexedDbActiveStationTab.value - 1] || ''

            // Fetch test items
            const testItems = await fetchRecordTestItems(
                selectedSite.value,
                selectedProject.value,
                station,
                item.DeviceId,
                item.TestStartTime,
                item.TestEndTime || item.TestStartTime
            )

            if (testItems && testItems.length > 0) {
                // Create a mock record for CSV conversion
                const mockRecord: CsvTestItemData = {
                    Site: selectedSite.value,
                    Project: selectedProject.value,
                    station,
                    TSP: station,
                    Model: '',
                    MO: '',
                    Line: '',
                    ISN: item.ISN || item.DeviceId,
                    DeviceId: item.DeviceId,
                    'Test Status': item.TestStatus,
                    'Test Start Time': item.TestStartTime,
                    'Test end Time': item.TestEndTime || item.TestStartTime,
                    ErrorCode: item.ErrorCode || '',
                    ErrorName: item.ErrorName || '',
                    TestItem: testItems
                }

                const csvContent = convertTestItemsToCsv(mockRecord, testItems)
                const timestamp = item.TestStartTime.replace(/[\/:]/g, '_').replace(/ /g, '_')
                const filename = `${item.ISN || item.DeviceId}_${timestamp}_test_items.csv`
                csvContents.push({ content: csvContent, filename })
            }
        }

        // Download all CSVs
        for (const { content, filename } of csvContents) {
            downloadCsvFile(content, filename)
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        console.log(`Downloaded ${csvContents.length} CSV files from IndexedDB`)
    } catch (err) {
        console.error('Failed to download IndexedDB CSV files:', err)
    } finally {
        downloadingCsv.value = false
    }
}

// Download single IndexedDB record
async function downloadIndexedDbRecord(record: typeof indexedDbItems.value[0]): Promise<void> {
    if (!selectedSite.value || !selectedProject.value) return

    try {
        const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
        // Use TestEndTime for download API (required format), fallback to TestStartTime
        const timeField = record.TestEndTime || record.TestStartTime
        const attachmentInfo: DownloadAttachmentInfo = {
            isn,
            time: formatTimeForDownload(timeField),
            deviceid: record.DeviceId,
            station: record.Station || ''
        }
        console.log('Download IndexedDB attachment:', attachmentInfo)
        await downloadAttachments(selectedSite.value, selectedProject.value, [attachmentInfo])
    } catch (err) {
        console.error('Failed to download IndexedDB test log:', err)
    }
}

// Helper functions for station sub-tabs and device ID filtering
function getUniqueDeviceIdsForStation(stationGroup: StationGroup): string[] {
    return [...new Set(stationGroup.records.map(r => r.DeviceId))]
}

function getFilteredStationRecords(stationGroup: StationGroup): (CsvTestItemData | CompactCsvTestItemData)[] {
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

    // Apply record search filter (debounced for performance)
    const searchQuery = debouncedRecordSearchQueries.value[stationGroup.stationName]?.toLowerCase().trim()
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

/**
 * Generate a unique key for a record (used for caching test items)
 */
function getRecordKey(record: CsvTestItemData | CompactCsvTestItemData): string {
    return `${record.ISN}_${record['Test Start Time']}`
}

/**
 * Check if a record is a compact record (without TestItem array)
 */
function isCompactRecord(record: CsvTestItemData | CompactCsvTestItemData): record is CompactCsvTestItemData {
    return 'TestItemCount' in record && !('TestItem' in record)
}

/**
 * Get test items for a record - returns from local cache, full record, or undefined if not loaded
 */
function getTestItemsForRecord(record: CsvTestItemData | CompactCsvTestItemData): TestItem[] | undefined {
    // If it's a full record with TestItem array, return it directly
    if (!isCompactRecord(record) && record.TestItem) {
        return record.TestItem
    }

    // Otherwise check local cache for lazy-loaded items
    const key = getRecordKey(record)
    return lazyLoadedTestItems.value.get(key)
}

// Watch for station selection changes to fetch device IDs
watch(selectedStations, async (newStations, oldStations) => {
    // Find newly added stations
    const addedStations = newStations.filter(s => !oldStations.includes(s))
    // Find removed stations
    const removedStations = oldStations.filter(s => !newStations.includes(s))

    // Remove device IDs and selections for removed stations
    for (const station of removedStations) {
        delete deviceIdsByStation.value[station]
        delete stationDeviceIds.value[station]
        delete loadingDevicesByStation.value[station]
    }

    // Fetch device IDs for newly added stations
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
                // Initialize with empty selection (will use 'ALL' if empty)
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

// Initialize testItemFilters when records change - ensure 'value' is selected by default
watch(groupedByStation, (groups) => {
    for (const group of groups) {
        const filteredRecords = getFilteredStationRecords(group)
        for (let i = 0; i < filteredRecords.length; i++) {
            const key = `${group.stationName}-${i}`
            // Only set if not already set
            if (testItemFilters.value[key] === undefined) {
                testItemFilters.value[key] = ['value']
            }
        }
    }
}, { immediate: true })

/**
 * Get selected record keys for a specific station (used by IplasRecordTable)
 */
function getSelectedKeysForStation(stationName: string): string[] {
    const stationGroup = groupedByStation.value.find(g => g.stationName === stationName)
    if (!stationGroup) return []

    const stationRecordKeys = stationGroup.records.map(
        r => `${r.ISN}_${r['Test Start Time']}`
    )

    return Array.from(selectedRecordKeys.value).filter(key =>
        stationRecordKeys.includes(key)
    )
}

/**
 * Handle selection changes from IplasRecordTable
 */
function handleTableSelectionChange(stationName: string, newSelectedKeys: string[]): void {
    const stationGroup = groupedByStation.value.find(g => g.stationName === stationName)
    if (!stationGroup) return

    // Get all record keys for this station
    const stationRecordKeys = new Set(
        stationGroup.records.map(r => `${r.ISN}_${r['Test Start Time']}`)
    )

    // Remove old selections for this station
    for (const key of selectedRecordKeys.value) {
        if (stationRecordKeys.has(key)) {
            selectedRecordKeys.value.delete(key)
        }
    }

    // Add new selections
    for (const key of newSelectedKeys) {
        selectedRecordKeys.value.add(key)
    }
}

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

async function openFullscreen(record: CsvTestItemData | CompactCsvTestItemData): Promise<void> {
    // Show dialog immediately with loading state for compact records
    showFullscreenDialog.value = true

    // For compact records, we need to fetch test items
    if (isCompactRecord(record)) {
        let testItems = getTestItemsForRecord(record)

        if (!testItems) {
            // Show loading and fetch test items
            loadingFullscreenTestItems.value = true
            fullscreenRecord.value = normalizeStationRecord({ ...record, TestItem: [] } as CsvTestItemData)
            fullscreenOriginalRecord.value = null

            try {
                // Fetch test items from server
                if (selectedSite.value && selectedProject.value) {
                    // Use station field for API calls (not TSP) per iPLAS API docs
                    testItems = await fetchRecordTestItems(
                        selectedSite.value,
                        selectedProject.value,
                        record.station,
                        record.ISN || record.DeviceId, // ISN as identifier
                        record['Test Start Time'],
                        record.DeviceId // deviceId as last parameter
                    ) || []

                    // Note: The composable already caches test items internally
                }
            } catch (err) {
                console.error('Failed to fetch test items:', err)
                testItems = []
            } finally {
                loadingFullscreenTestItems.value = false
            }
        }

        // Create a synthetic full record with test items
        const fullRecord: CsvTestItemData = {
            ...record,
            TestItem: testItems || []
        }
        fullscreenOriginalRecord.value = fullRecord
        fullscreenRecord.value = normalizeStationRecord(fullRecord)
    } else {
        fullscreenOriginalRecord.value = record
        fullscreenRecord.value = normalizeStationRecord(record)
    }
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

function createAttachmentInfo(record: CsvTestItemData | CompactCsvTestItemData): DownloadAttachmentInfo {
    // Use ISN if available, otherwise use DeviceId
    const isn = record.ISN && record.ISN.trim() !== '' ? record.ISN : record.DeviceId
    // CRITICAL: Use 'Test end Time' for download_attachment API
    const time = formatTimeForDownload(record['Test end Time'])
    const deviceid = record.DeviceId
    // Use TSP as per API documentation - TSP corresponds to display_station_name
    const station = record.TSP || record.station

    return { isn, time, deviceid, station }
}

async function downloadSingleRecord(record: CsvTestItemData | CompactCsvTestItemData, stationName: string, recordIndex: number): Promise<void> {
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

/**
 * Download CSV test log from iPLAS API for a single record
 * UPDATED: Uses the actual iPLAS API endpoint to get official CSV test logs
 */
async function downloadCsvRecord(record: CsvTestItemData | CompactCsvTestItemData, stationName: string, recordIndex: number): Promise<void> {
    if (!selectedSite.value || !selectedProject.value) return

    downloadingCsvKey.value = `${stationName}-${recordIndex}`

    try {
        // Format test_end_time with .000 milliseconds as required by iPLAS API
        const testEndTime = record['Test end Time']
        const formattedEndTime = testEndTime.includes('.') ? testEndTime : `${testEndTime}.000`
        // Convert from 2026-01-22 18:57:05 format to 2026/01/22 18:57:05.000 format
        const apiEndTime = formattedEndTime.replace(/-/g, '/')

        await downloadCsvLogs([{
            site: selectedSite.value,
            project: selectedProject.value,
            station: record.TSP || record.station || stationName,
            line: record.Line || 'NA',
            model: record.Model || 'ALL',
            deviceid: record.DeviceId,
            isn: record.ISN,
            test_end_time: apiEndTime,
            data_source: 0
        }])
    } catch (err) {
        console.error('Failed to download CSV:', err)
    } finally {
        downloadingCsvKey.value = null
    }
}

/**
 * Convert test items to CSV format
 */
function convertTestItemsToCsv(record: CsvTestItemData | CompactCsvTestItemData, testItems: TestItem[]): string {
    // Header row with record info
    const headerInfo = [
        `# ISN: ${record.ISN}`,
        `# Device ID: ${record.DeviceId}`,
        `# Station: ${record.station || ''}`,
        `# Test Status: ${record['Test Status']}`,
        `# Test Start: ${record['Test Start Time']}`,
        `# Test End: ${record['Test end Time']}`,
        ''
    ].join('\n')

    // CSV header
    const csvHeader = 'NAME,STATUS,VALUE,UCL,LCL,CYCLE'

    // CSV rows
    const csvRows = testItems.map(item => {
        const name = escapeCSVField(item.NAME || '')
        const status = escapeCSVField(item.STATUS || '')
        const value = escapeCSVField(item.VALUE || '')
        const ucl = escapeCSVField(item.UCL || '')
        const lcl = escapeCSVField(item.LCL || '')
        // Handle both CYCLE (correct) and possible typo from API
        const cycle = escapeCSVField(item.CYCLE || (item as any).CYCLE || '')
        return `${name},${status},${value},${ucl},${lcl},${cycle}`
    })

    return headerInfo + csvHeader + '\n' + csvRows.join('\n')
}

/**
 * Escape CSV field value
 */
function escapeCSVField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

/**
 * Download string content as a CSV file
 */
function downloadCsvFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

async function downloadSelectedRecords(): Promise<void> {
    if (!selectedSite.value || !selectedProject.value || selectedRecordKeys.value.size === 0) return

    // UPDATED: Use batch download for multiple TXT files
    if (selectedRecordKeys.value.size > 1) {
        await downloadSelectedBatch('txt')
        return
    }

    // Single file download - use original method
    try {
        const attachments: DownloadAttachmentInfo[] = []

        // Build a map of recordKey -> record for quick lookup
        const recordMap = new Map<string, CsvTestItemData | CompactCsvTestItemData>()
        for (const group of groupedByStation.value) {
            for (const record of group.records) {
                const recordKey = `${record.ISN}_${record['Test Start Time']}`
                recordMap.set(recordKey, record)
            }
        }

        // Find selected records and create attachment info
        for (const key of selectedRecordKeys.value) {
            const record = recordMap.get(key)
            if (record) {
                attachments.push(createAttachmentInfo(record))
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

/**
 * Download all selected records as CSV files (one per record)
 * UPDATED: Uses batch download for multiple files to create proper zip archive
 */
async function downloadSelectedRecordsCsv(): Promise<void> {
    if (!selectedSite.value || !selectedProject.value || selectedRecordKeys.value.size === 0) return

    // UPDATED: Use batch download for multiple CSV files
    if (selectedRecordKeys.value.size > 1) {
        await downloadSelectedBatch('csv')
        return
    }

    // Single file download - use original method
    downloadingCsv.value = true

    try {
        // Build a map of recordKey -> record for quick lookup
        const recordMap = new Map<string, { record: CsvTestItemData | CompactCsvTestItemData; stationName: string }>()
        for (const group of groupedByStation.value) {
            for (const record of group.records) {
                const recordKey = `${record.ISN}_${record['Test Start Time']}`
                recordMap.set(recordKey, { record, stationName: group.stationName })
            }
        }

        // Collect all CSV log info for selected records
        const csvLogInfos: DownloadCsvLogInfo[] = []

        for (const key of selectedRecordKeys.value) {
            const entry = recordMap.get(key)
            if (!entry) continue

            const { record, stationName } = entry

            // Format test_end_time with .000 milliseconds as required by iPLAS API
            const testEndTime = record['Test end Time']
            const formattedEndTime = testEndTime.includes('.') ? testEndTime : `${testEndTime}.000`
            // Convert from 2026-01-22 18:57:05 format to 2026/01/22 18:57:05.000 format
            const apiEndTime = formattedEndTime.replace(/-/g, '/')

            csvLogInfos.push({
                site: selectedSite.value!,
                project: selectedProject.value!,
                station: record.TSP || record.station || stationName,
                line: record.Line || 'NA',
                model: record.Model || 'ALL',
                deviceid: record.DeviceId,
                isn: record.ISN,
                test_end_time: apiEndTime,
                data_source: 0
            })
        }

        if (csvLogInfos.length > 0) {
            console.log(`Downloading ${csvLogInfos.length} CSV logs via iPLAS API`)
            await downloadCsvLogs(csvLogInfos)
        }
    } catch (err) {
        console.error('Failed to download CSV files:', err)
    } finally {
        downloadingCsv.value = false
    }
}

/**
 * Download selected records using batch download API
 * Creates a proper zip archive with organized folder structure
 */
async function downloadSelectedBatch(downloadType: 'txt' | 'csv' | 'all'): Promise<void> {
    if (!selectedSite.value || !selectedProject.value || selectedRecordKeys.value.size === 0) return

    if (downloadType === 'csv') {
        downloadingCsv.value = true
    }

    try {
        // Build a map of recordKey -> record for quick lookup
        const recordMap = new Map<string, { record: CsvTestItemData | CompactCsvTestItemData; stationName: string }>()
        for (const group of groupedByStation.value) {
            for (const record of group.records) {
                const recordKey = `${record.ISN}_${record['Test Start Time']}`
                recordMap.set(recordKey, { record, stationName: group.stationName })
            }
        }

        // Collect all log info for selected records
        const logInfos: DownloadCsvLogInfo[] = []

        for (const key of selectedRecordKeys.value) {
            const entry = recordMap.get(key)
            if (!entry) continue

            const { record, stationName } = entry

            // Format test_end_time with .000 milliseconds as required by iPLAS API
            const testEndTime = record['Test end Time']
            const formattedEndTime = testEndTime.includes('.') ? testEndTime : `${testEndTime}.000`
            // Convert from 2026-01-22 18:57:05 format to 2026/01/22 18:57:05.000 format
            const apiEndTime = formattedEndTime.replace(/-/g, '/')

            logInfos.push({
                site: selectedSite.value!,
                project: selectedProject.value!,
                station: record.TSP || record.station || stationName,
                line: record.Line || 'NA',
                model: record.Model || 'ALL',
                deviceid: record.DeviceId,
                isn: record.ISN,
                test_end_time: apiEndTime,
                data_source: 0
            })
        }

        if (logInfos.length > 0) {
            console.log(`Batch downloading ${logInfos.length} ${downloadType} logs`)
            const response = await batchDownloadLogs(
                selectedSite.value,
                selectedProject.value,
                logInfos,
                downloadType
            )
            console.log(`Downloaded: ${response.txt_count} TXT + ${response.csv_count} CSV files`)
        }
    } catch (err) {
        console.error(`Failed to batch download ${downloadType} files:`, err)
    } finally {
        downloadingCsv.value = false
    }
}

/**
 * Download all logs (both TXT and CSV) for selected records
 * UPDATED: Uses batch download to create a single zip with both types
 */
async function downloadAllSelectedRecords(): Promise<void> {
    if (!selectedSite.value || !selectedProject.value || selectedRecordKeys.value.size === 0) return

    // UPDATED: Use batch download with 'all' type to get both TXT and CSV in one zip
    await downloadSelectedBatch('all')
}

// Handlers
function handleSiteChange() {
    selectedProject.value = null
    selectedStations.value = []
    stationDeviceIds.value = {}
    deviceIdsByStation.value = {}
    loadingDevicesByStation.value = {}
    stations.value = []
    clearTestItemData()
    selectedRecordKeys.value.clear()
}

async function handleProjectChange() {
    selectedStations.value = []
    stationDeviceIds.value = {}
    deviceIdsByStation.value = {}
    loadingDevicesByStation.value = {}
    clearTestItemData()
    selectedRecordKeys.value.clear()

    if (selectedSite.value && selectedProject.value) {
        await fetchStations(selectedSite.value, selectedProject.value)
    }
}

function handleStationChange() {
    clearTestItemData()
    selectedRecordKeys.value.clear()
}

async function fetchTestItems() {
    if (!selectedSite.value || !selectedProject.value || selectedStations.value.length === 0) return

    // Pass Date objects - the composable handles ISO format conversion
    const begintime = new Date(startTime.value)
    const endtime = new Date(endTime.value)

    clearTestItemData()
    selectedRecordKeys.value.clear()
    lazyLoadedTestItems.value.clear()
    loadingTestItemsForRecord.value.clear()
    // Clear IndexedDB selection when fetching new data
    indexedDbSelectedKeys.value = []

    // =========================================================================
    // IndexedDB Mode: Stream directly to disk for large datasets
    // =========================================================================
    if (useIndexedDbMode.value) {
        // Stream data for ALL selected stations
        let totalRecords = 0

        // STEP 1: Collect all stations and identify which need device ID fetching
        const stationInfoList: { stationInfo: Station; stationDisplayName: string; deviceIds: string[] }[] = []
        for (const stationDisplayName of selectedStations.value) {
            const stationInfo = stations.value.find((s: Station) => s.display_station_name === stationDisplayName)
            if (!stationInfo) continue
            const deviceIds = stationDeviceIds.value[stationDisplayName] || []
            stationInfoList.push({ stationInfo, stationDisplayName, deviceIds })
        }

        // STEP 2: Fetch device IDs in parallel for stations that don't have them
        const deviceIdPromises = stationInfoList.map(async (entry) => {
            if (entry.deviceIds.length === 0) {
                try {
                    entry.deviceIds = await fetchDeviceIds(
                        selectedSite.value!,
                        selectedProject.value!,
                        entry.stationInfo.display_station_name,
                        begintime,
                        endtime
                    )
                } catch (err) {
                    console.warn(`Failed to fetch device IDs for ${entry.stationDisplayName}, falling back to ALL`)
                    entry.deviceIds = ['ALL']
                }
            }
            return entry
        })
        const resolvedStations = await Promise.all(deviceIdPromises)

        // STEP 3: Build list of all station+device combinations and fetch data in parallel
        const streamPromises: Promise<void>[] = []
        for (const { stationInfo, deviceIds } of resolvedStations) {
            for (const deviceId of deviceIds) {
                streamPromises.push(
                    (async () => {
                        try {
                            const recordCount = await streamToIndexedDb({
                                site: selectedSite.value!,
                                project: selectedProject.value!,
                                station: stationInfo.display_station_name,
                                deviceId,
                                beginTime: begintime,
                                endTime: endtime,
                                testStatus: testStatusFilter.value
                            })
                            console.log(`[IndexedDB] Streamed ${recordCount} records for station ${stationInfo.display_station_name} device ${deviceId}`)
                            totalRecords += recordCount
                        } catch (err) {
                            console.error(`[IndexedDB] Stream failed for station ${stationInfo.display_station_name} device ${deviceId}:`, err)
                            error.value = err instanceof Error ? err.message : 'Failed to stream data to IndexedDB'
                        }
                    })()
                )
            }
        }
        await Promise.all(streamPromises)

        console.log(`[IndexedDB] Total: Streamed ${totalRecords} records from ${selectedStations.value.length} stations`)

        // Reset station tab to "All Stations" and clear filter
        indexedDbActiveStationTab.value = 0
        updateIndexedDbFilter({ station: undefined })

        // Load the first page
        await loadIndexedDbItems(indexedDbTableOptions.value)
        return
    }

    // =========================================================================
    // Regular Mode: Fetch to memory
    // =========================================================================
    // Choose fetch method based on mode
    const fetchMethod = useCompactMode.value ? fetchTestItemsCompact : fetchTestItemsApi

    // STEP 1: Collect all stations and identify which need device ID fetching
    const stationInfoList: { stationInfo: Station; stationDisplayName: string; deviceIds: string[] }[] = []
    for (const stationDisplayName of selectedStations.value) {
        const stationInfo = stations.value.find((s: Station) => s.display_station_name === stationDisplayName)
        if (!stationInfo) continue
        const deviceIds = stationDeviceIds.value[stationDisplayName] || []
        stationInfoList.push({ stationInfo, stationDisplayName, deviceIds })
    }

    // STEP 2: Fetch device IDs in parallel for stations that don't have them
    const deviceIdPromises = stationInfoList.map(async (entry) => {
        if (entry.deviceIds.length === 0) {
            try {
                entry.deviceIds = await fetchDeviceIds(
                    selectedSite.value!,
                    selectedProject.value!,
                    entry.stationInfo.display_station_name,
                    begintime,
                    endtime
                )
            } catch (err) {
                console.warn(`Failed to fetch device IDs for ${entry.stationDisplayName}, falling back to ALL`)
                entry.deviceIds = ['ALL']
            }
        }
        return entry
    })
    const resolvedStations = await Promise.all(deviceIdPromises)

    // STEP 3: Build list of all station+device combinations and fetch data in parallel
    const fetchPromises: Promise<unknown>[] = []
    for (const { stationInfo, deviceIds } of resolvedStations) {
        for (const deviceId of deviceIds) {
            fetchPromises.push(
                fetchMethod(
                    selectedSite.value!,
                    selectedProject.value!,
                    stationInfo.display_station_name,
                    deviceId,
                    begintime,
                    endtime,
                    testStatusFilter.value
                )
            )
        }
    }
    await Promise.all(fetchPromises)
}

/**
 * Handle server-side pagination for table view mode.
 * Called when user changes page, sort, or items per page.
 */
async function handleTableOptionsUpdate(
    stationName: string,
    options: { page: number; itemsPerPage: number; sortBy: { key: string; order: 'asc' | 'desc' }[] }
) {
    if (!selectedSite.value || !selectedProject.value) return

    const stationInfo = stations.value.find((s: Station) => s.display_station_name === stationName)
    if (!stationInfo) return

    // Initialize state for this station if needed
    if (!serverPaginationState.value[stationName]) {
        serverPaginationState.value[stationName] = {
            page: 1,
            itemsPerPage: 25,
            sortBy: 'TestStartTime',
            sortDesc: true,
            items: [],
            totalItems: 0,
            loading: false
        }
    }

    const state = serverPaginationState.value[stationName]!
    state.loading = true

    // Get sort info
    const sortInfo = options.sortBy[0]
    const sortBy = sortInfo?.key || 'TestStartTime'
    const sortDesc = sortInfo?.order === 'desc'

    // Get device IDs for this station - use filter if set, otherwise ALL
    const filterDeviceIds = selectedFilterDeviceIds.value[stationName]
    let deviceId: string = 'ALL'
    if (filterDeviceIds && filterDeviceIds.length === 1 && filterDeviceIds[0]) {
        // If only one device ID is selected in filter, use it for server-side filtering
        deviceId = filterDeviceIds[0]
    }

    // Get status filter for this station (use per-station filter, fallback to global)
    const statusFilter = stationStatusFilters.value[stationName] || testStatusFilter.value || 'ALL'

    try {
        const result = await fetchTestItemsPaginated(
            selectedSite.value,
            selectedProject.value,
            stationInfo.display_station_name,
            deviceId,
            new Date(startTime.value),
            new Date(endTime.value),
            statusFilter,
            {
                page: options.page,
                itemsPerPage: options.itemsPerPage,
                sortBy,
                sortDesc
            }
        )

        // Update state
        state.page = result.page
        state.itemsPerPage = result.itemsPerPage
        state.sortBy = sortBy
        state.sortDesc = sortDesc
        state.items = result.items
        state.totalItems = result.totalItems
    } catch (err) {
        console.error('Failed to fetch paginated data:', err)
    } finally {
        state.loading = false
    }
}

/**
 * Initialize server-side pagination for a station (called when switching to table view).
 */
async function initializeServerPagination(stationName: string) {
    await handleTableOptionsUpdate(stationName, {
        page: 1,
        itemsPerPage: 25,
        sortBy: [{ key: 'TestStartTime', order: 'desc' }]
    })
}

async function handleRefresh() {
    await fetchSiteProjects(true)
}

// Watch for station data changes - initialize server pagination
watch(groupedByStation, async (groups) => {
    if (groups.length > 0) {
        // Initialize pagination for the active station tab
        const activeStation = groups[activeStationTab.value]
        if (activeStation && !serverPaginationState.value[activeStation.stationName]) {
            await initializeServerPagination(activeStation.stationName)
        }
    }
}, { immediate: true })

// UPDATED: Watch for streaming completion to load all items for client-side table
watch(isStreaming, async (streaming, wasStreaming) => {
    if (wasStreaming && !streaming && streamStatus.recordsWritten > 0) {
        // Streaming completed - load all items for v-data-table client-side pagination
        await loadAllIndexedDbItems()
    }
})

// Watch for active station tab changes - initialize pagination if needed
watch(activeStationTab, async (newTab) => {
    if (groupedByStation.value.length > newTab) {
        const station = groupedByStation.value[newTab]
        if (station && !serverPaginationState.value[station.stationName]) {
            await initializeServerPagination(station.stationName)
        }
    }
})

// Watch for IndexedDB station tab changes - update filter
watch(indexedDbActiveStationTab, async (newTab) => {
    if (newTab === 0) {
        // All stations - clear station filter
        updateIndexedDbFilter({ station: undefined })
    } else {
        // Specific station selected
        const stationName = indexedDbStationList.value[newTab - 1]
        if (stationName) {
            updateIndexedDbFilter({ station: stationName })
        }
    }
    // Reset to page 1 when changing tabs
    indexedDbTableOptions.value.page = 1
    // UPDATED: Load all items for client-side pagination with v-data-table
    await loadAllIndexedDbItems()
})

// Initialize
onMounted(async () => {
    await fetchSiteProjects()
    // UPDATED: Load all IndexedDB items on mount for client-side table pagination
    await loadAllIndexedDbItems()

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
    lazyLoadedTestItems.value.clear()
    loadingTestItemsForRecord.value.clear()
    recordSearchQueries.value = {}
    debouncedRecordSearchQueries.value = {}
    testItemFilters.value = {}
    testItemStatusFilters.value = {}
    testItemSearchTerms.value = {}
    serverPaginationState.value = {}
    selectedRecordKeys.value.clear()
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
