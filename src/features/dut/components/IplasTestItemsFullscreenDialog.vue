<template>
    <v-dialog v-model="isOpen" fullscreen transition="dialog-bottom-transition">
        <v-card v-if="record" class="d-flex flex-column" style="height: 100vh; overflow: hidden;">
            <!-- Sticky Header Container -->
            <div class="dialog-sticky-header flex-shrink-0"
                style="z-index: 10; background-color: rgb(var(--v-theme-surface));">
                <v-card-title class="d-flex justify-space-between align-center flex-shrink-0 bg-primary pa-3">
                    <div class="d-flex align-center">
                        <v-icon class="mr-2" color="white">mdi-table-eye</v-icon>
                        <span class="text-white">Test Items Details</span>
                    </div>
                    <div class="d-flex align-center gap-2">
                        <v-btn variant="outlined" color="white" size="small" :loading="downloading" @click="handleDownload">
                            <v-icon start size="small">mdi-download</v-icon>
                            Download Log
                        </v-btn>
                        <v-btn icon="mdi-close" variant="text" color="white" @click="close" />
                    </div>
                </v-card-title>

                <!-- DUT Information Section -->
                <div class="flex-shrink-0">
                    <v-card-subtitle class="pa-4 py-2">
                        <!-- Primary Information Card -->
                        <v-card variant="tonal" color="primary" class="mb-3">
                            <v-card-text class="py-3">
                                <v-row dense>
                                    <v-col cols="12" md="6">
                                        <div class="d-flex align-center">
                                            <v-icon size="large" class="mr-3" color="primary">mdi-barcode</v-icon>
                                            <div>
                                                <div class="text-caption text-medium-emphasis">DUT ISN</div>
                                                <div class="d-flex align-center gap-2">
                                                    <span class="text-h6 font-weight-bold">{{ record.isn || '-' }}</span>
                                                    <v-btn v-if="record.isn" icon size="x-small" variant="text"
                                                        @click="copyToClipboard(record.isn)">
                                                        <v-icon size="small">mdi-content-copy</v-icon>
                                                        <v-tooltip activator="parent" location="top">Copy ISN</v-tooltip>
                                                    </v-btn>
                                                </div>
                                            </div>
                                        </div>
                                    </v-col>
                                    <v-col cols="12" md="6">
                                        <div class="d-flex align-center">
                                            <v-icon size="large" class="mr-3" color="primary">mdi-factory</v-icon>
                                            <div>
                                                <div class="text-caption text-medium-emphasis">Station</div>
                                                <div class="text-h6 font-weight-bold">
                                                    {{ record.displayStationName || record.stationName }}
                                                </div>
                                            </div>
                                        </div>
                                    </v-col>
                                </v-row>
                            </v-card-text>
                        </v-card>

                        <!-- Device & Identifiers -->
                        <v-card variant="outlined" class="mb-3">
                            <v-card-text class="py-2">
                                <v-row dense>
                                    <v-col cols="12" md="4">
                                        <div class="d-flex align-center">
                                            <v-icon size="small" class="mr-2">mdi-chip</v-icon>
                                            <span class="text-body-2">
                                                <strong>Device ID:</strong>
                                                <span class="ml-2 font-mono">{{ record.deviceId }}</span>
                                            </span>
                                        </div>
                                    </v-col>
                                    <v-col cols="12" md="4">
                                        <div class="d-flex align-center">
                                            <v-icon size="small" class="mr-2">mdi-map-marker</v-icon>
                                            <span class="text-body-2">
                                                <strong>Site / Project:</strong>
                                                <span class="ml-2">{{ record.site }} / {{ record.project }}</span>
                                            </span>
                                        </div>
                                    </v-col>
                                    <v-col cols="12" md="4">
                                        <div class="d-flex align-center">
                                            <v-icon size="small" class="mr-2">mdi-router-wireless</v-icon>
                                            <span class="text-body-2">
                                                <strong>TSP:</strong>
                                                <span class="ml-2">{{ record.tsp || record.displayStationName || '-' }}</span>
                                            </span>
                                        </div>
                                    </v-col>
                                </v-row>
                            </v-card-text>
                        </v-card>

                        <!-- Timing & Status Row -->
                        <v-row dense class="mb-2">
                            <v-col cols="12" sm="6" md="3">
                                <v-card variant="outlined" class="h-100">
                                    <v-card-text class="py-2">
                                        <div class="d-flex align-center">
                                            <v-icon size="small" class="mr-2">mdi-calendar-clock</v-icon>
                                            <div class="text-body-2">
                                                <div><strong>Test Start</strong></div>
                                                <div class="text-caption">{{ formatTime(record.testStartTime) }}</div>
                                            </div>
                                        </div>
                                    </v-card-text>
                                </v-card>
                            </v-col>
                            <v-col cols="12" sm="6" md="3">
                                <v-card variant="outlined" class="h-100">
                                    <v-card-text class="py-2">
                                        <div class="d-flex align-center">
                                            <v-icon size="small" class="mr-2">mdi-calendar-check</v-icon>
                                            <div class="text-body-2">
                                                <div><strong>Test End</strong></div>
                                                <div class="text-caption">{{ formatTime(record.testEndTime) }}</div>
                                            </div>
                                        </div>
                                    </v-card-text>
                                </v-card>
                            </v-col>
                            <v-col cols="12" sm="6" md="3">
                                <v-card variant="outlined" class="h-100">
                                    <v-card-text class="py-2">
                                        <div class="d-flex align-center">
                                            <v-icon size="small" class="mr-2">mdi-timer</v-icon>
                                            <div class="text-body-2">
                                                <div><strong>Test Duration</strong></div>
                                                <div class="text-body-2 font-weight-medium">
                                                    {{ calculateDuration(record.testStartTime, record.testEndTime) }}
                                                </div>
                                            </div>
                                        </div>
                                    </v-card-text>
                                </v-card>
                            </v-col>
                            <v-col cols="12" sm="6" md="3">
                                <v-card variant="outlined" class="h-100">
                                    <v-card-text class="py-2">
                                        <div class="d-flex align-center">
                                            <v-icon size="small" class="mr-2">mdi-list-box</v-icon>
                                            <div class="text-body-2">
                                                <div><strong>Test Items</strong></div>
                                                <v-chip size="small" color="info">
                                                    {{ record.testItems?.length || 0 }}
                                                </v-chip>
                                            </div>
                                        </div>
                                    </v-card-text>
                                </v-card>
                            </v-col>
                        </v-row>

                        <!-- Error Status Row -->
                        <v-row dense class="mb-1">
                            <v-col cols="12">
                                <v-card :variant="record.errorCode !== 'PASS' ? 'tonal' : 'outlined'"
                                    :color="record.errorCode !== 'PASS' ? 'error' : 'success'" class="h-100">
                                    <v-card-text class="py-2">
                                        <div class="d-flex align-start">
                                            <v-icon size="small" class="mr-2 mt-1"
                                                :color="record.errorCode !== 'PASS' ? 'error' : 'success'">
                                                {{ record.errorCode !== 'PASS' ? 'mdi-alert-circle' : 'mdi-check-circle' }}
                                            </v-icon>
                                            <div class="flex-grow-1" style="min-width: 0;">
                                                <div>
                                                    <strong>Test Status:</strong>
                                                    <v-chip :color="record.errorCode === 'PASS' ? 'success' : 'error'" 
                                                        size="small" class="ml-2">
                                                        {{ record.errorCode }}
                                                    </v-chip>
                                                </div>
                                                <div v-if="record.errorName && record.errorName !== 'N/A'"
                                                    class="text-caption mt-1 font-weight-medium"
                                                    style="word-break: break-word; overflow-wrap: break-word;">
                                                    Error: {{ record.errorName }}
                                                </div>
                                            </div>
                                        </div>
                                    </v-card-text>
                                </v-card>
                            </v-col>
                        </v-row>
                    </v-card-subtitle>
                </div>

                <v-divider class="flex-shrink-0" />
            </div>
            <!-- End Sticky Header Container -->

            <!-- Search and Filter Controls (Fixed, non-scrollable) -->
            <v-card-text class="pb-2 pt-3 flex-shrink-0">
                <v-row dense>
                    <v-col cols="12" md="4">
                        <v-combobox v-model="searchTerms" label="Search Test Items (Regex)"
                            prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable
                            multiple chips closable-chips
                            placeholder="Type and press Enter (OR logic)..."
                            hint="Multiple terms use OR logic">
                            <template #chip="{ props, item }">
                                <v-chip v-bind="props" :text="String(item.value || item)" size="small" color="primary" />
                            </template>
                        </v-combobox>
                    </v-col>
                    <v-col cols="12" md="2">
                        <v-select v-model="testStatusFilter" :items="['ALL', 'PASS', 'FAIL']" label="Status Filter"
                            variant="outlined" density="compact" hide-details />
                    </v-col>
                    <v-col cols="12" md="3">
                        <v-select v-model="testItemFilter" :items="testItemFilterOptions" item-title="title" 
                            item-value="value" label="Data Type" variant="outlined" density="compact" hide-details />
                    </v-col>
                    <v-col cols="12" md="3">
                        <div class="d-flex align-center justify-end h-100">
                            <span class="text-caption text-medium-emphasis">
                                Showing {{ filteredTestItems.length }} of {{ record.testItems?.length || 0 }} items
                            </span>
                        </div>
                    </v-col>
                </v-row>
            </v-card-text>

            <!-- Data Table Container -->
            <div class="flex-grow-1" style="min-height: 0; overflow: hidden;">
                <v-data-table :headers="testItemHeaders" :items="filteredTestItems" :items-per-page="50"
                    density="comfortable" fixed-header fixed-footer style="height: 100%;"
                    class="elevation-1 v-table--striped">
                    <template #item.STATUS="{ item }">
                        <v-chip :color="item.STATUS === 'PASS' ? 'success' : 'error'" size="small">
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
            </div>
        </v-card>
    </v-dialog>

    <!-- Copy Success Snackbar -->
    <v-snackbar v-model="showCopySuccess" :timeout="2000" color="success" location="top">
        <v-icon start>mdi-check</v-icon>
        Copied to clipboard!
    </v-snackbar>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Normalized test item interface
