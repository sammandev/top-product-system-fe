<template>
    <v-card elevation="2">
        <v-card-title class="d-flex align-center justify-space-between bg-secondary">
            <div class="d-flex align-center">
                <v-icon class="mr-2">mdi-format-list-numbered</v-icon>
                Search Results
                <v-chip size="small" class="ml-2" color="primary" variant="flat">
                    {{ totalRecords }} Records
                </v-chip>
            </div>
            <div class="d-flex align-center gap-2">
                <v-btn v-if="!hasScores" color="primary" variant="outlined" size="small" prepend-icon="mdi-calculator"
                    :loading="calculatingScores" @click="emit('calculate-scores')">
                    Calculate Scores
                </v-btn>
                <v-chip v-if="hasScores" size="small" color="success" variant="tonal" prepend-icon="mdi-check-circle">
                    Scores Calculated
                </v-chip>
                <v-btn v-if="selectedRecords.length > 0" color="primary" variant="tonal" size="small"
                    prepend-icon="mdi-download" :loading="loading" @click="handleDownloadSelected">
                    Download ({{ selectedRecords.length }})
                </v-btn>
            </div>
        </v-card-title>

        <!-- ISN Tabs -->
        <v-tabs v-model="activeISNTab" color="primary" bg-color="grey-lighten-4" slider-color="primary"
            :show-arrows="isnGroups.length > 5" density="comfortable">
            <v-tab v-for="(isnGroup, index) in isnGroups" :key="isnGroup.isn" :value="index">
                <v-icon v-if="isnGroup.hasError" color="error" start size="small">mdi-alert-circle</v-icon>
                <v-icon v-else color="success" start size="small">mdi-check-circle</v-icon>
                {{ isnGroup.isn }}
                <v-badge v-if="isnGroup.errorCount > 0" :content="isnGroup.errorCount" color="error" inline
                    class="ml-1" />
            </v-tab>
        </v-tabs>

        <v-window v-model="activeISNTab">
            <v-window-item v-for="(isnGroup, isnIndex) in isnGroups" :key="isnGroup.isn" :value="isnIndex">
                <!-- ISN Info Banner -->
                <v-sheet class="pa-3 bg-grey-lighten-4">
                    <div class="d-flex flex-wrap gap-4 align-center">
                        <div class="text-body-2">
                            <strong>ISN:</strong>
                            <v-chip size="small" class="ml-1" variant="outlined" @click="copyToClipboard(isnGroup.isn)">
                                {{ isnGroup.isn }}
                                <v-icon end size="x-small">mdi-content-copy</v-icon>
                            </v-chip>
                        </div>
                        <div class="text-body-2">
                            <strong>Site:</strong> {{ isnGroup.site }}
                        </div>
                        <div class="text-body-2">
                            <strong>Project:</strong> {{ isnGroup.project }}
                        </div>
                        <div class="text-body-2">
                            <strong>Records:</strong> {{ isnGroup.records.length }}
                        </div>
                        <div v-if="isnGroup.hasError" class="text-body-2 text-error">
                            <v-icon size="small" color="error" class="mr-1">mdi-alert</v-icon>
                            {{ isnGroup.errorCount }} Error(s)
                        </div>
                    </div>
                </v-sheet>

                <!-- Station Sub-tabs -->
                <v-tabs v-model="activeStationTabs[isnIndex]" color="secondary" bg-color="white"
                    slider-color="secondary" :show-arrows="isnGroup.stations.length > 5" density="compact">
                    <v-tab v-for="(station, stationIndex) in isnGroup.stations" :key="station.stationName"
                        :value="stationIndex" class="text-caption">
                        <v-icon v-if="station.hasError" color="error" start size="x-small">mdi-alert-circle</v-icon>
                        <v-icon v-else color="success" start size="x-small">mdi-check-circle</v-icon>
                        {{ station.displayName }}
                        <v-badge v-if="station.errorCount > 0" :content="station.errorCount" color="error" inline
                            class="ml-1" />
                    </v-tab>
                </v-tabs>

                <v-divider />

                <!-- Station Content -->
                <v-window v-model="activeStationTabs[isnIndex]">
                    <v-window-item v-for="(station, stationIndex) in isnGroup.stations" :key="station.stationName"
                        :value="stationIndex">
                        <!-- Filters -->
                        <v-card-text class="pa-3 bg-grey-lighten-5">
                            <v-row dense align="center">
                                <v-col cols="12" md="4">
                                    <v-text-field v-model="searchFilters[`${isnIndex}-${stationIndex}`]"
                                        label="Search records" prepend-inner-icon="mdi-magnify" variant="outlined"
                                        density="compact" hide-details clearable placeholder="Device ID, error..." />
                                </v-col>
                                <v-col cols="12" md="3">
                                    <v-select v-model="statusFilters[`${isnIndex}-${stationIndex}`]"
                                        :items="statusOptions" label="Status" variant="outlined" density="compact"
                                        hide-details clearable />
                                </v-col>
                                <v-col cols="auto" class="ml-auto">
                                    <v-btn-toggle v-model="selectAllToggles[`${isnIndex}-${stationIndex}`]"
                                        color="primary" density="compact">
                                        <v-btn :value="true" size="small" variant="outlined">
                                            <v-icon start>mdi-checkbox-multiple-marked</v-icon>
                                            Select All
                                        </v-btn>
                                    </v-btn-toggle>
                                </v-col>
                            </v-row>
                        </v-card-text>

                        <!-- Data Table -->
                        <v-data-table :headers="headers"
                            :items="getFilteredRecords(isnIndex, stationIndex, station.records)" :items-per-page="10"
                            density="comfortable" hover class="ranking-table" item-value="test_end_time">
                            <template #item="{ item, index }">
                                <tr :class="getRowClass(item, index)" class="cursor-pointer"
                                    @click="handleRowClick(item)">
                                    <td class="text-center">
                                        <v-checkbox-btn v-model="selectedRecordsMap[getRecordKey(item)]" @click.stop
                                            density="compact" />
                                    </td>
                                    <td class="text-center">
                                        <v-chip :color="getRankColor(index + 1)" size="small" variant="flat" label>
                                            #{{ index + 1 }}
                                        </v-chip>
                                    </td>
                                    <td>
                                        <code class="text-body-2">{{ item.device_id || '-' }}</code>
                                    </td>
                                    <td>{{ formatDateTime(item.test_end_time) }}</td>
                                    <td>
                                        <v-chip :color="getStatusColor(item.error_code)" size="small" variant="flat">
                                            {{ item.error_code || '-' }}
                                        </v-chip>
                                    </td>
                                    <td>
                                        <!-- Score Column -->
                                        <template v-if="item.error_code !== 'PASS'">
                                            <v-chip size="small" color="error" variant="tonal">FAIL</v-chip>
                                        </template>
                                        <template v-else-if="getRecordScore(item) !== null">
                                            <v-chip size="small" :color="getScoreColor(getRecordScore(item)!)"
                                                variant="flat" class="font-weight-bold">
                                                {{ getRecordScore(item)!.toFixed(2) }}
                                            </v-chip>
                                        </template>
                                        <template v-else>
                                            <span class="text-medium-emphasis">-</span>
                                        </template>
                                    </td>
                                    <td class="text-center">
                                        <v-chip size="small" variant="outlined">
                                            {{ item.test_item?.length || 0 }}
                                        </v-chip>
                                    </td>
                                    <td>
                                        <v-btn icon="mdi-open-in-new" size="x-small" variant="text" color="primary"
                                            @click.stop="handleRowClick(item)" />
                                    </td>
                                </tr>
                            </template>
                        </v-data-table>
                    </v-window-item>
                </v-window>
            </v-window-item>
        </v-window>

        <!-- Copy Success Snackbar -->
        <v-snackbar v-model="showCopySuccess" :timeout="2000" color="success" location="bottom">
            <v-icon start>mdi-check</v-icon>
            Copied to clipboard!
        </v-snackbar>
    </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { IsnSearchData } from '@/features/dut_logs/api/iplasApi'
