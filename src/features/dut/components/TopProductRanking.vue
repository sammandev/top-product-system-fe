<template>
    <v-card class="mb-4">
        <v-card-title class="d-flex justify-space-between align-center">
            <div>
                <v-icon class="mr-2" color="warning">mdi-podium-gold</v-icon>
                Top Product Ranking by Test Station
            </div>
            <div class="d-flex align-center gap-2">
                <v-chip size="small" color="primary" variant="tonal" prepend-icon="mdi-factory">
                    {{ Object.keys(rankingByStation).length }} Stations
                </v-chip>
                <v-chip size="small" color="success" variant="tonal" prepend-icon="mdi-barcode">
                    {{ totalDUTs }} DUTs
                </v-chip>
            </div>
        </v-card-title>

        <v-card-subtitle class="text-caption text-medium-emphasis pb-0">
            Rankings are based on overall scoring. DUTs with error items are shown at the bottom.
        </v-card-subtitle>

        <v-card-text>
            <!-- Station Tabs -->
            <v-tabs v-model="selectedTab" color="primary" density="compact" show-arrows>
                <v-tab v-for="(ranking, station) in rankingByStation" :key="station" :value="station">
                    <v-icon size="small" class="mr-2">mdi-factory</v-icon>
                    {{ station }}
                    <v-chip size="x-small" color="primary" class="ml-2" variant="tonal">
                        {{ ranking.length }}
                    </v-chip>
                </v-tab>
            </v-tabs>

            <!-- Station Rankings -->
            <v-window v-model="selectedTab" class="mt-4">
                <v-window-item v-for="(ranking, station) in rankingByStation" :key="station" :value="station">
                    <!-- Station Info Card -->
                    <v-card variant="tonal" color="primary" class="mb-4">
                        <v-card-text class="py-3">
                            <v-row dense align="center">
                                <v-col cols="12" md="4">
                                    <div class="text-h6 font-weight-bold">
                                        <v-icon class="mr-2">mdi-factory</v-icon>
                                        {{ station }}
                                    </div>
                                </v-col>
                                <v-col cols="12" md="8">
                                    <div class="d-flex flex-wrap gap-2 justify-end">
                                        <v-chip size="small" color="success" variant="flat">
                                            <v-icon size="small" class="mr-1">mdi-check-circle</v-icon>
                                            {{ranking?.filter(r => !r.hasError).length || 0}} Passed
                                        </v-chip>
                                        <v-chip size="small" color="error" variant="flat">
                                            <v-icon size="small" class="mr-1">mdi-alert-circle</v-icon>
                                            {{ranking?.filter(r => r.hasError).length || 0}} Failed
                                        </v-chip>
                                        <v-chip
                                            v-if="ranking && ranking.length > 0 && ranking[0] && !ranking[0].hasError"
                                            size="small" color="warning" variant="flat">
                                            <v-icon size="small" class="mr-1">mdi-trophy</v-icon>
                                            Top Score: {{ ranking[0].score.toFixed(2) }}
                                        </v-chip>
                                    </div>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>

                    <!-- Ranking Table -->
                    <v-row v-if="ranking && ranking.length > 0">
                        <!-- Complete Ranking Table -->
                        <v-col cols="12">

                            
                            <v-card variant="outlined">
                                <v-card-title class="bg-grey-lighten-4">
                                    <v-icon class="mr-2">mdi-trophy</v-icon>
                                    Complete Ranking
                                </v-card-title>

                                <!-- Search and Filters -->
                                <v-card-text class="pt-2">
                                    <v-row dense>
                                        <!-- Search Field -->
                                        <v-col cols="12" md="4">
                                            <v-text-field v-model="searchQuery" label="Search"
                                                placeholder="ISN, Device, Date, Site, Model..."
                                                prepend-inner-icon="mdi-magnify" variant="outlined" density="compact"
                                                clearable hide-details />
                                        </v-col>

                                        <!-- Score Filter Type -->
                                        <v-col cols="12" md="2">
                                            <v-select v-model="scoreFilterType" :items="scoreFilterTypes"
                                                label="Score Filter" variant="outlined" density="compact" clearable
                                                hide-details />
                                        </v-col>

                                        <!-- Score Value Input -->
                                        <v-col cols="12" md="2">
                                            <v-text-field v-model.number="scoreFilterValue" label="Score Value"
                                                placeholder="e.g., 9" type="number" variant="outlined" density="compact"
                                                clearable hide-details :disabled="!scoreFilterType" />
                                        </v-col>

                                        <!-- Status Filter -->
                                        <v-col cols="12" md="2">
                                            <v-select v-model="statusFilter" :items="statusFilterOptions" label="Status"
                                                variant="outlined" density="compact" clearable hide-details />
                                        </v-col>

                                        <!-- Site Filter -->
                                        <v-col cols="12" md="2">
                                            <v-select v-model="siteFilter" :items="availableSites" label="Site"
                                                variant="outlined" density="compact" clearable hide-details />
                                        </v-col>
                                    </v-row>

                                    <!-- Active Filters Summary & Clear Button -->
                                    <v-row v-if="hasActiveFilters" dense class="mt-2">
                                        <v-col cols="12">
                                            <div class="d-flex align-center flex-wrap gap-2">
                                                <v-chip size="small" variant="tonal" color="primary">
                                                    <v-icon size="small" class="mr-1">mdi-filter</v-icon>
                                                    {{ activeFilterCount }} active filter(s)
                                                </v-chip>
                                                <v-chip v-if="searchQuery" size="small" closable
                                                    @click:close="searchQuery = ''">
                                                    Search: "{{ searchQuery }}"
                                                </v-chip>
                                                <v-chip v-if="scoreFilterType && scoreFilterValue !== null" size="small"
                                                    closable
                                                    @click:close="scoreFilterType = null; scoreFilterValue = null">
                                                    Score {{ getScoreFilterLabel() }}: {{ scoreFilterValue }}
                                                </v-chip>
                                                <v-chip v-if="statusFilter" size="small" closable
                                                    @click:close="statusFilter = null">
                                                    Status: {{ statusFilter === 'passed' ? 'Passed Only' : 'Failed Only'
                                                    }}
                                                </v-chip>
                                                <v-chip v-if="siteFilter" size="small" closable
                                                    @click:close="siteFilter = null">
                                                    Site: {{ siteFilter }}
                                                </v-chip>
                                                <v-spacer />
                                                <v-btn size="small" variant="text" color="error"
                                                    @click="clearAllFilters">
                                                    <v-icon size="small" class="mr-1">mdi-filter-remove</v-icon>
                                                    Clear All
                                                </v-btn>
                                            </div>
                                        </v-col>
                                    </v-row>

                                    <!-- Results Summary -->
                                    <v-row dense class="mt-2">
                                        <v-col cols="12">
                                            <v-alert v-if="filteredRanking.length === 0" type="info" variant="tonal"
                                                density="compact">
                                                No results match the current filters
                                            </v-alert>
                                            <div v-else class="text-caption text-medium-emphasis">
                                                Showing {{ filteredRanking.length }} of {{ ranking?.length || 0 }}
                                                DUT(s)
                                            </div>
                                        </v-col>
                                    </v-row>
                                </v-card-text>

                                <v-data-table :headers="rankingHeaders" :items="filteredRanking" :items-per-page="10"
                                    density="comfortable" class="ranking-table" :item-class="getRankingRowClass">
                                    <!-- Rank Column -->
                                    <template #item.rank="{ item }">
                                        <div class="d-flex align-center">
                                            <v-chip v-if="item.rank === 1 && !item.hasError" size="small"
                                                color="warning" variant="flat">
                                                <v-icon size="small" class="mr-1">mdi-trophy</v-icon>
                                                {{ item.rank }}
                                            </v-chip>
                                            <v-chip v-else-if="item.rank === 2 && !item.hasError" size="small"
                                                color="grey-lighten-1" variant="flat">
                                                <v-icon size="small" class="mr-1">mdi-medal</v-icon>
                                                {{ item.rank }}
                                            </v-chip>
                                            <v-chip v-else-if="item.rank === 3 && !item.hasError" size="small"
                                                color="orange-lighten-1" variant="flat">
                                                <v-icon size="small" class="mr-1">mdi-medal-outline</v-icon>
                                                {{ item.rank }}
                                            </v-chip>
                                            <v-chip v-else-if="item.hasError" size="small" color="error"
                                                variant="tonal">
                                                <v-icon size="small" class="mr-1">mdi-alert-circle</v-icon>
                                                Error
                                            </v-chip>
                                            <v-chip v-else size="small" color="primary" variant="tonal">
                                                {{ item.rank }}
                                            </v-chip>
                                        </div>
                                    </template>

                                    <!-- ISN Column -->
                                    <template #item.isn="{ item }">
                                        <div class="d-flex align-center">
                                            <v-icon size="small" class="mr-2" color="primary">mdi-barcode</v-icon>
                                            <span class="font-weight-medium">{{ item.isn }}</span>
                                        </div>
                                    </template>

                                    <!-- Device Column -->
                                    <template #item.device="{ item }">
                                        <v-chip size="small" variant="tonal" color="info">
                                            {{ item.device || 'N/A' }}
                                        </v-chip>
                                    </template>

                                    <!-- Test Date Column -->
                                    <template #item.testDate="{ item }">
                                        <div class="text-caption">
                                            {{ formatDate(item.testDate) }}
                                        </div>
                                    </template>

                                    <!-- Score Column -->
                                    <template #item.score="{ item }">
                                        <v-chip v-if="!item.hasError" :color="getScoreColor(item.score)" size="small"
                                            variant="flat" class="font-weight-bold">
                                            {{ item.score.toFixed(2) }}
                                        </v-chip>
                                        <v-chip v-else color="error" size="small" variant="tonal">
                                            N/A
                                        </v-chip>
                                    </template>

                                    <!-- Site Column -->
                                    <template #item.site="{ item }">
                                        <span class="text-caption">{{ item.site || 'N/A' }}</span>
                                    </template>

                                    <!-- Model Column -->
                                    <template #item.model="{ item }">
                                        <span class="text-caption">{{ item.model || 'N/A' }}</span>
                                    </template>

                                    <!-- Error Item Column -->
                                    <template #item.errorItem="{ item }">
                                        <v-tooltip v-if="item.hasError && item.errorItem" location="top">
                                            <template #activator="{ props: tooltipProps }">
                                                <v-chip v-bind="tooltipProps" size="small" color="error" variant="tonal"
                                                    prepend-icon="mdi-alert-circle">
                                                    Error
                                                </v-chip>
                                            </template>
                                            <div class="text-caption">{{ item.errorItem }}</div>
                                        </v-tooltip>
                                        <v-chip v-else size="small" color="success" variant="tonal"
                                            prepend-icon="mdi-check-circle">
                                            Pass
                                        </v-chip>
                                    </template>
                                </v-data-table>
                            </v-card>
                        </v-col>
                    </v-row>

                    <!-- No Data -->
                    <v-alert v-else type="info" variant="tonal">
                        No ranking data available for this station
                    </v-alert>
                </v-window-item>
            </v-window>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDate } from '@/shared/utils/helpers'
