<template>
    <div>
        <!-- Search Card -->
        <v-card elevation="2" class="mb-4">
            <v-card-title class="d-flex align-center bg-primary">
                <v-icon class="mr-2">mdi-barcode-scan</v-icon>
                ISN Search
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
                            hint="Enter the ISN to search across all stations" persistent-hint
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

                <!-- Action Buttons -->
                <v-divider v-if="groupedByISN.length > 0" class="my-4" />
                <div v-if="groupedByISN.length > 0" class="d-flex justify-end gap-2">
                    <v-btn color="error" variant="outlined" prepend-icon="mdi-close-circle" :disabled="loadingIsnSearch"
                        @click="clearAll">
                        Clear All
                    </v-btn>
                </div>
            </v-card-text>
        </v-card>

        <!-- Error Alert -->
        <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
            {{ error }}
        </v-alert>

        <!-- No Results Alert -->
        <v-alert v-if="hasSearched && groupedByISN.length === 0 && !loadingIsnSearch" type="info" class="mb-4">
            <v-icon class="mr-2">mdi-information</v-icon>
            No test records found for the provided ISN(s).
        </v-alert>

        <!-- Results Section -->
        <v-card v-if="groupedByISN.length > 0" elevation="2" class="mb-4">
            <v-card-title class="bg-secondary d-flex justify-space-between align-center">
                <div>
                    <v-icon icon="mdi-database-outline" class="mr-2" />
                    Test Records Results
                    <v-chip size="small" color="white" variant="outlined" class="ml-2">
                        {{ groupedByISN.length }} ISN(s)
                    </v-chip>
                </div>
                <div class="d-flex align-center gap-2">
                    <v-btn v-if="selectedRecordIndices.length > 0" color="success" variant="tonal" size="small"
                        :loading="downloading" @click="downloadSelectedRecords">
                        <v-icon start size="small">mdi-download-multiple</v-icon>
                        Download Selected ({{ selectedRecordIndices.length }})
                    </v-btn>
                    <v-btn size="small" variant="outlined" color="white" @click="toggleExpandAll">
                        <v-icon start>{{ allExpanded ? 'mdi-arrow-collapse-vertical' : 'mdi-arrow-expand-vertical'
                        }}</v-icon>
                        {{ allExpanded ? 'Collapse All' : 'Expand All' }}
                    </v-btn>
                </div>
            </v-card-title>
            <v-card-text class="pa-4">
                <!-- Tabs for each ISN -->
                <v-tabs v-model="activeISNTab" color="primary" class="mb-4">
                    <v-tab v-for="(isnGroup, index) in groupedByISN" :key="isnGroup.isn" :value="index">
                        <v-btn icon size="x-small" variant="text" class="mr-1"
                            @click.stop="copyToClipboard(isnGroup.isn)">
                            <v-icon size="small">mdi-content-copy</v-icon>
                            <v-tooltip activator="parent" location="top">Copy ISN</v-tooltip>
                        </v-btn>
                        <span>{{ isnGroup.isn }}</span>
                        <v-chip v-if="isnGroup.hasError" size="x-small" color="error" class="ml-2">
                            {{ isnGroup.errorCount }}
                        </v-chip>
                        <v-chip v-else size="x-small" color="success" class="ml-2">
                            {{ isnGroup.records.length }}
                        </v-chip>
                    </v-tab>
                </v-tabs>

                <v-window v-model="activeISNTab">
                    <v-window-item v-for="(isnGroup, isnIndex) in groupedByISN" :key="isnGroup.isn" :value="isnIndex"
                        eager>
                        <!-- ISN Summary Info -->
                        <div class="d-flex align-center gap-4 mb-4 flex-wrap">
                            <div>
                                <div class="text-caption text-medium-emphasis">Site</div>
                                <div class="text-subtitle-1 font-weight-bold text-primary">{{ isnGroup.site }}</div>
                            </div>
                            <v-divider vertical />
                            <div>
                                <div class="text-caption text-medium-emphasis">Project</div>
                                <div class="text-subtitle-1 font-weight-bold text-primary">{{ isnGroup.project }}</div>
                            </div>
                            <v-divider vertical />
                            <div>
                                <div class="text-caption text-medium-emphasis">Stations</div>
                                <div class="text-subtitle-1 font-weight-bold text-info">{{ isnGroup.stations.length }}
                                </div>
                            </div>
                            <v-divider vertical />
                            <div>
                                <div class="text-caption text-medium-emphasis">Total Records</div>
                                <div class="text-subtitle-1 font-weight-bold text-info">{{ isnGroup.records.length }}
                                </div>
                            </div>
                            <v-divider vertical />
                            <div>
                                <div class="text-caption text-medium-emphasis">Status</div>
                                <v-chip :color="isnGroup.hasError ? 'error' : 'success'" size="small">
                                    {{ isnGroup.hasError ? 'HAS ERRORS' : 'ALL PASS' }}
                                </v-chip>
                            </div>
                        </div>

                        <v-divider class="mb-4" />

                        <!-- Station Sub-Tabs -->
                        <v-tabs v-model="activeStationTabs[isnIndex]" color="secondary" class="mb-4" show-arrows>
                            <v-tab v-for="(stationGroup, stationIndex) in isnGroup.stations"
                                :key="stationGroup.stationName" :value="stationIndex">
                                <v-icon start size="small">mdi-router-wireless</v-icon>
                                {{ stationGroup.displayName }}
                                <v-chip size="x-small" :color="stationGroup.hasError ? 'error' : 'success'"
                                    class="ml-2">
                                    {{ stationGroup.records.length }}
                                </v-chip>
                            </v-tab>
                        </v-tabs>

                        <v-window v-model="activeStationTabs[isnIndex]">
                            <v-window-item v-for="(stationGroup, stationIndex) in isnGroup.stations"
                                :key="stationGroup.stationName" :value="stationIndex" eager>
                                <!-- Search, Status and Device ID Filter -->
                                <v-row class="mb-4" dense>
                                    <v-col cols="12" md="4">
                                        <v-text-field
                                            v-model="recordSearchQueries[`${isnGroup.isn}-${stationGroup.stationName}`]"
                                            label="Search Records" prepend-inner-icon="mdi-magnify" variant="outlined"
                                            density="compact" hide-details clearable
                                            placeholder="Search Device ID, Error Code, Error Name..." />
                                    </v-col>
                                    <v-col cols="12" md="2">
                                        <v-select
                                            v-model="stationStatusFilters[`${isnGroup.isn}-${stationGroup.stationName}`]"
                                            :items="['ALL', 'PASS', 'FAIL']" label="Status" variant="outlined"
                                            density="compact" hide-details />
                                    </v-col>
                                    <v-col cols="12" md="6">
                                        <v-autocomplete
                                            v-model="selectedFilterDeviceIds[`${isnGroup.isn}-${stationGroup.stationName}`]"
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

                                <!-- Station Records -->
                                <v-expansion-panels v-model="expandedPanels[`${isnIndex}-${stationIndex}`]" multiple>
                                    <v-expansion-panel
                                        v-for="(record, recordIndex) in getDisplayedStationRecords(isnGroup, stationGroup)"
                                        :key="`${isnGroup.isn}-${stationIndex}-${recordIndex}`">
                                        <v-expansion-panel-title
                                            :class="record.test_status !== 'PASS' ? 'bg-red-lighten-5' : ''">
                                            <div class="d-flex align-center justify-space-between w-100 pr-4">
                                                <div class="d-flex align-center gap-2">
                                                    <v-checkbox
                                                        :model-value="isRecordSelected(isnIndex, stationIndex, recordIndex)"
                                                        density="compact" hide-details class="flex-grow-0" @click.stop
                                                        @update:model-value="toggleRecordSelection(isnIndex, stationIndex, recordIndex)" />
                                                    <span
                                                        class="text-caption text-medium-emphasis">#{{ getTotalFilteredStationRecords(isnGroup,
                                                        stationGroup) - recordIndex}}</span>
                                                    <!-- DeviceId - bold text with copy button -->
                                                    <v-btn icon size="x-small" variant="text" color="primary"
                                                        @click.stop="copyToClipboard(record.device_id)">
                                                        <v-icon size="small">mdi-content-copy</v-icon>
                                                        <v-tooltip activator="parent" location="top">Copy Device
                                                            ID</v-tooltip>
                                                    </v-btn>
                                                    <span class="font-weight-bold">{{ record.device_id }}</span>
                                                    <!-- ErrorCode chip - clickable to copy -->
                                                    <v-chip :color="record.error_code === 'PASS' ? 'success' : 'error'"
                                                        size="x-small" class="cursor-pointer"
                                                        @click.stop="copyToClipboard(record.error_code)">
                                                        {{ record.error_code }}
                                                        <v-tooltip activator="parent" location="top">Click to copy Error
                                                            Code</v-tooltip>
                                                    </v-chip>
                                                    <!-- ErrorName chip - clickable to copy -->
                                                    <template
                                                        v-if="record.error_name && record.error_name !== 'N/A' && record.error_code !== 'PASS'">
                                                        <v-chip color="error" size="x-small" variant="outlined"
                                                            class="cursor-pointer"
                                                            @click.stop="copyToClipboard(record.error_name)">
                                                            {{ record.error_name }}
                                                            <v-tooltip activator="parent" location="top">Click to copy
                                                                Error Name</v-tooltip>
                                                        </v-chip>
                                                    </template>
                                                </div>
                                                <div
                                                    class="d-flex align-center gap-2 text-caption text-medium-emphasis">
                                                    <v-chip size="x-small" color="info" variant="outlined">
                                                        {{ formatShortTime(record.test_end_time) }}
                                                    </v-chip>
                                                    <v-chip size="x-small" variant="outlined">
                                                        <v-icon start size="x-small">mdi-timer</v-icon>
                                                        {{ calculateDuration(record.test_start_time,
                                                            record.test_end_time) }}
                                                    </v-chip>
                                                    <v-btn icon size="x-small" variant="outlined" color="secondary"
                                                        @click.stop="openFullscreen(record)">
                                                        <v-icon size="x-small">mdi-fullscreen</v-icon>
                                                        <v-tooltip activator="parent" location="top">Fullscreen
                                                            View</v-tooltip>
                                                    </v-btn>
                                                    <v-btn icon size="x-small" variant="outlined" color="primary"
                                                        :loading="downloadingKey === `${isnIndex}-${stationIndex}-${recordIndex}`"
                                                        @click.stop="downloadSingleRecord(record, `${isnIndex}-${stationIndex}`, recordIndex)">
                                                        <v-icon size="x-small">mdi-download</v-icon>
                                                        <v-tooltip activator="parent" location="top">Download Test
                                                            Log</v-tooltip>
                                                    </v-btn>
                                                </div>
                                            </div>
                                        </v-expansion-panel-title>
                                        <v-expansion-panel-text>
                                            <!-- Record Details (like Station Search pattern) -->
                                            <v-row class="mb-3">
                                                <v-col cols="12" sm="6" md="2">
                                                    <div class="text-caption text-medium-emphasis">ISN</div>
                                                    <div class="font-weight-medium">{{ record.isn || '-' }}</div>
                                                </v-col>
                                                <v-col cols="12" sm="6" md="2">
                                                    <div class="text-caption text-medium-emphasis">Station Name</div>
                                                    <div class="font-weight-medium">{{ record.station_name || '-' }}
                                                    </div>
                                                </v-col>
                                                <v-col cols="12" sm="6" md="2">
                                                    <div class="text-caption text-medium-emphasis">TSP</div>
                                                    <div class="font-weight-medium">{{ record.display_station_name ||
                                                        '-' }}
                                                    </div>
                                                </v-col>
                                                <v-col cols="12" sm="6" md="2">
                                                    <div class="text-caption text-medium-emphasis">Test Start</div>
                                                    <div class="font-weight-medium">{{
                                                        formatLocalTime(record.test_start_time)
                                                        }}</div>
                                                </v-col>
                                                <v-col cols="12" sm="6" md="2">
                                                    <div class="text-caption text-medium-emphasis">Test End</div>
                                                    <div class="font-weight-medium">{{
                                                        formatLocalTime(record.test_end_time) }}
                                                    </div>
                                                </v-col>
                                                <v-col cols="12" sm="6" md="2">
                                                    <div class="text-caption text-medium-emphasis">Test Duration</div>
                                                    <div class="font-weight-medium">{{
                                                        calculateDuration(record.test_start_time,
                                                            record.test_end_time) }}</div>
                                                </v-col>
                                            </v-row>

                                            <!-- Search Box and Filter Items Row -->
                                            <v-row class="mb-3" dense>
                                                <v-col cols="12" md="6">
                                                    <v-combobox
                                                        v-model="testItemSearchTerms[`${isnGroup.isn}-${stationIndex}-${recordIndex}`]"
                                                        label="Search Test Items (Regex, OR logic)"
                                                        prepend-inner-icon="mdi-magnify" variant="outlined"
                                                        density="compact" hide-details multiple chips closable-chips
                                                        clearable
                                                        placeholder="Type pattern and press Enter (e.g., tx, rx)...">
                                                        <template #chip="{ props, item }">
                                                            <v-chip v-bind="props" :text="String(item.value || item)"
                                                                size="small" color="primary" />
                                                        </template>
                                                    </v-combobox>
                                                </v-col>
                                                <v-col cols="12" md="6">
                                                    <div class="d-flex align-center flex-wrap gap-2 h-100">
                                                        <span class="text-caption text-medium-emphasis">Filter:</span>
                                                        <v-chip-group
                                                            v-model="testItemFilters[`${isnGroup.isn}-${stationIndex}-${recordIndex}`]"
                                                            mandatory class="flex-grow-1">
                                                            <v-chip value="all" filter label variant="outlined"
                                                                color="primary" size="small">
                                                                All
                                                            </v-chip>
                                                            <v-chip value="value" filter label variant="outlined"
                                                                color="success" size="small">
                                                                Value
                                                            </v-chip>
                                                            <v-chip value="non-value" filter label variant="outlined"
                                                                color="warning" size="small">
                                                                Non-Value
                                                            </v-chip>
                                                            <v-chip value="bin" filter label variant="outlined"
                                                                color="info" size="small">
                                                                Bin
                                                            </v-chip>
                                                        </v-chip-group>
                                                    </div>
                                                </v-col>
                                            </v-row>

                                            <!-- Test Items Table (scrollable with sticky header/footer) -->
                                            <v-data-table :headers="testItemHeaders"
                                                :items="filterAndSearchTestItems(record.test_item, `${isnGroup.isn}-${stationIndex}-${recordIndex}`)"
                                                :items-per-page="25" density="compact" fixed-header height="400"
                                                class="elevation-1 v-table--striped">
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
                                                Showing {{ filterAndSearchTestItems(record.test_item,
                                                    `${isnGroup.isn}-${stationIndex}-${recordIndex}`).length }} of {{
                                                    record.test_item?.length || 0 }} test items
                                            </div>
                                        </v-expansion-panel-text>
                                    </v-expansion-panel>
                                </v-expansion-panels>

                                <!-- Performance: Show More Button -->
                                <div v-if="hasMoreStationRecords(isnGroup, stationGroup)" class="text-center mt-4">
                                    <v-btn color="primary" variant="outlined"
                                        @click="showMoreRecords(`${isnGroup.isn}-${stationGroup.stationName}`)">
                                        <v-icon start>mdi-chevron-down</v-icon>
                                        Show More ({{ getRemainingStationRecordsCount(isnGroup, stationGroup) }}
                                        remaining)
                                    </v-btn>
                                    <div class="text-caption text-medium-emphasis mt-1">
                                        Showing {{ getDisplayLimit(`${isnGroup.isn}-${stationGroup.stationName}`) }} of
                                        {{
                                            getTotalFilteredStationRecords(isnGroup, stationGroup) }} records
                                    </div>
                                </div>
                            </v-window-item>
                        </v-window>
                    </v-window-item>
                </v-window>
            </v-card-text>
        </v-card>

        <!-- Success Notification -->
        <v-snackbar v-model="showSuccess" color="success" timeout="3000">
            <v-icon class="mr-2">mdi-check-circle</v-icon>
            Test log downloaded successfully!
        </v-snackbar>

        <!-- Copy Success Notification -->
        <v-snackbar v-model="showCopySuccess" color="info" timeout="2000">
            <v-icon class="mr-2">mdi-content-copy</v-icon>
            Copied to clipboard!
        </v-snackbar>

        <!-- Fullscreen Dialog -->
        <IplasTestItemsFullscreenDialog v-model="showFullscreenDialog" :record="fullscreenRecord"
            :downloading="fullscreenDownloading" @download="downloadSingleRecordFromFullscreen" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIplasApi } from '@/features/dut_logs/composables/useIplasApi'