import { adjustIplasDisplayTime } from '@/shared/utils/helpers'
import { getScoreColor } from '../types/scoring.types'

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

interface Props {
    isnGroups: ISNGroup[]
    loading?: boolean
    scores?: Record<string, number> // Map of record key to score
    calculatingScores?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
    calculatingScores: false
})

const emit = defineEmits<{
    (e: 'row-click', record: IsnSearchData): void
    (e: 'download-selected', records: IsnSearchData[]): void
    (e: 'calculate-scores'): void
}>()

// State
const activeISNTab = ref(0)
const activeStationTabs = ref<Record<number, number>>({})
const searchFilters = ref<Record<string, string>>({})
const statusFilters = ref<Record<string, string | null>>({})
const selectAllToggles = ref<Record<string, boolean>>({})
const selectedRecordsMap = ref<Record<string, boolean>>({})
const showCopySuccess = ref(false)

// Status options
const statusOptions = [
    { title: 'Passed', value: 'passed' },
    { title: 'Failed', value: 'failed' }
]

// Table headers
const headers = [
    { title: '', key: 'select', sortable: false, width: '50px' },
    { title: '#', key: 'rank', sortable: false, align: 'center' as const, width: '60px' },
    { title: 'Device ID', key: 'device_id', sortable: true },
    { title: 'Test End Time', key: 'test_end_time', sortable: true },
    { title: 'Status', key: 'error_code', sortable: true },
    { title: 'Score', key: 'score', sortable: true, width: '100px' },
    { title: 'Test Items', key: 'test_item_count', sortable: false, align: 'center' as const },
    { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const, width: '80px' }
]