export interface NormalizedTestItem {
    NAME: string
    STATUS: 'PASS' | 'FAIL' | string
    VALUE: string
    UCL: string
    LCL: string
    CYLCE?: string
}

// Normalized record interface that works for both Station Search and ISN Search
export interface NormalizedRecord {
    // Identifiers
    isn: string
    deviceId: string
    // Station info
    stationName: string
    displayStationName: string
    tsp?: string // TSP from Station Search
    // Location
    site: string
    project: string
    line: string
    // Test result
    errorCode: string
    errorName: string
    testStatus: string
    // Time
    testStartTime: string
    testEndTime: string
    // Test items
    testItems: NormalizedTestItem[]
}

interface Props {
    modelValue: boolean
    record: NormalizedRecord | null
    downloading?: boolean
}

interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'download'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Dialog state
const isOpen = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

// Filter controls
const testItemFilter = ref<'all' | 'value' | 'non-value' | 'bin'>('value')
const testStatusFilter = ref<'ALL' | 'PASS' | 'FAIL'>('ALL')
const searchTerms = ref<string[]>([])
const showCopySuccess = ref(false)

// Filter options for dropdown
const testItemFilterOptions = [
    { title: 'Value Data', value: 'value' },
    { title: 'Show All', value: 'all' },
    { title: 'Non-Value', value: 'non-value' },
    { title: 'Bin Data', value: 'bin' }
]