import type { TopProductResult } from '../types/dutTopProduct.types'

interface Props {
    results: TopProductResult[]
}

interface RankingItem {
    rank: number
    isn: string
    device: string | null
    testDate: string
    score: number
    site: string | null
    model: string | null
    hasError: boolean
    errorItem: string | null
}

const props = defineProps<Props>()

const selectedTab = ref<string>('')
const searchQuery = ref<string>('')
const scoreFilterType = ref<string | null>(null)
const scoreFilterValue = ref<number | null>(null)
const statusFilter = ref<string | null>(null)
const siteFilter = ref<string | null>(null)

// Filter options
const scoreFilterTypes = [
    { title: 'Greater than (>)', value: 'gt' },
    { title: 'Greater or equal (≥)', value: 'gte' },
    { title: 'Less than (<)', value: 'lt' },
    { title: 'Less or equal (≤)', value: 'lte' },
    { title: 'Equal (=)', value: 'eq' }
]

const statusFilterOptions = [
    { title: 'Passed Only', value: 'passed' },
    { title: 'Failed Only', value: 'failed' }
]

// Compute rankings grouped by station
const rankingByStation = computed(() => {
    const stationMap: Record<string, RankingItem[]> = {}

    props.results.forEach(result => {
        result.test_result.forEach(station => {
            const stationName = station.station_name

            if (!stationMap[stationName]) {
                stationMap[stationName] = []
            }

            const hasError = station.error_item !== null && station.error_item.trim() !== ''

            stationMap[stationName].push({
                rank: 0, // Will be computed after sorting
                isn: result.dut_isn,
                device: station.device,
                testDate: station.test_date,
                score: station.overall_data_score,
                site: result.site_name,
                model: result.model_name,
                hasError: hasError,
                errorItem: station.error_item
            })
        })
    })

    // Sort and assign ranks for each station
    Object.keys(stationMap).forEach(station => {
        const items = stationMap[station]

        if (!items) return

        // Separate passed and failed DUTs
        const passed = items.filter(item => !item.hasError)
        const failed = items.filter(item => item.hasError)

        // Sort passed DUTs by score (descending)
        passed.sort((a, b) => b.score - a.score)

        // Assign ranks to passed DUTs
        passed.forEach((item, index) => {
            item.rank = index + 1
        })

        // Failed DUTs don't get a rank (will show "Error" in table)
        failed.forEach(item => {
            item.rank = 999
        })

        // Combine: passed first, then failed
        stationMap[station] = [...passed, ...failed]
    })

    // Set initial tab to first station
    const firstStation = Object.keys(stationMap)[0]
    if (selectedTab.value === '' && firstStation) {
        selectedTab.value = firstStation
    }

    return stationMap
})

