<template>
    <v-card class="mb-4">
        <v-card-title class="d-flex justify-space-between align-center">
            <div>
                <v-icon class="mr-2" color="warning">mdi-podium-gold</v-icon>
                Top Product Ranking by Overall Score
            </div>
        </v-card-title>

        <v-card-subtitle class="text-caption text-medium-emphasis pb-0">
            Rankings are based on overall scoring. ISNs with better scores appear first.
        </v-card-subtitle>

        <v-card-text>
            <!-- Ranking Table -->
            <v-card variant="outlined">
                <v-card-title class="bg-grey-lighten-4 d-flex align-center">
                    <v-icon class="mr-2">mdi-trophy</v-icon>
                    Complete Ranking
                    <v-chip class="ml-2" size="small">{{ filteredRankings.length }}</v-chip>
                    <v-spacer />
                    <v-icon size="large" color="primary" @click="fullscreen = true">mdi-fullscreen</v-icon>
                </v-card-title>

                <!-- Search and Filters -->
                <v-row dense class="pa-2">
                    <v-col cols="12" md="6">
                        <v-text-field v-model="searchQuery" label="Search" placeholder="ISN, Device, Date..."
                            prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" clearable
                            hide-details />
                    </v-col>
                    <v-col cols="12" md="2">
                        <v-select v-model="scoreFilterType" :items="scoreFilterTypes" label="Score Filter"
                            variant="outlined" density="compact" clearable hide-details />
                    </v-col>
                    <v-col cols="12" md="2">
                        <v-text-field v-model.number="scoreFilterValue" label="Score Value" placeholder="e.g., 9"
                            type="number" variant="outlined" density="compact" clearable hide-details
                            :disabled="!scoreFilterType" />
                    </v-col>
                    <v-col cols="12" md="2">
                        <v-select v-model="resultFilter" :items="resultFilterOptions" label="Test Result"
                            variant="outlined" density="compact" clearable hide-details />
                    </v-col>
                </v-row>

                <v-card-text class="pa-0">
                    <v-data-table :headers="headers" :items="paginatedRankings" :items-per-page="itemsPerPage"
                        density="compact" fixed-header height="500" hide-default-footer striped="even">
                        <template #item.rank="{ index }">
                            <span class="font-weight-bold">{{ (currentPage - 1) * getPerPage() + index + 1 }}</span>
                        </template>
                        <template #item.isn="{ item }">
                            <span class="text-body-2 font-weight-medium">{{ item.isn || 'N/A' }}</span>
                        </template>
                        <template #item.test_date="{ item }">
                            <span class="text-body-2">{{ formatTestDate(item.test_date) }}</span>
                        </template>
                        <template #item.duration="{ item }">
                            <span class="text-body-2">{{ formatDuration(item.duration_seconds) }}</span>
                        </template>
                        <template #item.station="{ item }">
                            <span class="text-body-2">{{ item.station }}</span>
                        </template>
                        <template #item.device="{ item }">
                            <span class="text-body-2">{{ item.device || 'N/A' }}</span>
                        </template>
                        <template #item.status="{ item }">
                            <v-chip size="small" :color="getStatusColor(item.status)" variant="tonal">
                                {{ item.status }}
                            </v-chip>
                        </template>
                        <template #item.result="{ item }">
                            <v-chip size="small" :color="getResultColor(item.result)" variant="flat">
                                {{ item.result || 'N/A' }}
                            </v-chip>
                        </template>
                        <template #item.score="{ item }">
                            <v-chip :color="getScoreColor(item.score)" size="small" class="font-weight-bold">
                                {{ item.score.toFixed(2) }}
                            </v-chip>
                        </template>
                    </v-data-table>
                    <div class="d-flex align-center justify-space-between pa-2">
                        <div class="d-flex align-center gap-2">
                            <span class="text-caption text-medium-emphasis">Show</span>
                            <v-select v-model="itemsPerPage" :items="itemsPerPageOptions" variant="outlined"
                                class="mx-2" density="compact" hide-details />
                            <span class="text-caption text-medium-emphasis">items</span>
                        </div>
                        <v-pagination
                            v-if="itemsPerPage !== -1 && itemsPerPage !== 0 && filteredRankings.length > itemsPerPage"
                            v-model="currentPage" :length="totalPages" :total-visible="7" size="large"
                            density="compact" />
                        <div style="width: 150px;"></div>
                    </div>
                </v-card-text>
            </v-card>
        </v-card-text>

        <!-- Fullscreen Dialog -->
        <v-dialog v-model="fullscreen" fullscreen transition="dialog-bottom-transition">
            <v-card class="d-flex flex-column" style="height: 100vh; overflow: hidden;">
                <v-card-title class="d-flex justify-space-between align-center flex-shrink-0">
                    <div>
                        <v-icon class="mr-2">mdi-trophy</v-icon>
                        Complete Ranking
                    </div>
                    <v-btn icon="mdi-close" variant="text" @click="fullscreen = false" />
                </v-card-title>
                <v-card-text class="pb-2 pt-3 flex-shrink-0">
                    <v-row dense>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="searchQuery" label="Search" placeholder="ISN, Device, Date..."
                                prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" clearable
                                hide-details />
                        </v-col>
                        <v-col cols="12" md="2">
                            <v-select v-model="scoreFilterType" :items="scoreFilterTypes" label="Score Filter"
                                variant="outlined" density="compact" clearable hide-details />
                        </v-col>
                        <v-col cols="12" md="2">
                            <v-text-field v-model.number="scoreFilterValue" label="Score Value" placeholder="e.g., 9"
                                type="number" variant="outlined" density="compact" clearable hide-details
                                :disabled="!scoreFilterType" />
                        </v-col>
                        <v-col cols="12" md="2">
                            <v-select v-model="resultFilter" :items="resultFilterOptions" label="Test Result"
                                variant="outlined" density="compact" clearable hide-details />
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-text class="pa-0 flex-grow-1 d-flex flex-column" style="overflow: hidden;">
                    <div class="flex-grow-1" style="overflow: auto;">
                        <v-data-table :headers="headers" :items="paginatedRankings" :items-per-page="itemsPerPage"
                            :height="'calc(100vh - 200px)'" fixed-header density="compact" hide-default-footer
                            striped="even">
                            <template #item.rank="{ index }">
                                <span class="font-weight-bold">{{ (currentPage - 1) * getPerPage() + index + 1 }}</span>
                            </template>
                            <template #item.isn="{ item }">
                                <span class="text-body-2 font-weight-medium">{{ item.isn || 'N/A' }}</span>
                            </template>
                            <template #item.test_date="{ item }">
                                <span class="text-body-2">{{ formatTestDate(item.test_date) }}</span>
                            </template>
                            <template #item.duration="{ item }">
                                <span class="text-body-2">{{ formatDuration(item.duration_seconds) }}</span>
                            </template>
                            <template #item.station="{ item }">
                                <span class="text-body-2">{{ item.station }}</span>
                            </template>
                            <template #item.device="{ item }">
                                <span class="text-body-2">{{ item.device || 'N/A' }}</span>
                            </template>
                            <template #item.status="{ item }">
                                <v-chip size="small" :color="getStatusColor(item.status)" variant="tonal">
                                    {{ item.status }}
                                </v-chip>
                            </template>
                            <template #item.result="{ item }">
                                <v-chip size="small" :color="getResultColor(item.result)" variant="flat">
                                    {{ item.result || 'N/A' }}
                                </v-chip>
                            </template>
                            <template #item.score="{ item }">
                                <v-chip :color="getScoreColor(item.score)" size="small" class="font-weight-bold">
                                    {{ item.score.toFixed(2) }}
                                </v-chip>
                            </template>
                        </v-data-table>
                    </div>
                    <div class="flex-shrink-0 pa-2" style="border-top: 1px solid rgba(0,0,0,0.12);">
                        <div class="d-flex align-center justify-space-between">
                            <div class="d-flex align-center gap-2">
                                <span class="text-caption text-medium-emphasis">Show</span>
                                <v-select v-model="itemsPerPage" :items="itemsPerPageOptions" class="mx-2"
                                    variant="outlined" density="compact" size="small" hide-details />
                                <span class="text-caption text-medium-emphasis">items</span>
                            </div>
                            <v-pagination
                                v-if="itemsPerPage !== -1 && itemsPerPage !== 0 && filteredRankings.length > itemsPerPage"
                                v-model="currentPage" :length="totalPages" :total-visible="5" size="large"
                                density="compact" />
                            <div style="width: 150px;"></div>
                        </div>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>

        <!-- Custom Items Per Page Dialog -->
        <v-dialog v-model="showCustomInput" max-width="400">
            <v-card>
                <v-card-title>Custom Items Per Page</v-card-title>
                <v-card-text>
                    <v-text-field v-model.number="customItemsPerPage" type="number" label="Enter number of items"
                        variant="outlined" density="comfortable" min="1" autofocus
                        @keyup.enter="applyCustomItemsPerPage" />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn text @click="cancelCustomInput">Cancel</v-btn>
                    <v-btn color="primary" variant="elevated" @click="applyCustomItemsPerPage">Apply</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import type { TestLogParseResponseEnhanced, CompareResponseEnhanced } from '@/features/dut_logs/composables/useTestLogUpload'

