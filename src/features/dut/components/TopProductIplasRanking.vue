<template>
    <v-card class="mb-4">
        <v-card-title class="d-flex justify-space-between align-center">
            <div>
                <v-icon class="mr-2" color="warning">mdi-podium-gold</v-icon>
                iPLAS Data Ranking by Test Station
            </div>
            <div class="d-flex align-center gap-2">
                <v-btn v-if="!hasScores" color="primary" variant="outlined" size="small" prepend-icon="mdi-calculator"
                    :loading="calculatingScores" @click="emit('calculate-scores')">
                    Calculate Scores
                </v-btn>
                <v-chip v-if="hasScores" size="small" color="success" variant="tonal" prepend-icon="mdi-check-circle">
                    Scores Calculated
                </v-chip>
                <v-chip size="small" color="primary" variant="tonal" prepend-icon="mdi-factory">
                    {{ Object.keys(rankingByStation).length }} Stations
                </v-chip>
                <v-chip size="small" color="success" variant="tonal" prepend-icon="mdi-barcode">
                    {{ totalRecords }} Records
                </v-chip>
            </div>
        </v-card-title>

        <v-card-subtitle class="text-caption text-medium-emphasis pb-0">
            <span v-if="hasScores">Rankings are based on scoring. Higher scores indicate better performance.</span>
            <span v-else>Click "Calculate Scores" to rank records by performance score. Records with errors are shown at
                the bottom.</span>
        </v-card-subtitle>

        <v-card-text>
            <!-- Station Tabs -->
            <v-tabs v-model="selectedTab" color="primary" density="compact" show-arrows>
                <v-tab v-for="(ranking, station) in rankingByStation" :key="station" :value="station">
                    <v-icon start size="small">mdi-router-wireless</v-icon>
                    {{ getStationDisplayName(station) }}
                    <v-chip size="x-small" class="ml-2" :color="hasStationErrors(station) ? 'error' : 'success'">
                        {{ ranking.length }}
                    </v-chip>
                </v-tab>
            </v-tabs>

            <!-- Station Rankings -->
            <v-window v-model="selectedTab" class="mt-4">
                <v-window-item v-for="(_, station) in rankingByStation" :key="station" :value="station">
                    <!-- Filters -->
                    <v-row class="mb-4" dense>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="searchQuery" label="Search Records" prepend-inner-icon="mdi-magnify"
                                variant="outlined" density="compact" hide-details clearable
                                placeholder="Search ISN, Device ID..." />
                        </v-col>
                        <v-col cols="12" md="2">
                            <v-select v-model="statusFilter" :items="statusFilterOptions" item-title="title"
                                item-value="value" label="Status" variant="outlined" density="compact" hide-details
                                clearable />
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-autocomplete v-model="deviceFilter" :items="getUniqueDevices(station)" label="Device ID"
                                variant="outlined" density="compact" prepend-inner-icon="mdi-chip" hide-details
                                clearable multiple chips closable-chips>
                                <template #chip="{ props, item }">
                                    <v-chip v-bind="props" :text="item.raw" size="small" />
                                </template>
                            </v-autocomplete>
                        </v-col>
                        <v-col cols="12" md="3" class="d-flex align-center justify-end">
                            <v-btn v-if="hasActiveFilters" variant="text" size="small" color="primary"
                                @click="clearAllFilters">
                                <v-icon start size="small">mdi-filter-off</v-icon>
                                Clear Filters
                                <v-chip size="x-small" color="primary" class="ml-1">{{ activeFilterCount }}</v-chip>
                            </v-btn>
                        </v-col>
                    </v-row>

                    <!-- Data Table -->
                    <v-data-table :headers="rankingHeaders" :items="filteredRanking" :items-per-page="25"
                        density="comfortable" class="elevation-1 ranking-table cursor-pointer" :row-props="getRowProps"
                        @click:row="(_event: any, data: any) => handleRowClick(data.item, station as string)">
                        <!-- Rank Column -->
                        <template #item.rank="{ item }">
                            <div class="d-flex align-center">
                                <template v-if="item.hasError">
                                    <v-icon color="error" size="small">mdi-alert-circle</v-icon>
                                </template>
                                <template v-else-if="item.rank === 1">
                                    <v-icon color="warning">mdi-trophy</v-icon>
                                    <span class="ml-1 font-weight-bold">1</span>
                                </template>
                                <template v-else-if="item.rank === 2">
                                    <v-icon color="grey-lighten-1">mdi-medal</v-icon>
                                    <span class="ml-1">2</span>
                                </template>
                                <template v-else-if="item.rank === 3">
                                    <v-icon color="orange-darken-3">mdi-medal-outline</v-icon>
                                    <span class="ml-1">3</span>
                                </template>
                                <template v-else>
                                    <span class="text-medium-emphasis">{{ item.rank }}</span>
                                </template>
                            </div>
                        </template>

                        <!-- ISN Column -->
                        <template #item.isn="{ item }">
                            <div class="font-weight-medium font-mono">{{ item.isn }}</div>
                        </template>

                        <!-- Device Column -->
                        <template #item.device="{ item }">
                            <v-chip size="small" variant="outlined">{{ item.device || '-' }}</v-chip>
                        </template>

                        <!-- Score Column -->
                        <template #item.score="{ item }">
                            <template v-if="item.hasError">
                                <v-chip size="small" color="error" variant="tonal">FAIL</v-chip>
                            </template>
                            <template v-else-if="item.score !== null">
                                <v-chip size="small" :color="getScoreColor(item.score)" variant="flat"
                                    class="font-weight-bold">
                                    {{ (item.score * 10).toFixed(2) }}
                                </v-chip>
                            </template>
                            <template v-else>
                                <span class="text-medium-emphasis">-</span>
                            </template>
                        </template>

                        <!-- Test Date Column -->
                        <template #item.testDate="{ item }">
                            <span class="text-caption">{{ item.testDate }}</span>
                        </template>

                        <!-- Status Column -->
                        <template #item.status="{ item }">
                            <v-chip :color="item.hasError ? 'error' : 'success'" size="small">
                                {{ item.hasError ? item.errorCode : 'PASS' }}
                            </v-chip>
                        </template>

                        <!-- Actions Column -->
                        <template #item.actions="{ item }">
                            <v-btn icon size="small" variant="text" color="success"
                                @click.stop="handleDownloadDetails(item, station as string)">
                                <v-icon>mdi-download</v-icon>
                                <v-tooltip activator="parent" location="top">Download Attachment</v-tooltip>
                            </v-btn>
                        </template>
                    </v-data-table>
                </v-window-item>
            </v-window>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CsvTestItemData } from '@/features/dut_logs/composables/useIplasApi'
