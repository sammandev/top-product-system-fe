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
                        <v-chip size="small" :color="getStatusColor(record.errorCode)"
                            :prepend-icon="isStatusPass(record.errorCode) ? 'mdi-check-circle' : 'mdi-alert-circle'"
                            class="cursor-pointer" label @click="copyToClipboard(record.errorCode)">
                            <span class="text-medium-emphasis mr-1">Status:</span>
                            {{ record.errorCode }}
                            <v-tooltip activator="parent" location="top">Click to copy Error Code</v-tooltip>
                        </v-chip>
                        <template
                            v-if="record.errorName && record.errorName !== 'N/A' && !isStatusPass(record.errorCode)">
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
                    <v-col cols="12" md="4">
                        <!-- UPDATED: Changed hint to AND logic -->
                        <v-combobox v-model="searchTerms" label="Search Test Items (Regex)"
                            prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details clearable
                            multiple chips closable-chips placeholder="Type and press Enter (AND logic)..."
                            hint="Multiple terms use AND logic">
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
                    <!-- UPDATED: Score Filter -->
                    <v-col cols="12" md="4" v-if="hasScores">
                        <v-row dense class="align-center">
                            <v-col cols="6">
                                <v-select v-model="scoreFilterType" :items="scoreFilterOptions" item-title="title"
                                    item-value="value" label="Score Filter" variant="outlined" density="compact"
                                    hide-details clearable placeholder="Filter...">
                                </v-select>
                            </v-col>
                            <v-col cols="6">
                                <v-text-field v-model.number="scoreFilterValue" type="number" label="Value (0-10)"
                                    variant="outlined" density="compact" hide-details :disabled="!scoreFilterType"
                                    :min="0" :max="10" step="0.1" placeholder="0.00" />
                            </v-col>
                        </v-row>
                    </v-col>
                </v-row>
            </v-card-text>

            <!-- Data Table Container - UPDATED: Added overflow-y: auto for scrolling in non-fullscreen mode -->
            <div class="flex-grow-1 position-relative"
                :style="{ minHeight: 0, overflow: isFullscreen ? 'hidden' : 'auto' }">
                <!-- Loading Overlay when fetching test items -->
                <v-overlay v-model="props.loadingTestItems" contained class="align-center justify-center" persistent>
                    <div class="text-center">
                        <v-progress-circular indeterminate color="primary" size="64" />
                        <div class="text-body-1 mt-4">Loading test items...</div>
                    </div>
                </v-overlay>

                <v-data-table :headers="testItemHeaders" :items="filteredTestItems" :items-per-page="50"
                    density="comfortable" fixed-header fixed-footer style="height: 100%;"
                    class="elevation-1 v-table--striped" :class="{ 'clickable-rows': hasScores }"
                    @click:row="handleRowClick">
                    <template #item.STATUS="{ item }">
                        <v-chip :color="getStatusColor(item.STATUS)" size="small">
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
                    <template #item.SCORE="{ item }">
                        <template v-if="item.score !== undefined && item.score !== null">
                            <v-chip :color="getScoreColor(item.score)" size="small" variant="flat"
                                class="font-weight-bold cursor-pointer" @click.stop="showScoreBreakdown(item)">
                                {{ (item.score * 10).toFixed(2) }}
                                <v-icon size="x-small" end>mdi-information-outline</v-icon>
                            </v-chip>
                        </template>
                        <span v-else class="text-medium-emphasis">-</span>
                    </template>
                </v-data-table>
            </div>

            <!-- Overall Score Badge (if available) -->
            <div v-if="record.overallScore !== undefined" class="flex-shrink-0 px-3 py-2 bg-surface">
                <div class="d-flex align-center justify-end gap-4">
                    <v-chip color="primary" variant="tonal" prepend-icon="mdi-chart-line">
                        <strong>Overall Score:</strong>&nbsp;
                        <span :class="getScoreColorClass(record.overallScore)">
                            {{ (record.overallScore * 10).toFixed(2) }} / 10
                        </span>
                    </v-chip>
                    <v-chip v-if="record.valueItemsScore !== null && record.valueItemsScore !== undefined"
                        color="success" variant="outlined" size="small">
                        Value Items: {{ (record.valueItemsScore * 10).toFixed(2) }}
                    </v-chip>
                    <v-chip v-if="record.binItemsScore !== null && record.binItemsScore !== undefined" color="info"
                        variant="outlined" size="small">
                        Binary Items: {{ (record.binItemsScore * 10).toFixed(2) }}
                    </v-chip>
                </div>
            </div>
        </v-card>
    </v-dialog>

    <!-- Score Breakdown Dialog -->
    <v-dialog v-model="showBreakdownDialog" max-width="500px" persistent>
        <v-card v-if="selectedTestItem">
            <v-card-title class="d-flex align-center bg-primary">
                <v-icon class="mr-2" color="white">mdi-calculator-variant</v-icon>
                <span class="text-white">Score Breakdown</span>
                <v-spacer />
                <v-btn icon="mdi-close" variant="text" color="white" size="small"
                    @click="showBreakdownDialog = false" />
            </v-card-title>
            <v-card-text class="pt-4">
                <!-- Test Item Name -->
                <v-alert color="info" variant="tonal" density="compact" class="mb-4">
                    <div class="text-subtitle-2 font-weight-bold">{{ selectedTestItem.NAME }}</div>
                </v-alert>

                <!-- Score Details -->
                <v-list density="compact" class="rounded border">
                    <v-list-item>
                        <template #prepend>
                            <v-icon color="error">mdi-arrow-up-bold</v-icon>
                        </template>
                        <v-list-item-title>Upper Criteria Limit (UCL)</v-list-item-title>
                        <template #append>
                            <span class="font-weight-medium">{{ selectedTestItem.UCL || '-' }}</span>
                        </template>
                    </v-list-item>

                    <v-divider />

                    <v-list-item>
                        <template #prepend>
                            <v-icon color="warning">mdi-arrow-down-bold</v-icon>
                        </template>
                        <v-list-item-title>Lower Criteria Limit (LCL)</v-list-item-title>
                        <template #append>
                            <span class="font-weight-medium">{{ selectedTestItem.LCL || '-' }}</span>
                        </template>
                    </v-list-item>

                    <v-divider />

                    <v-list-item>
                        <template #prepend>
                            <v-icon color="primary">mdi-speedometer</v-icon>
                        </template>
                        <v-list-item-title>Measured Value</v-list-item-title>
                        <template #append>
                            <span class="font-weight-bold">{{ selectedTestItem.VALUE }}</span>
                        </template>
                    </v-list-item>

                    <v-divider />

                    <v-list-item>
                        <template #prepend>
                            <v-icon color="success">mdi-target</v-icon>
                        </template>
                        <v-list-item-title>
                            Target
                            <span class="text-caption text-medium-emphasis">
                                ({{ getTargetLabel(selectedTestItem) }})
                            </span>
                        </v-list-item-title>
                        <template #append>
                            <span class="font-weight-bold text-success">{{ computeTarget(selectedTestItem) }}</span>
                        </template>
                    </v-list-item>

                    <v-divider />

                    <v-list-item>
                        <template #prepend>
                            <v-icon color="secondary">mdi-function-variant</v-icon>
                        </template>
                        <v-list-item-title>Scoring Algorithm</v-list-item-title>
                        <template #append>
                            <v-chip size="small" :color="getScoringTypeColor(selectedTestItem.scoringType)"
                                variant="tonal">
                                {{ formatScoringType(selectedTestItem.scoringType) }}
                            </v-chip>
                        </template>
                    </v-list-item>

                    <v-divider />

                    <v-list-item>
                        <template #prepend>
                            <v-icon color="blue-grey">mdi-weight</v-icon>
                        </template>
                        <v-list-item-title>Score Weight</v-list-item-title>
                        <template #append>
                            <v-chip size="small" color="blue-grey" variant="tonal">
                                {{ formatWeight(selectedTestItem.weight) }}
                            </v-chip>
                        </template>
                    </v-list-item>

                    <v-divider />

                    <v-list-item v-if="selectedTestItem.deviation !== undefined">
                        <template #prepend>
                            <v-icon color="purple">mdi-delta</v-icon>
                        </template>
                        <v-list-item-title>Deviation from Target</v-list-item-title>
                        <template #append>
                            <span class="font-weight-medium">{{ selectedTestItem.deviation?.toFixed(2) }}</span>
                        </template>
                    </v-list-item>

                    <v-divider v-if="selectedTestItem.deviation !== undefined" />

                    <v-list-item>
                        <template #prepend>
                            <v-icon :color="getScoreColor(selectedTestItem.score ?? 0)">mdi-star</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold">Final Score</v-list-item-title>
                        <template #append>
                            <v-chip size="small" :color="getScoreColor(selectedTestItem.score ?? 0)" variant="flat"
                                class="font-weight-bold">
                                {{ selectedTestItem.score !== undefined ? ((selectedTestItem.score ?? 0) *
                                    10).toFixed(2) : '-' }} / 10
                            </v-chip>
                        </template>
                    </v-list-item>
                </v-list>

                <!-- Scoring Formula Explanation -->
                <v-expansion-panels variant="accordion" class="mt-4">
                    <v-expansion-panel>
                        <v-expansion-panel-title>
                            <v-icon start size="small">mdi-help-circle-outline</v-icon>
                            How is this score calculated?
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                            <div class="text-body-2">
                                <p class="mb-3">{{ getScoringExplanation(selectedTestItem.scoringType) }}</p>

                                <!-- Formula Display -->
                                <v-alert density="compact" variant="tonal" color="info" class="mb-3">
                                    <div class="text-subtitle-2 font-weight-bold mb-1">Formula:</div>
                                    <code
                                        class="text-body-2">{{ getScoringFormula(selectedTestItem.scoringType) }}</code>
                                </v-alert>

                                <!-- Score Range Explanation -->
                                <div class="text-caption text-medium-emphasis">
                                    <v-icon size="x-small" class="mr-1">mdi-information-outline</v-icon>
                                    <strong>Score Range:</strong> 0.00 - 10.00
                                    <ul class="mt-1 ml-4">
                                        <li><strong>10.00</strong> = At target (best possible)</li>
                                        <li><strong>1.00</strong> = At UCL/LCL boundary (limit score)</li>
                                        <li><strong>0.00</strong> = Outside limits (failed)</li>
                                    </ul>
                                </div>
                            </div>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn color="primary" variant="tonal" @click="showBreakdownDialog = false">Close</v-btn>
            </v-card-actions>
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
import type { ScoringType } from '../types/scoring.types'
import { getScoreColor, SCORING_TYPE_INFO } from '../types/scoring.types'
import { adjustIplasDisplayTime, getStatusColor, normalizeStatus, isStatusPass, isStatusFail } from '@/shared/utils/helpers'