dayjs.extend(utc)
dayjs.extend(timezone)

const props = defineProps<{
    parseResult?: TestLogParseResponseEnhanced | null
    compareResult?: CompareResponseEnhanced | null
}>()

interface RankingItem {
    isn: string | null
    test_date: string | null
    duration_seconds: number | null
    station: string
    device: string | null
    status: string
    result: string | null
    score: number
}

// Search and filters
const searchQuery = ref('')
const scoreFilterType = ref<string | null>(null)
const scoreFilterValue = ref<number | null>(null)
const resultFilter = ref<string | null>(null)
const fullscreen = ref(false)

// Pagination
const itemsPerPage = ref(10)
const currentPage = ref(1)
const itemsPerPageOptions = [
    { title: '5', value: 5 },
    { title: '10', value: 10 },
    { title: '25', value: 25 },
    { title: '50', value: 50 },
    { title: '100', value: 100 },
    { title: 'All', value: -1 },
    { title: 'Custom', value: 0 }
]
const showCustomInput = ref(false)
const customItemsPerPage = ref(10)

// Filter options
const scoreFilterTypes = [
    { title: 'Greater Than', value: 'gt' },
    { title: 'Less Than', value: 'lt' },
    { title: 'Equal To', value: 'eq' }
]

const resultFilterOptions = [
    { title: 'All', value: null },
    { title: 'Pass Only', value: 'PASS' },
    { title: 'Fail Only', value: 'FAIL' }
]