const testItemHeaders = [
    { title: 'Test Item', key: 'NAME', sortable: true },
    { title: 'Status', key: 'STATUS', sortable: true },
    { title: 'Value', key: 'VALUE', sortable: true },
    { title: 'UCL', key: 'UCL', sortable: true },
    { title: 'LCL', key: 'LCL', sortable: true }
]

// Helper functions
function isValueData(item: NormalizedTestItem): boolean {
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

function isPassFailData(item: NormalizedTestItem): boolean {
    const value = item.VALUE?.toUpperCase() || ''
    const status = item.STATUS?.toUpperCase() || ''
    return (status === 'PASS' || status === 'FAIL' || status === '-1') &&
        (value === 'PASS' || value === 'FAIL' || value === '-999')
}

// Alias for better naming consistency
function isBinData(item: NormalizedTestItem): boolean {
    return isPassFailData(item)
}

function isNonValueData(item: NormalizedTestItem): boolean {
    return !isValueData(item) && !isBinData(item)
}

function getValueClass(item: NormalizedTestItem): string {
    if (item.VALUE === 'PASS') return 'text-success font-weight-medium'
    if (item.VALUE === 'FAIL') return 'text-error font-weight-medium'
    if (item.VALUE === '-999') return 'text-warning'
    return ''
}

function formatTime(timeStr: string): string {
    if (!timeStr) return '-'
    try {
        // Handle format like "2025-09-16 13:23:57%:z" (UTC time from API)
        const cleanedTime = timeStr.replace('%:z', '').replace('T', ' ')
        const utcDate = new Date(cleanedTime.replace(' ', 'T') + 'Z')
        // Convert UTC to local time
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
        return `${minutes}m ${seconds}s`
    } catch {
        return '-'
    }
}

async function copyToClipboard(text: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(text)
        showCopySuccess.value = true
    } catch (err) {
        console.error('Failed to copy:', err)
    }
}

