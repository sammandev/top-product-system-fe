<template>
    <div>
        <!-- Server-side Data Table with Selection Support -->
        <v-data-table-server
            v-model:items-per-page="itemsPerPage"
            v-model:page="page"
            v-model:sort-by="sortBy"
            v-model:expanded="expanded"
            :model-value="selectedKeys"
            :headers="computedHeaders"
            :items="itemsWithKeys"
            :items-length="totalItems"
            :loading="loading"
            item-value="recordKey"
            :show-select="selectable"
            show-expand
            hover
            class="elevation-1"
            @update:options="onOptionsUpdate"
            @update:model-value="onSelectionChange"
        >
            <!-- ISN Column with Copy Button -->
            <template #item.ISN="{ item }">
                <div class="d-flex align-center gap-1">
                    <v-btn icon size="x-small" variant="text" color="primary" @click.stop="copyToClipboard(item.ISN)">
                        <v-icon size="small">mdi-content-copy</v-icon>
                        <v-tooltip activator="parent" location="top">Copy ISN</v-tooltip>
                    </v-btn>
                    <span class="font-weight-medium">{{ item.ISN || '-' }}</span>
                </div>
            </template>

            <!-- Device ID Column -->
            <template #item.DeviceId="{ item }">
                <v-chip 
                    size="x-small" 
                    color="secondary" 
                    variant="outlined"
                    class="cursor-pointer"
                    @click.stop="copyToClipboard(item.DeviceId)"
                >
                    {{ item.DeviceId }}
                    <v-tooltip activator="parent" location="top">Click to copy</v-tooltip>
                </v-chip>
            </template>

            <!-- Error Code Column -->
            <template #item.ErrorCode="{ item }">
                <v-chip 
                    :color="getStatusColor(item.ErrorCode)" 
                    size="x-small"
                    class="cursor-pointer"
                    @click.stop="copyToClipboard(item.ErrorCode)"
                >
                    {{ item.ErrorCode }}
                    <v-tooltip activator="parent" location="top">Click to copy</v-tooltip>
                </v-chip>
            </template>

            <!-- Error Name Column -->
            <template #item.ErrorName="{ item }">
                <template v-if="item.ErrorName && item.ErrorName !== 'N/A' && !isStatusPass(item.ErrorCode)">
                    <v-chip 
                        color="error" 
                        size="x-small" 
                        variant="outlined"
                        class="cursor-pointer"
                        @click.stop="copyToClipboard(item.ErrorName)"
                    >
                        {{ item.ErrorName }}
                        <v-tooltip activator="parent" location="top">Click to copy</v-tooltip>
                    </v-chip>
                </template>
                <span v-else class="text-medium-emphasis">-</span>
            </template>

            <!-- Test Start Time Column -->
            <template #item.TestStartTime="{ item }">
                {{ formatDateTime(item['Test Start Time']) }}
            </template>

            <!-- Test End Time Column -->
            <template #item.TestEndTime="{ item }">
                {{ formatDateTime(item['Test end Time']) }}
            </template>

            <!-- Duration Column -->
            <template #item.Duration="{ item }">
                <v-chip size="x-small" variant="outlined">
                    {{ calculateDuration(item['Test Start Time'], item['Test end Time']) }}
                </v-chip>
            </template>

            <!-- Test Item Count Column -->
            <template #item.TestItemCount="{ item }">
                <v-chip size="x-small" color="info" variant="outlined">
                    {{ getTestItemCount(item) }}
                </v-chip>
            </template>

            <!-- Actions Column -->
            <template #item.actions="{ item }">
                <div class="d-flex gap-1">
                    <v-btn 
                        icon 
                        size="x-small" 
                        variant="outlined" 
                        color="secondary"
                        @click.stop="$emit('open-fullscreen', item)"
                    >
                        <v-icon size="small">mdi-fullscreen</v-icon>
                        <v-tooltip activator="parent" location="top">Fullscreen View</v-tooltip>
                    </v-btn>
                    <v-btn 
                        icon 
                        size="x-small" 
                        variant="outlined" 
                        color="primary"
                        :loading="downloadingRecord === item.recordKey"
                        @click.stop="$emit('download', item)"
                    >
                        <v-icon size="small">mdi-download</v-icon>
                        <v-tooltip activator="parent" location="top">Download Test Log</v-tooltip>
                    </v-btn>
                </div>
            </template>

            <!-- Expanded Row Content -->
            <template #expanded-row="{ columns, item }">
                <tr>
                    <td :colspan="columns.length" class="pa-4 bg-grey-lighten-4">
                        <!-- Loading state for test items -->
                        <div v-if="loadingTestItems.has(item.recordKey)" class="d-flex align-center justify-center py-4">
                            <v-progress-circular indeterminate color="primary" size="24" />
                            <span class="ml-2">Loading test items...</span>
                        </div>
                        
                        <!-- Test items table -->
                        <v-data-table 
                            v-else-if="testItemsCache.has(item.recordKey)"
                            :headers="testItemHeaders"
                            :items="testItemsCache.get(item.recordKey)"
                            density="compact"
                            :items-per-page="10"
                            class="elevation-0"
                        >
                            <template #item.VALUE="{ item: testItem }">
                                <span class="font-weight-medium">{{ testItem.VALUE }}</span>
                            </template>
                            <template #item.STATUS="{ item: testItem }">
                                <v-chip 
                                    :color="testItem.STATUS === 'PASS' ? 'success' : 'error'" 
                                    size="x-small"
                                >
                                    {{ testItem.STATUS }}
                                </v-chip>
                            </template>
                        </v-data-table>

                        <!-- No test items loaded yet -->
                        <div v-else class="text-center py-4">
                            <v-btn 
                                color="primary" 
                                variant="outlined" 
                                size="small"
                                @click="loadTestItems(item)"
                            >
                                <v-icon start>mdi-download</v-icon>
                                Load Test Items ({{ getTestItemCount(item) }})
                            </v-btn>
                        </div>
                    </td>
                </tr>
            </template>

            <!-- Loading Overlay -->
            <template #loading>
                <v-skeleton-loader type="table-row@5" />
            </template>

            <!-- No Data -->
            <template #no-data>
                <div class="text-center py-4">
                    <v-icon size="48" color="grey">mdi-database-off-outline</v-icon>
                    <div class="text-h6 mt-2 text-grey">No records found</div>
                    <div class="text-body-2 text-grey">Try adjusting your search criteria</div>
                </div>
            </template>
        </v-data-table-server>

        <!-- Copy Success Snackbar -->
        <v-snackbar v-model="showCopySuccess" :timeout="2000" color="success" location="bottom">
            <v-icon start>mdi-check</v-icon>
            Copied to clipboard!
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { adjustIplasDisplayTime, getStatusColor, isStatusPass } from '@/shared/utils/helpers'
import type { CompactCsvTestItemData, CsvTestItemData, TestItem } from '@/features/dut_logs/api/iplasProxyApi'