import { adjustIplasDisplayTime } from '@/shared/utils/helpers'
import { getScoreColor } from '../types/scoring.types'

interface Props {
    records: CsvTestItemData[]
    stationDisplayNames?: Record<string, string>
    scores?: Record<string, number> // Map of ISN+station+time to score
    calculatingScores?: boolean
}

interface RankingItem {
    rank: number
    isn: string
    device: string
    testDate: string
    testStartTime: string
    testEndTime: string
    score: number | null
    hasError: boolean
    errorCode: string
    errorName: string
    originalRecord: CsvTestItemData
}

const props = defineProps<Props>()

const emit = defineEmits<{
    (e: 'row-click', payload: { record: CsvTestItemData; stationName: string }): void
    (e: 'download', payload: { record: CsvTestItemData; stationName: string }): void
    (e: 'calculate-scores'): void
}>()

const selectedTab = ref<string>('')
const searchQuery = ref<string>('')
const statusFilter = ref<string | null>(null)
const deviceFilter = ref<string[]>([])

// Filter options
const statusFilterOptions = [
    { title: 'Passed Only', value: 'passed' },
    { title: 'Failed Only', value: 'failed' }
]

const rankingHeaders = [
    { title: '#', key: 'rank', sortable: false, width: '80px' },
    { title: 'DUT ISN', key: 'isn', sortable: true },
    { title: 'Device ID', key: 'device', sortable: true },
    { title: 'Test End Time', key: 'testDate', sortable: true, width: '200px' },
    { title: 'Status', key: 'status', sortable: true },
    { title: 'Score', key: 'score', sortable: true, width: '100px' },
    { title: 'Actions', key: 'actions', sortable: false, width: '80px' }
]