// Computed filtered test items
const filteredTestItems = computed(() => {
    if (!props.record?.testItems) return []

    let items = [...props.record.testItems]

    // Apply test item type filter
    switch (testItemFilter.value) {
        case 'value':
            items = items.filter(isValueData)
            break
        case 'non-value':
            items = items.filter(isNonValueData)
            break
        case 'bin':
            items = items.filter(isBinData)
            break
    }

    // Apply test status filter
    if (testStatusFilter.value !== 'ALL') {
        items = items.filter(item => item.STATUS === testStatusFilter.value)
    }

    // Apply multi-term regex search (OR logic - any term must match)
    if (searchTerms.value.length > 0) {
        items = items.filter(item => {
            const searchableText = `${item.NAME || ''} ${item.STATUS || ''} ${item.VALUE || ''}`.toLowerCase()
            // OR logic: at least one term must match
            return searchTerms.value.some(term => {
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

    return items
})

// Methods
function close(): void {
    isOpen.value = false
    // Reset filters when closing
    testItemFilter.value = 'value'
    testStatusFilter.value = 'ALL'
    searchTerms.value = []
}

function handleDownload(): void {
    emit('download')
}

// Reset filters when record changes
watch(() => props.record, () => {
    testItemFilter.value = 'value'
    testStatusFilter.value = 'ALL'
    searchTerms.value = []
})
</script>

<style scoped>
.fullscreen-content {
    height: calc(100vh - 64px);
    overflow-y: auto;
}

.gap-2 {
    gap: 0.5rem;
}

.gap-4 {
    gap: 1rem;
}

/* Striped table styling */
:deep(.v-table--striped tbody tr:nth-of-type(even)) {
    background-color: rgba(0, 0, 0, 0.02);
}

:deep(.v-theme--dark .v-table--striped tbody tr:nth-of-type(even)) {
    background-color: rgba(255, 255, 255, 0.02);
}
</style>
