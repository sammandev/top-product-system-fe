<template>
    <v-dialog v-model="isOpen" :max-width="isFullscreen ? undefined : '1200px'" :fullscreen="isFullscreen"
        :transition="isFullscreen ? 'dialog-bottom-transition' : 'dialog-transition'">
        <v-card v-if="record" class="d-flex flex-column"
            :style="{ height: isFullscreen ? '100vh' : '90vh', overflow: 'hidden' }">
            <!-- Sticky Header Container -->
            <div class="dialog-sticky-header flex-shrink-0"
                style="z-index: 10; background-color: rgb(var(--v-theme-surface));">
                <v-card-title class="d-flex justify-space-between align-center flex-shrink-0 bg-primary pa-2 py-1">
                    <div class="d-flex align-center">
                        <v-icon class="mr-2" color="white" size="small">mdi-table-eye</v-icon>
                        <span class="text-white text-body-1">Test Items Details</span>
                    </div>
                    <div class="d-flex align-center gap-2">
                        <v-btn variant="outlined" color="white" size="x-small" :loading="downloading"
                            @click="handleDownload">
                            <v-icon start size="x-small">mdi-download</v-icon>
                            Download
                        </v-btn>
                        <v-btn :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'" variant="text"
                            color="white" size="small" @click="isFullscreen = !isFullscreen"
                            :title="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'" />
                        <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="close" />
                    </div>
                </v-card-title>

                <!-- DUT Information Section -->
                <div class="flex-shrink-0 px-3 py-2">
                    <!-- Primary Information -->
                    <v-card variant="tonal" color="primary" class="mb-3">
                        <v-card-text class="py-3">
                            <v-row dense>
                                <v-col cols="12" md="6">
                                    <div class="d-flex align-center cursor-pointer"
                                        @click="copyToClipboard(record.isn)">
                                        <v-icon size="large" class="mr-3" color="primary">mdi-barcode</v-icon>
                                        <div>
                                            <div class="text-caption text-medium-emphasis">DUT ISN</div>
                                            <div class="text-h6 font-weight-bold">{{ record.isn || '-' }}</div>
                                        </div>
                                        <v-tooltip activator="parent" location="top">Click to copy ISN</v-tooltip>
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
                                    <div class="d-flex align-center cursor-pointer"
                                        @click="copyToClipboard(record.deviceId)">
                                        <v-icon size="small" class="mr-2">mdi-chip</v-icon>
                                        <span class="text-body-2">
                                            <strong>Device ID:</strong>
                                            <span class="ml-2 font-mono">{{ record.deviceId }}</span>
                                        </span>
                                        <v-tooltip activator="parent" location="top">Click to copy Device
                                            ID</v-tooltip>
                                    </div>
                                </v-col>
                                <v-col cols="12" md="4">
                                    <div class="d-flex align-center">
                                        <v-icon size="small" class="mr-2">mdi-map-marker</v-icon>
                                        <span class="text-body-2">
                                            <strong>Site:</strong>
                                            <span class="ml-2">{{ record.site }}</span>
                                        </span>
                                    </div>
                                </v-col>
                                <v-col cols="12" md="4">
                                    <div class="d-flex align-center">
                                        <v-icon size="small" class="mr-2">mdi-folder</v-icon>
                                        <span class="text-body-2">
                                            <strong>Project:</strong>
                                            <span class="ml-2">{{ record.project }}</span>
                                        </span>
                                    </div>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>

                    <!-- Timing & Status -->
                    <div class="d-flex align-center flex-wrap gap-2 text-caption">
                        <v-chip size="small" variant="tonal" color="primary" prepend-icon="mdi-calendar-clock" label>
                            <span class="text-medium-emphasis mr-1">Start:</span>
                            {{ formatTime(record.testStartTime) }}
                        </v-chip>
                        <v-chip size="small" variant="tonal" color="primary" prepend-icon="mdi-calendar-check" label>
                            <span class="text-medium-emphasis mr-1">End:</span>
                            {{ formatTime(record.testEndTime) }}
                        </v-chip>
                        <v-chip size="small" variant="tonal" color="secondary" prepend-icon="mdi-timer" label>
                            <span class="text-medium-emphasis mr-1">Duration:</span>
                            {{ calculateDuration(record.testStartTime, record.testEndTime) }}
                        </v-chip>
                        <v-chip size="small" variant="tonal" color="info" prepend-icon="mdi-list-box" label>
                            <span class="text-medium-emphasis mr-1">Test Items:</span>
                            {{ record.testItems?.length || 0 }}
                        </v-chip>
                        <v-chip size="small" :color="record.errorCode === 'PASS' ? 'success' : 'error'"
                            :prepend-icon="record.errorCode === 'PASS' ? 'mdi-check-circle' : 'mdi-alert-circle'"
                            class="cursor-pointer" label @click="copyToClipboard(record.errorCode)">
                            <span class="text-medium-emphasis mr-1">Status:</span>
                            {{ record.errorCode }}
                            <v-tooltip activator="parent" location="top">Click to copy Error Code</v-tooltip>
                        </v-chip>
                        <template v-if="record.errorName && record.errorName !== 'N/A' && record.errorCode !== 'PASS'">
                            <v-chip size="small" color="error" variant="outlined" class="cursor-pointer" label
                                prepend-icon="mdi-alert-octagon" @click="copyToClipboard(record.errorName)">
                                <span class="text-medium-emphasis mr-1">Error:</span>
                                {{ record.errorName }}
                                <v-tooltip activator="parent" location="top">Click to copy Error Name</v-tooltip>
                            </v-chip>
                        </template>
                    </div>
                </div>

                <v-divider class="flex-shrink-0" />
            </div>
            <!-- End Sticky Header Container -->

            <!-- Search and Filter Controls -->
            <v-card-text class="pb-2 pt-2 flex-shrink-0">
                <v-row dense>
                    <v-col cols="12" md="5">
                        <v-combobox v-model="searchTerms" label="Search Test Items (Regex)"
                            prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable
                            multiple chips closable-chips placeholder="Type and press Enter (OR logic)..."
                            hint="Multiple terms use OR logic">
                            <template #chip="{ props, item }">
                                <v-chip v-bind="props" :text="String(item.value || item)" size="small"
                                    color="primary" />
                            </template>
                        </v-combobox>
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-select v-model="testItemFilter" :items="testItemFilterOptions" item-title="title"
                            item-value="value" label="Data Type" variant="outlined" density="compact" hide-details
                            multiple chips closable-chips>
                            <template #chip="{ props, item }">
                                <v-chip v-bind="props" :text="item.title" size="small" />
                            </template>
                        </v-select>
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
    <v-snackbar v-model="showCopySuccess" :timeout="2000" color="success" location="bottom">
        <v-icon start>mdi-check</v-icon>
        Copied to clipboard!
    </v-snackbar>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { NormalizedRecord, NormalizedTestItem } from './IplasTestItemsFullscreenDialog.vue'