const totalDUTs = computed(() => {
    const uniqueISNs = new Set<string>()
    props.results.forEach(result => {
        uniqueISNs.add(result.dut_isn)
    })
    return uniqueISNs.size
})

// Get available sites for filter
const availableSites = computed(() => {
    const sites = new Set<string>()
    props.results.forEach(result => {
        if (result.site_name) {
            sites.add(result.site_name)
        }
    })
    return Array.from(sites)
})

// Filtered ranking based on search and filters
const filteredRanking = computed(() => {
    const currentStation = selectedTab.value
    if (!currentStation || !rankingByStation.value[currentStation]) {
        return []
    }

    let items = rankingByStation.value[currentStation]

    // Apply search query
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        items = items.filter(item => {
            return (
                item.isn.toLowerCase().includes(query) ||
                (item.device && item.device.toLowerCase().includes(query)) ||
                item.testDate.toLowerCase().includes(query) ||
                (item.site && item.site.toLowerCase().includes(query)) ||
                (item.model && item.model.toLowerCase().includes(query))
            )
        })
    }

    // Apply score filter
    if (scoreFilterType.value && scoreFilterValue.value !== null) {
        items = items.filter(item => {
            if (item.hasError) return true // Keep error items regardless of score filter

            const score = item.score
            const filterValue = scoreFilterValue.value!

            switch (scoreFilterType.value) {
                case 'gt':
                    return score > filterValue
                case 'gte':
                    return score >= filterValue
                case 'lt':
                    return score < filterValue
                case 'lte':
                    return score <= filterValue
                case 'eq':
                    return Math.abs(score - filterValue) < 0.01
                default:
                    return true
            }
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

    // Apply site filter
    if (siteFilter.value) {
        items = items.filter(item => item.site === siteFilter.value)
    }

    return items
})

// Check if there are active filters
const hasActiveFilters = computed(() => {
    return !!(searchQuery.value || scoreFilterType.value || statusFilter.value || siteFilter.value)
})

// Count active filters
const activeFilterCount = computed(() => {
    let count = 0
    if (searchQuery.value) count++
    if (scoreFilterType.value && scoreFilterValue.value !== null) count++
    if (statusFilter.value) count++
    if (siteFilter.value) count++
    return count
})

const rankingHeaders = [
    { title: 'Rank', key: 'rank', sortable: false, width: '100px' },
    { title: 'DUT ISN', key: 'isn', sortable: true },
    { title: 'Device', key: 'device', sortable: true },
    { title: 'Test Date', key: 'testDate', sortable: true, width: '250px' },
    { title: 'Score', key: 'score', sortable: true },
    { title: 'Site', key: 'site', sortable: true },
    { title: 'Model', key: 'model', sortable: true },
    { title: 'Status', key: 'errorItem', sortable: false }
]

function getScoreColor(score: number): string {
    // Score color logic for 0-10 scale: lower scores should be red, higher scores should be green
    if (score >= 9.5) return 'success'       // Green for excellent (9.5-10)
    if (score >= 8.5) return 'light-green'   // Light green for very good (8.5-9.49)
    if (score >= 7.5) return 'lime'          // Lime for good (7.5-8.49)
    if (score >= 6.5) return 'warning'       // Yellow for acceptable (6.5-7.49)
    if (score >= 5.0) return 'orange'        // Orange for poor (5.0-6.49)
    return 'error'                           // Red for very poor (<5.0)
}

function getScoreFilterLabel(): string {
    switch (scoreFilterType.value) {
        case 'gt':
            return '>'
        case 'gte':
            return '≥'
        case 'lt':
            return '<'
        case 'lte':
            return '≤'
        case 'eq':
            return '='
        default:
            return ''
    }
}

function clearAllFilters() {
    searchQuery.value = ''
    scoreFilterType.value = null
    scoreFilterValue.value = null
    statusFilter.value = null
    siteFilter.value = null
}

function getRankingRowClass(item: RankingItem): string {
    if (item.hasError) return 'error-row'
    if (item.rank === 1) return 'rank-1-row'
    if (item.rank === 2) return 'rank-2-row'
    if (item.rank === 3) return 'rank-3-row'
    return ''
}
</script>

<style scoped>
/* Ranking Table Row Highlights */
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
</style>