// Props
const props = withDefaults(defineProps<{
    items: (CsvTestItemData | CompactCsvTestItemData)[]
    totalItems: number
    loading: boolean
    downloadingRecord?: string | null
    selectable?: boolean
    selectedKeys?: string[]
}>(), {
    selectable: false,
    selectedKeys: () => []
})

// Emits
const emit = defineEmits<{
    (e: 'update:options', options: { page: number; itemsPerPage: number; sortBy: { key: string; order: 'asc' | 'desc' }[] }): void
    (e: 'update:selected-keys', keys: string[]): void
    (e: 'load-test-items', record: CsvTestItemData | CompactCsvTestItemData): void
    (e: 'open-fullscreen', record: CsvTestItemData | CompactCsvTestItemData): void
    (e: 'download', record: CsvTestItemData | CompactCsvTestItemData): void
}>()

// Table state
const page = ref(1)
const itemsPerPage = ref(25)
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([{ key: 'TestStartTime', order: 'desc' }])
const expanded = ref<string[]>([])

// Test items cache (managed externally but exposed here for display)
const testItemsCache = ref<Map<string, TestItem[]>>(new Map())
const loadingTestItems = ref<Set<string>>(new Set())

// Copy success state
const showCopySuccess = ref(false)

// Computed items with recordKey added for v-data-table item-value
const itemsWithKeys = computed(() => 
    props.items.map(item => ({
        ...item,
        recordKey: `${item.ISN}_${item['Test Start Time']}`
    }))
)