import { adjustIplasDisplayTime } from '@/shared/utils/helpers'

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

const isFullscreen = ref(false)

// Filter controls
const testItemFilter = ref<('all' | 'value' | 'non-value' | 'bin')[]>(['value'])
const searchTerms = ref<string[]>([])
const showCopySuccess = ref(false)

// Filter options for dropdown
const testItemFilterOptions = [
    { title: 'Criteria Data ★', value: 'value' },
    { title: 'Show All', value: 'all' },
    { title: 'Non-Criteria', value: 'non-value' },
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
        // First adjust the time by deducting 1 hour (iPLAS time offset)
        const adjustedTime = adjustIplasDisplayTime(timeStr, 1)
        const cleanedTime = adjustedTime.replace('%:z', '').replace('T', ' ')
        const date = new Date(cleanedTime.replace(' ', 'T'))
        return date.toLocaleString(undefined, {
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
    if (!text) return
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text)
        } else {
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

// Computed filtered test items
const filteredTestItems = computed(() => {
    if (!props.record?.testItems) return []

    let items = [...props.record.testItems]

    // Apply test item type filter (supports multiple selections)
    if (testItemFilter.value.length > 0 && !testItemFilter.value.includes('all')) {
        items = items.filter(item => {
            return testItemFilter.value.some(filterType => {
                switch (filterType) {
                    case 'value':
                        return isValueData(item)
                    case 'non-value':
                        return isNonValueData(item)
                    case 'bin':
                        return isBinData(item)
                    default:
                        return true
                }
            })
        })
    }

    // Apply multi-term regex search (OR logic)
    if (searchTerms.value.length > 0) {
        items = items.filter(item => {
            const searchableText = `${item.NAME || ''} ${item.STATUS || ''} ${item.VALUE || ''}`.toLowerCase()
            return searchTerms.value.some(term => {
                const trimmedTerm = term.trim().toLowerCase()
                if (!trimmedTerm) return false
                try {
                    const regex = new RegExp(trimmedTerm, 'i')
                    return regex.test(searchableText)
                } catch {
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
    searchTerms.value = []
}

function handleDownload(): void {
    emit('download')
}

// Reset filters when record changes - show all data if record has error
watch(() => props.record, (newRecord) => {
    if (newRecord && newRecord.errorCode !== 'PASS') {
        testItemFilter.value = ['all']
    } else {
        testItemFilter.value = ['value']
    }
    searchTerms.value = []
})
</script>

<style scoped>
.gap-2 {
    gap: 0.5rem;
}

.cursor-pointer {
    cursor: pointer;
}

:deep(.v-table--striped tbody tr:nth-of-type(even)) {
    background-color: rgba(0, 0, 0, 0.02);
}

:deep(.v-theme--dark .v-table--striped tbody tr:nth-of-type(even)) {
    background-color: rgba(255, 255, 255, 0.02);
}
</style>