// Compute rankings grouped by station
const rankingByStation = computed(() => {
    const stationMap: Record<string, RankingItem[]> = {}

    props.records.forEach(record => {
        const stationName = record.station

        if (!stationMap[stationName]) {
            stationMap[stationName] = []
        }

        const hasError = record.ErrorCode !== 'PASS'
        // Get score from scores map if available
        const scoreKey = `${record.ISN || record.DeviceId}_${stationName}_${record['Test end Time']}`
        const score = props.scores?.[scoreKey] ?? null

        stationMap[stationName].push({
            rank: 0,
            isn: record.ISN || '-',
            device: record.DeviceId || '-',
            testDate: adjustIplasDisplayTime(record['Test end Time'], 1) || '-',
            testStartTime: record['Test Start Time'] || '',
            testEndTime: record['Test end Time'] || '',
            score: hasError ? null : score,
            hasError: hasError,
            errorCode: record.ErrorCode || '-',
            errorName: record.ErrorName || '',
            originalRecord: record
        })
    })

    // Sort by score (if available) or test date, and assign ranks
    Object.keys(stationMap).forEach(station => {
        const items = stationMap[station]

        if (!items) return

        // Separate passed and failed
        const passed = items.filter(item => !item.hasError)
        const failed = items.filter(item => item.hasError)

        // Check if we have scores to sort by
        const hasScores = passed.some(item => item.score !== null)

        // Sort passed by score (if available, descending) or test date
        passed.sort((a, b) => {
            if (hasScores) {
                // Sort by score descending (higher is better)
                const scoreA = a.score ?? -Infinity
                const scoreB = b.score ?? -Infinity
                if (scoreA !== scoreB) return scoreB - scoreA
            }
            // Fallback to test date descending
            const dateA = new Date(a.testDate).getTime()
            const dateB = new Date(b.testDate).getTime()
            return dateB - dateA
        })

        // Assign ranks to passed
        passed.forEach((item, index) => {
            item.rank = index + 1
        })

        // Failed don't get a rank
        failed.forEach(item => {
            item.rank = 999
        })

        // Sort failed by test date descending
        failed.sort((a, b) => {
            const dateA = new Date(a.testDate).getTime()
            const dateB = new Date(b.testDate).getTime()
            return dateB - dateA
        })

        stationMap[station] = [...passed, ...failed]
    })

    // Set initial tab
    const firstStation = Object.keys(stationMap)[0]
    if (selectedTab.value === '' && firstStation) {
        selectedTab.value = firstStation
    }

    return stationMap
})

// Check if we have scores
const hasScores = computed(() => {
    return Object.keys(props.scores || {}).length > 0
})

const totalRecords = computed(() => props.records.length)

function getStationDisplayName(stationName: string): string {
    return props.stationDisplayNames?.[stationName] || stationName
}

function hasStationErrors(stationName: string): boolean {
    const ranking = rankingByStation.value[stationName]
    return ranking?.some(item => item.hasError) || false
}

function getUniqueDevices(stationName: string): string[] {
    const ranking = rankingByStation.value[stationName] || []
    const devices = new Set<string>()
    ranking.forEach(item => {
        if (item.device && item.device !== '-') {
            devices.add(item.device)
        }
    })
    return Array.from(devices)
}

// Filtered ranking
const filteredRanking = computed(() => {
    const currentStation = selectedTab.value
    if (!currentStation || !rankingByStation.value[currentStation]) {
        return []
    }

    let items = rankingByStation.value[currentStation]

    // Apply search
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        items = items.filter(item => {
            return (
                item.isn.toLowerCase().includes(query) ||
                item.device.toLowerCase().includes(query) ||
                item.errorCode.toLowerCase().includes(query) ||
                item.errorName.toLowerCase().includes(query)
            )
        })
    }

    // Apply status filter
    if (statusFilter.value) {
        if (statusFilter.value === 'passed') {
            items = items.filter(item => !item.hasError)
        } else if (statusFilter.value === 'failed') {
            items = items.filter(item => item.hasError)
        }
    }

    // Apply device filter
    if (deviceFilter.value.length > 0) {
        items = items.filter(item => deviceFilter.value.includes(item.device))
    }

    return items
})

const hasActiveFilters = computed(() => {
    return !!(searchQuery.value || statusFilter.value || deviceFilter.value.length > 0)
})

const activeFilterCount = computed(() => {
    let count = 0
    if (searchQuery.value) count++
    if (statusFilter.value) count++
    if (deviceFilter.value.length > 0) count++
    return count
})

function clearAllFilters() {
    searchQuery.value = ''
    statusFilter.value = null
    deviceFilter.value = []
}

function getRowProps({ item }: { item: RankingItem }) {
    return {
        class: getRankingRowClass(item)
    }
}

function getRankingRowClass(item: RankingItem): string {
    if (item.hasError) return 'error-row'
    if (item.rank === 1) return 'rank-1-row'
    if (item.rank === 2) return 'rank-2-row'
    if (item.rank === 3) return 'rank-3-row'
    return ''
}

function handleRowClick(item: RankingItem, stationName: string) {
    emit('row-click', { record: item.originalRecord, stationName })
}

function handleDownloadDetails(item: RankingItem, stationName: string) {
    emit('download', { record: item.originalRecord, stationName })
}
</script>

<style scoped>
:deep(.rank-1-row) {
    background-color: rgba(255, 215, 0, 0.1) !important;
}

:deep(.rank-2-row) {
    background-color: rgba(192, 192, 192, 0.1) !important;
}

:deep(.rank-3-row) {
    background-color: rgba(205, 127, 50, 0.1) !important;
}

:deep(.error-row) {
    background-color: rgba(244, 67, 54, 0.05) !important;
}

.ranking-table {
    border-radius: 8px;
    overflow: hidden;
}

.cursor-pointer {
    cursor: pointer;
}

.gap-2 {
    gap: 0.5rem;
}
</style>