// Headers
const headers = [
    { title: 'Rank', key: 'rank', sortable: false, width: '100px', align: 'center' as const },
    { title: 'DUT ISN', key: 'isn', sortable: true, width: '180px' },
    { title: 'Test Date', key: 'test_date', sortable: true, width: '150px' },
    { title: 'Duration', key: 'duration', sortable: true, width: '120px', align: 'center' as const },
    { title: 'Test Station', key: 'station', sortable: true, width: '150px' },
    { title: 'Device', key: 'device', sortable: true, width: '150px' },
    { title: 'Status', key: 'status', sortable: true, width: '120px', align: 'center' as const },
    { title: 'Test Result', key: 'result', sortable: true, width: '120px', align: 'center' as const },
    { title: 'Overall Score', key: 'score', sortable: true, width: '150px', align: 'center' as const }
]

// Generate rankings from results
const rankings = computed<RankingItem[]>(() => {
    const items: RankingItem[] = []

    if (props.parseResult && props.parseResult.metadata) {
        // Single file parsing mode
        items.push({
            isn: props.parseResult.isn,
            test_date: props.parseResult.metadata.test_date,
            duration_seconds: props.parseResult.metadata.duration_seconds,
            station: props.parseResult.station,
            device: props.parseResult.metadata.device,
            status: props.parseResult.metadata.sfis_status || 'Unknown',
            result: props.parseResult.metadata.result,
            score: props.parseResult.avg_score || 0
        })
    } else if (props.compareResult) {
        // Multiple files comparison mode - use file_summaries for metadata
        if (props.compareResult.file_summaries) {
            props.compareResult.file_summaries.forEach(fileSummary => {
                items.push({
                    isn: fileSummary.isn,
                    test_date: fileSummary.metadata.test_date,
                    duration_seconds: fileSummary.metadata.duration_seconds,
                    station: fileSummary.metadata.station || 'Unknown',
                    device: fileSummary.metadata.device,
                    status: fileSummary.metadata.sfis_status || 'Unknown',
                    result: fileSummary.metadata.result,
                    score: fileSummary.avg_score || 0
                })
            })
        }
    }

    // Sort by score (descending)
    return items.sort((a, b) => b.score - a.score)
})

