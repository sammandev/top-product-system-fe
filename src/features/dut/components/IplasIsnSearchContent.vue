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
                        <v-icon start>mdi-barcode</v-icon>
                        {{ isnGroup.isn }}
                        <v-chip size="x-small" :color="isnGroup.hasError ? 'error' : 'success'" class="ml-2">
                            {{ isnGroup.records.length }}
                        </v-chip>
                    </v-tab>
                </v-tabs>

                <v-window v-model="activeISNTab">
                    <v-window-item v-for="(isnGroup, tabIndex) in groupedByISN" :key="isnGroup.isn" :value="tabIndex">
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

                        <!-- Station Records -->
                        <v-expansion-panels v-model="expandedPanels[tabIndex]" multiple>
                            <v-expansion-panel v-for="(record, recordIndex) in isnGroup.records"
                                :key="`${isnGroup.isn}-${recordIndex}`">
                                <v-expansion-panel-title
                                    :class="record.test_status !== 'PASS' ? 'bg-red-lighten-5' : ''">
                                    <div class="d-flex align-center justify-space-between w-100 pr-4">
                                        <div class="d-flex align-center gap-2">
                                            <v-checkbox :model-value="isRecordSelected(tabIndex, recordIndex)"
                                                density="compact" hide-details class="flex-grow-0" @click.stop
                                                @update:model-value="toggleRecordSelection(tabIndex, recordIndex)" />
                                            <v-icon :color="record.test_status === 'PASS' ? 'success' : 'error'"
                                                size="small">
                                                {{ record.test_status === 'PASS' ? 'mdi-check-circle' :
                                                'mdi-alert-circle' }}
                                            </v-icon>
                                            <span class="font-weight-bold">{{ record.display_station_name ||
                                                record.station_name
                                                }}</span>
                                            <v-chip :color="record.test_status === 'PASS' ? 'success' : 'error'"
                                                size="x-small">
                                                {{ record.error_code }}
                                            </v-chip>
                                            <v-chip v-if="record.error_name && record.error_name !== 'N/A'"
                                                color="error" size="x-small" variant="outlined">
                                                {{ record.error_name }}
                                            </v-chip>
                                        </div>
                                        <div class="d-flex align-center gap-2 text-caption text-medium-emphasis">
                                            <v-chip size="x-small" color="secondary" variant="outlined">
                                                <v-icon start size="x-small">mdi-chip</v-icon>
                                                {{ record.device_id }}
                                            </v-chip>
                                            <v-chip size="x-small" variant="outlined">
                                                <v-icon start size="x-small">mdi-timer</v-icon>
                                                {{ calculateTotalCycleTime(record.test_item) }}
                                            </v-chip>
                                            <v-btn icon size="x-small" variant="text" color="primary"
                                                :loading="downloadingKey === `${tabIndex}-${recordIndex}`"
                                                @click.stop="downloadSingleRecord(record, tabIndex, recordIndex)">
                                                <v-icon size="small">mdi-download</v-icon>
                                                <v-tooltip activator="parent" location="top">Download Test
                                                    Log</v-tooltip>
                                            </v-btn>
                                        </div>
                                    </div>
                                </v-expansion-panel-title>
                                <v-expansion-panel-text>
                                    <!-- Record Details Grid -->
                                    <v-row class="mb-3">
                                        <v-col cols="6" sm="4" md="2">
                                            <div class="text-caption text-medium-emphasis">Site</div>
                                            <div class="font-weight-medium">{{ record.site }}</div>
                                        </v-col>
                                        <v-col cols="6" sm="4" md="2">
                                            <div class="text-caption text-medium-emphasis">Project</div>
                                            <div class="font-weight-medium">{{ record.project }}</div>
                                        </v-col>
                                        <v-col cols="6" sm="4" md="2">
                                            <div class="text-caption text-medium-emphasis">Station Name</div>
                                            <div class="font-weight-medium">{{ record.station_name }}</div>
                                        </v-col>
                                        <v-col cols="6" sm="4" md="2">
                                            <div class="text-caption text-medium-emphasis">Device ID</div>
                                            <div class="font-weight-medium">{{ record.device_id || '-' }}</div>
                                        </v-col>
                                        <v-col cols="6" sm="4" md="2">
                                            <div class="text-caption text-medium-emphasis">Error Code</div>
                                            <v-chip :color="record.error_code === 'PASS' ? 'success' : 'error'"
                                                size="x-small">
                                                {{ record.error_code }}
                                            </v-chip>
                                        </v-col>
                                        <v-col cols="6" sm="4" md="2">
                                            <div class="text-caption text-medium-emphasis">Error Name</div>
                                            <div class="font-weight-medium">{{ record.error_name || '-' }}</div>
                                        </v-col>
                                    </v-row>
                                    <v-row class="mb-3">
                                        <v-col cols="6" sm="4" md="2">
                                            <div class="text-caption text-medium-emphasis">Test Start Time</div>
                                            <div class="font-weight-medium">{{ formatLocalTime(record.test_start_time)
                                                }}</div>
                                        </v-col>
                                        <v-col cols="6" sm="4" md="2">
                                            <div class="text-caption text-medium-emphasis">Test End Time</div>
                                            <div class="font-weight-medium">{{ formatLocalTime(record.test_end_time) }}
                                            </div>
                                        </v-col>
                                        <v-col cols="6" sm="4" md="2">
                                            <div class="text-caption text-medium-emphasis">Test Duration</div>
                                            <div class="font-weight-medium">{{ calculateDuration(record.test_start_time,
                                                record.test_end_time) }}</div>
                                        </v-col>
                                        <v-col cols="6" sm="4" md="2">
                                            <div class="text-caption text-medium-emphasis">Total Cycle Time</div>
                                            <div class="font-weight-medium">{{ calculateTotalCycleTime(record.test_item)
                                                }}
                                            </div>
                                        </v-col>
                                        <v-col cols="6" sm="4" md="2">
                                            <div class="text-caption text-medium-emphasis">Line</div>
                                            <div class="font-weight-medium">{{ record.line || '-' }}</div>
                                        </v-col>
                                        <v-col cols="6" sm="4" md="2">
                                            <div class="text-caption text-medium-emphasis">MO</div>
                                            <div class="font-weight-medium">{{ record.mo || '-' }}</div>
                                        </v-col>
                                    </v-row>

                                    <!-- Test Items Table -->
                                    <v-data-table :headers="testItemHeaders" :items="filterTestItems(record.test_item)"
                                        :items-per-page="25" density="compact" class="elevation-1">
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
                                        Showing {{ filterTestItems(record.test_item).length }} of {{
                                        record.test_item?.length ||
                                        0 }} test items
                                    </div>
                                </v-expansion-panel-text>
                            </v-expansion-panel>
                        </v-expansion-panels>
                    </v-window-item>
                </v-window>
            </v-card-text>
        </v-card>

        <!-- Success Notification -->
        <v-snackbar v-model="showSuccess" color="success" timeout="3000">
            <v-icon class="mr-2">mdi-check-circle</v-icon>
            Test log downloaded successfully!
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIplasApi } from '@/features/dut_logs/composables/useIplasApi'
import type { IsnSearchData, IsnSearchTestItem, DownloadAttachmentInfo } from '@/features/dut_logs/api/iplasApi'