import IplasTestItemsFullscreenDialog from './IplasTestItemsFullscreenDialog.vue'
import type { NormalizedRecord } from './IplasTestItemsFullscreenDialog.vue'
import type { IsnSearchData, IsnSearchTestItem, DownloadAttachmentInfo } from '@/features/dut_logs/api/iplasApi'
import { adjustIplasDisplayTime } from '@/shared/utils/helpers'

interface StationGroup {
    stationName: string
    displayName: string
    hasError: boolean
    errorCount: number
    records: IsnSearchData[]
}

interface ISNGroup {
    isn: string
    site: string
    project: string
    hasError: boolean
    errorCount: number
    records: IsnSearchData[]
    stations: StationGroup[]
}

const {
    loadingIsnSearch,
    downloading,
    error,
    searchByIsn,
    downloadAttachments,
    clearIsnSearchData
} = useIplasApi()

// Input mode
const inputMode = ref<'single' | 'multiple' | 'bulk'>('single')
const searchIsn = ref('')
const selectedISNs = ref<string[]>([])

// Search state
const hasSearched = ref(false)
const groupedByISN = ref<ISNGroup[]>([])
const activeISNTab = ref(0)
const showSuccess = ref(false)

// Display controls
const testItemFilters = ref<Record<string, 'all' | 'value' | 'non-value' | 'bin'>>({})
const testItemStatusFilters = ref<Record<string, 'ALL' | 'PASS' | 'FAIL'>>({}) // Per-test item status filter
const testStatusFilter = ref<'ALL' | 'PASS' | 'FAIL'>('ALL')
const expandedPanels = ref<Record<string, number[]>>({}) // Key format: "isnIndex-stationIndex"
const testItemSearchTerms = ref<Record<string, string[]>>({})