// Filtered rankings
const filteredRankings = computed(() => {
    let filtered = rankings.value

    // Search filter
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(item =>
            (item.isn?.toLowerCase().includes(query)) ||
            (item.device?.toLowerCase().includes(query)) ||
            (item.test_date?.toLowerCase().includes(query)) ||
            (item.station.toLowerCase().includes(query))
        )
    }

    // Score filter
    if (scoreFilterType.value && scoreFilterValue.value !== null) {
        filtered = filtered.filter(item => {
            if (scoreFilterType.value === 'gt') return item.score > scoreFilterValue.value!
            if (scoreFilterType.value === 'lt') return item.score < scoreFilterValue.value!
            if (scoreFilterType.value === 'eq') return Math.abs(item.score - scoreFilterValue.value!) < 0.01
            return true
        })
    }

    // Result filter
    if (resultFilter.value) {
        filtered = filtered.filter(item => item.result === resultFilter.value)
    }

    return filtered
})

// Pagination
const getPerPage = () => {
    return itemsPerPage.value === -1 ? filteredRankings.value.length :
        itemsPerPage.value === 0 ? 10 : itemsPerPage.value
}

const totalPages = computed(() => {
    return Math.ceil(filteredRankings.value.length / getPerPage())
})

const paginatedRankings = computed(() => {
    const perPage = getPerPage()
    const start = (currentPage.value - 1) * perPage
    const end = start + perPage
    return filteredRankings.value.slice(start, end)
})

// Watchers
watch([searchQuery, scoreFilterType, scoreFilterValue, resultFilter], () => {
    currentPage.value = 1
})

watch(itemsPerPage, (newVal) => {
    if (newVal === 0) {
        showCustomInput.value = true
    } else {
        showCustomInput.value = false
        currentPage.value = 1
    }
})

// Methods
const applyCustomItemsPerPage = () => {
    if (customItemsPerPage.value > 0) {
        itemsPerPage.value = customItemsPerPage.value
    }
    showCustomInput.value = false
}

const cancelCustomInput = () => {
    itemsPerPage.value = 10
    showCustomInput.value = false
}

const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A'
    return `${seconds}s`
}

const formatTestDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A'
    try {
        // Parse as UTC and convert to user's local timezone
        return dayjs.utc(dateString).tz(dayjs.tz.guess()).format('DD/MM/YYYY, HH:mm:ss')
    } catch {
        return 'N/A'
    }
}

const getStatusColor = (status: string | null): string => {
    if (!status) return 'grey'
    const upper = status.toUpperCase()
    if (upper === 'ONLINE' || upper === 'ON-LINE') return 'primary'
    if (upper === 'OFFLINE' || upper === 'OFF-LINE') return 'secondary'
    return 'grey'
}

const getResultColor = (result: string | null): string => {
    if (!result) return 'grey'
    const upper = result.toUpperCase()
    if (upper === 'PASS') return 'success'
    if (upper === 'FAIL') return 'error'
    return 'warning'
}

const getScoreColor = (score: number): string => {
    if (score >= 9) return 'success'
    if (score >= 7) return 'warning'
    return 'error'
}
</script>