// Computed headers - include selection column when selectable
const computedHeaders = computed(() => {
    return [
        { title: 'ISN', key: 'ISN', sortable: true, width: '180px' },
        { title: 'Device ID', key: 'DeviceId', sortable: true, width: '120px' },
        { title: 'Error Code', key: 'ErrorCode', sortable: true, width: '100px' },
        { title: 'Error Name', key: 'ErrorName', sortable: false, width: '150px' },
        { title: 'Test Start', key: 'TestStartTime', sortable: true, width: '150px' },
        { title: 'Test End', key: 'TestEndTime', sortable: true, width: '150px' },
        { title: 'Duration', key: 'Duration', sortable: false, width: '100px' },
        { title: 'Test Items', key: 'TestItemCount', sortable: false, width: '100px' },
        { title: 'Actions', key: 'actions', sortable: false, width: '100px' }
    ]
})

// Test item headers for expanded row
const testItemHeaders = [
    { title: 'Name', key: 'NAME', sortable: true },
    { title: 'Status', key: 'STATUS', sortable: true, width: '100px' },
    { title: 'Value', key: 'VALUE', sortable: false, width: '120px' },
    { title: 'UCL', key: 'UCL', sortable: false, width: '100px' },
    { title: 'LCL', key: 'LCL', sortable: false, width: '100px' }
]

// Helper functions
function formatDateTime(dateStr: string | undefined): string {
    if (!dateStr) return '-'
    return adjustIplasDisplayTime(dateStr, 1)
}

function calculateDuration(startStr: string | undefined, endStr: string | undefined): string {
    if (!startStr || !endStr) return '-'
    try {
        const start = new Date(startStr)
        const end = new Date(endStr)
        const diffMs = end.getTime() - start.getTime()
        const diffSecs = Math.floor(diffMs / 1000)
        const mins = Math.floor(diffSecs / 60)
        const secs = diffSecs % 60
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    } catch {
        return '-'
    }
}

function getTestItemCount(record: CsvTestItemData | CompactCsvTestItemData): number {
    if ('TestItemCount' in record) {
        return record.TestItemCount
    }
    return record.TestItem?.length || 0
}

function copyToClipboard(text: string | undefined) {
    if (!text) return
    navigator.clipboard.writeText(text)
    showCopySuccess.value = true
}

function loadTestItems(record: CsvTestItemData | CompactCsvTestItemData) {
    emit('load-test-items', record)
}

function onOptionsUpdate(options: { page: number; itemsPerPage: number; sortBy: { key: string; order: 'asc' | 'desc' }[] }) {
    emit('update:options', options)
}

function onSelectionChange(keys: string[]) {
    emit('update:selected-keys', keys)
}

// Update cache when test items are loaded externally
defineExpose({
    setTestItems(key: string, items: TestItem[]) {
        testItemsCache.value.set(key, items)
        loadingTestItems.value.delete(key)
    },
    setLoadingTestItems(key: string, loading: boolean) {
        if (loading) {
            loadingTestItems.value.add(key)
        } else {
            loadingTestItems.value.delete(key)
        }
    }
})
</script>

<style scoped>
.cursor-pointer {
    cursor: pointer;
}
</style>