// Device ID filter controls
const selectedFilterDeviceIds = ref<Record<string, string[]>>({})

// Per-station status filters
const stationStatusFilters = ref<Record<string, 'ALL' | 'PASS' | 'FAIL'>>({})

// Active station tab per ISN
const activeStationTabs = ref<Record<number, number>>({})

// Performance: Limit displayed records per ISN group
const INITIAL_DISPLAY_LIMIT = 50
const displayLimits = ref<Record<string, number>>({})

function getDisplayLimit(isn: string): number {
    return displayLimits.value[isn] || INITIAL_DISPLAY_LIMIT
}

function showMoreRecords(isn: string): void {
    displayLimits.value[isn] = (displayLimits.value[isn] || INITIAL_DISPLAY_LIMIT) + 50
}

// Fullscreen dialog controls
const fullscreenRecord = ref<NormalizedRecord | null>(null)
const showFullscreenDialog = ref(false)
const showCopySuccess = ref(false)
const fullscreenSearchQuery = ref('')
const fullscreenDownloading = ref(false)

// Original record for download (to get site/project info)
const fullscreenOriginalRecord = ref<IsnSearchData | null>(null)

// Download controls
const selectedRecordIndices = ref<string[]>([]) // Format: "tabIndex-recordIndex"
const downloadingKey = ref<string | null>(null)

