<template>
    <div>
        <!-- UPDATED: Support both server-side and client-side pagination modes -->
        <!-- Server-side Data Table with Selection Support -->
        <v-data-table-server v-if="serverSide" v-model:items-per-page="itemsPerPage" v-model:page="page"
            v-model:sort-by="sortBy" :model-value="selectedKeys" :headers="computedHeaders" :items="itemsWithKeys"
            :items-length="totalItems" :loading="loading" item-value="recordKey" :show-select="selectable" hover
            class="elevation-1 clickable-rows" @update:options="onOptionsUpdate" @update:model-value="onSelectionChange"
            @click:row="handleRowClick">
            <!-- ISN Column with Copy Button on Left -->
            <template #item.ISN="{ item }">
                <div class="d-flex align-center gap-1">
                    <v-btn icon size="x-small" variant="text" color="primary" @click.stop="copyToClipboard(item.ISN)">
                        <v-icon size="small">mdi-content-copy</v-icon>
                        <v-tooltip activator="parent" location="top">Copy ISN</v-tooltip>
                    </v-btn>
                    <span class="font-weight-medium font-mono">{{ item.ISN || '-' }}</span>
                </div>
            </template>

            <!-- Device ID Column -->
            <template #item.DeviceId="{ item }">
                <span class="font-mono text-medium-emphasis">{{ item.DeviceId || '-' }}</span>
            </template>

            <!-- Error Code Column - Red when error -->
            <template #item.ErrorCode="{ item }">
                <v-chip :color="isStatusPass(item.ErrorCode) ? 'success' : 'error'" size="x-small"
                    :variant="isStatusPass(item.ErrorCode) ? 'tonal' : 'flat'">
                    {{ item.ErrorCode || '-' }}
                </v-chip>
            </template>

            <!-- Error Name Column - Red text when error -->
            <template #item.ErrorName="{ item }">
                <template v-if="item.ErrorName && item.ErrorName !== 'N/A' && !isStatusPass(item.ErrorCode)">
                    <span class="text-error font-weight-medium">{{ item.ErrorName }}</span>
                </template>
                <span v-else class="text-medium-emphasis">-</span>
            </template>

            <!-- Test Start Time Column -->
            <template #item.TestStartTime="{ item }">
                <span class="text-caption">{{ formatDateTime(item['Test Start Time']) }}</span>
            </template>

            <!-- Test End Time Column -->
            <template #item.TestEndTime="{ item }">
                <span class="text-caption">{{ formatDateTime(item['Test end Time']) }}</span>
            </template>

            <!-- Duration Column - No chip -->
            <template #item.Duration="{ item }">
                <span class="text-caption text-medium-emphasis">{{ calculateDuration(item['Test Start Time'], item['Test end Time']) }}</span>
            </template>

            <!-- Test Item Count Column - No chip -->
            <template #item.TestItemCount="{ item }">
                <span class="text-caption">{{ getTestItemCount(item) }}</span>
            </template>

            <!-- Actions Column - Download buttons -->
            <template #item.actions="{ item }">
                <div class="d-flex gap-1">
                    <v-btn icon size="x-small" variant="outlined" color="primary"
                        :loading="downloadingRecord === item.recordKey" @click.stop="$emit('download', item)">
                        <v-icon size="small">mdi-download</v-icon>
                        <v-tooltip activator="parent" location="top">Download TXT Log</v-tooltip>
                    </v-btn>
                    <v-btn icon size="x-small" variant="outlined" color="success"
                        :loading="downloadingCsvRecord === item.recordKey" @click.stop="$emit('download-csv', item)">
                        <v-icon size="small">mdi-file-delimited</v-icon>
                        <v-tooltip activator="parent" location="top">Download CSV Log</v-tooltip>
                    </v-btn>
                </div>
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

        <!-- Client-side Data Table (for local data) -->
        <v-data-table v-else v-model:items-per-page="itemsPerPage" v-model:page="page" v-model:sort-by="sortBy"
            :model-value="selectedKeys" :headers="computedHeaders" :items="itemsWithKeys" :loading="loading"
            item-value="recordKey" :show-select="selectable" hover class="elevation-1 clickable-rows"
            @update:model-value="onSelectionChange" @click:row="handleRowClick">
            <!-- ISN Column with Copy Button on Left -->
            <template #item.ISN="{ item }">
                <div class="d-flex align-center gap-1">
                    <v-btn icon size="x-small" variant="text" color="primary" @click.stop="copyToClipboard(item.ISN)">
                        <v-icon size="small">mdi-content-copy</v-icon>
                        <v-tooltip activator="parent" location="top">Copy ISN</v-tooltip>
                    </v-btn>
                    <span class="font-weight-medium font-mono">{{ item.ISN || '-' }}</span>
                </div>
            </template>

            <!-- Device ID Column -->
            <template #item.DeviceId="{ item }">
                <span class="font-mono text-medium-emphasis">{{ item.DeviceId || '-' }}</span>
            </template>

            <!-- Error Code Column - Red when error -->
            <template #item.ErrorCode="{ item }">
                <v-chip :color="isStatusPass(item.ErrorCode) ? 'success' : 'error'" size="x-small"
                    :variant="isStatusPass(item.ErrorCode) ? 'tonal' : 'flat'">
                    {{ item.ErrorCode || '-' }}
                </v-chip>
            </template>

            <!-- Error Name Column - Red text when error -->
            <template #item.ErrorName="{ item }">
                <template v-if="item.ErrorName && item.ErrorName !== 'N/A' && !isStatusPass(item.ErrorCode)">
                    <span class="text-error font-weight-medium">{{ item.ErrorName }}</span>
                </template>
                <span v-else class="text-medium-emphasis">-</span>
            </template>

            <!-- Test Start Time Column -->
            <template #item.TestStartTime="{ item }">
                <span class="text-caption">{{ formatDateTime(item['Test Start Time']) }}</span>
            </template>

            <!-- Test End Time Column -->
            <template #item.TestEndTime="{ item }">
                <span class="text-caption">{{ formatDateTime(item['Test end Time']) }}</span>
            </template>

            <!-- Duration Column - No chip -->
            <template #item.Duration="{ item }">
                <span class="text-caption text-medium-emphasis">{{ calculateDuration(item['Test Start Time'], item['Test end Time']) }}</span>
            </template>

            <!-- Test Item Count Column - No chip -->
            <template #item.TestItemCount="{ item }">
                <span class="text-caption">{{ getTestItemCount(item) }}</span>
            </template>

            <!-- Actions Column - Download buttons -->
            <template #item.actions="{ item }">
                <div class="d-flex gap-1">
                    <v-btn icon size="x-small" variant="outlined" color="primary"
                        :loading="downloadingRecord === item.recordKey" @click.stop="$emit('download', item)">
                        <v-icon size="small">mdi-download</v-icon>
                        <v-tooltip activator="parent" location="top">Download TXT Log</v-tooltip>
                    </v-btn>
                    <v-btn icon size="x-small" variant="outlined" color="success"
                        :loading="downloadingCsvRecord === item.recordKey" @click.stop="$emit('download-csv', item)">
                        <v-icon size="small">mdi-file-delimited</v-icon>
                        <v-tooltip activator="parent" location="top">Download CSV Log</v-tooltip>
                    </v-btn>
                </div>
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
        </v-data-table>

        <!-- Copy Success Snackbar -->
        <v-snackbar v-model="showCopySuccess" :timeout="2000" color="success" location="bottom">
            <v-icon start>mdi-check</v-icon>
            Copied to clipboard!
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CompactCsvTestItemData, CsvTestItemData } from '@/features/dut-logs/api/iplasProxyApi'
import { adjustIplasDisplayTime, isStatusPass } from '@/shared/utils/helpers'