// Computed
const totalRecords = computed(() => {
    return props.isnGroups.reduce((sum, group) => sum + group.records.length, 0)
})

// Check if we have scores
const hasScores = computed(() => {
    return Object.keys(props.scores || {}).length > 0
})

// Get score for a record
function getRecordScore(record: IsnSearchData): number | null {
    if (!props.scores) return null
    const key = getScoreKey(record)
    return props.scores[key] ?? null
}

function getScoreKey(record: IsnSearchData): string {
    return `${record.isn}_${record.station_name}_${record.test_end_time}`
}

const selectedRecords = computed(() => {
    const selected: IsnSearchData[] = []
    for (const group of props.isnGroups) {
        for (const record of group.records) {
            if (selectedRecordsMap.value[getRecordKey(record)]) {
                selected.push(record)
            }
        }
    }
    return selected
})

// Initialize station tabs
watch(() => props.isnGroups, (groups) => {
    for (let i = 0; i < groups.length; i++) {
        if (activeStationTabs.value[i] === undefined) {
            activeStationTabs.value[i] = 0
        }
    }
}, { immediate: true })

// Watch select all toggles
watch(selectAllToggles, (toggles) => {
    for (const [key, value] of Object.entries(toggles)) {
        if (value) {
            const parts = key.split('-')
            const isnIndex = parseInt(parts[0] ?? '0')
            const stationIndex = parseInt(parts[1] ?? '0')
            const group = props.isnGroups[isnIndex]
            if (group) {
                const station = group.stations[stationIndex]
                if (station) {
                    const records = getFilteredRecords(isnIndex, stationIndex, station.records)
                    for (const record of records) {
                        selectedRecordsMap.value[getRecordKey(record)] = true
                    }
                }
            }
        }
    }
}, { deep: true })

// Methods
function getRecordKey(record: IsnSearchData): string {
    return `${record.isn}-${record.station_name}-${record.test_end_time}`
}

function getFilteredRecords(isnIndex: number, stationIndex: number, records: IsnSearchData[]): IsnSearchData[] {
    const key = `${isnIndex}-${stationIndex}`
    const search = searchFilters.value[key]?.toLowerCase() || ''
    const status = statusFilters.value[key]

    return records.filter(record => {
        // Search filter
        if (search) {
            const searchable = [
                record.device_id,
                record.error_code,
                record.error_name
            ].join(' ').toLowerCase()
            if (!searchable.includes(search)) return false
        }

        // Status filter
        if (status) {
            const isPassed = record.error_code === 'PASS'
            if (status === 'passed' && !isPassed) return false
            if (status === 'failed' && isPassed) return false
        }

        return true
    })
}

function formatDateTime(dateStr: string): string {
    // Use the centralized helper to adjust time by -1 hour for display
    return adjustIplasDisplayTime(dateStr, 1)
}

function getRowClass(item: IsnSearchData, index: number): string {
    const classes: string[] = []
    if (item.error_code !== 'PASS') {
        classes.push('error-row')
    }
    if (index < 3) {
        classes.push(`rank-${index + 1}`)
    }
    return classes.join(' ')
}

function getRankColor(rank: number): string {
    if (rank === 1) return 'amber-darken-2'
    if (rank === 2) return 'blue-grey'
    if (rank === 3) return 'brown'
    return 'grey'
}

function getStatusColor(status: string): string {
    if (status === 'PASS') return 'success'
    return 'error'
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

function handleRowClick(record: IsnSearchData): void {
    emit('row-click', record)
}

function handleDownloadSelected(): void {
    emit('download-selected', selectedRecords.value)
}
</script>

<style scoped>
.ranking-table {
    font-size: 0.875rem;
}

.cursor-pointer {
    cursor: pointer;
}

.error-row {
    background-color: rgba(244, 67, 54, 0.05) !important;
}

.error-row:hover {
    background-color: rgba(244, 67, 54, 0.1) !important;
}

.rank-1 {
    background-color: rgba(255, 193, 7, 0.08) !important;
}

.rank-2 {
    background-color: rgba(158, 158, 158, 0.08) !important;
}

.rank-3 {
    background-color: rgba(121, 85, 72, 0.08) !important;
}

.gap-2 {
    gap: 0.5rem;
}

.gap-4 {
    gap: 1rem;
}
</style>