const testItemHeaders = [
    { title: 'Test Item', key: 'NAME', sortable: true },
    { title: 'Status', key: 'STATUS', sortable: true },
    { title: 'Value', key: 'VALUE', sortable: true },
    { title: 'UCL', key: 'UCL', sortable: true },
    { title: 'LCL', key: 'LCL', sortable: true }
]

// Computed
const allExpanded = computed(() => {
    const currentTab = activeISNTab.value
    const currentGroup = groupedByISN.value[currentTab]
    if (!currentGroup) return false

    const activeStationTab = activeStationTabs.value[currentTab] || 0
    const currentStation = currentGroup.stations[activeStationTab]
    if (!currentStation) return false

    const panelKey = `${currentTab}-${activeStationTab}`
    const expanded = expandedPanels.value[panelKey] || []
    const filteredRecords = getFilteredStationRecords(currentGroup, currentStation)
    return expanded.length === filteredRecords.length && filteredRecords.length > 0
})

// Helper functions
function isValueData(item: IsnSearchTestItem): boolean {
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

function isPassFailData(item: IsnSearchTestItem): boolean {
    const value = item.VALUE?.toUpperCase() || ''
    const status = item.STATUS?.toUpperCase() || ''
    return (status === 'PASS' || status === 'FAIL' || status === '-1') &&
        (value === 'PASS' || value === 'FAIL' || value === '-999')
}

// Alias for better naming consistency
function isBinData(item: IsnSearchTestItem): boolean {
    return isPassFailData(item)
}

function isNonValueData(item: IsnSearchTestItem): boolean {
    return !isValueData(item) && !isBinData(item)
}

function filterTestItemsByType(items: IsnSearchTestItem[], filterType: 'all' | 'value' | 'non-value' | 'bin'): IsnSearchTestItem[] {
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

function filterTestItems(items: IsnSearchTestItem[] | undefined): IsnSearchTestItem[] {
    if (!items) return []
    // Default to 'value' filter for backward compatibility
    return filterTestItemsByType(items, 'value')
}

function filterAndSearchTestItems(items: IsnSearchTestItem[] | undefined, key: string): IsnSearchTestItem[] {
    if (!items) return []

    // Use fullscreen search query if key is 'fullscreen', otherwise use per-record filter
    const filterType = key === 'fullscreen' ? 'value' : (testItemFilters.value[key] || 'value')
    let filtered = filterTestItemsByType(items, filterType)

    // Apply test item status filter (PASS/FAIL)
    const statusFilter = testItemStatusFilters.value[key] || 'ALL'
    if (statusFilter !== 'ALL') {
        filtered = filtered.filter(item => item.STATUS === statusFilter)
    }

    // Get search terms - use fullscreen search query if key is 'fullscreen'
    const searchTerms = key === 'fullscreen'
        ? (fullscreenSearchQuery.value?.trim() ? [fullscreenSearchQuery.value.trim()] : [])
        : (testItemSearchTerms.value[key] || [])

    // Apply multi-term regex search (OR logic - at least one term must match)
    if (searchTerms.length > 0) {
        filtered = filtered.filter(item => {
            const searchableText = `${item.NAME || ''} ${item.STATUS || ''} ${item.VALUE || ''}`.toLowerCase()
            return searchTerms.some(term => {
                const trimmedTerm = term.trim().toLowerCase()
                if (!trimmedTerm) return false
                try {
                    const regex = new RegExp(trimmedTerm, 'i')
                    return regex.test(searchableText)
                } catch {
                    // If invalid regex, fall back to simple includes
                    return searchableText.includes(trimmedTerm)
                }
            })
        })
    }
    return filtered
}

function formatShortTime(timeStr: string): string {
    // Use the centralized helper to adjust time by -1 hour for display
    return adjustIplasDisplayTime(timeStr, 1)
}

function getValueClass(item: IsnSearchTestItem): string {
    if (item.VALUE === 'PASS') return 'text-success font-weight-medium'
    if (item.VALUE === 'FAIL') return 'text-error font-weight-medium'
    if (item.VALUE === '-999') return 'text-warning'
    return ''
}

function formatLocalTime(timeStr: string): string {
    // Use the centralized helper to adjust time by -1 hour for display
    return adjustIplasDisplayTime(timeStr, 1)
}

function calculateDuration(startStr: string, endStr: string): string {
    if (!startStr || !endStr) return '-'
    try {
        const cleanStart = startStr.replace('%:z', '').replace('T', ' ')
        const cleanEnd = endStr.replace('%:z', '').replace('T', ' ')
        const start = new Date(cleanStart.replace(' ', 'T') + 'Z')
        const end = new Date(cleanEnd.replace(' ', 'T') + 'Z')
        // Add +8 hours offset to both times
        const adjustedStart = new Date(start.getTime() + 8 * 60 * 60 * 1000)
        const adjustedEnd = new Date(end.getTime() + 8 * 60 * 60 * 1000)
        const diffMs = adjustedEnd.getTime() - adjustedStart.getTime()
        const seconds = (diffMs / 1000).toFixed(2)
        return `${seconds}s`
    } catch {
        return '-'
    }
}

function calculateTotalCycleTime(testItems: IsnSearchTestItem[] | undefined): string {
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
    const seconds = (totalSeconds % 60).toFixed(2)
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
}

// Helper functions for device ID filtering
function getUniqueDeviceIdsForStation(stationGroup: StationGroup): string[] {
    return [...new Set(stationGroup.records.map(r => r.device_id))]
}

function getFilteredStationRecords(isnGroup: ISNGroup, stationGroup: StationGroup): IsnSearchData[] {
    let records = stationGroup.records

    // Key for per-station status filter
    const stationKey = `${isnGroup.isn}-${stationGroup.stationName}`

    // Apply per-station status filter (PASS/FAIL)
    const statusFilter = stationStatusFilters.value[stationKey] || 'ALL'
    if (statusFilter !== 'ALL') {
        const isPass = statusFilter === 'PASS'
        records = records.filter(r => {
            const recordPass = r.test_status === 'PASS' && r.error_code === 'PASS'
            return isPass ? recordPass : !recordPass
        })
    }

    // Apply device ID filter
    const filterIds = selectedFilterDeviceIds.value[stationKey]
    if (filterIds && filterIds.length > 0) {
        records = records.filter(r => filterIds.includes(r.device_id))
    }

    // Apply search query filter
    const searchQuery = recordSearchQueries.value[stationKey]?.toLowerCase().trim()
    if (searchQuery) {
        records = records.filter(r => {
            const searchableText = [
                r.isn,
                r.device_id,
                r.error_code,
                r.error_name,
                r.station_name,
                r.display_station_name
            ].join(' ').toLowerCase()
            return searchableText.includes(searchQuery)
        })
    }

    return records
}

// Performance: Get limited records for display
function getDisplayedStationRecords(isnGroup: ISNGroup, stationGroup: StationGroup): IsnSearchData[] {
    const filtered = getFilteredStationRecords(isnGroup, stationGroup)
    const limit = getDisplayLimit(`${isnGroup.isn}-${stationGroup.stationName}`)
    // Sort by test_end_time descending (latest first)
    const sorted = [...filtered].sort((a, b) => {
        const timeA = new Date(a.test_end_time.replace('%:z', '').replace(' ', 'T') + 'Z').getTime()
        const timeB = new Date(b.test_end_time.replace('%:z', '').replace(' ', 'T') + 'Z').getTime()
        return timeB - timeA
    })
    return sorted.slice(0, limit)
}

function hasMoreStationRecords(isnGroup: ISNGroup, stationGroup: StationGroup): boolean {
    const filtered = getFilteredStationRecords(isnGroup, stationGroup)
    const limit = getDisplayLimit(`${isnGroup.isn}-${stationGroup.stationName}`)
    return filtered.length > limit
}

function getRemainingStationRecordsCount(isnGroup: ISNGroup, stationGroup: StationGroup): number {
    const filtered = getFilteredStationRecords(isnGroup, stationGroup)
    const limit = getDisplayLimit(`${isnGroup.isn}-${stationGroup.stationName}`)
    return Math.max(0, filtered.length - limit)
}

// Record search queries per station
const recordSearchQueries = ref<Record<string, string>>({})

// Get total filtered records count for a station
function getTotalFilteredStationRecords(isnGroup: ISNGroup, stationGroup: StationGroup): number {
    return getFilteredStationRecords(isnGroup, stationGroup).length
}

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
        console.error('Failed to copy to clipboard:', err)
    }
}