interface ISNGroup {
    isn: string
    site: string
    project: string
    hasError: boolean
    records: IsnSearchData[]
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
const testItemFilter = ref<'all' | 'value' | 'non-value' | 'pass-fail'>('value')
const expandedPanels = ref<Record<number, number[]>>({})

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

    const expanded = expandedPanels.value[currentTab] || []
    return expanded.length === currentGroup.records.length && currentGroup.records.length > 0
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

function isNonValueData(item: IsnSearchTestItem): boolean {
    return !isValueData(item) && !isPassFailData(item)
}

function filterTestItems(items: IsnSearchTestItem[] | undefined): IsnSearchTestItem[] {
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

function getValueClass(item: IsnSearchTestItem): string {
    if (item.VALUE === 'PASS') return 'text-success font-weight-medium'
    if (item.VALUE === 'FAIL') return 'text-error font-weight-medium'
    if (item.VALUE === '-999') return 'text-warning'
    return ''
}

function formatLocalTime(timeStr: string): string {
    if (!timeStr) return '-'
    try {
        // Handle format like "2025-09-16 13:23:57%:z"
        const cleanedTime = timeStr.replace('%:z', '').replace('T', ' ')
        const utcDate = new Date(cleanedTime.replace(' ', 'T') + 'Z')
        return utcDate.toLocaleString(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    } catch {
        return timeStr
    }
}

function calculateDuration(startStr: string, endStr: string): string {
    if (!startStr || !endStr) return '-'
    try {
        const cleanStart = startStr.replace('%:z', '').replace('T', ' ')
        const cleanEnd = endStr.replace('%:z', '').replace('T', ' ')
        const start = new Date(cleanStart.replace(' ', 'T') + 'Z')
        const end = new Date(cleanEnd.replace(' ', 'T') + 'Z')
        const diffMs = end.getTime() - start.getTime()
        const diffSeconds = Math.floor(diffMs / 1000)
        const minutes = Math.floor(diffSeconds / 60)
        const seconds = diffSeconds % 60
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`
        }
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

function isRecordSelected(tabIndex: number, recordIndex: number): boolean {
    return selectedRecordIndices.value.includes(`${tabIndex}-${recordIndex}`)
}

function toggleRecordSelection(tabIndex: number, recordIndex: number): void {
    const key = `${tabIndex}-${recordIndex}`
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

    const currentExpanded = expandedPanels.value[currentTab] || []
    if (currentExpanded.length === currentGroup.records.length) {
        expandedPanels.value[currentTab] = []
    } else {
        expandedPanels.value[currentTab] = currentGroup.records.map((_, i) => i)
    }
}

function formatTimeForDownload(timeStr: string): string {
    if (!timeStr) return ''
    // Convert "2025-09-16 13:23:57%:z" to "2025/09/16 13:23:57"
    return timeStr.replace('%:z', '').replace(/-/g, '/').replace('T', ' ')
}

function createAttachmentInfo(record: IsnSearchData): DownloadAttachmentInfo {
    return {
        isn: record.isn,
        time: formatTimeForDownload(record.test_start_time),
        deviceid: record.device_id || '',
        station: record.station_name
    }
}

async function downloadSingleRecord(record: IsnSearchData, tabIndex: number, recordIndex: number): Promise<void> {
    downloadingKey.value = `${tabIndex}-${recordIndex}`
    try {
        const attachmentInfo = createAttachmentInfo(record)
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
            const tabIdx = parts[0] as number
            const recordIdx = parts[1] as number
            const group = groupedByISN.value[tabIdx]
            if (!group) continue
            const record = group.records[recordIdx]
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
                records: []
            }
        }
        const group = groups[record.isn]
        if (group) {
            group.records.push(record)
            if (record.test_status !== 'PASS' || record.error_code !== 'PASS') {
                group.hasError = true
            }
        }
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
</style>