interface Props {
    modelValue: boolean
    record: NormalizedRecord | null
    downloading?: boolean
    loadingTestItems?: boolean
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
// UPDATED: Default to 'all' (Show All) instead of 'value'
const testItemFilter = ref<('all' | 'value' | 'non-value' | 'bin')[]>(['all'])
const searchTerms = ref<string[]>([])
const showCopySuccess = ref(false)

// UPDATED: Score filter state
const scoreFilterType = ref<'gt' | 'gte' | 'lt' | 'lte' | 'eq' | null>(null)
const scoreFilterValue = ref<number | null>(null)

// Score breakdown dialog
const showBreakdownDialog = ref(false)
const selectedTestItem = ref<NormalizedTestItem | null>(null)

// Filter options for dropdown
const testItemFilterOptions = [
    { title: 'Criteria Data ★', value: 'value' },
    { title: 'Show All', value: 'all' },
    { title: 'Non-Criteria', value: 'non-value' },
    { title: 'Bin Data', value: 'bin' }
]

// UPDATED: Score filter options
const scoreFilterOptions = [
    { title: '> Greater than', value: 'gt' },
    { title: '≥ Greater or equal', value: 'gte' },
    { title: '< Less than', value: 'lt' },
    { title: '≤ Less or equal', value: 'lte' },
    { title: '= Equals', value: 'eq' }
]

// Computed: check if scores are available
const hasScores = computed(() => {
    return props.record?.testItems?.some(item => item.score !== undefined) ?? false
})

// Dynamic headers - add Score column if scores are available
const testItemHeaders = computed(() => {
    const baseHeaders = [
        { title: 'Test Item', key: 'NAME', sortable: true },
        { title: 'Status', key: 'STATUS', sortable: true },
        { title: 'Value', key: 'VALUE', sortable: true },
        { title: 'UCL', key: 'UCL', sortable: true },
        { title: 'LCL', key: 'LCL', sortable: true }
    ]

    if (hasScores.value) {
        baseHeaders.push({ title: 'Score', key: 'SCORE', sortable: true })
    }

    return baseHeaders
})

// Helper functions
function isValueData(item: NormalizedTestItem): boolean {
    const value = item.VALUE?.toUpperCase() || ''
    // Value data: not PASS, FAIL, 1, 0, or -999
    if (value === 'PASS' || value === 'FAIL' || value === '1' || value === '0' || value === '-999') {
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
    // STATUS must be PASS, FAIL, 1, 0, or -1 AND VALUE must be PASS, FAIL, 1, 0, or -999
    const isStatusPF = isStatusPass(item.STATUS) || isStatusFail(item.STATUS) || item.STATUS === '-1'
    const isValuePF = value === 'PASS' || value === 'FAIL' || value === '1' || value === '0' || value === '-999'
    return isStatusPF && isValuePF
}

function isBinData(item: NormalizedTestItem): boolean {
    return isPassFailData(item)
}

function isNonValueData(item: NormalizedTestItem): boolean {
    return !isValueData(item) && !isBinData(item)
}

function getValueClass(item: NormalizedTestItem): string {
    const value = item.VALUE?.toUpperCase() || ''
    if (value === 'PASS' || value === '1') return 'text-success font-weight-medium'
    if (value === 'FAIL' || value === '0') return 'text-error font-weight-medium'
    if (value === '-999') return 'text-warning'
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

    // UPDATED: Apply multi-term regex search (AND logic - all terms must match)
    if (searchTerms.value.length > 0) {
        items = items.filter(item => {
            const searchableText = `${item.NAME || ''} ${item.STATUS || ''} ${item.VALUE || ''}`.toLowerCase()
            // AND logic: every term must match
            return searchTerms.value.every(term => {
                const trimmedTerm = term.trim().toLowerCase()
                if (!trimmedTerm) return true  // Empty terms don't affect filtering
                try {
                    const regex = new RegExp(trimmedTerm, 'i')
                    return regex.test(searchableText)
                } catch {
                    return searchableText.includes(trimmedTerm)
                }
            })
        })
    }

    // UPDATED: Apply score filter if active
    if (scoreFilterType.value && scoreFilterValue.value !== null && hasScores.value) {
        items = items.filter(item => {
            if (item.score === undefined || item.score === null) return true // Keep items without scores
            const score = item.score * 10 // Convert to 0-10 scale for comparison
            const filterValue = scoreFilterValue.value!
            switch (scoreFilterType.value) {
                case 'gt': return score > filterValue
                case 'gte': return score >= filterValue
                case 'lt': return score < filterValue
                case 'lte': return score <= filterValue
                case 'eq': return Math.abs(score - filterValue) < 0.01
                default: return true
            }
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

// Score-related helpers
function getScoreColorClass(score: number): string {
    if (score >= 0.9) return 'text-success font-weight-bold'
    if (score >= 0.7) return 'text-primary font-weight-bold'
    if (score >= 0.5) return 'text-warning font-weight-bold'
    return 'text-error font-weight-bold'
}

function getScoringTypeColor(scoringType?: ScoringType): string {
    if (!scoringType) return 'grey'
    const info = SCORING_TYPE_INFO[scoringType]
    return info?.color ?? 'grey'
}

function formatScoringType(scoringType?: ScoringType): string {
    if (!scoringType) return 'Unknown'
    const info = SCORING_TYPE_INFO[scoringType]
    return info?.label ?? scoringType
}

function getScoringExplanation(scoringType?: ScoringType): string {
    const explanations: Record<ScoringType, string> = {
        'symmetrical': 'Linear scoring where the target is the midpoint between UCL and LCL. Score decreases linearly as the measured value moves away from the target toward either limit. At the target, score is 10.0. At UCL or LCL boundary, score is 1.0.',
        'symmetrical_nl': 'Non-linear (Gaussian) scoring centered on the midpoint. Score follows a bell curve, with faster degradation near the limits.',
        'evm': 'EVM-style scoring optimized for Error Vector Magnitude measurements. Lower (more negative) values in dB are better. Uses a gentle decay exponent (0.25) from reference point of -35 dB.',
        'throughput': 'Throughput scoring where higher values are better. Score is 10.0 at or above UCL, and decreases toward LCL.',
        'asymmetrical': 'Scoring with a user-defined target that may not be centered between limits. Score degrades based on deviation from the specified target according to the selected policy.',
        'per_mask': 'Lower-is-better scoring ideal for PER/MASK measurements. Zero is the ideal value with score 10.0, score decreases linearly as the value approaches UCL (failure threshold).',
        'binary': 'Simple PASS/FAIL scoring. PASS status = 10.0, FAIL status = 0.0. No intermediate values.'
    }
    return explanations[scoringType ?? 'binary'] ?? 'Unknown scoring algorithm.'
}

// UPDATED: Get target label based on scoring type and policy
function getTargetLabel(item: NormalizedTestItem): string {
    const scoringType = item.scoringType

    // For asymmetrical scoring, use policy
    if (scoringType === 'asymmetrical' && item.policy) {
        switch (item.policy) {
            case 'higher':
                return 'Higher is Better'
            case 'lower':
                return 'Lower is Better'
            default:
                return 'Centered'
        }
    }

    // For other scoring types
    switch (scoringType) {
        case 'per_mask':
            return 'Lower is Better'
        case 'evm':
            return 'Lower is Better'
        case 'throughput':
            return 'Higher is Better'
        case 'symmetrical':
        case 'symmetrical_nl':
            return 'Centered'
        case 'binary':
            return 'Pass/Fail'
        default:
            return 'Centered'
    }
}

// UPDATED: Compute target using backend target value if available, otherwise compute locally
function computeTarget(item: NormalizedTestItem): string {
    // If target is provided from backend, use it
    if (item.target !== undefined && item.target !== null) {
        return item.target.toFixed(2)
    }

    // Fallback: compute target locally based on scoring type
    const ucl = parseFloat(item.UCL)
    const lcl = parseFloat(item.LCL)

    // For asymmetrical scoring with policy, compute target based on policy
    if (item.scoringType === 'asymmetrical' && item.policy) {
        switch (item.policy) {
            case 'higher':
                // Target is UCL for "higher is better"
                return isNaN(ucl) ? '-' : ucl.toFixed(2)
            case 'lower':
                // Target is LCL for "lower is better"
                return isNaN(lcl) ? '-' : lcl.toFixed(2)
            default:
                // For 'symmetrical' policy or unknown, use centered target
                break
        }
    }

    // For per_mask, target is 0
    if (item.scoringType === 'per_mask') {
        return '0.00'
    }

    // For evm, target is -35 dB
    if (item.scoringType === 'evm') {
        return '-35.00'
    }

    // For throughput, target is UCL
    if (item.scoringType === 'throughput') {
        return isNaN(ucl) ? '-' : ucl.toFixed(2)
    }

    // For symmetrical scoring, target = (UCL + LCL) / 2
    if (!isNaN(ucl) && !isNaN(lcl)) {
        const target = (ucl + lcl) / 2
        return target.toFixed(2)
    }

    // For UCL only, target is 0 (assumed lower is better)
    if (!isNaN(ucl) && isNaN(lcl)) {
        return '0.00'
    }

    return '-'
}

// UPDATED: Format weight for display (e.g., "1.0x", "3.0x")
function formatWeight(weight?: number): string {
    const w = weight ?? 1.0
    return `${w.toFixed(1)}x`
}

// UPDATED: Added helper to format policy for display
function formatPolicy(policy?: string): string {
    const policyLabels: Record<string, string> = {
        'higher': 'Higher is Better',
        'lower': 'Lower is Better',
        'symmetrical': 'Centered'
    }
    return policyLabels[policy ?? ''] ?? policy ?? 'Unknown'
}

// UPDATED: Added helper to get formula for score breakdown display
function getScoringFormula(scoringType?: ScoringType): string {
    const formulas: Record<ScoringType, string> = {
        'symmetrical': 'Score = 1 + 9 × (L - |x - T|) / L, where T = (UCL + LCL) / 2',
        'symmetrical_nl': 'Score = exp(-((x - T) / σ)²), Gaussian decay',
        'evm': 'Score = 1 + 9 × (1 - (x - ref) / (UCL - ref))^0.25, ref = -35 dB',
        'throughput': 'Score = 1 + 9 × (x - LCL) / (UCL - LCL)',
        'asymmetrical': 'Score = 1 + 9 × (L - d) / L, with policy-based limit selection',
        'per_mask': 'Score = 1 + 9 × (UCL - x) / UCL, where 0 is ideal',
        'binary': 'Score = 10.0 if PASS, 0.0 if FAIL'
    }
    return formulas[scoringType ?? 'binary'] ?? 'Unknown formula'
}

// Handle row click to show score breakdown
function handleRowClick(_event: Event, row: { item: NormalizedTestItem }): void {
    if (hasScores.value && row.item.score !== undefined) {
        showScoreBreakdown(row.item)
    }
}

// Show score breakdown dialog
function showScoreBreakdown(item: NormalizedTestItem): void {
    selectedTestItem.value = item
    showBreakdownDialog.value = true
}

// Reset filters when record changes - always default to Show All
watch(() => props.record, () => {
    // UPDATED: Always default to Show All
    testItemFilter.value = ['all']
    searchTerms.value = []
    // Clear score filter
    scoreFilterType.value = null
    scoreFilterValue.value = null
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

/* Clickable rows styling when scores are available */
.clickable-rows :deep(tbody tr) {
    cursor: pointer;
    transition: background-color 0.15s ease;
}

.clickable-rows :deep(tbody tr:hover) {
    background-color: rgba(var(--v-theme-primary), 0.08) !important;
}
</style>