function normalizeIsnRecord(record: IsnSearchData): NormalizedRecord {
    return {
        isn: record.isn,
        deviceId: record.device_id,
        stationName: record.station_name,
        displayStationName: record.display_station_name,
        tsp: record.display_station_name, // ISN Search doesn't have TSP, use display_station_name
        site: record.site,
        project: record.project,
        line: record.line,
        errorCode: record.error_code,
        errorName: record.error_name,
        testStatus: record.test_status,
        testStartTime: record.test_start_time,
        testEndTime: record.test_end_time,
        testItems: record.test_item || []
    }
}

function openFullscreen(record: IsnSearchData): void {
    fullscreenOriginalRecord.value = record
    fullscreenRecord.value = normalizeIsnRecord(record)
    showFullscreenDialog.value = true
}

function closeFullscreen(): void {
    fullscreenRecord.value = null
    fullscreenOriginalRecord.value = null
    showFullscreenDialog.value = false
    fullscreenSearchQuery.value = ''
}

async function downloadSingleRecordFromFullscreen(): Promise<void> {
    if (!fullscreenOriginalRecord.value) return
    fullscreenDownloading.value = true
    try {
        const attachmentInfo = createAttachmentInfo(fullscreenOriginalRecord.value)
        await downloadAttachments(fullscreenOriginalRecord.value.site, fullscreenOriginalRecord.value.project, [attachmentInfo])
        showSuccess.value = true
    } catch (err) {
        console.error('Failed to download test log:', err)
    } finally {
        fullscreenDownloading.value = false
    }
}