// Props
const props = withDefaults(
    defineProps<{
        items: (CsvTestItemData | CompactCsvTestItemData)[]
        totalItems: number
        loading: boolean
        downloadingRecord?: string | null
        downloadingCsvRecord?: string | null
        selectable?: boolean
        selectedKeys?: string[]
        serverSide?: boolean
    }>(),
    {
        selectable: false,
        selectedKeys: () => [],
        serverSide: true,
    },
)

// Emits
const emit = defineEmits<{
    (
        e: 'update:options',
        options: {
            page: number
            itemsPerPage: number
            sortBy: { key: string; order: 'asc' | 'desc' }[]
        },
    ): void
    (e: 'update:selected-keys', keys: string[]): void
    (e: 'row-click', record: CsvTestItemData | CompactCsvTestItemData): void
    (e: 'download', record: CsvTestItemData | CompactCsvTestItemData): void
    (e: 'download-csv', record: CsvTestItemData | CompactCsvTestItemData): void
}>()

// Table state
const page = ref(1)
const itemsPerPage = ref(25)
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([
    { key: 'TestStartTime', order: 'desc' },
])

// Copy success state
const showCopySuccess = ref(false)

// Computed items with recordKey added for v-data-table item-value
const itemsWithKeys = computed(() =>
    props.items.map((item) => ({
        ...item,
        recordKey: `${item.ISN}_${item['Test Start Time']}`,
    })),
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
        { title: 'Actions', key: 'actions', sortable: false, width: '120px' },
    ]
})

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

async function copyToClipboard(text: string | undefined) {
    if (!text) return
    try {
        await navigator.clipboard.writeText(text)
        showCopySuccess.value = true
    } catch (_err) {
        // Fallback for browsers that don't support clipboard API or non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
            document.execCommand('copy')
            showCopySuccess.value = true
        } catch (e) {
            console.error('Failed to copy:', e)
        }
        document.body.removeChild(textArea)
    }
}

function handleRowClick(_event: Event, data: { item: CsvTestItemData | CompactCsvTestItemData }) {
    emit('row-click', data.item)
}

function onOptionsUpdate(options: {
    page: number
    itemsPerPage: number
    sortBy: { key: string; order: 'asc' | 'desc' }[]
}) {
    emit('update:options', options)
}

function onSelectionChange(keys: string[]) {
    emit('update:selected-keys', keys)
}
</script>

<style scoped>
.clickable-rows :deep(tbody tr) {
    cursor: pointer;
}

.clickable-rows :deep(tbody tr:hover) {
    background-color: rgba(var(--v-theme-primary), 0.08);
}

.font-mono {
    font-family: 'Roboto Mono', monospace;
}
</style>
