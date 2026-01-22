<template>
    <v-dialog v-model="isOpen" fullscreen transition="dialog-bottom-transition">
        <v-card v-if="record">
            <v-toolbar color="primary">
                <v-btn icon @click="close">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
                <v-toolbar-title>
                    {{ record.displayStationName || record.stationName }}
                </v-toolbar-title>
                <v-spacer />
                <v-chip :color="record.errorCode === 'PASS' ? 'success' : 'error'" class="mr-4">
                    {{ record.errorCode }}
                </v-chip>
                <v-btn variant="outlined" color="white" :loading="downloading" @click="handleDownload">
                    <v-icon start>mdi-download</v-icon>
                    Download Log
                </v-btn>
            </v-toolbar>
            <v-card-text class="pa-6 fullscreen-content">
                <!-- Record Summary -->
                <v-row class="mb-6">
                    <v-col cols="12" sm="6" md="3">
                        <v-card variant="outlined" class="pa-3">
                            <div class="text-caption text-medium-emphasis">ISN</div>
                            <div class="text-h6 font-weight-bold text-primary">{{ record.isn || '-' }}</div>
                        </v-card>
                    </v-col>
                    <v-col cols="12" sm="6" md="3">
                        <v-card variant="outlined" class="pa-3">
                            <div class="text-caption text-medium-emphasis">Device ID</div>
                            <div class="text-h6 font-weight-bold">{{ record.deviceId }}</div>
                        </v-card>
                    </v-col>
                    <v-col cols="12" sm="6" md="3">
                        <v-card variant="outlined" class="pa-3">
                            <div class="text-caption text-medium-emphasis">Test Start Time</div>
                            <div class="text-h6">{{ formatTime(record.testStartTime) }}</div>
                        </v-card>
                    </v-col>
                    <v-col cols="12" sm="6" md="3">
                        <v-card variant="outlined" class="pa-3">
                            <div class="text-caption text-medium-emphasis">Test End Time</div>
                            <div class="text-h6">{{ formatTime(record.testEndTime) }}</div>
                        </v-card>
                    </v-col>
                </v-row>

                <v-row class="mb-4">
                    <v-col cols="12" sm="6" md="2">
                        <div class="text-caption text-medium-emphasis">Site</div>
                        <div class="font-weight-medium">{{ record.site }}</div>
                    </v-col>
                    <v-col cols="12" sm="6" md="2">
                        <div class="text-caption text-medium-emphasis">Project</div>
                        <div class="font-weight-medium">{{ record.project }}</div>
                    </v-col>
                    <v-col cols="12" sm="6" md="2">
                        <div class="text-caption text-medium-emphasis">Line</div>
                        <div class="font-weight-medium">{{ record.line || '-' }}</div>
                    </v-col>
                    <v-col cols="12" sm="6" md="3">
                        <div class="text-caption text-medium-emphasis">Station Name</div>
                        <div class="font-weight-medium">{{ record.stationName }}</div>
                    </v-col>
                    <v-col cols="12" sm="6" md="3">
                        <div class="text-caption text-medium-emphasis">TSP / Display Name</div>
                        <div class="font-weight-medium">{{ record.tsp || record.displayStationName || '-' }}</div>
                    </v-col>
                </v-row>

                <v-divider class="mb-4" />

                <!-- Filters Section -->
                <v-row class="mb-4" align="center">
                    <!-- Test Item Filter -->
                    <v-col cols="12" md="5">
                        <div class="d-flex align-center flex-wrap gap-2">
                            <span class="text-caption text-medium-emphasis mr-2">Filter Test Items:</span>
                            <v-chip-group v-model="testItemFilter" mandatory>
                                <v-chip value="value" filter variant="outlined" color="success">
                                    <v-icon start size="small">mdi-numeric</v-icon>
                                    Value Data
                                </v-chip>
                                <v-chip value="all" filter variant="outlined" color="primary">
                                    <v-icon start size="small">mdi-format-list-bulleted</v-icon>
                                    Show All
                                </v-chip>
                                <v-chip value="non-value" filter variant="outlined" color="warning">
                                    <v-icon start size="small">mdi-text</v-icon>
                                    Non-Value
                                </v-chip>
                                <v-chip value="bin" filter variant="outlined" color="info">
                                    <v-icon start size="small">mdi-check-decagram</v-icon>
                                    Bin Data
                                </v-chip>
                            </v-chip-group>
                        </div>
                    </v-col>

                    <!-- Test Status Filter -->
                    <v-col cols="12" md="3">
                        <div class="d-flex align-center flex-wrap gap-2">
                            <span class="text-caption text-medium-emphasis mr-2">Status:</span>
                            <v-chip-group v-model="testStatusFilter" mandatory>
                                <v-chip value="ALL" filter variant="outlined" color="primary">ALL</v-chip>
                                <v-chip value="PASS" filter variant="outlined" color="success">PASS</v-chip>
                                <v-chip value="FAIL" filter variant="outlined" color="error">FAIL</v-chip>
                            </v-chip-group>
                        </div>
                    </v-col>

                    <!-- Search -->
                    <v-col cols="12" md="4">
                        <v-combobox v-model="searchTerms" label="Search Test Items (Regex)"
                            prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details
                            clearable multiple chips closable-chips
                            placeholder="Type and press Enter for multiple search terms..."
                            hint="Press Enter to add search terms. Supports regex." />
                    </v-col>
                </v-row>

                <!-- Test Items Table (Fullsize) -->
                <v-data-table :headers="testItemHeaders" :items="filteredTestItems" :items-per-page="100"
                    :height="tableHeight" density="comfortable" fixed-header class="elevation-1 v-table--striped">
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

                <div class="text-caption text-medium-emphasis mt-2">
                    Showing {{ filteredTestItems.length }} of {{ record.testItems?.length || 0 }} test items
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

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

// Table height for fullsize display
const tableHeight = ref('calc(100vh - 500px)')

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

    // Apply multi-term regex search (AND logic - all terms must match)
    if (searchTerms.value.length > 0) {
        items = items.filter(item => {
            const searchableText = `${item.NAME || ''} ${item.STATUS || ''} ${item.VALUE || ''}`.toLowerCase()
            return searchTerms.value.every(term => {
                const trimmedTerm = term.trim().toLowerCase()
                if (!trimmedTerm) return true
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

// Handle window resize
function updateTableHeight(): void {
    tableHeight.value = `calc(100vh - 480px)`
}

onMounted(() => {
    updateTableHeight()
    window.addEventListener('resize', updateTableHeight)
})

onUnmounted(() => {
    window.removeEventListener('resize', updateTableHeight)
})

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