function isRecordSelected(isnIndex: number, stationIndex: number, recordIndex: number): boolean {
    return selectedRecordIndices.value.includes(`${isnIndex}-${stationIndex}-${recordIndex}`)
}

function toggleRecordSelection(isnIndex: number, stationIndex: number, recordIndex: number): void {
    const key = `${isnIndex}-${stationIndex}-${recordIndex}`
    const idx = selectedRecordIndices.value.indexOf(key)
    if (idx === -1) {
        selectedRecordIndices.value.push(key)
    } else {
        selectedRecordIndices.value.splice(idx, 1)
    }
}

function toggleExpandAll(): void {
    const currentTab = activeISNTab.value
    const currentGroup = groupedByISN.value[currentTab]
    if (!currentGroup) return

    const activeStationTab = activeStationTabs.value[currentTab] || 0
    const currentStation = currentGroup.stations[activeStationTab]
    if (!currentStation) return

    const panelKey = `${currentTab}-${activeStationTab}`
    const currentExpanded = expandedPanels.value[panelKey] || []
    const filteredRecords = getFilteredStationRecords(currentGroup, currentStation)

    if (currentExpanded.length === filteredRecords.length && filteredRecords.length > 0) {
        expandedPanels.value[panelKey] = []
    } else {
        expandedPanels.value[panelKey] = filteredRecords.map((_, i) => i)
    }
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
 * Format time for download_attachment API (ISN Search data)
 * Input: "2025-09-16 13:23:57%:z" (UTC+0 time from isn_search API)
 * Output: "2025/09/16 20:23:57" (local time for PTB/PVN) or "2025/09/16 21:23:57" (for PSZ/PTY)
 * 
 * CRITICAL: isn_search API returns UTC+0 time. We need to convert to local time:
 * - PTB, PVN sites: add +7 hours
 * - PSZ, PTY sites: add +8 hours
 */
function formatTimeForDownloadWithTimezone(timeStr: string, site: string): string {
    if (!timeStr) return ''

    // Clean the time string: remove %:z suffix
    const cleanedTime = timeStr.replace('%:z', '').replace('T', ' ')

    // Parse as UTC
    const utcDate = new Date(cleanedTime.replace(' ', 'T') + 'Z')

    // Get timezone offset based on site
    const offsetHours = getSiteTimezoneOffset(site)

    // Add timezone offset
    const localDate = new Date(utcDate.getTime() + offsetHours * 60 * 60 * 1000)

    // Format as YYYY/MM/DD HH:mm:ss
    const year = localDate.getUTCFullYear()
    const month = String(localDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(localDate.getUTCDate()).padStart(2, '0')
    const hours = String(localDate.getUTCHours()).padStart(2, '0')
    const minutes = String(localDate.getUTCMinutes()).padStart(2, '0')
    const seconds = String(localDate.getUTCSeconds()).padStart(2, '0')

    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

function createAttachmentInfo(record: IsnSearchData): DownloadAttachmentInfo {
    return {
        isn: record.isn,
        // CRITICAL: Use test_end_time with timezone adjustment based on site
        time: formatTimeForDownloadWithTimezone(record.test_end_time, record.site),
        deviceid: record.device_id || '',
        // Use display_station_name as per API documentation
        station: record.display_station_name || record.station_name
    }
}

async function downloadSingleRecord(record: IsnSearchData, stationKey: string, recordIndex: number): Promise<void> {
    downloadingKey.value = `${stationKey}-${recordIndex}`
    try {
        const attachmentInfo = createAttachmentInfo(record)
        console.log('Download attachment info:', attachmentInfo)
        await downloadAttachments(record.site, record.project, [attachmentInfo])
        showSuccess.value = true
    } catch (err) {
        console.error('Failed to download test log:', err)
    } finally {
        downloadingKey.value = null
    }
}

async function downloadSelectedRecords(): Promise<void> {
    if (selectedRecordIndices.value.length === 0) return

    try {
        // Group by site and project
        const groupedByProject: Record<string, { site: string; project: string; attachments: DownloadAttachmentInfo[] }> = {}

        for (const key of selectedRecordIndices.value) {
            const parts = key.split('-').map(Number)
            const isnIdx = parts[0] as number
            const stationIdx = parts[1] as number
            const recordIdx = parts[2] as number
            const isnGroup = groupedByISN.value[isnIdx]
            if (!isnGroup) continue
            const stationGroup = isnGroup.stations[stationIdx]
            if (!stationGroup) continue
            const displayedRecords = getDisplayedStationRecords(isnGroup, stationGroup)
            const record = displayedRecords[recordIdx]
            if (!record) continue

            const projectKey = `${record.site}::${record.project}`
            if (!groupedByProject[projectKey]) {
                groupedByProject[projectKey] = {
                    site: record.site,
                    project: record.project,
                    attachments: []
                }
            }
            groupedByProject[projectKey].attachments.push(createAttachmentInfo(record))
        }

        // Download from each site/project
        for (const projectGroup of Object.values(groupedByProject)) {
            await downloadAttachments(projectGroup.site, projectGroup.project, projectGroup.attachments)
        }
        showSuccess.value = true
    } catch (err) {
        console.error('Failed to download test logs:', err)
    }
}

function groupDataByISN(data: IsnSearchData[]): ISNGroup[] {
    const groups: Record<string, ISNGroup> = {}

    for (const record of data) {
        if (!groups[record.isn]) {
            groups[record.isn] = {
                isn: record.isn,
                site: record.site,
                project: record.project,
                hasError: false,
                errorCount: 0,
                records: [],
                stations: []
            }
        }
        const group = groups[record.isn]
        if (group) {
            group.records.push(record)
            if (record.test_status !== 'PASS' || record.error_code !== 'PASS') {
                group.hasError = true
                group.errorCount++
            }
        }
    }

    // Group records within each ISN by station
    for (const isnGroup of Object.values(groups)) {
        const stationMap: Record<string, StationGroup> = {}

        for (const record of isnGroup.records) {
            const stationKey = record.display_station_name || record.station_name
            if (!stationMap[stationKey]) {
                stationMap[stationKey] = {
                    stationName: record.station_name,
                    displayName: record.display_station_name || record.station_name,
                    hasError: false,
                    errorCount: 0,
                    records: []
                }
            }
            const station = stationMap[stationKey]
            if (station) {
                station.records.push(record)
                if (record.test_status !== 'PASS' || record.error_code !== 'PASS') {
                    station.hasError = true
                    station.errorCount++
                }
            }
        }

        isnGroup.stations = Object.values(stationMap)
    }

    return Object.values(groups)
}

function clearAll(): void {
    searchIsn.value = ''
    selectedISNs.value = []
    groupedByISN.value = []
    hasSearched.value = false
    selectedRecordIndices.value = []
    expandedPanels.value = {}
    activeISNTab.value = 0
    activeStationTabs.value = {}
    stationStatusFilters.value = {}
    recordSearchQueries.value = {}
    selectedFilterDeviceIds.value = {}
    testItemFilters.value = {}
    testItemSearchTerms.value = {}
    clearIsnSearchData()
}

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

    clearIsnSearchData()
    selectedRecordIndices.value = []
    expandedPanels.value = {}
    hasSearched.value = true

    try {
        // Fetch all ISNs
        const allRecords: IsnSearchData[] = []

        for (const isn of isnList) {
            try {
                const data = await searchByIsn(isn)
                allRecords.push(...data)
            } catch (err) {
                console.warn(`Failed to fetch records for ISN ${isn}:`, err)
            }
        }

        // Group by ISN
        groupedByISN.value = groupDataByISN(allRecords)

        // Initialize expanded panels for first tab
        if (groupedByISN.value.length > 0) {
            expandedPanels.value[0] = [0]
            activeISNTab.value = 0

            // Initialize testItemFilters to 'value' for all records
            for (let isnIndex = 0; isnIndex < groupedByISN.value.length; isnIndex++) {
                const isnGroup = groupedByISN.value[isnIndex]
                if (!isnGroup) continue
                for (let stationIndex = 0; stationIndex < isnGroup.stations.length; stationIndex++) {
                    const station = isnGroup.stations[stationIndex]
                    if (!station) continue
                    for (let recordIndex = 0; recordIndex < station.records.length; recordIndex++) {
                        const key = `${isnGroup.isn}-${stationIndex}-${recordIndex}`
                        testItemFilters.value[key] = 'value'
                    }
                }
            }
        }
    } catch (err) {
        console.error('Search failed:', err)
    }
}
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

.gap-4 {
    gap: 1rem;
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
